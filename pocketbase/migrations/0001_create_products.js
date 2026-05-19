migrate(
  (app) => {
    const collection = new Collection({
      name: 'products',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        {
          name: 'image',
          type: 'file',
          required: true,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          maxSelect: 1,
          maxSize: 5242880,
        },
        {
          name: 'video',
          type: 'file',
          required: false,
          mimeTypes: ['video/mp4'],
          maxSelect: 1,
          maxSize: 52428800,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'inactive'],
          maxSelect: 1,
        },
        { name: 'order', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_order ON products (`order`)',
        'CREATE INDEX idx_products_status ON products (status)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('products')
    app.delete(collection)
  },
)
