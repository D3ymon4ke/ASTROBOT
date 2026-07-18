import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

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

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
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

  const { email, password, cdkey } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // If cdkey is provided, handle Registration
  if (cdkey) {
    const cleanKey = cdkey.trim().toUpperCase();
    try {
      // 1. Verify if user already exists
      const userRef = db.collection('users').doc(cleanEmail);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
      }

      // 2. Verify and activate CDKEY
      const keyRef = db.collection('keys').doc(cleanKey);
      const keyDoc = await keyRef.get();
      if (!keyDoc.exists) {
        return res.status(404).json({ success: false, message: 'Chave de ativação (CDKEY) não encontrada.' });
      }

      const keyData = keyDoc.data();
      const now = Date.now();

      // Check if key is expired
      if (keyData.status === 'expired' || (keyData.expiresAt && now > keyData.expiresAt)) {
        if (keyData.status !== 'expired') {
          await keyRef.update({ status: 'expired' });
        }
        return res.status(400).json({ success: false, message: 'Esta CDKEY expirou. Adquira uma nova licença.' });
      }

      // Check if key already owned by someone else
      if (keyData.owner && keyData.owner !== cleanEmail) {
        return res.status(400).json({ success: false, message: 'Esta CDKEY já está vinculada a outra conta.' });
      }

      let expiresAt = keyData.expiresAt;
      if (keyData.status === 'pending' || !keyData.activatedAt) {
        const durationDays = keyData.durationDays || 30;
        expiresAt = now + durationDays * 24 * 60 * 60 * 1000;
        await keyRef.update({
          status: 'active',
          activatedAt: now,
          expiresAt: expiresAt,
          owner: cleanEmail
        });
      } else {
        // Key is active but has no owner, link it
        await keyRef.update({
          owner: cleanEmail
        });
      }

      // 3. Create user
      const newUser = {
        email: cleanEmail,
        password: hashPassword(password),
        cdkey: cleanKey,
        expiresAt: expiresAt,
        settings: {},
        telegramConfig: {},
        cycles: [],
        profile: {
          fullname: '',
          profileImage: ''
        },
        createdAt: now,
        updatedAt: now
      };

      await userRef.set(newUser);

      return res.status(200).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        user: {
          email: cleanEmail,
          cdkey: cleanKey,
          expiresAt: expiresAt
        }
      });

    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ success: false, message: 'Erro ao registrar usuário.', error: error.message });
    }
  } 
  
  // Otherwise, handle Login
  else {
    try {
      const userRef = db.collection('users').doc(cleanEmail);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
      }

      const userData = userDoc.data();

      // Verify password
      if (userData.password !== hashPassword(password)) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
      }

      // Refresh license expiration status from the keys collection to keep it up to date
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
        message: 'Login realizado com sucesso!',
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
      console.error("Login error:", error);
      return res.status(500).json({ success: false, message: 'Erro ao realizar login.', error: error.message });
    }
  }
}
