// Hook de validação no ciclo de vida de criação/atualização de usuários:
// 1. Garante que novos usuários criados por um 'gestor' fiquem estritamente vinculados ao seu tenant.
// 2. Impede que um 'gestor' crie ou promova usuários para o perfil 'master'.
onRecordCreateRequest((e) => {
  const auth = e.auth
  if (!auth) {
    return e.next()
  }

  const authRole = auth.getString('role')
  const record = e.record
  if (!record) {
    return e.next()
  }

  // Se o autor for gestor, reforçar regras de segurança e isolamento
  if (authRole === 'gestor') {
    const targetRole = record.getString('role')
    if (targetRole === 'master') {
      return e.forbiddenError('Gestores não têm permissão para criar usuários com perfil Master.')
    }

    // Se o gestor pertence a um tenant, força o novo usuário a ter o mesmo tenant
    const authTenant = auth.getString('tenant')
    if (authTenant) {
      record.set('tenant', authTenant)
    }
  }

  return e.next()
}, 'users')
