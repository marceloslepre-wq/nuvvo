// Corrige o nome da cidade "Cachoeiro do Itapemerim" (grafia errada, com E)
// para "Cachoeiro de Itapemirim" (correta) nos registros de lojas/unidades.
// Idempotente: em um banco vazio (sem a coluna/registros) não faz nada.
migrate(
  (app) => {
    if (!app.hasTable('pickup_locations')) {
      return
    }
    app
      .db()
      .newQuery('UPDATE pickup_locations SET city = {:correct} WHERE LOWER(city) = LOWER({:wrong})')
      .bind({
        correct: 'Cachoeiro de Itapemirim',
        wrong: 'Cachoeiro do Itapemerim',
      })
      .execute()
  },
  (app) => {
    if (!app.hasTable('pickup_locations')) {
      return
    }
    app
      .db()
      .newQuery('UPDATE pickup_locations SET city = {:wrong} WHERE LOWER(city) = LOWER({:correct})')
      .bind({
        correct: 'Cachoeiro de Itapemirim',
        wrong: 'Cachoeiro do Itapemerim',
      })
      .execute()
  },
)
