migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('visit_logs')

    if (!col.fields.getByName('click_origin')) {
      col.fields.add(new TextField({ name: 'click_origin', required: false }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('visit_logs')

    const existing = col.fields.getByName('click_origin')
    if (existing) {
      col.fields.remove(existing)
    }

    app.save(col)
  },
)
