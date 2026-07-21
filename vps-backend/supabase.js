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
