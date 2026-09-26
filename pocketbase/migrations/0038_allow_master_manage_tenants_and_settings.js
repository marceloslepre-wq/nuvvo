migrate(
  (app) => {
    // 1. Atualizar regras de acesso da coleção 'tenants' para permitir também o perfil master
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    tenantsCol.createRule = "@request.auth.role = 'gestor' || @request.auth.role = 'master'"
    tenantsCol.updateRule = "@request.auth.role = 'gestor' || @request.auth.role = 'master'"
    tenantsCol.deleteRule = "@request.auth.role = 'gestor' || @request.auth.role = 'master'"
    app.save(tenantsCol)

    // 2. Atualizar regra de update da coleção 'site_settings' sincronizada no fluxo da aba Empresa
    const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
    siteSettingsCol.updateRule = "@request.auth.role = 'gestor' || @request.auth.role = 'master'"
    app.save(siteSettingsCol)
  },
  (app) => {
    const tenantsCol = app.findCollectionByNameOrId('tenants')
    tenantsCol.createRule = "@request.auth.role = 'gestor'"
    tenantsCol.updateRule = "@request.auth.role = 'gestor'"
    tenantsCol.deleteRule = "@request.auth.role = 'gestor'"
    app.save(tenantsCol)

    const siteSettingsCol = app.findCollectionByNameOrId('site_settings')
    siteSettingsCol.updateRule = "@request.auth.role = 'gestor'"
    app.save(siteSettingsCol)
  },
)
