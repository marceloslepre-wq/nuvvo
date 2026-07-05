migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Gestores can list/view every user record (including their email),
    // while regular users can only access their own record.
    users.listRule = "@request.auth.role = 'gestor' || id = @request.auth.id"
    users.viewRule = "@request.auth.role = 'gestor' || id = @request.auth.id"

    // Ensure the auth `email` field is exposed in API responses so that
    // gestores can read it when listing users.
    const emailField = users.fields.getByName('email')
    if (emailField) {
      emailField.hidden = false
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const emailField = users.fields.getByName('email')
    if (emailField) {
      emailField.hidden = true
    }

    app.save(users)
  },
)
