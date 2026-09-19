// Endpoint para consulta de status de pagamento PIX e renovação sob demanda (Polling Fallback)
routerAdd(
  'GET',
  '/backend/v1/licenses/payment-status/{paymentId}',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const role = authRecord.getString('role')
    const userTenant = authRecord.getString('tenant')

    let paymentId = ''
    try {
      if (e.request && typeof e.request.pathValue === 'function') {
        paymentId = (e.request.pathValue('paymentId') || '').trim()
      }
    } catch (_) {}

    if (!paymentId) {
      try {
        const pathParams = e.requestInfo().pathParameters || {}
        paymentId = (pathParams.paymentId || '').trim()
      } catch (_) {}
    }

    if (!paymentId) {
      try {
        const queryParams = e.requestInfo().query || {}
        paymentId = (queryParams.paymentId || queryParams.id || '').trim()
      } catch (_) {}
    }

    if (!paymentId) {
      try {
        const urlPath = (e.request && e.request.url && e.request.url.path) || ''
        const parts = urlPath.split('/')
        paymentId = (parts[parts.length - 1] || '').trim()
      } catch (_) {}
    }

    if (!paymentId) {
      return e.badRequestError('ID do pagamento é obrigatório')
    }

    // Se for pagamento de teste / demo
    if (paymentId.startsWith('demo_')) {
      return e.json(200, {
        payment_id: paymentId,
        status: 'pending',
        mode: 'demo',
        renewed: false,
      })
    }

    const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
    if (!mpToken) {
      return e.json(200, {
        payment_id: paymentId,
        status: 'pending',
        mode: 'demo',
        renewed: false,
        message: 'Token do Mercado Pago não configurado',
      })
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
          '[Payment Status] Falha ao consultar MP. ID:',
          paymentId,
          '| Status:',
          res.statusCode,
        )
        return e.json(res.statusCode === 404 ? 404 : 400, {
          error: 'Pagamento não encontrado no gateway',
        })
      }

      const payData = res.json || {}
      const status = payData.status || 'pending'
      const metadata = payData.metadata || {}
      const externalRef = payData.external_reference || ''
      const tenantId = metadata.tenant_id || externalRef

      // Segurança: gestor só pode consultar pagamentos vinculados ao seu tenant
      if (role !== 'master' && tenantId && tenantId !== userTenant) {
        return e.json(403, { error: 'Acesso negado para este pagamento' })
      }

      let renewedNow = false
      let tenantRecord = null

      // Se status aprovado e temos o tenant, verificar se a renovação já ocorreu ou aplicar agora
      if (status === 'approved' && tenantId) {
        try {
          tenantRecord = $app.findRecordById('tenants', tenantId)
        } catch (_) {}

        if (tenantRecord) {
          // Verificar se já foi criado evento para este payment_id
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

          if (!alreadyProcessed) {
            const curExpStr = tenantRecord.getString('expiration_date')
            const currentExp = curExpStr ? new Date(curExpStr) : new Date()
            const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
            const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

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
              'Renovação confirmada via verificação instantânea (Polling / MP ID: ' +
                paymentId +
                ')',
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

            renewedNow = true
            console.log(
              '[Payment Status] Pagamento aprovado ' +
                paymentId +
                ' renovou tenant ' +
                tenantRecord.id +
                ' +30d',
            )
          }
        }
      }

      return e.json(200, {
        payment_id: paymentId,
        status: status,
        renewed: renewedNow || status === 'approved',
        tenant_id: tenantId,
      })
    } catch (err) {
      console.log('[Payment Status Erro]:', err ? err.message : err)
      return e.json(500, { error: 'Erro ao consultar status no Mercado Pago' })
    }
  },
  $apis.requireAuth(),
)
