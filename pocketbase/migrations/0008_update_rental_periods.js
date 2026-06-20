migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('products')
    const field = col.fields.getByName('rental_period')
    if (field) {
      field.maxSelect = 100
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('products')
    const field = col.fields.getByName('rental_period')
    if (field) {
      field.maxSelect = 1
      app.save(col)
    }
  },
)
