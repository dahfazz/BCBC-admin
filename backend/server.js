require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool, initDb } = require('./db');
const { requireAuth } = require('./auth');

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
app.use('/api', requireAuth);
app.use('/invoices', requireAuth);

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
    FBI: row.fbi,
  };
}

const MEMBER_FIELDS = [
  'nom', 'prenom', 'sexe', 'dateNaissance', 'categorie',
  'email', 'telephone', 'cotisationPayee', 'cotisationDue', 'FBI',
];

function sanitizeMemberInput(body) {
  const out = {};
  for (const field of MEMBER_FIELDS) {
    if (body[field] === undefined) continue;
    if (field === 'cotisationPayee' || field === 'cotisationDue') {
      out[field] = Number(body[field]) || 0;
    } else if (field === 'FBI') {
      out[field] = Boolean(body[field]);
    } else {
      out[field] = String(body[field]);
    }
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
    cotisationPayee: 0, cotisationDue: 0, FBI: false,
    ...data,
  };
  try {
    await pool.query(
      `INSERT INTO members
        (id, nom, prenom, sexe, date_naissance, categorie, email, telephone, cotisation_payee, cotisation_due, fbi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [member.id, member.nom, member.prenom, member.sexe, member.dateNaissance, member.categorie,
        member.email, member.telephone, member.cotisationPayee, member.cotisationDue, member.FBI],
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
        email = $7, telephone = $8, cotisation_payee = $9, cotisation_due = $10, fbi = $11
       WHERE id = $1
       RETURNING *`,
      [req.params.id, updated.nom, updated.prenom, updated.sexe, updated.dateNaissance, updated.categorie,
        updated.email, updated.telephone, updated.cotisationPayee, updated.cotisationDue, updated.FBI],
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

function rowToTreasuryItem(row) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    amount: Number(row.amount),
    date: row.date || undefined,
  };
}

app.get('/api/treasury-items', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM treasury_items ORDER BY date, label');
    res.json({ items: rows.map(rowToTreasuryItem) });
  } catch (err) {
    console.error('Error listing treasury items:', err);
    res.status(500).json({ error: 'Impossible de récupérer les opérations de trésorerie' });
  }
});

app.post('/api/treasury-items', async (req, res) => {
  const { type, label, amount, date } = req.body || {};
  if (type !== 'depense' && type !== 'recette') {
    return res.status(400).json({ error: 'Type invalide' });
  }
  if (!label || !amount) {
    return res.status(400).json({ error: 'Libellé et montant sont obligatoires' });
  }
  const item = {
    id: crypto.randomUUID(),
    type,
    label: String(label),
    amount: Number(amount) || 0,
    date: date ? String(date) : '',
  };
  try {
    await pool.query(
      `INSERT INTO treasury_items (id, type, label, amount, date) VALUES ($1, $2, $3, $4, $5)`,
      [item.id, item.type, item.label, item.amount, item.date],
    );
    res.status(201).json({ item: rowToTreasuryItem(item) });
  } catch (err) {
    console.error('Error creating treasury item:', err);
    res.status(500).json({ error: "Impossible de créer l'opération" });
  }
});

app.delete('/api/treasury-items/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM treasury_items WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Opération introuvable' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting treasury item:', err);
    res.status(500).json({ error: "Impossible de supprimer l'opération" });
  }
});

function rowToPlanningEvent(row) {
  return {
    id: row.id,
    date: row.date,
    dayLabel: row.day_label,
    category: row.category,
    label: row.label,
    startTime: row.start_time,
    endTime: row.end_time,
    coach: row.coach,
    type: row.type,
    opponent: row.opponent,
    scoreFor: row.score_for === null ? null : Number(row.score_for),
    scoreAgainst: row.score_against === null ? null : Number(row.score_against),
    cancelled: row.cancelled,
  };
}

app.get('/api/planning-events', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM planning_events');
    res.json({ events: rows.map(rowToPlanningEvent) });
  } catch (err) {
    console.error('Error listing planning events:', err);
    res.status(500).json({ error: 'Impossible de récupérer les événements du planning' });
  }
});

app.put('/api/planning-events/:id', async (req, res) => {
  const b = req.body || {};
  if (!b.date) {
    return res.status(400).json({ error: 'La date est obligatoire' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO planning_events
        (id, date, day_label, category, label, start_time, end_time, coach, type, opponent, score_for, score_against, cancelled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         date = $2, day_label = $3, category = $4, label = $5, start_time = $6, end_time = $7,
         coach = $8, type = $9, opponent = $10, score_for = $11, score_against = $12, cancelled = $13
       RETURNING *`,
      [
        req.params.id, b.date, b.dayLabel || '', b.category || '', b.label || '',
        b.startTime || '', b.endTime || '', b.coach || '', b.type || 'entrainement', b.opponent || '',
        b.scoreFor === undefined || b.scoreFor === null || b.scoreFor === '' ? null : Number(b.scoreFor),
        b.scoreAgainst === undefined || b.scoreAgainst === null || b.scoreAgainst === '' ? null : Number(b.scoreAgainst),
        !!b.cancelled,
      ],
    );
    res.json({ event: rowToPlanningEvent(rows[0]) });
  } catch (err) {
    console.error('Error saving planning event:', err);
    res.status(500).json({ error: "Impossible d'enregistrer l'événement" });
  }
});

app.delete('/api/planning-events/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM planning_events WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Événement introuvable' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting planning event:', err);
    res.status(500).json({ error: "Impossible de supprimer l'événement" });
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
