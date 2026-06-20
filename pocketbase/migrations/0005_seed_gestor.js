migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@email.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('gestor@email.com')
    record.setPassword('senha@123')
    record.setVerified(true)
    record.set('name', 'Gestor')
    record.set('role', 'gestor')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@email.com')
      app.delete(record)
    } catch (_) {}
  },
)
