const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Erreur de connexion à la base de données :', err.stack);
  }
  console.log('✅ Connecté avec succès au coffre-fort PostgreSQL sur Supabase !');
  release();
});

module.exports = pool;
