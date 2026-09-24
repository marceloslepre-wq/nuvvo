migrate(
  (app) => {
    // 1. Adicionar facebook_url e instagram_url na collection site_settings
    const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
    if (!siteSettingsCol.fields.getByName('facebook_url')) {
      siteSettingsCol.fields.add(
        new TextField({
          name: 'facebook_url',
          required: false,
        }),
      )
    }
    if (!siteSettingsCol.fields.getByName('instagram_url')) {
      siteSettingsCol.fields.add(
        new TextField({
          name: 'instagram_url',
          required: false,
        }),
      )
    }
    app.save(siteSettingsCol)

    // 2. Adicionar facebook_url e instagram_url na collection tenants
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    if (!tenantsCol.fields.getByName('facebook_url')) {
      tenantsCol.fields.add(
        new TextField({
          name: 'facebook_url',
          required: false,
        }),
      )
    }
    if (!tenantsCol.fields.getByName('instagram_url')) {
      tenantsCol.fields.add(
        new TextField({
          name: 'instagram_url',
          required: false,
        }),
      )
    }
    app.save(tenantsCol)
  },
  (app) => {
    try {
      const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
      siteSettingsCol.fields.removeByName('facebook_url')
      siteSettingsCol.fields.removeByName('instagram_url')
      app.save(siteSettingsCol)
    } catch (_) {}

    try {
      const tenantsCol = app.findCollectionByNameOrId('tenants')
      tenantsCol.fields.removeByName('facebook_url')
      tenantsCol.fields.removeByName('instagram_url')
      app.save(tenantsCol)
    } catch (_) {}
  },
)
