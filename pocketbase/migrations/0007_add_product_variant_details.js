migrate(
  (app) => {
    const collection = new Collection({
      name: 'product_variant_details',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'product',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('products').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'variation',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('variations').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'reference_code',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_pvd_product ON product_variant_details (product)',
        'CREATE INDEX idx_pvd_variation ON product_variant_details (variation)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('product_variant_details')
    app.delete(collection)
  },
)
