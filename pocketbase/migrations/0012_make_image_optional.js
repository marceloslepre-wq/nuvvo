migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('products')
    const field = col.fields.getByName('image')
    if (field) {
      field.required = false
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('products')
    const field = col.fields.getByName('image')
    if (field) {
      field.required = true
      app.save(col)
    }
  },
)
