migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('visit_logs')

    if (!col.fields.getByName('ip')) {
      col.fields.add(new TextField({ name: 'ip', required: false }))
    }

    col.addIndex('idx_visit_logs_ip', false, 'ip', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('visit_logs')

    try {
      col.removeIndex('idx_visit_logs_ip')
    } catch (_) {}

    const existing = col.fields.getByName('ip')
    if (existing) {
      col.fields.remove(existing)
    }

    app.save(col)
  },
)
