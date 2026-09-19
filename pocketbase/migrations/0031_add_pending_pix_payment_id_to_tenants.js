migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tenants')
    if (!col.fields.getByName('pending_pix_payment_id')) {
      col.fields.add(
        new TextField({
          name: 'pending_pix_payment_id',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('tenants')
      const field = col.fields.getByName('pending_pix_payment_id')
      if (field) {
        col.fields.remove(field)
        app.save(col)
      }
    } catch (_) {}
  },
)
