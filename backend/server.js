require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool, initDb } = require('./db');

const app = express();
app.use(cors())
const PORT = 3000;
const INVOICES_DIR = path.resolve(__dirname, '..', 'generated-invoices');

const EMAIL_FROM = 'bcbc92270@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_FROM,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.use(express.json({ limit: '20mb' }));

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

function rowToMember(row) {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    sexe: row.sexe,
    dateNaissance: row.date_naissance,
    categorie: row.categorie,
    email: row.email,
    telephone: row.telephone,
    cotisationPayee: Number(row.cotisation_payee),
    cotisationDue: Number(row.cotisation_due),
    numeroLicenceFFBB: row.numero_licence_ffbb,
  };
}

const MEMBER_FIELDS = [
  'nom', 'prenom', 'sexe', 'dateNaissance', 'categorie',
  'email', 'telephone', 'cotisationPayee', 'cotisationDue', 'numeroLicenceFFBB',
];

function sanitizeMemberInput(body) {
  const out = {};
  for (const field of MEMBER_FIELDS) {
    if (body[field] === undefined) continue;
    out[field] = (field === 'cotisationPayee' || field === 'cotisationDue')
      ? Number(body[field]) || 0
      : String(body[field]);
  }
  return out;
}

app.get('/api/members', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY nom, prenom');
    res.json({ members: rows.map(rowToMember) });
  } catch (err) {
    console.error('Error listing members:', err);
    res.status(500).json({ error: 'Impossible de récupérer les adhérents' });
  }
});

app.post('/api/members', async (req, res) => {
  const data = sanitizeMemberInput(req.body);
  if (!data.nom || !data.prenom) {
    return res.status(400).json({ error: 'Nom et prénom sont obligatoires' });
  }
  const member = {
    id: crypto.randomUUID(),
    sexe: '', dateNaissance: '', categorie: '', email: '', telephone: '',
    cotisationPayee: 0, cotisationDue: 0, numeroLicenceFFBB: '',
    ...data,
  };
  try {
    await pool.query(
      `INSERT INTO members
        (id, nom, prenom, sexe, date_naissance, categorie, email, telephone, cotisation_payee, cotisation_due, numero_licence_ffbb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [member.id, member.nom, member.prenom, member.sexe, member.dateNaissance, member.categorie,
        member.email, member.telephone, member.cotisationPayee, member.cotisationDue, member.numeroLicenceFFBB],
    );
    res.status(201).json({ member });
  } catch (err) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: "Impossible de créer l'adhérent" });
  }
});

app.put('/api/members/:id', async (req, res) => {
  const data = sanitizeMemberInput(req.body);
  try {
    const { rows: existingRows } = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Adhérent introuvable' });
    }
    const updated = { ...rowToMember(existingRows[0]), ...data };
    const { rows } = await pool.query(
      `UPDATE members SET
        nom = $2, prenom = $3, sexe = $4, date_naissance = $5, categorie = $6,
        email = $7, telephone = $8, cotisation_payee = $9, cotisation_due = $10, numero_licence_ffbb = $11
       WHERE id = $1
       RETURNING *`,
      [req.params.id, updated.nom, updated.prenom, updated.sexe, updated.dateNaissance, updated.categorie,
        updated.email, updated.telephone, updated.cotisationPayee, updated.cotisationDue, updated.numeroLicenceFFBB],
    );
    res.json({ member: rowToMember(rows[0]) });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: "Impossible de mettre à jour l'adhérent" });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM members WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Adhérent introuvable' });
    }
    res.json({ success: true, member: rowToMember(rows[0]) });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: "Impossible de supprimer l'adhérent" });
  }
});

app.post('/api/save-invoice', (req, res) => {
  const { pdfBase64, filename } = req.body;

  if (!pdfBase64 || !filename) {
    return res.status(400).json({ error: 'Missing pdfBase64 or filename' });
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const buffer = Buffer.from(pdfBase64, 'base64');
  const filePath = path.join(INVOICES_DIR, safeFilename);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Error saving invoice:', err);
      return res.status(500).json({ error: 'Failed to save invoice' });
    }
    console.log('Saved:', safeFilename);
    res.json({ success: true, filename: safeFilename, path: filePath });
  });
});

app.post('/api/send-invoice-email', (req, res) => {
  const { filename, to, subject, body } = req.body;

  if (!filename || !to || !subject || !body) {
    return res.status(400).json({ error: 'Missing filename, to, subject or body' });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(INVOICES_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: "Envoi d'email non configuré : GMAIL_APP_PASSWORD manquant" });
  }

  transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text: body,
    attachments: [{ filename: safeFilename, path: filePath }],
  }, (err) => {
    if (err) {
      console.error('Error sending email:', err);
      return res.status(500).json({ error: "Échec de l'envoi de l'email" });
    }
    console.log('Email sent to', to, 'with attachment', safeFilename);
    res.json({ success: true });
  });
});

app.get('/api/invoices', (_req, res) => {
  fs.readdir(INVOICES_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list invoices' });
    res.json({ files: files.filter(f => f.endsWith('.pdf')) });
  });
});

app.use('/invoices', express.static(INVOICES_DIR));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log(`Invoices folder: ${INVOICES_DIR}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
