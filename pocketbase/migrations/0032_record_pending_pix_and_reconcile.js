migrate(
  (app) => {
    const tenantId = 'w0kmyeyifik6r8i'
    const paymentId = '178921384015'
    const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''

    let tenant
    try {
      tenant = app.findRecordById('tenants', tenantId)
    } catch (_) {
      console.log('[Migration 0032] Tenant', tenantId, 'não encontrado.')
      return
    }

    // Guardar payment_id como pending_pix_payment_id no tenant
    tenant.set('pending_pix_payment_id', paymentId)

    // Se o token estiver presente, consultar status no Mercado Pago
    if (mpToken) {
      try {
        const res = $http.send({
          url: 'https://api.mercadopago.com/v1/payments/' + paymentId,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + mpToken,
          },
          timeout: 15,
        })

        if (res.statusCode === 200) {
          const payData = res.json || {}
          const status = payData.status || ''
          console.log('[Migration 0032] MP Payment', paymentId, 'Status:', status)

          if (status === 'approved') {
            // Verificar se já existe registro em license_renewals
            let alreadyExists = false
            try {
              const existing = app.findRecordsByFilter(
                'license_renewals',
                "payment_id = '" + paymentId + "'",
                '-created',
                1,
                0,
              )
              if (existing && existing.length > 0) {
                alreadyExists = true
              }
            } catch (_) {}

            if (!alreadyExists) {
              const curExpStr = tenant.getString('expiration_date') || '2026-12-03T19:48:27.970Z'
              const curExp = new Date(curExpStr)
              const baseDate =
                isNaN(curExp.getTime()) || curExp.getTime() < Date.now() ? new Date() : curExp
              const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

              let pName = 'teste'
              const planId = tenant.getString('plan')
              if (planId) {
                try {
                  const planRecord = app.findRecordById('plans', planId)
                  pName = planRecord.getString('name') || pName
                } catch (_) {}
              }

              let grossAmount = 3.0
              if (payData.transaction_amount && Number(payData.transaction_amount) > 0) {
                grossAmount = Number(payData.transaction_amount)
              }

              const renewalsCol = app.findCollectionByNameOrId('license_renewals')
              const renewalRecord = new Record(renewalsCol)
              renewalRecord.set('tenant', tenantId)
              renewalRecord.set('previous_expiration', curExpStr)
              renewalRecord.set('new_expiration', newExp.toISOString())
              renewalRecord.set('days_added', 30)
              renewalRecord.set('amount_paid', grossAmount)
              renewalRecord.set(
                'notes',
                'Renovação confirmada via PIX Mercado Pago (ID: ' + paymentId + ')',
              )
              renewalRecord.set('renewed_by', 'Mercado Pago PIX')
              renewalRecord.set('event_type', 'renewal_pix')
              renewalRecord.set('plan_name', pName)
              renewalRecord.set('description', 'Renovação por 30 dias via PIX')
              renewalRecord.set('period_display', '30 dias adicionados')
              renewalRecord.set('payment_id', paymentId)
              renewalRecord.set('payment_status', 'approved')
              app.save(renewalRecord)

              tenant.set('expiration_date', newExp.toISOString())
              tenant.set('plan_status', 'active')
              tenant.set('pending_pix_payment_id', '')
              console.log(
                '[Migration 0032] Pagamento aprovado! Tenant renovado para',
                newExp.toISOString(),
              )
            }
          }
        }
      } catch (err) {
        console.log('[Migration 0032] Erro ao consultar MP:', err)
      }
    }

    app.save(tenant)
  },
  (app) => {
    try {
      const tenant = app.findRecordById('tenants', 'w0kmyeyifik6r8i')
      tenant.set('pending_pix_payment_id', '')
      app.save(tenant)
    } catch (_) {}
  },
)
