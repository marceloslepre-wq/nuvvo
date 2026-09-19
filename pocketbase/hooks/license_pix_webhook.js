// Webhook Mercado Pago para confirmação de pagamento PIX e renovação automática de licenças
routerAdd('POST', '/backend/v1/licenses/pix-webhook', (e) => {
  let query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  console.log('[Webhook MP] Notificação recebida na rota /backend/v1/licenses/pix-webhook')

  // Extrair paymentId dos diferentes formatos que o Mercado Pago pode enviar
  let paymentId = ''
  if (query['data.id']) paymentId = String(query['data.id']).trim()
  else if (query.id) paymentId = String(query.id).trim()
  else if (query['id']) paymentId = String(query['id']).trim()
  else if (body.data && body.data.id) paymentId = String(body.data.id).trim()
  else if (body.id) paymentId = String(body.id).trim()

  // Se a query tiver resource = "/v1/payments/{id}" ou similar
  if (!paymentId && query.resource) {
    const match = String(query.resource).match(/\/payments\/(\d+)/)
    if (match && match[1]) {
      paymentId = match[1]
    }
  }
  if (!paymentId && body.resource) {
    const match = String(body.resource).match(/\/payments\/(\d+)/)
    if (match && match[1]) {
      paymentId = match[1]
    }
  }

  // Alguns webhooks enviam type/topic = payment / payment.created / payment.updated
  const action = body.action || query.action || body.type || query.type || query.topic || ''
  console.log('[Webhook MP] Action/Topic:', action, '| Payment ID:', paymentId)

  if (!paymentId) {
    return e.json(200, { received: true, ignored: 'no_payment_id' })
  }
  const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
  if (!mpToken) {
    console.log('[Webhook MP] Recebido evento mas MERCADO_PAGO_ACCESS_TOKEN não está configurado')
    return e.json(200, { received: true, message: 'Mercado Pago token not set' })
  }

  try {
    const res = $http.send({
      url: 'https://api.mercadopago.com/v1/payments/' + paymentId,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + mpToken,
      },
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      console.log(
        '[Webhook MP] Consulta do pagamento falhou. ID:',
        paymentId,
        '| Status:',
        res.statusCode,
      )
      return e.json(200, { received: true, error: 'Could not fetch payment' })
    }

    const payData = res.json || {}
    const status = payData.status
    const metadata = payData.metadata || {}
    const externalRef = payData.external_reference || ''
    const tenantId = metadata.tenant_id || externalRef

    console.log('[Webhook MP] Pagamento ID:', paymentId, '| Status:', status, '| Tenant:', tenantId)

    if (status === 'approved' && tenantId) {
      let tenantRecord
      try {
        tenantRecord = $app.findRecordById('tenants', tenantId)
      } catch (notFound) {
        console.log('[Webhook MP] Tenant não encontrado com id:', tenantId)
        return e.json(200, { received: true, error: 'Tenant not found' })
      }

      // Checar se já foi processado (idempotência)
      let alreadyProcessed = false
      try {
        const existing = $app.findRecordsByFilter(
          'license_renewals',
          "payment_id = '" + paymentId + "'",
          '-created',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          alreadyProcessed = true
        }
      } catch (_) {}

      if (alreadyProcessed) {
        console.log(
          '[Webhook MP] Pagamento',
          paymentId,
          'já havia sido processado anteriormente (idempotente).',
        )
        return e.json(200, { received: true, status: 'already_processed' })
      }

      const curExpStr = tenantRecord.getString('expiration_date')
      const currentExp = curExpStr ? new Date(curExpStr) : new Date()
      const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
      const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Obter nome do plano
      let pName = metadata.plan_name || ''
      if (!pName) {
        try {
          const pRec = $app.findRecordById('plans', tenantRecord.getString('plan'))
          pName = pRec.getString('name')
        } catch (_) {
          pName = 'Plano Comercial'
        }
      }

      // Usar sempre o valor bruto que o cliente pagou (transaction_amount), NUNCA o valor líquido com desconto de taxas (net_received_amount)
      let grossAmount = 0
      if (
        payData.transaction_amount !== undefined &&
        payData.transaction_amount !== null &&
        Number(payData.transaction_amount) > 0
      ) {
        grossAmount = Number(payData.transaction_amount)
      } else if (
        tenantRecord.get('effective_value') !== undefined &&
        Number(tenantRecord.get('effective_value')) > 0
      ) {
        grossAmount = Number(tenantRecord.get('effective_value'))
      }
      const amountPaid = Number(grossAmount.toFixed(2))

      const renewalsCol = $app.findCollectionByNameOrId('license_renewals')
      const renewalRecord = new Record(renewalsCol)
      renewalRecord.set('tenant', tenantRecord.id)
      renewalRecord.set('previous_expiration', curExpStr)
      renewalRecord.set('new_expiration', newExp.toISOString())
      renewalRecord.set('days_added', 30)
      renewalRecord.set('amount_paid', amountPaid)
      renewalRecord.set(
        'notes',
        'Renovação automática via PIX Mercado Pago (ID: ' + paymentId + ')',
      )
      renewalRecord.set('renewed_by', 'Mercado Pago PIX')
      renewalRecord.set('event_type', 'renewal_pix')
      renewalRecord.set('plan_name', pName)
      renewalRecord.set('description', 'Renovação por 30 dias via PIX')
      renewalRecord.set('period_display', '30 dias adicionados')
      renewalRecord.set('payment_id', String(paymentId))
      renewalRecord.set('payment_status', 'approved')
      $app.save(renewalRecord)

      tenantRecord.set('expiration_date', newExp.toISOString())
      tenantRecord.set('plan_status', 'active')
      tenantRecord.set('pending_pix_payment_id', '')
      $app.save(tenantRecord)

      console.log(
        '[Webhook MP] Pagamento aprovado ' +
          paymentId +
          ', tenant ' +
          tenantRecord.id +
          ' renovado +30d (nova expiração: ' +
          newExp.toISOString() +
          ')',
      )
    }

    return e.json(200, { received: true, status: status })
  } catch (err) {
    console.log('[Webhook MP Erro]:', err ? err.message : err)
    return e.json(200, { received: true, error: err ? err.message : String(err) })
  }
})
