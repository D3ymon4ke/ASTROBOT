import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

let db;
let initError = null;
try {
  if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      const serviceAccountPath = join(process.cwd(), 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json');
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  db = getFirestore();
} catch (err) {
  console.error('Firebase init error:', err);
  initError = err.message || String(err);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!db) return res.status(500).json({ error: 'Firebase não inicializado.', details: initError });

  // ---- GET: list downloads (public) ----
  if (req.method === 'GET') {
    try {
      const snap = await db.collection('downloads').orderBy('createdAt', 'desc').get();
      const downloads = [];
      snap.forEach(doc => downloads.push({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, downloads });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- POST: create or update download (admin only) ----
  if (req.method === 'POST') {
    const { admin_token } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    try {
      const { version, downloadUrl, changelog, os, active } = req.body;
      if (!version || !downloadUrl) {
        return res.status(400).json({ error: 'Versão e Link de download são obrigatórios.' });
      }

      const docRef = await db.collection('downloads').add({
        version: version.trim(),
        downloadUrl: downloadUrl.trim(),
        changelog: changelog || '',
        os: os || 'Windows',
        active: active !== undefined ? active : true,
        createdAt: Date.now()
      });
      return res.status(200).json({ success: true, id: docRef.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- DELETE: delete download (admin only) ----
  if (req.method === 'DELETE') {
    const { admin_token, download_id } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    if (!download_id) return res.status(400).json({ error: 'download_id é obrigatório.' });
    try {
      await db.collection('downloads').doc(download_id).delete();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
