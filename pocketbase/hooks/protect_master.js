// Hook de proteção para o usuário Master:
// 1. O Master não pode ser excluído por ninguém, nem por si mesmo.
// 2. Um usuário comum não pode excluir o Master.
onRecordDeleteRequest((e) => {
  const record = e.record
  if (!record) {
    return e.next()
  }

  // Verifica se o registro que está tentando ser excluído é o master
  const role = record.getString('role')
  const email = record.getString('email')

  if (role === 'master' || email === 'marceloslepre@gmail.com') {
    return e.forbiddenError(
      'O usuário Master é único e protegido: não pode ser excluído por ninguém.',
    )
  }

  return e.next()
}, 'users')
