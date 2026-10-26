migrate(
  (app) => {
    // 1. Adicionar gtm_id e meta_pixel_id na coleção tenants
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    if (!tenantsCol.fields.getByName('gtm_id')) {
      tenantsCol.fields.add(
        new TextField({
          name: 'gtm_id',
          required: false,
        }),
      )
    }
    if (!tenantsCol.fields.getByName('meta_pixel_id')) {
      tenantsCol.fields.add(
        new TextField({
          name: 'meta_pixel_id',
          required: false,
        }),
      )
    }
    app.save(tenantsCol)

    // 2. Pré-preencher Hospital Home caso campos estejam vazios
    // Localiza pelo subdomínio aluguelhospitalhome, slug hospital-home ou is_origin = true
    try {
      const records = app.findRecordsByFilter(
        'tenants',
        "subdomain = 'aluguelhospitalhome' || slug = 'hospital-home' || is_origin = true",
        'created',
        10,
        0,
      )

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        let changed = false
        const currentGtm = record.getString('gtm_id')
        const currentMeta = record.getString('meta_pixel_id')

        if (!currentGtm) {
          record.set('gtm_id', 'GTM-KH6V33Q5')
          changed = true
        }
        if (!currentMeta) {
          record.set('meta_pixel_id', '1063348857793554')
          changed = true
        }

        if (changed) {
          app.save(record)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const tenantsCol = app.findCollectionByNameOrId('tenants')
      tenantsCol.fields.removeByName('gtm_id')
      tenantsCol.fields.removeByName('meta_pixel_id')
      app.save(tenantsCol)
    } catch (_) {}
  },
)
