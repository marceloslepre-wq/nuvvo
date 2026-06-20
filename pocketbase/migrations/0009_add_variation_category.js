migrate(
  (app) => {
    const variations = app.findCollectionByNameOrId('variations')

    // Add relation field
    variations.fields.add(
      new RelationField({
        name: 'category',
        collectionId: app.findCollectionByNameOrId('categories').id,
        maxSelect: 1,
        required: false, // Made optional initially to avoid migration errors on existing records
      }),
    )
    app.save(variations)

    variations.addIndex('idx_variations_category', false, 'category', '')
    app.save(variations)

    // Seed default category to existing variations to ensure data integrity
    try {
      const firstCat = app.findFirstRecordByFilter('categories', "id != ''")
      const allVars = app.findRecordsByFilter('variations', '1=1', '', 1000, 0)
      for (let v of allVars) {
        v.set('category', firstCat.id)
        app.save(v)
      }
      // Now make it required
      const categoryField = variations.fields.getByName('category')
      categoryField.required = true
      app.save(variations)
    } catch (_) {}
  },
  (app) => {
    const variations = app.findCollectionByNameOrId('variations')
    variations.removeIndex('idx_variations_category')
    variations.fields.removeByName('category')
    app.save(variations)
  },
)
