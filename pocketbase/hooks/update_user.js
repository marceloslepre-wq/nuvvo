routerAdd(
  'PATCH',
  '/backend/v1/users/{id}',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('auth required')

    const authRole = auth.getString('role')
    if (authRole !== 'master' && authRole !== 'gestor') {
      return e.forbiddenError('only master or gestores can manage users')
    }

    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let record
    try {
      record = $app.findRecordById('users', id)
    } catch (_) {
      return e.notFoundError('user not found')
    }

    const isTargetMaster =
      record.getString('role') === 'master' ||
      record.getString('email') === 'marceloslepre@gmail.com'

    // Se o alvo for o Master, apenas o próprio Master pode alterá-lo!
    if (isTargetMaster && auth.id !== record.id && authRole !== 'master') {
      return e.forbiddenError('Apenas o próprio usuário Master pode alterar seus dados.')
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      record.set('name', body.name.trim())
    }

    // Role só pode ser alterada se o alvo NÃO for o master
    if (!isTargetMaster && typeof body.role === 'string') {
      if (['gestor', 'funcionario'].includes(body.role)) {
        record.set('role', body.role)
      }
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      record.setEmail(body.email.trim())
    }

    // Permitir troca de senha pelo próprio usuário ou pelo master
    if (typeof body.password === 'string' && body.password.length >= 8) {
      record.setPassword(body.password)
    }

    if (typeof body.tenant === 'string') {
      record.set('tenant', body.tenant)
    }

    try {
      $app.save(record)
    } catch (err) {
      return e.badRequestError('Failed to update user: ' + err.message)
    }

    return e.json(200, {
      id: record.id,
      name: record.getString('name'),
      email: record.getString('email'),
      role: record.getString('role'),
    })
  },
  $apis.requireAuth(),
)
