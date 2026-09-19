migrate(
  (app) => {
    // 1. Enriquecer campos na coleção license_renewals para suportar eventos de ciclo de vida completos
    const renewalsCol = app.findCollectionByNameOrId('license_renewals')

    if (!renewalsCol.fields.getByName('event_type')) {
      renewalsCol.fields.add(
        new SelectField({
          name: 'event_type',
          values: [
            'license_created',
            'renewal_pix',
            'renewal_manual',
            'plan_change',
            'license_suspended',
            'license_reactivated',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!renewalsCol.fields.getByName('plan_name')) {
      renewalsCol.fields.add(new TextField({ name: 'plan_name' }))
    }

    if (!renewalsCol.fields.getByName('description')) {
      renewalsCol.fields.add(new TextField({ name: 'description' }))
    }

    if (!renewalsCol.fields.getByName('period_display')) {
      renewalsCol.fields.add(new TextField({ name: 'period_display' }))
    }

    if (!renewalsCol.fields.getByName('payment_id')) {
      renewalsCol.fields.add(new TextField({ name: 'payment_id' }))
    }

    if (!renewalsCol.fields.getByName('payment_status')) {
      renewalsCol.fields.add(
        new SelectField({
          name: 'payment_status',
          values: ['pending', 'approved', 'rejected', 'canceled'],
          maxSelect: 1,
        }),
      )
    }

    // Regras de acesso em license_renewals: Gestor e Master podem listar/ver do seu tenant
    renewalsCol.listRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && (tenant = @request.auth.tenant || tenant = '' || tenant = null))"
    renewalsCol.viewRule =
      "@request.auth.role = 'master' || (@request.auth.role = 'gestor' && (tenant = @request.auth.tenant || tenant = '' || tenant = null))"
    renewalsCol.createRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"
    renewalsCol.updateRule = "@request.auth.role = 'master' || @request.auth.role = 'gestor'"

    app.save(renewalsCol)

    // 2. Preencher features nos planos existentes se estiverem vazias
    const plansCol = app.findCollectionByNameOrId('plans')
    const featuresDefaults = {
      'plano-master': [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
        'Cadastros ilimitados sem prazo de expiração',
      ],
      'plano-basico': [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
      ],
      'plano-pro': [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
      ],
      'plano-gold': [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
      ],
      'plano-pratinum': [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
      ],
    }

    for (const [slug, fList] of Object.entries(featuresDefaults)) {
      try {
        const p = app.findFirstRecordByData('plans', 'slug', slug)
        const currentF = p.get('features')
        if (!currentF || (Array.isArray(currentF) && currentF.length === 0)) {
          p.set('features', JSON.stringify(fList))
          app.save(p)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Reverter campos de license_renewals se necessário
    try {
      const renewalsCol = app.findCollectionByNameOrId('license_renewals')
      if (renewalsCol.fields.getByName('event_type')) {
        renewalsCol.fields.removeByName('event_type')
      }
      if (renewalsCol.fields.getByName('plan_name')) {
        renewalsCol.fields.removeByName('plan_name')
      }
      if (renewalsCol.fields.getByName('description')) {
        renewalsCol.fields.removeByName('description')
      }
      if (renewalsCol.fields.getByName('period_display')) {
        renewalsCol.fields.removeByName('period_display')
      }
      if (renewalsCol.fields.getByName('payment_id')) {
        renewalsCol.fields.removeByName('payment_id')
      }
      if (renewalsCol.fields.getByName('payment_status')) {
        renewalsCol.fields.removeByName('payment_status')
      }
      app.save(renewalsCol)
    } catch (_) {}
  },
)
