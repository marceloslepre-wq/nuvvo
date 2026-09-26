migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    if (!products.fields.getByName('price')) {
      products.fields.add(
        new NumberField({
          name: 'price',
          min: 0,
        }),
      )
      app.save(products)
    }
  },
  (app) => {
    try {
      const products = app.findCollectionByNameOrId('products')
      const field = products.fields.getByName('price')
      if (field) {
        products.fields.remove(field)
        app.save(products)
      }
    } catch (_) {}
  },
)
