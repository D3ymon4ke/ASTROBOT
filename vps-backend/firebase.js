import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;
try {
  if (getApps().length === 0) {
    let serviceAccount;
    const possiblePaths = [
      join(__dirname, 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json'),
      join(process.cwd(), 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json'),
      join(process.cwd(), 'vps-backend', 'astrobot-d9382-firebase-adminsdk-fbsvc-cbe709be1b.json')
    ];
    
    let loaded = false;
    for (const p of possiblePaths) {
      try {
        serviceAccount = JSON.parse(readFileSync(p, 'utf8'));
        loaded = true;
        console.log(`Loaded Firebase Service Account from: ${p}`);
        break;
      } catch (e) {
        // Continue
      }
    }

    if (!loaded && process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      loaded = true;
      console.log('Loaded Firebase Service Account from environment variable.');
    }

    if (!loaded) {
      throw new Error("Could not find Firebase Service Account credentials JSON.");
    }

    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  db = getFirestore();
} catch (err) {
  console.error("Firebase admin init error:", err);
}

// Helper to wrap promises with a timeout
const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// Local JSON Fallback Configuration
const DATA_DIR = join(__dirname, 'data');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
const LOCAL_POSTS_PATH = join(DATA_DIR, 'local_community_posts.json');

function loadLocalPosts() {
  try {
    if (existsSync(LOCAL_POSTS_PATH)) {
      return JSON.parse(readFileSync(LOCAL_POSTS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading local posts:', e);
  }
  return [];
}

function saveLocalPosts(posts) {
  try {
    writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(posts, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local posts:', e);
  }
}

// Database Abstractions with Auto-Fallback
export async function addCommunityPost(postObj) {
  if (db) {
    try {
      const docRef = await withTimeout(db.collection('community_posts').add(postObj), 2500);
      return { id: docRef.id, ...postObj };
    } catch (err) {
      console.error('Firestore add post failed or timed out, falling back to local JSON:', err.message);
    }
  }
  const posts = loadLocalPosts();
  const id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const newPost = { id, ...postObj };
  posts.push(newPost);
  saveLocalPosts(posts);
  return newPost;
}

export async function getCommunityPostsRaw() {
  let firestorePosts = [];
  if (db) {
    try {
      const snapshot = await withTimeout(db.collection('community_posts').get(), 2500);
      snapshot.forEach(doc => {
        firestorePosts.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error('Firestore get posts failed or timed out:', err.message);
    }
  }
  const localPosts = loadLocalPosts();
  
  // Merge both lists, prioritizing Firestore posts in case of ID conflicts
  const mergedMap = new Map();
  localPosts.forEach(p => mergedMap.set(p.id, p));
  firestorePosts.forEach(p => mergedMap.set(p.id, p));
  
  return Array.from(mergedMap.values());
}

export async function updateCommunityPost(id, updateFn) {
  if (String(id).startsWith('local_')) {
    const posts = loadLocalPosts();
    const idx = posts.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = updateFn(posts[idx]);
      posts[idx] = { ...updated, id };
      saveLocalPosts(posts);
      return posts[idx];
    }
    throw new Error('Local post not found');
  }

  let originalData = null;
  if (db) {
    try {
      const docRef = db.collection('community_posts').doc(id);
      const doc = await withTimeout(docRef.get(), 2500);
      if (doc.exists) {
        originalData = doc.data();
        const updated = updateFn(originalData);
        await withTimeout(docRef.update(updated), 2500);
        return { id, ...updated };
      }
    } catch (err) {
      console.error('Firestore update post failed or timed out, trying local JSON fallback:', err.message);
    }
  }

  // Fallback: search or copy locally
  const posts = loadLocalPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx !== -1) {
    const updated = updateFn(posts[idx]);
    posts[idx] = { ...updated, id };
    saveLocalPosts(posts);
    return posts[idx];
  } else if (originalData) {
    const updated = updateFn(originalData);
    const newLocalCopy = { ...updated, id };
    posts.push(newLocalCopy);
    saveLocalPosts(posts);
    return newLocalCopy;
  }
  throw new Error('Post not found in Firestore or local storage');
}

export async function getUserProfile(email) {
  if (db) {
    try {
      const doc = await withTimeout(db.collection('users').doc(email.toLowerCase()).get(), 2000);
      if (doc.exists) {
        const data = doc.data();
        return data.profile || data || { fullname: '', profileImage: '' };
      }
    } catch (err) {
      console.error('Firestore getUserProfile failed or timed out:', err.message);
    }
  }
  return { fullname: '', profileImage: '' };
}

export { db };
