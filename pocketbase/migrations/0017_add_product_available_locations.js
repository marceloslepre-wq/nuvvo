migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')

    if (!products.fields.getByName('available_locations')) {
      products.fields.add(
        new RelationField({
          name: 'available_locations',
          collectionId: app.findCollectionByNameOrId('pickup_locations').id,
          maxSelect: 100,
        }),
      )
    }

    app.save(products)

    products.addIndex('idx_products_available_locations', false, 'available_locations', '')
    app.save(products)
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products')

    try {
      products.removeIndex('idx_products_available_locations')
    } catch (_) {}

    if (products.fields.getByName('available_locations')) {
      products.fields.removeByName('available_locations')
    }

    app.save(products)
  },
)
