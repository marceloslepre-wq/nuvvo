migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Garantir que as regras de acesso da coleção users permitam:
    // - Master: vê/altera qualquer usuário
    // - Gestor: vê usuários do seu tenant (incluindo usuários legados com tenant vazio se o gestor for do tenant de origem, e a si mesmo),
    //   e NUNCA vê usuários de outros tenants nem o Master (a não ser que seja o próprio Master).
    // - Funcionário / usuário individual: vê a si próprio
    //
    // No SQLite/PocketBase:
    // listRule:
    // @request.auth.role = 'master' || (@request.auth.role = 'gestor' && (role != 'master' || id = @request.auth.id) && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id
    users.listRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && (role != 'master' || id = @request.auth.id) && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    users.viewRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && (role != 'master' || id = @request.auth.id) && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    // Create: Master ou Gestor podem cadastrar novos usuários
    users.createRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"

    // Update: Master pode atualizar qualquer um; Gestor pode atualizar usuários do mesmo tenant (role != 'master' ou a si próprio); usuário pode atualizar a si próprio
    users.updateRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && (role != 'master' || id = @request.auth.id) && (tenant = @request.auth.tenant || tenant = '' || tenant = null)) || id = @request.auth.id"

    // Delete: Master pode excluir qualquer um (protegido por hook se for o master único); Gestor pode excluir usuários do mesmo tenant que não sejam master
    users.deleteRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && role != 'master' && (tenant = @request.auth.tenant || tenant = '' || tenant = null))"

    app.save(users)

    // 2. Garantir que o gestor principal e usuários legados estejam com tenant configurado
    let originTenant
    try {
      originTenant = app.findFirstRecordByData('tenants', 'slug', 'hospital-home')
    } catch (_) {}

    if (originTenant) {
      app
        .db()
        .newQuery('UPDATE users SET tenant = {:t} WHERE (tenant IS NULL OR tenant = "")')
        .bind({ t: originTenant.id })
        .execute()
    }

    // 3. Seed de um funcionário de teste para o tenant de origem (se ainda não existir)
    // para enriquecer a listagem inicial e validar que tanto gestores quanto funcionários aparecem na tabela
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'funcionario@email.com')
    } catch (_) {
      try {
        const funcRecord = new Record(users)
        funcRecord.setEmail('funcionario@email.com')
        funcRecord.setPassword('Skip@Pass123!')
        funcRecord.setVerified(true)
        funcRecord.set('name', 'Ana Santos (Atendimento)')
        funcRecord.set('role', 'funcionario')
        if (originTenant) {
          funcRecord.set('tenant', originTenant.id)
        }
        app.save(funcRecord)
      } catch (e) {
        console.log('Não foi possível seedar funcionário padrão:', e)
      }
    }
  },
  (app) => {
    try {
      const funcRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'funcionario@email.com')
      app.delete(funcRecord)
    } catch (_) {}
  },
)
