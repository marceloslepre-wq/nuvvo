// Hook de isolamento multi-tenant para listagem de usuários:
// "a listagem de usuários de cada instância de cliente NÃO deve mostrar usuários de outras instâncias nem o Master
// (cada listagem mostra somente quem pertence àquele cliente — nada de vínculo órfão vazando entre instâncias)"
// "O Master deve aparecer com badge vermelho 'Master' na listagem de usuários da minha instância de origem"
onRecordsListRequest((e) => {
  const auth = e.auth
  if (!auth) {
    return e.next()
  }

  const authRole = auth.getString('role')
  const authTenant = auth.getString('tenant')

  // Se for o Master autenticado navegando no painel Master geral, ele pode ver os usuários.
  // Mas se estiver navegando no painel de uma instância específica (via query param ?tenant=xxx ou header),
  // ou se for um gestor/funcionário comum de um tenant específico, restringe ao tenant correspondente.
  const reqTenant = e.request.url.query().get('tenant')

  if (authRole === 'master') {
    if (reqTenant) {
      // Filtrando explicitamente por um tenant
      let currentFilter = e.requestInfo().filter || ''
      const tenantFilter = `tenant = '${reqTenant}'`
      e.requestInfo().filter = currentFilter
        ? `(${currentFilter}) && (${tenantFilter})`
        : tenantFilter
    }
    // Caso contrário (sem filtro e authRole master), deixa passar (ex: painel Master geral)
    return e.next()
  }

  // Para usuários que NÃO são master (gestores e funcionários comuns de instâncias de clientes):
  // 1. NUNCA exibe o usuário Master
  // 2. Só exibe usuários que pertencem ao MESMO tenant do usuário autenticado
  let currentFilter = e.requestInfo().filter || ''
  const isolationFilter = `role != 'master' && tenant = '${authTenant}'`
  e.requestInfo().filter = currentFilter
    ? `(${currentFilter}) && (${isolationFilter})`
    : isolationFilter

  return e.next()
}, 'users')
