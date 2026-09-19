// Webhook Mercado Pago para confirmação de pagamento PIX e renovação automática de licenças
routerAdd('POST', '/backend/v1/licenses/pix-webhook', (e) => {
  const query = e.requestInfo().query || {}
  const body = e.requestInfo().body || {}

  let paymentId = query['data.id'] || query.id || ''
  if (!paymentId && body.data && body.data.id) {
    paymentId = body.data.id
  }
  if (!paymentId && body.id) {
    paymentId = body.id
  }

  if (!paymentId) {
    return e.json(200, { received: true, ignored: 'no_id' })
  }

  const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
  if (!mpToken) {
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
      return e.json(200, { received: true, error: 'Could not fetch payment' })
    }

    const payData = res.json || {}
    const status = payData.status
    const metadata = payData.metadata || {}
    const tenantId = metadata.tenant_id

    if (status === 'approved' && tenantId) {
      let tenantRecord
      try {
        tenantRecord = $app.findRecordById('tenants', tenantId)
      } catch (notFound) {
        return e.json(200, { received: true, error: 'Tenant not found' })
      }

      // Checar se já foi processado
      let alreadyProcessed = false
      try {
        const existing = $app.findRecordsByFilter(
          'license_renewals',
          "payment_id = '" + paymentId + "'",
          '-created',
          1,
          0,
        )
        if (existing.length > 0) {
          alreadyProcessed = true
        }
      } catch (_) {}

      if (!alreadyProcessed) {
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

        const renewalsCol = $app.findCollectionByNameOrId('license_renewals')
        const renewalRecord = new Record(renewalsCol)
        renewalRecord.set('tenant', tenantRecord.id)
        renewalRecord.set('previous_expiration', curExpStr)
        renewalRecord.set('new_expiration', newExp.toISOString())
        renewalRecord.set('days_added', 30)
        renewalRecord.set(
          'amount_paid',
          payData.transaction_amount || tenantRecord.get('effective_value') || 0,
        )
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
        $app.save(tenantRecord)
      }
    }

    return e.json(200, { received: true, status: status })
  } catch (err) {
    console.log('Erro no webhook PIX:', err)
    return e.json(200, { received: true, error: err.message })
  }
})
