require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const cors = require('cors')

const app = express();
app.use(cors())
const PORT = 3000;
const INVOICES_DIR = path.resolve(__dirname, '..', 'generated-invoices');
const DATA_DIR = path.resolve(__dirname, 'data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');

const EMAIL_FROM = 'bcbc92270@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_FROM,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4201'] }));
app.use(express.json({ limit: '20mb' }));

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MEMBERS_FILE)) {
  fs.writeFileSync(MEMBERS_FILE, '[]', 'utf8');
}

function readMembers() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeMembers(members) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf8');
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

app.get('/api/members', (_req, res) => {
  res.json({ members: readMembers() });
});

app.post('/api/members', (req, res) => {
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
  const members = readMembers();
  members.push(member);
  writeMembers(members);
  res.status(201).json({ member });
});

app.put('/api/members/:id', (req, res) => {
  const members = readMembers();
  const idx = members.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Adhérent introuvable' });
  }
  const data = sanitizeMemberInput(req.body);
  members[idx] = { ...members[idx], ...data };
  writeMembers(members);
  res.json({ member: members[idx] });
});

app.delete('/api/members/:id', (req, res) => {
  const members = readMembers();
  const idx = members.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Adhérent introuvable' });
  }
  const [removed] = members.splice(idx, 1);
  writeMembers(members);
  res.json({ success: true, member: removed });
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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Invoices folder: ${INVOICES_DIR}`);
});
