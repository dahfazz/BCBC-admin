require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, initDb } = require('./db');

const MEMBERS_FILE = path.join(__dirname, 'data', 'members.json');

async function main() {
  const members = JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8'));
  await initDb();

  for (const m of members) {
    await pool.query(
      `INSERT INTO members
        (id, nom, prenom, sexe, date_naissance, categorie, email, telephone, cotisation_payee, cotisation_due, numero_licence_ffbb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.nom, m.prenom, m.sexe || '', m.dateNaissance || '', m.categorie || '',
        m.email || '', m.telephone || '', Number(m.cotisationPayee) || 0, Number(m.cotisationDue) || 0, m.numeroLicenceFFBB || ''],
    );
  }

  console.log(`Migré ${members.length} adhérent(s) vers PostgreSQL.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Migration échouée:', err);
  process.exit(1);
});
