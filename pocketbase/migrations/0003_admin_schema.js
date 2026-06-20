migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(
      new SelectField({ name: 'role', values: ['gestor', 'funcionario'], maxSelect: 1 }),
    )
    users.fields.add(new BoolField({ name: 'needs_password_reset' }))
    app.save(users)

    const categories = new Collection({
      name: 'categories',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(categories)

    const variations = new Collection({
      name: 'variations',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(variations)

    const rentalPeriods = new Collection({
      name: 'rental_periods',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'days', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(rentalPeriods)

    const pickupLocations = new Collection({
      name: 'pickup_locations',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'street', type: 'text' },
        { name: 'number', type: 'text' },
        { name: 'neighborhood', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'zip', type: 'text' },
        { name: 'hours', type: 'text' },
        {
          name: 'image',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pickupLocations)

    const siteSettings = new Collection({
      name: 'site_settings',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'hero_media', type: 'file', maxSelect: 1, maxSize: 15242880 },
        { name: 'about_us', type: 'editor' },
        { name: 'terms', type: 'editor' },
        { name: 'privacy', type: 'editor' },
        { name: 'returns', type: 'editor' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(siteSettings)

    const newsletter = new Collection({
      name: 'newsletter_subscribers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(newsletter)

    const products = app.findCollectionByNameOrId('products')
    products.fields.add(new TextField({ name: 'reference' }))
    products.fields.add(
      new RelationField({ name: 'rental_period', collectionId: rentalPeriods.id, maxSelect: 1 }),
    )
    products.fields.add(new EditorField({ name: 'detailed_description' }))
    products.fields.add(new URLField({ name: 'external_link' }))
    products.fields.add(
      new RelationField({ name: 'category', collectionId: categories.id, maxSelect: 1 }),
    )
    app.save(products)

    const productMedia = new Collection({
      name: 'product_media',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'product',
          type: 'relation',
          collectionId: products.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'variation', type: 'relation', collectionId: variations.id, maxSelect: 1 },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 15242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(productMedia)
  },
  (app) => {
    // Manual rollback for drops
  },
)
