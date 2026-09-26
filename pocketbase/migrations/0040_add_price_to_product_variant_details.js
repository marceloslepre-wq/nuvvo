migrate(
  (app) => {
    const pvd = app.findCollectionByNameOrId('product_variant_details')
    if (!pvd.fields.getByName('price')) {
      pvd.fields.add(
        new NumberField({
          name: 'price',
          min: 0,
        }),
      )
      app.save(pvd)
    }
  },
  (app) => {
    try {
      const pvd = app.findCollectionByNameOrId('product_variant_details')
      const field = pvd.fields.getByName('price')
      if (field) {
        pvd.fields.remove(field)
        app.save(pvd)
      }
    } catch (_) {}
  },
)
