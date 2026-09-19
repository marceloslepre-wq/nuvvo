migrate(
  (app) => {
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    let originTenant
    try {
      originTenant = app.findFirstRecordByData('tenants', 'is_origin', true)
    } catch (_) {
      try {
        originTenant = app.findFirstRecordByData('tenants', 'slug', 'hospital-home')
      } catch (e) {
        originTenant = null
      }
    }
    const originTenantId = originTenant ? originTenant.id : 'xcrr5hi2j3lu7wg'

    // 1. Add tenant field to categories
    const categoriesCol = app.findCollectionByNameOrId('categories')
    if (!categoriesCol.fields.getByName('tenant')) {
      categoriesCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenantsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(categoriesCol)
    }

    // 2. Add tenant field to variations
    const variationsCol = app.findCollectionByNameOrId('variations')
    if (!variationsCol.fields.getByName('tenant')) {
      variationsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenantsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(variationsCol)
    }

    // 3. Add tenant field to rental_periods
    const rentalPeriodsCol = app.findCollectionByNameOrId('rental_periods')
    if (!rentalPeriodsCol.fields.getByName('tenant')) {
      rentalPeriodsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenantsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(rentalPeriodsCol)
    }

    // 4. Backfill existing records with originTenantId
    if (originTenantId) {
      app
        .db()
        .newQuery('UPDATE categories SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()

      app
        .db()
        .newQuery('UPDATE variations SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()

      app
        .db()
        .newQuery('UPDATE rental_periods SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()

      app
        .db()
        .newQuery('UPDATE products SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()

      app
        .db()
        .newQuery('UPDATE pickup_locations SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()

      app
        .db()
        .newQuery('UPDATE site_settings SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
        .bind({ t: originTenantId })
        .execute()
    }

    // 5. Corrigir tenant "teste land page" existente se não tiver site_settings ou license_renewals
    try {
      const testTenant = app.findFirstRecordByData('tenants', 'slug', 'testelandpage')
      if (testTenant) {
        // Criar site_settings para testTenant se não existir
        try {
          app.findFirstRecordByData('site_settings', 'tenant', testTenant.id)
        } catch (_) {
          const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
          const ssRecord = new Record(siteSettingsCol)
          ssRecord.set('tenant', testTenant.id)
          ssRecord.set('phone', testTenant.getString('phone') || '')
          ssRecord.set('email', testTenant.getString('email') || '')
          app.save(ssRecord)
        }

        // Criar evento license_created em license_renewals para testTenant se não existir
        try {
          app.findFirstRecordByData('license_renewals', 'tenant', testTenant.id)
        } catch (_) {
          const renewalsCol = app.findCollectionByNameOrId('license_renewals')
          const renRecord = new Record(renewalsCol)
          renRecord.set('tenant', testTenant.id)
          renRecord.set('new_expiration', testTenant.getString('expiration_date'))
          renRecord.set('days_added', 15)
          renRecord.set('amount_paid', 0)
          renRecord.set('notes', 'Conta criada via Onboarding público (Trial 15 dias)')
          renRecord.set('renewed_by', 'Auto Onboarding')
          renRecord.set('event_type', 'license_created')
          renRecord.set('plan_name', 'Básico')
          renRecord.set('description', 'Criação de licença em período de testes (15 dias)')
          renRecord.set('period_display', '15 dias de teste grátis')
          app.save(renRecord)
        }
      }
    } catch (_) {}

    // 6. Também criar evento license_created para o originTenant (Hospital Home) em license_renewals se vazio
    try {
      if (originTenantId) {
        try {
          app.findFirstRecordByData('license_renewals', 'tenant', originTenantId)
        } catch (_) {
          const renewalsCol = app.findCollectionByNameOrId('license_renewals')
          const origRenRecord = new Record(renewalsCol)
          origRenRecord.set('tenant', originTenantId)
          origRenRecord.set(
            'new_expiration',
            originTenant ? originTenant.getString('expiration_date') : '2030-12-31 23:59:59.000Z',
          )
          origRenRecord.set('days_added', 0)
          origRenRecord.set('amount_paid', 0)
          origRenRecord.set('notes', 'Instância de Origem Hospital Home')
          origRenRecord.set('renewed_by', 'Sistema Master')
          origRenRecord.set('event_type', 'license_created')
          origRenRecord.set('plan_name', 'Plano Master')
          origRenRecord.set('description', 'Instância Master de Origem')
          origRenRecord.set('period_display', 'Ativa')
          app.save(origRenRecord)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Revert adding fields
    try {
      const categoriesCol = app.findCollectionByNameOrId('categories')
      categoriesCol.fields.removeByName('tenant')
      app.save(categoriesCol)
    } catch (_) {}

    try {
      const variationsCol = app.findCollectionByNameOrId('variations')
      variationsCol.fields.removeByName('tenant')
      app.save(variationsCol)
    } catch (_) {}

    try {
      const rentalPeriodsCol = app.findCollectionByNameOrId('rental_periods')
      rentalPeriodsCol.fields.removeByName('tenant')
      app.save(rentalPeriodsCol)
    } catch (_) {}
  },
)
