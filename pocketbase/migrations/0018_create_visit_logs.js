migrate(
  (app) => {
    const collection = new Collection({
      name: 'visit_logs',
      type: 'base',
      listRule: "@request.auth.role = 'gestor'",
      viewRule: "@request.auth.role = 'gestor'",
      createRule: '',
      updateRule: "@request.auth.role = 'gestor'",
      deleteRule: "@request.auth.role = 'gestor'",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['pageview', 'click'],
          maxSelect: 1,
        },
        {
          name: 'modality',
          type: 'select',
          required: false,
          values: ['direct', 'organic', 'social', 'referral', 'paid', 'unknown'],
          maxSelect: 1,
        },
        { name: 'source', type: 'text', required: false },
        {
          name: 'device',
          type: 'select',
          required: false,
          values: ['mobile', 'desktop', 'tablet'],
          maxSelect: 1,
        },
        { name: 'browser', type: 'text', required: false },
        { name: 'os', type: 'text', required: false },
        { name: 'country', type: 'text', required: false },
        { name: 'region', type: 'text', required: false },
        { name: 'city', type: 'text', required: false },
        { name: 'ip_hash', type: 'text', required: false },
        { name: 'referrer', type: 'text', required: false },
        { name: 'path', type: 'text', required: false },
        { name: 'session_id', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_visit_logs_created ON visit_logs (created)',
        'CREATE INDEX idx_visit_logs_type ON visit_logs (type)',
        'CREATE INDEX idx_visit_logs_modality ON visit_logs (modality)',
        'CREATE INDEX idx_visit_logs_device ON visit_logs (device)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('visit_logs')
      app.delete(collection)
    } catch (_) {}
  },
)
