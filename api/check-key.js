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
      valid: false,
      message: 'Configuração do Firebase ausente ou incorreta.',
      details: initError
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cdkey } = req.body;

  if (!cdkey || typeof cdkey !== 'string') {
    return res.status(400).json({ message: 'CDKey inválida ou não fornecida.' });
  }

  const cleanKey = cdkey.trim().toUpperCase();

  try {
    const keyRef = db.collection('keys').doc(cleanKey);
    const doc = await keyRef.get();

    if (!doc.exists) {
      return res.status(404).json({ valid: false, message: 'Chave de ativação (CDKEY) não encontrada.' });
    }

    const data = doc.data();
    const now = Date.now();

    // 1. If key is already expired
    if (data.status === 'expired' || (data.expiresAt && now > data.expiresAt)) {
      if (data.status !== 'expired') {
        await keyRef.update({ status: 'expired' });
      }
      return res.status(200).json({ 
        valid: false, 
        status: 'expired',
        message: 'Esta CDKEY expirou. Por favor, adquira uma nova licença.' 
      });
    }

    // 2. If key is pending activation
    if (data.status === 'pending' || !data.activatedAt) {
      const durationDays = data.durationDays || 30;
      const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;
      
      await keyRef.update({
        status: 'active',
        activatedAt: now,
        expiresAt: expiresAt
      });

      return res.status(200).json({
        valid: true,
        status: 'active',
        activatedAt: now,
        expiresAt: expiresAt,
        message: `Licença ativada com sucesso! Válida por ${durationDays} dias.`
      });
    }

    // 3. If key is active
    if (data.status === 'active') {
      return res.status(200).json({
        valid: true,
        status: 'active',
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt,
        message: `Licença ativa. Expira em: ${new Date(data.expiresAt).toLocaleDateString()}`
      });
    }

    return res.status(400).json({ valid: false, message: 'Estado de chave desconhecido.' });

  } catch (error) {
    console.error("Firestore error:", error);
    return res.status(500).json({ message: 'Erro interno ao validar a CDKEY.', error: error.message });
  }
}
