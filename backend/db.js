const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant : configurez-le dans backend/.env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id UUID PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      sexe TEXT NOT NULL DEFAULT '',
      date_naissance TEXT NOT NULL DEFAULT '',
      categorie TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      cotisation_payee NUMERIC NOT NULL DEFAULT 0,
      cotisation_due NUMERIC NOT NULL DEFAULT 0,
      numero_licence_ffbb TEXT NOT NULL DEFAULT ''
    );
  `);
}

module.exports = { pool, initDb };
