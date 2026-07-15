import React, { useState, useEffect, useRef } from 'react';
import { derivAPI } from './deriv/DerivAPI';
import { analyzeStrategies, getLiveSignal, evaluateTrade } from './strategies/tradingStrategies';
import Chart from './components/Chart';
import Settings from './components/Settings';
import StrategyList from './components/StrategyList';
import Stats from './components/Stats';
import Logs from './components/Logs';
import IntelligenceRecommender from './components/IntelligenceRecommender';
import Overlay from './components/Overlay';
import Scanner from './components/Scanner';
import Scheduler from './components/Scheduler';
import { ShieldCheck, ShieldAlert, Cpu, Radio, LogOut, RefreshCw, KeyRound, Layers, Info, ExternalLink, Lock } from 'lucide-react';
import { loadDbTrades, saveDbTrade, clearDbTrades } from './utils/db';
import moonImg from './assets/moon.avif';

export default function App() {
  const isOverlayMode = window.location.search.includes('overlay=true');

  // Connection states
  const [token, setToken] = useState(() => localStorage.getItem('deriv_token') || '');
  const [appId, setAppId] = useState(() => localStorage.getItem('deriv_app_id') || '1098');
  const [isDemo, setIsDemo] = useState(true);
  
  const [connected, setConnected] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [balance, setBalance] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [accountInfo, setAccountInfo] = useState(null);
  const [latency, setLatency] = useState(0);
  
  // Market data states
  const [candles, setCandles] = useState([]);
  
  // Trading states
  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState({
    symbol: 'R_100',
    granularity: '60', // 1 min (60)
    stakeType: 'fixed', // 'fixed' | 'percentage'
    stakeValue: 1.0,
    stopLoss: 50.0,
    takeProfit: 50.0,
    moneyManagement: 'martingale',
    martingaleEnabled: true,
    martingaleMode: 'next_candle', // 'next_candle' | 'next_signal'
    martingaleMultiplier: 2.2,
    martingaleMaxLevels: 2,
    selectedStrategy: 'mhi_minority',
    autoPilot: true,
    autoPilotInterval: '5',
    disableSlowStrategies: false,
    enableMasterCandleSecondary: false
  });
  
  const [strategiesStats, setStrategiesStats] = useState([]);
  const [sessionAssetStats, setSessionAssetStats] = useState({});
  const [aiSuggestion, setAiSuggestion] = useState({
    strategyId: '',
    strategyName: '',
    winRate: 0,
    currentWinRate: 0,
    active: false
  });
  const [liveSignals, setLiveSignals] = useState({});
  const [trades, setTrades] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTradeCountdown, setActiveTradeCountdown] = useState(null);
  const [dbTrades, setDbTrades] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [showLanding, setShowLanding] = useState(true);
  const [landingTab, setLandingTab] = useState('home');
  const [overlayActive, setOverlayActive] = useState(false);
  const [bottomTab, setBottomTab] = useState('logs');

  // License / CDKey States
  const [cdKey, setCdKey] = useState(() => {
    return localStorage.getItem('astrobot_cdkey') || '';
  });
  const [keyExpiresAt, setKeyExpiresAt] = useState(() => {
    const saved = localStorage.getItem('astrobot_expires_at');
    return saved ? parseInt(saved) : null;
  });
  const [isKeyValid, setIsKeyValid] = useState(() => {
    const expires = localStorage.getItem('astrobot_expires_at');
    return expires ? parseInt(expires) > Date.now() : false;
  });
  const [cdKeyInput, setCdKeyInput] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [activating, setActivating] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Administrative Panel States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('astrobot_admin_token') === 'lucas_astro_admin';
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  const [adminKeysList, setAdminKeysList] = useState([]);
  const [loadingAdminKeys, setLoadingAdminKeys] = useState(false);
  const [keysError, setKeysError] = useState('');

  const [generateDays, setGenerateDays] = useState('30');
  const [generateCount, setGenerateCount] = useState('1');
  const [generatingKeys, setGeneratingKeys] = useState(false);

  const [showActivationSuccessModal, setShowActivationSuccessModal] = useState(false);
  const [activationRemainingDays, setActivationRemainingDays] = useState(0);

  // Validate license on mount and periodically
  useEffect(() => {
    const checkLicense = () => {
      const expires = localStorage.getItem('astrobot_expires_at');
      if (expires) {
        const expiresMs = parseInt(expires);
        if (Date.now() > expiresMs) {
          setIsKeyValid(false);
        } else {
          setIsKeyValid(true);
        }
      } else {
        setIsKeyValid(false);
      }
    };

    checkLicense();
    const interval = setInterval(checkLicense, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleActivateKey = async (e) => {
    if (e) e.preventDefault();
    if (!cdKeyInput.trim()) return;

    setActivating(true);
    setActivationError('');
    setActivationSuccess('');

    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const apiUrl = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/check-key'
        : '/api/check-key';

      const payload = { cdkey: cdKeyInput.trim().toUpperCase() };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        localStorage.setItem('astrobot_cdkey', cdKeyInput.trim().toUpperCase());
        localStorage.setItem('astrobot_expires_at', result.expiresAt.toString());
        
        setCdKey(cdKeyInput.trim().toUpperCase());
        setKeyExpiresAt(result.expiresAt);
        
        const remainingMs = result.expiresAt - Date.now();
        const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
        setActivationRemainingDays(remainingDays);
        setShowActivationSuccessModal(true);
        
        setActivationSuccess(result.message || 'Licença ativada com sucesso!');
        setCdKeyInput('');
        
        addLog({
          message: `[Licença] CDKEY ativada com sucesso! Válida até ${new Date(result.expiresAt).toLocaleDateString()}`,
          type: 'success',
          time: new Date().toLocaleTimeString()
        });
      } else {
        setActivationError(result.message || 'Chave inválida ou já utilizada.');
      }
    } catch (err) {
      console.error(err);
      setActivationError('Erro ao se conectar ao servidor de validação.');
    } finally {
      setActivating(false);
    }
  };

  const loadAdminKeys = async () => {
    setLoadingAdminKeys(true);
    setKeysError('');
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const url = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/list-keys?admin_token=lucas_astro_admin'
        : '/api/list-keys?admin_token=lucas_astro_admin';

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminKeysList(data.keys);
      } else {
        setKeysError(data.error || 'Falha ao carregar as chaves.');
      }
    } catch (err) {
      setKeysError('Erro ao se conectar ao servidor.');
    } finally {
      setLoadingAdminKeys(false);
    }
  };

  const handleGenerateKeysAdmin = async (e) => {
    if (e) e.preventDefault();
    setGeneratingKeys(true);
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const url = isLocalOrElectron 
        ? `https://astrobot-seven.vercel.app/api/generate-key?admin_token=lucas_astro_admin&days=${generateDays}&count=${generateCount}`
        : `/api/generate-key?admin_token=lucas_astro_admin&days=${generateDays}&count=${generateCount}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`${data.keys.length} chave(s) gerada(s) com sucesso!`);
        loadAdminKeys();
      } else {
        alert(data.error || 'Falha ao gerar chaves.');
      }
    } catch (err) {
      alert('Erro ao se conectar ao servidor para gerar chaves.');
    } finally {
      setGeneratingKeys(false);
    }
  };

  const handleDeleteKeyAdmin = async (keyToDelete) => {
    if (!confirm(`Tem certeza de que deseja excluir e revogar a chave ${keyToDelete}?`)) return;
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const url = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/delete-key'
        : '/api/delete-key';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: 'lucas_astro_admin', cdkey: keyToDelete })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadAdminKeys();
      } else {
        alert(data.error || 'Falha ao excluir chave.');
      }
    } catch (err) {
      alert('Erro ao se conectar ao servidor para excluir chave.');
    }
  };

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setAdminLoginError('');
    setAdminLoggingIn(true);
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const url = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/admin-login'
        : '/api/admin-login';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('astrobot_admin_token', data.token);
        setIsAdminLoggedIn(true);
        setShowAdminLoginModal(false);
        setLandingTab('admin');
        setAdminEmail('');
        setAdminPassword('');
        loadAdminKeys();
      } else {
        setAdminLoginError(data.message || 'Credenciais inválidas.');
      }
    } catch (err) {
      setAdminLoginError('Erro ao se conectar ao servidor de login.');
    } finally {
      setAdminLoggingIn(false);
    }
  };

  useEffect(() => {
    if (landingTab === 'admin' && isAdminLoggedIn) {
      loadAdminKeys();
    }
  }, [landingTab, isAdminLoggedIn]);

  // Scheduler / Automation States
  const [schedulerState, setSchedulerState] = useState(() => {
    return localStorage.getItem('astrobot_scheduler_active') === 'true';
  });

  const [cycles, setCycles] = useState(() => {
    const saved = localStorage.getItem('astrobot_scheduler_cycles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default seeded cycles
    return [
      {
        id: 'cycle-morning',
        name: 'Ciclo Manhã',
        startTime: '09:00',
        takeProfit: 30.0,
        stopLoss: 30.0,
        stakeValue: 1.0,
        symbol: 'R_100',
        selectedStrategy: 'autopilot',
        active: true,
        status: 'Aguardando',
        lastRun: null
      },
      {
        id: 'cycle-night',
        name: 'Ciclo Noite',
        startTime: '21:00',
        takeProfit: 30.0,
        stopLoss: 30.0,
        stakeValue: 1.0,
        symbol: 'R_100',
        selectedStrategy: 'autopilot',
        active: true,
        status: 'Aguardando',
        lastRun: null
      }
    ];
  });

  const [activeCycleId, setActiveCycleId] = useState(() => {
    return localStorage.getItem('astrobot_scheduler_active_cycle_id') || null;
  });

  const [schedulerLogs, setSchedulerLogs] = useState(() => {
    const saved = localStorage.getItem('astrobot_scheduler_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist scheduler settings
  useEffect(() => {
    localStorage.setItem('astrobot_scheduler_active', schedulerState);
  }, [schedulerState]);

  useEffect(() => {
    localStorage.setItem('astrobot_scheduler_cycles', JSON.stringify(cycles));
  }, [cycles]);

  useEffect(() => {
    if (activeCycleId) {
      localStorage.setItem('astrobot_scheduler_active_cycle_id', activeCycleId);
    } else {
      localStorage.removeItem('astrobot_scheduler_active_cycle_id');
    }
  }, [activeCycleId]);

  useEffect(() => {
    localStorage.setItem('astrobot_scheduler_logs', JSON.stringify(schedulerLogs));
  }, [schedulerLogs]);

  const addSchedulerLog = (message, type = 'info') => {
    const logObj = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setSchedulerLogs(prev => [...prev.slice(-49), logObj]);
  };

  const handleClearSchedulerLogs = () => {
    setSchedulerLogs([]);
  };

  // Refs to keep track of trade sequence parameters inside the event listeners
  const stateRef = useRef({
    isRunning: false,
    settings: {},
    balance: 0,
    initialBalance: 0,
    galeLevel: 0,
    currentSorosStake: 0,
    activeContractId: null,
    lastContractDetails: null,
    waitingForGaleNextCandle: false,
    lastGaleDirection: null,
    candles: [],
    activeCycleId: null
  });

  // Sync ref values
  useEffect(() => {
    stateRef.current.isRunning = isRunning;
    stateRef.current.settings = settings;
    stateRef.current.balance = balance;
    stateRef.current.initialBalance = initialBalance;
    stateRef.current.candles = candles;
    stateRef.current.activeCycleId = activeCycleId;
  }, [isRunning, settings, balance, initialBalance, candles, activeCycleId]);

  // Handle IPC communication with overlay
  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (!isElectron) return;

    const { ipcRenderer } = window.require('electron');

    const handleBotCommand = (event, command) => {
      if (command === 'toggle-bot') {
        if (stateRef.current.isRunning) {
          stopBot();
        } else {
          startBot();
        }
      }
    };

    const handleOverlayStatus = (event, active) => {
      setOverlayActive(active);
    };

    ipcRenderer.on('bot-command', handleBotCommand);
    ipcRenderer.on('overlay-status', handleOverlayStatus);

    return () => {
      ipcRenderer.removeListener('bot-command', handleBotCommand);
      ipcRenderer.removeListener('overlay-status', handleOverlayStatus);
    };
  }, []);

  // Broadcast state changes to the overlay window
  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (!isElectron) return;

    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send('state-update', {
      isRunning,
      connected,
      authorized,
      balance,
      initialBalance,
      trades: trades.slice(-10),
      activeTradeCountdown,
      settings: {
        symbol: settings.symbol,
        selectedStrategy: settings.selectedStrategy,
        martingaleEnabled: settings.martingaleEnabled,
        martingaleMaxLevels: settings.martingaleMaxLevels
      },
      latency
    });
  }, [isRunning, connected, authorized, balance, initialBalance, trades, activeTradeCountdown, settings.symbol, settings.selectedStrategy, settings.martingaleEnabled, settings.martingaleMaxLevels, latency]);

  // Log message helper
  const addLog = (logObj) => {
    setLogs(prev => [...prev.slice(-99), logObj]);
  };

  // Add system logs callback to DerivAPI
  useEffect(() => {
    derivAPI.onLogMessage = (log) => addLog(log);
    derivAPI.onConnectionChange = (status) => setConnected(status);
    derivAPI.onErrorReceived = (err) => {
      addLog({ message: `Erro Deriv: ${err}`, type: 'error', time: new Date().toLocaleTimeString() });
      setAuthError(err);
      // Release trade block if a request fails at registration stage
      if (stateRef.current.activeContractId === 'PENDING_REGISTRATION') {
        stateRef.current.activeContractId = null;
      }
    };

    derivAPI.onAuthSuccess = (info) => {
      setAuthError('');
      setBalance(info.balance);
      setInitialBalance(info.balance);
      setAccountInfo(info);
      setWelcomeName(info.fullname || info.email || 'Usuário');
      setShowWelcome(true);

      setTimeout(() => {
        setAuthorized(true);
        setShowWelcome(false);
      }, 2200);

      addLog({ message: `Conta Autorizada: ${info.fullname} | Saldo Inicial: $${info.balance}`, type: 'success', time: new Date().toLocaleTimeString() });
    };

    // Keep pinging for latency display
    const interval = setInterval(() => {
      if (derivAPI.connected) {
        setLatency(derivAPI.latency);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      derivAPI.disconnect();
    };
  }, []);

  // Handle active trade countdown tick
  useEffect(() => {
    if (!activeTradeCountdown || activeTradeCountdown.remaining <= 0) return;
    const interval = setInterval(() => {
      setActiveTradeCountdown(prev => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(interval);
          return { ...prev, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTradeCountdown?.contractId]);

  // Load persistent trades database on mount
  useEffect(() => {
    setDbTrades(loadDbTrades());
  }, []);

  // Handle Tick Updates (just in case they are needed, though we operate mostly on OHLC closed candles)
  useEffect(() => {
    derivAPI.onTickUpdate = (tick) => {
      // If we need ticks, handle here. Currently candles handles everything.
    };
  }, []);

  // Handle Initial Candle History
  useEffect(() => {
    derivAPI.onCandleHistory = (historyCandles) => {
      const formatted = historyCandles.map(c => ({
        epoch: c.epoch,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close)
      }));
      setCandles(formatted);
      addLog({ message: `Histórico carregado com ${formatted.length} velas.`, type: 'info', time: new Date().toLocaleTimeString() });
    };
  }, []);

  // Handle live Candle / OHLC updates
  useEffect(() => {
    derivAPI.onCandleUpdate = (ohlc) => {
      // Check granularity
      if (parseInt(ohlc.granularity) !== parseInt(stateRef.current.settings.granularity)) return;
      
      const newCandle = {
        epoch: ohlc.open_time,
        open: parseFloat(ohlc.open),
        high: parseFloat(ohlc.high),
        low: parseFloat(ohlc.low),
        close: parseFloat(ohlc.close)
      };

      setCandles(prev => {
        if (prev.length === 0) return [newCandle];
        const list = [...prev];
        const last = list[list.length - 1];

        if (last.epoch === newCandle.epoch) {
          // Update the current candle values in real-time
          list[list.length - 1] = newCandle;
          return list;
        } else if (newCandle.epoch > last.epoch) {
          // The previous candle (last) has just CLOSED!
          // Add the new active candle to the list
          list.push(newCandle);
          if (list.length > 200) list.shift();

          // We trigger calculations on this closed candle transition
          setTimeout(() => {
            handleCandleClosed(list);
          }, 100);

          return list;
        }
        return prev;
      });
    };
  }, []);

  // Run backtests and check for live signals when a candle closes
  const handleCandleClosed = (activeCandles) => {
    const currentSettings = stateRef.current.settings;
    
    // The last candle in activeCandles is the newly opened one.
    // The closed candles are everything up to the second-to-last.
    const closedCandles = activeCandles.slice(0, -1);
    if (closedCandles.length < 5) return;

    // 1. Run Strategy backtests on closed candles
    const maxGale = currentSettings.martingaleEnabled ? currentSettings.martingaleMaxLevels : 0;
    const stats = analyzeStrategies(closedCandles, maxGale);
    setStrategiesStats(stats);

    // Find the best strategy (excluding master_candle which is only secondary)
    const baseFiltered = stats.filter(s => s.id !== 'master_candle');
    const filteredStats = currentSettings.autoPilot && currentSettings.disableSlowStrategies
      ? baseFiltered.filter(s => s.id !== 'pullback' && s.id !== 'reversal')
      : baseFiltered;
    const sorted = [...filteredStats].sort((a, b) => b.winRate - a.winRate);
    const bestStrategy = sorted.length > 0 && sorted[0].winRate > 0 ? sorted[0] : null;

    // Save statistics of the current asset for cross-asset recommendations
    if (bestStrategy) {
      setSessionAssetStats(prev => ({
        ...prev,
        [currentSettings.symbol]: {
          assetName: currentSettings.symbol,
          bestStrategyName: bestStrategy.name,
          bestWinRate: bestStrategy.winRate
        }
      }));

      // Check if it's time to run autopilot/suggestion revaluation (on the newly opened candle)
      const lastOpenedCandle = activeCandles[activeCandles.length - 1];
      const epochMinutes = Math.floor(lastOpenedCandle.epoch / 60);
      const evalInterval = Math.max(
        parseInt(currentSettings.autoPilotInterval || '5'),
        Math.round(parseInt(currentSettings.granularity) / 60)
      );

      if (epochMinutes % evalInterval === 0) {
        if (currentSettings.autoPilot) {
          // If autopilot is enabled, change automatically!
          if (bestStrategy.id !== currentSettings.selectedStrategy) {
            addLog({
              message: `[Piloto Automático] Nova estratégia dominante identificada: ${bestStrategy.name} (${bestStrategy.winRate.toFixed(1)}% Assertividade). Alterando automaticamente.`,
              type: 'success',
              time: new Date().toLocaleTimeString()
            });
            setSettings(prev => ({ ...prev, selectedStrategy: bestStrategy.id }));
          }
        } else {
          // If autopilot is disabled, suggest the user to switch!
          const currentStratStats = stats.find(s => s.id === currentSettings.selectedStrategy);
          const currentWinRate = currentStratStats ? currentStratStats.winRate : 0;
          
          if (bestStrategy.id !== currentSettings.selectedStrategy && bestStrategy.winRate > currentWinRate + 2) {
            setAiSuggestion({
              strategyId: bestStrategy.id,
              strategyName: bestStrategy.name,
              winRate: bestStrategy.winRate,
              currentWinRate: currentWinRate,
              active: true
            });
          }
        }
      }
    }

    // 2. Compute live signals for all strategies on closed candles
    const signals = {};
    stats.forEach(s => {
      const sig = getLiveSignal(s.id, closedCandles, maxGale);
      if (sig) {
        signals[s.id] = sig;
      }
    });
    setLiveSignals(signals);

    // 3. If bot is NOT running, stop here
    if (!stateRef.current.isRunning) return;

    // 4. Check Stop Loss / Take Profit
    const profit = stateRef.current.balance - stateRef.current.initialBalance;
    if (profit >= parseFloat(currentSettings.takeProfit)) {
      addLog({ message: `Meta de Lucro (Take Profit) atingida! Parando bot. Lucro: $${profit.toFixed(2)}`, type: 'success', time: new Date().toLocaleTimeString() });
      
      // Update Cycle if active
      if (stateRef.current.activeCycleId) {
        const cycleId = stateRef.current.activeCycleId;
        setCycles(prev => {
          const updated = prev.map(c => c.id === cycleId ? { ...c, status: 'Meta Batida' } : c);
          const cycle = prev.find(c => c.id === cycleId);
          if (cycle) {
            addSchedulerLog(`Ciclo "${cycle.name}" finalizado: META BATIDA! Lucro: $${profit.toFixed(2)}`, 'success');
          }
          return updated;
        });
        setActiveCycleId(null);
        stateRef.current.activeCycleId = null;
      }

      stopBot();
      return;
    }
    if (profit <= -parseFloat(currentSettings.stopLoss)) {
      addLog({ message: `Limite de Perda (Stop Loss) atingido! Parando bot. Prejuízo: $${profit.toFixed(2)}`, type: 'error', time: new Date().toLocaleTimeString() });
      
      // Update Cycle if active
      if (stateRef.current.activeCycleId) {
        const cycleId = stateRef.current.activeCycleId;
        setCycles(prev => {
          const updated = prev.map(c => c.id === cycleId ? { ...c, status: 'Stop Atingido' } : c);
          const cycle = prev.find(c => c.id === cycleId);
          if (cycle) {
            addSchedulerLog(`Ciclo "${cycle.name}" finalizado: STOP LOSS ATINGIDO! Prejuízo: $${profit.toFixed(2)}`, 'error');
          }
          return updated;
        });
        setActiveCycleId(null);
        stateRef.current.activeCycleId = null;
      }

      stopBot();
      return;
    }

    // 5. If we are currently in an active trade, wait for it to settle
    if (stateRef.current.activeContractId) {
      addLog({ message: `Aguardando fechamento da ordem em andamento...`, type: 'info', time: new Date().toLocaleTimeString() });
      return;
    }

    // 6. Check for Martingale next candle
    if (stateRef.current.waitingForGaleNextCandle && stateRef.current.lastGaleDirection) {
      // Place Martingale trade IMMEDIATELY on the next candle in the same direction!
      const nextStake = calculateCurrentStake(true);
      executeTrade(nextStake, stateRef.current.lastGaleDirection);
      stateRef.current.waitingForGaleNextCandle = false;
      return;
    }

    // 7. Check for normal Strategy Entry signal
    let targetStrategyId = currentSettings.selectedStrategy;
    if (currentSettings.autoPilot && bestStrategy) {
      targetStrategyId = bestStrategy.id;
    }

    // Secondary strategy: check Master Candle first if enabled
    let signal = null;
    let strategyUsed = targetStrategyId;

    if (currentSettings.enableMasterCandleSecondary && signals['master_candle']) {
      signal = signals['master_candle'];
      strategyUsed = 'master_candle';
    } else {
      signal = signals[targetStrategyId];
    }

    if (signal) {
      const stake = calculateCurrentStake(false);
      addLog({ message: `Sinal identificado na estratégia [${strategyUsed}] para operar ${signal.direction}.`, type: 'info', time: new Date().toLocaleTimeString() });
      executeTrade(stake, signal.direction);
    }
  };

  // Calculate current stake depending on settings & gale level
  const calculateCurrentStake = (isMartingaleUpdate) => {
    const currentSettings = stateRef.current.settings;
    const mode = currentSettings.moneyManagement || (currentSettings.martingaleEnabled ? 'martingale' : 'fixed');
    let baseStake = parseFloat(currentSettings.stakeValue);

    if (currentSettings.stakeType === 'percentage') {
      baseStake = (stateRef.current.balance * (baseStake / 100));
      if (baseStake < 0.35) baseStake = 0.35;
    }

    if (mode === 'fixed' || mode === 'iron_hands') {
      return baseStake;
    }

    const level = stateRef.current.galeLevel;
    const multiplier = parseFloat(currentSettings.martingaleMultiplier);

    if (mode === 'soros') {
      if (stateRef.current.currentSorosStake && stateRef.current.currentSorosStake > 0) {
        return stateRef.current.currentSorosStake;
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
  };

  // Execute Trade on Deriv
  const executeTrade = (stake, direction) => {
    const currentSettings = stateRef.current.settings;
    const contractType = direction === 'CALL' ? 'CALL' : 'PUT';
    
    // We enter a trade matching the candle timeframe (e.g. 1m for M1, 5m for M5)
    let durationMin = Math.max(1, Math.round(parseInt(currentSettings.granularity) / 60));
    let durationUnit = 'm';

    // Forex options on Deriv require a minimum duration of 15 minutes for time-based trades in this jurisdiction
    if (currentSettings.symbol.startsWith('frx') && durationUnit === 'm') {
      if (durationMin < 15) {
        addLog({ 
          message: `[Ajuste Forex] Alterando duração de ${durationMin}m para 15m (mínimo obrigatório da Deriv para Forex nesta conta).`, 
          type: 'warning', 
          time: new Date().toLocaleTimeString() 
        });
        durationMin = 15;
      }
    }

    derivAPI.buyContract(currentSettings.symbol, stake, contractType, durationMin, durationUnit);
    
    stateRef.current.lastGaleDirection = direction;
    // Set a temporary block until we get confirmation from Deriv buy request
    stateRef.current.activeContractId = 'PENDING_REGISTRATION';
  };

  // Handle open contract updates (Proposal Open Contract)
  useEffect(() => {
    derivAPI.onContractUpdate = (poc) => {
      // Check if we are waiting for a trade result
      if (!stateRef.current.isRunning) return;

      const currentSettings = stateRef.current.settings;

      // If we just got the contract ID from subscription
      if (stateRef.current.activeContractId === 'PENDING_REGISTRATION') {
        stateRef.current.activeContractId = poc.contract_id;
        stateRef.current.lastContractDetails = {
          epoch: poc.date_start,
          symbol: poc.underlying_symbol,
          contractType: poc.contract_type,
          stake: parseFloat(poc.buy_price),
          galeLevel: stateRef.current.galeLevel,
          entryPrice: parseFloat(poc.entry_tick)
        };
        addLog({ message: `Ordem confirmada no servidor. ID: ${poc.contract_id}. Aguardando resultado...`, type: 'info', time: new Date().toLocaleTimeString() });

        // Initialize countdown
        const fallbackDuration = parseInt(currentSettings.granularity);
        const total = (poc.date_expiry && poc.date_start) ? (poc.date_expiry - poc.date_start) : fallbackDuration;
        setActiveTradeCountdown({
          contractId: poc.contract_id,
          symbol: poc.underlying_symbol,
          contractType: poc.contract_type,
          stake: parseFloat(poc.buy_price),
          dateStart: poc.date_start || Math.floor(Date.now() / 1000),
          dateExpiry: poc.date_expiry || (Math.floor(Date.now() / 1000) + fallbackDuration),
          totalDuration: total,
          remaining: total
        });

        return;
      }

      // Ensure this update belongs to our active contract
      if (poc.contract_id !== stateRef.current.activeContractId) return;

      const status = poc.status;
      const isSold = poc.is_sold;
      const profit = parseFloat(poc.profit || 0);

      // Contract resolved
      if (isSold === 1 || status === 'won' || status === 'lost') {
        const details = stateRef.current.lastContractDetails;
        if (!details) return;

        // Clear countdown banner
        setActiveTradeCountdown(null);

        const isWin = profit > 0;
        const resultLabel = isWin ? 'WIN' : 'LOSS';
        
        // Update states
        const newBalance = stateRef.current.balance + profit;
        setBalance(newBalance);
        stateRef.current.balance = newBalance;

        const tradeObj = {
          time: new Date(details.epoch * 1000).toLocaleTimeString(),
          epoch: details.epoch,
          symbol: details.symbol,
          contractType: details.contractType,
          stake: details.stake,
          galeLevel: details.galeLevel,
          profit: profit,
          result: resultLabel,
          strategyName: currentSettings.autoPilot ? 'Piloto Automático' : currentSettings.selectedStrategy
        };

        setTrades(prev => [...prev, tradeObj]);

        // Save to persistent database
        const updatedDb = saveDbTrade({
          ...tradeObj,
          timestamp: details.epoch ? details.epoch * 1000 : Date.now()
        });
        setDbTrades(updatedDb);
        addLog({
          message: `[${resultLabel}] Operação concluída. Lucro/Retorno: $${profit.toFixed(2)} | Novo Saldo: $${newBalance.toFixed(2)}`,
          type: isWin ? 'success' : 'error',
          time: new Date().toLocaleTimeString()
        });

        // Reset active contract blockers
        stateRef.current.activeContractId = null;
        stateRef.current.lastContractDetails = null;

        const mode = currentSettings.moneyManagement || (currentSettings.martingaleEnabled ? 'martingale' : 'fixed');

        // Reset/Update for all Money Management modes
        if (mode === 'fixed' || mode === 'iron_hands') {
          stateRef.current.galeLevel = 0;
          stateRef.current.waitingForGaleNextCandle = false;
        } 
        else if (mode === 'soros') {
          if (isWin) {
            const nextLevel = stateRef.current.galeLevel + 1;
            const maxLevels = parseInt(currentSettings.martingaleMaxLevels || '2');
            
            if (nextLevel < maxLevels) {
              stateRef.current.galeLevel = nextLevel;
              const compoundingRatio = Math.min(1.0, parseFloat(currentSettings.martingaleMultiplier || '1.0') >= 10 ? parseFloat(currentSettings.martingaleMultiplier) / 100 : parseFloat(currentSettings.martingaleMultiplier));
              const prevSorosStake = stateRef.current.currentSorosStake || details.stake;
              const nextSorosStake = prevSorosStake + (profit * compoundingRatio);
              
              stateRef.current.currentSorosStake = parseFloat(nextSorosStake.toFixed(2));
              addLog({ 
                message: `[Soros] Vitória! Avançando para Estágio ${nextLevel + 1}/${maxLevels}. Próxima entrada: $${stateRef.current.currentSorosStake}`, 
                type: 'success', 
                time: new Date().toLocaleTimeString() 
              });
            } else {
              stateRef.current.galeLevel = 0;
              stateRef.current.currentSorosStake = 0;
              addLog({ 
                message: `[Soros] Ciclo de Soros Concluído com Sucesso! Resetando para a entrada inicial.`, 
                type: 'success', 
                time: new Date().toLocaleTimeString() 
              });
            }
          } else {
            stateRef.current.galeLevel = 0;
            stateRef.current.currentSorosStake = 0;
            stateRef.current.waitingForGaleNextCandle = false;
            addLog({ 
              message: `[Soros] Loss detectado. Ciclo interrompido. Resetando para a entrada inicial.`, 
              type: 'error', 
              time: new Date().toLocaleTimeString() 
            });
          }
        } 
        else if (mode === 'reverse_gale') {
          if (isWin) {
            const nextLevel = stateRef.current.galeLevel + 1;
            if (nextLevel <= parseInt(currentSettings.martingaleMaxLevels)) {
              stateRef.current.galeLevel = nextLevel;
              addLog({ 
                message: `[Gale Invertido] Vitória! Subindo nível de compounding para ${nextLevel}.`, 
                type: 'success', 
                time: new Date().toLocaleTimeString() 
              });
            } else {
              stateRef.current.galeLevel = 0;
              addLog({ 
                message: `[Gale Invertido] Limite de compounding atingido. Resetando para a entrada inicial.`, 
                type: 'success', 
                time: new Date().toLocaleTimeString() 
              });
            }
          } else {
            stateRef.current.galeLevel = 0;
            stateRef.current.waitingForGaleNextCandle = false;
            addLog({ 
              message: `[Gale Invertido] Loss detectado. Resetando para a entrada inicial.`, 
              type: 'error', 
              time: new Date().toLocaleTimeString() 
            });
          }
        } 
        else {
          if (isWin) {
            stateRef.current.galeLevel = 0;
            stateRef.current.waitingForGaleNextCandle = false;
          } else {
            const nextLevel = stateRef.current.galeLevel + 1;
            if (nextLevel <= parseInt(currentSettings.martingaleMaxLevels)) {
              stateRef.current.galeLevel = nextLevel;
              addLog({ 
                message: `Loss detectado. Preparando ${mode === 'progressive_gale' ? 'Gale Progressivo' : 'Martingale'} Nível ${nextLevel}...`, 
                type: 'warning', 
                time: new Date().toLocaleTimeString() 
              });

              if (currentSettings.martingaleMode === 'next_candle') {
                const granularity = parseInt(currentSettings.granularity || '60');
                const secondsElapsed = Math.floor(Date.now() / 1000) % granularity;
                const threshold = Math.max(15, Math.floor(granularity * 0.25));

                if (secondsElapsed <= threshold) {
                  const nextStake = calculateCurrentStake(true);
                  addLog({
                    message: `Executando Nível ${nextLevel} imediatamente na nova vela aberta (${secondsElapsed}s decorridos).`,
                    type: 'warning',
                    time: new Date().toLocaleTimeString()
                  });
                  executeTrade(nextStake, stateRef.current.lastGaleDirection);
                  stateRef.current.waitingForGaleNextCandle = false;
                } else {
                  stateRef.current.waitingForGaleNextCandle = true;
                  addLog({
                    message: `Próxima vela já avançada (${secondsElapsed}s decorridos). Agendado para o início do próximo ciclo.`,
                    type: 'info',
                    time: new Date().toLocaleTimeString()
                  });
                }
              } else {
                stateRef.current.waitingForGaleNextCandle = false;
              }
            } else {
              stateRef.current.galeLevel = 0;
              stateRef.current.waitingForGaleNextCandle = false;
              addLog({ 
                message: `Limite máximo de recuperação atingido. Resetando ciclo de banca.`, 
                type: 'error', 
                time: new Date().toLocaleTimeString() 
              });
            }
          }
        }
      }
    };
  }, []);

  // Connect / Disconnect handlers
  const handleConnect = async () => {
    if (!token) {
      alert('Por favor, informe o token de acesso da Deriv.');
      return;
    }

    // Check if token contains only masking characters (dots, asterisks)
    if (/^[.*•\s]+$/.test(token)) {
      setAuthError('Token inválido. Apague os pontos/máscara do campo e cole o seu token real da Deriv.');
      return;
    }

    setAuthError('');
    localStorage.setItem('deriv_token', token);
    localStorage.setItem('deriv_app_id', appId);

    try {
      await derivAPI.connect(token, appId, isDemo);
    } catch (err) {
      setAuthError(err.message || String(err));
    }
  };

  const handleDisconnect = () => {
    derivAPI.disconnect();
    setAuthorized(false);
    setAccountInfo(null);
    setIsRunning(false);
    stateRef.current.isRunning = false;
    setCandles([]);
    setShowLanding(true);
  };

  // Start / Stop Bot handlers
  const startBot = () => {
    setIsRunning(true);
    stateRef.current.isRunning = true;
    stateRef.current.galeLevel = 0;
    stateRef.current.waitingForGaleNextCandle = false;
    
    // Set initial balance snapshot for stop loss / take profit calculations
    setInitialBalance(balance);
    stateRef.current.initialBalance = balance;

    addLog({ message: 'Bot INICIADO. Monitorando mercado para triggers...', type: 'success', time: new Date().toLocaleTimeString() });
  };

  const stopBot = () => {
    setIsRunning(false);
    stateRef.current.isRunning = false;
    stateRef.current.galeLevel = 0;
    stateRef.current.waitingForGaleNextCandle = false;

    // Check if there was an active cycle running
    if (stateRef.current.activeCycleId) {
      const cycleId = stateRef.current.activeCycleId;
      setCycles(prev => {
        const updated = prev.map(c => c.id === cycleId ? { ...c, status: 'Interrompido' } : c);
        const cycle = prev.find(c => c.id === cycleId);
        if (cycle) {
          addSchedulerLog(`Ciclo "${cycle.name}" interrompido pelo usuário.`, 'warning');
        }
        return updated;
      });
      setActiveCycleId(null);
      stateRef.current.activeCycleId = null;
    }

    addLog({ message: 'Bot PARADO pelo usuário.', type: 'warning', time: new Date().toLocaleTimeString() });
  };

  // Change symbol or granularity
  const handleSettingsChange = (newSettings) => {
    const symbolChanged = newSettings.symbol !== settings.symbol;
    const granChanged = newSettings.granularity !== settings.granularity;

    setSettings(newSettings);

    if (connected && (symbolChanged || granChanged)) {
      setCandles([]);
      derivAPI.changeSymbol(newSettings.symbol, parseInt(newSettings.granularity));
    }
  };

  // Scheduler Automation helper functions
  const triggerCycle = (cycle) => {
    addSchedulerLog(`Iniciando Ciclo Automático: "${cycle.name}"`, 'success');
    addLog({
      message: `[Agendador] Iniciando Ciclo "${cycle.name}" (Entrada: $${cycle.stakeValue} | Meta: $${cycle.takeProfit} | Stop: $${cycle.stopLoss})`,
      type: 'success',
      time: new Date().toLocaleTimeString()
    });

    // 1. Update settings
    const isAutopilot = cycle.selectedStrategy === 'autopilot';
    const cycleSettings = {
      ...stateRef.current.settings,
      symbol: cycle.symbol,
      takeProfit: cycle.takeProfit,
      stopLoss: cycle.stopLoss,
      stakeValue: cycle.stakeValue,
      selectedStrategy: isAutopilot ? stateRef.current.settings.selectedStrategy : cycle.selectedStrategy,
      autoPilot: isAutopilot
    };

    setSettings(cycleSettings);
    stateRef.current.settings = cycleSettings;

    // 2. Change symbol in API if connected and different
    if (connected && cycle.symbol !== stateRef.current.settings.symbol) {
      setCandles([]);
      derivAPI.changeSymbol(cycle.symbol, parseInt(stateRef.current.settings.granularity || '60'));
    }

    // 3. Mark cycle as running
    setCycles(prev => prev.map(c => c.id === cycle.id ? { ...c, status: 'Executando', lastRun: new Date().toLocaleDateString() } : c));
    setActiveCycleId(cycle.id);
    stateRef.current.activeCycleId = cycle.id;

    // 4. Start the bot
    setTimeout(() => {
      setIsRunning(true);
      stateRef.current.isRunning = true;
      stateRef.current.galeLevel = 0;
      stateRef.current.waitingForGaleNextCandle = false;
      
      // Set initial balance snapshot for stop loss / take profit calculations
      setInitialBalance(stateRef.current.balance);
      stateRef.current.initialBalance = stateRef.current.balance;

      addLog({ message: `Ciclo ${cycle.name} ativo. Configurações de risco carregadas.`, type: 'success', time: new Date().toLocaleTimeString() });
    }, 100);
  };

  const handleTriggerCycleManually = (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId);
    if (cycle) {
      addSchedulerLog(`Acionamento manual do ciclo: "${cycle.name}"`, 'warning');
      triggerCycle(cycle);
    }
  };

  // Scheduler Tick Effect
  useEffect(() => {
    if (!schedulerState) return;

    const interval = setInterval(() => {
      // Don't start any cycle if one is already running
      if (stateRef.current.activeCycleId) return;

      const now = new Date();
      const currentHHMM = now.toTimeString().slice(0, 5); // "HH:MM"
      const currentSeconds = now.getSeconds();

      // Only evaluate in the first 10 seconds of a minute to avoid duplicate triggers
      if (currentSeconds > 10) return;

      // Find if any cycle is scheduled for this minute
      const pendingCycle = cycles.find(cycle => {
        return cycle.active && 
               cycle.status === 'Aguardando' && 
               cycle.startTime === currentHHMM;
      });

      if (pendingCycle) {
        triggerCycle(pendingCycle);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [schedulerState, cycles, connected]);

  // Clear log helper
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Get active recommendation (excluding master_candle which is only secondary)
  const baseFilteredForRec = strategiesStats.filter(s => s.id !== 'master_candle');
  const filteredStatsForRec = settings.autoPilot && settings.disableSlowStrategies
    ? baseFilteredForRec.filter(s => s.id !== 'pullback' && s.id !== 'reversal')
    : baseFilteredForRec;
  const sortedStats = [...filteredStatsForRec].sort((a, b) => b.winRate - a.winRate);
  const bestStrategy = sortedStats.length > 0 && sortedStats[0].winRate > 0 ? sortedStats[0] : null;

  if (isOverlayMode) {
    return <Overlay />;
  }

  if (showWelcome) {
    return (
      /* Welcome Screen transition */
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        padding: '2rem'
      }}>
        <div className="login-container-animate" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '3rem 4.5rem',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-neon)',
          maxWidth: '500px',
          width: '100%'
        }}>
          {/* Glowing Avatar/Check */}
          <div style={{
            background: 'var(--success-glow)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid var(--success)',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
            marginBottom: '0.5rem'
          }}>
            <ShieldCheck size={40} style={{ color: 'var(--success)' }} />
          </div>

          <div className="welcome-text-animate" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.35rem', color: '#ffffff' }}>
              Bem-vindo ao ASTROBOT
            </h2>
            <span style={{ fontSize: '1.2rem', color: 'var(--primary-light)', fontWeight: '700' }}>
              {welcomeName}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: '1.5' }}>
            Autenticação realizada com sucesso. Carregando dados da sua conta e sincronizando gráficos...
          </p>

          {/* Glowing line loader */}
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '0.5rem'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
              width: '100%',
              borderRadius: '2px'
            }} className="pulse-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-main)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Decorative background gradients */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Navigation Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 3rem',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10, 13, 22, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Cpu size={28} className="pulse-primary" style={{ color: 'var(--primary-light)' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px', background: 'linear-gradient(to right, #ffffff, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ASTROBOT
            </span>
            <span style={{ fontSize: '0.65rem', background: 'var(--primary-glow)', border: '1px solid var(--primary-light)', padding: '2px 6px', borderRadius: '20px', fontWeight: 'bold', color: 'var(--primary-light)' }}>
              v2.5
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '2.5rem' }}>
            <button 
              onClick={() => setLandingTab('home')}
              style={{
                background: 'transparent',
                border: 'none',
                color: landingTab === 'home' ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                outline: 'none'
              }}
            >
              Início
            </button>
            <button 
              onClick={() => setLandingTab('strategies')}
              style={{
                background: 'transparent',
                border: 'none',
                color: landingTab === 'strategies' ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                outline: 'none'
              }}
            >
              Estratégias
            </button>
            <button 
              onClick={() => setLandingTab('pricing')}
              style={{
                background: 'transparent',
                border: 'none',
                color: landingTab === 'pricing' ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                outline: 'none'
              }}
            >
              Valores & Planos
            </button>
            <a 
              href="https://t.me/lucassmachado9" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
            >
              Suporte ADM
            </a>
            {isAdminLoggedIn && (
              <button 
                onClick={() => setLandingTab('admin')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: landingTab === 'admin' ? 'var(--primary-light)' : 'var(--text-secondary)',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Lock size={14} /> Área Admin
              </button>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="primary" 
              onClick={() => setShowLanding(false)}
              style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                borderRadius: '10px'
              }}
            >
              CONECTAR AO ROBÔ
            </button>

            {isAdminLoggedIn ? (
              <button 
                onClick={() => {
                  localStorage.removeItem('astrobot_admin_token');
                  setIsAdminLoggedIn(false);
                  setLandingTab('home');
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--danger)',
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LogOut size={14} /> Sair Admin
              </button>
            ) : (
              <button 
                onClick={() => setShowAdminLoginModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
                title="Área do Administrador"
              >
                <Lock size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
          
          {/* HOME TAB */}
          {landingTab === 'home' && (
            <div style={{ maxWidth: '900px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }} className="welcome-text-animate">
                <div style={{
                  background: 'rgba(139, 92, 246, 0.06)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '20px',
                  padding: '4px 14px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: 'var(--primary-light)',
                  letterSpacing: '1px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                  AGORA INTEGRADO COM VERCEL SERVERLESS
                </div>
                <h1 style={{ fontSize: '3.8rem', fontWeight: '900', lineHeight: '1.1', margin: 0, background: 'linear-gradient(to right, #ffffff 40%, var(--primary-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                  A Revolução na Automação de Opções Binárias
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0.5rem 0 0 0', lineHeight: '1.6' }}>
                  Opere de forma autônoma na Deriv com o ASTROBOT. Análises probabilísticas em tempo real, piloto automático inteligente, agendamento de horários e gestão de banca completa.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="primary" 
                  onClick={() => setShowLanding(false)}
                  style={{
                    padding: '0.9rem 2.25rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-neon)'
                  }}
                >
                  ACESSAR PAINEL DO ROBÔ
                </button>
                <button 
                  className="secondary" 
                  onClick={() => setLandingTab('pricing')}
                  style={{
                    padding: '0.9rem 2.25rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    borderRadius: '12px'
                  }}
                >
                  VER PLANOS & VALORES
                </button>
              </div>

              {/* Features Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.25rem',
                width: '100%',
                marginTop: '1rem'
              }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    📅 Ciclos de Horários Independentes
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    Agende múltiplos ciclos de operação automática (ex: Ciclo Manhã às 09:00 e Ciclo Noite às 21:00) com metas de lucro, stops e stakes 100% autônomos.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🤖 Piloto Automático Inteligente
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    O robô calcula dinamicamente a taxa de assertividade histórica de mais de 15 estratégias probabilísticas e seleciona o melhor setup para entrar.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🛡️ Gestão e Recuperação de Risco
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    Configurações flexíveis de Martingale (Tradicional ou Inteligente) e Soros. Travas de segurança integradas para respeitar seu Stop Loss.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    ⚡ Painel de Estatísticas Avançadas
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    Acompanhamento visual completo dos seus resultados com gráficos, histórico de contratos Deriv detalhado, winrate e contador de vitórias consecutivas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STRATEGIES TAB */}
          {landingTab === 'strategies' && (
            <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Catálogo de Estratégias</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  O ASTROBOT vem equipado de fábrica com mais de 15 algoritmos matemáticos e probabilísticos testados.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>PROBABILÍSTICA (5 MIN)</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>MHI Minoria</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Analisa as 3 últimas velas de um quadrante de 5 minutos e realiza a entrada a favor da cor minoritária no início do próximo quadrante.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>PROBABILÍSTICA (5 MIN)</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>MHI Maioria</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Seguindo o mesmo quadrante MHI, realiza a entrada a favor da cor majoritária das últimas 3 velas, ideal para mercados em forte tendência.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>REVERSÃO E CONTROLE</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>Torres Gêmeas</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Compara a cor da 1ª vela e da 5ª vela do quadrante de 5 minutos, prevendo a reversão da tendência de fechamento no ciclo probabilístico.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>CONTINUAÇÃO DE FLUXO</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>Três Mosqueteiros</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Busca o alinhamento de 3 velas consecutivas da mesma cor. A entrada é efetuada na 4ª vela apostando na continuidade do movimento.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>ANÁLISE ESTATÍSTICA</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>Padrão 23</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Estratégia baseada na probabilidade do fechamento da 2ª e 3ª vela do quadrante. Ideal para mercados em canais laterais (consolidação).
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>RATING E MATEMÁTICA</span>
                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>Recomendador IA</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    Nosso módulo de recomendação vasculha todas as estratégias probabilisticamente e chaveia para o melhor setup de forma autônoma.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="primary" onClick={() => setShowLanding(false)} style={{ padding: '0.8rem 2rem', borderRadius: '10px' }}>
                  VER TODAS AS ESTRATÉGIAS EM OPERAÇÃO
                </button>
              </div>
            </div>
          )}

          {/* PRICING TAB */}
          {landingTab === 'pricing' && (
            <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Planos & Assinaturas</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Escolha o plano ideal para a sua banca. Licenças flexíveis com acesso ilimitado a todos os recursos.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {/* Monthly */}
                <div className="glass-panel" style={{ padding: '2rem 1.5rem', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LICENÇA MENSAL</span>
                  <div style={{ margin: '0.5rem 0' }}>
                    <strong style={{ fontSize: '2rem', color: 'white' }}>R$ 97</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/mês</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Acesso total por 30 dias</span>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, flexGrow: 1 }}>
                    <li>Painel completo do ASTROBOT</li>
                    <li>Todas as estratégias inclusas</li>
                    <li>Agendador de Horários (Ciclos)</li>
                    <li>Suporte prioritário via Telegram</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="secondary" style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', textDecoration: 'none', display: 'block', borderRadius: '10px' }}>
                    ASSINAR COM ADM
                  </a>
                </div>

                {/* Quarterly */}
                <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--primary-light)', position: 'relative', transform: 'scale(1.03)', background: 'rgba(139, 92, 246, 0.03)' }}>
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '3px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                    RECOMENDADO
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>LICENÇA TRIMESTRAL</span>
                  <div style={{ margin: '0.5rem 0' }}>
                    <strong style={{ fontSize: '2rem', color: 'white' }}>R$ 247</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/90 dias</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Economia de 15% em relação ao mensal</span>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, flexGrow: 1 }}>
                    <li><strong>Tudo do plano mensal</strong></li>
                    <li>Recomendador inteligente ativo</li>
                    <li>Atualizações garantidas</li>
                    <li>Suporte prioritário do ADM</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="primary" style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', textDecoration: 'none', display: 'block', borderRadius: '10px' }}>
                    ASSINAR COM ADM
                  </a>
                </div>

                {/* Annual */}
                <div className="glass-panel" style={{ padding: '2rem 1.5rem', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LICENÇA ANUAL</span>
                  <div style={{ margin: '0.5rem 0' }}>
                    <strong style={{ fontSize: '2rem', color: 'white' }}>R$ 697</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ano</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Melhor custo-benefício (Economia 40%)</span>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, flexGrow: 1 }}>
                    <li><strong>Acesso total por 365 dias</strong></li>
                    <li>Suporte individual VIP do ADM</li>
                    <li>Mapeamento de estratégias exclusivas</li>
                    <li>Acesso antecipado a novas versões</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="secondary" style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', textDecoration: 'none', display: 'block', borderRadius: '10px' }}>
                    ASSINAR COM ADM
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Após efetuar o pagamento com o administrador Lucas Machado, você receberá a sua chave CDKEY para ativação imediata.</span>
              </div>
            </div>
          )}

          {/* ADMIN TAB */}
          {landingTab === 'admin' && isAdminLoggedIn && (
            <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="login-container-animate">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, white, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Painel do Administrador
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Gerencie licenças, crie novas chaves e controle acessos.
                  </p>
                </div>
                <button 
                  onClick={loadAdminKeys}
                  disabled={loadingAdminKeys}
                  style={{
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'white'
                  }}
                >
                  <RefreshCw size={14} className={loadingAdminKeys ? 'spin' : ''} />
                  Atualizar Lista
                </button>
              </div>

              {/* Generate Key Row */}
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 0 25px rgba(139, 92, 246, 0.05)' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'white', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} style={{ color: 'var(--primary-light)' }} /> Gerador de Novas Licenças (CDKEY)
                </h3>
                
                <form onSubmit={handleGenerateKeysAdmin} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                      VALIDADE EM DIAS
                    </label>
                    <select 
                      value={generateDays} 
                      onChange={(e) => setGenerateDays(e.target.value)}
                      style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%', height: '42px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', outline: 'none' }}
                    >
                      <option value="30">30 dias (Mensal)</option>
                      <option value="90">90 dias (Trimestral)</option>
                      <option value="365">365 dias (Anual)</option>
                      <option value="7">7 dias (Teste)</option>
                      <option value="1">1 dia (Demo VIP)</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                      QUANTIDADE DE CHAVES
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="50" 
                      value={generateCount} 
                      onChange={(e) => setGenerateCount(e.target.value)}
                      style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%', height: '42px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', outline: 'none' }}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="primary" 
                    disabled={generatingKeys}
                    style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 'bold', height: '42px', borderRadius: '10px' }}
                  >
                    {generatingKeys ? 'GERANDO...' : 'GERAR CHAVES'}
                  </button>
                </form>
              </div>

              {/* Keys List */}
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'white', margin: 0 }}>
                  Licenças Cadastradas ({adminKeysList.length})
                </h3>

                {keysError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    ⚠️ {keysError}
                  </div>
                )}

                {loadingAdminKeys ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Carregando chaves...
                  </div>
                ) : adminKeysList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhuma chave de ativação encontrada no Firebase.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>CDKEY</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>DURAÇÃO</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>CRIADO EM</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>ATIVADO EM</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>EXPIRA EM</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminKeysList.map((k) => {
                          let statusBadgeColor = 'rgba(245, 158, 11, 0.1)';
                          let statusBorderColor = 'rgba(245, 158, 11, 0.3)';
                          let statusTextColor = 'var(--warning)';
                          let statusText = 'Pendente';

                          if (k.status === 'active') {
                            statusBadgeColor = 'rgba(16, 185, 129, 0.1)';
                            statusBorderColor = 'rgba(16, 185, 129, 0.3)';
                            statusTextColor = 'var(--success)';
                            statusText = 'Ativa';
                          } else if (k.status === 'expired') {
                            statusBadgeColor = 'rgba(239, 68, 68, 0.1)';
                            statusBorderColor = 'rgba(239, 68, 68, 0.3)';
                            statusTextColor = 'var(--danger)';
                            statusText = 'Expirada';
                          }

                          return (
                            <tr key={k.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: 'var(--text-secondary)' }}>
                              <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'white', fontWeight: 'bold' }}>
                                <span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>{k.key}</span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{k.durationDays} dias</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold', background: statusBadgeColor, border: `1px solid ${statusBorderColor}`, color: statusTextColor }}>
                                  {statusText}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {k.activatedAt ? new Date(k.activatedAt).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <button 
                                  onClick={() => handleDeleteKeyAdmin(k.key)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: 'var(--danger)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 3rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          background: 'rgba(5, 7, 12, 0.4)'
        }}>
          <div>
            &copy; 2026 ASTROBOT. Todos os direitos reservados.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Aviso de Risco: Opções binárias envolvem alto risco financeiro. Nunca invista capital que não possa perder.</span>
          </div>
        </footer>

        {/* Admin Login Modal */}
        {showAdminLoginModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 7, 12, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '400px',
              width: '100%',
              padding: '2.5rem 2rem',
              borderRadius: '20px',
              border: '1px solid var(--border-active)',
              boxShadow: 'var(--shadow-neon)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              position: 'relative'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} style={{ color: 'var(--primary-light)' }} /> Admin Login
                </h3>
                <button 
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setAdminLoginError('');
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold', outline: 'none', padding: 0 }}
                >
                  &times;
                </button>
              </div>

              {adminLoginError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.78rem', textAlign: 'center', fontWeight: 'bold' }}>
                  ⚠️ {adminLoginError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    E-MAIL DO ADMINISTRADOR
                  </label>
                  <input 
                    type="email" 
                    placeholder="admin@exemplo.com"
                    value={adminEmail} 
                    onChange={(e) => setAdminEmail(e.target.value)}
                    style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', outline: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    SENHA DO ADMINISTRADOR
                  </label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', outline: 'none' }}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="primary" 
                  disabled={adminLoggingIn}
                  style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '10px', marginTop: '0.5rem', width: '100%' }}
                >
                  {adminLoggingIn ? 'AUTENTICANDO...' : 'ENTRAR COMO ADMIN'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!authorized) {
    return (
      /* Full Screen Authentication Screen */
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--bg-main)'
      }}>
        {/* Left Column: Cover Image */}
        <div style={{
          flex: 1.25,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '4rem 3.5rem',
          overflow: 'hidden'
        }}>
          <img
            src={moonImg}
            alt="Moon Background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 1
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.35) 0%, rgba(11, 15, 25, 0.95) 100%)',
            zIndex: 2
          }} />

          {/* Decorative elements over the cover */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }} className="login-container-animate">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid var(--border-active)', padding: '5px 14px', borderRadius: '20px', width: 'fit-content' }}>
              <Cpu size={14} style={{ color: 'var(--primary-light)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-light)', letterSpacing: '1.5px' }}>V2.5 INTELIGENTE</span>
            </div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.1', color: '#ffffff', textShadow: '0 2px 15px rgba(0,0,0,0.6)' }}>
              ASTROBOT
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.5)', lineHeight: '1.5' }}>
              Negociações Automatizadas de Opções Binárias no mercado Deriv com análises probabilísticas e algoritmos MHI avançados.
            </p>
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <div style={{
          flex: 0.75,
          background: '#0a0d16',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 3.5rem',
          gap: '1.5rem',
          borderLeft: '1px solid var(--border-color)',
          overflowY: 'auto'
        }} className="login-container-animate">
          <button
            onClick={() => setShowLanding(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              outline: 'none'
            }}
          >
            ← Voltar para Página Inicial
          </button>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.35rem', color: '#ffffff' }}>Autenticação Deriv</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Conecte-se com seu API Token ou PAT com total segurança.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>TOKEN DE ACESSO (API TOKEN / PAT)</label>
              <input
                type="password"
                placeholder="Ex: a1B2c3D4... ou pat_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ textAlign: 'center', padding: '0.8rem', fontSize: '1rem', letterSpacing: token ? '3px' : 'normal' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>APP ID</label>
                <input
                  type="text"
                  placeholder="1098"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  style={{ padding: '0.8rem', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>CONTA</label>
                <select value={isDemo ? 'demo' : 'real'} onChange={(e) => setIsDemo(e.target.value === 'demo')} style={{ padding: '0.8rem', fontSize: '1rem', height: '47px' }}>
                  <option value="demo">Demo</option>
                  <option value="real">Real</option>
                </select>
              </div>
            </div>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              textAlign: 'center',
              fontWeight: 'bold',
              lineHeight: '1.4'
            }}>
              ⚠️ {authError}
            </div>
          )}

          <button className="primary" onClick={handleConnect} style={{ padding: '0.9rem', fontWeight: 'bold', fontSize: '1rem', marginTop: '0.5rem' }}>
            CONECTAR AO MERCADO
          </button>

          {logs.length > 0 && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.6rem 0.8rem',
              maxHeight: '90px',
              overflowY: 'auto',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              color: 'var(--text-muted)'
            }}>
              {logs.slice(-3).map((log, idx) => (
                <div key={idx} style={{
                  color: log.type === 'error' ? 'var(--danger)' : 
                         log.type === 'success' ? 'var(--success)' : 
                         log.type === 'warning' ? 'var(--warning)' : 'var(--text-muted)'
                }}>
                  [{log.time}] {log.message}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            Conexão nativa via aplicativo desktop. Seus dados de acesso ficam salvos localmente de forma segura.
          </div>
        </div>
      </div>
    );
  }

  if (!isKeyValid) {
    const expiredDate = keyExpiresAt ? new Date(keyExpiresAt).toLocaleDateString() : null;

    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        padding: '2rem',
        overflow: 'auto'
      }}>
        <div className="login-container-animate" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '3rem',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-neon)',
          maxWidth: '520px',
          width: '100%',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.08)', 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              display: 'inline-flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              border: '2px solid var(--primary-light)',
              marginBottom: '1rem'
            }}>
              <Lock size={28} style={{ color: 'var(--primary-light)' }} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              Ativação de Licença
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Sua conta está conectada à Deriv, mas você precisa de uma chave de acesso (CDKEY) ativa para operar o ASTROBOT.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleActivateKey} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                INSIRA SUA CHAVE (CDKEY)
              </label>
              <input
                type="text"
                placeholder="ASTRO-XXXX-XXXX-XXXX"
                value={cdKeyInput}
                onChange={(e) => setCdKeyInput(e.target.value.toUpperCase())}
                style={{ 
                  textAlign: 'center', 
                  padding: '0.8rem', 
                  fontSize: '1rem', 
                  fontFamily: 'var(--font-mono)', 
                  letterSpacing: '1px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
                required
              />
            </div>

            {activationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--danger)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                ⚠️ {activationError}
              </div>
            )}

            {activationSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--success)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                ✓ {activationSuccess}
              </div>
            )}

            {expiredDate && !activationError && !activationSuccess && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--warning)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                Sua licença anterior expirou em {expiredDate}.
              </div>
            )}

            <button 
              type="submit" 
              className="primary" 
              disabled={activating}
              style={{ padding: '0.9rem', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {activating ? 'VALIDANDO CHAVE...' : 'ATIVAR CHAVE AGORA'}
            </button>
          </form>

          {/* Pricing & Support Links */}
          <div style={{ 
            width: '100%', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '1.25rem', 
            marginTop: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => setShowPricingModal(true)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--primary-light)', 
                fontSize: '0.82rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Info size={14} /> Consultar Planos e Apresentação do Bot
            </button>

            <a 
              href="https://t.me/lucassmachado9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 'bold',
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                width: '100%',
                textAlign: 'center'
              }}
            >
              Adquirir Licença com o ADM no Telegram <ExternalLink size={13} />
            </a>

            <button
              onClick={() => {
                derivAPI.disconnect();
                setAuthorized(false);
                setAccountInfo(null);
                setWelcomeName('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
                textDecoration: 'underline'
              }}
            >
              Voltar para Login / Desconectar
            </button>
          </div>
        </div>

        {/* Pricing Modal */}
        {showPricingModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              border: '1px solid var(--border-active)',
              boxShadow: 'var(--shadow-neon)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              borderRadius: '20px'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', background: 'linear-gradient(to right, white, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                  Apresentação & Planos ASTROBOT
                </h3>
                <button 
                  onClick={() => setShowPricingModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  &times;
                </button>
              </div>

              {/* Presentational Features */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-light)', fontWeight: 'bold', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>RECURSOS EXCLUSIVOS DO ASTROBOT</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>🤖 Piloto Automático Inteligente</strong>
                    O robô calcula em tempo real a winrate histórica de mais de 15 estratégias e chaveia instantaneamente para a mais rentável do momento.
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>📅 Agendador de Horários Autônomos</strong>
                    Programe ciclos (ex: Manhã e Noite) com stakes, metas e stop loss independentes. O bot abre, opera e encerra as operações sozinho.
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>📊 Análises Probabilísticas MHI</strong>
                    Algoritmos baseados em MHI Minoria/Maioria, Torres Gêmeas, Três Mosqueteiros, Padrão 23 e muitos outros para máxima precisão.
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>🛡️ Gestão de Banca Avançada</strong>
                    Controle inteligente de Martingale e Soros configuráveis para proteger o saldo contra sequências de perdas.
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-light)', fontWeight: 'bold', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>NOSSOS PLANOS DE LICENÇA</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  
                  {/* Monthly */}
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LICENÇA MENSAL</span>
                    <strong style={{ fontSize: '1.25rem', color: 'white' }}>R$ 97,00</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Validade de 30 dias</span>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
                      <li>Acesso total ao robô</li>
                      <li>Atualizações gratuitas</li>
                      <li>Suporte por email/Telegram</li>
                    </ul>
                  </div>

                  {/* Quarterly */}
                  <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: '0.55rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>POPULAR</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>LICENÇA TRIMESTRAL</span>
                    <strong style={{ fontSize: '1.25rem', color: 'white' }}>R$ 247,00</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Validade de 90 dias (Economia 15%)</span>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
                      <li>Acesso total ao robô</li>
                      <li>Atualizações gratuitas</li>
                      <li>Suporte prioritário</li>
                      <li>Recomendador Inteligente</li>
                    </ul>
                  </div>

                  {/* Annual */}
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LICENÇA ANUAL</span>
                    <strong style={{ fontSize: '1.25rem', color: 'white' }}>R$ 697,00</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Validade de 365 dias (Melhor Valor)</span>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
                      <li>Acesso total por 1 ano</li>
                      <li>Atualizações gratuitas</li>
                      <li>Suporte VIP Individual</li>
                      <li>Acesso a novos módulos</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Buy action */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Para assinar, renovar ou tirar dúvidas, entre em contato direto:</span>
                <a 
                  href="https://t.me/lucassmachado9" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.6rem 2rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'white',
                    textDecoration: 'none'
                  }}
                >
                  Falar com Lucas Machado no Telegram <ExternalLink size={14} />
                </a>
              </div>

              {/* Close Button */}
              <button 
                className="secondary" 
                onClick={() => setShowPricingModal(false)}
                style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem', alignSelf: 'center', width: '120px' }}
              >
                FECHAR
              </button>

            </div>
          </div>
        )}

        {/* Success Modal */}
        {showActivationSuccessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 7, 12, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '420px',
              width: '100%',
              padding: '3rem 2rem',
              borderRadius: '24px',
              textAlign: 'center',
              border: '1px solid var(--success)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              position: 'relative'
            }}>
              {/* Confetti / Success Circle */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '2px solid var(--success)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
              }}>
                <ShieldCheck size={40} style={{ color: 'var(--success)' }} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', margin: '0 0 0.5rem 0' }}>
                  Ativado com Sucesso!
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Sua chave CDKEY foi validada e vinculada à sua conta Deriv.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.25rem',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chave Utilizada:</span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{cdKey}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expiração:</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{keyExpiresAt ? new Date(keyExpiresAt).toLocaleDateString() : '-'}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '600' }}>Tempo de Acesso:</span>
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: 'var(--success)', 
                    fontSize: '0.72rem', 
                    fontWeight: 'bold', 
                    padding: '4px 10px', 
                    borderRadius: '20px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    {activationRemainingDays} dias restantes
                  </span>
                </div>
              </div>

              <button 
                className="primary" 
                onClick={() => {
                  setShowActivationSuccessModal(false);
                  setIsKeyValid(true);
                }}
                style={{ padding: '0.9rem', fontSize: '0.92rem', fontWeight: 'bold', width: '100%', borderRadius: '12px', marginTop: '0.5rem' }}
              >
                ACESSAR PAINEL DO ROBÔ
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* Header bar */}
      <header style={{
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Title logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-active)' }}>
            <Cpu size={24} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: '0', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, var(--text-primary), var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ASTROBOT v2.5
            </h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>AUTOMATED BINARY OPTIONS BOT</span>
          </div>
        </div>

        {/* Live connections status badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {keyExpiresAt && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              background: 'rgba(139, 92, 246, 0.05)',
              fontSize: '0.75rem',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
              backdropFilter: 'blur(4px)'
            }}>
              <KeyRound size={14} style={{ color: 'var(--primary-light)' }} />
              <span>Licença: {Math.max(0, Math.ceil((keyExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} dias restantes</span>
            </div>
          )}
          {connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Account Profile info */}
              {accountInfo && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 'bold', display: 'block' }}>
                    {accountInfo.fullname}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {accountInfo.email}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="pulse-dot-green"></span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success)' }}>CONECTADO</span>
              </div>

              {/* Latency Ping */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                <Radio size={12} />
                <span>{latency}ms</span>
              </div>

              {/* Overlay Toggle Button */}
              <button 
                onClick={() => {
                  const isElectron = window && window.process && window.process.type === 'renderer';
                  if (isElectron) {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send(overlayActive ? 'close-overlay' : 'open-overlay');
                  } else {
                    alert('O Overlay requer execução nativa via Electron.');
                  }
                }} 
                style={{ 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: '20px', 
                  background: overlayActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                  border: overlayActive ? '1px solid var(--primary-light)' : '1px solid rgba(255, 255, 255, 0.1)', 
                  color: overlayActive ? 'var(--primary-light)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }} 
                title="Abrir Widget Flutuante"
              >
                <Layers size={12} />
                <span>{overlayActive ? 'Fechar Widget' : 'Widget Overlay'}</span>
              </button>

              {/* Log out */}
              <button onClick={handleDisconnect} style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--text-muted)' }} title="Desconectar">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--danger)', borderRadius: '50%' }}></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--danger)' }}>DESCONECTADO</span>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Screen */}
      <main className="dashboard-grid" style={{
          flex: 1,
          gridTemplateColumns: sidebarCollapsed ? '70px 1fr' : '280px 1fr',
          transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Sidebar Settings */}
          <section>
            <Settings
              settings={settings}
              onChange={handleSettingsChange}
              onStart={startBot}
              onStop={stopBot}
              isRunning={isRunning}
              connected={connected}
              authorized={authorized}
              bestStrategy={bestStrategy}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </section>

          {/* Main workspace */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top account stats row */}
            <Stats
              balance={balance}
              initialBalance={initialBalance}
              trades={trades}
              stopLoss={settings.stopLoss}
              takeProfit={settings.takeProfit}
            />

            {/* AI Recommendations Panel */}
            <IntelligenceRecommender
              bestStrategy={bestStrategy}
              currentSymbol={settings.symbol}
              sessionAssetStats={sessionAssetStats}
              dbTrades={dbTrades}
            />

            {/* AI Interactive Suggestion Banner */}
            {aiSuggestion && aiSuggestion.active && (
              <div className="glass-panel" style={{
                padding: '0.85rem 1.25rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                animation: 'slideIn 0.3s ease',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={16} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    Recomendação IA: A estratégia <strong>{aiSuggestion.strategyName}</strong> está com assertividade superior (<strong>{aiSuggestion.winRate.toFixed(1)}%</strong> vs {aiSuggestion.currentWinRate.toFixed(1)}%).
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setSettings(prev => ({ ...prev, selectedStrategy: aiSuggestion.strategyId }));
                      setAiSuggestion(prev => ({ ...prev, active: false }));
                      addLog({
                        message: `Estratégia alterada manualmente para ${aiSuggestion.strategyName} após sugestão do robô.`,
                        type: 'info',
                        time: new Date().toLocaleTimeString()
                      });
                    }}
                    style={{
                      background: 'linear-gradient(to right, var(--primary), var(--accent))',
                      color: 'white',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Mudar Agora
                  </button>
                  <button
                    onClick={() => setAiSuggestion(prev => ({ ...prev, active: false }))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            )}

            {/* Glowing Active Trade Countdown Banner */}
            {activeTradeCountdown && activeTradeCountdown.remaining > 0 && (
              <div className="glass-panel" style={{
                padding: '0.85rem 1.25rem',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: activeTradeCountdown.contractType === 'CALL' ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}>
                      {activeTradeCountdown.contractType === 'CALL' ? '▲ COMPRA (CALL)' : '▼ VENDA (PUT)'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>no ativo</span>
                    <strong>{activeTradeCountdown.symbol}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>| Entrada:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>${activeTradeCountdown.stake.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>Expiração em:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--primary-light)' }}>
                      {activeTradeCountdown.remaining}s
                    </strong>
                  </div>
                </div>
                {/* Progress bar container */}
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, (activeTradeCountdown.remaining / activeTradeCountdown.totalDuration) * 100))}%`,
                    height: '100%',
                    background: 'linear-gradient(to right, var(--primary), var(--accent))',
                    borderRadius: '3px',
                    transition: 'width 1s linear'
                  }}></div>
                </div>
              </div>
            )}

            {/* Visual Workspace: Grid containing Chart + Strategies */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem', height: '360px' }}>
              <Chart
                candles={candles}
                trades={trades}
                activeTrade={stateRef.current.lastContractDetails}
                granularity={settings.granularity}
              />

              <StrategyList
                strategies={strategiesStats.length > 0 ? strategiesStats : [
                  { id: 'ma_crossover', name: 'Cruzamento de Médias (9/21)', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Média Móvel Rápida EMA 9 sobre EMA 21.' },
                  { id: 'mhi_minority', name: 'MHI Padrão (Minoria)', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa últimas 3 velas do ciclo M5, opera minoria.' },
                  { id: 'mhi_majority', name: 'MHI Maioria', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa últimas 3 velas do ciclo M5, opera maioria.' },
                  { id: 'twin_towers', name: 'Torres Gêmeas', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Compara cor de velas pos 1 e 5 em ciclo de 5.' },
                  { id: 'three_musketeers', name: 'Três Mosqueteiros', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Detecta 3 velas iguais, entra reversão na 4ª.' },
                  { id: 'padrao_23', name: 'Padrão 23', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa a 1ª vela do ciclo de 5 minutos. Entra na 2ª vela prevendo a mesma cor.' },
                  { id: 'padrao_3x1', name: 'Padrão 3x1', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa as 3 primeiras velas do ciclo de 5 minutos. Entra na 5ª vela na cor da minoria.' },
                  { id: 'padrao_impar', name: 'Padrão Ímpar', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa a 3ª vela do ciclo de 5 minutos. Entra na 1ª vela do próximo ciclo na mesma cor.' },
                  { id: 'r7', name: 'Padrão R7', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa a 9ª vela do ciclo de 10 minutos anterior. Entra na 7ª vela do ciclo atual na mesma cor.' },
                  { id: 'pullback', name: 'Pullback na Média (EMA 20)', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Entrada de tendência em toques na Média Móvel EMA 20.' },
                  { id: 'reversal', name: 'Reversão (Hammer / Shooting)', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Entrada contra a tendência ao identificar velas de exaustão Hammer/Shooting Star.' },
                  { id: 'pivot_123', name: 'Pivô de 1-2-3', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Entrada no rompimento do Pivô de Alta (ponto 2) ou Pivô de Baixa.' },
                  { id: 'ross_hook', name: '123 de Ross', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Entrada no rompimento do Ross Hook após a formação e rompimento de um pivô 1-2-3.' },
                  { id: 'r10', name: 'Padrão R10', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Analisa as primeiras 3 velas do ciclo de 10 min e entra contra a maioria na 10ª vela.' },
                  { id: 'marubozu', name: 'Marubozu', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Vela sem pavios e corpo gigante. Entrada a favor do forte fluxo de tendência.' },
                  { id: 'bos_choch', name: 'BOS + ChoCH', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'SMC: Quebra de Estrutura (BOS) após Mudança de Caractere (ChoCH) identificada.' },
                  { id: 'master_candle', name: 'Vela Mestra (Master Candle)', winRate: 0, totalTrades: 0, wins: 0, losses: 0, description: 'Vela com grande amplitude que contém as 4 velas seguintes. Rompimento de extremidades.' }
                ]}
                selectedStrategyId={settings.selectedStrategy}
                onSelectStrategy={(id) => setSettings(prev => ({ ...prev, selectedStrategy: id }))}
                liveSignals={liveSignals}
                autoPilot={settings.autoPilot}
              />
            </div>

            {/* Tab selector for Logs vs Background Scanner vs Scheduler */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '0.25rem' }}>
              <button 
                onClick={() => setBottomTab('logs')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: bottomTab === 'logs' ? '2px solid var(--primary-light)' : '2px solid transparent',
                  color: bottomTab === 'logs' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Painel de Operações e Logs
              </button>
              <button 
                onClick={() => setBottomTab('scanner')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: bottomTab === 'scanner' ? '2px solid var(--primary-light)' : '2px solid transparent',
                  color: bottomTab === 'scanner' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Scanner de Ativos (Background)
              </button>
              <button 
                onClick={() => setBottomTab('automation')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: bottomTab === 'automation' ? '2px solid var(--primary-light)' : '2px solid transparent',
                  color: bottomTab === 'automation' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Agendador & Ciclos (Automação)
              </button>
            </div>

            {/* Content area: Logs, Scanner or Scheduler */}
            <section style={{ height: '380px', minHeight: '380px' }}>
              {bottomTab === 'logs' && (
                <Logs
                  trades={trades}
                  logs={logs}
                  onClearLogs={handleClearLogs}
                  dbTrades={dbTrades}
                  onClearDb={() => {
                    clearDbTrades();
                    setDbTrades([]);
                  }}
                />
              )}
              {bottomTab === 'scanner' && (
                <Scanner
                  settings={settings}
                  onChange={handleSettingsChange}
                  connected={connected}
                  isRunning={isRunning}
                />
              )}
              {bottomTab === 'automation' && (
                <Scheduler
                  schedulerState={schedulerState}
                  onToggleScheduler={setSchedulerState}
                  cycles={cycles}
                  onSaveCycles={setCycles}
                  activeCycleId={activeCycleId}
                  onTriggerCycleManually={handleTriggerCycleManually}
                  schedulerLogs={schedulerLogs}
                  onClearSchedulerLogs={handleClearSchedulerLogs}
                />
              )}
            </section>
          </section>
        </main>
    </div>
  );
}
