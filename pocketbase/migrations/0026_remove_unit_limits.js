migrate(
  (app) => {
    // Definir 0 (ou valor equivalente a ilimitado) nos planos e tenants existentes
    // Em SQLite / PocketBase number fields, 0 representa ilimitado / sem restrição
    app.db().newQuery('UPDATE plans SET unit_limit = 0').execute()
    app.db().newQuery('UPDATE tenants SET effective_unit_limit = 0').execute()
  },
  (app) => {
    app.db().newQuery('UPDATE plans SET unit_limit = 50 WHERE unit_limit = 0').execute()
    app
      .db()
      .newQuery('UPDATE tenants SET effective_unit_limit = 50 WHERE effective_unit_limit = 0')
      .execute()
  },
)
