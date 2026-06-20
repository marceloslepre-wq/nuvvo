migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    products.fields.add(
      new RelationField({
        name: 'variations',
        collectionId: app.findCollectionByNameOrId('variations').id,
        maxSelect: 100,
      }),
    )
    app.save(products)

    products.addIndex('idx_products_variations', false, 'variations', '')
    app.save(products)
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    products.removeIndex('idx_products_variations')
    products.fields.removeByName('variations')
    app.save(products)
  },
)
