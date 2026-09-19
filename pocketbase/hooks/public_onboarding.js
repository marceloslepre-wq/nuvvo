// Hook de cadastro público /cadastro
// Permite que uma nova empresa/locadora faça seu primeiro cadastro e entre em trial por padrão
routerAdd('POST', '/backend/v1/public/onboarding', (e) => {
  const body = e.requestInfo().body || {}
  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const phone = (body.phone || '').trim()
  const planId = body.plan_id || ''
  const cnpj = (body.cnpj || '').trim()
  const slug = (body.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')

  if (!name) return e.badRequestError('Nome da empresa/cliente é obrigatório')
  if (!email) return e.badRequestError('E-mail é obrigatório')
  if (!password || password.length < 8) {
    return e.badRequestError('Senha deve conter no mínimo 8 caracteres')
  }
  if (!slug) return e.badRequestError('Subdomínio/Identificador é obrigatório')

  // Checar se slug de tenant já existe
  try {
    $app.findFirstRecordByData('tenants', 'slug', slug)
    return e.badRequestError('Este endereço/subdomínio já está em uso')
  } catch (_) {}

  // Checar se e-mail de usuário já existe
  try {
    $app.findAuthRecordByEmail('users', email)
    return e.badRequestError('Este e-mail já está cadastrado')
  } catch (_) {}

  // Buscar plano selecionado ou padrão
  let selectedPlan = null
  if (planId) {
    try {
      selectedPlan = $app.findRecordById('plans', planId)
    } catch (_) {}
  }

  if (!selectedPlan) {
    try {
      selectedPlan = $app.findFirstRecordByData('plans', 'slug', 'plano-basico')
    } catch (_) {
      try {
        const allPlans = $app.findRecordsByFilter('plans', "status = 'active'", 'order', 1, 0)
        if (allPlans.length > 0) selectedPlan = allPlans[0]
      } catch (_) {}
    }
  }

  const trialDays = 15
  const now = new Date()
  const expiration = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

  const tenantsCol = $app.findCollectionByNameOrId('tenants')
  const tenantRecord = new Record(tenantsCol)
  tenantRecord.set('name', name)
  tenantRecord.set('slug', slug)
  tenantRecord.set('subdomain', slug)
  tenantRecord.set('phone', phone)
  tenantRecord.set('email', email)
  tenantRecord.set('status', 'active')
  tenantRecord.set('plan_status', 'trial')
  tenantRecord.set('trial_days', trialDays)
  tenantRecord.set('document_cnpj', cnpj)
  tenantRecord.set('start_date', now.toISOString())
  tenantRecord.set('expiration_date', expiration.toISOString())
  tenantRecord.set('whatsapp_status', 'disconnected')

  if (selectedPlan) {
    tenantRecord.set('plan', selectedPlan.id)
    tenantRecord.set('effective_value', selectedPlan.getInt('price') || 0)
    tenantRecord.set('effective_unit_limit', selectedPlan.getInt('unit_limit') || 50)
    tenantRecord.set('effective_user_limit', selectedPlan.getInt('user_limit') || 200)
  }

  try {
    $app.save(tenantRecord)
  } catch (err) {
    return e.badRequestError('Erro ao criar empresa: ' + err.message)
  }

  // Criar usuário gestor da nova empresa (NUNCA master)
  const usersCol = $app.findCollectionByNameOrId('users')
  const userRecord = new Record(usersCol)
  userRecord.setEmail(email)
  userRecord.setPassword(password)
  userRecord.setVerified(true)
  userRecord.set('name', name + ' (Administrador)')
  userRecord.set('role', 'gestor')
  userRecord.set('tenant', tenantRecord.id)

  try {
    $app.save(userRecord)
  } catch (err) {
    // rollback tenant se falhar
    try {
      $app.delete(tenantRecord)
    } catch (_) {}
    return e.badRequestError('Erro ao criar usuário: ' + err.message)
  }

  return e.json(200, {
    success: true,
    tenant: {
      id: tenantRecord.id,
      name: tenantRecord.getString('name'),
      slug: tenantRecord.getString('slug'),
      plan_status: tenantRecord.getString('plan_status'),
      expiration_date: tenantRecord.getString('expiration_date'),
    },
    user: {
      id: userRecord.id,
      email: userRecord.getString('email'),
      name: userRecord.getString('name'),
    },
  })
})
