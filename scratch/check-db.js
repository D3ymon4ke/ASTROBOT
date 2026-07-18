import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const serviceAccountPath = 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json';
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const snapshot = await db.collection('users').get();

  console.log(`Encontrados ${snapshot.size} usuários:`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nEmail: ${doc.id}`);
    console.log(`CDKEY: ${data.cdkey}`);
    console.log(`Telegram Config:`, JSON.stringify(data.telegramConfig, null, 2));
    console.log(`Pending Command:`, JSON.stringify(data.pendingCommand, null, 2));
  });

} catch (err) {
  console.error("Erro no script:", err);
}
