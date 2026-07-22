import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DerivAPI } from './deriv/DerivAPI.js';
import { analyzeStrategies, getLiveSignal } from './strategies/tradingStrategies.js';
import {
  sendTelegramMessage,
  formatWinMessage,
  formatLossMessage,
  formatTakeProfitMessage,
  formatStopLossMessage,
  formatOpportunityFound,
  formatOrderExecuted,
  formatStatusReport,
  formatDailySummary,
  deleteTelegramMessages
} from './utils/telegram.js';
import { supabase, addCommunityPost, getUserProfile } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SETTINGS = {
  token: '',
  appId: '33KjYszMx4FNIHT6qAJ7V',
  isDemo: true,
  selectedStrategy: 'ma_crossover',
  stakeValue: '1.00',
  stakeType: 'fixed',
  stopLoss: '50.00',
  takeProfit: '20.00',
  granularity: '60',
  symbol: 'R_100',
  moneyManagement: 'fixed',
  martingaleMultiplier: '2.0',
  martingaleMaxLevels: '2',
  martingaleMode: 'next_candle',
  autoPilot: false,
  autoPilotInterval: '5',
  disableSlowStrategies: false,
  disableMaCrossover: false,
  enableMasterCandleSecondary: false,
  soundEnabled: true,
  telegramToken: '',
  telegramChatId: '',
  telegramEnabled: false,
  telegramNotifWin: true,
  telegramNotifLoss: true,
  telegramNotifDailySummary: true,
  blacklistedAssets: []
};

const DEFAULT_PLANNING = {
  goals: {
    monthly: 500,
    quarterly: 1500,
    annual: 5000,
    custom: 2000,
    customName: 'Notebook Novo',
    configured: false
  },
  simulator: {
    simStake: 1.0,
    simSessions: 2,
    simTarget: 3.0,
    simWinrate: 91
  }
};

export class UserSession {
  constructor(email) {
    this.email = email.trim().toLowerCase();
    this.filePath = path.join(DATA_DIR, `session_${this.email.replace(/[^a-z0-9]/g, '_')}.json`);
    
    // Mode states container
    this._activeMode = 'demo';
    this.modeStates = {
      demo: {
        isRunning: false,
        initialBalance: 0,
        balance: 0,
        sessionStartTime: null,
        galeLevel: 0,
        currentSorosStake: 0,
        waitingForGaleNextCandle: false,
        lastGaleDirection: null,
        activeContractId: null,
        lastContractDetails: null,
        candles: [],
        trades: [],
        logs: [],
        liveSignals: {},
        strategiesStats: [],
        sessionAssetStats: {},
        activeCycleId: null,
        cycles: [],
        schedulerState: true,
        activeTradeCountdown: null,
        lastResetDay: null,
        stuckContractStartTime: null,
        settings: { ...DEFAULT_SETTINGS, isDemo: true },
        planning: { ...DEFAULT_PLANNING }
      },
      real: {
        isRunning: false,
        initialBalance: 0,
        balance: 0,
        sessionStartTime: null,
        galeLevel: 0,
        currentSorosStake: 0,
        waitingForGaleNextCandle: false,
        lastGaleDirection: null,
        activeContractId: null,
        lastContractDetails: null,
        candles: [],
        trades: [],
        logs: [],
        liveSignals: {},
        strategiesStats: [],
        sessionAssetStats: {},
        activeCycleId: null,
        cycles: [],
        schedulerState: true,
        activeTradeCountdown: null,
        lastResetDay: null,
        stuckContractStartTime: null,
        settings: { ...DEFAULT_SETTINGS, isDemo: false },
        planning: { ...DEFAULT_PLANNING }
      }
    };

    this.clients = new Set();
    this.derivAPI = new DerivAPI();
    this.supabaseSubscription = null;
    this.countdownIntervalId = null;
    this.loadedFromFile = false;

    // Load persisted state if exists
    this.loadFromFile();

    // Bind API callbacks
    this.setupDerivAPI();

    // Start listening to Supabase changes for remote commands/settings
    this.setupSupabaseListener();

    // Start timer for countdown
    this.startCountdownTimer();
  }

  // Getters & Setters redirecting to current active mode
  get activeMode() { return this._activeMode || 'demo'; }

  get isRunning() { return this.modeStates[this.activeMode].isRunning; }
  set isRunning(val) { this.modeStates[this.activeMode].isRunning = val; }

  get initialBalance() { return this.modeStates[this.activeMode].initialBalance; }
  set initialBalance(val) { this.modeStates[this.activeMode].initialBalance = val; }

  get balance() { return this.modeStates[this.activeMode].balance; }
  set balance(val) { this.modeStates[this.activeMode].balance = val; }

  get sessionStartTime() { return this.modeStates[this.activeMode].sessionStartTime; }
  set sessionStartTime(val) { this.modeStates[this.activeMode].sessionStartTime = val; }

  get galeLevel() { return this.modeStates[this.activeMode].galeLevel; }
  set galeLevel(val) { this.modeStates[this.activeMode].galeLevel = val; }

  get currentSorosStake() { return this.modeStates[this.activeMode].currentSorosStake; }
  set currentSorosStake(val) { this.modeStates[this.activeMode].currentSorosStake = val; }

  get waitingForGaleNextCandle() { return this.modeStates[this.activeMode].waitingForGaleNextCandle; }
  set waitingForGaleNextCandle(val) { this.modeStates[this.activeMode].waitingForGaleNextCandle = val; }

  get lastGaleDirection() { return this.modeStates[this.activeMode].lastGaleDirection; }
  set lastGaleDirection(val) { this.modeStates[this.activeMode].lastGaleDirection = val; }

  get activeContractId() { return this.modeStates[this.activeMode].activeContractId; }
  set activeContractId(val) { this.modeStates[this.activeMode].activeContractId = val; }

  get lastContractDetails() { return this.modeStates[this.activeMode].lastContractDetails; }
  set lastContractDetails(val) { this.modeStates[this.activeMode].lastContractDetails = val; }

  get candles() { return this.modeStates[this.activeMode].candles; }
  set candles(val) { this.modeStates[this.activeMode].candles = val; }

  get trades() { return this.modeStates[this.activeMode].trades; }
  set trades(val) { this.modeStates[this.activeMode].trades = val; }

  get logs() { return this.modeStates[this.activeMode].logs; }
  set logs(val) { this.modeStates[this.activeMode].logs = val; }

  get liveSignals() { return this.modeStates[this.activeMode].liveSignals; }
  set liveSignals(val) { this.modeStates[this.activeMode].liveSignals = val; }

  get strategiesStats() { return this.modeStates[this.activeMode].strategiesStats; }
  set strategiesStats(val) { this.modeStates[this.activeMode].strategiesStats = val; }

  get sessionAssetStats() { return this.modeStates[this.activeMode].sessionAssetStats; }
  set sessionAssetStats(val) { this.modeStates[this.activeMode].sessionAssetStats = val; }

  get activeCycleId() { return this.modeStates[this.activeMode].activeCycleId; }
  set activeCycleId(val) { this.modeStates[this.activeMode].activeCycleId = val; }

  get cycles() { return this.modeStates[this.activeMode].cycles; }
  set cycles(val) { this.modeStates[this.activeMode].cycles = val; }

  get schedulerState() { return this.modeStates[this.activeMode].schedulerState; }
  set schedulerState(val) { this.modeStates[this.activeMode].schedulerState = val; }

  get activeTradeCountdown() { return this.modeStates[this.activeMode].activeTradeCountdown; }
  set activeTradeCountdown(val) { this.modeStates[this.activeMode].activeTradeCountdown = val; }

  get lastResetDay() { return this.modeStates[this.activeMode].lastResetDay; }
  set lastResetDay(val) { this.modeStates[this.activeMode].lastResetDay = val; }

  get stuckContractStartTime() { return this.modeStates[this.activeMode].stuckContractStartTime; }
  set stuckContractStartTime(val) { this.modeStates[this.activeMode].stuckContractStartTime = val; }

  get settings() { return this.modeStates[this.activeMode].settings; }
  set settings(val) { this.modeStates[this.activeMode].settings = val; }

  get planning() { return this.modeStates[this.activeMode].planning; }
  set planning(val) { this.modeStates[this.activeMode].planning = val; }

  loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        
        if (data.modeStates) {
          this._activeMode = data.activeMode ?? 'demo';
          this.modeStates = data.modeStates;
          
          // Ensure planning is initialized
          if (!this.modeStates.demo.planning) this.modeStates.demo.planning = { ...DEFAULT_PLANNING };
          if (!this.modeStates.real.planning) this.modeStates.real.planning = { ...DEFAULT_PLANNING };
        } else {
          // Migrate old flat structure to new split structure
          const isDemo = data.settings?.isDemo ?? true;
          this._activeMode = isDemo ? 'demo' : 'real';
          
          const migratedState = {
            isRunning: data.isRunning ?? false,
            initialBalance: data.initialBalance ?? 0,
            balance: data.balance ?? 0,
            sessionStartTime: data.sessionStartTime ?? null,
            galeLevel: data.galeLevel ?? 0,
            currentSorosStake: data.currentSorosStake ?? 0,
            waitingForGaleNextCandle: data.waitingForGaleNextCandle ?? false,
            lastGaleDirection: data.lastGaleDirection ?? null,
            activeContractId: data.activeContractId ?? null,
            lastContractDetails: data.lastContractDetails ?? null,
            candles: [],
            trades: data.trades ?? [],
            logs: data.logs ?? [],
            liveSignals: {},
            strategiesStats: [],
            sessionAssetStats: data.sessionAssetStats ?? {},
            activeCycleId: data.activeCycleId ?? null,
            cycles: data.cycles ?? [],
            schedulerState: data.schedulerState ?? true,
            activeTradeCountdown: data.activeTradeCountdown ?? null,
            lastResetDay: data.lastResetDay ?? null,
            stuckContractStartTime: null,
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
            planning: { ...DEFAULT_PLANNING }
          };

          this.modeStates = {
            demo: isDemo ? migratedState : {
              isRunning: false, initialBalance: 0, balance: 0, sessionStartTime: null, galeLevel: 0, currentSorosStake: 0,
              waitingForGaleNextCandle: false, lastGaleDirection: null, activeContractId: null, lastContractDetails: null,
              candles: [], trades: [], logs: [], liveSignals: {}, strategiesStats: [], sessionAssetStats: {},
              activeCycleId: null, cycles: [], schedulerState: true, activeTradeCountdown: null, lastResetDay: null,
              stuckContractStartTime: null, settings: { ...DEFAULT_SETTINGS, isDemo: true },
              planning: { ...DEFAULT_PLANNING }
            },
            real: !isDemo ? migratedState : {
              isRunning: false, initialBalance: 0, balance: 0, sessionStartTime: null, galeLevel: 0, currentSorosStake: 0,
              waitingForGaleNextCandle: false, lastGaleDirection: null, activeContractId: null, lastContractDetails: null,
              candles: [], trades: [], logs: [], liveSignals: {}, strategiesStats: [], sessionAssetStats: {},
              activeCycleId: null, cycles: [], schedulerState: true, activeTradeCountdown: null, lastResetDay: null,
              stuckContractStartTime: null, settings: { ...DEFAULT_SETTINGS, isDemo: false },
              planning: { ...DEFAULT_PLANNING }
            }
          };
        }
        
        this.loadedFromFile = true;
        console.log(`Loaded persisted session for ${this.email} (Active mode: ${this._activeMode})`);
      }
    } catch (e) {
      console.error(`Error loading session file for ${this.email}:`, e);
    }
  }

  saveToFile() {
    try {
      // Ensure logs slice is only updated for saving to keep file sizes small
      this.modeStates.demo.logs = this.modeStates.demo.logs.slice(-200);
      this.modeStates.real.logs = this.modeStates.real.logs.slice(-200);
      
      const data = {
        email: this.email,
        activeMode: this._activeMode,
        modeStates: this.modeStates
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`Error saving session file for ${this.email}:`, e);
    }
  }

  setupDerivAPI() {
    this.derivAPI.onConnectionChange = (status) => {
      console.log(`Deriv Connection status for ${this.email}: ${status}`);
      this.syncToClients();
    };

    this.derivAPI.onAuthSuccess = (info) => {
      this.balance = info.balance;
      console.log(`Deriv Account Authorized for ${this.email}. Balance: ${info.balance}`);
      this.syncToClients();
      
      // If we had an active contract running before crash, re-subscribe to it
      if (this.activeContractId && this.activeContractId !== 'PENDING_REGISTRATION') {
        this.derivAPI.subscribeContract(this.activeContractId);
      }
    };

    this.derivAPI.onLogMessage = (log) => {
      this.addLog(log);
    };

    this.derivAPI.onTickUpdate = (tick) => {
      // Forward to clients
      this.broadcastToClients({
        type: 'tick',
        tick
      });
    };

    this.derivAPI.onCandleHistory = (historyCandles) => {
      this.candles = historyCandles;
      this.syncToClients();
    };

    this.derivAPI.onCandleUpdate = (ohlc) => {
      if (parseInt(ohlc.granularity) !== parseInt(this.settings.granularity)) return;

      const newCandle = {
        epoch: ohlc.open_time,
        open: parseFloat(ohlc.open),
        high: parseFloat(ohlc.high),
        low: parseFloat(ohlc.low),
        close: parseFloat(ohlc.close)
      };

      if (this.candles.length === 0) {
        this.candles = [newCandle];
      } else {
        const last = this.candles[this.candles.length - 1];
        if (last.epoch === newCandle.epoch) {
          this.candles[this.candles.length - 1] = newCandle;
        } else if (newCandle.epoch > last.epoch) {
          this.candles.push(newCandle);
          if (this.candles.length > 200) this.candles.shift();
          
          // Candle CLOSED transition
          setTimeout(() => {
            this.handleCandleClosed(this.candles);
          }, 100);
        }
      }

      this.broadcastToClients({
        type: 'candle_update',
        ohlc
      });
    };

    this.derivAPI.onContractUpdate = (poc) => {
      this.handleContractUpdate(poc);
    };

    this.derivAPI.onErrorReceived = (err) => {
      this.addLog({ message: `[Erro Deriv] ${err}`, type: 'error', time: new Date().toLocaleTimeString() });
      if (this.activeContractId === 'PENDING_REGISTRATION') {
        console.log(`[Deriv Error] Clearing PENDING_REGISTRATION lock for ${this.email} due to error: ${err}`);
        this.activeContractId = null;
        this.activeTradeCountdown = null;
        this.saveToFile();
        this.syncToClients();
      }
    };
  }

  addLog(logObj) {
    const cleanLog = {
      message: logObj.message,
      type: logObj.type || 'info',
      time: logObj.time || new Date().toLocaleTimeString()
    };
    this.logs.push(cleanLog);
    if (this.logs.length > 200) this.logs.shift();
    this.broadcastToClients({
      type: 'log',
      log: cleanLog
    });
    this.saveToFile();
  }

  broadcastToClients(payload) {
    const raw = JSON.stringify(payload);
    for (const ws of this.clients) {
      if (ws.readyState === 1) { // OPEN
        ws.send(raw);
      }
    }
  }

  addClient(ws) {
    this.clients.add(ws);
    // Send initial sync payload
    this.sendSyncPayload(ws);
  }

  removeClient(ws) {
    this.clients.delete(ws);
  }

  sendSyncPayload(ws) {
    const payload = {
      type: 'sync',
      data: {
        isRunning: this.isRunning,
        initialBalance: this.initialBalance,
        balance: this.balance,
        galeLevel: this.galeLevel,
        currentSorosStake: this.currentSorosStake,
        waitingForGaleNextCandle: this.waitingForGaleNextCandle,
        lastGaleDirection: this.lastGaleDirection,
        activeContractId: this.activeContractId,
        lastContractDetails: this.lastContractDetails,
        candles: this.candles,
        trades: this.trades,
        logs: this.logs,
        liveSignals: this.liveSignals,
        strategiesStats: this.strategiesStats,
        sessionAssetStats: this.sessionAssetStats,
        activeCycleId: this.activeCycleId,
        cycles: this.cycles,
        schedulerState: this.schedulerState,
        activeTradeCountdown: this.activeTradeCountdown,
        settings: this.settings,
        derivConnected: this.derivAPI.connected,
        derivAuthorized: this.derivAPI.authorized,
        derivLatency: this.derivAPI.latency
      }
    };
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }

  syncToClients() {
    for (const ws of this.clients) {
      this.sendSyncPayload(ws);
    }
  }

   async setupSupabaseListener() {
    if (!supabase) return;
    try {
      this.supabaseSubscription = supabase
        .channel(`user:${this.email}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `email=eq.${this.email}`
          },
          async (payload) => {
            const data = payload.new;
            if (!data) return;

            // 1. Check for pending Telegram webhook commands
            if (data.pending_command && !data.pending_command.processed) {
              const command = data.pending_command;
              console.log(`[Telegram Cmd] Received remote command: ${command.text} for ${this.email}`);
              
              // Mark as processed in Supabase
              await supabase
                .from('users')
                .update({ pending_command: { ...command, processed: true } })
                .eq('email', this.email);

              // Run command
              this.executeTelegramCommand(command.text, null, command.message_id);
            }

            // Only load settings, telegramConfig, and cycles from Supabase if we didn't load a local JSON session file yet.
            if (!this.loadedFromFile) {
              let settingsChanged = false;
              if (data.settings) {
                const incoming = data.settings;
                for (const key of Object.keys(this.settings)) {
                  // Exclude telegram settings from the raw data.settings to prevent overwrite loops
                  if (key.startsWith('telegram')) continue;
                  if (incoming[key] !== undefined && incoming[key] !== this.settings[key]) {
                    this.settings[key] = incoming[key];
                    settingsChanged = true;
                  }
                }
              }

              // Check for Telegram configuration updates from Supabase
              if (data.telegram_config) {
                const tc = data.telegram_config;
                if (tc.enabled !== undefined && tc.enabled !== this.settings.telegramEnabled) {
                  this.settings.telegramEnabled = tc.enabled;
                  settingsChanged = true;
                }
                if (tc.token !== undefined && tc.token !== this.settings.telegramToken) {
                  this.settings.telegramToken = tc.token;
                  settingsChanged = true;
                }
                if (tc.chatId !== undefined && String(tc.chatId) !== String(this.settings.telegramChatId)) {
                  this.settings.telegramChatId = String(tc.chatId);
                  settingsChanged = true;
                }
                
                if (tc.notifications) {
                  const notifs = tc.notifications;
                  const notifMapping = {
                    win: 'telegramNotifWin',
                    loss: 'telegramNotifLoss',
                    daily_summary: 'telegramNotifDailySummary',
                    bot_started: 'telegramNotifBotStarted',
                    bot_stopped: 'telegramNotifBotStopped',
                    take_profit: 'telegramNotifTakeProfit',
                    stop_loss: 'telegramNotifStopLoss',
                    opportunity_found: 'telegramNotifOpportunity',
                    order_executed: 'telegramNotifOrder',
                    cycle_started: 'telegramNotifCycle'
                  };
                  
                  for (const [tcKey, sessionKey] of Object.entries(notifMapping)) {
                    if (notifs[tcKey] !== undefined && notifs[tcKey] !== this.settings[sessionKey]) {
                      this.settings[sessionKey] = notifs[tcKey];
                      settingsChanged = true;
                    }
                  }
                }
              }

              // Check for cycles updates
              if (data.cycles) {
                this.cycles = data.cycles;
                settingsChanged = true;
              }

              if (data.scheduler_state !== undefined) {
                this.schedulerState = data.scheduler_state;
                settingsChanged = true;
              }

              if (settingsChanged || data.settings || data.cycles) {
                this.loadedFromFile = true;
                this.saveToFile();
                this.syncToClients();

                // React to token/AppId/isDemo changes
                if (this.derivAPI.token !== this.settings.token || this.derivAPI.appId !== this.settings.appId || this.derivAPI.isDemo !== this.settings.isDemo) {
                  if (this.settings.token) {
                    this.derivAPI.symbol = this.settings.symbol;
                    this.derivAPI.granularity = parseInt(this.settings.granularity);
                    this.derivAPI.connect(this.settings.token, this.settings.appId, this.settings.isDemo);
                  }
                } else if (this.derivAPI.symbol !== this.settings.symbol || this.derivAPI.granularity !== parseInt(this.settings.granularity)) {
                  this.derivAPI.changeSymbol(this.settings.symbol, parseInt(this.settings.granularity));
                }
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.error(`Error setting up Supabase listener for ${this.email}:`, e);
    }
  }

  // Connect to Deriv API
  connectDeriv() {
    if (this.settings.token) {
      this.derivAPI.symbol = this.settings.symbol;
      this.derivAPI.granularity = parseInt(this.settings.granularity);
      this.derivAPI.connect(this.settings.token, this.settings.appId, this.settings.isDemo);
    }
  }

  // Telegram Notifications sender
  async sendTelegramNotif(type, htmlText) {
    const OFFICIAL_BOT_TOKEN = '8422393109:AAFVC0lgcHyKoDKlamkKe6ZAQ2oANLxRV5E';
    const token = this.settings.telegramToken || OFFICIAL_BOT_TOKEN;
    if (!this.settings.telegramEnabled || !token || !this.settings.telegramChatId) return;
    
    // Check user preference filters
    if (type === 'win' && !this.settings.telegramNotifWin) return;
    if (type === 'loss' && !this.settings.telegramNotifLoss) return;
    if (type === 'daily_summary' && !this.settings.telegramNotifDailySummary) return;

    try {
      await sendTelegramMessage(token, this.settings.telegramChatId, htmlText, true);
    } catch (e) {
      console.error('Error sending Telegram notification:', e);
    }
  }

  startBot() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initialBalance = this.balance;
    this.sessionStartTime = Date.now();
    this.galeLevel = 0;
    this.currentSorosStake = 0;
    this.waitingForGaleNextCandle = false;
    this.candles = []; // Clear candles for a fresh analysis start
    this.addLog({ message: 'INICIANDO OPERAÇÕES AUTOMÁTICAS', type: 'success' });
    
    this.sendTelegramNotif('bot_started', `🤖 <b>ASTROBOT OPERANDO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Ativo:</b> <code>${this.settings.symbol}</code>\n<b>Estratégia:</b> <code>${this.settings.selectedStrategy}</code>\n<b>Stake Inicial:</b> <code>$${this.settings.stakeValue}</code>\n<b>Saldo Inicial:</b> <code>$${this.balance}</code>`);
    
    // Ensure we are connected and authorized, or force resubscribe if already connected
    if (this.settings.token) {
      if (!this.derivAPI.connected || !this.derivAPI.authorized) {
        console.log(`[Manual Start] Deriv not connected or not authorized for ${this.email}. Reconnecting...`);
        this.derivAPI.connect(this.settings.token, this.settings.appId, this.settings.isDemo);
      } else {
        console.log(`[Manual Start] Force renewing Deriv subscription to ${this.settings.symbol} (${this.settings.granularity}s).`);
        this.derivAPI.changeSymbol(this.settings.symbol, parseInt(this.settings.granularity));
      }
    }

    this.saveToFile();
    this.syncToClients();
    this.syncStatusToFirestore();
  }

  stopBot() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.addLog({ message: 'OPERAÇÕES AUTOMÁTICAS PARALISADAS', type: 'warning' });
    
    this.sendTelegramNotif('bot_stopped', `🛑 <b>ASTROBOT PARADO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Saldo Final:</b> <code>$${this.balance}</code>\n<b>Resultado:</b> <code>$${(this.balance - this.initialBalance).toFixed(2)}</code>`);

    // Reset active cycle so scheduler can trigger again on next scheduled time
    if (this.activeCycleId) {
      const cycleId = this.activeCycleId;
      this.cycles = this.cycles.map(c => c.id === cycleId ? { ...c, status: 'Aguardando' } : c);
      this.activeCycleId = null;
      this.syncCyclesToFirestore();
    }
    
    this.saveToFile();
    this.syncToClients();
    this.syncStatusToFirestore();
  }

  async autoShareSessionResult(profit, metaHit) {
    if (!supabase) return;
    if (this.settings.autoShareEnabled !== true) return;

    try {
      const profile = await getUserProfile(this.email);

      const winCount = this.trades.filter(t => t.profit > 0).length;
      const winrate = this.trades.length > 0 ? (winCount / this.trades.length) * 100 : 0;
      const sessionDuration = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;

      const postObj = {
        email: this.email,
        userName: profile.fullname || this.email.split('@')[0],
        profileImage: profile.profileImage || '',
        timestamp: Date.now(),
        comment: metaHit ? 'Meta batida automaticamente pelo ASTROBOT! 🎯🚀' : 'Sessão finalizada pelo controle de gerenciamento do ASTROBOT.',
        isPublic: this.settings.autoSharePublic !== false,
        profit: parseFloat(profit.toFixed(2)),
        tradesTotal: parseInt(this.trades.length),
        winRate: parseFloat(winrate.toFixed(1)),
        strategy: this.settings.selectedStrategy || 'N/A',
        symbol: this.settings.symbol || 'N/A',
        sessionTime: parseInt(sessionDuration),
        metaHit: !!metaHit,
        likes: [],
        reactions: { '🔥': [], '🚀': [], '👏': [], '💎': [] },
        comments: [],
        shares: 0
      };

      await addCommunityPost(postObj);
      console.log(`[Community] Automatically shared session result for ${this.email}`);
    } catch (e) {
      console.error('Error automatically sharing session result:', e);
    }
  }

  updateSettings(newSettings) {
    const prevMode = this._activeMode;
    const prevSymbol = this.settings.symbol;
    const prevGranularity = this.settings.granularity;

    if (newSettings.isDemo !== undefined) {
      this._activeMode = newSettings.isDemo ? 'demo' : 'real';
    }

    const symbolChanged = newSettings.symbol !== this.settings.symbol;
    const granularityChanged = parseInt(newSettings.granularity) !== parseInt(this.settings.granularity);
    const tokenChanged = newSettings.token !== this.settings.token || newSettings.appId !== this.settings.appId || newSettings.isDemo !== this.settings.isDemo;

    // Merge settings into active mode's settings
    this.settings = { ...this.settings, ...newSettings };
    
    // Save, sync and update Supabase fields for current active state
    this.saveToFile();
    this.syncToClients();
    this.syncSettingsToFirestore();
    this.syncCyclesToFirestore();
    this.syncStatusToFirestore();

    if (tokenChanged || prevMode !== this._activeMode) {
      if (this.settings.token) {
        this.derivAPI.connect(this.settings.token, this.settings.appId, this.settings.isDemo);
      } else {
        this.derivAPI.disconnect();
      }
    } else if (symbolChanged || granularityChanged) {
      this.derivAPI.changeSymbol(this.settings.symbol, parseInt(this.settings.granularity));
    }
  }

  updatePlanning(newPlanning) {
    // Deep merge planning fields
    const currentPlanning = this.planning || { ...DEFAULT_PLANNING };
    this.planning = {
      goals: { ...currentPlanning.goals, ...(newPlanning.goals || {}) },
      simulator: { ...currentPlanning.simulator, ...(newPlanning.simulator || {}) }
    };
    this.saveToFile();
    this.syncToClients();
  }

  updateCycles(newCycles) {
    this.cycles = newCycles;
    this.saveToFile();
    this.syncToClients();
    this.syncCyclesToFirestore();
  }

  async syncSettingsToFirestore() {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ settings: this.settings })
        .eq('email', this.email);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase settings sync error:', e);
    }
  }

  async syncStatusToFirestore() {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_running: this.isRunning,
          active_cycle_id: this.activeCycleId
        })
        .eq('email', this.email);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase status sync error:', e);
    }
  }

  async syncCyclesToFirestore() {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ cycles: this.cycles })
        .eq('email', this.email);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase cycles sync error:', e);
    }
  }

  async saveDbTradeFirestore(trade) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('trades')
        .insert({
          id: trade.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user_email: this.email,
          symbol: trade.symbol,
          contract_type: trade.contractType,
          stake: parseFloat(trade.stake),
          profit: parseFloat(trade.profit),
          result: trade.result,
          strategy_name: trade.strategyName,
          gale_level: parseInt(trade.galeLevel || 0),
          timestamp: trade.epoch ? trade.epoch * 1000 : Date.now()
        });
      if (error) throw error;
      console.log(`Saved trade to Supabase for ${this.email}`);
    } catch (e) {
      console.error('Supabase trade save error:', e);
    }
  }

  triggerCycle(cycle) {
    this.activeCycleId = cycle.id;

    // Support both field naming conventions:
    // Old: cycle.strategy / cycle.maxGale / cycle.management / cycle.autopilot
    // New (Scheduler Generator): cycle.selectedStrategy / cycle.martingaleLevels
    const strategyId = cycle.strategy || cycle.selectedStrategy || this.settings.selectedStrategy;
    const maxGale = cycle.maxGale ?? cycle.martingaleLevels ?? parseInt(this.settings.martingaleMaxLevels);
    // If no management field set explicitly, infer from martingaleLevels:
    // > 0 means martingale should be active
    const management = cycle.management || cycle.moneyManagement ||
      (parseInt(maxGale) > 0 ? 'martingale' : 'fixed');
    const autopilot = cycle.autopilot ?? (strategyId === 'autopilot');
    const stake = cycle.stake ?? cycle.stakeValue ?? parseFloat(this.settings.stakeValue);
    const stopLoss = cycle.stopLoss ?? parseFloat(this.settings.stopLoss);
    const takeProfit = cycle.takeProfit ?? parseFloat(this.settings.takeProfit);

    // Apply cycle risk configurations
    this.settings.stakeValue = parseFloat(stake).toFixed(2);
    this.settings.stopLoss = parseFloat(stopLoss).toFixed(2);
    this.settings.takeProfit = parseFloat(takeProfit).toFixed(2);
    this.settings.selectedStrategy = strategyId === 'autopilot' ? this.settings.selectedStrategy : strategyId;
    this.settings.autoPilot = autopilot || strategyId === 'autopilot';
    this.settings.martingaleMaxLevels = maxGale.toString();
    this.settings.moneyManagement = management;
    this.settings.martingaleEnabled = parseInt(maxGale) > 0; // ensure flag is on

    const prevSymbol = this.settings.symbol;
    const prevGranularity = this.settings.granularity;

    // Apply optional settings from cycle if present
    let chosenSymbol = cycle.symbol || this.settings.symbol;
    if (this.isAssetBlacklisted(chosenSymbol)) {
      this.addLog({
        message: `⚠️ [Blacklist Protection] O ativo ${chosenSymbol} está bloqueado na blacklist! Chaveando automaticamente para um ativo seguro...`,
        type: 'warning'
      });
      const altAssets = ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_50', '1HZ50V', 'R_25', '1HZ25V', 'R_10', '1HZ10V'];
      chosenSymbol = altAssets.find(s => !this.isAssetBlacklisted(s)) || 'R_100';
    }
    this.settings.symbol = chosenSymbol;

    if (cycle.granularity) this.settings.granularity = cycle.granularity.toString();
    if (cycle.disableSlowStrategies !== undefined) this.settings.disableSlowStrategies = cycle.disableSlowStrategies;
    if (cycle.disableMaCrossover !== undefined) this.settings.disableMaCrossover = cycle.disableMaCrossover;
    if (cycle.enableMasterCandleSecondary !== undefined) this.settings.enableMasterCandleSecondary = cycle.enableMasterCandleSecondary;
    if (cycle.martingaleMultiplier !== undefined) this.settings.martingaleMultiplier = cycle.martingaleMultiplier.toString();



    // Reset gale levels and clear candles for fresh analysis
    this.galeLevel = 0;
    this.currentSorosStake = 0;
    this.waitingForGaleNextCandle = false;
    this.candles = [];
    this.initialBalance = this.balance;
    this.sessionStartTime = Date.now();
    this.isRunning = true;

    this.addLog({
      message: `Ciclo ${cycle.name} iniciado pelo agendador.`,
      type: 'success'
    });

    this.sendTelegramNotif('cycle_started', `📅 <b>CICLO AGENDADO INICIADO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Ciclo:</b> <code>${cycle.name}</code>\n<b>Estratégia:</b> <code>${strategyId}</code>\n<b>Stake:</b> <code>$${parseFloat(stake).toFixed(2)}</code>\n<b>Stop Loss:</b> <code>$${parseFloat(stopLoss).toFixed(2)}</code>\n<b>Take Profit:</b> <code>$${parseFloat(takeProfit).toFixed(2)}</code>`);

    // Ensure we are connected and authorized, or force resubscribe if already connected
    if (this.settings.token) {
      if (!this.derivAPI.connected || !this.derivAPI.authorized) {
        console.log(`[Scheduler] Deriv not connected or not authorized for ${this.email} on cycle start. Reconnecting...`);
        this.derivAPI.connect(this.settings.token, this.settings.appId, this.settings.isDemo);
      } else {
        console.log(`[Scheduler] Cycle starting for ${this.email}. Renewing Deriv subscription to ${this.settings.symbol} (${this.settings.granularity}s).`);
        this.derivAPI.changeSymbol(this.settings.symbol, parseInt(this.settings.granularity));
      }
    }

    // Update cycle status
    this.cycles = this.cycles.map(c => c.id === cycle.id ? { ...c, status: 'Ativo' } : c);
    
    this.saveToFile();
    this.syncToClients();
    this.syncStatusToFirestore();
    this.syncCyclesToFirestore();
    this.syncSettingsToFirestore();
  }

  // This should be run on a 5-second tick from the global server loop
  schedulerTick(now = new Date()) {
    if (!this.schedulerState) return;

    // 0. Watchdog for Stuck Trade Contracts or Pending Registrations
    if (this.activeContractId) {
      if (this.activeContractId === 'PENDING_REGISTRATION') {
        if (!this.pendingRegistrationStartTime) {
          this.pendingRegistrationStartTime = now.getTime();
        } else if (now.getTime() - this.pendingRegistrationStartTime > 15000) { // 15 seconds max
          console.log(`[Watchdog] Ordem pendente expirou sem resposta da Deriv para ${this.email}. Destravando...`);
          this.addLog({ message: '[Watchdog] Confirmação da ordem expirou sem resposta do servidor. Liberando execução.', type: 'warning' });
          this.activeContractId = null;
          this.pendingRegistrationStartTime = null;
          this.activeTradeCountdown = null;
          this.stuckContractStartTime = null;
          this.saveToFile();
          this.syncToClients();
        }
      } else {
        this.pendingRegistrationStartTime = null;
        if (this.activeTradeCountdown && this.activeTradeCountdown.dateExpiry) {
          this.stuckContractStartTime = null;
          const nowEpoch = Math.floor(now.getTime() / 1000);
          if (nowEpoch > this.activeTradeCountdown.dateExpiry + 20) { // 20s grace period past expiry
            console.log(`[Watchdog] Ordem ${this.activeContractId} expirada sem evento de fechamento para ${this.email}. Liberando trava.`);
            this.addLog({ message: `[Watchdog] Ordem #${this.activeContractId} finalizada por tempo decorrido. Liberando execução.`, type: 'warning' });
            this.activeContractId = null;
            this.activeTradeCountdown = null;
            this.saveToFile();
            this.syncToClients();
          }
        } else {
          // If activeContractId is set but activeTradeCountdown is missing/null, prevent permanent lock
          if (!this.stuckContractStartTime) {
            this.stuckContractStartTime = now.getTime();
          } else if (now.getTime() - this.stuckContractStartTime > 30000) { // 30s threshold
            console.log(`[Watchdog] Ordem ${this.activeContractId} sem contagem regressiva identificada para ${this.email}. Liberando trava.`);
            this.addLog({ message: `[Watchdog] Trava de ordem #${this.activeContractId} liberada por falta de rastreamento de tempo.`, type: 'warning' });
            this.activeContractId = null;
            this.activeTradeCountdown = null;
            this.stuckContractStartTime = null;
            this.saveToFile();
            this.syncToClients();
          }
        }
      }
    } else {
      this.pendingRegistrationStartTime = null;
      this.stuckContractStartTime = null;
    }

    // 1. Daily Reset of cycle status to "Aguardando"
    const todayStr = now.toDateString();
    if (this.lastResetDay === null) {
      this.lastResetDay = todayStr;
      this.saveToFile();
    } else if (this.lastResetDay !== todayStr) {
      console.log(`[Scheduler] New day detected (${todayStr}) for ${this.email}. Resetting all cycle statuses to "Aguardando".`);
      this.cycles = this.cycles.map(c => ({ ...c, status: 'Aguardando' }));
      this.lastResetDay = todayStr;
      
      // Stop the running bot and clear the active cycle ID since it's a new day!
      if (this.isRunning) {
        console.log(`[Scheduler] Stopping running bot on new day reset for ${this.email}.`);
        this.isRunning = false;
      }
      this.activeCycleId = null;
      
      this.saveToFile();
      this.syncCyclesToFirestore();
    }

    // 1b. Inconsistency check (Active cycle pointing to "Aguardando" or missing)
    if (this.activeCycleId) {
      const activeCycle = this.cycles.find(c => c.id === this.activeCycleId);
      if (!activeCycle || activeCycle.status === 'Aguardando') {
        console.log(`[Scheduler] Active cycle ${this.activeCycleId} is in "Aguardando" state or missing for ${this.email}. Resetting state.`);
        this.activeCycleId = null;
        if (this.isRunning) {
          this.stopBot();
        } else {
          this.saveToFile();
          this.syncCyclesToFirestore();
        }
      }
    }

    // 2. Safety Timeout Check (Max 3 hours running duration)
    if (this.activeCycleId && this.isRunning && this.sessionStartTime) {
      const elapsedMs = now.getTime() - this.sessionStartTime;
      const maxDurationMs = 3 * 60 * 60 * 1000; // 3 hours
      if (elapsedMs > maxDurationMs) {
        console.log(`[Scheduler] Active cycle "${this.activeCycleId}" for ${this.email} exceeded maximum duration of 3 hours. Force stopping...`);
        this.addLog({ message: `Ciclo finalizado por tempo limite de segurança de 3 horas.`, type: 'warning' });
        
        const staleId = this.activeCycleId;
        this.stopBot();
        
        // Override state to Finalizado so it doesn't trigger again immediately
        this.cycles = this.cycles.map(c => c.id === staleId ? { ...c, status: 'Finalizado' } : c);
        this.activeCycleId = null;
        this.saveToFile();
        this.syncCyclesToFirestore();
      }
    }

    // 3. Stale cleanup & Orphaned status sanitization
    let cyclesSanitized = false;
    if (!this.isRunning) {
      if (this.activeCycleId) {
        this.activeCycleId = null;
        cyclesSanitized = true;
      }
      this.cycles = this.cycles.map(c => {
        if (['Ativo', 'Executando', 'Scanner', 'Procurando Entrada', 'Executando Ordem'].includes(c.status)) {
          console.log(`[Scheduler] Cleaning up orphaned active cycle "${c.name}" status for ${this.email}.`);
          cyclesSanitized = true;
          return { ...c, status: 'Aguardando' };
        }
        return c;
      });
    } else if (this.activeCycleId) {
      this.cycles = this.cycles.map(c => {
        if (c.id !== this.activeCycleId && ['Ativo', 'Executando', 'Scanner', 'Procurando Entrada', 'Executando Ordem'].includes(c.status)) {
          console.log(`[Scheduler] Cleaning up inactive cycle "${c.name}" status for ${this.email}.`);
          cyclesSanitized = true;
          return { ...c, status: 'Aguardando' };
        }
        return c;
      });
    }

    if (cyclesSanitized) {
      this.saveToFile();
      this.syncCyclesToFirestore();
    }

    // 4. Pending Cycle Check (only evaluate first 10s of a minute)
    const currentSeconds = now.getSeconds();
    let pendingCycle = null;

    if (currentSeconds <= 10) {
      const parseTimezoneOffset = (tzString) => {
        if (!tzString || tzString === 'UTC') return 0;
        const match = tzString.match(/GMT([+-])(\d+)/);
        if (match) {
          const sign = match[1] === '+' ? 1 : -1;
          const hours = parseInt(match[2]);
          return sign * hours;
        }
        return 0;
      };

      const getCycleTimeParts = (timezone, dateObj) => {
        const offsetHours = parseTimezoneOffset(timezone);
        const targetDate = new Date(dateObj.getTime() + (offsetHours * 3600000));
        const hh = targetDate.getUTCHours().toString().padStart(2, '0');
        const mm = targetDate.getUTCMinutes().toString().padStart(2, '0');
        const dayIndex = targetDate.getUTCDay();
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return {
          hhmm: `${hh}:${mm}`,
          currentDayName: dayNames[dayIndex],
          minutesSinceMidnight: targetDate.getUTCHours() * 60 + targetDate.getUTCMinutes()
        };
      };

      const timeToMinutes = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
      };

      pendingCycle = this.cycles.find(cycle => {
        if (!cycle.active || cycle.status !== 'Aguardando') return false;
        const parts = getCycleTimeParts(cycle.timezone || 'GMT-3', now);
        const days = cycle.days || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const dayMatches = days.includes(parts.currentDayName);
        if (!dayMatches) return false;

        const cycleMinutes = timeToMinutes(cycle.startTime);
        const currentMinutes = parts.minutesSinceMidnight;
        // Check if start time has arrived and we are within the 15-minute grace/catch-up window
        const minutesDiff = currentMinutes - cycleMinutes;
        const timeMatches = minutesDiff >= 0 && minutesDiff <= 15;

        if (dayMatches && !timeMatches) {
          // Log near-miss for debugging (only log once per minute at second 0)
          if (now.getSeconds() <= 5) {
            console.log(`[Scheduler][${this.email}] Cycle "${cycle.name}" waiting. Expected: ${cycle.startTime}, Current: ${parts.hhmm} (tz: ${cycle.timezone || 'GMT-3'})`);
          }
        }
        return timeMatches;
      });
    }

    // 5. Preemption & Triggering
    if (pendingCycle) {
      if (this.activeCycleId && this.isRunning) {
        console.log(`[Scheduler] Preempting current cycle "${this.activeCycleId}" to start scheduled cycle "${pendingCycle.name}" for ${this.email}...`);
        
        const currentActiveId = this.activeCycleId;
        this.isRunning = false;
        this.addLog({ message: `Ciclo finalizado pelo agendador para iniciar a próxima missão: ${pendingCycle.name}`, type: 'warning' });
        
        const profit = this.balance - this.initialBalance;
        this.sendTelegramNotif('bot_stopped', `🛑 <b>CICLO ENCERRADO PELO AGENDADOR</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Ciclo:</b> <code>${this.cycles.find(c => c.id === currentActiveId)?.name || 'N/A'}</code>\n<b>Saldo Final:</b> <code>$${this.balance}</code>\n<b>Resultado:</b> <code>$${profit.toFixed(2)}</code>`);
        
        // Mark the previous cycle as Finalizado
        this.cycles = this.cycles.map(c => c.id === currentActiveId ? { ...c, status: 'Finalizado' } : c);
      }
      
      this.triggerCycle(pendingCycle);
    }
  }

  handleCandleClosed(activeCandles) {
    const closedCandles = activeCandles.slice(0, -1);
    if (closedCandles.length < 5) return;

    const maxGale = this.settings.martingaleEnabled ? parseInt(this.settings.martingaleMaxLevels) : 0;
    this.strategiesStats = analyzeStrategies(closedCandles, maxGale);

    // Autopilot dominant strategy revaluation
    const baseFiltered = this.strategiesStats.filter(s => s.id !== 'master_candle');
    let filteredStats = baseFiltered;
    if (this.settings.autoPilot) {
      if (this.settings.disableSlowStrategies) {
        filteredStats = filteredStats.filter(s => s.id !== 'pullback' && s.id !== 'reversal');
      }
      if (this.settings.disableMaCrossover) {
        filteredStats = filteredStats.filter(s => s.id !== 'ma_crossover');
      }
    }
    const sorted = [...filteredStats].sort((a, b) => b.winRate - a.winRate);
    const bestStrategy = sorted.length > 0 && sorted[0].winRate > 0 ? sorted[0] : null;

    if (bestStrategy) {
      this.sessionAssetStats[this.settings.symbol] = {
        assetName: this.settings.symbol,
        bestStrategyName: bestStrategy.name,
        bestWinRate: bestStrategy.winRate
      };

      const lastOpenedCandle = activeCandles[activeCandles.length - 1];
      const epochMinutes = Math.floor(lastOpenedCandle.epoch / 60);
      const evalInterval = Math.max(
        parseInt(this.settings.autoPilotInterval || '5'),
        Math.round(parseInt(this.settings.granularity) / 60)
      );

      if (epochMinutes % evalInterval === 0 && this.settings.autoPilot) {
        if (bestStrategy.id !== this.settings.selectedStrategy) {
          this.addLog({
            message: `[Piloto Automático] Nova estratégia dominante identificada: ${bestStrategy.name} (${bestStrategy.winRate.toFixed(1)}% Assertividade). Alterando automaticamente.`,
            type: 'success'
          });
          this.settings.selectedStrategy = bestStrategy.id;
          this.syncSettingsToFirestore();
        }
      }
    }

    // Compute live signals
    const signals = {};
    this.strategiesStats.forEach(s => {
      const sig = getLiveSignal(s.id, closedCandles, maxGale);
      if (sig) {
        signals[s.id] = sig;
      }
    });
    this.liveSignals = signals;

    this.syncToClients();

    // If bot is stopped, stop here
    if (!this.isRunning) return;

    // Check Stop Loss / Take Profit
    const profit = this.balance - this.initialBalance;
    if (profit >= parseFloat(this.settings.takeProfit)) {
      this.addLog({ message: `Meta de Lucro (Take Profit) atingida! Parando bot. Lucro: $${profit.toFixed(2)}`, type: 'success' });
      
      const winCount = this.trades.filter(t => t.profit > 0).length;
      const winrate = this.trades.length > 0 ? (winCount / this.trades.length) * 100 : 0;
      this.sendTelegramNotif('take_profit', formatTakeProfitMessage(profit, this.trades.length, winrate));

      if (this.activeCycleId) {
        const cycleId = this.activeCycleId;
        this.cycles = this.cycles.map(c => c.id === cycleId ? { ...c, status: 'Meta Batida', finalProfit: profit } : c);
        this.activeCycleId = null;
        this.syncCyclesToFirestore();
      }

      this.autoShareSessionResult(profit, true);
      this.stopBot();
      return;
    }

    if (profit <= -parseFloat(this.settings.stopLoss)) {
      this.addLog({ message: `Limite de Perda (Stop Loss) atingido! Parando bot. Prejuízo: $${profit.toFixed(2)}`, type: 'error' });
      
      const winCount = this.trades.filter(t => t.profit > 0).length;
      const winrate = this.trades.length > 0 ? (winCount / this.trades.length) * 100 : 0;
      this.sendTelegramNotif('stop_loss', formatStopLossMessage(profit, this.trades.length, winrate));

      if (this.activeCycleId) {
        const cycleId = this.activeCycleId;
        this.cycles = this.cycles.map(c => c.id === cycleId ? { ...c, status: 'Stop Atingido', finalProfit: profit } : c);
        this.activeCycleId = null;
        this.syncCyclesToFirestore();
      }

      // Auto-blacklist current asset for 3 days to avoid repeat Stop Loss
      if (this.settings.symbol) {
        this.addAssetToBlacklist(this.settings.symbol, 3, 'Stop Loss Atingido');
      }

      this.autoShareSessionResult(profit, false);
      this.stopBot();
      return;
    }

    // Block if trade is active
    if (this.activeContractId) {
      this.addLog({ message: 'Aguardando fechamento da ordem em andamento...', type: 'info' });
      return;
    }

    // Check Martingale next candle
    if (this.waitingForGaleNextCandle && this.lastGaleDirection) {
      const nextStake = this.calculateCurrentStake(true);
      this.executeTrade(nextStake, this.lastGaleDirection);
      this.waitingForGaleNextCandle = false;
      return;
    }

    // Normal strategy entry signal
    let targetStrategyId = this.settings.selectedStrategy;
    if (this.settings.autoPilot && bestStrategy) {
      targetStrategyId = bestStrategy.id;
    }
    if (targetStrategyId === 'autopilot') {
      const fallback = this.strategiesStats.find(s => s.id !== 'master_candle' && s.id !== 'autopilot');
      targetStrategyId = fallback ? fallback.id : 'three_musketeers';
    }

    let signal = null;
    let strategyUsed = targetStrategyId;

    if (this.settings.enableMasterCandleSecondary && this.liveSignals['master_candle']) {
      signal = this.liveSignals['master_candle'];
      strategyUsed = 'master_candle';
    } else {
      signal = this.liveSignals[targetStrategyId];
    }

    if (signal) {
      const stake = this.calculateCurrentStake(false);
      this.addLog({ message: `Sinal identificado na estratégia [${strategyUsed}] para operar ${signal.direction}.`, type: 'info' });
      
      this.sendTelegramNotif('opportunity', formatOpportunityFound(
        this.settings.symbol,
        this.strategiesStats.find(s => s.id === strategyUsed)?.name || strategyUsed,
        signal.direction,
        this.strategiesStats.find(s => s.id === strategyUsed)?.winRate || 0,
        stake,
        new Date().toLocaleTimeString()
      ));

      this.executeTrade(stake, signal.direction);
    }
  }

  calculateCurrentStake(isMartingaleUpdate) {
    const mode = this.settings.moneyManagement || (this.settings.martingaleEnabled ? 'martingale' : 'fixed');
    let baseStake = parseFloat(this.settings.stakeValue);

    if (this.settings.stakeType === 'percentage') {
      baseStake = (this.balance * (baseStake / 100));
      if (baseStake < 0.35) baseStake = 0.35;
    }

    if (mode === 'fixed' || mode === 'iron_hands') {
      return baseStake;
    }

    const level = this.galeLevel;
    const multiplier = parseFloat(this.settings.martingaleMultiplier);

    if (mode === 'soros') {
      if (this.currentSorosStake && this.currentSorosStake > 0) {
        return this.currentSorosStake;
      }
      return baseStake;
    }

    if (mode === 'reverse_gale') {
      if (level > 0) {
        return baseStake * Math.pow(multiplier, level);
      }
      return baseStake;
    }

    if (mode === 'progressive_gale') {
      if (isMartingaleUpdate && level > 0) {
        return baseStake * Math.pow(multiplier + level * 0.25, level);
      }
      return baseStake;
    }

    if (mode === 'martingale') {
      if (isMartingaleUpdate && level > 0) {
        return baseStake * Math.pow(multiplier, level);
      }
    }

    return baseStake;
  }

  executeTrade(stake, direction) {
    const contractType = direction === 'CALL' ? 'CALL' : 'PUT';
    let durationMin = Math.max(1, Math.round(parseInt(this.settings.granularity) / 60));
    let durationUnit = 'm';

    // Forex minimum duration adjust
    if (this.settings.symbol.startsWith('frx') && durationUnit === 'm') {
      if (durationMin < 15) {
        this.addLog({
          message: `[Ajuste Forex] Alterando duração de ${durationMin}m para 15m (mínimo obrigatório da Deriv).`,
          type: 'warning'
        });
        durationMin = 15;
      }
    }

    this.derivAPI.buyContract(this.settings.symbol, stake, contractType, durationMin, durationUnit);
    this.lastGaleDirection = direction;
    this.activeContractId = 'PENDING_REGISTRATION';
    this.saveToFile();
    this.syncToClients();

    this.sendTelegramNotif('order_executed', formatOrderExecuted(this.settings.symbol, direction, stake));
  }

  handleContractUpdate(poc) {
    if (!this.isRunning) return;

    if (this.activeContractId === 'PENDING_REGISTRATION') {
      this.activeContractId = poc.contract_id;
      this.lastContractDetails = {
        epoch: poc.date_start,
        symbol: poc.underlying_symbol,
        contractType: poc.contract_type,
        stake: parseFloat(poc.buy_price),
        galeLevel: this.galeLevel,
        entryPrice: parseFloat(poc.entry_tick)
      };
      
      this.addLog({
        message: `Ordem confirmada no servidor. ID: ${poc.contract_id}. Aguardando resultado...`,
        type: 'info'
      });

      const fallbackDuration = parseInt(this.settings.granularity);
      const total = (poc.date_expiry && poc.date_start) ? (poc.date_expiry - poc.date_start) : fallbackDuration;
      
      this.activeTradeCountdown = {
        contractId: poc.contract_id,
        symbol: poc.underlying_symbol,
        contractType: poc.contract_type,
        stake: parseFloat(poc.buy_price),
        dateStart: poc.date_start || Math.floor(Date.now() / 1000),
        dateExpiry: poc.date_expiry || (Math.floor(Date.now() / 1000) + fallbackDuration),
        totalDuration: total,
        remaining: total
      };

      this.saveToFile();
      this.syncToClients();
      return;
    }

    if (poc.contract_id !== this.activeContractId) return;

    const status = poc.status;
    const isSold = poc.is_sold;
    const profit = parseFloat(poc.profit || 0);

    // Update countdown remaining
    if (this.activeTradeCountdown && poc.date_expiry) {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, poc.date_expiry - nowEpoch);
      this.activeTradeCountdown.remaining = remaining;
      this.syncToClients();
    }

    if (isSold === 1 || status === 'won' || status === 'lost') {
      const details = this.lastContractDetails;
      if (!details) return;

      this.activeTradeCountdown = null;
      const isWin = profit > 0;
      const resultLabel = isWin ? 'WIN' : 'LOSS';

      const newBal = this.balance + profit;
      this.balance = newBal; // Update local balance

      // Telegram win/loss notifications
      if (isWin) {
        const sessionProfit = newBal - this.initialBalance;
        const goalPct = this.settings.takeProfit > 0 ? (sessionProfit / this.settings.takeProfit) * 100 : 0;
        this.sendTelegramNotif('win', formatWinMessage(profit, newBal, goalPct));
      } else {
        const nextGale = this.galeLevel + 1;
        const maxGale = parseInt(this.settings.martingaleMaxLevels || '2');
        const hasGale = nextGale <= maxGale && (this.settings.moneyManagement === 'martingale' || this.settings.moneyManagement === 'progressive_gale');
        const nextStakeEst = hasGale ? parseFloat(this.settings.stakeValue) * Math.pow(parseFloat(this.settings.martingaleMultiplier || '2.2'), nextGale) : 0;
        this.sendTelegramNotif('loss', formatLossMessage(profit, newBal, hasGale ? nextGale : 0, nextStakeEst));
      }

      const tradeObj = {
        id: poc.contract_id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        time: new Date(details.epoch * 1000).toLocaleTimeString(),
        epoch: details.epoch,
        symbol: details.symbol,
        contractType: details.contractType,
        stake: details.stake,
        galeLevel: details.galeLevel,
        profit: profit,
        result: resultLabel,
        strategyName: this.settings.autoPilot ? 'Piloto Automático' : this.settings.selectedStrategy,
        timestamp: details.epoch ? details.epoch * 1000 : Date.now()
      };

      this.trades.push(tradeObj);
      this.saveDbTradeFirestore(tradeObj);

      this.addLog({
        message: `[${resultLabel}] Operação concluída. Lucro/Retorno: $${profit.toFixed(2)} | Novo Saldo: $${newBal.toFixed(2)}`,
        type: isWin ? 'success' : 'error'
      });

      this.activeContractId = null;
      this.lastContractDetails = null;

      const mode = this.settings.moneyManagement || (this.settings.martingaleEnabled ? 'martingale' : 'fixed');

      // Money management step calculations
      if (mode === 'fixed' || mode === 'iron_hands') {
        this.galeLevel = 0;
        this.waitingForGaleNextCandle = false;
      } 
      
      else if (mode === 'soros') {
        if (isWin) {
          const nextLevel = this.galeLevel + 1;
          const maxLevels = parseInt(this.settings.martingaleMaxLevels || '2');
          
          if (nextLevel < maxLevels) {
            this.galeLevel = nextLevel;
            const compoundingRatio = Math.min(1.0, parseFloat(this.settings.martingaleMultiplier || '1.0') >= 10 ? parseFloat(this.settings.martingaleMultiplier) / 100 : parseFloat(this.settings.martingaleMultiplier));
            const prevSorosStake = this.currentSorosStake || details.stake;
            const nextSorosStake = prevSorosStake + (profit * compoundingRatio);
            this.currentSorosStake = parseFloat(nextSorosStake.toFixed(2));
            
            this.addLog({
              message: `[Soros] Vitória! Avançando para Estágio ${nextLevel + 1}/${maxLevels}. Próxima entrada: $${this.currentSorosStake}`,
              type: 'success'
            });
          } else {
            this.galeLevel = 0;
            this.currentSorosStake = 0;
            this.addLog({
              message: '[Soros] Ciclo de Soros Concluído com Sucesso! Resetando para a entrada inicial.',
              type: 'success'
            });
          }
        } else {
          this.galeLevel = 0;
          this.currentSorosStake = 0;
          this.waitingForGaleNextCandle = false;
          this.addLog({
            message: '[Soros] Loss detectado. Ciclo interrompido. Resetando para a entrada inicial.',
            type: 'error'
          });
        }
      } 
      
      else if (mode === 'reverse_gale') {
        if (isWin) {
          const nextLevel = this.galeLevel + 1;
          if (nextLevel <= parseInt(this.settings.martingaleMaxLevels)) {
            this.galeLevel = nextLevel;
            this.addLog({
              message: `[Gale Invertido] Vitória! Subindo nível de compounding para ${nextLevel}.`,
              type: 'success'
            });
          } else {
            this.galeLevel = 0;
            this.addLog({
              message: '[Gale Invertido] Limite de compounding atingido. Resetando para a entrada inicial.',
              type: 'success'
            });
          }
        } else {
          this.galeLevel = 0;
          this.waitingForGaleNextCandle = false;
          this.addLog({
            message: '[Gale Invertido] Loss detectado. Resetando para a entrada inicial.',
            type: 'error'
          });
        }
      } 
      
      else { // Standard Martingale / Progressive Martingale
        if (isWin) {
          this.galeLevel = 0;
          this.waitingForGaleNextCandle = false;
        } else {
          const nextLevel = this.galeLevel + 1;
          const maxLevels = parseInt(this.settings.martingaleMaxLevels || '2');
          
          if (nextLevel <= maxLevels) {
            this.galeLevel = nextLevel;
            this.addLog({
              message: `Loss detectado. Preparando ${mode === 'progressive_gale' ? 'Gale Progressivo' : 'Martingale'} Nível ${nextLevel}...`,
              type: 'warning'
            });

            if (this.settings.martingaleMode === 'next_candle') {
              const granularity = parseInt(this.settings.granularity || '60');
              const secondsElapsed = Math.floor(Date.now() / 1000) % granularity;
              const threshold = Math.max(15, Math.floor(granularity * 0.25));

              if (secondsElapsed <= threshold) {
                const nextStake = this.calculateCurrentStake(true);
                this.addLog({
                  message: `Executando Nível ${nextLevel} imediatamente na nova vela aberta (${secondsElapsed}s decorridos).`,
                  type: 'warning'
                });
                this.executeTrade(nextStake, this.lastGaleDirection);
                this.waitingForGaleNextCandle = false;
              } else {
                this.waitingForGaleNextCandle = true;
                this.addLog({
                  message: `Próxima vela já avançada (${secondsElapsed}s decorridos). Agendado para o início do próximo ciclo.`,
                  type: 'warning'
                });
              }
            }
          } else {
            this.galeLevel = 0;
            this.waitingForGaleNextCandle = false;
            this.addLog({
              message: `[Gale] Limite de Martingale atingido (G${maxLevels}). Resetando para a entrada inicial.`,
              type: 'error'
            });
          }
        }
      }

      this.saveToFile();
      this.syncToClients();
    }
  }

  startCountdownTimer() {
    this.countdownIntervalId = setInterval(() => {
      if (this.activeTradeCountdown) {
        const nowEpoch = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, this.activeTradeCountdown.dateExpiry - nowEpoch);
        this.activeTradeCountdown.remaining = remaining;
        
        // If expired but still not closed, keep remaining at 0
        this.syncToClients();
      }
    }, 1000);
  }

  stopCountdownTimer() {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  // Handle Telegram Remote Command
  executeTelegramCommand(text, overrideToken = null, messageId = null) {
    const cmd = (text || '').trim().toLowerCase();
    const tok = overrideToken || this.settings.telegramToken || '8422393109:AAFVC0lgcHyKoDKlamkKe6ZAQ2oANLxRV5E';
    const cid = this.settings.telegramChatId;

    const reply = (html) => {
      if (tok && cid) {
        sendTelegramMessage(tok, cid, html, true).catch(err => {
          console.error('Error replying telegram command:', err);
        });
      }
    };

    if (cmd === '/startbot' || cmd === '▶ iniciar bot') {
      if (!this.isRunning) {
        this.startBot();
        reply(
          `🟢 <b>ASTROBOT • INICIANDO OPERAÇÕES</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 <i>O motor de inteligência artificial foi iniciado no VPS e está monitorando o mercado em tempo real.</i>`
        );
      } else {
        reply(`ℹ️ <b>O bot já está operando</b> no VPS.`);
      }
    } else if (cmd === '/stopbot' || cmd === '⛔ parar') {
      if (this.isRunning) {
        this.stopBot();
        reply(
          `🛑 <b>ASTROBOT • OPERAÇÕES INTERROMPIDAS</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚠️ <i>As operações automáticas foram suspensas via comando remoto.</i>`
        );
      } else {
        reply(`ℹ️ <b>O bot já está parado</b> no VPS.`);
      }
    } else if (cmd === '/pause' || cmd === '⏸ pausar') {
      if (this.isRunning) {
        this.stopBot();
        reply(
          `⏸ <b>ASTROBOT • OPERAÇÕES PAUSADAS</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💤 <i>O robô foi pausado e não realizará novas entradas até ser retomado.</i>`
        );
      } else {
        reply(`ℹ️ <b>O bot já está pausado</b> no VPS.`);
      }
    } else if (cmd === '/resume') {
      if (!this.isRunning) {
        this.startBot();
        reply(
          `▶️ <b>ASTROBOT • OPERAÇÕES RETOMADAS</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🚀 <i>O robô foi retomado e voltou a monitorar as estratégias ativas.</i>`
        );
      } else {
        reply(`ℹ️ <b>O bot já está operando</b> no VPS.`);
      }
    } else if (cmd === '/saldo' || cmd === '💰 saldo') {
      reply(
        `💰 <b>ASTROBOT • SALDO OPERACIONAL</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💲 <b>Banca Atual:</b> <code>$${this.balance?.toFixed(2) || '0.00'}</code>\n` +
        `🤖 <i>Monitorando conexões e margem de garantia.</i>`
      );
    } else if (cmd === '/lucro' || cmd === '📈 relatório') {
      const profit = this.balance - this.initialBalance;
      const sign = profit >= 0 ? '+' : '';
      reply(
        `📈 <b>ASTROBOT • RESULTADO DA SESSÃO</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💵 <b>Resultado:</b> <code>${sign}$${profit.toFixed(2)}</code>\n` +
        `💳 <b>Saldo em Conta:</b> <code>$${this.balance?.toFixed(2)}</code>\n` +
        `🤖 <i>Banca inicial da sessão: $${this.initialBalance?.toFixed(2)}</i>`
      );
    } else if (cmd === '/status') {
      const profit = this.balance - this.initialBalance;
      const sign = profit >= 0 ? '+' : '';
      reply(
        `🤖 <b>ASTROBOT • STATUS DO SISTEMA</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <b>Estado do Motor:</b> <code>${this.isRunning ? 'ONLINE & OPERANDO 🟩' : 'OFFLINE & PAUSADO 🟥'}</code>\n` +
        `💵 <b>Resultado Sessão:</b> <code>${sign}$${profit.toFixed(2)}</code>\n` +
        `💰 <b>Saldo Atual:</b> <code>$${this.balance?.toFixed(2) || '0.00'}</code>\n` +
        `🌐 <b>Servidor VPS:</b> <code>Conectado à Deriv</code>`
      );
    } else if (cmd === '/scanner' || cmd === '📊 scanner') {
      const activeSigList = Object.entries(this.liveSignals || {}).map(([id, sig]) => {
        const name = this.strategiesStats.find(st => st.id === id)?.name || id;
        const emoji = sig.direction === 'CALL' ? '🟩 CALL' : '🟥 PUT';
        return `• <b>${name}</b>: <code>${emoji}</code>`;
      });
      const sigText = activeSigList.length > 0 ? activeSigList.join('\n') : '<i>Nenhum sinal ativo no momento.</i>';
      reply(
        `📊 <b>ASTROBOT • SCANNER MULTI-ESTRATÉGIAS</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📈 <b>Ativo Analisado:</b> <code>${this.settings.symbol}</code>\n` +
        `🧠 <b>Sinais em Tempo Real:</b>\n\n` +
        `${sigText}`
      );
    } else if (cmd === '/ciclos' || cmd === '📅 ciclos') {
      const schedulerStatusText = this.schedulerState ? '🟢 Automação Online' : '🔴 Automação Offline';
      
      let concluidosCount = 0;
      let execucaoCount = 0;
      let aguardandoCount = 0;

      const cycleListText = this.cycles.map(c => {
        let emoji = '⏳';
        if (!c.active) {
          emoji = '⏸';
        } else if (c.id === this.activeCycleId && this.isRunning) {
          emoji = '▶';
          execucaoCount++;
        } else if (c.status === 'Meta Batida' || c.status === 'Stop Atingido' || c.status === 'Finalizado') {
          emoji = '🏆';
          concluidosCount++;
        } else {
          emoji = '⏳';
          aguardandoCount++;
        }

        const cleanName = c.name
          .replace(/^(Madrugada|Manhã|Tarde|Noite)\s*-\s*/gi, '')
          .replace(/\s*\(Auto\)$/gi, '');

        return `<code>${c.startTime}</code> ${emoji} <b>${cleanName}</b>`;
      }).join('\n');

      const message = 
        `🚀 <b>ASTROBOT • CICLOS AUTOMÁTICOS</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>${schedulerStatusText}</b>\n` +
        `🏆 <b>${concluidosCount}</b> ciclo${concluidosCount !== 1 ? 's' : ''} concluído${concluidosCount !== 1 ? 's' : ''}\n` +
        `▶ <b>${execucaoCount}</b> ciclo${execucaoCount !== 1 ? 's' : ''} em execução\n` +
        `⏳ <b>${aguardandoCount}</b> ciclo${aguardandoCount !== 1 ? 's' : ''} aguardando\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${cycleListText || '<i>Nenhum ciclo cadastrado.</i>'}`;

      reply(message);
    } else if (cmd === '/estrategias') {
      const sortedStrats = [...this.strategiesStats].sort((a, b) => b.winRate - a.winRate);
      const stratText = sortedStrats.slice(0, 8).map((st, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•';
        return `${medal} <b>${st.name}</b>: <code>${st.winRate.toFixed(1)}%</code> (${st.wins}W - ${st.losses}L)`;
      }).join('\n');
      reply(
        `🧠 <b>ASTROBOT • ASSERTIVIDADE DAS ESTRATÉGIAS</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📈 <b>Ativo:</b> <code>${this.settings.symbol}</code>\n\n` +
        `🥇 <b>Ranking das Melhores (M5/M15/M1):</b>\n\n` +
        `${stratText || '<i>Sem dados estatísticos no momento.</i>'}`
      );
    } else if (cmd === '/relatorio') {
      const profit = this.balance - this.initialBalance;
      const sign = profit >= 0 ? '+' : '';
      const totalTrades = this.trades.length;
      const wins = this.trades.filter(t => t.profit > 0).length;
      const losses = this.trades.filter(t => t.profit < 0).length;
      const winrate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      reply(
        `📊 <b>ASTROBOT • RELATÓRIO OPERACIONAL</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📈 <b>Ativo Atual:</b> <code>${this.settings.symbol}</code>\n` +
        `💰 <b>Saldo Inicial:</b> <code>$${this.initialBalance?.toFixed(2)}</code>\n` +
        `💳 <b>Saldo Atual:</b> <code>$${this.balance?.toFixed(2)}</code>\n` +
        `💵 <b>Resultado:</b> <code>${sign}$${profit.toFixed(2)}</code>\n` +
        `🔄 <b>Total de Operações:</b> <code>${totalTrades}</code>\n` +
        `🏆 <b>Assertividade:</b> <code>${winrate.toFixed(1)}%</code> (${wins}W - ${losses}L)\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 <i>Análise estatística em tempo real via VPS.</i>`
      );
    } else if (cmd === '/config' || cmd === '⚙ configurações') {
      reply(
        `⚙️ <b>ASTROBOT • PAINEL DE CONFIGURAÇÕES</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📈 <b>Ativo Base:</b> <code>${this.settings.symbol}</code>\n` +
        `⏰ <b>Gráficos:</b> <code>M${this.settings.granularity === '60' ? '1' : this.settings.granularity === '300' ? '5' : '15'}</code>\n` +
        `🛡️ <b>Gerenciamento:</b> <code>${this.settings.moneyManagement.toUpperCase()}</code>\n` +
        `🤖 <b>Piloto Automático:</b> <code>${this.settings.autoPilot ? 'ATIVADO 🟩' : 'DESATIVADO 🟥'}</code>\n` +
        `💵 <b>Stake Inicial:</b> <code>$${this.settings.stakeValue}</code>`
      );
    } else if (cmd === '/limpar' || cmd === '🧹 limpar' || cmd === '🧹 limpar chat') {
      if (messageId) {
        deleteTelegramMessages(tok, cid, messageId, 100).then(() => {
          sendTelegramMessage(tok, cid, '✨ <b>ASTROBOT • CHAT LIMPO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<i>O histórico recente de mensagens foi limpo com sucesso.</i>', false)
            .then(res => {
              if (res.success && res.data && res.data.result) {
                const confMsgId = res.data.result.message_id;
                setTimeout(() => {
                  fetch(`https://api.telegram.org/bot${tok}/deleteMessage?chat_id=${cid}&message_id=${confMsgId}`, { method: 'POST' }).catch(() => {});
                }, 3000);
              }
            });
        });
      } else {
        reply('⚠️ <b>Não foi possível limpar o chat.</b> ID da mensagem ausente.');
      }
    }
  }

  addAssetToBlacklist(symbol, days = 3, reason = 'Stop Loss Atingido') {
    if (!symbol) return;
    const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
    const existing = this.settings.blacklistedAssets || [];
    const updated = existing.filter(b => b.symbol !== symbol && b.expiresAt > Date.now());
    updated.push({
      symbol,
      addedAt: Date.now(),
      expiresAt,
      days,
      reason
    });
    this.settings.blacklistedAssets = updated;
    this.addLog({
      message: `[Blacklist System] Ativo ${symbol} foi colocado na lista negra por ${days} dias (${reason}).`,
      type: 'warning'
    });
    this.saveSettings();
  }

  isAssetBlacklisted(symbol) {
    const list = this.settings.blacklistedAssets || [];
    return list.some(b => b.symbol === symbol && b.expiresAt > Date.now());
  }

  destroy() {
    this.stopCountdownTimer();
    if (this.supabaseSubscription) {
      this.supabaseSubscription.unsubscribe();
      this.supabaseSubscription = null;
    }
    this.derivAPI.disconnect();
    this.saveToFile();
  }
}
