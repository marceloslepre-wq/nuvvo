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

  // Se for o Master autenticado navegando no painel Master geral ou impersonando
  if (authRole === 'master') {
    // Se a query contiver tenant específico (?tenant=xxx) ou header x-tenant
    let targetTenant = ''
    try {
      if (e.request && e.request.url) {
        targetTenant = e.request.url.query().get('tenant') || ''
      }
    } catch (_) {}

    if (targetTenant) {
      // Filtrando explicitamente por um tenant
      let currentFilter = e.requestInfo().filter || ''
      // Na instância de origem, ou se o targetTenant bater com authTenant, o master também aparece
      const isOrigin = authTenant && targetTenant === authTenant
      const tenantFilter = isOrigin
        ? `(tenant = '${targetTenant}' || role = 'master')`
        : `tenant = '${targetTenant}'`

      e.requestInfo().filter = currentFilter
        ? `(${currentFilter}) && (${tenantFilter})`
        : tenantFilter
    }
    // Caso contrário (sem filtro de tenant no master), não restringe: exibe os usuários
    return e.next()
  }

  // Para usuários que NÃO são master (gestores e funcionários comuns de instâncias de clientes):
  // 1. NUNCA exibe o usuário Master (a menos que seja da mesma instância de origem)
  // 2. Só exibe usuários que pertencem ao MESMO tenant do usuário autenticado (ou sem tenant definido se for legado da mesma instância)
  let currentFilter = e.requestInfo().filter || ''
  let isolationFilter = ''

  if (authTenant) {
    isolationFilter = `role != 'master' && (tenant = '${authTenant}' || tenant = '' || tenant = null)`
  } else {
    isolationFilter = "role != 'master'"
  }

  e.requestInfo().filter = currentFilter
    ? `(${currentFilter}) && (${isolationFilter})`
    : isolationFilter

  return e.next()
}, 'users')
