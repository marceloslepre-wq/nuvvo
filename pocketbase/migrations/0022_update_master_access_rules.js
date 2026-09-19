migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Permitir expressamente master ou gestor listar/ver/atualizar/excluir usuários,
    // ou o próprio usuário ver/atualizar seu próprio registro.
    users.listRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.viewRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.deleteRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.viewRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.updateRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.deleteRule = "@request.auth.role = 'gestor'"
    app.save(users)
  },
)
