migrate(
  (app) => {
    // 1. Atualizar select field de role em users para incluir 'master'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      roleField.values = ['master', 'gestor', 'funcionario']
      usersCol.fields.add(roleField)
    }

    // Adicionar tenant relation a users para isolamento multi-tenant se ainda não existir
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    if (!usersCol.fields.getByName('tenant')) {
      usersCol.fields.add(
        new RelationField({
          name: 'tenant',
          collectionId: tenantsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    app.save(usersCol)

    // 2. Criar coleção plans (Catálogo de Planos Comerciais)
    let plansCol
    try {
      plansCol = app.findCollectionByNameOrId('plans')
    } catch (_) {
      plansCol = new Collection({
        name: 'plans',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        updateRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        deleteRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'badge', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'price', type: 'number', required: false },
          { name: 'is_free', type: 'bool' },
          { name: 'unit_limit', type: 'number' },
          { name: 'user_limit', type: 'number' },
          { name: 'features', type: 'json' },
          {
            name: 'status',
            type: 'select',
            values: ['active', 'inactive'],
            maxSelect: 1,
          },
          { name: 'is_master_exclusive', type: 'bool' },
          { name: 'order', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_plans_slug ON plans (slug)'],
      })
      app.save(plansCol)
    }

    // 3. Atualizar coleção tenants com campos de plano e ciclo de vida
    const tenants = app.findCollectionByNameOrId('tenants')
    const plansRef = app.findCollectionByNameOrId('plans')

    if (!tenants.fields.getByName('plan')) {
      tenants.fields.add(
        new RelationField({
          name: 'plan',
          collectionId: plansRef.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    // status do plano / ciclo de vida
    if (!tenants.fields.getByName('plan_status')) {
      tenants.fields.add(
        new SelectField({
          name: 'plan_status',
          values: ['trial', 'active', 'suspended', 'canceled'],
          maxSelect: 1,
        }),
      )
    }

    if (!tenants.fields.getByName('trial_days')) {
      tenants.fields.add(new NumberField({ name: 'trial_days' }))
    }

    if (!tenants.fields.getByName('start_date')) {
      tenants.fields.add(new DateField({ name: 'start_date' }))
    }

    if (!tenants.fields.getByName('expiration_date')) {
      tenants.fields.add(new DateField({ name: 'expiration_date' }))
    }

    if (!tenants.fields.getByName('effective_value')) {
      tenants.fields.add(new NumberField({ name: 'effective_value' }))
    }

    if (!tenants.fields.getByName('effective_unit_limit')) {
      tenants.fields.add(new NumberField({ name: 'effective_unit_limit' }))
    }

    if (!tenants.fields.getByName('effective_user_limit')) {
      tenants.fields.add(new NumberField({ name: 'effective_user_limit' }))
    }

    if (!tenants.fields.getByName('document_cnpj')) {
      tenants.fields.add(new TextField({ name: 'document_cnpj' }))
    }

    if (!tenants.fields.getByName('whatsapp_status')) {
      tenants.fields.add(
        new SelectField({
          name: 'whatsapp_status',
          values: ['connected', 'disconnected'],
          maxSelect: 1,
        }),
      )
    }

    if (!tenants.fields.getByName('is_origin')) {
      tenants.fields.add(new BoolField({ name: 'is_origin' }))
    }

    app.save(tenants)

    // 4. Criar coleção license_renewals (Histórico de Renovações de cada Tenant)
    let renewalsCol
    try {
      renewalsCol = app.findCollectionByNameOrId('license_renewals')
    } catch (_) {
      renewalsCol = new Collection({
        name: 'license_renewals',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        updateRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        deleteRule: "@request.auth.role = 'master' || @request.auth.role = 'gestor'",
        fields: [
          {
            name: 'tenant',
            type: 'relation',
            collectionId: tenants.id,
            maxSelect: 1,
            cascadeDelete: true,
            required: true,
          },
          { name: 'previous_expiration', type: 'date' },
          { name: 'new_expiration', type: 'date', required: true },
          { name: 'days_added', type: 'number' },
          { name: 'amount_paid', type: 'number' },
          { name: 'notes', type: 'text' },
          { name: 'renewed_by', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(renewalsCol)
    }

    // 5. Seed dos planos inspirados na referência CondPack
    const samplePlans = [
      {
        name: 'Plano Master',
        slug: 'plano-master',
        badge: 'Exclusivo Master',
        description:
          'Plano exclusivo Master com recursos completos e cadastros ilimitados sem prazo de expiração.',
        price: 0,
        is_free: true,
        unit_limit: 999999,
        user_limit: 999999,
        status: 'active',
        is_master_exclusive: true,
        order: 1,
      },
      {
        name: 'Plano Básico',
        slug: 'plano-basico',
        badge: 'Essencial',
        description: 'Ideal para locadoras e condomínios de pequeno porte.',
        price: 199.9,
        is_free: false,
        unit_limit: 50,
        user_limit: 200,
        status: 'active',
        is_master_exclusive: false,
        order: 2,
      },
      {
        name: 'Plano Pro',
        slug: 'plano-pro',
        badge: 'Recomendado',
        description: 'Completo para empresas médias com mais de uma unidade/loja.',
        price: 399.9,
        is_free: false,
        unit_limit: 150,
        user_limit: 600,
        status: 'active',
        is_master_exclusive: false,
        order: 3,
      },
      {
        name: 'Plano Gold',
        slug: 'plano-gold',
        badge: 'Profissional',
        description: 'Para empresas com maior estrutura de atendimento e unidades.',
        price: 599.9,
        is_free: false,
        unit_limit: 300,
        user_limit: 1200,
        status: 'active',
        is_master_exclusive: false,
        order: 4,
      },
      {
        name: 'Plano Pratinum',
        slug: 'plano-pratinum',
        badge: 'Enterprise',
        description: 'Maior expansão de produtos, unidades e usuários simultâneos.',
        price: 799.9,
        is_free: false,
        unit_limit: 500,
        user_limit: 2000,
        status: 'active',
        is_master_exclusive: false,
        order: 5,
      },
    ]

    for (const p of samplePlans) {
      try {
        app.findFirstRecordByData('plans', 'slug', p.slug)
      } catch (_) {
        const r = new Record(plansRef)
        r.set('name', p.name)
        r.set('slug', p.slug)
        r.set('badge', p.badge)
        r.set('description', p.description)
        r.set('price', p.price)
        r.set('is_free', p.is_free)
        r.set('unit_limit', p.unit_limit)
        r.set('user_limit', p.user_limit)
        r.set('status', p.status)
        r.set('is_master_exclusive', p.is_master_exclusive)
        r.set('order', p.order)
        app.save(r)
      }
    }

    // 6. Configurar o tenant de origem (Hospital Home) com plano Master
    let originTenant
    try {
      originTenant = app.findFirstRecordByData('tenants', 'slug', 'hospital-home')
      const masterPlan = app.findFirstRecordByData('plans', 'slug', 'plano-master')
      originTenant.set('is_origin', true)
      originTenant.set('plan', masterPlan.id)
      originTenant.set('plan_status', 'active')
      originTenant.set('document_cnpj', '12.105.420/0001-11')
      originTenant.set('trial_days', 15)
      originTenant.set('effective_value', 0)
      originTenant.set('effective_unit_limit', 999999)
      originTenant.set('effective_user_limit', 999999)
      originTenant.set('whatsapp_status', 'connected')
      originTenant.set('expiration_date', '2030-12-31 23:59:59.000Z')
      originTenant.set('start_date', '2024-01-01 00:00:00.000Z')
      app.save(originTenant)
    } catch (_) {}

    // 7. Configurar o usuário marceloslepre@gmail.com como 'master'
    try {
      const marceloUser = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
      marceloUser.set('role', 'master')
      if (originTenant) {
        marceloUser.set('tenant', originTenant.id)
      }
      app.save(marceloUser)
    } catch (_) {
      // Se ainda não existir por algum motivo, cria
      try {
        const u = new Record(usersCol)
        u.setEmail('marceloslepre@gmail.com')
        u.setPassword('Skip@Pass123!')
        u.setVerified(true)
        u.set('name', 'Marcelo Lepre')
        u.set('role', 'master')
        if (originTenant) {
          u.set('tenant', originTenant.id)
        }
        app.save(u)
      } catch (_) {}
    }

    // 8. Se houver gestor@email.com, vincula ao originTenant
    try {
      const gestorUser = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@email.com')
      if (originTenant && !gestorUser.getString('tenant')) {
        gestorUser.set('tenant', originTenant.id)
        app.save(gestorUser)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const renewals = app.findCollectionByNameOrId('license_renewals')
      app.delete(renewals)
    } catch (_) {}
    try {
      const plans = app.findCollectionByNameOrId('plans')
      app.delete(plans)
    } catch (_) {}
  },
)
