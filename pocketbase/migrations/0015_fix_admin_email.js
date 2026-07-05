migrate(
  (app) => {
    let user = null

    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
    } catch (_) {}

    if (user) {
      try {
        const typoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gamil.com')
        if (typoUser && typoUser.id !== user.id) {
          app.delete(typoUser)
        }
      } catch (_) {}

      user.setVerified(true)
      user.set('role', 'gestor')
      app.save(user)
    } else {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gamil.com')
        user.setEmail('marceloslepre@gmail.com')
        user.setVerified(true)
        user.set('role', 'gestor')
        app.save(user)
      } catch (_) {
        const users = app.findCollectionByNameOrId('_pb_users_auth_')
        const record = new Record(users)
        record.setEmail('marceloslepre@gmail.com')
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', 'Marcelo Slepre')
        record.set('role', 'gestor')
        app.save(record)
      }
    }
  },
  (app) => {},
)
