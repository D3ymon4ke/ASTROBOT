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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!db) {
    return res.status(500).json({ 
      error: 'Configuração do Firebase ausente ou incorreta.',
      details: initError
    });
  }

  const { admin_token, cdkey } = req.body;

  if (admin_token !== 'lucas_astro_admin') {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }

  if (!cdkey) {
    return res.status(400).json({ error: 'Parâmetro cdkey ausente.' });
  }

  try {
    const keyRef = db.collection('keys').doc(cdkey.trim().toUpperCase());
    const doc = await keyRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Chave não encontrada.' });
    }

    await keyRef.delete();

    return res.status(200).json({
      success: true,
      message: `Chave ${cdkey} excluída com sucesso.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao excluir chave do banco de dados.', details: err.message });
  }
}
