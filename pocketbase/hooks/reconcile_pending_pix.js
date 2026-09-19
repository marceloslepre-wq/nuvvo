// Hook para reconciliação de pagamentos PIX pendentes e agendamento de verificação periódica (cron)

// Função utilitária de reconciliação que pode ser executada por tenant ou para todos os pendentes
routerAdd(
  'POST',
  '/backend/v1/licenses/reconcile-pending',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const role = authRecord.getString('role')
    const userTenant = authRecord.getString('tenant')

    const body = e.requestInfo().body || {}
    let targetTenantId = (body.tenant_id || '').trim()

    // Se o gestor não informou tenant_id ou informou outro, restringe ao seu próprio
    if (role !== 'master') {
      targetTenantId = userTenant
    }

    const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
    if (!mpToken) {
      return e.json(200, {
        success: false,
        message: 'Token do Mercado Pago não configurado',
        reconciled_count: 0,
      })
    }

    let tenantsToProcess = []
    if (targetTenantId) {
      try {
        const tRec = $app.findRecordById('tenants', targetTenantId)
        tenantsToProcess.push(tRec)
      } catch (_) {}
    } else {
      // Master pode verificar todos que têm pending_pix_payment_id
      try {
        tenantsToProcess = $app.findRecordsByFilter(
          'tenants',
          "pending_pix_payment_id != '' && pending_pix_payment_id != null",
          '-updated',
          20,
          0,
        )
      } catch (_) {}
    }

    let reconciledCount = 0
    const results = []

    for (let i = 0; i < tenantsToProcess.length; i++) {
      const t = tenantsToProcess[i]
      const pid = (t.getString('pending_pix_payment_id') || '').trim()
      if (!pid) continue

      try {
        const res = $http.send({
          url: 'https://api.mercadopago.com/v1/payments/' + pid,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + mpToken,
          },
          timeout: 15,
        })

        if (res.statusCode !== 200) {
          results.push({
            tenant_id: t.id,
            payment_id: pid,
            status: 'fetch_failed',
            code: res.statusCode,
          })
          continue
        }

        const payData = res.json || {}
        const status = payData.status || 'pending'
        const statusDetail = payData.status_detail || ''

        if (status === 'approved') {
          // Checar se já processou
          let alreadyProcessed = false
          try {
            const existing = $app.findRecordsByFilter(
              'license_renewals',
              "payment_id = '" + pid + "'",
              '-created',
              1,
              0,
            )
            if (existing && existing.length > 0) {
              alreadyProcessed = true
            }
          } catch (_) {}

          if (!alreadyProcessed) {
            const curExpStr = t.getString('expiration_date')
            const currentExp = curExpStr ? new Date(curExpStr) : new Date()
            const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
            const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

            let pName = ''
            try {
              const pRec = $app.findRecordById('plans', t.getString('plan'))
              pName = pRec.getString('name')
            } catch (_) {
              pName = 'Plano Comercial'
            }

            let grossAmount = 0
            if (payData.transaction_amount && Number(payData.transaction_amount) > 0) {
              grossAmount = Number(payData.transaction_amount)
            } else if (t.get('effective_value') && Number(t.get('effective_value')) > 0) {
              grossAmount = Number(t.get('effective_value'))
            }
            const amountPaid = Number(grossAmount.toFixed(2))

            const renewalsCol = $app.findCollectionByNameOrId('license_renewals')
            const renewalRecord = new Record(renewalsCol)
            renewalRecord.set('tenant', t.id)
            renewalRecord.set('previous_expiration', curExpStr)
            renewalRecord.set('new_expiration', newExp.toISOString())
            renewalRecord.set('days_added', 30)
            renewalRecord.set('amount_paid', amountPaid)
            renewalRecord.set(
              'notes',
              'Renovação confirmada via Reconciliação Automática PIX (MP ID: ' + pid + ')',
            )
            renewalRecord.set('renewed_by', 'Mercado Pago PIX')
            renewalRecord.set('event_type', 'renewal_pix')
            renewalRecord.set('plan_name', pName)
            renewalRecord.set('description', 'Renovação por 30 dias via PIX')
            renewalRecord.set('period_display', '30 dias adicionados')
            renewalRecord.set('payment_id', String(pid))
            renewalRecord.set('payment_status', 'approved')
            $app.save(renewalRecord)

            t.set('expiration_date', newExp.toISOString())
            t.set('plan_status', 'active')
            t.set('pending_pix_payment_id', '')
            $app.save(t)

            reconciledCount++
            results.push({
              tenant_id: t.id,
              payment_id: pid,
              status: 'approved_and_renewed',
              new_expiration: newExp.toISOString(),
            })
            console.log(
              '[Reconcile Pending] Pagamento aprovado ' + pid + ' renovou tenant ' + t.id + ' +30d',
            )
          } else {
            // Já estava processado, limpa pendência
            t.set('pending_pix_payment_id', '')
            $app.save(t)
            results.push({
              tenant_id: t.id,
              payment_id: pid,
              status: 'already_renewed_cleared',
            })
          }
        } else if (status === 'cancelled' || status === 'rejected') {
          // Limpa se cancelado ou rejeitado
          t.set('pending_pix_payment_id', '')
          $app.save(t)
          results.push({
            tenant_id: t.id,
            payment_id: pid,
            status: status,
            detail: statusDetail,
            cleared: true,
          })
        } else {
          results.push({
            tenant_id: t.id,
            payment_id: pid,
            status: status,
            detail: statusDetail,
          })
        }
      } catch (err) {
        results.push({
          tenant_id: t.id,
          payment_id: pid,
          error: err ? err.message : String(err),
        })
      }
    }

    return e.json(200, {
      success: true,
      reconciled_count: reconciledCount,
      results: results,
    })
  },
  $apis.requireAuth(),
)

// Job agendado (cron) a cada 2 minutos para reconciliação automática
cronAdd('reconcile_pending_pix', '*/2 * * * *', () => {
  const mpToken = $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
  if (!mpToken) return

  let pendingTenants = []
  try {
    pendingTenants = $app.findRecordsByFilter(
      'tenants',
      "pending_pix_payment_id != '' && pending_pix_payment_id != null",
      '-updated',
      20,
      0,
    )
  } catch (_) {
    return
  }

  if (!pendingTenants || pendingTenants.length === 0) return

  console.log('[Cron Reconcile] Verificando ' + pendingTenants.length + ' pagamentos pendentes...')

  for (let i = 0; i < pendingTenants.length; i++) {
    const t = pendingTenants[i]
    const pid = (t.getString('pending_pix_payment_id') || '').trim()
    if (!pid) continue

    try {
      const res = $http.send({
        url: 'https://api.mercadopago.com/v1/payments/' + pid,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + mpToken,
        },
        timeout: 15,
      })

      if (res.statusCode !== 200) continue

      const payData = res.json || {}
      const status = payData.status || ''

      if (status === 'approved') {
        let alreadyProcessed = false
        try {
          const existing = $app.findRecordsByFilter(
            'license_renewals',
            "payment_id = '" + pid + "'",
            '-created',
            1,
            0,
          )
          if (existing && existing.length > 0) {
            alreadyProcessed = true
          }
        } catch (_) {}

        if (!alreadyProcessed) {
          const curExpStr = t.getString('expiration_date')
          const currentExp = curExpStr ? new Date(curExpStr) : new Date()
          const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
          const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

          let pName = ''
          try {
            const pRec = $app.findRecordById('plans', t.getString('plan'))
            pName = pRec.getString('name')
          } catch (_) {
            pName = 'Plano Comercial'
          }

          let grossAmount = 0
          if (payData.transaction_amount && Number(payData.transaction_amount) > 0) {
            grossAmount = Number(payData.transaction_amount)
          } else if (t.get('effective_value') && Number(t.get('effective_value')) > 0) {
            grossAmount = Number(t.get('effective_value'))
          }
          const amountPaid = Number(grossAmount.toFixed(2))

          const renewalsCol = $app.findCollectionByNameOrId('license_renewals')
          const renewalRecord = new Record(renewalsCol)
          renewalRecord.set('tenant', t.id)
          renewalRecord.set('previous_expiration', curExpStr)
          renewalRecord.set('new_expiration', newExp.toISOString())
          renewalRecord.set('days_added', 30)
          renewalRecord.set('amount_paid', amountPaid)
          renewalRecord.set(
            'notes',
            'Renovação confirmada via Reconciliação Agendada (Cron / MP ID: ' + pid + ')',
          )
          renewalRecord.set('renewed_by', 'Mercado Pago PIX')
          renewalRecord.set('event_type', 'renewal_pix')
          renewalRecord.set('plan_name', pName)
          renewalRecord.set('description', 'Renovação por 30 dias via PIX')
          renewalRecord.set('period_display', '30 dias adicionados')
          renewalRecord.set('payment_id', String(pid))
          renewalRecord.set('payment_status', 'approved')
          $app.save(renewalRecord)

          t.set('expiration_date', newExp.toISOString())
          t.set('plan_status', 'active')
          t.set('pending_pix_payment_id', '')
          $app.save(t)

          console.log('[Cron Reconcile] Pagamento aprovado ' + pid + ' renovou tenant ' + t.id)
        } else {
          t.set('pending_pix_payment_id', '')
          $app.save(t)
        }
      } else if (status === 'cancelled' || status === 'rejected') {
        t.set('pending_pix_payment_id', '')
        $app.save(t)
      }
    } catch (cronErr) {
      console.log('[Cron Reconcile Erro]:', cronErr ? cronErr.message : cronErr)
    }
  }
})
