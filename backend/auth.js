const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ALLOWED_EMAILS = ['fabien.zibi@gmail.com', 'bcbc92270@gmail.com', 'baaamadou928@gmail.com'];

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || path.resolve(__dirname, 'serviceAccountKey.json');
  return require(serviceAccountPath);
}

const app = initializeApp({
  credential: cert(loadServiceAccount()),
});
const auth = getAuth(app);

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    if (!decoded.email || !ALLOWED_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Session invalide, reconnectez-vous' });
  }
}

module.exports = { requireAuth };
