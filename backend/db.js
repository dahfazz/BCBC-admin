const { Pool } = require('pg');

require('dotenv').config()

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
      fbi BOOLEAN NOT NULL DEFAULT false
    );
  `);

  await pool.query(`ALTER TABLE members DROP COLUMN IF EXISTS numero_licence_ffbb;`);
  await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS fbi BOOLEAN NOT NULL DEFAULT false;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS treasury_items (
      id UUID PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('depense', 'recette')),
      label TEXT NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      date TEXT NOT NULL DEFAULT ''
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS planning_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      day_label TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      coach TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'entrainement',
      opponent TEXT NOT NULL DEFAULT '',
      score_for INTEGER,
      score_against INTEGER,
      cancelled BOOLEAN NOT NULL DEFAULT false
    );
  `);
}

module.exports = { pool, initDb };
