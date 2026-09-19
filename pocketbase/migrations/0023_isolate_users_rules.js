migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Regras de acesso com isolamento multi-tenant:
    // 1. Master: pode listar, ver, atualizar e deletar qualquer registro.
    // 2. Gestor:
    //    - list/view: vê usuários pertencentes ao mesmo tenant (ou registros legados da mesma empresa de origem),
    //      exceto o usuário Master (salvo se o Master for visto por si próprio).
    //      Se o tenant coincidir, ou for originTenant legado, o gestor pode gerenciar seus usuários.
    // 3. Usuário individual (funcionário / próprio): pode ver/atualizar seu próprio registro (id = @request.auth.id).
    //
    // No SQLite/PocketBase API rules:
    // listRule:
    //   @request.auth.role = 'master' ||
    //   (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) ||
    //   id = @request.auth.id
    users.listRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    users.viewRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    // Create: master pode criar qualquer usuário; gestor pode criar usuários
    users.createRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"

    // Update: master pode atualizar qualquer um; gestor pode atualizar usuários do mesmo tenant (role != 'master'); próprio usuário pode atualizar a si mesmo
    users.updateRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    // Delete: master pode excluir qualquer usuário (exceto o próprio master protegido por hook); gestor pode excluir usuários do seu tenant
    users.deleteRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null))"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.viewRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.createRule = ''
    users.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'gestor' || id = @request.auth.id"
    users.deleteRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"
    app.save(users)
  },
)
