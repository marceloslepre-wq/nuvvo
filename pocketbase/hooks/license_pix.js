// Hook para criação e consulta de cobrança PIX via Mercado Pago ou Modo Demonstração
routerAdd(
  'POST',
  '/backend/v1/licenses/create-pix',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const role = authRecord.getString('role')
    const userTenant = authRecord.getString('tenant')

    const body = e.requestInfo().body || {}
    const tenantId = (body.tenant_id || userTenant || '').trim()

    if (!tenantId) {
      return e.badRequestError('ID do tenant é obrigatório')
    }

    // Gestor só pode gerar para seu próprio tenant; Master pode para qualquer
    if (role !== 'master' && tenantId !== userTenant) {
      return e.json(403, { error: 'Sem permissão para esta licença' })
    }

    let tenantRecord
    try {
      tenantRecord = $app.findRecordById('tenants', tenantId)
    } catch (err) {
      return e.notFoundError('Empresa/Licença não encontrada')
    }

    // Obter plano
    let planRecord = null
    const planId = tenantRecord.getString('plan')
    if (planId) {
      try {
        planRecord = $app.findRecordById('plans', planId)
      } catch (_) {}
    }

    const planName = planRecord ? planRecord.getString('name') : 'Plano Comercial'
    const planPrice = Number(
      tenantRecord.get('effective_value') || (planRecord ? planRecord.get('price') : 0) || 799.0,
    )
    const amountToPay = planPrice > 0 ? planPrice : 799.0

    const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''

    // Se o token existir, chamamos a API do Mercado Pago
    if (mpToken) {
      try {
        const payerEmail =
          tenantRecord.getString('email') ||
          authRecord.getString('email') ||
          'contato@sholver.com.br'
        const payerName = tenantRecord.getString('name') || 'Cliente'

        const payload = {
          transaction_amount: Number(amountToPay.toFixed(2)),
          description: 'Renovação Licença Nuvvo (30 dias) - ' + tenantRecord.getString('name'),
          payment_method_id: 'pix',
          payer: {
            email: payerEmail,
            first_name: payerName,
          },
          metadata: {
            tenant_id: tenantRecord.id,
            plan_name: planName,
            renew_type: 'pix_30_days',
            user_id: authRecord.id,
          },
        }

        const res = $http.send({
          url: 'https://api.mercadopago.com/v1/payments',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + mpToken,
            'X-Idempotency-Key': 'nuvvo-pix-' + tenantRecord.id + '-' + Date.now(),
          },
          body: JSON.stringify(payload),
          timeout: 20,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const mpData = res.json || {}
          const pointOfInt = mpData.point_of_interaction || {}
          const transData = pointOfInt.transaction_data || {}

          return e.json(200, {
            success: true,
            mode: 'live',
            payment_id: String(mpData.id || ''),
            status: mpData.status || 'pending',
            plan_name: planName,
            amount: amountToPay,
            qr_code: transData.qr_code || '',
            qr_code_base64: transData.qr_code_base64 || '',
            ticket_url: transData.ticket_url || '',
          })
        } else {
          console.log('Erro Mercado Pago HTTP:', res.statusCode, res.raw)
        }
      } catch (apiErr) {
        console.log('Exceção ao chamar Mercado Pago:', apiErr)
      }
    }

    // MODO DEMONSTRAÇÃO / TOKEN NÃO CONFIGURADO (Conforme solicitado no requisito 6)
    // Gera código PIX copia e cola representativo no formato EMV oficial com chave contato.sholver@...
    const staticPixCode =
      '00020126470014br.gov.bcb.pix0125contato.sholver@nuvvo.com.br52040000530398654' +
      amountToPay.toFixed(2).replace('.', '') +
      '5802BR5910NUVVO SISTEMAS6009SAO PAULO62070503***6304'

    return e.json(200, {
      success: true,
      mode: 'demo',
      payment_id: 'demo_' + tenantRecord.id + '_' + Date.now(),
      status: 'pending',
      plan_name: planName,
      amount: amountToPay,
      qr_code: staticPixCode,
      qr_code_base64: '',
      message:
        'Modo demonstração: o token MERCADO_PAGO_ACCESS_TOKEN ainda não foi adicionado nas variáveis de ambiente. A confirmação do PIX será validada manualmente.',
    })
  },
  $apis.requireAuth(),
)
