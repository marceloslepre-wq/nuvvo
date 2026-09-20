migrate(
  (app) => {
    // 1. Adicionar product_limit à coleção 'plans' se não existir
    const plansCol = app.findCollectionByNameOrId('plans')
    if (!plansCol.fields.getByName('product_limit')) {
      plansCol.fields.add(new NumberField({ name: 'product_limit' }))
      app.save(plansCol)
    }

    // 2. Adicionar effective_product_limit à coleção 'tenants' se não existir
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    if (!tenantsCol.fields.getByName('effective_product_limit')) {
      tenantsCol.fields.add(new NumberField({ name: 'effective_product_limit' }))
      app.save(tenantsCol)
    }

    // 3. Migrar os planos já cadastrados:
    // O valor hoje em "limite de usuários" de cada plano passa a ser o valor do novo campo "limite de produtos cadastrados"
    // Plano Master: ilimitado (999999); Essencial: 200; card "Recomendado" (Plano Pro): 600; Plano Gold: 1200; Plano Pratinum: 2000; plano "teste": 2
    // Primeiro, cópia geral caso existam outros planos: product_limit = COALESCE(user_limit, 200)
    app.db().newQuery('UPDATE plans SET product_limit = COALESCE(user_limit, 200)').execute()

    // Ajustes nominais explícitos garantindo fidelidade total à especificação:
    app
      .db()
      .newQuery("UPDATE plans SET product_limit = 999999 WHERE slug = 'plano-master'")
      .execute()
    app.db().newQuery("UPDATE plans SET product_limit = 200 WHERE slug = 'plano-basico'").execute()
    app.db().newQuery("UPDATE plans SET product_limit = 600 WHERE slug = 'plano-pro'").execute()
    app.db().newQuery("UPDATE plans SET product_limit = 1200 WHERE slug = 'plano-gold'").execute()
    app
      .db()
      .newQuery("UPDATE plans SET product_limit = 2000 WHERE slug = 'plano-pratinum'")
      .execute()
    app.db().newQuery("UPDATE plans SET product_limit = 2 WHERE slug = 'teste'").execute()

    // 4. Migrar os tenants existentes:
    // Copiar effective_user_limit para effective_product_limit (ou herdar do plano vinculado se for nulo)
    app
      .db()
      .newQuery('UPDATE tenants SET effective_product_limit = COALESCE(effective_user_limit, 200)')
      .execute()

    // Garantir que a origem (Hospital Home / Master) tenha ilimitado (999999)
    app
      .db()
      .newQuery(
        "UPDATE tenants SET effective_product_limit = 999999 WHERE is_origin = 1 OR slug = 'hospital-home'",
      )
      .execute()

    // Garantir que o tenant 'testelandpage' fique com o limite de 2
    app
      .db()
      .newQuery("UPDATE tenants SET effective_product_limit = 2 WHERE slug = 'testelandpage'")
      .execute()
  },
  (app) => {
    // Reversão
    try {
      const plansCol = app.findCollectionByNameOrId('plans')
      plansCol.fields.removeByName('product_limit')
      app.save(plansCol)
    } catch (_) {}

    try {
      const tenantsCol = app.findCollectionByNameOrId('tenants')
      tenantsCol.fields.removeByName('effective_product_limit')
      app.save(tenantsCol)
    } catch (_) {}
  },
)
