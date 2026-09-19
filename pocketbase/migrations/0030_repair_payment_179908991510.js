migrate(
  (app) => {
    const tenantId = 'w0kmyeyifik6r8i'
    const paymentId = '179908991510'
    const amountPaid = 3.0

    let tenant
    try {
      tenant = app.findRecordById('tenants', tenantId)
    } catch (_) {
      console.log('[Migration 0030] Tenant', tenantId, 'não encontrado.')
      return
    }

    // Verificar se já existe registro de renovação com este payment_id para evitar duplicidade
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

    // Calcular nova data de expiração (+30 dias a partir da expiração atual do tenant)
    const curExpStr = tenant.getString('expiration_date') || '2026-11-03T19:48:27.970Z'
    const curExp = new Date(curExpStr)
    const baseDate = isNaN(curExp.getTime()) || curExp.getTime() < Date.now() ? new Date() : curExp
    // +30 dias
    const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Obter plano do tenant
    let planName = 'teste'
    const planId = tenant.getString('plan')
    if (planId) {
      try {
        const planRecord = app.findRecordById('plans', planId)
        planName = planRecord.getString('name') || planName
      } catch (_) {}
    }

    if (!alreadyExists) {
      const renewalsCol = app.findCollectionByNameOrId('license_renewals')
      const renewalRecord = new Record(renewalsCol)
      renewalRecord.set('tenant', tenantId)
      renewalRecord.set('previous_expiration', curExpStr)
      renewalRecord.set('new_expiration', newExp.toISOString())
      renewalRecord.set('days_added', 30)
      renewalRecord.set('amount_paid', amountPaid)
      renewalRecord.set(
        'notes',
        'Renovação confirmada via PIX Mercado Pago (ID: ' + paymentId + ')',
      )
      renewalRecord.set('renewed_by', 'Mercado Pago PIX')
      renewalRecord.set('event_type', 'renewal_pix')
      renewalRecord.set('plan_name', planName)
      renewalRecord.set('description', 'Renovação por 30 dias via PIX')
      renewalRecord.set('period_display', '30 dias adicionados')
      renewalRecord.set('payment_id', paymentId)
      renewalRecord.set('payment_status', 'approved')
      app.save(renewalRecord)
      console.log(
        '[Migration 0030] Registro de renovação criado com sucesso para tenant',
        tenantId,
        'paymentId',
        paymentId,
      )
    }

    // Atualizar tenant
    tenant.set('expiration_date', newExp.toISOString())
    tenant.set('plan_status', 'active')
    app.save(tenant)
    console.log(
      '[Migration 0030] Tenant',
      tenantId,
      'atualizado para plan_status=active e nova expiration_date:',
      newExp.toISOString(),
    )
  },
  (app) => {
    try {
      const tenant = app.findRecordById('tenants', 'w0kmyeyifik6r8i')
      tenant.set('expiration_date', '2026-11-03T19:48:27.970Z')
      app.save(tenant)

      const existing = app.findRecordsByFilter(
        'license_renewals',
        "payment_id = '179908991510'",
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        app.delete(existing[0])
      }
    } catch (_) {}
  },
)
