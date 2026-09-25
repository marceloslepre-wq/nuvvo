migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('product_media')
    col.addIndex('idx_pm_product', false, 'product', '')
    col.addIndex('idx_pm_variation', false, 'variation', '')
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('product_media')
      col.removeIndex('idx_pm_product')
      col.removeIndex('idx_pm_variation')
      app.save(col)
    } catch (_) {}
  },
)
