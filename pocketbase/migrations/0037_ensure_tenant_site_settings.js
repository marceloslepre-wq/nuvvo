migrate(
  (app) => {
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    const siteSettingsCol = app.findCollectionByNameOrId('site_settings')

    // 1. Localizar todos os tenants cadastrados
    const allTenants = app.findRecordsByFilter('tenants', '', 'created', 1000, 0)

    for (let i = 0; i < allTenants.length; i++) {
      const tenant = allTenants[i]
      let hasSettings = false
      try {
        const existing = app.findFirstRecordByData('site_settings', 'tenant', tenant.id)
        if (existing) {
          hasSettings = true
          // Se NÃO for a empresa de origem (Hospital Home), garantir que não herdou campos da raiz
          if (!tenant.getBool('is_origin') && tenant.getString('slug') !== 'hospital-home') {
            // Se tiver herdado dados da Hospital Home acidentalmente, limpa
            // Mantém apenas o que foi cadastrado na licença do tenant
            let needsUpdate = false
            if (existing.getString('phone') !== tenant.getString('phone')) {
              existing.set('phone', tenant.getString('phone'))
              needsUpdate = true
            }
            if (existing.getString('email') !== tenant.getString('email')) {
              existing.set('email', tenant.getString('email'))
              needsUpdate = true
            }
            if (needsUpdate) {
              app.save(existing)
            }
          }
        }
      } catch (_) {
        hasSettings = false
      }

      // Se o tenant não tiver site_settings vinculado, cria um novo pré-populado
      if (!hasSettings) {
        const ssRecord = new Record(siteSettingsCol)
        ssRecord.set('tenant', tenant.id)
        ssRecord.set('phone', tenant.getString('phone') || '')
        ssRecord.set('email', tenant.getString('email') || '')
        ssRecord.set('facebook_url', tenant.getString('facebook_url') || '')
        ssRecord.set('instagram_url', tenant.getString('instagram_url') || '')
        ssRecord.set('about_us', '')
        ssRecord.set('terms', '')
        ssRecord.set('privacy', '')
        ssRecord.set('returns', '')
        app.save(ssRecord)
      }
    }

    // 2. Garantir que nenhum registro em site_settings fique sem tenant
    try {
      const originTenant = app.findFirstRecordByData('tenants', 'is_origin', true)
      if (originTenant) {
        app
          .db()
          .newQuery(
            'UPDATE site_settings SET tenant = {:originId} WHERE tenant IS NULL OR tenant = ""',
          )
          .bind({ originId: originTenant.id })
          .execute()
      }
    } catch (_) {}
  },
  (app) => {
    // Revert opcional (mantém integridade)
  },
)
