migrate(
  (app) => {
    // 1. Create tenants collection
    const tenants = new Collection({
      name: 'tenants',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.role = 'gestor'",
      updateRule: "@request.auth.role = 'gestor'",
      deleteRule: "@request.auth.role = 'gestor'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'subdomain', type: 'text' },
        { name: 'custom_domain', type: 'text' },
        { name: 'preview_host', type: 'text' },
        { name: 'extra_hosts', type: 'text' },
        { name: 'status', type: 'select', values: ['active', 'inactive'], maxSelect: 1 },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        },
        { name: 'hero_media', type: 'file', maxSelect: 1, maxSize: 15242880 },
        { name: 'about_us', type: 'editor' },
        { name: 'terms', type: 'editor' },
        { name: 'privacy', type: 'editor' },
        { name: 'returns', type: 'editor' },
        { name: 'primary_color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_tenants_slug ON tenants (slug)'],
    })
    app.save(tenants)

    // 2. Add tenant relation field to products, pickup_locations, site_settings, visit_logs
    const productsCol = app.findCollectionByNameOrId('products')
    if (!productsCol.fields.getByName('tenant')) {
      productsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenants.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(productsCol)
    }

    const locationsCol = app.findCollectionByNameOrId('pickup_locations')
    if (!locationsCol.fields.getByName('tenant')) {
      locationsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenants.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(locationsCol)
    }

    const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
    if (!siteSettingsCol.fields.getByName('tenant')) {
      siteSettingsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenants.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(siteSettingsCol)
    }

    const visitLogsCol = app.findCollectionByNameOrId('visit_logs')
    if (!visitLogsCol.fields.getByName('tenant')) {
      visitLogsCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenants.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(visitLogsCol)
    }

    // 3. Seed Hospital Home tenant (idempotent)
    let hospitalTenant
    try {
      hospitalTenant = app.findFirstRecordByData('tenants', 'slug', 'hospital-home')
    } catch (_) {
      hospitalTenant = new Record(tenants)
      hospitalTenant.set('name', 'Hospital Home')
      hospitalTenant.set('slug', 'hospital-home')
      hospitalTenant.set('subdomain', 'aluguelhospitalhome')
      hospitalTenant.set('custom_domain', 'aluguelhospitalhome.sholver.com.br')
      hospitalTenant.set('preview_host', 'plataforma-de-vendas-8286f--preview.goskip.app')
      hospitalTenant.set('extra_hosts', 'localhost,127.0.0.1,plataforma-de-vendas-8286f.goskip.app')
      hospitalTenant.set('status', 'active')
      hospitalTenant.set('phone', '27999046961')
      hospitalTenant.set('email', 'aluguel@hospitalhome.com.br')
      hospitalTenant.set('primary_color', '#0ea5e9')
      app.save(hospitalTenant)
    }

    // 4. Migrate existing data to belong to hospitalTenant
    const tenantId = hospitalTenant.id

    app
      .db()
      .newQuery('UPDATE products SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
      .bind({ t: tenantId })
      .execute()

    app
      .db()
      .newQuery('UPDATE pickup_locations SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
      .bind({ t: tenantId })
      .execute()

    app
      .db()
      .newQuery('UPDATE site_settings SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
      .bind({ t: tenantId })
      .execute()

    app
      .db()
      .newQuery('UPDATE visit_logs SET tenant = {:t} WHERE tenant IS NULL OR tenant = ""')
      .bind({ t: tenantId })
      .execute()
  },
  (app) => {
    try {
      const tenants = app.findCollectionByNameOrId('tenants')
      app.delete(tenants)
    } catch (_) {}
  },
)
