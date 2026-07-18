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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!db) {
    return res.status(500).json({ 
      success: false, 
      message: 'Configuração do Firebase ausente.', 
      details: initError 
    });
  }

  try {
    const update = req.body;
    if (!update) {
      return res.status(400).json({ success: false, message: 'Nenhum payload recebido.' });
    }

    // Extract message details
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      // We only process text commands or reply keyboard buttons
      return res.status(200).json({ success: true, message: 'Ignorado (não é mensagem de texto).' });
    }

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    const emailQuery = req.query.email;
    let userDocFound = null;

    if (emailQuery) {
      const cleanEmail = emailQuery.trim().toLowerCase();
      const userDoc = await db.collection('users').doc(cleanEmail).get();
      if (userDoc.exists) {
        userDocFound = userDoc;
      }
    }

    if (!userDocFound) {
      // Fallback: Find user in Firestore that has telegramConfig.chatId === chatId
      const usersRef = db.collection('users');
      let snapshot = await usersRef.where('telegramConfig.chatId', '==', chatId).get();

      // Fallback: search by numeric chatId if the first query returned empty
      if (snapshot.empty && !isNaN(Number(chatId))) {
        snapshot = await usersRef.where('telegramConfig.chatId', '==', Number(chatId)).get();
      }

      if (!snapshot.empty) {
        userDocFound = snapshot.docs[0];
      }
    }

    if (!userDocFound) {
      console.log(`Mensagem de chat ID desconhecido: ${chatId}`);
      return res.status(200).json({ success: true, message: 'Chat ID não vinculado a nenhum usuário.' });
    }

    // Write command to the user's queue
    await userDocFound.ref.update({
      pendingCommand: {
        text: text,
        timestamp: Date.now(),
        processed: false
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Comando registrado na fila com sucesso!'
    });

  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(500).json({ success: false, message: 'Erro interno no webhook.', error: error.message });
  }
}
