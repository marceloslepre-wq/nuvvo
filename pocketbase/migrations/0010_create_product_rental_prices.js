migrate(
  (app) => {
    const collection = new Collection({
      name: 'product_rental_prices',
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
          name: 'rental_period',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('rental_periods').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'price', type: 'number', required: true, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prp_product ON product_rental_prices (product)',
        'CREATE INDEX idx_prp_rental_period ON product_rental_prices (rental_period)',
        'CREATE UNIQUE INDEX idx_prp_unique ON product_rental_prices (product, rental_period)',
      ],
    })
    app.save(collection)

    const products = app.findCollectionByNameOrId('products')

    try {
      const productsRecords = app.findRecordsByFilter('products', '1=1', '', 10000, 0)
      for (const record of productsRecords) {
        const rps = record.get('rental_period') || []
        const rpList = Array.isArray(rps) ? rps : [rps]
        const oldPrice = record.getFloat('price')

        for (const rp of rpList) {
          if (!rp) continue
          try {
            const rpRecord = app.findFirstRecordByData('rental_periods', 'id', rp)
            const days = rpRecord.getInt('days') || 30
            const newPrice = Math.ceil(oldPrice * days)

            const newPrp = new Record(collection)
            newPrp.set('product', record.id)
            newPrp.set('rental_period', rp)
            newPrp.set('price', newPrice)
            app.save(newPrp)
          } catch (_) {}
        }
      }
    } catch (_) {}

    const priceField = products.fields.getByName('price')
    if (priceField) {
      products.fields.removeByName('price')
      app.save(products)
    }
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    if (!products.fields.getByName('price')) {
      products.fields.add(new NumberField({ name: 'price', required: true }))
      app.save(products)
    }

    try {
      const col = app.findCollectionByNameOrId('product_rental_prices')
      app.delete(col)
    } catch (_) {}
  },
)
