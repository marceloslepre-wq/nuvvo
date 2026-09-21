migrate(
  (app) => {
    // 1. Adicionar campo 'order' na coleção categories
    const categoriesCol = app.findCollectionByNameOrId('categories')
    if (!categoriesCol.fields.getByName('order')) {
      categoriesCol.fields.add(new NumberField({ name: 'order' }))
      app.save(categoriesCol)
    }

    // 2. Adicionar campo 'order' na coleção variations
    const variationsCol = app.findCollectionByNameOrId('variations')
    if (!variationsCol.fields.getByName('order')) {
      variationsCol.fields.add(new NumberField({ name: 'order' }))
      app.save(variationsCol)
    }

    // 3. Adicionar campo 'order' na coleção rental_periods
    const rentalPeriodsCol = app.findCollectionByNameOrId('rental_periods')
    if (!rentalPeriodsCol.fields.getByName('order')) {
      rentalPeriodsCol.fields.add(new NumberField({ name: 'order' }))
      app.save(rentalPeriodsCol)
    }

    // 4. Backfill sequencial de order nas 3 coleções caso estejam vazios ou nulos
    app.db().newQuery('UPDATE categories SET "order" = 1 WHERE "order" IS NULL').execute()
    app.db().newQuery('UPDATE variations SET "order" = 1 WHERE "order" IS NULL').execute()
    app.db().newQuery('UPDATE rental_periods SET "order" = 1 WHERE "order" IS NULL').execute()
  },
  (app) => {
    try {
      const categoriesCol = app.findCollectionByNameOrId('categories')
      categoriesCol.fields.removeByName('order')
      app.save(categoriesCol)
    } catch (_) {}

    try {
      const variationsCol = app.findCollectionByNameOrId('variations')
      variationsCol.fields.removeByName('order')
      app.save(variationsCol)
    } catch (_) {}

    try {
      const rentalPeriodsCol = app.findCollectionByNameOrId('rental_periods')
      rentalPeriodsCol.fields.removeByName('order')
      app.save(rentalPeriodsCol)
    } catch (_) {}
  },
)
