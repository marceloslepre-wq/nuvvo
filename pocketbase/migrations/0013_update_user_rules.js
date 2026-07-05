migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.listRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.viewRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.updateRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.deleteRule = "@request.auth.role = 'gestor'"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'

    app.save(users)
  },
)
