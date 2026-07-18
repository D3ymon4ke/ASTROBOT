import React, { useState, useEffect, useRef } from 'react';
import { derivAPI } from './deriv/DerivAPI';
import { analyzeStrategies, getLiveSignal, evaluateTrade, calculateEMA } from './strategies/tradingStrategies';
import Chart from './components/Chart';
import Settings from './components/Settings';
import StrategyList from './components/StrategyList';
import Stats from './components/Stats';
import Logs from './components/Logs';
import IntelligenceRecommender from './components/IntelligenceRecommender';
import Overlay from './components/Overlay';
import Scanner from './components/Scanner';
import Scheduler from './components/Scheduler';
import NewsEditor from './components/NewsEditor';
import NewsFeed, { getUnreadCount } from './components/NewsFeed';
import Reports from './components/Reports';
import NeuralLoader from './components/NeuralLoader';
import StrategiesCatalog from './components/StrategiesCatalog';
import Planning from './components/Planning';
import Strands from './components/Strands';
import TelegramConfig from './components/TelegramConfig';
import { ShieldCheck, ShieldAlert, Cpu, Radio, LogOut, RefreshCw, KeyRound, Layers, Info, ExternalLink, Lock, Calendar, Brain, Shield, Activity, Sparkles, Clock, Coins, ChevronRight, TrendingUp, Zap, CheckCircle, Menu, X, Percent, TrendingDown, Target, Newspaper, Bell, User, Camera, Upload, Send } from 'lucide-react';
import { loadDbTrades, saveDbTrade, clearDbTrades } from './utils/db';
import { playWinSound, playLossSound } from './utils/sound';
import {
  sendTelegramMessage,
  formatWinMessage,
  formatLossMessage,
  formatOpportunityFound,
  formatOrderExecuted,
  formatTakeProfitMessage,
  formatStopLossMessage,
  formatStatusReport,
  formatDailySummary
} from './utils/telegram';
import moonImg from './assets/moon.avif';
import logoImg from './assets/newlogo.png';

const presetAvatars = [
  // Preset 1: Purple Cyborg
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238B5CF6"/><stop offset="100%" stop-color="%23EC4899"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g1)"/><circle cx="50" cy="37" r="18" fill="%23ffffff" opacity="0.9"/><path d="M22,78 C22,60 34,52 50,52 C66,52 78,60 78,78" fill="%23ffffff" opacity="0.9"/><rect x="42" y="32" width="16" height="4" rx="2" fill="%231E1B4B"/><circle cx="45" cy="38" r="2" fill="%2306B6D4"/><circle cx="55" cy="38" r="2" fill="%2306B6D4"/></svg>`,

  // Preset 2: Cyber Blue AI
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306B6D4"/><stop offset="100%" stop-color="%233B82F6"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g2)"/><path d="M50,15 L75,30 L75,60 L50,85 L25,60 L25,30 Z" fill="none" stroke="%23ffffff" stroke-width="4" opacity="0.8"/><circle cx="50" cy="45" r="10" fill="%23ffffff" opacity="0.9"/><circle cx="50" cy="45" r="4" fill="%233B82F6"/><line x1="50" y1="15" x2="50" y2="35" stroke="%23ffffff" stroke-width="2" opacity="0.8"/><line x1="50" y1="55" x2="50" y2="85" stroke="%23ffffff" stroke-width="2" opacity="0.8"/></svg>`,

  // Preset 3: Gold Sentinel
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g3)"/><path d="M50,22 L72,32 L72,56 C72,70 62,80 50,84 C38,80 28,70 28,56 L28,32 Z" fill="%23ffffff" opacity="0.9"/><path d="M50,30 L64,37 L64,54 C64,64 58,72 50,75 C42,72 36,64 36,54 L36,37 Z" fill="url(%23g3)"/><polygon points="50,40 53,47 60,47 55,52 57,59 50,55 43,59 45,52 40,47 47,47" fill="%23ffffff"/></svg>`,

  // Preset 4: Emerald Agent
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g4)"/><circle cx="50" cy="35" r="14" fill="%23ffffff" opacity="0.9"/><path d="M26,74 C26,58 38,50 50,50 C62,50 74,58 74,74" fill="%23ffffff" opacity="0.9"/><circle cx="50" cy="35" r="7" fill="url(%23g4)"/><circle cx="50" cy="35" r="2" fill="%23ffffff"/></svg>`
];

export default function App() {
  const isOverlayMode = window.location.search.includes('overlay=true');

  // Connection states
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('astrobot_remember_me') !== 'false';
  });

  const [token, setToken] = useState(() => {
    const savedRemember = localStorage.getItem('astrobot_remember_me') !== 'false';
    return savedRemember ? (localStorage.getItem('deriv_token') || '') : '';
  });
  const [appId, setAppId] = useState(() => {
    const savedRemember = localStorage.getItem('astrobot_remember_me') !== 'false';
    return savedRemember ? (localStorage.getItem('deriv_app_id') || '1098') : '1098';
  });
  const [isDemo, setIsDemo] = useState(() => {
    const savedRemember = localStorage.getItem('astrobot_remember_me') !== 'false';
    if (savedRemember) {
      return localStorage.getItem('deriv_is_demo') !== 'false';
    }
    return true;
  });
  
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
  const DEFAULT_SETTINGS = {
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
    enableMasterCandleSecondary: false,
    soundEnabled: true
  };

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('astrobot_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_SETTINGS;
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
  const [profileImage, setProfileImage] = useState(localStorage.getItem('astrobot_profile_image') || '');
  const [isProfileConfigured, setIsProfileConfigured] = useState(localStorage.getItem('astrobot_profile_configured') === 'true');
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileImage, setTempProfileImage] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  useEffect(() => {
    if (showWelcome) {
      setTempProfileName(welcomeName || localStorage.getItem('astrobot_custom_name') || '');
      setTempProfileImage(profileImage || localStorage.getItem('astrobot_profile_image') || presetAvatars[0]);
    }
  }, [showWelcome, welcomeName, profileImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    if (!tempProfileName.trim()) return;

    localStorage.setItem('astrobot_custom_name', tempProfileName);
    localStorage.setItem('astrobot_profile_image', tempProfileImage);
    localStorage.setItem('astrobot_profile_configured', 'true');

    setWelcomeName(tempProfileName);
    setProfileImage(tempProfileImage);
    setIsProfileConfigured(true);

    // Sync to DB
    syncSettingsToDb({
      profile: {
        fullname: tempProfileName,
        profileImage: tempProfileImage
      }
    });

    setIsProfileSaving(true);
    setTimeout(() => {
      setIsProfileSaving(false);
      setAuthorized(true);
      setShowWelcome(false);
    }, 1500);
  };
  const [showLanding, setShowLanding] = useState(true);
  const [landingTab, setLandingTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [bottomTab, setBottomTab] = useState('logs');
  const [activePage, setActivePage] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // News / Patch Notes state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsFetched, setPostsFetched] = useState(false);

  // Simulated Live Demo Dashboard states for Landing Page
  const [demoProfit, setDemoProfit] = useState(142.50);
  const [demoWins, setDemoWins] = useState(24);
  const [demoLosses, setDemoLosses] = useState(3);
  const [demoChartData, setDemoChartData] = useState([100, 110, 95, 120, 135, 130, 145, 140, 155]);
  const [demoTrades, setDemoTrades] = useState([
    { id: 1, time: '16:41:20', symbol: 'R_100', type: 'CALL', stake: 2.00, payout: 3.92, status: 'win' },
    { id: 2, time: '16:42:05', symbol: 'R_50', type: 'PUT', stake: 2.00, payout: 3.92, status: 'win' },
    { id: 3, time: '16:43:00', symbol: 'R_100', type: 'CALL', stake: 2.00, payout: 0, status: 'loss' },
    { id: 4, time: '16:44:12', symbol: 'R_10', type: 'CALL', stake: 4.40, payout: 8.62, status: 'win' }
  ]);

  useEffect(() => {
    if (!showLanding || landingTab !== 'home') return;
    const interval = setInterval(() => {
      const isWin = Math.random() > 0.3;
      const profitValue = isWin ? 1.92 : -2.00;
      
      setDemoProfit(prev => Math.max(0, parseFloat((prev + profitValue).toFixed(2))));
      if (isWin) {
        setDemoWins(w => w + 1);
      } else {
        setDemoLosses(l => l + 1);
      }
      
      setDemoChartData(prev => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push(Math.max(40, last + (isWin ? 15 : -15)));
        return next;
      });

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const symbols = ['R_100', 'R_75', 'R_50', 'R_10', 'R_25'];
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const randomType = Math.random() > 0.5 ? 'CALL' : 'PUT';

      const newTrade = {
        id: Date.now(),
        time: timeStr,
        symbol: randomSymbol,
        type: randomType,
        stake: isWin ? 2.00 : 4.40,
        payout: isWin ? 3.92 : 0,
        status: isWin ? 'win' : 'loss'
      };

      setDemoTrades(prev => [newTrade, ...prev.slice(0, 3)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [showLanding, landingTab]);

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

  // User Authentication States
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('astrobot_user_email') || '';
  });
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [userEmailInput, setUserEmailInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [userRegisterKeyInput, setUserRegisterKeyInput] = useState('');

  // Administrative Panel States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('astrobot_admin_token') === 'lucas_astro_admin';
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('licenses'); // 'licenses' | 'news'

  const [adminKeysList, setAdminKeysList] = useState([]);
  const [loadingAdminKeys, setLoadingAdminKeys] = useState(false);
  const [keysError, setKeysError] = useState('');

  const [generateDays, setGenerateDays] = useState('30');
  const [generateCount, setGenerateCount] = useState('1');
  const [generatingKeys, setGeneratingKeys] = useState(false);

  const [showActivationSuccessModal, setShowActivationSuccessModal] = useState(false);
  const [activationRemainingDays, setActivationRemainingDays] = useState(0);

  // Synchronize settings / profile helper
  const syncSettingsToDb = async (updatedFields = {}) => {
    const email = localStorage.getItem('astrobot_user_email') || userEmail;
    if (!email) return;

    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const apiUrl = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/save-settings'
        : '/api/save-settings';

      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...updatedFields
        })
      });
    } catch (err) {
      console.error("Erro ao sincronizar configurações no banco:", err);
    }
  };

  // Auth logout handler
  const handleLogout = () => {
    localStorage.removeItem('astrobot_user_email');
    localStorage.removeItem('astrobot_cdkey');
    localStorage.removeItem('astrobot_expires_at');
    localStorage.removeItem('astrobot_admin_token');
    
    // Disconnect and clear states
    derivAPI.disconnect();
    setUserEmail('');
    setCdKey('');
    setKeyExpiresAt(null);
    setIsKeyValid(false);
    setAuthorized(false);
    setIsAdminLoggedIn(false);
    setAccountInfo(null);
    setWelcomeName('');
  };

  // Auth login handler
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!userEmailInput.trim() || !userPasswordInput.trim()) return;

    setActivating(true);
    setActivationError('');
    setActivationSuccess('');

    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const apiUrl = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/login'
        : '/api/login';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmailInput.trim().toLowerCase(),
          password: userPasswordInput.trim()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const user = result.user;
        
        // Save auth details
        localStorage.setItem('astrobot_user_email', user.email);
        localStorage.setItem('astrobot_cdkey', user.cdkey);
        localStorage.setItem('astrobot_expires_at', user.expiresAt.toString());

        setUserEmail(user.email);
        setCdKey(user.cdkey);
        setKeyExpiresAt(user.expiresAt);
        setIsKeyValid(user.licenseStatus === 'active');

        if (user.email === 'deymonmachado@gmail.com') {
          setIsAdminLoggedIn(true);
          localStorage.setItem('astrobot_admin_token', 'lucas_astro_admin');
        }

        // Apply loaded settings if present
        if (user.settings && Object.keys(user.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...user.settings }));
          localStorage.setItem('astrobot_settings', JSON.stringify(user.settings));
          
          if (user.settings.token) {
            localStorage.setItem('deriv_token', user.settings.token);
          }
          if (user.settings.appId) {
            localStorage.setItem('deriv_app_id', user.settings.appId);
          }
          if (user.settings.isDemo !== undefined) {
            localStorage.setItem('deriv_is_demo', user.settings.isDemo.toString());
            setIsDemo(user.settings.isDemo);
          }
        }

        if (user.telegramConfig && Object.keys(user.telegramConfig).length > 0) {
          localStorage.setItem('astrobot_telegram_config', JSON.stringify(user.telegramConfig));
        }

        if (user.cycles && user.cycles.length > 0) {
          setCycles(user.cycles);
          localStorage.setItem('astrobot_scheduler_cycles', JSON.stringify(user.cycles));
        }

        if (user.profile) {
          if (user.profile.fullname) {
            setWelcomeName(user.profile.fullname);
            localStorage.setItem('astrobot_custom_name', user.profile.fullname);
          }
          if (user.profile.profileImage) {
            setProfileImage(user.profile.profileImage);
            localStorage.setItem('astrobot_profile_image', user.profile.profileImage);
          }
          if (user.profile.fullname || user.profile.profileImage) {
            setIsProfileConfigured(true);
            localStorage.setItem('astrobot_profile_configured', 'true');
          }
        }

        addLog({
          message: `[Sistema] Bem-vindo! Login realizado com sucesso.`,
          type: 'success',
          time: new Date().toLocaleTimeString()
        });

        // Trigger automatic connection to Deriv if token is present
        const savedToken = user.settings?.token || localStorage.getItem('deriv_token');
        const savedAppId = user.settings?.appId || localStorage.getItem('deriv_app_id') || '1098';
        const savedIsDemo = user.settings?.isDemo !== undefined ? user.settings.isDemo : (localStorage.getItem('deriv_is_demo') !== 'false');

        if (savedToken && user.licenseStatus === 'active') {
          setTimeout(() => {
            derivAPI.connect(savedToken, savedAppId, savedIsDemo);
          }, 1000);
        }

      } else {
        setActivationError(result.message || 'E-mail ou senha incorretos.');
      }
    } catch (err) {
      console.error(err);
      setActivationError('Erro ao se conectar ao servidor de autenticação.');
    } finally {
      setActivating(false);
    }
  };

  // Auth register handler
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!userEmailInput.trim() || !userPasswordInput.trim() || !userRegisterKeyInput.trim()) return;

    setActivating(true);
    setActivationError('');
    setActivationSuccess('');

    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');

      const apiUrl = isLocalOrElectron 
        ? 'https://astrobot-seven.vercel.app/api/register'
        : '/api/register';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmailInput.trim().toLowerCase(),
          password: userPasswordInput.trim(),
          cdkey: userRegisterKeyInput.trim().toUpperCase()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setActivationSuccess('Cadastro realizado com sucesso! Redirecionando...');
        
        setTimeout(() => {
          setAuthMode('login');
          setActivationSuccess('');
          setActivationError('');
        }, 2000);
      } else {
        setActivationError(result.message || 'Erro ao realizar cadastro.');
      }
    } catch (err) {
      console.error(err);
      setActivationError('Erro ao se conectar ao servidor de cadastro.');
    } finally {
      setActivating(false);
    }
  };

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      const savedEmail = localStorage.getItem('astrobot_user_email');
      if (!savedEmail) return;

      try {
        const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' || 
                                  window.location.protocol === 'file:' ||
                                  (window.process && window.process.type === 'renderer');

        const apiUrl = isLocalOrElectron 
          ? 'https://astrobot-seven.vercel.app/api/get-profile'
          : '/api/get-profile';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: savedEmail })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const user = result.user;
          
          localStorage.setItem('astrobot_cdkey', user.cdkey);
          localStorage.setItem('astrobot_expires_at', user.expiresAt.toString());

          setCdKey(user.cdkey);
          setKeyExpiresAt(user.expiresAt);
          setIsKeyValid(user.licenseStatus === 'active');

          if (user.email === 'deymonmachado@gmail.com') {
            setIsAdminLoggedIn(true);
            localStorage.setItem('astrobot_admin_token', 'lucas_astro_admin');
          }

          if (user.settings && Object.keys(user.settings).length > 0) {
            setSettings(prev => ({ ...prev, ...user.settings }));
            localStorage.setItem('astrobot_settings', JSON.stringify(user.settings));
            
            if (user.settings.token) {
              localStorage.setItem('deriv_token', user.settings.token);
            }
            if (user.settings.appId) {
              localStorage.setItem('deriv_app_id', user.settings.appId);
            }
            if (user.settings.isDemo !== undefined) {
              localStorage.setItem('deriv_is_demo', user.settings.isDemo.toString());
              setIsDemo(user.settings.isDemo);
            }
          }

          if (user.telegramConfig && Object.keys(user.telegramConfig).length > 0) {
            localStorage.setItem('astrobot_telegram_config', JSON.stringify(user.telegramConfig));
          }

          if (user.cycles && user.cycles.length > 0) {
            setCycles(user.cycles);
            localStorage.setItem('astrobot_scheduler_cycles', JSON.stringify(user.cycles));
          }

          if (user.profile) {
            if (user.profile.fullname) {
              setWelcomeName(user.profile.fullname);
              localStorage.setItem('astrobot_custom_name', user.profile.fullname);
            }
            if (user.profile.profileImage) {
              setProfileImage(user.profile.profileImage);
              localStorage.setItem('astrobot_profile_image', user.profile.profileImage);
            }
            if (user.profile.fullname || user.profile.profileImage) {
              setIsProfileConfigured(true);
              localStorage.setItem('astrobot_profile_configured', 'true');
            }
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error("Erro ao carregar perfil do banco:", err);
      }
    };

    loadUserProfile();
  }, []);

  // Poll for remote Telegram commands in Web mode
  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (isElectron || !userEmail) return;

    const pollInterval = setInterval(async () => {
      try {
        const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' || 
                                  window.location.protocol === 'file:' ||
                                  (window.process && window.process.type === 'renderer');

        const apiUrl = isLocalOrElectron 
          ? 'https://astrobot-seven.vercel.app/api/get-pending-command'
          : '/api/get-pending-command';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        const result = await response.json();
        if (response.ok && result.success && result.command) {
          addLog({
            message: `[Telegram] Comando remoto recebido: ${result.command.text}`,
            type: 'info',
            time: new Date().toLocaleTimeString()
          });
          executeTelegramCommand(result.command.text);
        }
      } catch (err) {
        // Silently ignore network errors during background polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [userEmail]);

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

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:' ||
        (window.process && window.process.type === 'renderer');
      const base = isLocalOrElectron ? 'https://astrobot-seven.vercel.app/api' : '/api';
      const res = await fetch(`${base}/posts`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(data.posts || []);
        localStorage.setItem('astrobot_cached_posts', JSON.stringify(data.posts || []));
      } else {
        throw new Error('API response failed');
      }
    } catch (err) {
      console.warn('Erro ao carregar posts online, carregando cache local:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_posts');
        if (cached) {
          setPosts(JSON.parse(cached));
        } else {
          const defaultPosts = [
            {
              id: 'initial_welcome',
              title: 'Bem-vindo ao ASTROBOT Premium Elite!',
              content: 'Estamos entusiasmados em apresentar a interface redesenhada do ASTROBOT. Um ambiente operacional de alta performance projetado para oferecer a máxima precisão estatística e controle absoluto dos seus investimentos.\n\n### O que há de novo na v2.5:\n1. **Design High-Performance**: Interface otimizada com glassmorphism avançado, contraste ultra-nítido e visualização limpa.\n2. **Motor Neural Calibrado**: Tempos de resposta de 12ms para processamento das ordens na Deriv.\n3. **Catálogo de Estratégias**: Agora você pode alternar manualmente entre mais de 15 algoritmos matemáticos ou deixar a inteligência artificial decidir no Piloto Automático.',
              tag: 'novidade',
              coverImage: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=800&q=80',
              pinned: true,
              createdAt: Date.now() - 3600000 * 24
            }
          ];
          setPosts(defaultPosts);
          localStorage.setItem('astrobot_cached_posts', JSON.stringify(defaultPosts));
        }
      } catch (cacheErr) {
        // ignore
      }
    } finally {
      setPostsLoading(false);
      setPostsFetched(true);
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
    if (landingTab === 'novidades' && !postsFetched) {
      fetchPosts();
    }
  }, [landingTab, isAdminLoggedIn]);

  // Fetch posts on mount to calculate badge count
  useEffect(() => {
    fetchPosts();
  }, []);

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
        enableMasterCandleSecondary: false,
        disableSlowStrategies: false,
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
        enableMasterCandleSecondary: false,
        disableSlowStrategies: false,
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
    activeCycleId: null,
    liveSignals: {},
    strategiesStats: [],
    cycles: [],
    trades: []
  });

  // Sync ref values
  useEffect(() => {
    stateRef.current.isRunning = isRunning;
    stateRef.current.settings = settings;
    stateRef.current.balance = balance;
    stateRef.current.initialBalance = initialBalance;
    stateRef.current.candles = candles;
    stateRef.current.activeCycleId = activeCycleId;
    stateRef.current.liveSignals = liveSignals;
    stateRef.current.strategiesStats = strategiesStats;
    stateRef.current.cycles = cycles;
    stateRef.current.trades = trades;
  }, [isRunning, settings, balance, initialBalance, candles, activeCycleId, liveSignals, strategiesStats, cycles, trades]);

  // Telegram notification helper – reads config fresh from localStorage each call
  const sendTelegramNotif = async (type, htmlText) => {
    try {
      const raw = localStorage.getItem('astrobot_telegram_config');
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (!cfg.enabled || !cfg.token || !cfg.chatId) return;
      if (cfg.notifications && cfg.notifications[type] === false) return;
      await sendTelegramMessage(cfg.token, cfg.chatId, htmlText, true);
    } catch (e) {
      // silent
    }
  };

  // Shared handler for Telegram remote commands (used by both Electron IPC and Browser Polling)
  const executeTelegramCommand = (text) => {
    const cmd = (text || '').trim().toLowerCase();
    const cfg = (() => { try { return JSON.parse(localStorage.getItem('astrobot_telegram_config') || '{}'); } catch { return {}; } })();
    const tok = cfg.token;
    const cid = cfg.chatId;

    const reply = (html) => { if (tok && cid) sendTelegramMessage(tok, cid, html, true); };

    if (cmd === '/startbot' || cmd === '▶ iniciar bot') {
      if (!stateRef.current.isRunning) startBot();
      reply('🟢 <b>Comando recebido!</b>\nBot iniciando operações...');
    } else if (cmd === '/stopbot' || cmd === '⛔ parar') {
      stopBot();
      reply('🛑 <b>Comando recebido!</b>\nBot parado.');
    } else if (cmd === '/pause' || cmd === '⏸ pausar') {
      stopBot();
      reply('⏸ <b>Bot pausado</b> via Telegram.');
    } else if (cmd === '/resume') {
      if (!stateRef.current.isRunning) startBot();
      reply('▶️ <b>Bot retomado</b> via Telegram.');
    } else if (cmd === '/saldo' || cmd === '💰 saldo') {
      reply(`💰 <b>Saldo Atual</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Saldo:</b> <code>$${stateRef.current.balance?.toFixed(2) || '0.00'}</code>`);
    } else if (cmd === '/lucro' || cmd === '📈 relatório') {
      const profit = (stateRef.current.balance || 0) - (stateRef.current.initialBalance || 0);
      const sign = profit >= 0 ? '+' : '';
      reply(`📈 <b>Resultado da Sessão</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Lucro/Prejuízo:</b> <code>${sign}$${profit.toFixed(2)}</code>\n<b>Saldo:</b> <code>$${stateRef.current.balance?.toFixed(2)}</code>`);
    } else if (cmd === '/status') {
      const s = stateRef.current;
      const profit = (s.balance || 0) - (s.initialBalance || 0);
      const sign = profit >= 0 ? '+' : '';
      reply(`${s.isRunning ? '🟢' : '🔴'} <b>STATUS</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Estado:</b> <code>${s.isRunning ? 'OPERANDO' : 'PAUSADO'}</code>\n<b>Saldo:</b> <code>$${s.balance?.toFixed(2) || '0.00'}</code>\n<b>Lucro Sessão:</b> <code>${sign}$${profit.toFixed(2)}</code>`);
    } else if (cmd === '/scanner' || cmd === '📊 scanner') {
      const s = stateRef.current;
      const activeSigList = Object.entries(s.liveSignals || {}).map(([id, sig]) => {
        const name = (s.strategiesStats || []).find(st => st.id === id)?.name || id;
        const emoji = sig.direction === 'CALL' ? '🟩' : '🟥';
        return `• <b>${name}</b>: ${emoji} <code>${sig.direction}</code>`;
      });
      const sigText = activeSigList.length > 0
        ? activeSigList.join('\n')
        : '<i>Nenhum sinal ativo no momento.</i>';
      reply(`📊 <b>SCANNER DE SINAIS</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Ativo:</b> <code>${s.settings.symbol}</code>\n\n<b>Sinais Ativos:</b>\n${sigText}`);
    } else if (cmd === '/ciclos' || cmd === '📅 ciclos') {
      const s = stateRef.current;
      const cycleListText = (s.cycles || []).map(c => {
        const statusEmoji = c.active ? '⏰' : '⏸';
        return `• <b>${c.name}</b> (${c.startTime}): ${statusEmoji} <code>${c.status}</code>`;
      }).join('\n');
      reply(`📅 <b>CICLOS DO AGENDADOR</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${cycleListText || '<i>Nenhum ciclo cadastrado.</i>'}`);
    } else if (cmd === '/estrategias') {
      const s = stateRef.current;
      const sortedStrats = [...(s.strategiesStats || [])].sort((a, b) => b.winRate - a.winRate);
      const stratText = sortedStrats.slice(0, 8).map(st => {
        return `• <b>${st.name}</b>: <code>${st.winRate.toFixed(1)}%</code> (${st.wins}W - ${st.losses}L)`;
      }).join('\n');
      reply(`🧠 <b>ASSERTIVIDADE DE ESTRATÉGIAS</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Ativo:</b> <code>${s.settings.symbol}</code>\n\n<b>Melhores Desempenhos:</b>\n${stratText || '<i>Sem dados de estatísticas ainda.</i>'}`);
    } else if (cmd === '/relatorio') {
      const s = stateRef.current;
      const profit = (s.balance || 0) - (s.initialBalance || 0);
      const sign = profit >= 0 ? '+' : '';
      const tList = s.trades || [];
      const totalTrades = tList.length;
      const wins = tList.filter(t => t.profit > 0).length;
      const losses = tList.filter(t => t.profit < 0).length;
      const winrate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      reply(`📈 <b>RELATÓRIO OPERACIONAL</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<b>Ativo Atual:</b> <code>${s.settings.symbol}</code>\n` +
            `<b>Saldo Inicial:</b> <code>$${s.initialBalance?.toFixed(2)}</code>\n` +
            `<b>Saldo Atual:</b> <code>$${s.balance?.toFixed(2)}</code>\n` +
            `<b>Resultado Sessão:</b> <code>${sign}$${profit.toFixed(2)}</code>\n` +
            `<b>Operações:</b> <code>${totalTrades}</code> (${wins}W - ${losses}L)\n` +
            `<b>Winrate:</b> <code>${winrate.toFixed(1)}%</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 <i>ASTROBOT Relatório em tempo real.</i>`);
    } else if (cmd === '/config' || cmd === '⚙ configurações') {
      const s = stateRef.current;
      const settingsText = `⚙️ <b>CONFIGURAÇÕES DO BOT</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Ativo:</b> <code>${s.settings.symbol}</code>\n` +
        `<b>Timeframe:</b> <code>M${s.settings.granularity === '60' ? '1' : s.settings.granularity === '300' ? '5' : '15'}</code>\n` +
        `<b>Gerenciamento:</b> <code>${s.settings.moneyManagement?.toUpperCase() || 'N/A'}</code>\n` +
        `<b>Stake:</b> <code>$${s.settings.stakeValue}</code>\n` +
        `<b>Piloto Automático:</b> <code>${s.settings.autoPilot ? 'ATIVADO' : 'DESATIVADO'}</code>\n` +
        `<b>Martingale:</b> <code>${s.settings.martingaleEnabled ? `Sim (Max ${s.settings.martingaleMaxLevels} níveis)` : 'Não'}</code>\n` +
        `<b>Take Profit:</b> <code>$${s.settings.takeProfit}</code>\n` +
        `<b>Stop Loss:</b> <code>$${s.settings.stopLoss}</code>`;
      reply(settingsText);
    } else if (cmd === '/help') {
      reply(`🤖 <b>ASTROBOT – Comandos</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `/startbot – Iniciar bot\n` +
            `/stopbot – Parar bot\n` +
            `/pause – Pausar\n` +
            `/resume – Retomar\n` +
            `/status – Status geral\n` +
            `/saldo – Ver saldo\n` +
            `/lucro – Lucro da sessão\n` +
            `/scanner – Sinais ativos\n` +
            `/ciclos – Ciclos do agendador\n` +
            `/estrategias – Assertividade das estratégias\n` +
            `/relatorio – Relatório detalhado\n` +
            `/config – Configurações atuais\n` +
            `/help – Esta mensagem`);
    }
  };

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

    // Telegram remote commands from Electron polling
    const handleTelegramCommand = (event, text) => {
      executeTelegramCommand(text);
    };

    ipcRenderer.on('bot-command', handleBotCommand);
    ipcRenderer.on('overlay-status', handleOverlayStatus);
    ipcRenderer.on('telegram-command', handleTelegramCommand);

    return () => {
      ipcRenderer.removeListener('bot-command', handleBotCommand);
      ipcRenderer.removeListener('overlay-status', handleOverlayStatus);
      ipcRenderer.removeListener('telegram-command', handleTelegramCommand);
    };
  }, []);

  // Handle Telegram command polling in non-Electron (Browser / Vercel) environments
  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (isElectron) return; // Electron main process handles polling

    let active = true;
    let timeoutId = null;
    let offset = 0;
    let initialized = false;

    const poll = async () => {
      if (!active) return;

      const raw = localStorage.getItem('astrobot_telegram_config');
      if (!raw) {
        timeoutId = setTimeout(poll, 5000);
        return;
      }

      try {
        const cfg = JSON.parse(raw);
        if (!cfg.enabled || !cfg.token || !cfg.chatId) {
          timeoutId = setTimeout(poll, 5000);
          return;
        }

        let url = '';
        if (!initialized) {
          // Initialize offset with the latest update to avoid executing old commands
          url = `https://api.telegram.org/bot${cfg.token}/getUpdates?offset=-1&limit=1`;
        } else {
          url = `https://api.telegram.org/bot${cfg.token}/getUpdates?offset=${offset + 1}&timeout=5`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (active && data.ok && data.result) {
          if (!initialized) {
            if (data.result.length > 0) {
              offset = data.result[0].update_id;
            }
            initialized = true;
          } else {
            for (const update of data.result) {
              offset = update.update_id;
              if (update.message) {
                const msg = update.message;
                const chatIdStr = msg.chat.id.toString();
                const expectedChatId = cfg.chatId.toString();

                if (chatIdStr !== expectedChatId) {
                  // Reject unauthorized users
                  const rejectUrl = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
                  await fetch(rejectUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: msg.chat.id,
                      text: `❌ <b>ACESSO NEGADO</b>\nEste bot está vinculado a outra licença do ASTROBOT.`,
                      parse_mode: 'HTML'
                    })
                  });
                  continue;
                }

                // Process authorized command
                if (msg.text) {
                  executeTelegramCommand(msg.text);
                }
              }
            }
          }
        }
      } catch (err) {
        // Silent catch for network/CORS issues
      }

      if (active) {
        timeoutId = setTimeout(poll, 1000);
      }
    };

    poll();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
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
      
      const customName = localStorage.getItem('astrobot_custom_name');
      const customImage = localStorage.getItem('astrobot_profile_image');
      const isConfigured = localStorage.getItem('astrobot_profile_configured') === 'true';

      setWelcomeName(customName || info.fullname || info.email || 'Usuário');
      if (customImage) {
        setProfileImage(customImage);
      }
      setIsProfileConfigured(isConfigured);

      setShowWelcome(true);

      if (isConfigured) {
        setTimeout(() => {
          setAuthorized(true);
          setShowWelcome(false);
        }, 2200);
      }

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

      // Telegram notification
      sendTelegramNotif('take_profit', formatTakeProfitMessage(profit, trades.length, trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0));
      
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

      // Telegram notification
      sendTelegramNotif('stop_loss', formatStopLossMessage(profit, trades.length, trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0));
      
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

        if (stateRef.current.settings.soundEnabled !== false) {
          if (isWin) {
            playWinSound();
          } else {
            playLossSound();
          }
        }

        // Telegram WIN/LOSS notification
        const newBal = stateRef.current.balance + profit;
        if (isWin) {
          const sessionProfit = newBal - stateRef.current.initialBalance;
          const goalPct = currentSettings.takeProfit > 0 ? (sessionProfit / currentSettings.takeProfit) * 100 : 0;
          sendTelegramNotif('win', formatWinMessage(profit, newBal, goalPct));
        } else {
          const nextGale = stateRef.current.galeLevel + 1;
          const maxGale = parseInt(currentSettings.martingaleMaxLevels || '2');
          const hasGale = nextGale <= maxGale && (currentSettings.moneyManagement === 'martingale' || currentSettings.moneyManagement === 'progressive_gale');
          const nextStakeEst = hasGale ? parseFloat(currentSettings.stakeValue) * Math.pow(parseFloat(currentSettings.martingaleMultiplier || '2.2'), nextGale) : 0;
          sendTelegramNotif('loss', formatLossMessage(profit, newBal, hasGale ? nextGale : 0, nextStakeEst));
        }
        
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
    if (rememberMe) {
      localStorage.setItem('deriv_token', token);
      localStorage.setItem('deriv_app_id', appId);
      localStorage.setItem('deriv_is_demo', isDemo ? 'true' : 'false');
      localStorage.setItem('astrobot_remember_me', 'true');
    } else {
      localStorage.removeItem('deriv_token');
      localStorage.removeItem('deriv_app_id');
      localStorage.removeItem('deriv_is_demo');
      localStorage.setItem('astrobot_remember_me', 'false');
    }

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
  const startBot = (force = false) => {
    if (force !== true && !isRunning && !isInitializing) {
      setIsInitializing(true);
      return;
    }

    setIsRunning(true);
    stateRef.current.isRunning = true;
    stateRef.current.galeLevel = 0;
    stateRef.current.waitingForGaleNextCandle = false;
    
    // Set initial balance snapshot for stop loss / take profit calculations
    setInitialBalance(balance);
    stateRef.current.initialBalance = balance;

    addLog({ message: 'Motor Neural Ativado. Monitorando mercado para triggers...', type: 'success', time: new Date().toLocaleTimeString() });

    // Telegram notification
    sendTelegramNotif('bot_started',
      `🚀 <b>ASTROBOT INICIADO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Ativo:</b> <code>${stateRef.current.settings.symbol}</code>\n` +
      `<b>Estratégia:</b> <code>${stateRef.current.settings.autoPilot ? 'Piloto Automático' : stateRef.current.settings.selectedStrategy.replace('_',' ').toUpperCase()}</code>\n` +
      `<b>Horário:</b> <code>${new Date().toLocaleTimeString('pt-BR')}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 <i>Motor Neural ativado. Monitorando mercado...</i>`
    );
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

    // Telegram notification
    sendTelegramNotif('bot_stopped',
      `🛑 <b>ASTROBOT DESLIGADO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Saldo Final:</b> <code>$${stateRef.current.balance?.toFixed(2) || '0.00'}</code>\n` +
      `<b>Horário:</b> <code>${new Date().toLocaleTimeString('pt-BR')}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💤 <i>Bot encerrado. Use /startbot para retomar.</i>`
    );
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

  const handleSaveSettings = () => {
    localStorage.setItem('astrobot_settings', JSON.stringify(settings));
    
    const savedToken = localStorage.getItem('deriv_token') || '';
    const savedAppId = localStorage.getItem('deriv_app_id') || '1098';
    const savedIsDemo = localStorage.getItem('deriv_is_demo') !== 'false';

    syncSettingsToDb({
      settings: {
        ...settings,
        token: savedToken,
        appId: savedAppId,
        isDemo: savedIsDemo
      }
    });

    addLog({
      message: '[Configurações] Painel de Módulos Salvo com Sucesso e Sincronizado na Nuvem!',
      type: 'success',
      time: new Date().toLocaleTimeString()
    });
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
      autoPilot: isAutopilot,
      enableMasterCandleSecondary: cycle.enableMasterCandleSecondary !== undefined ? cycle.enableMasterCandleSecondary : false,
      disableSlowStrategies: cycle.disableSlowStrategies !== undefined ? cycle.disableSlowStrategies : false
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
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        backgroundImage: `
          radial-gradient(at 10% 20%, rgba(139, 92, 246, 0.15) 0px, transparent 40%),
          radial-gradient(at 90% 80%, rgba(217, 70, 239, 0.08) 0px, transparent 45%)
        `,
        padding: '2rem',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Particle glow in background */}
        <div style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <div className="login-container-animate" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.75rem',
          padding: isProfileConfigured ? '3.5rem 4rem' : '2.5rem 3rem',
          borderRadius: '24px',
          background: 'rgba(15, 11, 28, 0.85)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 50px rgba(139, 92, 246, 0.15)',
          maxWidth: isProfileConfigured ? '480px' : '540px',
          width: '100%',
          position: 'relative',
          zIndex: 10,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {isProfileSaving ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
              <div className="spin" style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '3px solid rgba(139, 92, 246, 0.1)',
                borderTopColor: 'var(--primary-light)',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
              }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'white', fontWeight: '800', margin: '0 0 0.25rem 0' }}>
                  Sincronizando Identidade
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Calibrando banca VIP e carregando chaves criptográficas...
                </p>
              </div>
            </div>
          ) : isProfileConfigured ? (
            /* Standard quick welcome screen (subsequent logins) */
            <>
              {/* Glowing Avatar */}
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '2px solid rgba(251, 191, 36, 0.8)',
                boxShadow: '0 0 25px rgba(251, 191, 36, 0.25)',
                marginBottom: '0.25rem',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)'
              }}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={36} style={{ color: 'var(--primary-light)' }} />
                )}
              </div>

              <div className="welcome-text-animate" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: '800', marginBottom: '0.35rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
                  Bem-vindo ao ASTROBOT
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.25rem', color: 'var(--primary-light)', fontWeight: '800' }}>
                    {welcomeName}
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                    color: '#1E1B4B',
                    fontSize: '0.62rem',
                    fontWeight: '900',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    VIP
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: '1.5', textAlign: 'center', margin: 0 }}>
                Autenticação realizada com sucesso. Carregando dados da sua conta e sincronizando gráficos...
              </p>

              {/* Glowing line loader */}
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.04)',
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
            </>
          ) : (
            /* First-time onboarding / Customizing form */
            <form onSubmit={handleSaveProfile} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'white', letterSpacing: '-0.5px' }}>
                  Personalize seu Perfil
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Defina como deseja ser identificado no terminal ASTROBOT.
                </p>
              </div>

              {/* Avatar Selector and Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    border: '2px solid var(--primary-light)',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {tempProfileImage ? (
                      <img src={tempProfileImage} alt="Preview Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={38} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  
                  {/* File Upload Button overlayed */}
                  <label htmlFor="upload-avatar-file" style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 10px rgba(139, 92, 246, 0.4)',
                    transition: 'all 0.2s ease',
                    zIndex: 20
                  }}>
                    <Camera size={14} style={{ color: 'white' }} />
                  </label>
                  <input
                    type="file"
                    id="upload-avatar-file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Preset Avatars Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ou escolha um Avatar IA
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    {presetAvatars.map((preset, index) => {
                      const isSelected = tempProfileImage === preset;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setTempProfileImage(preset)}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: isSelected ? '2px solid var(--primary-light)' : '2px solid transparent',
                            padding: '1px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
                            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                            outline: 'none'
                          }}
                        >
                          <img
                            src={preset}
                            alt={`Preset ${index + 1}`}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Nome de Operador (Como quer ser chamado)
                </label>
                <input
                  type="text"
                  value={tempProfileName}
                  onChange={(e) => setTempProfileName(e.target.value)}
                  placeholder="Ex: Lucas Machado"
                  style={{
                    padding: '0.8rem 1rem',
                    fontSize: '0.9rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'white',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                className="primary"
                style={{
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} /> SALVAR E CONECTAR VIP
              </button>
            </form>
          )}
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
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.12) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(217, 70, 239, 0.08) 0px, transparent 50%),
          linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px)
        `,
        backgroundSize: '100vw 100vh, 100vw 100vh, 45px 45px, 45px 45px',
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
        <header className="premium-navbar">
          {/* Brand Block */}
          <div className="navbar-brand-container">
            <img src={logoImg} alt="ASTROBOT Logo" className="navbar-logo-img" />
            <span style={{
              fontSize: '0.62rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(217, 70, 239, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              padding: '2px 8px',
              borderRadius: '20px',
              color: 'var(--primary-light)',
              textShadow: '0 0 5px rgba(139, 92, 246, 0.3)',
              marginLeft: '4px',
              flexShrink: 0
            }}>
              v2.5
            </span>
          </div>

          {/* Menu Items (Centered perfectly) */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 2, justifyContent: 'center' }}>
            <button 
              onClick={() => setLandingTab('home')}
              className={`nav-link ${landingTab === 'home' ? 'nav-link-active' : ''}`}
            >
              Início
            </button>
            <button 
              onClick={() => setLandingTab('strategies')}
              className={`nav-link ${landingTab === 'strategies' ? 'nav-link-active' : ''}`}
            >
              Estratégias
            </button>
            <button 
              onClick={() => setLandingTab('pricing')}
              className={`nav-link ${landingTab === 'pricing' ? 'nav-link-active' : ''}`}
            >
              Valores & Planos
            </button>
            <a 
              href="https://t.me/lucassmachado9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link"
            >
              Suporte ADM
            </a>
          </nav>

          {/* Call-to-Actions (Aligned right) */}
          <div className="navbar-right-ctas" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end', minWidth: '240px' }}>
            <button 
              className="cta-connect"
              onClick={() => setShowLanding(false)}
            >
              CONECTAR AO ROBÔ
            </button>
          </div>

          {/* Mobile hamburger menu toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile Menu Panel Dropdown */}
          {mobileMenuOpen && (
            <div className="mobile-menu-panel">
              <button 
                onClick={() => {
                  setLandingTab('home');
                  setMobileMenuOpen(false);
                }}
                className={`nav-link ${landingTab === 'home' ? 'nav-link-active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Início
              </button>
              <button 
                onClick={() => {
                  setLandingTab('strategies');
                  setMobileMenuOpen(false);
                }}
                className={`nav-link ${landingTab === 'strategies' ? 'nav-link-active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Estratégias
              </button>
              <button 
                onClick={() => {
                  setLandingTab('pricing');
                  setMobileMenuOpen(false);
                }}
                className={`nav-link ${landingTab === 'pricing' ? 'nav-link-active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Valores & Planos
              </button>
              <a 
                href="https://t.me/lucassmachado9" 
                target="_blank" 
                rel="noopener noreferrer"
                className="nav-link"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Suporte ADM
              </a>
              {isAdminLoggedIn && (
                <button 
                  onClick={() => {
                    setLandingTab('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`nav-link ${landingTab === 'admin' ? 'nav-link-active' : ''}`}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Lock size={13} /> Área Admin
                </button>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', width: '100%' }}>
                {isAdminLoggedIn ? (
                  <button 
                    className="btn-admin-logout"
                    onClick={() => {
                      localStorage.removeItem('astrobot_admin_token');
                      setIsAdminLoggedIn(false);
                      setLandingTab('home');
                      setMobileMenuOpen(false);
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <LogOut size={14} /> Sair Admin
                  </button>
                ) : (
                  <button 
                    className="btn-admin-logout"
                    onClick={() => {
                      setShowAdminLoginModal(true);
                      setMobileMenuOpen(false);
                    }}
                    style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(139, 92, 246, 0.35)', color: 'var(--primary-light)' }}
                  >
                    <Lock size={14} /> Acesso Admin
                  </button>
                )}

                <button 
                  className="cta-connect"
                  onClick={() => {
                    setShowLanding(false);
                    setMobileMenuOpen(false);
                  }}
                  style={{ width: '100%' }}
                >
                  CONECTAR AO ROBÔ
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="landing-page-wrapper" style={{ flex: 1, zIndex: 10, display: 'flex', flexDirection: 'column', padding: 0, position: 'relative' }}>
          {/* Space Background & Grid */}
          <div className="space-background">
            <div className="star-particles"></div>
            <div className="space-grid"></div>
          </div>

          {/* HOME TAB */}
          {landingTab === 'home' && (
            <div style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', flexDirection: 'column', gap: '8rem', padding: '4rem 0 0 0' }}>
              
              {/* HERO SECTION */}
              <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '4rem', alignItems: 'center', width: '100%', boxSizing: 'border-box' }} className="hero-grid-responsive">
                {/* Lado Esquerdo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'left' }}>
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '30px',
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      color: '#22C55E',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 0 15px rgba(34, 197, 94, 0.1)'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'navLinePulse 1.5s infinite ease-in-out' }} />
                      🟢 IA ONLINE • Conectado à Vercel Serverless
                    </div>
                  </div>

                  <h1 style={{
                    fontSize: '3.6rem',
                    fontWeight: '900',
                    lineHeight: '1.15',
                    margin: 0,
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '-1.5px',
                    color: '#ffffff',
                    textShadow: '0 0 30px rgba(139, 92, 246, 0.15)',
                    background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    A Inteligência Artificial que Opera na Deriv por Você
                  </h1>

                  <p style={{
                    fontSize: '1.08rem',
                    color: '#94A3B8',
                    lineHeight: '1.75',
                    margin: 0,
                    maxWidth: '580px'
                  }}>
                    O ASTROBOT analisa probabilidades em tempo real, escolhe automaticamente a melhor estratégia, executa operações inteligentes, controla metas, stops, ciclos automáticos e acompanha toda a gestão da banca.
                  </p>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <button 
                      className="cta-connect"
                      onClick={() => setShowLanding(false)}
                      style={{ padding: '0.95rem 2.5rem', fontSize: '0.95rem', borderRadius: '12px' }}
                    >
                      CONECTAR AO ROBÔ
                    </button>
                    <button 
                      onClick={() => {
                        const target = document.getElementById('painel-preview-section');
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="pricing-btn-secondary"
                      style={{ padding: '0.95rem 2.25rem', fontSize: '0.95rem', borderRadius: '12px' }}
                    >
                      Assistir Demonstração
                    </button>
                  </div>

                  {/* Stats list */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.5rem',
                    marginTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '2rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>+50.000</span>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>operações realizadas</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '-0.5px' }}>15</span>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>estratégias inteligentes</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38BDF8', letterSpacing: '-0.5px' }}>IA Ativa 24h</span>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>monitoramento contínuo</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#22C55E', letterSpacing: '-0.5px' }}>Automático</span>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ciclos e recuperações</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito - Live Simulated Mockup */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }} className="hero-mockup-container">
                  {/* Glowing purple nebula behind */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '320px',
                    height: '320px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(0,0,0,0) 70%)',
                    zIndex: -1,
                    filter: 'blur(30px)'
                  }} />

                  {/* Panel Mockup container */}
                  <div style={{
                    background: 'rgba(14, 11, 24, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '460px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(139, 92, 246, 0.1)',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(16px)',
                    position: 'relative'
                  }}>
                    {/* Mockup Header */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 'bold', marginLeft: '6px' }}>COMMAND_CENTER_IA</span>
                      </div>
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        color: '#22C55E',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'navLinePulse 1.2s infinite ease-in-out' }} />
                        ONLINE
                      </div>
                    </div>

                    {/* Mockup Body */}
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Top stats bar */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>LUCRO HOJE</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#22C55E' }}>+${demoProfit.toFixed(2)}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>VITÓRIAS</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff' }}>{demoWins}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>DERROTAS</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ef4444' }}>{demoLosses}</div>
                        </div>
                      </div>

                      {/* SVG Live Graphic Chart */}
                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '10px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94A3B8', marginBottom: '8px', padding: '0 4px' }}>
                          <span>ATIVIDADE ESTATÍSTICA IA</span>
                          <span style={{ color: '#8B5CF6', fontWeight: 'bold' }}>CURVA DE RENDIMENTO</span>
                        </div>
                        <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                          <svg viewBox="0 0 320 120" style={{ width: '100%', height: '120px' }}>
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.35)" />
                                <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                              </linearGradient>
                            </defs>
                            <polyline 
                              fill="none" 
                              stroke="#8B5CF6" 
                              strokeWidth="3" 
                              points={demoChartData.map((val, idx) => `${idx * 40},${120 - val * 0.6}`).join(' ')} 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              style={{ transition: 'points 0.5s ease-in-out' }}
                            />
                            <path 
                              d={`M0,120 L${demoChartData.map((val, idx) => `${idx * 40},${120 - val * 0.6}`).join(' ')} L320,120 Z`} 
                              fill="url(#chartGradient)" 
                              style={{ transition: 'd 0.5s ease-in-out' }}
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Status indicator bar */}
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 'bold' }}>STATUS DA OPERAÇÃO:</span>
                        <span style={{ fontSize: '0.72rem', color: '#8B5CF6', fontWeight: '800', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', animation: 'navLinePulse 1s infinite ease-in-out' }} />
                          ATIVADA - ANALISANDO MERCADO
                        </span>
                      </div>

                      {/* Recent Simulated Trades logs ticker */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ÚLTIMAS EXECUÇÕES DA IA</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {demoTrades.map((t) => (
                            <div key={t.id} style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.72rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>{t.time}</span>
                                <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: '4px', color: '#ffffff', fontWeight: 'bold', fontSize: '0.62rem' }}>{t.symbol}</span>
                                <span style={{ color: t.type === 'CALL' ? '#22C55E' : '#ef4444', fontWeight: 'bold' }}>{t.type}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#94A3B8' }}>Stake: ${t.stake.toFixed(2)}</span>
                                <span style={{
                                  fontWeight: 'bold',
                                  color: t.status === 'win' ? '#22C55E' : '#94A3B8',
                                  background: t.status === 'win' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  border: t.status === 'win' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255,255,255,0.05)'
                                }}>
                                  {t.status === 'win' ? `+$${t.payout.toFixed(2)}` : 'Loss'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* RECURSOS SECTION */}
              <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>TECNOLOGIA EXCLUSIVA</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Recursos Premium do ASTROBOT</h2>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
                    Cada detalhe projetado para automatizar suas operações de forma consistente, protegendo seu capital com inteligência artificial avançada.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1.5rem',
                  width: '100%'
                }} className="pricing-grid-responsive">
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Calendar size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Ciclos Inteligentes</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Agende múltiplos ciclos de operação automáticos com metas de lucro, stops e stakes 100% autônomos.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Brain size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Piloto Automático IA</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>O robô calcula a assertividade histórica das estratégias probabilísticas e seleciona o melhor setup.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Shield size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Gestão de Risco</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Configurações flexíveis de Martingale (Tradicional/Inteligente) e Soros com travas automáticas.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><TrendingUp size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Painel Estatístico</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Acompanhamento visual completo com winrate, lucro diário e histórico detalhado das operações.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Clock size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Agendamento Diário</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Planeje o robô para iniciar ou pausar em horários específicos de alta assertividade probabilística.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Zap size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Recuperação Inteligente</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Algoritmos avançados de recuperação pós-loss que buscam minimizar perdas indesejadas.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><CheckCircle size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Controle de Meta</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Pausa automática assim que sua meta diária for atingida ou o stop loss configurado for tocado.</p>
                  </div>
                  <div className="feature-card-premium">
                    <div className="feature-card-icon-container"><Layers size={28} /></div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 'bold', margin: '0 0 0.75rem 0' }}>Histórico Completo</h3>
                    <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>Relatório completo de operações salvas em tempo real no banco de dados local com filtro inteligente.</p>
                  </div>
                </div>
              </section>

              {/* COMO FUNCIONA */}
              <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38BDF8', letterSpacing: '1.5px', textTransform: 'uppercase' }}>PROCESSO SIMPLIFICADO</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Como Funciona o ASTROBOT</h2>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
                    Em poucos cliques você conecta sua conta e ativa a inteligência de trading.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  position: 'relative',
                  width: '100%'
                }} className="pricing-grid-responsive">
                  {/* Absolute connector line behind on desktop */}
                  <div style={{
                    position: 'absolute',
                    top: '24px',
                    left: '50px',
                    right: '50px',
                    height: '2px',
                    background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.6) 50%, rgba(56, 189, 248, 0.1) 100%)',
                    zIndex: 1
                  }} className="timeline-connector-line" />

                  <div className="timeline-step">
                    <div className="timeline-step-badge">1</div>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Conecte sua conta Deriv</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Conecte com segurança total usando seu Token de API Deriv diretamente.</p>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-step-badge">2</div>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Escolha as estratégias</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Selecione seus setups probabilísticos favoritos ou ative o recomendador IA.</p>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-step-badge">3</div>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Configure metas e stops</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Defina seu limite diário de ganho e perda conforme sua gestão pessoal.</p>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-step-badge">4</div>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Ative a IA</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Clique em Iniciar Automação e a IA começará o rastreamento em tempo real.</p>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-step-badge">5</div>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>O ASTROBOT opera</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>A IA cuida das entradas, ordens, ciclos e recuperações de forma 100% autônoma.</p>
                  </div>
                </div>
              </section>

              {/* INTELIGÊNCIA ARTIFICIAL SECTION */}
              <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>MOTOR DA OPERAÇÃO</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Como a Nossa IA Toma Decisões</h2>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
                    Entenda o fluxo analítico por trás de cada ordem enviada ao mercado de opções binárias.
                  </p>
                </div>

                {/* Fluxograma Diagram */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  width: '100%'
                }} className="flux-diagram-responsive">
                  <div className="flux-card" style={{ borderLeft: '3px solid #8B5CF6' }}>Mercado</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #6D28D9' }}>Análise Estatística</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #38BDF8' }}>Probabilidade</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #a78bfa' }}>Seleção da Estratégia</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #22C55E' }}>Execução</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #f43f5e' }}>Gestão da Operação</div>
                  <div className="flux-arrow">→</div>
                  <div className="flux-card" style={{ borderLeft: '3px solid #22c55e' }}>Registro de Resultados</div>
                </div>
              </section>

              {/* PAINEL DO ROBÔ (GALLERY) */}
              <section id="painel-preview-section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38BDF8', letterSpacing: '1.5px', textTransform: 'uppercase' }}>INTERFACE EM AÇÃO</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Visão Geral do Painel</h2>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
                    Explore os diferentes módulos do centro de controle do ASTROBOT.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  width: '100%'
                }} className="pricing-grid-responsive">
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>MÓDULO PRINCIPAL</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Dashboard</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Painel com controle do robô, status de conexão da corretora, lucros acumulados e gráficos em tempo real.</p>
                  </div>
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 'bold', textTransform: 'uppercase' }}>BANCO DE DADOS</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Histórico</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Lista completa de operações salvas em tempo real com detalhes de taxa de acerto, payouts e corretora.</p>
                  </div>
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 'bold', textTransform: 'uppercase' }}>DESEMPENHO</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Estatísticas</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Taxa de assertividade de cada estratégia específica para você escolher os algoritmos mais estáveis.</p>
                  </div>
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>MÉTODO MATEMÁTICO</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Estratégias</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Configurações de catalogação, assertividade e escolha manual ou no piloto automático de estratégias.</p>
                  </div>
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 'bold', textTransform: 'uppercase' }}>GESTÃO DE BANCA</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Configurações</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Ajuste de stake, stop loss, take profit, fator multiplicador do martingale e quantidade limite de níveis.</p>
                  </div>
                  <div className="feature-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 'bold', textTransform: 'uppercase' }}>MÓDULO AUTOMÁTICO</span>
                    <strong style={{ color: 'white', fontSize: '1.1rem' }}>Agenda Automática</strong>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>Agende múltiplos ciclos operacionais independentes para iniciar ou pausar nos horários programados.</p>
                  </div>
                </div>
              </section>

              {/* PRICING SECTION (HOME) */}
              <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem 2rem', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>LICENÇAS DISPONÍVEIS</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Planos e Valores</h2>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
                    Escolha a licença ideal para o tamanho da sua banca. Liberação imediata após contato com ADM.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '2rem',
                  alignItems: 'center',
                  width: '100%'
                }} className="pricing-grid-responsive">
                  {/* Mensal */}
                  <div className="price-card-premium">
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA MENSAL</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <strong style={{ fontSize: '2.2rem', color: 'white', fontWeight: '800' }}>R$ 97</strong>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/mês</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Acesso total por 30 dias</span>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                      <li>Painel completo do ASTROBOT</li>
                      <li>Todas as estratégias probabilísticas</li>
                      <li>Agendador de Horários (Ciclos)</li>
                      <li>Suporte prioritário via Telegram</li>
                    </ul>
                    <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-secondary">
                      ASSINAR COM ADM
                    </a>
                  </div>

                  {/* Trimestral (Recomendado) */}
                  <div className="price-card-premium price-card-premium-recommended">
                    <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#8B5CF6', color: 'white', fontSize: '0.68rem', fontWeight: '800', padding: '4px 14px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                      RECOMENDADO
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA TRIMESTRAL</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <strong style={{ fontSize: '2.5rem', color: 'white', fontWeight: '800' }}>R$ 247</strong>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/90 dias</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Economia de 15% em relação ao mensal</span>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                      <li><strong>Tudo do plano mensal</strong></li>
                      <li>Recomendador inteligente de estratégias</li>
                      <li>Atualizações automáticas da Vercel</li>
                      <li>Suporte prioritário individual VIP</li>
                    </ul>
                    <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-primary">
                      ASSINAR COM ADM
                    </a>
                  </div>

                  {/* Anual */}
                  <div className="price-card-premium">
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA ANUAL</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <strong style={{ fontSize: '2.2rem', color: 'white', fontWeight: '800' }}>R$ 697</strong>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/ano</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Melhor custo-benefício (40% de desconto)</span>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                    <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                      <li><strong>Acesso total por 365 dias</strong></li>
                      <li>Mapeamento de setups individuais</li>
                      <li>Acesso antecipado a novos módulos de IA</li>
                      <li>Suporte individual VIP do Administrador</li>
                    </ul>
                    <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-secondary">
                      ASSINAR COM ADM
                    </a>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* STRATEGIES TAB */}
          {landingTab === 'strategies' && (
            <div style={{ position: 'relative', zIndex: 5, maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '4rem', padding: '4rem 2rem' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CATÁLOGO DE ESTRATÉGIAS</span>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Nossos Algoritmos de IA</h2>
                <p style={{ fontSize: '1.02rem', color: '#94A3B8', maxWidth: '600px' }}>
                  Conheça alguns dos principais algoritmos probabilísticos integrados de fábrica no painel do ASTROBOT.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem'
              }} className="pricing-grid-responsive">
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 'bold' }}>PROBABILÍSTICA (5 MIN)</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>MHI Minoria</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Analisa as 3 últimas velas de um quadrante de 5 minutos e executa ordens na cor minoritária no início do próximo quadrante.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 'bold' }}>PROBABILÍSTICA (5 MIN)</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>MHI Maioria</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Realiza a entrada a favor da cor majoritária das últimas 3 velas do quadrante de 5 minutos, ideal para mercados com forte tendência direcional.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 'bold' }}>REVERSÃO PROBABILÍSTICA</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>Torres Gêmeas</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Compara a cor da 1ª vela e da 5ª vela de um quadrante de 5 minutos, prevendo a reversão de fechamento probabilístico do mercado.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 'bold' }}>CONTINUAÇÃO DE TENDÊNCIA</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>Três Mosqueteiros</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Rastreia o alinhamento de 3 velas consecutivas da mesma cor e executa a ordem na 4ª vela apostando na continuidade.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 'bold' }}>CONSOLIDAÇÃO DE CANAL</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>Padrão 23</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Baseado na probabilidade do fechamento conjunto da 2ª e 3ª vela de um quadrante. Ideal para mercados em lateralização.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 'bold' }}>INTELIGÊNCIA AUTOMÁTICA</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>Recomendador IA</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Varre historicamente todas as estratégias e seleciona dinamicamente a que possui maior índice de assertividade no momento.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="cta-connect" onClick={() => setShowLanding(false)}>
                  CONECTAR AO ROBÔ E EXPERIMENTAR ESTRATÉGIAS
                </button>
              </div>
            </div>
          )}

          {/* PRICING TAB */}
          {landingTab === 'pricing' && (
            <div style={{ position: 'relative', zIndex: 5, maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '4rem', padding: '4rem 2rem' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>PLANOS & VALORES</span>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Escolha Sua Licença</h2>
                <p style={{ fontSize: '1.02rem', color: '#94A3B8', maxWidth: '600px' }}>
                  Acesso total ao robô de trading de opções binárias com liberação imediata.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '2rem',
                alignItems: 'center',
                width: '100%'
              }} className="pricing-grid-responsive">
                <div className="price-card-premium">
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA MENSAL</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <strong style={{ fontSize: '2.2rem', color: 'white', fontWeight: '800' }}>R$ 97</strong>
                    <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/mês</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Acesso total por 30 dias</span>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                    <li>Painel completo do ASTROBOT</li>
                    <li>Todas as estratégias probabilísticas</li>
                    <li>Agendador de Horários (Ciclos)</li>
                    <li>Suporte prioritário via Telegram</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-secondary">
                    ASSINAR COM ADM
                  </a>
                </div>

                <div className="price-card-premium price-card-premium-recommended">
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#8B5CF6', color: 'white', fontSize: '0.68rem', fontWeight: '800', padding: '4px 14px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                    RECOMENDADO
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA TRIMESTRAL</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <strong style={{ fontSize: '2.5rem', color: 'white', fontWeight: '800' }}>R$ 247</strong>
                    <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/90 dias</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Economia de 15% em relação ao mensal</span>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                    <li><strong>Tudo do plano mensal</strong></li>
                    <li>Recomendador inteligente de estratégias</li>
                    <li>Atualizações automáticas da Vercel</li>
                    <li>Suporte prioritário individual VIP</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-primary">
                    ASSINAR COM ADM
                  </a>
                </div>

                <div className="price-card-premium">
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LICENÇA ANUAL</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <strong style={{ fontSize: '2.2rem', color: 'white', fontWeight: '800' }}>R$ 697</strong>
                    <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>/ano</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Melhor custo-benefício (40% de desconto)</span>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  <ul style={{ textAlign: 'left', paddingLeft: '1rem', fontSize: '0.78rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, flexGrow: 1 }}>
                    <li><strong>Acesso total por 365 dias</strong></li>
                    <li>Mapeamento de setups individuais</li>
                    <li>Acesso antecipado a novos módulos de IA</li>
                    <li>Suporte individual VIP do Administrador</li>
                  </ul>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" className="pricing-btn-secondary">
                    ASSINAR COM ADM
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN TAB */}
          {landingTab === 'admin' && isAdminLoggedIn && (
            <div style={{ position: 'relative', zIndex: 5, maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '4rem 2rem' }} className="login-container-animate">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, white, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Painel do Administrador
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8' }}>
                    Gerencie licenças, crie novas chaves e controle acessos.
                  </p>
                </div>
                {adminSubTab === 'licenses' && (
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
                )}
              </div>

              {/* Admin Sub-Tabs */}
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '2px', marginTop: '-0.5rem' }}>
                <button
                  onClick={() => setAdminSubTab('licenses')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: adminSubTab === 'licenses' ? 'var(--primary-light)' : 'var(--text-muted)',
                    borderBottom: adminSubTab === 'licenses' ? '2px solid var(--primary-light)' : '2px solid transparent',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  🔑 Licenças & Chaves
                </button>
                <button
                  onClick={() => setAdminSubTab('news')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: adminSubTab === 'news' ? 'var(--primary-light)' : 'var(--text-muted)',
                    borderBottom: adminSubTab === 'news' ? '2px solid var(--primary-light)' : '2px solid transparent',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  📰 Postar Notícias & Patches
                </button>
              </div>

              {adminSubTab === 'licenses' && (
                <>
                  {/* Generate Key Row */}
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 0 25px rgba(139, 92, 246, 0.05)' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={18} style={{ color: 'var(--primary-light)' }} /> Gerador de Novas Licenças (CDKEY)
                    </h3>
                    
                    <form onSubmit={handleGenerateKeysAdmin} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94A3B8', display: 'block', marginBottom: '0.5rem' }}>
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
                        <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94A3B8', display: 'block', marginBottom: '0.5rem' }}>
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
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        Carregando chaves...
                      </div>
                    ) : adminKeysList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                        Nenhuma chave de ativação encontrada no Firebase.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: '#94A3B8' }}>
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
                </>
              )}

              {adminSubTab === 'news' && (
                <NewsEditor
                  posts={posts}
                  onPostsChange={fetchPosts}
                  isAdmin={isAdminLoggedIn}
                />
              )}
            </div>
          )}

        </main>

        {/* Footer */}
        <footer style={{
          background: '#09090F',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '4rem 2rem 3rem 2rem',
          position: 'relative',
          zIndex: 5,
          color: '#94A3B8',
          fontFamily: 'var(--font-sans)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Main Footer content row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '3rem' }} className="pricing-grid-responsive">
              {/* Brand Col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={logoImg} alt="ASTROBOT Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(217, 70, 239, 0.15) 100%)', border: '1px solid rgba(139, 92, 246, 0.45)', padding: '2px 8px', borderRadius: '20px', color: 'var(--primary-light)', textShadow: '0 0 5px rgba(139, 92, 246, 0.3)' }}>
                    v2.5
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', lineHeight: '1.5', margin: 0 }}>
                  AI Trading Engine de alto padrão projetado para automação probabilística na Deriv.
                </p>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
                  Servidores 100% online
                </div>
              </div>

              {/* Links Col 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '150px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plataforma</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <button onClick={() => setLandingTab('home')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Início</button>
                  <button onClick={() => setLandingTab('strategies')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Estratégias</button>
                  <button onClick={() => setLandingTab('pricing')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Planos & Valores</button>
                </div>
              </div>

              {/* Links Col 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '150px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suporte & Social</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <a href="https://t.me/lucassmachado9" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>Telegram ADM</a>
                  <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>Comunidade Discord</a>
                  <a href="https://deriv.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>Corretora Deriv</a>
                </div>
              </div>

              {/* Links Col 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '180px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legal</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <span style={{ cursor: 'pointer' }}>Política de Privacidade</span>
                  <span style={{ cursor: 'pointer' }}>Termos de Uso</span>
                  <span style={{ cursor: 'pointer' }}>Aviso de Risco</span>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '2rem',
              fontSize: '0.78rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                &copy; {new Date().getFullYear()} ASTROBOT. Todos os direitos reservados.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Powered by</span>
                <span style={{ color: '#ffffff', fontWeight: 'bold', letterSpacing: '-0.25px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  ▲ Vercel Serverless
                </span>
              </div>
            </div>

          </div>
        </footer>

      </div>
    );
  }

  if (!userEmail) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        padding: '2rem',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Sleek animated background elements */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          top: '10%',
          left: '10%',
          filter: 'blur(50px)',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          bottom: '10%',
          right: '10%',
          filter: 'blur(60px)',
          zIndex: 0
        }} />

        <div className="login-container-animate" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '3rem 2.5rem',
          borderRadius: '24px',
          background: 'rgba(14, 11, 24, 0.75)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-neon)',
          backdropFilter: 'blur(20px)',
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <img src={logoImg} alt="ASTROBOT Logo" style={{ height: '48px', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.25rem 0' }}>
              {authMode === 'login' ? 'Bem-vindo ao ASTROBOT' : 'Crie sua Conta'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              {authMode === 'login' 
                ? 'Conecte-se para gerenciar suas operações em tempo real.' 
                : 'Registre-se usando sua chave de licença ativa (CDKEY).'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                E-MAIL
              </label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={userEmailInput}
                onChange={(e) => setUserEmailInput(e.target.value)}
                style={{ 
                  padding: '0.8rem', 
                  fontSize: '0.92rem', 
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

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                SENHA
              </label>
              <input
                type="password"
                placeholder={authMode === 'login' ? 'Insira sua senha' : 'Crie uma senha segura'}
                value={userPasswordInput}
                onChange={(e) => setUserPasswordInput(e.target.value)}
                style={{ 
                  padding: '0.8rem', 
                  fontSize: '0.92rem', 
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

            {authMode === 'register' && (
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  CHAVE DE LICENÇA (CDKEY)
                </label>
                <input
                  type="text"
                  placeholder="ASTRO-XXXX-XXXX-XXXX"
                  value={userRegisterKeyInput}
                  onChange={(e) => setUserRegisterKeyInput(e.target.value.toUpperCase())}
                  style={{ 
                    padding: '0.8rem', 
                    fontSize: '0.92rem', 
                    fontFamily: 'var(--font-mono)', 
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'white',
                    width: '100%',
                    outline: 'none',
                    textAlign: 'center',
                    letterSpacing: '1px'
                  }}
                  required
                />
              </div>
            )}

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

            <button 
              type="submit" 
              className="primary" 
              disabled={activating}
              style={{ padding: '0.9rem', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%', borderRadius: '10px' }}
            >
              {activating 
                ? (authMode === 'login' ? 'ENTRANDO...' : 'REGISTRANDO...') 
                : (authMode === 'login' ? 'ACESSAR CONTA' : 'REGISTRAR E ATIVAR')}
            </button>
          </form>

          {/* Toggle Tab */}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {authMode === 'login' ? (
              <>
                Não tem uma conta?{' '}
                <span 
                  onClick={() => { setAuthMode('register'); setActivationError(''); }}
                  style={{ color: 'var(--primary-light)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Registre-se aqui
                </span>
              </>
            ) : (
              <>
                Já possui uma conta?{' '}
                <span 
                  onClick={() => { setAuthMode('login'); setActivationError(''); }}
                  style={{ color: 'var(--primary-light)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Faça login
                </span>
              </>
            )}
          </div>
        </div>
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
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }} className="login-container-animate">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <img src={logoImg} alt="ASTROBOT Logo" style={{ width: '280px', height: 'auto', objectFit: 'contain', marginBottom: '0.25rem' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--border-active)', padding: '4px 12px', borderRadius: '20px', width: 'fit-content' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '850', color: 'var(--primary-light)', letterSpacing: '1px' }}>V2.5 INTELIGENTE</span>
              </div>
            </div>
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

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', marginTop: '0.25rem' }} onClick={() => setRememberMe(!rememberMe)}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => {}} // handled by parent div click
                style={{
                  width: '15px',
                  height: '15px',
                  accentColor: 'var(--primary-light)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Salvar credenciais para futuros acessos
              </span>
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

  const netProfit = balance - initialBalance;
  
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.result === 'WIN').length;
  const losses = trades.filter(t => t.result === 'LOSS').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  const totalStake = trades.reduce((sum, t) => sum + (t.stake || 0), 0);
  const roi = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;

  const dailyProfit = netProfit; // Match dailyProfit to netProfit for active session

  // Calculate maximum drawdown
  let maxBal = initialBalance;
  let currentBal = initialBalance;
  let maxDrawdown = 0;
  trades.forEach(t => {
    currentBal += (t.profit || 0);
    if (currentBal > maxBal) {
      maxBal = currentBal;
    }
    const dd = maxBal > 0 ? ((maxBal - currentBal) / maxBal) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  });

  const getTimelineStep = () => {
    if (!isRunning) return 0;
    if (activeTradeCountdown) {
      return 3; // Entrada Executada
    }
    const lastTrade = trades[trades.length - 1];
    if (lastTrade && (Date.now() - lastTrade.epoch * 1000 < 10000)) {
      return 4; // Resultado
    }
    if (settings.martingaleEnabled && lastTrade && lastTrade.result === 'LOSS') {
      return 5; // Gestão Aplicada (Martingale)
    }
    if (bestStrategy) {
      return 2; // Estratégia encontrada
    }
    return 1; // IA analisando
  };

  const keyDays = keyExpiresAt ? Math.max(0, Math.ceil((keyExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#09090F' }}>
      {/* Header bar - Premium Status Bar */}
      <header style={{
        background: 'rgba(14, 11, 24, 0.8)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.5rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: '64px'
      }}>
        {/* Left: Logo & Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logoImg} alt="ASTROBOT Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '0.55rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '1px 6px', borderRadius: '20px', fontWeight: 'bold', color: 'var(--primary-light)' }}>
              v2.5
            </span>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: '1rem' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layers },
              { id: 'scanner', label: 'Scanner', icon: Cpu },
              { id: 'strategies', label: 'Estratégias', icon: Sparkles },
              { id: 'reports', label: 'Relatórios', icon: TrendingUp },
              { id: 'planning', label: 'Planejamento', icon: Target },
              { id: 'automation', label: 'Automação', icon: Calendar },
              { id: 'telegram', label: 'Telegram', icon: Send },
              { id: 'news', label: 'Atualizações', icon: Newspaper },
              ...(isAdminLoggedIn ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : [])
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activePage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActivePage(tab.id);
                    setIsProfileDropdownOpen(false);
                    setIsNotificationsOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                    borderBottom: isActive ? '2px solid var(--primary-light)' : '2px solid transparent',
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '0px',
                    transition: 'all 0.2s ease',
                    height: 'auto'
                  }}
                >
                  <IconComp size={13} />
                  <span>{tab.label}</span>
                  {tab.id === 'news' && (() => {
                    const unread = getUnreadCount(posts);
                    return unread > 0 ? (
                      <span style={{
                        background: 'var(--primary)',
                        color: 'white',
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        borderRadius: '10px',
                        padding: '1px 5px',
                        marginLeft: '3px',
                        display: 'inline-block',
                        boxShadow: '0 0 8px rgba(139,92,246,0.6)'
                      }}>
                        {unread}
                      </span>
                    ) : null;
                  })()}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Balance, Account Type, Notifications, Profile Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          
          {/* Balance Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '4px 12px 4px 6px',
            height: '32px'
          }}>
            <div style={{
              background: isDemo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: isDemo ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '20px',
              padding: '1px 8px',
              fontSize: '0.58rem',
              fontWeight: 'bold',
              color: isDemo ? 'var(--warning)' : 'var(--success)'
            }}>
              {isDemo ? 'DEMO' : 'REAL'}
            </div>
            <strong style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-mono)' }}>
              ${balance.toFixed(2)}
            </strong>
          </div>

          {/* Ping & Latency */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            <Radio size={11} style={{ color: 'var(--primary-light)' }} />
            <span>{latency}ms</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileDropdownOpen(false);
            }}
            style={{
              background: isNotificationsOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '8px',
              borderRadius: '50%',
              color: isNotificationsOpen ? 'var(--primary-light)' : 'white',
              cursor: 'pointer',
              position: 'relative',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={14} />
            {/* Unread news indicator */}
            {getUnreadCount(posts) > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '8px',
                height: '8px',
                background: 'var(--accent)',
                borderRadius: '50%',
                boxShadow: '0 0 6px var(--accent)'
              }} />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '40px',
              right: '42px',
              width: '300px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1100,
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: 'rgba(14, 11, 24, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.75rem', color: 'white' }}>NOTIFICAÇÕES & NOVIDADES</strong>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{getUnreadCount(posts)} não lidas</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posts.length > 0 ? (
                  posts.slice(0, 5).map((post, idx) => (
                    <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '2px solid var(--primary-light)' }}>
                      <strong style={{ fontSize: '0.7rem', color: 'white', display: 'block' }}>{post.title}</strong>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>{post.content}</p>
                      <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>{new Date(post.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.7rem' }}>
                    Nenhuma novidade encontrada no momento.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile User Dropdown Toggle */}
          <button
            onClick={() => {
              setIsProfileDropdownOpen(!isProfileDropdownOpen);
              setIsNotificationsOpen(false);
            }}
            style={{
              background: isProfileDropdownOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '4px 10px',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              position: 'relative'
            }}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid var(--primary-light)',
                  boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
                }}
              />
            ) : (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--primary-light)'
              }}>
                <User size={12} style={{ color: 'var(--primary-light)' }} />
              </div>
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'white' }}>
              {welcomeName ? welcomeName.split(' ')[0] : 'Usuário'}
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
              color: '#1E1B4B',
              fontSize: '0.6rem',
              fontWeight: '800',
              padding: '1px 6px',
              borderRadius: '10px',
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              VIP
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '40px',
              right: '0px',
              width: '240px',
              zIndex: 1100,
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: 'rgba(14, 11, 24, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
            }}>
              {/* User Info details */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '0.25rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(251, 191, 36, 0.6)',
                      boxShadow: '0 0 10px rgba(251, 191, 36, 0.2)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--primary-light)'
                  }}>
                    <User size={16} style={{ color: 'var(--primary-light)' }} />
                  </div>
                )}
                <div>
                  <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>{welcomeName}</strong>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>{accountInfo?.email || 'Token Login'}</span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>ID: {accountInfo?.loginid || 'Deriv'}</span>
                </div>
              </div>

              {/* Action Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => {
                    setIsProfileConfigured(false);
                    setShowWelcome(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    justifyContent: 'flex-start',
                    padding: '6px 8px',
                    width: '100%',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={12} style={{ color: 'var(--primary-light)' }} /> Editar Perfil VIP
                </button>

                <button
                  onClick={() => {
                    setActivePage('settings');
                    setIsProfileDropdownOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    justifyContent: 'flex-start',
                    padding: '6px 8px',
                    width: '100%',
                    fontSize: '0.72rem',
                    color: activePage === 'settings' ? 'var(--primary-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Cpu size={12} /> Configurações do Robô
                </button>

                <button
                  onClick={() => {
                    setActivePage('logs');
                    setIsProfileDropdownOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    justifyContent: 'flex-start',
                    padding: '6px 8px',
                    width: '100%',
                    fontSize: '0.72rem',
                    color: activePage === 'logs' ? 'var(--primary-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  <Layers size={12} /> Console de Logs
                </button>

                {/* Admin Panel button if isAdminLoggedIn */}
                {isAdminLoggedIn && (
                  <button
                    onClick={() => {
                      setLandingTab('admin');
                      setShowLanding(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      justifyContent: 'flex-start',
                      padding: '6px 8px',
                      width: '100%',
                      fontSize: '0.72rem',
                      color: 'var(--primary-light)',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                  >
                    <ShieldCheck size={12} /> Painel Administrativo
                  </button>
                )}
              </div>

              {/* License key expiration info */}
              <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '6px', borderRadius: '6px', fontSize: '0.62rem', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Licença Expira:</span>
                  <strong style={{ color: 'white' }}>{keyDays} dias</strong>
                </div>
              </div>

              {/* HUD Toggle */}
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
                  padding: '6px 8px', 
                  borderRadius: '4px', 
                  background: overlayActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent', 
                  border: 'none',
                  color: overlayActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }} 
              >
                <Layers size={12} style={{ marginRight: '6px' }} />
                <span>{overlayActive ? 'Desativar HUD overlay' : 'Ativar HUD overlay'}</span>
              </button>

              {/* Disconnect / Logout */}
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  handleDisconnect();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--danger)',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  padding: '6px',
                  width: '100%',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}
              >
                <LogOut size={12} /> Desconectar Conta
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main page router viewport */}
      <div key={activePage} className="page-transition">
      {(() => {
        if (activePage === 'dashboard') {
          return (
            <main className="dashboard-grid" style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: sidebarCollapsed ? '1fr' : '1fr 340px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: '1.25rem',
              gap: '1.25rem',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Floating Expand Sidebar Button */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                    cursor: 'pointer',
                    zIndex: 100
                  }}
                >
                  EXIBIR PAINEL
                </button>
              )}

              {/* Left Side: Chart, Timeline & Thermometers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                
                {/* AI recommendations or suggestion banner */}
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

                {/* Active Trade Countdown Banner */}
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

                {/* Chart Wrapper Container */}
                <div style={{ position: 'relative', width: '100%', height: '680px', borderRadius: '16px', overflow: 'hidden' }}>
                  <Chart
                    candles={candles}
                    trades={trades}
                    activeTrade={stateRef.current.lastContractDetails}
                    granularity={settings.granularity}
                    strategy={settings.selectedStrategy}
                  />

                  {/* Absolute HUD overlays on top of the Chart */}
                  <div style={{
                    position: 'absolute',
                    top: '50px',
                    left: '12px',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    {/* Probabilidade */}
                    <div style={{ background: 'rgba(9, 9, 15, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.5rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Probabilidade</span>
                      <strong style={{ fontSize: '0.75rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                        {bestStrategy ? `${bestStrategy.winRate.toFixed(1)}%` : '92.4%'}
                      </strong>
                    </div>

                    {/* Estratégia */}
                    <div style={{ background: 'rgba(9, 9, 15, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.5rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Estratégia</span>
                      <strong style={{ fontSize: '0.75rem', color: 'white' }}>
                        {bestStrategy ? bestStrategy.name : settings.selectedStrategy.replace('_', ' ').toUpperCase()}
                      </strong>
                    </div>

                    {/* Tendência */}
                    <div style={{ background: 'rgba(9, 9, 15, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.5rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Tendência</span>
                      <strong style={{ fontSize: '0.75rem', color: (candles.length > 21) ? (calculateEMA(candles, 9)[candles.length - 1] > calculateEMA(candles, 21)[candles.length - 1] ? '#22c55e' : '#ef4444') : '#22c55e' }}>
                        {(candles.length > 21) ? (calculateEMA(candles, 9)[candles.length - 1] > calculateEMA(candles, 21)[candles.length - 1] ? '▲ ALTA' : '▼ BAIXA') : '▲ COMPRA'}
                      </strong>
                    </div>

                    {/* Próxima Vela */}
                    <div style={{ background: 'rgba(9, 9, 15, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.5rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Próxima Vela</span>
                      <strong style={{ fontSize: '0.75rem', color: 'white' }}>
                        {activeTradeCountdown ? 'EXECUÇÃO' : 'AGUARDANDO'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Operations Timeline */}
                <div style={{
                  background: 'rgba(14, 11, 24, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  {(() => {
                    const steps = [
                      { label: 'Mercado', desc: 'Conexão ativa' },
                      { label: 'IA analisando', desc: 'Média EMA 9/21' },
                      { label: 'Estratégia', desc: 'Sinal probabilístico' },
                      { label: 'Executado', desc: 'Contrato aberto' },
                      { label: 'Resultado', desc: 'Ponto Spot' },
                      { label: 'Gestão', desc: 'Gale / Soros' }
                    ];
                    
                    const activeStep = getTimelineStep();

                    return steps.map((step, idx) => {
                      const isActive = idx <= activeStep;
                      const isCurrent = idx === activeStep;

                      return (
                        <React.Fragment key={idx}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, position: 'relative' }}>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: isCurrent ? 'var(--primary-light)' : (isActive ? 'var(--success)' : 'rgba(255,255,255,0.05)'),
                              border: isCurrent ? '2px solid white' : (isActive ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              color: isCurrent || isActive ? 'white' : '#64748b',
                              boxShadow: isCurrent ? '0 0 10px var(--primary)' : (isActive ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none'),
                              transition: 'all 0.3s ease',
                              zIndex: 2
                            }}>
                              {idx + 1}
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: isCurrent ? 'bold' : '600', color: isCurrent ? 'white' : (isActive ? '#cbd5e1' : '#64748b'), textAlign: 'center' }}>{step.label}</span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div style={{
                              height: '2px',
                              flex: 1,
                              background: idx < activeStep ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                              boxShadow: idx < activeStep ? '0 0 4px rgba(16, 185, 129, 0.4)' : 'none',
                              marginTop: '-16px',
                              transition: 'all 0.3s ease',
                              zIndex: 1
                            }} />
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>

                {/* Motor de Estratégias Thermometers Row */}
                {(() => {
                  const getStratWinrate = (id, fallback) => {
                    const found = strategiesStats.find(s => s.id === id);
                    return found && found.totalTrades > 0 ? found.winRate : fallback;
                  };

                  const thermoList = [
                    { name: 'MHI Minority', id: 'mhi_minority', def: 78.4 },
                    { name: 'Marubozu', id: 'marubozu', def: 72.8 },
                    { name: 'Padrão R7', id: 'r7', def: 69.5 },
                    { name: 'Padrão R10', id: 'r10', def: 64.2 },
                    { name: 'Três Mosqueteiros', id: 'three_musketeers', def: 81.3 }
                  ];

                  return (
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(14, 11, 24, 0.45)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Cpu size={14} style={{ color: 'var(--primary-light)' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>MOTOR DE ESTRATÉGIAS // EFICIÊNCIA PROBABILÍSTICA ATUAL</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
                        {thermoList.map((t) => {
                          const wr = getStratWinrate(t.id, t.def);
                          const color = wr >= 75 ? 'var(--success)' : wr >= 65 ? 'var(--primary-light)' : 'var(--warning)';

                          return (
                            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{t.name}</span>
                                <strong style={{ color: color, fontFamily: 'var(--font-mono)' }}>{wr.toFixed(1)}%</strong>
                              </div>
                              <div style={{
                                height: '6px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                <div style={{
                                  width: `${wr}%`,
                                  height: '100%',
                                  background: color,
                                  boxShadow: `0 0 8px ${color}`,
                                  borderRadius: '10px',
                                  transition: 'width 0.5s ease-in-out'
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Right Sidebar Control Panel */}
              <div style={{ display: sidebarCollapsed ? 'none' : 'flex', flexDirection: 'column' }}>
                {/* Vertical Control Panel Box */}
                <div className="glass-panel" style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: 'rgba(14, 11, 24, 0.6)'
                }}>
                  
                  {/* Status Indicator */}
                  <div>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Operacional</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className={isRunning ? 'pulse-dot-green' : 'pulse-dot-red'} />
                      <strong style={{ fontSize: '1rem', color: isRunning ? 'var(--success)' : 'var(--text-muted)' }}>
                        {isRunning ? 'BOT OPERANDO' : 'ROBÔ PAUSADO'}
                      </strong>
                    </div>
                  </div>

                  {/* AI Neural Core Visualizer */}
                  <div style={{
                    position: 'relative',
                    height: '175px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: 'radial-gradient(circle at center, rgba(14, 11, 24, 0.4) 0%, rgba(9, 9, 15, 0.9) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isRunning ? '0 0 24px rgba(139, 92, 246, 0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '10px'
                  }}>
                    {/* Background Strands Animation */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
                      <Strands
                        colors={(() => {
                          if (trades.length > 0) {
                            const last = trades[trades.length - 1];
                            if (last.profit > 0) return ["#10B981", "#34D399", "#059669"]; // Green theme
                            if (last.profit < 0) return ["#EF4444", "#F87171", "#DC2626"]; // Red theme
                          }
                          return ["#8b5cf6", "#06B6D4", "#d946ef"]; // Default theme
                        })()}
                        count={isRunning ? 4 : 2}
                        speed={isRunning ? 0.75 : 0.25}
                        amplitude={isRunning ? 0.8 : 0.3}
                        intensity={isRunning ? 0.7 : 0.3}
                        glow={isRunning ? 2.8 : 1.2}
                        thickness={isRunning ? 0.7 : 0.4}
                        spread={1.2}
                      />
                    </div>
                    
                    {/* Text Overlay */}
                    <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {isRunning ? 'Núcleo Neural Operacional' : 'Núcleo Neural Ocioso'}
                        </span>
                        <strong style={{ fontSize: '0.68rem', color: isRunning ? 'var(--primary-light)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {isRunning ? 'Analisando Mercado...' : 'Modo Standby'}
                        </strong>
                      </div>
                      
                      {isRunning && (
                        <div style={{
                          fontSize: '0.5rem',
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                          color: 'var(--primary-light)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          animation: 'pulse 2s infinite'
                        }}>
                          LIVE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Giant Action Button */}
                  <button
                    onClick={isRunning ? stopBot : startBot}
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: isRunning 
                        ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                        : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                      color: 'white',
                      fontWeight: '900',
                      fontSize: '0.95rem',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      boxShadow: isRunning 
                        ? '0 0 20px rgba(239, 68, 68, 0.4)' 
                        : '0 0 20px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isRunning ? 'PARAR OPERAÇÕES' : 'INICIAR BOT'}
                  </button>

                  {/* Speed Connection Status Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Brain size={12} style={{ color: isRunning ? 'var(--success)' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.62rem', fontWeight: 'bold' }}>IA: {isRunning ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Radio size={12} style={{ color: connected ? 'var(--success)' : 'var(--danger)' }} />
                      <span style={{ fontSize: '0.62rem', fontWeight: 'bold' }}>DERIV: {connected ? 'SYNCED' : 'ERR'}</span>
                    </div>
                  </div>

                  {/* Financial & Parameter Specs */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Painel da Sessão</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Estratégia Atual:</span>
                        <strong style={{ color: 'white' }}>{settings.autoPilot ? 'Piloto Auto' : (bestStrategy?.name || settings.selectedStrategy.replace('_', ' ').toUpperCase())}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Probabilidade:</span>
                        <strong style={{ color: 'var(--success)' }}>{bestStrategy ? `${bestStrategy.winRate.toFixed(1)}%` : '92.4%'}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Próxima Entrada:</span>
                        <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{activeTradeCountdown && activeTradeCountdown.remaining > 0 ? `${activeTradeCountdown.remaining}s` : (isRunning ? 'Analisando...' : 'Pausado')}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Meta de Lucro:</span>
                        <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${Number(settings.takeProfit || 0).toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Stop Loss:</span>
                        <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${Number(settings.stopLoss || 0).toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Saldo Atual:</span>
                        <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${balance.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Lucro da Sessão:</span>
                        <strong style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Drawdown Máx:</span>
                        <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{maxDrawdown.toFixed(1)}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant messages console */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Brain size={11} style={{ color: 'var(--primary-light)' }} />
                      <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assistente Virtual IA</span>
                    </div>
                    <div style={{
                      background: 'rgba(9, 9, 15, 0.45)',
                      borderRadius: '6px',
                      padding: '7px 9px',
                      fontSize: '0.62rem',
                      color: '#94a3b8',
                      lineHeight: '1.35',
                      borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
                      maxHeight: '62px',
                      overflowY: 'auto'
                    }}>
                      {(() => {
                        if (!isRunning) {
                          return "Aguardando início das operações. Volatilidade estável detectada.";
                        }
                        if (activeTradeCountdown) {
                          return `Sinal de ${activeTradeCountdown.contractType} detectado em ${activeTradeCountdown.symbol}. Executando ordem...`;
                        }
                        if (bestStrategy) {
                          return `"${bestStrategy.name}" lidera com ${bestStrategy.winRate.toFixed(1)}% de assertividade. Monitorando entradas.`;
                        }
                        return "Escaneando dados históricos e EMAs 9/21. Permaneça conectado.";
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            </main>
          );
        }

        if (activePage === 'scanner') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Scanner
                settings={settings}
                onChange={handleSettingsChange}
                connected={connected}
                isRunning={isRunning}
              />
            </main>
          );
        }

        if (activePage === 'strategies') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <StrategiesCatalog
                strategies={strategiesStats}
                selectedStrategyId={settings.selectedStrategy}
                onSelectStrategy={(id) => setSettings(prev => ({ ...prev, selectedStrategy: id }))}
                liveSignals={liveSignals}
                autoPilot={settings.autoPilot}
              />
            </main>
          );
        }

        if (activePage === 'reports') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Reports
                dbTrades={dbTrades}
                onClearDb={() => {
                  clearDbTrades();
                  setDbTrades([]);
                }}
              />
            </main>
          );
        }

        if (activePage === 'planning') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Planning
                dbTrades={dbTrades}
                onClearDb={() => {
                  clearDbTrades();
                  setDbTrades([]);
                }}
              />
            </main>
          );
        }

        if (activePage === 'automation') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Scheduler
                schedulerState={schedulerState}
                onToggleScheduler={setSchedulerState}
                cycles={cycles}
                onSaveCycles={setCycles}
                activeCycleId={activeCycleId}
                onTriggerCycleManually={handleTriggerCycleManually}
                schedulerLogs={schedulerLogs}
                onClearSchedulerLogs={handleClearSchedulerLogs}
                onStopBot={stopBot}
              />
            </main>
          );
        }

        if (activePage === 'settings') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: '800px', width: '100%' }}>
                <Settings
                  settings={settings}
                  onChange={handleSettingsChange}
                  onStart={startBot}
                  onStop={stopBot}
                  isRunning={isRunning}
                  connected={connected}
                  authorized={authorized}
                  bestStrategy={bestStrategy}
                  collapsed={false}
                  onToggleCollapse={() => {}}
                  schedulerState={schedulerState}
                  onToggleScheduler={setSchedulerState}
                  onSaveSettings={handleSaveSettings}
                />
              </div>
            </main>
          );
        }

        if (activePage === 'logs') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
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
            </main>
          );
        }

        if (activePage === 'telegram') {
          return (
            <main style={{ padding: '1.25rem 2rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, white, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Telegram Remote</h2>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>Monitore e controle o ASTROBOT pelo celular, 24 horas por dia.</p>
                </div>
                <TelegramConfig
                  settings={settings}
                  onSaveTelegramSettings={(cfg) => {
                    // Config is saved to localStorage inside TelegramConfig;
                    // notify Electron main process if running
                    const isElectron = window && window.process && window.process.type === 'renderer';
                    if (isElectron) {
                      try {
                        const { ipcRenderer } = window.require('electron');
                        ipcRenderer.send('update-telegram-config', cfg);
                      } catch (err) {
                        console.error('IPC send failed:', err);
                      }
                    }
                  }}
                />
              </div>
            </main>
          );
        }

        if (activePage === 'news') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <NewsFeed
                posts={posts}
                loading={postsLoading}
              />
            </main>
          );
        }

        if (activePage === 'admin' && isAdminLoggedIn) {
          return (
            <main style={{ padding: '2rem 1.25rem', flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, white, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Painel do Administrador
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#94A3B8' }}>
                      Gerencie licenças, crie novas chaves e controle acessos.
                    </p>
                  </div>
                  {adminSubTab === 'licenses' && (
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
                  )}
                </div>

                {/* Admin Sub-Tabs */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '2px', marginTop: '-0.5rem' }}>
                  <button
                    onClick={() => setAdminSubTab('licenses')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'licenses' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'licenses' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    🔑 Licenças & Chaves
                  </button>
                  <button
                    onClick={() => setAdminSubTab('news')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'news' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'news' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    📰 Postar Notícias & Patches
                  </button>
                </div>

                {adminSubTab === 'licenses' && (
                  <>
                    {/* Generate Key Row */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 0 25px rgba(139, 92, 246, 0.05)' }}>
                      <h3 style={{ fontSize: '1.15rem', color: 'white', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={18} style={{ color: 'var(--primary-light)' }} /> Gerador de Novas Licenças (CDKEY)
                      </h3>
                      
                      <form onSubmit={handleGenerateKeysAdmin} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94A3B8', display: 'block', marginBottom: '0.5rem' }}>
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
                          <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94A3B8', display: 'block', marginBottom: '0.5rem' }}>
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
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                          Carregando chaves...
                        </div>
                      ) : adminKeysList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                          Nenhuma chave de ativação encontrada no Firebase.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', color: '#94A3B8' }}>
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
                  </>
                )}

                {adminSubTab === 'news' && (
                  <NewsEditor
                    posts={posts}
                    onPostsChange={fetchPosts}
                    isAdmin={isAdminLoggedIn}
                  />
                )}
              </div>
            </main>
          );
        }

        return null;
      })()}
      </div>

      {/* Futuristic simulated NeuralLoader training sequence */}
      {isInitializing && (
        <NeuralLoader
          onComplete={() => {
            setIsInitializing(false);
            startBot(true);
          }}
        />
      )}
    </div>
  );
}
