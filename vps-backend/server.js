import 'dotenv/config';
import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { UserSession } from './UserSession.js';
import { supabase, addCommunityPost, getCommunityPostsRaw, updateCommunityPost, getUserProfile } from './supabase.js';
import { sendTelegramMessage } from './utils/telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize Update config
const UPDATE_CONFIG_PATH = path.join(DATA_DIR, 'update_config.json');
let updateConfig = { version: '2.5.0', url: 'https://187-127-40-228.sslip.io/downloads/ASTROBOT_Setup.exe' };
try {
  if (fs.existsSync(UPDATE_CONFIG_PATH)) {
    updateConfig = JSON.parse(fs.readFileSync(UPDATE_CONFIG_PATH, 'utf8'));
  } else {
    fs.writeFileSync(UPDATE_CONFIG_PATH, JSON.stringify(updateConfig, null, 2), 'utf8');
  }
} catch (e) {
  console.error('[Startup] Failed to load/save update_config.json:', e);
}

const app = express();
app.use(express.json());

// In-Memory IP Rate Limiter
const ipRequests = new Map();
setInterval(() => ipRequests.clear(), 60000); // Clear counter every minute

function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const count = ipRequests.get(ip) || 0;
  if (count >= 120) { // Limit to 120 requests per minute
    console.warn(`[Rate Limit] IP blocked: ${ip} for too many requests.`);
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
  }
  ipRequests.set(ip, count + 1);
  next();
}

app.use(rateLimiter);

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Admin password (simple protection)
const ADMIN_PASSWORD = 'astrobot_admin_2024';

// Helper to format seconds uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ASTROBOT VPS backend is operational.' });
});

// Advanced Uptime and Health metrics check
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(uptime),
    uptimeFormatted: formatUptime(uptime),
    sessionsCount: sessions.size,
    activeBotsCount: Array.from(sessions.values()).filter(s => s.isRunning).length,
    memoryUsage: {
      rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB'
    }
  });
});

// Admin stats REST endpoint
app.get('/admin/stats', (req, res) => {
  const pw = req.headers['x-admin-password'] || req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sessionList = [];
  for (const [email, session] of sessions.entries()) {
    sessionList.push({
      email,
      isRunning: session.isRunning,
      balance: session.balance,
      initialBalance: session.initialBalance,
      profit: parseFloat((session.balance - session.initialBalance).toFixed(2)),
      tradesTotal: session.trades.length,
      tradesWin: session.trades.filter(t => t.profit > 0).length,
      tradesLoss: session.trades.filter(t => t.profit <= 0).length,
      winRate: session.trades.length > 0
        ? parseFloat(((session.trades.filter(t => t.profit > 0).length / session.trades.length) * 100).toFixed(1))
        : 0,
      activeClients: session.clients.size,
      derivConnected: session.derivAPI?.connected || false,
      symbol: session.settings?.symbol || '-',
      strategy: session.settings?.selectedStrategy || '-',
      galeLevel: session.galeLevel,
      activeCycleId: session.activeCycleId,
      schedulerState: session.schedulerState,
      cyclesCount: session.cycles.length,
      appId: session.settings?.appId || '33KjYszMx4FNIHT6qAJ7V',
      lastLog: session.logs.length > 0 ? session.logs[session.logs.length - 1] : null
    });
  }

  // Calculate hardware metrics
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const sysMemoryPercent = parseFloat(((usedMem / totalMem) * 100).toFixed(1));
  const sysMemoryFormatted = `${(usedMem / 1024 / 1024 / 1024).toFixed(1)} GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(1)} GB`;

  const cpus = os.cpus();
  const cpuCount = cpus.length;
  const loadAvg = os.loadavg()[0]; // 1-minute load average
  const sysCpuPercent = loadAvg > 0 ? parseFloat(Math.min(100, ((loadAvg / cpuCount) * 100)).toFixed(1)) : 0;
  
  const nodeMemory = process.memoryUsage();

  res.json({
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
    totalSessions: sessions.size,
    activeBots: sessionList.filter(s => s.isRunning).length,
    connectedClients: sessionList.reduce((acc, s) => acc + s.activeClients, 0),
    sessions: sessionList,
    updateConfig,
    systemResources: {
      cpuUsage: sysCpuPercent,
      memoryUsage: sysMemoryPercent,
      memoryFormatted: sysMemoryFormatted,
      nodeMemoryRss: Math.round(nodeMemory.rss / 1024 / 1024) + ' MB'
    }
  });
});

// Admin action endpoint (force stop/start bots, update settings or update system version)
app.post('/admin/action', (req, res) => {
  const pw = req.headers['x-admin-password'] || req.body.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action } = req.body;

  // 1. Global / Server actions (no session needed)
  if (action === 'update_app_version') {
    const { version, url } = req.body;
    if (version && url) {
      updateConfig = { version, url };
      try {
        fs.writeFileSync(UPDATE_CONFIG_PATH, JSON.stringify(updateConfig, null, 2), 'utf8');
        return res.json({ success: true, message: `Configuração de atualização atualizada para v${version}` });
      } catch (e) {
        console.error('Failed to write update config:', e);
        return res.status(500).json({ error: 'Erro ao salvar configuração no servidor' });
      }
    }
    return res.status(400).json({ error: 'Versão e URL são obrigatórios' });
  }

  if (action === 'restart_server') {
    console.log('[Admin] Server restart triggered by admin.');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
    return res.json({ success: true, message: 'Servidor reiniciando via PM2...' });
  }

  if (action === 'stop_all') {
    console.log('[Admin] Stop all bots triggered by admin.');
    let stoppedCount = 0;
    for (const session of sessions.values()) {
      if (session.isRunning) {
        session.stopBot();
        stoppedCount++;
      }
    }
    return res.json({ success: true, message: `Comando enviado. ${stoppedCount} robôs parados.` });
  }

  if (action === 'start_all') {
    console.log('[Admin] Start all bots triggered by admin.');
    let startedCount = 0;
    for (const session of sessions.values()) {
      if (!session.isRunning && session.settings && session.settings.token) {
        session.startBot();
        startedCount++;
      }
    }
    return res.json({ success: true, message: `Comando enviado. ${startedCount} robôs iniciados.` });
  }

  // Session specific actions
  const { email } = req.body;
  const cleanEmail = email?.toLowerCase().trim();

  if (action === 'reload_session') {
    if (!cleanEmail) return res.status(400).json({ error: 'E-mail obrigatório' });
    console.log(`[Admin] Reload session requested for ${cleanEmail}`);
    const existingSession = sessions.get(cleanEmail);
    if (existingSession) {
      existingSession.destroy();
      sessions.delete(cleanEmail);
    }
    getOrCreateSession(cleanEmail);
    return res.json({ success: true, message: `Sessão do usuário ${cleanEmail} recarregada.` });
  }

  if (action === 'delete_session_memory') {
    if (!cleanEmail) return res.status(400).json({ error: 'E-mail obrigatório' });
    console.log(`[Admin] Delete session from memory requested for ${cleanEmail}`);
    const existingSession = sessions.get(cleanEmail);
    if (existingSession) {
      if (existingSession.isRunning) {
        return res.status(400).json({ error: 'Não é possível remover da memória um robô em operação.' });
      }
      existingSession.destroy();
      sessions.delete(cleanEmail);
      return res.json({ success: true, message: `Sessão do usuário ${cleanEmail} removida da memória da VPS.` });
    }
    return res.status(404).json({ error: 'Sessão não ativa na memória.' });
  }

  const session = sessions.get(cleanEmail);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (action === 'stop') {
    session.stopBot();
    return res.json({ success: true, message: `Bot stopped for ${email}` });
  }
  if (action === 'start') {
    session.startBot();
    return res.json({ success: true, message: `Bot started for ${email}` });
  }
  if (action === 'update_settings') {
    const { settings } = req.body;
    if (settings) {
      session.updateSettings(settings);
      return res.json({ success: true, message: `Settings updated for ${email}` });
    }
    return res.status(400).json({ error: 'Missing settings object' });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// Admin logs REST endpoint
app.get('/admin/logs', (req, res) => {
  const pw = req.headers['x-admin-password'] || req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const logType = req.query.type || 'out'; // 'out' or 'err'
  const logPath = logType === 'err'
    ? '/root/.pm2/logs/astrobot-backend-err.log'
    : '/root/.pm2/logs/astrobot-backend-out.log';

  try {
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: `Arquivo de log não encontrado em: ${logPath}` });
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-150).join('\n');

    res.json({ logs: lastLines });
  } catch (err) {
    console.error('Error reading logs:', err);
    res.status(500).json({ error: 'Erro ao ler arquivo de logs no servidor.' });
  }
});

// Telegram Webhook endpoint
app.post('/api/telegram-webhook', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userSession = getOrCreateSession(cleanEmail);

  const message = req.body.message || req.body.edited_message || req.body.channel_post;
  if (message && message.text) {
    console.log(`[Telegram Webhook] Command received: "${message.text}" for user: ${cleanEmail}`);
    userSession.executeTelegramCommand(message.text);
  }

  res.status(200).json({ ok: true });
});

// Serve downloads directory statically (where installer file resides)
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}
app.use('/downloads', express.static(downloadsDir));

// Serve admin-panel directory statically (where admin control panel resides)
const adminPanelDir = path.join(__dirname, 'admin-panel');
if (!fs.existsSync(adminPanelDir)) {
  fs.mkdirSync(adminPanelDir, { recursive: true });
}
app.use('/admin-panel', express.static(adminPanelDir));

// Admin upload installer executable endpoint (raw binary format)
app.post('/admin/upload-installer', express.raw({ type: 'application/octet-stream', limit: '150mb' }), (req, res) => {
  const pw = req.headers['x-admin-password'] || req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'Arquivo vazio ou corpo inválido.' });
  }

  const installerPath = path.join(downloadsDir, 'ASTROBOT_Setup.exe');
  
  try {
    fs.writeFileSync(installerPath, req.body);
    console.log(`[Upload] New installer executable saved to ${installerPath} (${req.body.length} bytes)`);
    return res.json({ success: true, message: 'Instalador atualizado com sucesso na VPS!' });
  } catch (err) {
    console.error('[Upload] Error saving installer:', err);
    return res.status(500).json({ error: 'Erro ao salvar arquivo no disco da VPS.' });
  }
});

// Version check endpoint for Desktop Auto-Update
app.get('/api/check-update', (req, res) => {
  const clientVersion = req.query.version;
  if (clientVersion && clientVersion !== updateConfig.version) {
    return res.json({
      updateAvailable: true,
      version: updateConfig.version,
      url: updateConfig.url
    });
  }
  res.json({ updateAvailable: false });
});

// Sessions memory map
const sessions = new Map();

// Helper to get or create user session
function getOrCreateSession(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (sessions.has(cleanEmail)) {
    return sessions.get(cleanEmail);
  }
  
  const session = new UserSession(cleanEmail);
  sessions.set(cleanEmail, session);
  
  // Connect to Deriv automatically if token is present
  if (session.settings && session.settings.token) {
    session.connectDeriv();
  }
  
  return session;
}

// Load and restore all active sessions from storage on start
function restoreSessions() {
  try {
    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      let restoreCount = 0;
      
      for (const file of files) {
        if (file.startsWith('session_') && file.endsWith('.json')) {
          // Extract email from file path by parsing JSON
          const filePath = path.join(DATA_DIR, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw);
          
          if (data.settings && data.settings.token) {
            // Find email from settings or decode it
            // Simple approach: we create user session which reads file.
            // Filename format: session_${clean_email}.json
            // Let's read email from saved settings or derive from filename
            const email = data.settings.email || file.substring(8, file.length - 5).replace(/_/g, '@'); // fallback translation
            
            // To be perfectly safe, we store email directly inside the session JSON
            // Let's create session
            let userEmail = data.email || data.settings.email;
            if (!userEmail) {
              // Try to parse from filename if it has standard format session_email_domain_ext.json
              // e.g. session_deymonmachado_gmail_com.json -> deymonmachado@gmail.com
              const parts = file.substring(8, file.length - 5).split('_');
              if (parts.length >= 3) {
                const ext = parts.pop();
                const domain = parts.pop();
                const local = parts.join('_');
                userEmail = `${local}@${domain}.${ext}`;
              } else {
                userEmail = file.substring(8, file.length - 5).replace(/_/g, '@'); // fallback
              }
            }
            if (userEmail) {
              const session = getOrCreateSession(userEmail);
              restoreCount++;
            }
          }
        }
      }
      console.log(`[Startup] Restored ${restoreCount} user sessions from disk storage.`);
    }
  } catch (e) {
    console.error('[Startup] Error restoring sessions:', e);
  }
}

// SSL Let's Encrypt Certificate setup
let privateKey, certificate;
let isHttps = false;

try {
  privateKey = fs.readFileSync('/etc/letsencrypt/live/187-127-40-228.sslip.io/privkey.pem', 'utf8');
  certificate = fs.readFileSync('/etc/letsencrypt/live/187-127-40-228.sslip.io/fullchain.pem', 'utf8');
  isHttps = true;
  console.log('[SSL] Certificates loaded successfully. Running in SECURE mode (HTTPS/WSS).');
} catch (e) {
  console.warn('[SSL] Let\'s Encrypt certificates not found. Running in standard HTTP/WS mode.', e.message);
}

// Server port setup (port 443 for HTTPS/WSS, fallback to 80 or 8080)
const port = isHttps ? 443 : 8080;
let server;

if (isHttps) {
  server = https.createServer({ key: privateKey, cert: certificate }, app);
} else {
  server = http.createServer(app);
}

// Attach WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WS] New incoming client connection.');
  
  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.toString());
      const type = payload.type;
      
      if (type === 'auth') {
        const { email } = payload;
        if (!email) {
          ws.send(JSON.stringify({ type: 'error', message: 'E-mail é obrigatório para autenticação.' }));
          ws.close();
          return;
        }
        
        ws.email = email.trim().toLowerCase();
        const session = getOrCreateSession(ws.email);
        session.addClient(ws);
        
        console.log(`[WS] Client authenticated: ${ws.email}`);
        return;
      }
      
      // All other messages require authentication
      if (!ws.email) {
        ws.send(JSON.stringify({ type: 'error', message: 'Não autorizado. Envie a autenticação primeiro.' }));
        return;
      }
      
      const session = sessions.get(ws.email);
      if (!session) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sessão do usuário não encontrada.' }));
        return;
      }
      
      if (type === 'start_bot') {
        session.startBot();
      } else if (type === 'stop_bot') {
        session.stopBot();
      } else if (type === 'update_settings') {
        session.updateSettings(payload.settings);
      } else if (type === 'update_planning') {
        session.updatePlanning(payload.planning);
      } else if (type === 'update_cycles') {
        session.updateCycles(payload.cycles);
      } else if (type === 'trigger_cycle') {
        const cycle = session.cycles.find(c => c.id === payload.cycleId);
        if (cycle) {
          session.triggerCycle(cycle);
        }
      } else if (type === 'trigger_auto_reset') {
        session.triggerAutoReset(true);
      }
      
    } catch (err) {
      console.error('[WS] Error processing message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensagem inválido.' }));
    }
  });
  
  ws.on('close', () => {
    if (ws.email) {
      const session = sessions.get(ws.email);
      if (session) {
        session.removeClient(ws);
        console.log(`[WS] Client disconnected: ${ws.email}. Active clients remaining: ${session.clients.size}`);
      }
    }
  });
});

// Start global 5-second interval for scheduler cycles evaluation
setInterval(() => {
  const now = new Date();
  for (const session of sessions.values()) {
    session.schedulerTick(now);
  }
}, 5000);

// ==========================================
// COMMUNITY FEED & RANKING ENDPOINTS (BETA)
// ==========================================



// 1. Create a new community post (publication)
app.post('/api/community/posts', async (req, res) => {
  try {
    const { email, comment, isPublic, sessionData } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'O email é obrigatório.' });
    }

    const sData = sessionData || {};
    const profile = await getUserProfile(email);
    const postObj = {
      email,
      userName: profile.fullname || email.split('@')[0],
      profileImage: profile.profileImage || '',
      timestamp: Date.now(),
      comment: comment || '',
      isPublic: isPublic !== false,
      profit: parseFloat(sData.profit || 0),
      tradesTotal: parseInt(sData.tradesTotal || 0),
      winRate: parseFloat(sData.winRate || 0),
      strategy: sData.strategy || 'AI Autopilot PRO',
      symbol: sData.symbol || 'Volatility 100 Index',
      sessionTime: parseInt(sData.sessionTime || 0),
      metaHit: !!sData.metaHit,
      likes: [],
      reactions: { '🔥': [], '🚀': [], '👏': [], '💎': [] },
      comments: [],
      shares: 0
    };

    const createdPost = await addCommunityPost(postObj);
    return res.status(201).json({ success: true, id: createdPost.id, post: createdPost });
  } catch (err) {
    console.error('Error creating post:', err);
    return res.status(500).json({ error: 'Erro ao criar publicação.' });
  }
});

// 2. Fetch community posts with filters
app.get('/api/community/posts', async (req, res) => {
  try {
    const { filter = 'all', email = '' } = req.query;

    const postsRaw = await getCommunityPostsRaw();
    let posts = [...postsRaw];

    // Resolve user profiles in-memory so they are always up-to-date
    const uniqueEmails = [...new Set(posts.map(p => p.email))];
    const profileMap = {};
    for (const e of uniqueEmails) {
      profileMap[e] = await getUserProfile(e);
    }
    posts = posts.map(p => {
      const prof = profileMap[p.email] || {};
      return {
        ...p,
        userName: prof.fullname || p.userName || p.email.split('@')[0],
        profileImage: prof.profileImage || p.profileImage || ''
      };
    });

    // Apply visibility filter
    posts = posts.filter(p => p.isPublic || (email && p.email.toLowerCase() === email.toLowerCase()));

    // Apply specific filters
    if (filter === 'only_mine') {
      posts = posts.filter(p => email && p.email.toLowerCase() === email.toLowerCase());
    } else if (filter === 'my_friends') {
      let friendEmails = [email.toLowerCase()];
      try {
        if (supabase) {
          const { data: uDoc, error: uErr } = await supabase
            .from('users')
            .select('settings')
            .eq('email', email.toLowerCase())
            .maybeSingle();
          // Fallback to settings.friends or custom logic if friends is part of user settings
          if (!uErr && uDoc && uDoc.settings && uDoc.settings.friends) {
            friendEmails = [...friendEmails, ...uDoc.settings.friends.map(f => f.toLowerCase())];
            posts = posts.filter(p => friendEmails.includes(p.email.toLowerCase()));
          } else {
            posts = posts.filter(p => p.isPublic);
          }
        } else {
          posts = posts.filter(p => p.isPublic);
        }
      } catch (e) {
        posts = posts.filter(p => p.isPublic);
      }
    } else if (filter === 'biggest_profits') {
      posts = posts.filter(p => p.isPublic && p.profit > 0);
      posts.sort((a, b) => b.profit - a.profit);
    } else if (filter === 'most_recent') {
      posts.sort((a, b) => b.timestamp - a.timestamp);
    } else if (filter === 'most_liked') {
      posts = posts.filter(p => p.isPublic);
      posts.sort((a, b) => (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0));
    } else if (filter === 'meta_hit') {
      posts = posts.filter(p => p.isPublic && p.metaHit);
      posts.sort((a, b) => b.timestamp - a.timestamp);
    } else if (filter === 'positive_sessions') {
      posts = posts.filter(p => p.isPublic && p.profit > 0);
      posts.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      posts.sort((a, b) => b.timestamp - a.timestamp);
    }

    return res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    return res.status(500).json({ error: 'Erro ao carregar publicações.' });
  }
});

// 3. Toggle Like on a post
app.post('/api/community/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido.' });

    const lowerEmail = email.toLowerCase().trim();
    let finalLikes = [];

    await updateCommunityPost(id, (postData) => {
      let likes = postData.likes || [];
      if (likes.includes(lowerEmail)) {
        likes = likes.filter(e => e !== lowerEmail);
      } else {
        likes.push(lowerEmail);
      }
      finalLikes = likes;
      return { ...postData, likes };
    });

    return res.json({ success: true, likes: finalLikes });
  } catch (err) {
    console.error('Error toggling like:', err);
    return res.status(500).json({ error: 'Erro ao curtir.' });
  }
});

// 4. Toggle Reaction on a post
app.post('/api/community/posts/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, reaction } = req.body;
    if (!email || !reaction) return res.status(400).json({ error: 'Email e reação requeridos.' });

    const lowerEmail = email.toLowerCase().trim();
    let finalReactions = {};

    await updateCommunityPost(id, (postData) => {
      const reactions = postData.reactions || { '🔥': [], '🚀': [], '👏': [], '💎': [] };
      if (!reactions['🔥']) reactions['🔥'] = [];
      if (!reactions['🚀']) reactions['🚀'] = [];
      if (!reactions['👏']) reactions['👏'] = [];
      if (!reactions['💎']) reactions['💎'] = [];

      let users = reactions[reaction] || [];
      if (users.includes(lowerEmail)) {
        users = users.filter(e => e !== lowerEmail);
      } else {
        users.push(lowerEmail);
      }
      reactions[reaction] = users;
      finalReactions = reactions;
      return { ...postData, reactions };
    });

    return res.json({ success: true, reactions: finalReactions });
  } catch (err) {
    console.error('Error reacting to post:', err);
    return res.status(500).json({ error: 'Erro ao reagir.' });
  }
});

// 5. Add Comment to a post
app.post('/api/community/posts/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, text } = req.body;
    if (!email || !text) return res.status(400).json({ error: 'Email e texto são obrigatórios.' });

    const profile = await getUserProfile(email);
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      userName: profile.fullname || email.split('@')[0],
      profileImage: profile.profileImage || '',
      text,
      timestamp: Date.now()
    };

    let finalComments = [];

    await updateCommunityPost(id, (postData) => {
      const comments = postData.comments || [];
      comments.push(newComment);
      finalComments = comments;
      return { ...postData, comments };
    });

    return res.json({ success: true, comments: finalComments });
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({ error: 'Erro ao comentar.' });
  }
});

// 6. Delete Comment
app.delete('/api/community/posts/:id/comment/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;
    let finalComments = [];

    await updateCommunityPost(id, (postData) => {
      let comments = postData.comments || [];
      comments = comments.filter(c => c.id !== commentId);
      finalComments = comments;
      return { ...postData, comments };
    });

    return res.json({ success: true, comments: finalComments });
  } catch (err) {
    console.error('Error deleting comment:', err);
    return res.status(500).json({ error: 'Erro ao remover comentário.' });
  }
});

// 7. Increment internal shares count
app.post('/api/community/posts/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    let finalShares = 0;

    await updateCommunityPost(id, (postData) => {
      const shares = (postData.shares || 0) + 1;
      finalShares = shares;
      return { ...postData, shares };
    });

    return res.json({ success: true, shares: finalShares });
  } catch (err) {
    console.error('Error incrementing shares:', err);
    return res.status(500).json({ error: 'Erro ao compartilhar.' });
  }
});

// 8. Social Ranking metrics
app.get('/api/community/ranking', async (req, res) => {
  try {
    const posts = await getCommunityPostsRaw();

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const userStats = {};
    const weeklyProfits = [];
    const monthlyProfits = [];

    const uniqueEmails = [...new Set(posts.map(p => p.email))];
    const profileMap = {};
    for (const e of uniqueEmails) {
      profileMap[e] = await getUserProfile(e);
    }

    posts.forEach(p => {
      const email = p.email;
      const prof = profileMap[email] || {};
      const name = prof.fullname || p.userName || email.split('@')[0];
      const avatar = prof.profileImage || p.profileImage || '';

      if (!userStats[email]) {
        userStats[email] = {
          email,
          userName: name,
          profileImage: avatar,
          totalLikes: 0,
          totalPosts: 0,
          maxStreak: 0,
          postsList: []
        };
      }

      userStats[email].totalLikes += (p.likes ? p.likes.length : 0);
      userStats[email].totalPosts += 1;
      userStats[email].postsList.push(p);

      if (p.timestamp >= oneWeekAgo && p.profit > 0) {
        weeklyProfits.push({
          id: p.id,
          email,
          userName: name,
          profileImage: avatar,
          profit: p.profit,
          strategy: p.strategy,
          symbol: p.symbol,
          timestamp: p.timestamp
        });
      }

      if (p.timestamp >= oneMonthAgo && p.profit > 0) {
        monthlyProfits.push({
          id: p.id,
          email,
          userName: name,
          profileImage: avatar,
          profit: p.profit,
          strategy: p.strategy,
          symbol: p.symbol,
          timestamp: p.timestamp
        });
      }
    });

    Object.keys(userStats).forEach(email => {
      const u = userStats[email];
      u.postsList.sort((a, b) => a.timestamp - b.timestamp);
      
      let currentStreak = 0;
      let maxStreak = 0;
      u.postsList.forEach(p => {
        if (p.metaHit) {
          currentStreak++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      });
      u.maxStreak = maxStreak;
    });

    const mostLikedUsers = Object.values(userStats)
      .map(u => ({ email: u.email, userName: u.userName, profileImage: u.profileImage, score: u.totalLikes }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const mostActiveUsers = Object.values(userStats)
      .map(u => ({ email: u.email, userName: u.userName, profileImage: u.profileImage, score: u.totalPosts }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const bestStreaks = Object.values(userStats)
      .map(u => ({ email: u.email, userName: u.userName, profileImage: u.profileImage, score: u.maxStreak }))
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const topWeeklyProfits = weeklyProfits
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    const topMonthlyProfits = monthlyProfits
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    return res.json({
      mostLikedUsers,
      mostActiveUsers,
      bestStreaks,
      topWeeklyProfits,
      topMonthlyProfits
    });
  } catch (err) {
    console.error('Error calculating rankings:', err);
    return res.status(500).json({ error: 'Erro ao carregar rankings.' });
  }
});

// Official Telegram Bot Polling (for 1-click binding & command routing)
const OFFICIAL_BOT_TOKEN = '8422393109:AAFVC0lgcHyKoDKlamkKe6ZAQ2oANLxRV5E';
let telegramOffset = 0;

async function startTelegramPolling() {
  console.log('[Telegram Polling] Starting listener for official bot...');
  
  while (true) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${OFFICIAL_BOT_TOKEN}/getUpdates?offset=${telegramOffset}&timeout=20`);
      if (!response.ok) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }
      
      const data = await response.json();
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          telegramOffset = update.update_id + 1;
          
          const message = update.message;
          if (!message || !message.text) continue;
          
          const chatId = message.chat.id;
          const text = message.text.trim();
          
          if (text.startsWith('/start') && text.split(' ').length > 1) {
            const parts = text.split(' ');
            const parameter = parts[1];
            let userEmail = '';
            
            // Decode base64url parameter
            try {
              let base64 = parameter.replace(/-/g, '+').replace(/_/g, '/');
              while (base64.length % 4) {
                base64 += '=';
              }
              const decoded = Buffer.from(base64, 'base64').toString('utf8');
              if (decoded.includes('@')) {
                userEmail = decoded.trim().toLowerCase();
              }
            } catch (err) {
              console.error('[Telegram Polling] Error decoding parameter:', err);
            }
            
            if (userEmail) {
              console.log(`[Telegram Polling] Binding chatId ${chatId} to user: ${userEmail}`);
              
              // 1. Instantly update active session settings in memory and save to disk
              const session = getOrCreateSession(userEmail);
              if (session) {
                if (!session.settings) session.settings = {};
                session.settings.telegramChatId = String(chatId);
                session.settings.telegramToken = '';
                session.settings.telegramEnabled = true;
                session.saveToFile();
                session.syncToClients();
                console.log(`[Telegram Polling] Memory session instantly updated and saved to disk for ${userEmail}`);
              }
              
              // 2. Perform Firestore update asynchronously (non-blocking)
              if (supabase) {
                supabase.from('users').update({
                  telegram_config: {
                    enabled: true,
                    chatId: String(chatId),
                    token: '' // Use official bot by clearing custom token
                  }
                }).eq('email', userEmail).then(({ error }) => {
                  if (error) throw error;
                  console.log(`[Telegram Polling] Supabase successfully updated for ${userEmail}`);
                }).catch(fsErr => {
                  console.error('[Telegram Polling] Error updating Supabase (async):', fsErr);
                });
              }
              
              // 3. Send welcome message asynchronously (non-blocking)
              const replyText = `🎉 <b>Conexão Realizada com Sucesso!</b>\n\nSeu Telegram foi vinculado ao usuário: <code>${userEmail}</code>\n\nA partir de agora, você receberá todas as notificações de operações, sinais e relatórios do ASTROBOT aqui!`;
              sendTelegramMessage(OFFICIAL_BOT_TOKEN, chatId, replyText, true).catch(err => {
                console.error('[Telegram Polling] Error sending welcome message:', err);
              });
            }
          } else {
            // Route other commands (or /start without params) to active sessions or Firestore
            let matchedEmail = '';
            
            // 1. Search in active sessions
            for (const session of sessions.values()) {
              if (session.settings && String(session.settings.telegramChatId) === String(chatId)) {
                matchedEmail = session.email;
                break;
              }
            }
            
            // 2. Search in Firestore if not found in memory
            if (!matchedEmail && supabase) {
              try {
                const { data: usersData, error: fsErr } = await supabase
                  .from('users')
                  .select('email')
                  .eq('telegram_config->>chatId', String(chatId))
                  .limit(1)
                  .maybeSingle();
                if (!fsErr && usersData) {
                  matchedEmail = usersData.email;
                }
              } catch (fsErr) {
                console.error('[Telegram Polling] Error querying user by chatId from Supabase:', fsErr);
              }
            }
            
            if (matchedEmail) {
              console.log(`[Telegram Polling] Routing command "${text}" to user: ${matchedEmail}`);
              const userSession = getOrCreateSession(matchedEmail);
              userSession.executeTelegramCommand(text, OFFICIAL_BOT_TOKEN, message.message_id);
            } else {
              console.log(`[Telegram Polling] Unknown chatId: ${chatId}. Message: "${text}"`);
              // Inform the user they need to link
              const replyText = `⚠️ <b>Dispositivo Não Vinculado</b>\n\nEste Telegram não está associado a nenhuma conta no painel do ASTROBOT.\n\nPor favor, vá no painel do robô, aba <b>Telegram Remote</b>, e clique em "Começar no Telegram" para vincular.`;
              await sendTelegramMessage(OFFICIAL_BOT_TOKEN, chatId, replyText, false);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Telegram Polling] Error in polling loop:', err);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run Server
server.listen(port, () => {
  console.log(`[Server] ASTROBOT VPS Server running on port ${port} (${isHttps ? 'HTTPS/WSS' : 'HTTP/WS'})`);
  // Initialize and restore sessions
  restoreSessions();
  // Start official bot polling
  startTelegramPolling();
});
