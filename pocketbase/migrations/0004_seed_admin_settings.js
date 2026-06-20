migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@email.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('gestor@email.com')
      record.setPassword('senha@123')
      record.setVerified(true)
      record.set('name', 'Gestor Principal')
      record.set('role', 'gestor')
      record.set('needs_password_reset', false)
      app.save(record)
    }

    const settings = app.findCollectionByNameOrId('site_settings')
    try {
      app.findFirstRecordByData('site_settings', 'email', 'contato@skipapps.com')
    } catch (_) {
      const s = new Record(settings)
      s.set('email', 'contato@skipapps.com')
      s.set('phone', '(11) 99999-9999')
      app.save(s)
    }
  },
  (app) => {},
)
