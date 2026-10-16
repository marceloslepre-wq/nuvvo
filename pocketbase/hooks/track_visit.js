routerAdd('POST', '/backend/v1/track', (e) => {
  const body = e.requestInfo().body || {}

  // 1. Ignorar visitas internas (referrer goskip.dev)
  const referrer = typeof body.referrer === 'string' ? body.referrer : ''
  if (referrer && referrer.includes('goskip.dev')) {
    return e.json(204, { ok: true, ignored: true })
  }

  // Trigger temporário para Marcelo ver teste da Sholver
  if (body.test_sholver === true) {
    const rawApiUrl = ($os.getenv('SHOLVER_API_URL') || '').trim()
    const webhookSecret = ($os.getenv('NUVVO_WEBHOOK_SECRET') || '').trim()
    const testOrderNumber = 'NUVVO-TESTE-MARCELO-001'

    const payloadTrial = {
      numero_pedido: testOrderNumber,
      cliente: {
        razao_social: 'TESTE NUVVO - NÃO USAR',
        nome_fantasia: '',
        email: 'teste@nuvvo-teste.com',
        telefone: '(11) 99999-9999',
        documento: '00.000.000/0001-91',
      },
      plano: {
        nome: 'Básico',
      },
      produto: 'Nuvvo',
      valor: 197.0,
      metodo_pagamento: 'GRATUITO',
      status: 'trial_ativo',
    }

    const payloadPago = {
      numero_pedido: testOrderNumber,
      cliente: {
        razao_social: 'TESTE NUVVO - NÃO USAR',
        nome_fantasia: '',
        email: 'teste@nuvvo-teste.com',
        telefone: '(11) 99999-9999',
        documento: '00.000.000/0001-91',
      },
      plano: {
        nome: 'Básico',
      },
      produto: 'Nuvvo',
      valor: 197.0,
      metodo_pagamento: 'PIX',
      status: 'pago',
    }

    const results = []

    if (!rawApiUrl) {
      console.log(
        '[Sholver Webhook] Ignorado no Teste: SHOLVER_API_URL não configurada. Pedido:',
        testOrderNumber,
      )
      results.push({ scenario: 'trial', skipped: true, reason: 'SHOLVER_API_URL_NOT_SET' })
      results.push({ scenario: 'pago', skipped: true, reason: 'SHOLVER_API_URL_NOT_SET' })
    } else if (!webhookSecret) {
      console.log(
        '[Sholver Webhook] Ignorado no Teste: NUVVO_WEBHOOK_SECRET não configurada. Pedido:',
        testOrderNumber,
      )
      results.push({ scenario: 'trial', skipped: true, reason: 'NUVVO_WEBHOOK_SECRET_NOT_SET' })
      results.push({ scenario: 'pago', skipped: true, reason: 'NUVVO_WEBHOOK_SECRET_NOT_SET' })
    } else {
      const cleanRawUrl = rawApiUrl.replace(/\/+$/, '')
      const targetUrl = cleanRawUrl.endsWith('/backend/v1/webhook/nuvvo')
        ? cleanRawUrl
        : cleanRawUrl + '/backend/v1/webhook/nuvvo'

      console.log(
        '[Sholver Webhook] Enviando pedido de Onboarding para ' +
          targetUrl +
          ' | Pedido: ' +
          testOrderNumber +
          ' | Cliente: ' +
          payloadTrial.cliente.razao_social,
      )

      try {
        const res1 = $http.send({
          url: targetUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': webhookSecret,
            'X-Sholver-Secret': webhookSecret,
          },
          body: JSON.stringify(payloadTrial),
          timeout: 10,
        })

        const isSuccess1 = res1.statusCode >= 200 && res1.statusCode < 300
        console.log(
          '[Sholver Webhook] Resposta Onboarding recebida. HTTP ' +
            res1.statusCode +
            ' para pedido ' +
            testOrderNumber +
            ' (Sucesso: ' +
            isSuccess1 +
            ')',
        )

        results.push({
          scenario: 'trial',
          targetUrl: targetUrl,
          payload: payloadTrial,
          statusCode: res1.statusCode,
          success: isSuccess1,
          responseRaw: res1.raw,
        })
      } catch (err1) {
        console.log(
          '[Sholver Webhook Erro] Falha no disparo de Onboarding (tenant ' +
            testOrderNumber +
            '): ' +
            (err1 ? err1.message : String(err1)),
        )
        results.push({
          scenario: 'trial',
          targetUrl: targetUrl,
          payload: payloadTrial,
          success: false,
          error: err1 ? err1.message : String(err1),
        })
      }

      console.log(
        '[Sholver Webhook] Enviando confirmação de pagamento MP Webhook para ' +
          targetUrl +
          ' | Pedido: ' +
          testOrderNumber +
          ' | Valor: ' +
          payloadPago.valor,
      )

      try {
        const res2 = $http.send({
          url: targetUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': webhookSecret,
            'X-Sholver-Secret': webhookSecret,
          },
          body: JSON.stringify(payloadPago),
          timeout: 10,
        })

        const isSuccess2 = res2.statusCode >= 200 && res2.statusCode < 300
        console.log(
          '[Sholver Webhook] Resposta MP Webhook recebida. HTTP ' +
            res2.statusCode +
            ' para pedido ' +
            testOrderNumber +
            ' (Sucesso: ' +
            isSuccess2 +
            ')',
        )

        results.push({
          scenario: 'pago',
          targetUrl: targetUrl,
          payload: payloadPago,
          statusCode: res2.statusCode,
          success: isSuccess2,
          responseRaw: res2.raw,
        })
      } catch (err2) {
        console.log(
          '[Sholver Webhook Erro] Falha no disparo de pagamento MP Webhook (tenant ' +
            testOrderNumber +
            '): ' +
            (err2 ? err2.message : String(err2)),
        )
        results.push({
          scenario: 'pago',
          targetUrl: targetUrl,
          payload: payloadPago,
          success: false,
          error: err2 ? err2.message : String(err2),
        })
      }
    }

    return e.json(200, {
      test_executed: true,
      results: results,
    })
  }

  // 2. Ignorar robôs conhecidos (User-Agent header)
  const userAgent = (e.request.header.get('User-Agent') || '').toLowerCase()
  const botKeywords = [
    'bot',
    'crawler',
    'spider',
    'googlebot',
    'adsbot',
    'mediapartners-google',
    'google-inspectiontool',
    'googleother',
    'lighthouse',
    'headlesschrome',
    'facebookexternalhit',
    'bingpreview',
    'slurp',
  ]
  for (let i = 0; i < botKeywords.length; i++) {
    if (userAgent.includes(botKeywords[i])) {
      return e.json(204, { ok: true, ignored: true })
    }
  }

  const remoteAddr = e.request.remoteAddr || ''
  let ip = ''
  const xff = e.request.header.get('X-Forwarded-For') || ''
  if (xff) {
    ip = xff.split(',')[0].trim()
  } else if (remoteAddr) {
    const parts = remoteAddr.split(':')
    if (parts.length === 2) {
      ip = parts[0]
    } else {
      ip = remoteAddr
    }
  }

  let ipHash = ''
  if (ip) {
    ipHash = $security.sha256(ip)
  }

  let country = ''
  let region = ''
  let city = ''
  if (ip) {
    try {
      const res = $http.send({
        url: 'http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city',
        method: 'GET',
        timeout: 5,
      })
      if (res.statusCode === 200 && res.json && res.json.status === 'success') {
        country = res.json.country || ''
        region = res.json.regionName || ''
        city = res.json.city || ''
      }
    } catch (_) {}
  }

  const validTypes = ['pageview', 'click']
  const validModalities = ['direct', 'organic', 'social', 'referral', 'paid', 'unknown']
  const validDevices = ['mobile', 'desktop', 'tablet']

  const collection = $app.findCollectionByNameOrId('visit_logs')
  const record = new Record(collection)
  if (body.tenant_id && typeof body.tenant_id === 'string') {
    record.set('tenant', body.tenant_id)
  }
  record.set('type', validTypes.includes(body.type) ? body.type : 'pageview')
  record.set('modality', validModalities.includes(body.modality) ? body.modality : 'unknown')
  record.set('source', typeof body.source === 'string' ? body.source : '')
  record.set('device', validDevices.includes(body.device) ? body.device : '')
  record.set('browser', typeof body.browser === 'string' ? body.browser : '')
  record.set('os', typeof body.os === 'string' ? body.os : '')
  record.set('ip', ip)
  record.set('country', country)
  record.set('region', region)
  record.set('city', city)
  record.set('ip_hash', ipHash)
  record.set('referrer', typeof body.referrer === 'string' ? body.referrer : '')
  record.set('path', typeof body.path === 'string' ? body.path : '')
  record.set('session_id', typeof body.session_id === 'string' ? body.session_id : '')

  try {
    $app.save(record)
  } catch (err) {
    $app.logger().error('track_visit save failed', 'error', String(err))
    return e.json(500, { ok: false })
  }

  return e.json(201, { ok: true })
})
