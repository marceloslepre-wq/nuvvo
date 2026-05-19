migrate(
  (app) => {
    // 1. Seed user
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const record = new Record(users)
      record.setEmail('marceloslepre@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }

    // 2. Seed products
    // Using raw SQL to bypass the 'required' image file validation since we don't have physical files to upload during the migration.
    const products = [
      {
        id: $security.randomString(15),
        name: 'Fone de Ouvido Noise Cancelling Pro',
        description:
          'Experimente a verdadeira imersão sonora com nossos fones de ouvido de última geração. O cancelamento de ruído ativo bloqueia distrações enquanto os drivers de 40mm entregam graves profundos e agudos cristalinos. Bateria de longa duração para até 30 horas de reprodução contínua.',
        price: 899.9,
        status: 'active',
        order: 1,
      },
      {
        id: $security.randomString(15),
        name: 'Smartwatch Elite Series 5',
        description:
          'O Smartwatch Elite Series 5 acompanha você em todos os momentos. Monitore seus batimentos cardíacos, qualidade do sono e acompanhe mais de 20 modalidades esportivas. Tela AMOLED vibrante com Always-on display e resistência à água 5ATM.',
        price: 1249.0,
        status: 'active',
        order: 2,
      },
      {
        id: $security.randomString(15),
        name: 'Câmera Mirrorless 4K Creator',
        description:
          'Capture momentos em incrível resolução 4K. Design leve e compacto, foco automático ultra-rápido e tela articulada ideal para vlogs. Conectividade Wi-Fi e Bluetooth para transferência instantânea de fotos e vídeos.',
        price: 4599.0,
        status: 'active',
        order: 3,
      },
    ]

    products.forEach((p) => {
      try {
        app.findFirstRecordByData('products', 'name', p.name)
      } catch (_) {
        app
          .db()
          .newQuery(`
        INSERT INTO products (id, name, description, price, image, video, status, "order", created, updated)
        VALUES ({:id}, {:name}, {:desc}, {:price}, '', '', {:status}, {:order}, DATETIME('now'), DATETIME('now'))
      `)
          .bind({
            id: p.id,
            name: p.name,
            desc: p.description,
            price: p.price,
            status: p.status,
            order: p.order,
          })
          .execute()
      }
    })
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
      app.delete(record)
    } catch (_) {}

    const names = [
      'Fone de Ouvido Noise Cancelling Pro',
      'Smartwatch Elite Series 5',
      'Câmera Mirrorless 4K Creator',
    ]
    names.forEach((name) => {
      try {
        const p = app.findFirstRecordByData('products', 'name', name)
        app.delete(p)
      } catch (_) {}
    })
  },
)
