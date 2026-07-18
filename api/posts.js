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

  // ---- GET: list posts (public) ----
  if (req.method === 'GET') {
    try {
      const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(50).get();
      const posts = [];
      snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, posts });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- POST: create post (admin only) ----
  if (req.method === 'POST') {
    const { admin_token } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    try {
      const { title, content, coverImage, tag, pinned } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });

      const docRef = await db.collection('posts').add({
        title: title.trim(),
        content,
        coverImage: coverImage || null,
        tag: tag || 'novidade',
        pinned: pinned || false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return res.status(200).json({ success: true, id: docRef.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- DELETE: delete post (admin only) ----
  if (req.method === 'DELETE') {
    const { admin_token, post_id } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    if (!post_id) return res.status(400).json({ error: 'post_id é obrigatório.' });
    try {
      await db.collection('posts').doc(post_id).delete();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
