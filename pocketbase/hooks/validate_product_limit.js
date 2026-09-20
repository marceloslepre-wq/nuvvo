// Hook de controle de limites de produtos por tenant:
// Bloqueia a criação de novos produtos caso o tenant tenha atingido seu limite contratado.
// Permite que o tenant Master/Origem crie produtos ilimitados.
onRecordCreateRequest((e) => {
  const auth = e.auth
  const record = e.record
  if (!record) {
    return e.next()
  }

  // Se o autor for master global, não aplica trava de limite
  if (auth && auth.getString('role') === 'master') {
    return e.next()
  }

  // Identifica o tenant do produto
  let tenantId = record.getString('tenant')
  if (!tenantId && auth) {
    tenantId = auth.getString('tenant')
    if (tenantId) {
      record.set('tenant', tenantId)
    }
  }

  if (!tenantId) {
    return e.next()
  }

  // Carrega informações do tenant
  let tenantRecord = null
  try {
    tenantRecord = $app.findRecordById('tenants', tenantId)
  } catch (_) {
    return e.next()
  }

  if (!tenantRecord) {
    return e.next()
  }

  // Se for o tenant de origem (Hospital Home), cadastros são ilimitados
  if (tenantRecord.getBool('is_origin')) {
    return e.next()
  }

  // Obtém o limite efetivo de produtos
  let productLimit = tenantRecord.getInt('effective_product_limit')

  // Fallback para o limite do plano associado se não houver no tenant
  if (!productLimit) {
    const planId = tenantRecord.getString('plan')
    if (planId) {
      try {
        const planRecord = $app.findRecordById('plans', planId)
        productLimit = planRecord.getInt('product_limit') || planRecord.getInt('user_limit') || 200
      } catch (_) {}
    }
  }

  // Se limite for >= 99999 ou 0, considera ilimitado
  if (!productLimit || productLimit >= 99999) {
    return e.next()
  }

  // Conta os produtos já cadastrados por este tenant
  let currentProductCount = 0
  try {
    const existingProducts = $app.findRecordsByFilter(
      'products',
      "tenant = '" + tenantId + "'",
      '-created',
      productLimit + 10,
      0,
    )
    currentProductCount = existingProducts.length
  } catch (_) {}

  if (currentProductCount >= productLimit) {
    return e.badRequestError(
      'Você atingiu o limite do seu plano (' +
        productLimit +
        ' produtos). Faça upgrade para cadastrar mais produtos.',
    )
  }

  return e.next()
}, 'products')
