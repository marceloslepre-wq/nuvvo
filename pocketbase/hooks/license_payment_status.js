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
          '| Body:',
          JSON.stringify(res.json || res.raw || {}),
        )
        return e.json(res.statusCode === 404 ? 404 : 400, {
          error: 'Pagamento não encontrado no gateway',
        })
      }

      const payData = res.json || {}
      const status = payData.status || 'pending'
      const statusDetail = payData.status_detail || ''
      const metadata = payData.metadata || {}
      const externalRef = payData.external_reference || ''
      const tenantId = metadata.tenant_id || externalRef

      console.log(
        '[Payment Status] MP ID:',
        paymentId,
        '| Status:',
        status,
        '| Detail:',
        statusDetail,
        '| Tenant:',
        tenantId,
        '| UserTenant:',
        userTenant,
        '| Amount:',
        payData.transaction_amount,
      )

      // Segurança: gestor só pode consultar pagamentos vinculados ao seu tenant
      if (role !== 'master' && tenantId && tenantId !== userTenant) {
        console.log(
          '[Payment Status] Acesso negado: tenantId (' +
            tenantId +
            ') != userTenant (' +
            userTenant +
            ')',
        )
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
            tenantRecord.set('pending_pix_payment_id', '')
            $app.save(tenantRecord)

            renewedNow = true
            console.log(
              '[Payment Status] Pagamento aprovado ' +
                paymentId +
                ' renovou tenant ' +
                tenantRecord.id +
                ' +30d',
            )

            // Disparo automático de pedido para Sholver na confirmação de pagamento PIX (Polling/Instantâneo)
            // Fire-and-forget: reenvia com o MESMO numero_pedido ("NUVVO-<tenant_id>") para atualizar o pedido na Sholver
            try {
              const rawApiUrl = ($os.getenv('SHOLVER_API_URL') || '').trim()
              const webhookSecret = ($os.getenv('NUVVO_WEBHOOK_SECRET') || '').trim()
              const orderNumber = 'NUVVO-' + tenantRecord.id

              if (!rawApiUrl) {
                console.log(
                  '[Sholver Webhook] Ignorado no Polling: SHOLVER_API_URL não configurada. Pedido:',
                  orderNumber,
                )
              } else if (!webhookSecret) {
                console.log(
                  '[Sholver Webhook] Ignorado no Polling: NUVVO_WEBHOOK_SECRET não configurada. Pedido:',
                  orderNumber,
                )
              } else {
                const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '')
                const targetUrl = cleanBaseUrl + '/backend/v1/webhook/nuvvo'

                const sholverPayload = {
                  numero_pedido: orderNumber,
                  cliente: {
                    razao_social: tenantRecord.getString('name') || '',
                    nome_fantasia: '',
                    email: tenantRecord.getString('email') || '',
                    telefone: tenantRecord.getString('phone') || '',
                    documento: tenantRecord.getString('document_cnpj') || '',
                  },
                  plano: {
                    nome: pName,
                  },
                  produto: 'Nuvvo',
                  valor: Number(amountPaid),
                  metodo_pagamento: 'PIX',
                  status: 'pago',
                }

                console.log(
                  '[Sholver Webhook] Enviando confirmação de pagamento Polling para ' +
                    targetUrl +
                    ' | Pedido: ' +
                    orderNumber +
                    ' | Valor: ' +
                    amountPaid,
                )

                const sholverRes = $http.send({
                  url: targetUrl,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': webhookSecret,
                    'X-Sholver-Secret': webhookSecret,
                  },
                  body: JSON.stringify(sholverPayload),
                  timeout: 10,
                })

                const isSuccess = sholverRes.statusCode >= 200 && sholverRes.statusCode < 300
                console.log(
                  '[Sholver Webhook] Resposta Polling recebida. HTTP ' +
                    sholverRes.statusCode +
                    ' para pedido ' +
                    orderNumber +
                    ' (Sucesso: ' +
                    isSuccess +
                    ')',
                )
              }
            } catch (sholverErr) {
              console.log(
                '[Sholver Webhook Erro] Falha no disparo de pagamento Polling (tenant ' +
                  tenantRecord.id +
                  '): ' +
                  (sholverErr ? sholverErr.message : String(sholverErr)),
              )
            }
          } else {
            // Já havia sido processado anteriormente, limpa pending se for este
            if (tenantRecord.getString('pending_pix_payment_id') === String(paymentId)) {
              tenantRecord.set('pending_pix_payment_id', '')
              try {
                $app.save(tenantRecord)
              } catch (_) {}
            }
          }
        }
      }

      return e.json(200, {
        payment_id: paymentId,
        status: status,
        status_detail: statusDetail,
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
