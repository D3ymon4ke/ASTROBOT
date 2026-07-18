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

  const { email, settings, telegramConfig, cycles, profile } = req.body;

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

    const updateData = {
      updatedAt: Date.now()
    };

    if (settings !== undefined) updateData.settings = settings;
    if (telegramConfig !== undefined) updateData.telegramConfig = telegramConfig;
    if (cycles !== undefined) updateData.cycles = cycles;
    if (profile !== undefined) updateData.profile = profile;

    await userRef.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Configurações salvas com sucesso no banco de dados!'
    });

  } catch (error) {
    console.error("Save settings error:", error);
    return res.status(500).json({ success: false, message: 'Erro ao salvar configurações.', error: error.message });
  }
}
