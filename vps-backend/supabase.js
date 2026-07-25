import 'dotenv/config';
import ws from 'ws';
global.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in VPS. URL:", !!supabaseUrl, "Key:", !!supabaseServiceKey);
}

export const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      },
      realtime: {
        websocket: ws,
        transport: ws
      }
    })
  : null;

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

// Mappings between JavaScript camelCase and PostgreSQL snake_case
function mapPostToDb(post) {
  return {
    email: post.email || null,
    user_name: post.userName || null,
    profile_image: post.profileImage || null,
    comment: post.comment || null,
    is_public: post.isPublic !== undefined ? post.isPublic : true,
    profit: post.profit !== undefined ? parseFloat(post.profit) : 0,
    trades_total: post.tradesTotal !== undefined ? parseInt(post.tradesTotal) : 0,
    win_rate: post.winRate !== undefined ? parseFloat(post.winRate) : 0,
    strategy: post.strategy || null,
    symbol: post.symbol || null,
    session_time: post.sessionTime !== undefined ? parseInt(post.sessionTime) : 0,
    meta_hit: post.metaHit !== undefined ? !!post.metaHit : false,
    likes: post.likes || [],
    reactions: post.reactions || { '🔥': [], '🚀': [], '👏': [], '💎': [] },
    comments: post.comments || [],
    shares: post.shares !== undefined ? parseInt(post.shares) : 0,
    title: post.title || null,
    content: post.content || null,
    cover_image: post.coverImage || null,
    tag: post.tag || 'novidade',
    pinned: post.pinned !== undefined ? !!post.pinned : false,
    created_at: post.createdAt || Date.now(),
    updated_at: post.updatedAt || Date.now()
  };
}

function mapPostFromDb(row) {
  return {
    id: row.id,
    email: row.email,
    userName: row.user_name,
    profileImage: row.profile_image,
    comment: row.comment,
    isPublic: row.is_public,
    profit: row.profit ? parseFloat(row.profit) : 0,
    tradesTotal: row.trades_total,
    winRate: row.win_rate ? parseFloat(row.win_rate) : 0,
    strategy: row.strategy,
    symbol: row.symbol,
    sessionTime: row.session_time,
    metaHit: row.meta_hit,
    likes: row.likes || [],
    reactions: row.reactions || { '🔥': [], '🚀': [], '👏': [], '💎': [] },
    comments: row.comments || [],
    shares: row.shares || 0,
    title: row.title,
    content: row.content,
    coverImage: row.cover_image,
    tag: row.tag,
    pinned: row.pinned,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at)
  };
}

// Database Abstractions with Auto-Fallback
export async function addCommunityPost(postObj) {
  if (supabase) {
    try {
      const dbRow = mapPostToDb(postObj);
      const { data, error } = await withTimeout(
        supabase.from('posts').insert(dbRow).select().single(),
        4000
      );
      if (error) throw error;
      if (data) {
        return mapPostFromDb(data);
      }
    } catch (err) {
      console.error('Supabase add post failed or timed out, falling back to local JSON:', err.message);
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
  let supabasePosts = [];
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100),
        4000
      );
      if (error) throw error;
      if (data) {
        supabasePosts = data.map(mapPostFromDb);
      }
    } catch (err) {
      console.error('Supabase get posts failed or timed out:', err.message);
    }
  }
  const localPosts = loadLocalPosts();
  
  // Merge both lists, prioritizing Supabase posts in case of ID conflicts
  const mergedMap = new Map();
  localPosts.forEach(p => mergedMap.set(p.id, p));
  supabasePosts.forEach(p => mergedMap.set(p.id, p));
  
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
  if (supabase) {
    try {
      const { data: row, error: fetchError } = await withTimeout(
        supabase.from('posts').select('*').eq('id', id).single(),
        3000
      );
      if (fetchError) throw fetchError;
      
      if (row) {
        originalData = mapPostFromDb(row);
        const updated = updateFn(originalData);
        const dbRow = mapPostToDb(updated);
        
        const { data: updatedRow, error: updateError } = await withTimeout(
          supabase.from('posts').update(dbRow).eq('id', id).select().single(),
          3000
        );
        if (updateError) throw updateError;
        if (updatedRow) {
          return mapPostFromDb(updatedRow);
        }
      }
    } catch (err) {
      console.error('Supabase update post failed or timed out, trying local JSON fallback:', err.message);
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
  throw new Error('Post not found in Supabase or local storage');
}

export async function getUserProfile(email) {
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('profile').eq('email', email.toLowerCase()).single(),
        3000
      );
      if (error) throw error;
      if (data && data.profile) {
        return data.profile;
      }
    } catch (err) {
      console.error('Supabase getUserProfile failed or timed out:', err.message);
    }
  }
  return { fullname: '', profileImage: '' };
}

// Local Backup Fallback Directory
const LOCAL_BACKUP_DIR = join(DATA_DIR, 'backups');
if (!existsSync(LOCAL_BACKUP_DIR)) {
  mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
}

function getLocalBackupPath(email, isDemo) {
  const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const suffix = isDemo ? 'demo' : 'real';
  return join(LOCAL_BACKUP_DIR, `backup_${cleanEmail}_${suffix}.json`);
}

export async function saveUserBackup(email, isDemo, backupPayload) {
  const cleanEmail = email.toLowerCase().trim();
  const path = getLocalBackupPath(cleanEmail, isDemo);

  // 1. Save locally on VPS disk
  try {
    writeFileSync(path, JSON.stringify(backupPayload, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error saving local backup for ${cleanEmail}:`, e);
  }

  // 2. Sync to Supabase if available
  if (supabase) {
    try {
      const fieldName = isDemo ? 'cloud_backup_demo' : 'cloud_backup_real';
      const { error } = await withTimeout(
        supabase
          .from('users')
          .update({ [fieldName]: backupPayload, updated_at: Date.now() })
          .eq('email', cleanEmail),
        4000
      );
      if (error) {
        console.warn(`Supabase cloud backup update error for ${cleanEmail}:`, error.message);
      }
    } catch (err) {
      console.error(`Supabase saveUserBackup failed or timed out:`, err.message);
    }
  }
}

export async function loadUserBackup(email, isDemo) {
  const cleanEmail = email.toLowerCase().trim();
  let cloudData = null;

  if (supabase) {
    try {
      const fieldName = isDemo ? 'cloud_backup_demo' : 'cloud_backup_real';
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select(fieldName)
          .eq('email', cleanEmail)
          .single(),
        3000
      );
      if (!error && data && data[fieldName]) {
        cloudData = data[fieldName];
      }
    } catch (err) {
      console.warn(`Supabase loadUserBackup failed or timed out:`, err.message);
    }
  }

  // Fallback to local VPS disk backup
  const path = getLocalBackupPath(cleanEmail, isDemo);
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf8');
      const localData = JSON.parse(raw);
      if (!cloudData) return localData;

      // Merge local disk and Supabase data
      const mergedTradesMap = new Map();
      (localData.trades || []).forEach(t => mergedTradesMap.set(t.id || t.timestamp, t));
      (cloudData.trades || []).forEach(t => mergedTradesMap.set(t.id || t.timestamp, t));

      const mergedReportsMap = new Map();
      (localData.monthlyReports || []).forEach(r => mergedReportsMap.set(r.id || r.monthKey || r.month, r));
      (cloudData.monthlyReports || []).forEach(r => mergedReportsMap.set(r.id || r.monthKey || r.month, r));

      return {
        trades: Array.from(mergedTradesMap.values()),
        monthlyReports: Array.from(mergedReportsMap.values()),
        settings: cloudData.settings || localData.settings || {},
        planning: cloudData.planning || localData.planning || {},
        cycles: cloudData.cycles || localData.cycles || []
      };
    } catch (e) {
      console.error(`Error reading local backup for ${cleanEmail}:`, e);
    }
  }

  return cloudData || { trades: [], monthlyReports: [], settings: {}, planning: {}, cycles: [] };
}

// User Profile Full Metadata (Bio, Banner, Privacy, Badges)
export async function updateUserProfileFull(email, profilePayload) {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const dir = join(process.cwd(), 'data', 'profiles');
  if (!existsSync(dir)) {
    try { mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  const path = join(dir, `profile_${cleanEmail}.json`);

  let current = {};
  if (existsSync(path)) {
    try { current = JSON.parse(readFileSync(path, 'utf8')); } catch (e) {}
  }

  const updated = {
    ...current,
    ...profilePayload,
    updatedAt: new Date().toISOString()
  };

  try {
    writeFileSync(path, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    console.error(`Failed to write local profile for ${cleanEmail}:`, e);
  }

  if (supabase) {
    try {
      await withTimeout(
        supabase
          .from('users')
          .update({ profile_data: updated })
          .eq('email', cleanEmail),
        3000
      );
    } catch (err) {
      console.warn(`Supabase profile update failed:`, err.message);
    }
  }
  return updated;
}

export async function getUserFullProfile(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const path = join(process.cwd(), 'data', 'profiles', `profile_${cleanEmail}.json`);

  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {}
  }

  if (supabase) {
    try {
      const { data } = await withTimeout(
        supabase
          .from('users')
          .select('profile_data')
          .eq('email', cleanEmail)
          .single(),
        3000
      );
      if (data && data.profile_data) return data.profile_data;
    } catch (err) {}
  }

  return {
    email: cleanEmail,
    bio: '',
    bannerUrl: '',
    privacy: 'public', // 'public' | 'friends' | 'private'
    badges: ['beta_tester'],
    friends: [],
    pendingRequests: []
  };
}

// Social System: Friends Requests
export async function sendFriendRequest(senderEmail, targetEmail) {
  if (!senderEmail || !targetEmail || senderEmail === targetEmail) return { success: false, message: 'Operação inválida' };
  
  const senderProf = await getUserFullProfile(senderEmail);
  const targetProf = await getUserFullProfile(targetEmail);

  if (!senderProf || !targetProf) return { success: false, message: 'Usuário não encontrado' };

  // Check if already friends
  if ((targetProf.friends || []).includes(senderEmail)) {
    return { success: false, message: 'Vocês já são amigos!' };
  }

  // Check if request already pending
  const existingReqs = targetProf.pendingRequests || [];
  if (existingReqs.some(r => r.from === senderEmail)) {
    return { success: false, message: 'Solicitação já enviada anteriormente.' };
  }

  existingReqs.push({
    from: senderEmail,
    sentAt: new Date().toISOString()
  });

  await updateUserProfileFull(targetEmail, { pendingRequests: existingReqs });
  return { success: true, message: 'Pedido de amizade enviado!' };
}

export async function respondFriendRequest(userEmail, senderEmail, accept = true) {
  const userProf = await getUserFullProfile(userEmail);
  const senderProf = await getUserFullProfile(senderEmail);

  if (!userProf || !senderProf) return { success: false, message: 'Perfil não encontrado' };

  // Remove request from pending list
  const updatedReqs = (userProf.pendingRequests || []).filter(r => r.from !== senderEmail);
  const userFriends = userProf.friends || [];
  const senderFriends = senderProf.friends || [];

  if (accept) {
    if (!userFriends.includes(senderEmail)) userFriends.push(senderEmail);
    if (!senderFriends.includes(userEmail)) senderFriends.push(userEmail);

    await updateUserProfileFull(senderEmail, { friends: senderFriends });
  }

  await updateUserProfileFull(userEmail, {
    pendingRequests: updatedReqs,
    friends: userFriends
  });

  return { success: true, message: accept ? 'Solicitação aceita!' : 'Solicitação recusada.' };
}
