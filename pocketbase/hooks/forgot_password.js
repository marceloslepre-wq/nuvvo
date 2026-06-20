routerAdd('POST', '/backend/v1/forgot-password', (e) => {
  const body = e.requestInfo().body
  if (!body.email) return e.badRequestError('Email is required')

  let user
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', body.email)
  } catch (_) {
    return e.json(200, { message: 'If the email exists, a password was sent.' })
  }

  const tempPass = $security.randomString(8) + 'Aa1!'
  user.setPassword(tempPass)
  user.set('needs_password_reset', true)
  $app.save(user)

  return e.json(200, { message: 'Success', temp_password: tempPass })
})
