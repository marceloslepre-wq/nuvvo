/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('site_settings')

    settings.fields.add(
      new FileField({
        name: 'logo',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      }),
    )

    settings.listRule = ''
    settings.viewRule = ''
    settings.updateRule = "@request.auth.role = 'gestor'"

    app.save(settings)
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('site_settings')

    settings.fields.removeByName('logo')
    settings.updateRule = "@request.auth.id != ''"

    app.save(settings)
  },
)
