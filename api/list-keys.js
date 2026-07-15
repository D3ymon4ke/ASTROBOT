import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin SDK safely
let db;
let initError = null;
try {
  if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (parseErr) {
        throw new Error("Falha ao analisar o JSON de FIREBASE_SERVICE_ACCOUNT: " + parseErr.message);
      }
    } else {
      const serviceAccountPath = join(process.cwd(), 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json');
      try {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      } catch (readErr) {
        throw new Error("Arquivo JSON local ausente ou inválido: " + readErr.message);
      }
    }

    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  db = getFirestore();
} catch (err) {
  console.error("Firebase admin init error:", err);
  initError = err.message || String(err);
}

export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!db) {
    return res.status(500).json({ 
      error: 'Configuração do Firebase ausente ou incorreta.',
      details: initError
    });
  }

  const { admin_token } = req.query;

  if (admin_token !== 'lucas_astro_admin') {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const keysSnapshot = await db.collection('keys').get();
    const keysList = [];
    
    keysSnapshot.forEach(doc => {
      keysList.push({
        key: doc.id,
        ...doc.data()
      });
    });

    // Sort keys: active first, then pending, then expired (or by creation date if present)
    keysList.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA; // Descending order of creation
    });

    return res.status(200).json({
      success: true,
      keys: keysList
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao buscar chaves no banco de dados.', details: err.message });
  }
}
