migrate(
  (app) => {
    const paymentId = '178915231587'
    const correctGrossAmount = 3.0

    try {
      const records = app.findRecordsByFilter(
        'license_renewals',
        "payment_id = '" + paymentId + "'",
        '-created',
        10,
        0,
      )

      if (records && records.length > 0) {
        for (let i = 0; i < records.length; i++) {
          const rec = records[i]
          rec.set('amount_paid', correctGrossAmount)
          app.save(rec)
          console.log(
            '[Migration 0029] license_renewals record',
            rec.id,
            'atualizado com amount_paid =',
            correctGrossAmount,
          )
        }
      } else {
        // Fallback direto via SQL caso o filtro não localize
        app
          .db()
          .newQuery(
            'UPDATE license_renewals SET amount_paid = {:amount} WHERE payment_id = {:paymentId}',
          )
          .bind({ amount: correctGrossAmount, paymentId: paymentId })
          .execute()
        console.log('[Migration 0029] Executado UPDATE SQL direto para payment_id', paymentId)
      }
    } catch (err) {
      console.log('[Migration 0029 Erro]:', err ? err.message : err)
      // Tentar via SQL caso haja algum erro na coleção
      try {
        app
          .db()
          .newQuery(
            'UPDATE license_renewals SET amount_paid = {:amount} WHERE payment_id = {:paymentId}',
          )
          .bind({ amount: correctGrossAmount, paymentId: paymentId })
          .execute()
      } catch (_) {}
    }
  },
  (app) => {
    // Reversão
    try {
      app
        .db()
        .newQuery('UPDATE license_renewals SET amount_paid = 2.97 WHERE payment_id = {:paymentId}')
        .bind({ paymentId: '178915231587' })
        .execute()
    } catch (_) {}
  },
)
