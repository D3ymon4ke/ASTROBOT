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

  const { admin_token, days, count } = req.query;

  // Simple token security for admin key generation
  if (admin_token !== 'lucas_astro_admin') {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }

  const durationDays = parseInt(days) || 30;
  const keyCount = parseInt(count) || 1;
  const generatedKeys = [];

  try {
    for (let i = 0; i < keyCount; i++) {
      // Generate key like ASTRO-XXXX-XXXX-XXXX
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newKey = `ASTRO-${part1}-${part2}-${part3}`;

      await db.collection('keys').doc(newKey).set({
        status: 'pending',
        durationDays,
        createdAt: Date.now(),
        activatedAt: null,
        expiresAt: null
      });

      generatedKeys.push({
        key: newKey,
        durationDays
      });
    }

    return res.status(200).json({ success: true, keys: generatedKeys });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
