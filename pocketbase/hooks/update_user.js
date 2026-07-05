routerAdd(
  'PATCH',
  '/backend/v1/users/{id}',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('auth required')
    if (auth.getString('role') !== 'gestor') {
      return e.forbiddenError('only gestores can manage users')
    }

    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let record
    try {
      record = $app.findRecordById('users', id)
    } catch (_) {
      return e.notFoundError('user not found')
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      record.set('name', body.name.trim())
    }
    if (typeof body.role === 'string' && (body.role === 'gestor' || body.role === 'funcionario')) {
      record.set('role', body.role)
    }
    if (typeof body.email === 'string' && body.email.trim()) {
      record.setEmail(body.email.trim())
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
