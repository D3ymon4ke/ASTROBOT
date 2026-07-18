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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
      success: false,
      message: 'Configuração do Firebase ausente ou incorreta.',
      details: initError
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'O e-mail do usuário é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userRef = db.collection('users').doc(cleanEmail);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const userData = userDoc.data();

    // Verify key status
    const keyRef = db.collection('keys').doc(userData.cdkey);
    const keyDoc = await keyRef.get();
    let expiresAt = userData.expiresAt;
    let licenseStatus = 'active';

    if (keyDoc.exists) {
      const keyData = keyDoc.data();
      expiresAt = keyData.expiresAt || expiresAt;
      const now = Date.now();
      if (keyData.status === 'expired' || (expiresAt && now > expiresAt)) {
        licenseStatus = 'expired';
        if (keyData.status !== 'expired') {
          await keyRef.update({ status: 'expired' });
        }
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        email: userData.email,
        cdkey: userData.cdkey,
        expiresAt: expiresAt,
        licenseStatus: licenseStatus,
        settings: userData.settings || {},
        telegramConfig: userData.telegramConfig || {},
        cycles: userData.cycles || [],
        profile: userData.profile || {}
      }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: 'Erro ao carregar perfil.', error: error.message });
  }
}
