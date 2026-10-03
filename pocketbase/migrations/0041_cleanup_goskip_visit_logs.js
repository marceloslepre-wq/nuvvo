migrate(
  (app) => {
    try {
      app.db().newQuery("DELETE FROM visit_logs WHERE referrer LIKE '%goskip.dev%'").execute()
    } catch (err) {
      console.log('Error cleaning up goskip.dev visit logs:', err)
    }
  },
  (app) => {
    // Irreversible data cleanup migration
  },
)
