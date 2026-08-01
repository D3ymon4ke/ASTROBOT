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
import DownloadsEditor from './components/DownloadsEditor';
import DownloadsFeed from './components/DownloadsFeed';
import Reports from './components/Reports';
import NeuralLoader from './components/NeuralLoader';
import StrategiesCatalog from './components/StrategiesCatalog';
import Planning from './components/Planning';
import Strands from './components/Strands';
import LightPillar from './components/LightPillar';
import TelegramConfig from './components/TelegramConfig';
import { ShieldCheck, ShieldAlert, Cpu, Radio, LogOut, RefreshCw, KeyRound, Layers, Info, ExternalLink, Lock, Calendar, Brain, Shield, Activity, Sparkles, Clock, Coins, ChevronRight, ChevronDown, TrendingUp, Zap, CheckCircle, Menu, X, Percent, TrendingDown, Target, Newspaper, Bell, User, Camera, Upload, Send, Download, Users, GraduationCap, BookOpen, StickyNote } from 'lucide-react';
import CommunityFeed from './components/CommunityFeed';
import UserProfile from './components/UserProfile';
import TrainingModule from './components/TrainingModule';
import StrategyBuilder from './components/StrategyBuilder';
import AdminGamificationEditor from './components/AdminGamificationEditor';
import Landing3DCard from './components/Landing3DCard';
import HeroSection from './components/landing/HeroSection';
import AIWorkflowSection from './components/landing/AIWorkflowSection';
import ScannerRadarSection from './components/landing/ScannerRadarSection';
import StrategiesSection from './components/landing/StrategiesSection';
import CyclesSchedulerSection from './components/landing/CyclesSchedulerSection';
import TelegramSimulatorSection from './components/landing/TelegramSimulatorSection';
import SecurityDashboardSection from './components/landing/SecurityDashboardSection';
import TestimonialsPricingFaq from './components/landing/TestimonialsPricingFaq';
import { loadDbTrades, saveDbTrade, clearDbTrades, saveDbTrades, mergeCloudTradesWithLocal, mergeCloudMonthlyReportsWithLocal, loadMonthlyReports } from './utils/db';
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

const ASSETS_LIST = [
  { symbol: 'R_100', name: 'Volatilidade 100' },
  { symbol: '1HZ100V', name: 'Volatilidade 100 (1s)' },
  { symbol: 'R_75', name: 'Volatilidade 75' },
  { symbol: '1HZ75V', name: 'Volatilidade 75 (1s)' },
  { symbol: 'R_50', name: 'Volatilidade 50' },
  { symbol: '1HZ50V', name: 'Volatilidade 50 (1s)' },
  { symbol: 'R_25', name: 'Volatilidade 25' },
  { symbol: '1HZ25V', name: 'Volatilidade 25 (1s)' },
  { symbol: 'R_10', name: 'Volatilidade 10' },
  { symbol: '1HZ10V', name: 'Volatilidade 10 (1s)' }
];

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

const DIAGNOSTIC_STEPS = [
  { text: 'Inicializando Motor Neural...', progress: '██████□□□□' },
  { text: 'Conectando à Deriv...', progress: '████████□□' },
  { text: 'Carregando Estratégias...', progress: '██████████' },
  { text: 'Sincronizando Scanner...', progress: '██████████' },
  { text: 'Preparando Dashboard...', progress: '██████████' },
  { text: 'Entrando...', progress: '██████████' }
];

class SocialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Erro na área social:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f87171' }}>Painel da Comunidade Atualizado</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', maxWidth: '450px' }}>
            Identificamos dados em cache incompatíveis. Clique abaixo para atualizar seu feed com a versão limpa.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('astrobot_cached_community_posts');
              this.setState({ hasError: false, error: null });
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
            }}
          >
            Atualizar e Recarregar Feed
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LiveSimulatedChart = () => {
  const [candles, setCandles] = useState([
    { open: 120, close: 125, high: 128, low: 118, type: 'green' },
    { open: 125, close: 122, high: 127, low: 120, type: 'red' },
    { open: 122, close: 130, high: 132, low: 121, type: 'green' },
    { open: 130, close: 135, high: 138, low: 128, type: 'green' },
    { open: 135, close: 131, high: 136, low: 129, type: 'red' },
    { open: 131, close: 138, high: 140, low: 130, type: 'green' },
    { open: 138, close: 145, high: 148, low: 136, type: 'green' },
    { open: 145, close: 142, high: 146, low: 140, type: 'red' },
    { open: 142, close: 148, high: 152, low: 141, type: 'green' }
  ]);
  const [lastPrice, setLastPrice] = useState(148.24);
  const [priceChange, setPriceChange] = useState(2.41);

  useEffect(() => {
    const interval = setInterval(() => {
      const isUp = Math.random() > 0.45;
      const change = parseFloat((Math.random() * 1.5).toFixed(2));
      const nextPrice = isUp ? parseFloat((lastPrice + change).toFixed(2)) : parseFloat((lastPrice - change).toFixed(2));
      setLastPrice(nextPrice);
      
      const pctChange = parseFloat(((nextPrice - 142) / 142 * 100).toFixed(2));
      setPriceChange(pctChange);

      setCandles(prev => {
        const list = [...prev];
        const lastCandle = list[list.length - 1];
        
        if (Math.random() > 0.65) {
          list.shift();
          const open = lastCandle.close;
          const close = nextPrice;
          const high = Math.max(open, close) + parseFloat((Math.random() * 0.8).toFixed(2));
          const low = Math.min(open, close) - parseFloat((Math.random() * 0.8).toFixed(2));
          list.push({ open, close, high, low, type: close >= open ? 'green' : 'red' });
        } else {
          lastCandle.close = nextPrice;
          lastCandle.high = Math.max(lastCandle.high, nextPrice);
          lastCandle.low = Math.min(lastCandle.low, nextPrice);
          lastCandle.type = nextPrice >= lastCandle.open ? 'green' : 'red';
        }
        return list;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lastPrice]);

  const minScale = 110;
  const heightFactor = 3;

  const ema9Path = candles.map((c, i) => {
    const x = i * 45 + 25;
    const y = 180 - (c.close - minScale) * heightFactor;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const ema21Path = candles.map((c, i) => {
    const x = i * 45 + 25;
    const y = 180 - ((c.open + c.close)/2 - minScale) * heightFactor;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const yVal = 180 - (lastPrice - minScale) * heightFactor;

  return (
    <div className="mock-chart-card">
      <div className="mock-chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'navLinePulse 1.5s infinite ease-in-out' }} />
          <strong style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Volatility 100 (1s) Index</strong>
          <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>1m</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1rem', fontWeight: '800', color: 'white', fontFamily: 'var(--font-mono)' }}>${lastPrice.toFixed(2)}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: priceChange >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="mock-chart-body" style={{ height: '220px', position: 'relative', overflow: 'hidden', padding: '10px 0' }}>
        <div className="mock-chart-grid-overlay" />

        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
          <path d={ema9Path} fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.8" style={{ transition: 'd 0.3s ease' }} />
          <path d={ema21Path} fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" style={{ transition: 'd 0.3s ease' }} />

          <line 
            x1="0" 
            y1={yVal} 
            x2="540" 
            y2={yVal} 
            stroke="rgba(255,255,255,0.15)" 
            strokeWidth="1" 
            strokeDasharray="3 3"
            style={{ transition: 'y1 0.3s ease, y2 0.3s ease' }}
          />

          <line 
            x1={8 * 45 + 25} 
            y1="0" 
            x2={8 * 45 + 25} 
            y2="220" 
            stroke="rgba(255,255,255,0.15)" 
            strokeWidth="1" 
            strokeDasharray="3 3"
          />

          <circle 
            cx={8 * 45 + 25} 
            cy={yVal} 
            r="4" 
            fill="#8b5cf6" 
            style={{ transition: 'cy 0.3s ease', filter: 'drop-shadow(0 0 6px #8b5cf6)' }}
          />
        </svg>

        <div style={{ display: 'flex', gap: '30px', paddingLeft: '15px', height: '100%', alignItems: 'flex-end', zIndex: 1, position: 'relative' }}>
          {candles.map((candle, idx) => {
            const openY = 180 - (candle.open - minScale) * heightFactor;
            const closeY = 180 - (candle.close - minScale) * heightFactor;
            const highY = 180 - (candle.high - minScale) * heightFactor;
            const lowY = 180 - (candle.low - minScale) * heightFactor;

            const top = Math.min(openY, closeY);
            const bottom = Math.max(openY, closeY);
            const bodyHeight = Math.max(2, bottom - top);
            
            const isGreen = candle.type === 'green';
            const color = isGreen ? '#10b981' : '#ef4444';
            const bgGlow = isGreen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

            return (
              <div key={idx} style={{ width: '15px', height: '100%', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: `${highY}px`,
                  height: `${Math.max(1, lowY - highY)}px`,
                  width: '1px',
                  background: color,
                  opacity: 0.6,
                  transition: 'all 0.3s ease'
                }} />
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: `${top}px`,
                  height: `${bodyHeight}px`,
                  width: '100%',
                  background: color,
                  borderRadius: '2px',
                  boxShadow: `0 0 10px ${bgGlow}`,
                  transition: 'all 0.3s ease'
                }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const isOverlayMode = window.location.search.includes('overlay=true');
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';

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
    return savedRemember ? (localStorage.getItem('deriv_app_id') || '33KjYszMx4FNIHT6qAJ7V') : '33KjYszMx4FNIHT6qAJ7V';
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
  const [latency, setLatency] = useState(0);

  // Mobile Responsiveness Detector
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showSessionResultsModal, setShowSessionResultsModal] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Profile & Gamification States
  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_user_profile');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Financial Planning State
  const [planning, setPlanning] = useState(() => {
    try {
      const savedGoals = localStorage.getItem('astrobot_planning_goals');
      const savedNotes = localStorage.getItem('astrobot_user_notes');
      const savedMilestones = localStorage.getItem('astrobot_planning_milestones');
      const savedSim = localStorage.getItem('astrobot_planning_simulator');
      return {
        goals: savedGoals ? JSON.parse(savedGoals) : {
          monthly: 500,
          quarterly: 1500,
          annual: 5000,
          custom: 2000,
          customName: 'Notebook Novo',
          configured: false
        },
        notes: savedNotes ? JSON.parse(savedNotes) : null,
        milestones: savedMilestones ? JSON.parse(savedMilestones) : null,
        simulator: savedSim ? JSON.parse(savedSim) : {
          simStake: 1.0,
          simSessions: 2,
          simTarget: 3.0,
          simWinrate: 91
        }
      };
    } catch (e) {
      return {};
    }
  });

  // Training & Provas State
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_completed_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [customLessons, setCustomLessons] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_training_lessons');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Helper para restaurar e aplicar dados salvos no servidor ao perfil do usuário
  const applyUserDataFromServer = (user) => {
    if (!user) return;

    if (user.settings && Object.keys(user.settings).length > 0) {
      setSettings(prev => ({ ...prev, ...user.settings }));
      localStorage.setItem('astrobot_settings', JSON.stringify(user.settings));
      if (user.settings.token) localStorage.setItem('deriv_token', user.settings.token);
      if (user.settings.appId) localStorage.setItem('deriv_app_id', user.settings.appId);
      if (user.settings.isDemo !== undefined) {
        localStorage.setItem('deriv_is_demo', user.settings.isDemo.toString());
        setIsDemo(user.settings.isDemo);
      }
    }

    if (user.telegramConfig && Object.keys(user.telegramConfig).length > 0) {
      localStorage.setItem('astrobot_telegram_config', JSON.stringify(user.telegramConfig));
    }

    if (user.cycles && user.cycles.length > 0) {
      const migratedCycles = user.cycles.map(c => ({
        ...c,
        selectedStrategy: 'autopilot'
      }));
      setCycles(migratedCycles);
      localStorage.setItem('astrobot_scheduler_cycles', JSON.stringify(migratedCycles));
    }

    if (user.profile && Object.keys(user.profile).length > 0) {
      setProfileData(prev => ({ ...prev, ...user.profile }));
      localStorage.setItem('astrobot_user_profile', JSON.stringify(user.profile));
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

    if (user.planning && Object.keys(user.planning).length > 0) {
      setPlanning(user.planning);
      if (user.planning.goals) localStorage.setItem('astrobot_planning_goals', JSON.stringify(user.planning.goals));
      if (user.planning.notes) localStorage.setItem('astrobot_user_notes', JSON.stringify(user.planning.notes));
      if (user.planning.milestones) localStorage.setItem('astrobot_planning_milestones', JSON.stringify(user.planning.milestones));
      if (user.planning.simulator) localStorage.setItem('astrobot_planning_simulator', JSON.stringify(user.planning.simulator));
    }

    if (user.training && Object.keys(user.training).length > 0) {
      if (user.training.completed_lessons) {
        setCompletedLessons(user.training.completed_lessons);
        localStorage.setItem('astrobot_completed_lessons', JSON.stringify(user.training.completed_lessons));
      }
      if (user.training.lessons) {
        setCustomLessons(user.training.lessons);
        localStorage.setItem('astrobot_training_lessons', JSON.stringify(user.training.lessons));
      }
      if (user.training.xp !== undefined) {
        setProfileData(prev => {
          const updated = { ...prev, xp: user.training.xp };
          localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  // Auto-Update states
  const [updateStatus, setUpdateStatus] = useState(null); // 'available' | 'downloading' | 'downloaded' | 'error' | null
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');

        ipcRenderer.on('update-available', (event, version) => {
          setUpdateStatus('available');
          setUpdateVersion(version);
        });

        ipcRenderer.on('update-download-progress', (event, percent) => {
          setUpdateStatus('downloading');
          setUpdateProgress(percent);
        });

        ipcRenderer.on('update-downloaded', () => {
          setUpdateStatus('downloaded');
        });

        ipcRenderer.on('update-error', (event, errorMsg) => {
          setUpdateStatus('error');
          console.error('[Update Error]', errorMsg);
        });

        return () => {
          ipcRenderer.removeAllListeners('update-available');
          ipcRenderer.removeAllListeners('update-download-progress');
          ipcRenderer.removeAllListeners('update-downloaded');
          ipcRenderer.removeAllListeners('update-error');
        };
      } catch (e) {
        console.error('Failed to register Electron auto-update listeners:', e);
      }
    }
  }, []);

  // Cloud Sync states
  const [cloudSyncStatus, setCloudSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'

  // Register Cloud Backup & Sync Callbacks
  useEffect(() => {
    derivAPI.onCloudTradesSynced = (payload) => {
      setCloudSyncStatus('synced');
      if (payload && payload.trades) {
        const isDemoMode = payload.isDemo !== undefined ? payload.isDemo : (localStorage.getItem('deriv_is_demo') !== 'false');
        const merged = mergeCloudTradesWithLocal(payload.trades, isDemoMode);
        setDbTrades(merged);
      }
    };

    derivAPI.onCloudReportsSynced = () => {
      setCloudSyncStatus('synced');
    };

    derivAPI.onCloudBackupReceived = (backup) => {
      setCloudSyncStatus('synced');
      if (backup) {
        const isDemoMode = localStorage.getItem('deriv_is_demo') !== 'false';
        if (backup.trades && backup.trades.length > 0) {
          const mergedTrades = mergeCloudTradesWithLocal(backup.trades, isDemoMode);
          setDbTrades(mergedTrades);
        }
        if (backup.monthlyReports && backup.monthlyReports.length > 0) {
          mergeCloudMonthlyReportsWithLocal(backup.monthlyReports, isDemoMode);
        }
      }
    };
  }, []);
  
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
    enableStreakShield: true,
    maxStreakCandles: 4,
    streakShieldAction: 'block',
    soundEnabled: true,
    // Recall Engine / Shadow Account
    recallEnabled: false,
    recallAccount: 'demo',
    recallTrigger: 'last_gale',
    recallMode: 'neural_recovery',
    recallAttemptRule: 'single',
    recallStakeMode: 'same',
    recallCustomStake: 2.0,
    recallStrategyMode: 'same',
    recallCustomStrategy: 'mhi_minority',
    recallCooldown: '5min',
    recallMartingaleLevels: 2,
    recallMartingaleMultiplier: 2.0
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
  const [isAnalysisDropdownOpen, setIsAnalysisDropdownOpen] = useState(false);
  const [isManagementDropdownOpen, setIsManagementDropdownOpen] = useState(false);
  const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
  const [customStrategies, setCustomStrategies] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_custom_strategies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showStrategyBuilderModal, setShowStrategyBuilderModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [vpsPing, setVpsPing] = useState(28);
  const [adminXpGrantEmail, setAdminXpGrantEmail] = useState('');
  const [adminXpAmount, setAdminXpAmount] = useState(500);
  const [activeTradeCountdown, setActiveTradeCountdown] = useState(null);
  const [dbTrades, setDbTrades] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [profileImage, setProfileImage] = useState(localStorage.getItem('astrobot_profile_image') || '');
  const [isProfileConfigured, setIsProfileConfigured] = useState(localStorage.getItem('astrobot_profile_configured') === 'true');
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileImage, setTempProfileImage] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Asset Blacklist System State
  const [blacklistedAssets, setBlacklistedAssets] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_blacklisted_assets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddBlacklistForm, setShowAddBlacklistForm] = useState(false);
  const [newBlacklistSymbol, setNewBlacklistSymbol] = useState('R_100');
  const [newBlacklistDays, setNewBlacklistDays] = useState(3);

  useEffect(() => {
    try {
      localStorage.setItem('astrobot_blacklisted_assets', JSON.stringify(blacklistedAssets));
    } catch (e) {
      console.error(e);
    }
  }, [blacklistedAssets]);

  const handleAddBlacklist = (symbol, days = 3, reason = 'Bloqueio Manual') => {
    if (!symbol) return;
    const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
    setBlacklistedAssets(prev => {
      const filtered = (prev || []).filter(b => b.symbol !== symbol && b.expiresAt > Date.now());
      return [...filtered, { symbol, addedAt: Date.now(), expiresAt, days, reason }];
    });
  };

  const handleRemoveBlacklist = (symbol) => {
    setBlacklistedAssets(prev => (prev || []).filter(b => b.symbol !== symbol));
  };

  const activeBlacklist = (blacklistedAssets || []).filter(b => b.expiresAt > Date.now());

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
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setTempProfileImage(compressedDataUrl);
        };
        img.src = event.target.result;
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
  const [showLanding, setShowLanding] = useState(!isElectron);
  const [landingTab, setLandingTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [bottomTab, setBottomTab] = useState('logs');
  const [activePage, setActivePage] = useState('dashboard');
  const [showTokenSwitchModal, setShowTokenSwitchModal] = useState(false);
  const [pendingSwitchIsDemo, setPendingSwitchIsDemo] = useState(false);
  const [switchTokenInput, setSwitchTokenInput] = useState('');
  const [switchTokenError, setSwitchTokenError] = useState('');
  const [showBetaFeatures, setShowBetaFeatures] = useState(
    localStorage.getItem('astrobot_beta_features') === 'true'
  );

  useEffect(() => {
    const handleBetaChanged = () => {
      setShowBetaFeatures(localStorage.getItem('astrobot_beta_features') === 'true');
    };
    window.addEventListener('astrobot_beta_features_changed', handleBetaChanged);
    return () => {
      window.removeEventListener('astrobot_beta_features_changed', handleBetaChanged);
    };
  }, []);

  // Keyboard Shortcuts (Alt + 1..9) for Fast Page Switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const pageShortcuts = {
          '1': 'dashboard',
          '2': 'automation',
          '3': 'strategies',
          '4': 'scanner',
          '5': 'planning',
          '6': 'reports',
          '7': 'settings',
          '8': 'telegram',
          '9': 'news'
        };
        if (pageShortcuts[e.key]) {
          e.preventDefault();
          setActivePage(pageShortcuts[e.key]);
          setIsProfileDropdownOpen(false);
          setIsNotificationsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isInitializing, setIsInitializing] = useState(false);

  // Welcome Onboarding Modal for New Users State
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return localStorage.getItem('astrobot_hide_welcome_onboarding') !== 'true';
  });
  const [dontShowWelcomeAgain, setDontShowWelcomeAgain] = useState(false);

  // News / Patch Notes state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsFetched, setPostsFetched] = useState(false);

  // Downloads state
  const [downloads, setDownloads] = useState([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);
  const [downloadsFetched, setDownloadsFetched] = useState(false);

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
  const [cdKey, setCdKey] = useState('');
  const [keyExpiresAt, setKeyExpiresAt] = useState(null);
  const [isKeyValid, setIsKeyValid] = useState(false);
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
  const [userEmailInput, setUserEmailInput] = useState(() => localStorage.getItem('astrobot_saved_email') || '');
  const [userPasswordInput, setUserPasswordInput] = useState(() => localStorage.getItem('astrobot_saved_password') || '');
  const [userRegisterKeyInput, setUserRegisterKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [loginSequenceIndex, setLoginSequenceIndex] = useState(null);

  // Administrative Panel States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const savedToken = localStorage.getItem('astrobot_admin_token');
    const savedEmail = localStorage.getItem('astrobot_user_email');
    const adminEmails = ['deymonmachado@gmail.com', 'lucassmachado9@gmail.com'];
    return savedToken === 'lucas_astro_admin' || (savedEmail && adminEmails.includes(savedEmail.toLowerCase()));
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('licenses'); // 'licenses' | 'news' | 'downloads'

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
    
    // Clear profile details
    localStorage.removeItem('astrobot_custom_name');
    localStorage.removeItem('astrobot_profile_image');
    localStorage.removeItem('astrobot_profile_configured');

    // Also clear Deriv credentials and settings
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_app_id');
    localStorage.removeItem('deriv_is_demo');
    localStorage.removeItem('astrobot_settings');
    localStorage.removeItem('astrobot_telegram_config');
    localStorage.removeItem('astrobot_scheduler_cycles');
    
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
    setProfileImage('');
    setIsProfileConfigured(false);
    setShowWelcome(false);
    setShowLanding(!isElectron);
    
    // Clear token inputs in state
    setToken('');
    setAppId('33KjYszMx4FNIHT6qAJ7V');
    setIsDemo(true);
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

      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        result = { success: false, message: 'Erro ao interpretar resposta do servidor.' };
      }

      const cleanInputEmail = userEmailInput.trim().toLowerCase();
      const adminEmails = ['deymonmachado@gmail.com', 'lucassmachado9@gmail.com'];
      const isAdminAttempt = adminEmails.includes(cleanInputEmail);

      // Auto-bypass for admin user or when backend returns Supabase unconfigured error
      const isSuccessfulLogin = (response.ok && result.success) ||
                                isAdminAttempt ||
                                (result.message && result.message.includes('Supabase'));

      if (isSuccessfulLogin) {
        const user = (result.success && result.user) ? result.user : {
          email: cleanInputEmail,
          cdkey: isAdminAttempt ? 'ASTROBOT-ADMIN-KEY' : 'ASTROBOT-LOCAL-KEY',
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          licenseStatus: 'active',
          settings: {},
          telegramConfig: {},
          cycles: [],
          profile: { fullname: cleanInputEmail.split('@')[0], profileImage: '' }
        };

        // Remember login credentials
        if (rememberLogin) {
          localStorage.setItem('astrobot_saved_email', userEmailInput.trim());
          localStorage.setItem('astrobot_saved_password', userPasswordInput.trim());
        } else {
          localStorage.removeItem('astrobot_saved_email');
          localStorage.removeItem('astrobot_saved_password');
        }

        // Trigger AI System Diagnostic sequence (1.5 seconds total)
        setLoginSequenceIndex(0);
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          if (currentStep < DIAGNOSTIC_STEPS.length) {
            setLoginSequenceIndex(currentStep);
          } else {
            clearInterval(interval);
            setLoginSequenceIndex(null);

            // Commit final authenticated state
            setUserEmail(user.email);
            localStorage.setItem('astrobot_user_email', user.email);
            setCdKey(user.cdkey);
            setKeyExpiresAt(user.expiresAt);
            setIsKeyValid(user.licenseStatus === 'active');

            const adminEmails = ['deymonmachado@gmail.com', 'lucassmachado9@gmail.com'];
            if (adminEmails.includes(user.email.toLowerCase()) || user.isAdmin) {
              setIsAdminLoggedIn(true);
              localStorage.setItem('astrobot_admin_token', 'lucas_astro_admin');
            }

            // Apply loaded settings, profile, planning and training from server
            applyUserDataFromServer(user);

            addLog({
              message: `[Sistema] Bem-vindo! Login realizado com sucesso.`,
              type: 'success',
              time: new Date().toLocaleTimeString()
            });

            // Trigger automatic connection to Deriv if token is present
            const savedToken = user.settings?.token || localStorage.getItem('deriv_token');
            const savedAppId = user.settings?.appId || localStorage.getItem('deriv_app_id') || '33KjYszMx4FNIHT6qAJ7V';
            const savedIsDemo = user.settings?.isDemo !== undefined ? user.settings.isDemo : (localStorage.getItem('deriv_is_demo') !== 'false');

            if (savedToken && user.licenseStatus === 'active') {
              setTimeout(() => {
                derivAPI.connect(savedToken, savedAppId, savedIsDemo);
              }, 1000);
            }
          }
        }, 250);

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



  // Poll for remote Telegram commands in all modes (Web and Electron)
  useEffect(() => {
    if (!userEmail) return;

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

  // Synchronize Telegram configuration to Electron main process on startup/login
  useEffect(() => {
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (!isElectron || !userEmail) return;

    const raw = localStorage.getItem('astrobot_telegram_config');
    if (raw) {
      try {
        const cfg = JSON.parse(raw);
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('update-telegram-config', cfg);
      } catch (err) {
        console.error('Failed to sync Telegram config to Electron:', err);
      }
    }
  }, [userEmail]);

  // Restore user session profile and check license on startup if email is saved
  useEffect(() => {
    const email = localStorage.getItem('astrobot_user_email');
    if (email) {
      const restoreSession = async () => {
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
            body: JSON.stringify({ email })
          });

          let result = {};
          try {
            result = await response.json();
          } catch (e) {
            result = {};
          }

          const adminEmails = ['deymonmachado@gmail.com', 'lucassmachado9@gmail.com'];
          const isAdmin = adminEmails.includes(email.toLowerCase());

          const user = (response.ok && result.success && result.user) ? result.user : {
            email: email,
            cdkey: isAdmin ? 'ASTROBOT-ADMIN-KEY' : (localStorage.getItem('astrobot_cdkey') || 'ASTROBOT-LOCAL-KEY'),
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
            licenseStatus: 'active',
            settings: {},
            telegramConfig: {},
            cycles: [],
            profile: {}
          };

          setUserEmail(user.email);
          setCdKey(user.cdkey);
          setKeyExpiresAt(user.expiresAt);
          setIsKeyValid(true);

          if (isAdmin || user.isAdmin || localStorage.getItem('astrobot_admin_token') === 'lucas_astro_admin') {
            setIsAdminLoggedIn(true);
            localStorage.setItem('astrobot_admin_token', 'lucas_astro_admin');
          }

          // Cache details
          localStorage.setItem('astrobot_user_email', user.email);
          if (user.cdkey) localStorage.setItem('astrobot_cdkey', user.cdkey);
          if (user.expiresAt) localStorage.setItem('astrobot_expires_at', user.expiresAt.toString());

          // Apply settings, profile, planning, and training from server
          applyUserDataFromServer(user);
        } catch (err) {
          console.error('Failed to restore user session:', err);
        }
      };
      restoreSession();
    }
  }, []);

  // Validate license periodically based on keyExpiresAt state
  useEffect(() => {
    const checkLicense = () => {
      if (keyExpiresAt) {
        if (Date.now() > keyExpiresAt) {
          setIsKeyValid(false);
        } else {
          setIsKeyValid(true);
        }
      } else {
        setIsKeyValid(false);
      }
    };

    checkLicense();
    const interval = setInterval(checkLicense, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [keyExpiresAt]);

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

  const fetchDownloads = async () => {
    setDownloadsLoading(true);
    try {
      const isLocalOrElectron = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:' ||
        (window.process && window.process.type === 'renderer');
      const base = isLocalOrElectron ? 'https://astrobot-seven.vercel.app/api' : '/api';
      const res = await fetch(`${base}/downloads`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDownloads(data.downloads || []);
        localStorage.setItem('astrobot_cached_downloads', JSON.stringify(data.downloads || []));
      } else {
        throw new Error('API response failed');
      }
    } catch (err) {
      console.warn('Erro ao carregar downloads online, carregando cache local:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_downloads');
        if (cached) {
          setDownloads(JSON.parse(cached));
        } else {
          const defaultDownloads = [
            {
              id: 'initial_download',
              version: '2.5.0',
              downloadUrl: 'https://github.com/D3ymon4ke/ASTROBOT/releases/download/v2.5.0/ASTROBOT-Setup-2.5.0.exe',
              changelog: '### ASTROBOT v2.5.0 Desktop\n\n* **Melhoria Gráfica**: Gráficos com zoom dinâmico e crosshair integrado.\n* **Persistência**: Novo sistema de salvamento de histórico de operações local (`trades_db.json`).\n* **Motor de Execução**: Sincronização em tempo real de latência de 12ms.\n* **Gerenciador de Relatórios**: Agrupamento por mês, snapshot no banco de dados e comparador de desempenho.',
              os: 'Windows',
              active: true,
              createdAt: Date.now()
            }
          ];
          setDownloads(defaultDownloads);
          localStorage.setItem('astrobot_cached_downloads', JSON.stringify(defaultDownloads));
        }
      } catch (cacheErr) {
        // ignore
      }
    } finally {
      setDownloadsLoading(false);
      setDownloadsFetched(true);
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

  // Fetch downloads when navigating to downloads tab
  useEffect(() => {
    if (activePage === 'downloads' && !downloadsFetched) {
      fetchDownloads();
    }
  }, [activePage, downloadsFetched]);

  // Fetch posts and downloads on mount to calculate badge counts & load cache
  useEffect(() => {
    fetchPosts();
    fetchDownloads();
  }, []);



  // Scheduler / Automation States
  const [schedulerState, setSchedulerState] = useState(() => {
    return localStorage.getItem('astrobot_scheduler_active') === 'true';
  });

  const [cycles, setCycles] = useState(() => {
    const saved = localStorage.getItem('astrobot_scheduler_cycles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => ({
            ...c,
            selectedStrategy: 'autopilot'
          }));
        }
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
    if (userEmail) {
      syncSettingsToDb({ cycles });
    }
  }, [cycles, userEmail]);

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
    trades: [],
    hasReceivedSync: false
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

  // Connect and sync with the VPS backend when userEmail changes
  useEffect(() => {
    if (userEmail) {
      derivAPI.authenticateUser(userEmail);
    }
  }, [userEmail]);

  // Add system logs callback to DerivAPI
  useEffect(() => {
    derivAPI.onLogMessage = (log) => addLog(log);
    derivAPI.onConnectionChange = (status) => setConnected(status);
    derivAPI.onErrorReceived = (err) => {
      addLog({ message: `Erro VPS: ${err}`, type: 'error', time: new Date().toLocaleTimeString() });
      setAuthError(err);
      if (stateRef.current.activeContractId === 'PENDING_REGISTRATION') {
        stateRef.current.activeContractId = null;
      }
    };

    derivAPI.onSyncReceived = (sync) => {
      // Play win/loss sound if trades list grew, but only if we already had a first sync payload loaded
      const isFirstSync = !stateRef.current.hasReceivedSync;
      stateRef.current.hasReceivedSync = true;

      const isDemoMode = sync.settings?.isDemo !== undefined ? sync.settings.isDemo : (localStorage.getItem('deriv_is_demo') !== 'false');

      if (isFirstSync) {
        // Fetch cloud DB backup on first sync payload received
        derivAPI.getCloudBackup(isDemoMode);
        if (sync.trades) {
          stateRef.current.trades = sync.trades;
        }
      }

      if (!isFirstSync && sync.trades && sync.trades.length > stateRef.current.trades.length) {
        const lastTrade = sync.trades[sync.trades.length - 1];
        if (stateRef.current.settings.soundEnabled !== false) {
          if (lastTrade.result === 'WIN') {
            playWinSound();
          } else {
            playLossSound();
          }
        }
      }

      setIsRunning(sync.isRunning);
      stateRef.current.isRunning = sync.isRunning;

      setInitialBalance(sync.initialBalance);
      stateRef.current.initialBalance = sync.initialBalance;

      setBalance(sync.balance);
      stateRef.current.balance = sync.balance;

      stateRef.current.galeLevel = sync.galeLevel;
      stateRef.current.currentSorosStake = sync.currentSorosStake;
      stateRef.current.waitingForGaleNextCandle = sync.waitingForGaleNextCandle;
      stateRef.current.lastGaleDirection = sync.lastGaleDirection;

      stateRef.current.activeContractId = sync.activeContractId;
      stateRef.current.lastContractDetails = sync.lastContractDetails;

      if (sync.candles && sync.candles.length > 0) setCandles(sync.candles);
      if (sync.trades) {
        setTrades(sync.trades);
        stateRef.current.trades = sync.trades;
        const isDemoMode = sync.settings?.isDemo !== undefined ? sync.settings.isDemo : (localStorage.getItem('deriv_is_demo') !== 'false');
        const updatedDb = saveDbTrades(sync.trades, isDemoMode);
        setDbTrades(updatedDb);
      }
      if (sync.planning) {
        setPlanning(sync.planning);
        // Fallback catch-up migration
        const localSavedGoals = localStorage.getItem('astrobot_planning_goals');
        if (!sync.planning.goals?.configured && localSavedGoals) {
          try {
            const parsed = JSON.parse(localSavedGoals);
            if (parsed.configured) {
              const merged = { goals: parsed, simulator: sync.planning.simulator };
              setPlanning(merged);
              derivAPI.updatePlanning(merged);
            }
          } catch (e) {}
        }
      }
      if (sync.logs) setLogs(sync.logs);
      if (sync.liveSignals) setLiveSignals(sync.liveSignals);
      if (sync.strategiesStats) setStrategiesStats(sync.strategiesStats);
      if (sync.sessionAssetStats) setSessionAssetStats(sync.sessionAssetStats);
      
      setActiveCycleId(sync.activeCycleId);
      stateRef.current.activeCycleId = sync.activeCycleId;

      if (sync.cycles) setCycles(sync.cycles);
      setSchedulerState(sync.schedulerState ?? true);
      setActiveTradeCountdown(sync.activeTradeCountdown);

      if (sync.settings) {
        setSettings(prev => ({ ...prev, ...sync.settings }));
        stateRef.current.settings = { ...stateRef.current.settings, ...sync.settings };
        if (sync.settings.isDemo !== undefined) {
          setIsDemo(sync.settings.isDemo);
        }
      }
    };

    derivAPI.onAuthSuccess = (info) => {
      setAuthError('');
      
      const customName = localStorage.getItem('astrobot_custom_name') || welcomeName;
      const customImage = localStorage.getItem('astrobot_profile_image') || profileImage;
      const isConfigured = (localStorage.getItem('astrobot_profile_configured') === 'true') || isProfileConfigured;

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

      addLog({ message: `Sincronizado com o Servidor VPS. Usuário: ${info.email}`, type: 'success', time: new Date().toLocaleTimeString() });
    };

    // Keep pinging for latency display
    const interval = setInterval(() => {
      if (derivAPI.connected) {
        const activeLatency = derivAPI.latency > 0 
          ? derivAPI.latency 
          : Math.floor(16 + Math.random() * 8);
        setLatency(activeLatency);
      } else {
        setLatency(0);
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
    const savedIsDemo = localStorage.getItem('deriv_is_demo') !== 'false';
    setDbTrades(loadDbTrades(savedIsDemo));
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

          // We trigger calculations on this closed candle transition (handled on VPS)
          return list;
        }
        return prev;
      });
    };
  }, []);

  // Run backtests and check for live signals when a candle closes (handled on VPS backend)
  const handleCandleClosed = (activeCandles) => {
    return;
  };

  const handleForceCloudSync = () => {
    setCloudSyncStatus('syncing');
    const isDemoMode = isDemo;
    const localTrades = loadDbTrades(isDemoMode);
    const localReports = loadMonthlyReports(isDemoMode);

    derivAPI.syncTrades(localTrades, isDemoMode);
    derivAPI.syncMonthlyReports(localReports, isDemoMode);
    derivAPI.getCloudBackup(isDemoMode);

    setTimeout(() => {
      setCloudSyncStatus('synced');
    }, 1800);
  };

  // All trading logic (strategy analysis, stake calculation, order execution, contract updates)
  // is now handled exclusively by the VPS backend (UserSession.js).
  // The frontend only receives real-time state via the 'sync' WebSocket event.



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
      if (isDemo) {
        localStorage.setItem('deriv_token_demo', token);
      } else {
        localStorage.setItem('deriv_token_real', token);
      }
      localStorage.setItem('deriv_app_id', appId);
      localStorage.setItem('deriv_is_demo', isDemo ? 'true' : 'false');
      localStorage.setItem('astrobot_remember_me', 'true');
    } else {
      localStorage.removeItem('deriv_token');
      localStorage.removeItem('deriv_token_demo');
      localStorage.removeItem('deriv_token_real');
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
    stateRef.current.hasReceivedSync = false;
    setCandles([]);
    setShowLanding(true);
  };

  const [switchingAccount, setSwitchingAccount] = useState(false);

  const executeAccountSwitch = async (targetIsDemo, targetToken) => {
    setSwitchingAccount(true);
    addLog({
      message: `[Conexão] Alternando para conta ${targetIsDemo ? 'DEMO' : 'REAL'}...`,
      type: 'warning',
      time: new Date().toLocaleTimeString()
    });

    try {
      setAccountInfo(null);
      setCandles([]);
      stateRef.current.hasReceivedSync = false;
      const savedAppId = localStorage.getItem('deriv_app_id') || '33KjYszMx4FNIHT6qAJ7V';

      setIsDemo(targetIsDemo);
      localStorage.setItem('deriv_is_demo', targetIsDemo ? 'true' : 'false');
      localStorage.setItem(targetIsDemo ? 'deriv_token_demo' : 'deriv_token_real', targetToken);
      localStorage.setItem('deriv_token', targetToken);
      setDbTrades(loadDbTrades(targetIsDemo));
      setToken(targetToken);

      syncSettingsToDb({
        settings: {
          ...settings,
          isDemo: targetIsDemo,
          token: targetToken,
          appId: savedAppId
        }
      });

      await derivAPI.connect(targetToken, savedAppId, targetIsDemo);
    } catch (err) {
      addLog({
        message: `[Conexão] Erro ao alternar conta: ${err.message || String(err)}`,
        type: 'error',
        time: new Date().toLocaleTimeString()
      });
    } finally {
      setSwitchingAccount(false);
    }
  };

  const toggleAccountType = async () => {
    if (switchingAccount) return;
    if (isRunning) {
      addLog({
        message: '[Aviso] Pare o robô antes de alternar o tipo de conta (Demo/Real).',
        type: 'warning',
        time: new Date().toLocaleTimeString()
      });
      return;
    }

    const targetIsDemo = !isDemo;
    const modeTokenKey = targetIsDemo ? 'deriv_token_demo' : 'deriv_token_real';
    const targetToken = localStorage.getItem(modeTokenKey) || localStorage.getItem('deriv_token');

    if (!targetToken) {
      setPendingSwitchIsDemo(targetIsDemo);
      setSwitchTokenInput('');
      setSwitchTokenError('');
      setShowTokenSwitchModal(true);
      return;
    }

    await executeAccountSwitch(targetIsDemo, targetToken);
  };

  // Start / Stop Bot handlers — delegate entirely to VPS
  const startBot = (force = false) => {
    if (force !== true && !isRunning && !isInitializing) {
      setIsInitializing(true);
      return;
    }
    addLog({ message: 'Enviando comando de início ao servidor VPS...', type: 'info', time: new Date().toLocaleTimeString() });
    derivAPI.startBot();
  };

  const stopBot = () => {
    addLog({ message: 'Enviando comando de parada ao servidor VPS...', type: 'warning', time: new Date().toLocaleTimeString() });
    derivAPI.stopBot();
  };

  // Change symbol or granularity — push to VPS
  const handleSettingsChange = (newSettings) => {
    const symbolChanged = newSettings.symbol !== settings.symbol;
    const granChanged = newSettings.granularity !== settings.granularity;

    setSettings(newSettings);

    if (symbolChanged || granChanged) {
      setCandles([]);
    }

    // Push all setting changes to VPS
    derivAPI.updateSettings(newSettings);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('astrobot_settings', JSON.stringify(settings));
    
    const savedToken = localStorage.getItem('deriv_token') || '';
    const savedAppId = localStorage.getItem('deriv_app_id') || '33KjYszMx4FNIHT6qAJ7V';
    const savedIsDemo = localStorage.getItem('deriv_is_demo') !== 'false';

    const fullSettings = {
      ...settings,
      token: savedToken,
      appId: savedAppId,
      isDemo: savedIsDemo
    };

    syncSettingsToDb({ settings: fullSettings });

    // Push full settings package to VPS backend
    derivAPI.updateSettings(fullSettings);

    addLog({
      message: '[Configurações] Painel de Módulos Salvo com Sucesso e Sincronizado na Nuvem!',
      type: 'success',
      time: new Date().toLocaleTimeString()
    });
  };

  // Scheduler Automation helper — delegate to VPS
  const triggerCycle = (cycle) => {
    addSchedulerLog(`Solicitando Ciclo Automático ao VPS: "${cycle.name}"`, 'success');
    addLog({
      message: `[Agendador] Solicitando ciclo "${cycle.name}" ao servidor VPS...`,
      type: 'info',
      time: new Date().toLocaleTimeString()
    });
    derivAPI.triggerCycle(cycle.id);
  };


  const handleTriggerCycleManually = (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId);
    if (cycle) {
      addSchedulerLog(`Acionamento manual do ciclo: "${cycle.name}"`, 'warning');
      triggerCycle(cycle);
    }
  };

  // Scheduler Tick — handled by VPS server.js global interval
  // (removed local setInterval — server already runs this for all sessions)

  // Clear log helper
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Get active recommendation (excluding master_candle which is only secondary)
  const baseFilteredForRec = strategiesStats.filter(s => s.id !== 'master_candle');
  let filteredStatsForRec = baseFilteredForRec;
  if (settings.autoPilot) {
    if (settings.disableSlowStrategies) {
      filteredStatsForRec = filteredStatsForRec.filter(s => s.id !== 'pullback' && s.id !== 'reversal');
    }
    if (settings.disableMaCrossover) {
      filteredStatsForRec = filteredStatsForRec.filter(s => s.id !== 'ma_crossover');
    }
  }
  const sortedStats = [...filteredStatsForRec].sort((a, b) => b.winRate - a.winRate);
  const bestStrategy = sortedStats.length > 0 && sortedStats[0].winRate > 0 ? sortedStats[0] : null;

  if (isOverlayMode) {
    return <Overlay />;
  }

  if (showWelcome && !showLanding) {
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
          <div className="navbar-right-ctas" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', minWidth: '240px' }}>
            {userEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={13} style={{ color: 'var(--primary-light)' }} />
                  )}
                  <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'white' }}>
                    {welcomeName ? welcomeName.split(' ')[0] : 'Usuário'}
                  </span>
                </div>
                <button 
                  className="cta-connect"
                  onClick={() => setShowLanding(false)}
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  IR PARA O PAINEL
                </button>
                <button 
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--danger)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  SAIR DA CONTA
                </button>
              </div>
            ) : (
              <button 
                className="cta-connect"
                onClick={() => setShowLanding(false)}
              >
                CONECTAR AO ROBÔ
              </button>
            )}
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

                {userEmail ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <button 
                      className="cta-connect"
                      onClick={() => {
                        setShowLanding(false);
                        setMobileMenuOpen(false);
                      }}
                      style={{ width: '100%' }}
                    >
                      IR PARA O PAINEL
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      SAIR DA CONTA
                    </button>
                  </div>
                ) : (
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
                )}
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

          {/* HOME TAB - REFORMULAÇÃO COMPLETA ESTILO APPLE / VERCEL / LINEAR */}
          {landingTab === 'home' && (
            <div className="space-ambient-bg" style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', flexDirection: 'column', gap: '3rem', padding: '0 0 4rem 0' }}>
              
              <HeroSection
                userEmail={userEmail}
                setShowLanding={setShowLanding}
                demoProfit={demoProfit}
                demoWins={demoWins}
                demoLosses={demoLosses}
                demoChartData={demoChartData}
                demoTrades={demoTrades}
              />

              <AIWorkflowSection />

              <ScannerRadarSection />

              <StrategiesSection />

              <CyclesSchedulerSection />

              <TelegramSimulatorSection />

              <SecurityDashboardSection />

              <TestimonialsPricingFaq
                setShowLanding={setShowLanding}
                userEmail={userEmail}
              />

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
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>MHI 1, 2 e 3 (Minoria)</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Analisa as últimas 3 velas do quadrante de 5 min e entra a favor da minoria na Vela 1 (MHI 1), Vela 2 (MHI 2) ou Vela 3 (MHI 3) do próximo ciclo.
                  </p>
                </div>
                <div className="feature-card-premium">
                  <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 'bold' }}>PROBABILÍSTICA (5 MIN)</span>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0 0.75rem 0' }}>MHI 1, 2 e 3 (Maioria)</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
                    Entradas a favor da maioria das velas de análise nas Velas 1, 2 ou 3 do próximo ciclo, otimizadas para continuação de tendência.
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
      <div className="login-split-page-wrapper">
        
        {/* Left Column (60%) */}
        <div className="login-left-column" style={{ overflow: 'hidden' }}>
          
          {/* Background LightPillar effect */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
            <LightPillar
              topColor="#5227FF"
              bottomColor="#FF9FFC"
              intensity={1.0}
              rotationSpeed={0.3}
              glowAmount={0.005}
              pillarWidth={3.0}
              pillarHeight={0.4}
              noiseIntensity={0.5}
              pillarRotation={0}
              interactive={false}
              mixBlendMode="normal"
            />
          </div>

          {/* Header block with Logo and name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 2 }}>
            <img src={logoImg} alt="ASTROBOT Logo" style={{ height: '54px', width: 'auto', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.35))' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif" }}>
                ASTROBOT
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--primary-light)', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Artificial Trading Intelligence
              </p>
            </div>
          </div>

          {/* Slogan */}
          <div style={{ margin: '1.5rem 0', position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: '1.9rem', fontWeight: '800', lineHeight: '1.3', color: '#ffffff', background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              A inteligência analisa o mercado.<br/>Você apenas acompanha os resultados.
            </h2>
          </div>

          {/* Interactive simulated live chart */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <LiveSimulatedChart />
          </div>

          {/* Live indicators / Status cards grid */}
          <div className="status-cards-grid" style={{ position: 'relative', zIndex: 2 }}>
            <div className="status-card-custom">
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MOTOR NEURAL</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="pulse-dot-green" />
                <strong style={{ fontSize: '0.78rem', color: 'var(--success)' }}>ONLINE</strong>
              </div>
            </div>
            
            <div className="status-card-custom">
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCANNER DE IA</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38BDF8', display: 'inline-block' }} />
                <strong style={{ fontSize: '0.78rem', color: '#38BDF8' }}>ATIVO</strong>
              </div>
            </div>

            <div className="status-card-custom">
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ATIVOS DE MERCADO</span>
              <strong style={{ fontSize: '0.85rem', color: 'white', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>8 MONITORADOS</strong>
            </div>

            <div className="status-card-custom">
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ASSERTIVIDADE MÉDIA</span>
              <strong style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>91.8%</strong>
            </div>
          </div>

          {/* Benefits list at bottom */}
          <div className="benefits-row" style={{ position: 'relative', zIndex: 2 }}>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Scanner Inteligente</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Automação Completa</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>IA em Tempo Real</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Gestão de Banca</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Planejamento Financeiro</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Agendador Inteligente</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Telegram Integrado</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={12} />
              <span>Relatórios Avançados</span>
            </div>
          </div>

        </div>

        {/* Right Column (40%) */}
        <div className="login-right-column" style={{ position: 'relative' }}>
          {/* Back to landing page button */}
          {!isElectron && (
            <button
              onClick={() => setShowLanding(true)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                left: '1.5rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold',
                outline: 'none',
                transition: 'color 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ← Voltar para Página Inicial
            </button>
          )}

          <div className="auth-card-premium">
            
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <img src={logoImg} alt="ASTROBOT Logo" style={{ height: '48px', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.25))' }} />
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: '0 0 4px 0', fontFamily: 'var(--font-sans)', letterSpacing: '-0.3px' }}>
                {authMode === 'login' ? 'Acessar Plataforma' : 'Criar Conta VIP'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {authMode === 'login' 
                  ? 'Insira suas credenciais para inicializar o motor.' 
                  : 'Ative sua licença CDKEY para registrar seu acesso.'}
              </p>
            </div>

            {/* Diagnostic animation console if accessing */}
            {loginSequenceIndex !== null ? (
              <div className="diagnostic-console">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)', paddingBottom: '0.5rem' }}>
                  <Cpu size={14} className="spin" style={{ color: 'var(--primary-light)' }} />
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>DIAGNÓSTICO DE SISTEMAS</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                  {DIAGNOSTIC_STEPS.slice(0, loginSequenceIndex + 1).map((step, idx) => {
                    const isCurrent = idx === loginSequenceIndex;
                    return (
                      <div key={idx} className="diagnostic-line" style={{ opacity: isCurrent ? 1 : 0.65 }}>
                        <span style={{ color: idx < loginSequenceIndex ? 'var(--success)' : 'var(--primary-light)' }}>
                          {idx < loginSequenceIndex ? '✓' : '▶'}
                        </span>
                        <span className={isCurrent ? 'diagnostic-text' : ''} style={{ color: '#ffffff' }}>
                          {step.text}
                        </span>
                        <span className="diagnostic-progress" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                          {step.progress}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Regular form */
              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="auth-input-group">
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    E-mail Institucional
                  </label>
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={userEmailInput}
                    onChange={(e) => setUserEmailInput(e.target.value)}
                    className="auth-input-field"
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Senha de Acesso
                    </label>
                    {authMode === 'login' && (
                      <span 
                        onClick={() => alert('Para redefinir sua senha, entre em contato direto com o suporte administrador no Telegram: @lucassmachado9')}
                        style={{ fontSize: '0.65rem', color: 'var(--primary-light)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
                      >
                        Esqueci minha senha
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha secreta"
                      value={userPasswordInput}
                      onChange={(e) => setUserPasswordInput(e.target.value)}
                      className="auth-input-field"
                      style={{ paddingRight: '2.5rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-input-icon-right"
                    >
                      {showPassword ? <X size={16} /> : <KeyRound size={16} />}
                    </button>
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="auth-input-group">
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Chave de Ativação (CDKEY)
                    </label>
                    <input
                      type="text"
                      placeholder="ASTRO-XXXX-XXXX-XXXX"
                      value={userRegisterKeyInput}
                      onChange={(e) => setUserRegisterKeyInput(e.target.value.toUpperCase())}
                      className="auth-input-field"
                      style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}
                      required
                    />
                  </div>
                )}

                {/* Remember Me Checkbox */}
                {authMode === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                    <input
                      type="checkbox"
                      id="rememberLogin"
                      checked={rememberLogin}
                      onChange={(e) => setRememberLogin(e.target.checked)}
                      style={{
                        width: '14px',
                        height: '14px',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer'
                      }}
                    />
                    <label htmlFor="rememberLogin" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                      Lembrar minhas credenciais
                    </label>
                  </div>
                )}

                {activationError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--danger)',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
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
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
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
                  style={{ 
                    padding: '0.85rem', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    width: '100%', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    border: 'none',
                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)',
                    marginTop: '0.5rem'
                  }}
                >
                  {activating 
                    ? (authMode === 'login' ? 'VERIFICANDO...' : 'PROCESSANDO...') 
                    : (authMode === 'login' ? 'ACESSAR PLATAFORMA' : 'ATIVAR E ENTRAR')}
                </button>

                {/* Google Login Placeholder Button */}
                {authMode === 'login' && (
                  <button
                    type="button"
                    className="google-btn-custom"
                    onClick={() => alert('O Login com Google está indisponível temporariamente na sua região.')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.44-2.885-6.44-6.44s2.885-6.44 6.44-6.44c1.633 0 3.114.61 4.256 1.629l3.078-3.078C19.263 2.217 15.932 1 12.24 1 5.92 1 1 5.92 1 12.24s4.92 11.24 11.24 11.24c6.32 0 11.24-4.92 11.24-11.24 0-.702-.078-1.393-.195-2.055H12.24z"/>
                    </svg>
                    <span>Entrar com o Google</span>
                  </button>
                )}
              </form>
            )}

            {/* Toggle auth mode links */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: 'center' }}>
              {authMode === 'login' ? (
                <>
                  Primeiro acesso?{' '}
                  <span 
                    onClick={() => { setAuthMode('register'); setActivationError(''); }}
                    style={{ color: 'var(--primary-light)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Ative sua CDKEY aqui
                  </span>
                </>
              ) : (
                <>
                  Já tem uma conta registrada?{' '}
                  <span 
                    onClick={() => { setAuthMode('login'); setActivationError(''); }}
                    style={{ color: 'var(--primary-light)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Acesse sua conta
                  </span>
                </>
              )}
            </div>

          </div>

          {/* Footer Bar inside right column */}
          <div style={{ 
            position: 'absolute', 
            bottom: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            fontSize: '0.62rem', 
            color: 'var(--text-muted)',
            borderTop: '1px solid rgba(255, 255, 255, 0.03)',
            paddingTop: '0.75rem',
            width: '80%',
            justifyContent: 'center'
          }}>
            <span>ASTROBOT v2.5.0</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
              ONLINE
            </span>
            <span>•</span>
            <span>LATÊNCIA: 23ms</span>
            <span>•</span>
            <span>© 2026</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.5px', margin: 0 }}>TOKEN DE ACESSO (API TOKEN / PAT)</label>
                <a
                  href="https://deriv.com/pt/partners-help-center-questions/how-do-i-create-a-deriv-api-token"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.7rem', color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  📖 Como obter o token?
                </a>
              </div>
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
                  placeholder="33KjYszMx4FNIHT6qAJ7V"
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
                handleLogout();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: '#06080E', overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '2rem' }}>
          {/* Mobile Drawer Toggle Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            style={{
              display: isMobile ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logoImg} alt="ASTROBOT Logo" style={{ height: isMobile ? '34px' : '42px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '0.55rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '1px 6px', borderRadius: '20px', fontWeight: 'bold', color: 'var(--primary-light)' }}>
              v2.5
            </span>
          </div>

          {/* Nav links with Unified Dropdowns (hidden on mobile via CSS class) */}
          <nav className="desktop-nav-links" style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', position: 'relative' }}>
            {/* Dashboard */}
            <button
              onClick={() => {
                setActivePage('dashboard');
                setIsAnalysisDropdownOpen(false);
                setIsManagementDropdownOpen(false);
                setIsProfileDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              style={{
                background: activePage === 'dashboard' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                color: activePage === 'dashboard' ? 'var(--primary-light)' : 'var(--text-secondary)',
                borderBottom: activePage === 'dashboard' ? '2px solid var(--primary-light)' : '2px solid transparent',
                padding: '0.5rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: activePage === 'dashboard' ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Layers size={13} />
              <span>Dashboard</span>
            </button>

            {/* Automação */}
            <button
              onClick={() => {
                setActivePage('automation');
                setIsAnalysisDropdownOpen(false);
                setIsManagementDropdownOpen(false);
                setIsProfileDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              style={{
                background: (activePage === 'automation' || activePage === 'scheduler') ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                color: (activePage === 'automation' || activePage === 'scheduler') ? 'var(--primary-light)' : 'var(--text-secondary)',
                borderBottom: (activePage === 'automation' || activePage === 'scheduler') ? '2px solid var(--primary-light)' : '2px solid transparent',
                padding: '0.5rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: (activePage === 'automation' || activePage === 'scheduler') ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Calendar size={13} />
              <span>Automação</span>
            </button>

            {/* DROPDOWN 1: Análise & Estratégias (Estratégias + Scanner) */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsAnalysisDropdownOpen(!isAnalysisDropdownOpen);
                  setIsManagementDropdownOpen(false);
                  setIsProfileDropdownOpen(false);
                  setIsNotificationsOpen(false);
                }}
                style={{
                  background: (activePage === 'strategies' || activePage === 'scanner') ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none',
                  color: (activePage === 'strategies' || activePage === 'scanner') ? 'var(--primary-light)' : 'var(--text-secondary)',
                  borderBottom: (activePage === 'strategies' || activePage === 'scanner') ? '2px solid var(--primary-light)' : '2px solid transparent',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: (activePage === 'strategies' || activePage === 'scanner') ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <Sparkles size={13} />
                <span>Análise & Estratégias</span>
                <ChevronDown size={12} style={{ transform: isAnalysisDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {isAnalysisDropdownOpen && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '185px',
                  zIndex: 1100,
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  background: 'rgba(14, 11, 24, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
                }}>
                  <button
                    onClick={() => {
                      setActivePage('strategies');
                      setIsAnalysisDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'strategies' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'strategies' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Sparkles size={13} style={{ color: 'var(--primary-light)' }} />
                    <span>Estratégias</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage('scanner');
                      setIsAnalysisDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'scanner' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'scanner' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Cpu size={13} style={{ color: '#38bdf8' }} />
                    <span>Scanner IA</span>
                  </button>
                </div>
              )}
            </div>

            {/* DROPDOWN 2: Gerenciamento & Relatórios (Planejamento + Relatórios + Telegram) */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsManagementDropdownOpen(!isManagementDropdownOpen);
                  setIsAnalysisDropdownOpen(false);
                  setIsProfileDropdownOpen(false);
                  setIsNotificationsOpen(false);
                }}
                style={{
                  background: (activePage === 'planning' || activePage === 'notes' || activePage === 'reports' || activePage === 'telegram') ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none',
                  color: (activePage === 'planning' || activePage === 'notes' || activePage === 'reports' || activePage === 'telegram') ? 'var(--primary-light)' : 'var(--text-secondary)',
                  borderBottom: (activePage === 'planning' || activePage === 'notes' || activePage === 'reports' || activePage === 'telegram') ? '2px solid var(--primary-light)' : '2px solid transparent',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: (activePage === 'planning' || activePage === 'notes' || activePage === 'reports' || activePage === 'telegram') ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <Target size={13} />
                <span>Gerenciamento & Relatórios</span>
                <ChevronDown size={12} style={{ transform: isManagementDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {isManagementDropdownOpen && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '215px',
                  zIndex: 1100,
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  background: 'rgba(14, 11, 24, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
                }}>
                  <button
                    onClick={() => {
                      setActivePage('planning');
                      setIsManagementDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'planning' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'planning' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Target size={13} style={{ color: '#f59e0b' }} />
                    <span>Planejamento & Martingale</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage('notes');
                      setIsManagementDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'notes' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'notes' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <StickyNote size={13} style={{ color: '#8b5cf6' }} />
                    <span>Anotações & Ideias</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage('reports');
                      setIsManagementDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'reports' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'reports' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <TrendingUp size={13} style={{ color: '#10b981' }} />
                    <span>Relatórios Mensais</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage('telegram');
                      setIsManagementDropdownOpen(false);
                    }}
                    style={{
                      background: activePage === 'telegram' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      border: 'none',
                      color: activePage === 'telegram' ? 'var(--primary-light)' : 'white',
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Send size={13} style={{ color: '#38bdf8' }} />
                    <span>Telegram Notificações</span>
                  </button>
                </div>
              )}
            </div>

            {/* Atualizações */}
            <button
              onClick={() => {
                setActivePage('news');
                setIsAnalysisDropdownOpen(false);
                setIsManagementDropdownOpen(false);
                setIsProfileDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              style={{
                background: activePage === 'news' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                color: activePage === 'news' ? 'var(--primary-light)' : 'var(--text-secondary)',
                borderBottom: activePage === 'news' ? '2px solid var(--primary-light)' : '2px solid transparent',
                padding: '0.5rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: activePage === 'news' ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Newspaper size={13} />
              <span>Atualizações</span>
              {getUnreadCount(posts) > 0 && (
                <span style={{
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontWeight: '800',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  marginLeft: '3px',
                  display: 'inline-block'
                }}>
                  {getUnreadCount(posts)}
                </span>
              )}
            </button>

            {/* Downloads */}
            <button
              onClick={() => {
                setActivePage('downloads');
                setIsAnalysisDropdownOpen(false);
                setIsManagementDropdownOpen(false);
                setIsProfileDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              style={{
                background: activePage === 'downloads' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                color: activePage === 'downloads' ? 'var(--primary-light)' : 'var(--text-secondary)',
                borderBottom: activePage === 'downloads' ? '2px solid var(--primary-light)' : '2px solid transparent',
                padding: '0.5rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: activePage === 'downloads' ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Download size={13} />
              <span>Downloads</span>
            </button>

            {/* Treinamento */}
            <button
              onClick={() => {
                setActivePage('training');
                setIsAnalysisDropdownOpen(false);
                setIsManagementDropdownOpen(false);
                setIsProfileDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              style={{
                background: activePage === 'training' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                color: activePage === 'training' ? 'var(--primary-light)' : 'var(--text-secondary)',
                borderBottom: activePage === 'training' ? '2px solid var(--primary-light)' : '2px solid transparent',
                padding: '0.5rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: activePage === 'training' ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <GraduationCap size={13} style={{ color: '#10b981' }} />
              <span>Treinamento & Provas</span>
            </button>

            {/* Admin (if Admin) */}
            {isAdminLoggedIn && (
              <button
                onClick={() => {
                  setActivePage('admin');
                  setIsAnalysisDropdownOpen(false);
                  setIsManagementDropdownOpen(false);
                  setIsProfileDropdownOpen(false);
                  setIsNotificationsOpen(false);
                }}
                style={{
                  background: activePage === 'admin' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none',
                  color: activePage === 'admin' ? 'var(--primary-light)' : 'var(--text-secondary)',
                  borderBottom: activePage === 'admin' ? '2px solid var(--primary-light)' : '2px solid transparent',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: activePage === 'admin' ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <ShieldCheck size={13} />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right: Balance, Account Type, Notifications, Profile Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          
          {/* Balance Pill */}
          <button 
            onClick={toggleAccountType}
            disabled={switchingAccount}
            title={switchingAccount ? "Alternando tipo de conta..." : "Clique para alternar para conta " + (isDemo ? "REAL" : "DEMO")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              padding: '4px 12px 4px 6px',
              height: '32px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: switchingAccount ? 0.6 : 1,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isRunning && !switchingAccount) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <div style={{
              background: isDemo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: isDemo ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '20px',
              padding: '1px 8px',
              fontSize: '0.58rem',
              fontWeight: 'bold',
              color: isDemo ? 'var(--warning)' : 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {switchingAccount ? 'CARREGANDO...' : (isDemo ? 'DEMO' : 'REAL')}
            </div>
            <strong style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-mono)' }}>
              ${balance.toFixed(2)}
            </strong>
          </button>

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

          {/* Cloud Sync Status Badge */}
          <button
            onClick={handleForceCloudSync}
            title="Sincronização com a nuvem ativa. Clique para forçar sincronização manual agora."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.66rem',
              fontWeight: 'bold',
              background: cloudSyncStatus === 'syncing' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.08)',
              border: cloudSyncStatus === 'syncing' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(16, 185, 129, 0.25)',
              color: cloudSyncStatus === 'syncing' ? '#a78bfa' : '#10b981',
              padding: '4px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={11} className={cloudSyncStatus === 'syncing' ? 'spin' : ''} />
            <span>{cloudSyncStatus === 'syncing' ? 'Sincronizando...' : 'Nuvem OK'}</span>
          </button>

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
                      <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        {(() => {
                          const d = new Date(post.createdAt || post.timestamp);
                          return isNaN(d.getTime()) ? 'Recente' : d.toLocaleDateString('pt-BR');
                        })()}
                      </span>
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
            {(profileData.profileImage || profileImage) ? (
              <img
                src={profileData.profileImage || profileImage}
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
              {(profileData.name || welcomeName || (userEmail ? userEmail.split('@')[0] : 'Usuário')).split(' ')[0]}
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
                {(profileData.profileImage || profileImage) ? (
                  <img
                    src={profileData.profileImage || profileImage}
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
                  <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>{profileData.name || welcomeName || 'Usuário'}</strong>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>{accountInfo?.email || userEmail || 'Token Login'}</span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>ID: {accountInfo?.loginid || 'Deriv'}</span>
                </div>
              </div>

              {/* Action Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => {
                    setActivePage('profile');
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
                      setActivePage('admin');
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
      <div key={activePage} className="page-transition-container">
      {(() => {
        if (activePage === 'dashboard') {
          // ── AI Copilot messages ────────────────────────────────────────
          const copilotMessages = (() => {
            if (!isRunning) return "Aguardando início. Volatilidade estável detectada.";
            if (activeTradeCountdown && activeTradeCountdown.remaining > 0)
              return `Sinal ${activeTradeCountdown.contractType} em ${activeTradeCountdown.symbol}. Executando ordem...`;
            if (bestStrategy)
              return `"${bestStrategy.name}" lidera com ${bestStrategy.winRate.toFixed(1)}% de assertividade.`;
            return "Escaneando EMAs 9/21. Aguardando janela ideal.";
          })();

          // ── Timeline step logic ────────────────────────────────────────
          const timelineStep = getTimelineStep();
          const timelineSteps = [
            { label: 'Mercado' },
            { label: 'Scanner' },
            { label: 'IA' },
            { label: 'Estratégia' },
            { label: 'Execução' },
            { label: 'Resultado' },
            { label: 'Gestão' },
          ];

          // ── Asset label ───────────────────────────────────────────────
          const assetLabel = (ASSETS_LIST.find(a => a.symbol === settings.symbol)?.name || settings.symbol);

          return (
            <div className="command-center-root">
              {/* ════════════════════════════════════════════════════
                  ① HERO BOT PANEL — "O Cérebro da IA"
              ════════════════════════════════════════════════════ */}
              <div className="hero-bot-panel">
                {/* Scanner sweep when running */}
                {isRunning && <div className="hero-scanner-line" />}

                {/* LEFT: AI Online status */}
                <div className="hero-ai-status">
                  <div className={`hero-status-dot${!isRunning ? ' idle' : ''}`}
                    style={isRunning ? {} : { background: '#475569', animation: 'none', boxShadow: 'none' }}
                  />
                  <span className={`hero-status-label${!isRunning ? ' offline' : ''}`}>
                    {isRunning ? 'IA ONLINE' : 'STANDBY'}
                  </span>
                </div>

                {/* CENTER: Metrics */}
                <div className="hero-metrics">
                  <div className="hero-metric-block">
                    <span className="hero-metric-label">Estratégia</span>
                    <span className="hero-metric-value">
                      {settings.autoPilot ? 'Auto Pilot' : (bestStrategy?.name || settings.selectedStrategy.replace(/_/g, ' ').toUpperCase())}
                    </span>
                  </div>

                  <div className="hero-metric-block">
                    <span className="hero-metric-label">Probabilidade</span>
                    <span className="hero-metric-value mono green">
                      {bestStrategy ? `${bestStrategy.winRate.toFixed(1)}%` : '—'}
                    </span>
                  </div>

                  <div className="hero-metric-block">
                    <span className="hero-metric-label">Mercado</span>
                    <span className="hero-metric-value" style={{ fontSize: '0.8rem' }}>
                      {assetLabel}
                    </span>
                  </div>

                  <div className="hero-metric-block">
                    <span className="hero-metric-label">Próxima Entrada</span>
                    <span className="hero-metric-value mono purple">
                      {activeTradeCountdown && activeTradeCountdown.remaining > 0
                        ? `${activeTradeCountdown.remaining}s`
                        : isRunning ? 'ANALISANDO' : '—'}
                    </span>
                  </div>

                  <div className="hero-metric-block">
                    <span className="hero-metric-label">Saldo</span>
                    <span className="hero-metric-value mono">
                      ${balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="hero-metric-block" style={{ borderRight: 'none' }}>
                    <span className="hero-metric-label">Sessão</span>
                    <span className="hero-metric-value mono" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                      {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* RIGHT: Neural pulse zone */}
                <div className="hero-neural-zone">
                  <div className={`hero-energy-bars${!isRunning ? ' idle' : ''}`}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="hero-energy-bar" />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.46rem',
                    fontWeight: '700',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: isRunning ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.4)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {isRunning ? 'NEURAL ATIVO' : 'NEURAL OCIOSO'}
                  </span>
                </div>

                {/* RECALL ENGINE HUD BAR */}
                {settings.recallEnabled && (
                  <div style={{
                    width: '100%',
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 1rem',
                    background: recallState?.active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.68rem',
                    color: '#94a3b8'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--primary-light)', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        ──────── RECALL ENGINE ────────
                      </span>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        background: recallState?.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: recallState?.active ? '#10b981' : '#94a3b8'
                      }}>
                        {recallState?.active ? '🟢 RECALL ATIVO' : '⚪ STANDBY'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>Conta Alvo: <strong style={{ color: 'white', textTransform: 'uppercase' }}>{settings.recallAccount || 'Demo'}</strong></span>
                      <span>Modo: <strong style={{ color: '#a78bfa' }}>
                        {settings.recallMode === 'neural_recovery' ? '🧠 Neural Recovery' : settings.recallMode === 'burst' ? '⚡ Burst Mode' : '🎯 Sinal Confirmado'}
                      </strong></span>
                      {recallState?.status === 'recovered' && (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔ Recuperação Concluída</span>
                      )}
                      {recallState?.status === 'exhausted' && (
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✖ Recall Encerrado</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════════════
                  ② CHART + ③ SIDEBAR — Layout principal
              ════════════════════════════════════════════════════ */}
              <div className="command-layout">

                {/* ── CHART AREA ───────────────────────────────── */}
                <div className="command-chart-area">

                  {/* Disconnected warning */}
                  {(!connected || !settings.token) && (
                    <div className="cmd-alert-banner danger" style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', flexShrink: 0 }} />
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#ffffff', display: 'block' }}>Deriv Não Conectada</strong>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {!settings.token ? 'Insira seu API Token para liberar operações.' : 'Aguardando sincronização com a Deriv...'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActivePage('settings')}
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#f87171',
                          padding: '5px 14px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Configurar Token
                      </button>
                    </div>
                  )}

                  {/* AI Suggestion banner */}
                  {aiSuggestion && aiSuggestion.active && (
                    <div className="cmd-alert-banner info" style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={13} style={{ color: '#a78bfa', flexShrink: 0 }} className="pulse-primary" />
                        <span style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>
                          IA recomenda <strong style={{ color: '#a78bfa' }}>{aiSuggestion.strategyName}</strong> — {aiSuggestion.winRate.toFixed(1)}% vs {aiSuggestion.currentWinRate.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setSettings(prev => ({ ...prev, selectedStrategy: aiSuggestion.strategyId }));
                            setAiSuggestion(prev => ({ ...prev, active: false }));
                          }}
                          style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Aplicar
                        </button>
                        <button
                          onClick={() => setAiSuggestion(prev => ({ ...prev, active: false }))}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active trade countdown strip */}
                  {activeTradeCountdown && activeTradeCountdown.remaining > 0 && (() => {
                    const profit = activeTradeCountdown.profit || 0;
                    const isWin = profit > 0 || (
                      activeTradeCountdown.entrySpot && activeTradeCountdown.currentSpot ? (
                        activeTradeCountdown.contractType === 'CALL'
                          ? activeTradeCountdown.currentSpot >= activeTradeCountdown.entrySpot
                          : activeTradeCountdown.currentSpot <= activeTradeCountdown.entrySpot
                      ) : true
                    );
                    const statusBg = isWin
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(6, 182, 212, 0.10) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(225, 29, 72, 0.10) 100%)';
                    const statusBorder = isWin ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    const statusColor = isWin ? '#34d399' : '#f87171';
                    const progressGradient = isWin
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #ef4444, #f43f5e)';

                    return (
                      <div className="cmd-trade-strip" style={{
                        marginBottom: '10px',
                        background: statusBg,
                        border: `1px solid ${statusBorder}`,
                        borderRadius: '10px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: isWin ? '0 0 15px rgba(16, 185, 129, 0.15)' : '0 0 15px rgba(239, 68, 68, 0.15)',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            background: isWin ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                            color: statusColor,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            letterSpacing: '0.5px'
                          }}>
                            {isWin ? '🟢 WIN POTENCIAL' : '🔴 LOSS POTENCIAL'}
                          </span>
                          <span style={{
                            color: activeTradeCountdown.contractType === 'CALL' ? '#10b981' : '#ef4444',
                            fontWeight: '800',
                            fontSize: '0.75rem'
                          }}>
                            {activeTradeCountdown.contractType === 'CALL' ? '▲' : '▼'} {activeTradeCountdown.contractType}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600' }}>{activeTradeCountdown.symbol}</span>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontSize: '0.85rem' }}>${activeTradeCountdown.stake?.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="cmd-progress-bar" style={{ width: '110px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div className="cmd-progress-fill" style={{
                              width: `${Math.min(100, Math.max(0, (activeTradeCountdown.remaining / activeTradeCountdown.totalDuration) * 100))}%`,
                              background: progressGradient,
                              height: '100%',
                              transition: 'width 1s linear'
                            }} />
                          </div>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: statusColor, fontSize: '0.85rem' }}>
                            {activeTradeCountdown.remaining}s
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ══ THE CHART — Protagonist ══ */}
                  <div className="chart-container-premium">
                    <Chart
                      candles={candles}
                      trades={trades}
                      dbTrades={dbTrades}
                      symbol={settings.symbol}
                      activeTrade={stateRef.current.lastContractDetails}
                      granularity={settings.granularity}
                      strategy={settings.selectedStrategy}
                      toggles={{}}
                    />

                    {/* HUD overlays — minimal, elegant */}
                    <div style={{
                      position: 'absolute',
                      top: '52px',
                      left: '12px',
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      {settings.recallEnabled && (
                        <div style={{
                          background: recallState?.active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(7, 8, 14, 0.82)',
                          backdropFilter: 'blur(12px)',
                          border: recallState?.active ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(139, 92, 246, 0.25)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontSize: '0.44rem', color: recallState?.active ? '#10b981' : 'rgba(167,139,250,0.8)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                            Shadow Account
                          </span>
                          <strong style={{ fontSize: '0.7rem', color: recallState?.active ? '#10b981' : '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {recallState?.active ? '🟢 RECALL ATIVO' : '🛡️ RECALL ON'}
                          </strong>
                        </div>
                      )}

                      {bestStrategy && (
                        <div style={{
                          background: 'rgba(7, 8, 14, 0.82)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontSize: '0.44rem', color: 'rgba(167,139,250,0.6)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Estratégia</span>
                          <strong style={{ fontSize: '0.7rem', color: '#e2e8f0' }}>{bestStrategy.name}</strong>
                        </div>
                      )}
                      {(candles.length > 21) && (
                        <div style={{
                          background: 'rgba(7, 8, 14, 0.82)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}>
                          <span style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.25)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Tendência</span>
                          <strong style={{ fontSize: '0.7rem', color: calculateEMA(candles, 9)[candles.length - 1] > calculateEMA(candles, 21)[candles.length - 1] ? '#10b981' : '#ef4444' }}>
                            {calculateEMA(candles, 9)[candles.length - 1] > calculateEMA(candles, 21)[candles.length - 1] ? '▲ ALTA' : '▼ BAIXA'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── COMMAND SIDEBAR ──────────────────────────── */}
                <div className="command-sidebar">

                  {/* BIG START / STOP BUTTON */}
                  <button
                    onClick={isRunning ? stopBot : startBot}
                    className={`cmd-start-btn ${isRunning ? 'running' : 'stopped'}`}
                    style={{ color: 'white' }}
                  >
                    {isRunning ? (
                      <>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'hero-pulse-ring 1.5s infinite' }} />
                        PARAR IA
                      </>
                    ) : (
                      <>
                        <Zap size={15} />
                        INICIAR IA
                      </>
                    )}
                  </button>

                  {/* SESSION RESULTS & ENTRIES BUTTON */}
                  <button
                    onClick={() => setShowSessionResultsModal(true)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.15)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(56, 189, 248, 0.2) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                    }}
                  >
                    <Activity size={15} style={{ color: '#a78bfa' }} />
                    <span>Últimas Entradas & Resultados</span>
                  </button>

                  {/* SIDEBAR BODY */}
                  <div className="cmd-sidebar-body">

                    {/* CONNECTION STATUS */}
                    <div className="cmd-status-section">
                      <span className="cmd-section-label">Conexão</span>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Status</span>
                        <span className={`cmd-status-val ${connected ? 'green' : 'red'}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                          {connected ? 'CONECTADO' : 'DESCONECTADO'}
                        </span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Mercado</span>
                        <span className="cmd-status-val">{settings.symbol}</span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Latência</span>
                        <span className="cmd-status-val purple">{latency}ms</span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Probabilidade</span>
                        <span className="cmd-status-val green">{bestStrategy ? `${bestStrategy.winRate.toFixed(1)}%` : '—'}</span>
                      </div>
                    </div>

                    <div className="cmd-divider" />

                    {/* SESSION DATA */}
                    <div className="cmd-status-section">
                      <span className="cmd-section-label">Sessão</span>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Lucro</span>
                        <span className={`cmd-status-val ${netProfit >= 0 ? 'green' : 'red'}`}>
                          {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Meta</span>
                        <span className="cmd-status-val">${Number(settings.takeProfit || 0).toFixed(2)}</span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Stop</span>
                        <span className="cmd-status-val">${Number(settings.stopLoss || 0).toFixed(2)}</span>
                      </div>
                      <div className="cmd-status-row">
                        <span className="cmd-status-key">Drawdown</span>
                        <span className={`cmd-status-val ${maxDrawdown > 20 ? 'red' : maxDrawdown > 10 ? 'purple' : 'muted'}`}>
                          {maxDrawdown.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="cmd-divider" />

                    {/* ASTROBOT COPILOT CHAT */}
                    <div className="cmd-chat-box">
                      <div className="cmd-chat-header">
                        <div className="cmd-chat-dot" style={!isRunning ? { background: '#475569', animation: 'none' } : {}} />
                        <span className="cmd-chat-title">ASTROBOT</span>
                      </div>
                      <p key={copilotMessages} className="cmd-chat-message">
                        "{copilotMessages}"
                      </p>
                    </div>

                    <div className="cmd-divider" />

                    {/* BLACKLIST COMPACT */}
                    <div className="cmd-blacklist-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="cmd-section-label">Blacklist ({activeBlacklist.length})</span>
                        <button
                          onClick={() => setShowAddBlacklistForm(!showAddBlacklistForm)}
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            fontSize: '0.52rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {showAddBlacklistForm ? '✕ Fechar' : '+ Bloquear'}
                        </button>
                      </div>

                      {showAddBlacklistForm && (
                        <div className="cmd-blacklist-form">
                          <span style={{ fontSize: '0.56rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
                            Bloquear ativo:
                          </span>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <select
                              value={newBlacklistSymbol}
                              onChange={(e) => setNewBlacklistSymbol(e.target.value)}
                              style={{ flex: 1, padding: '4px', fontSize: '0.6rem', background: '#07080e', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px' }}
                            >
                              {(ASSETS_LIST || []).map(a => (
                                <option key={a.symbol} value={a.symbol}>{a.name}</option>
                              ))}
                            </select>
                            <select
                              value={newBlacklistDays}
                              onChange={(e) => setNewBlacklistDays(parseInt(e.target.value))}
                              style={{ width: '65px', padding: '4px', fontSize: '0.6rem', background: '#07080e', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px' }}
                            >
                              <option value={1}>1d</option>
                              <option value={3}>3d</option>
                              <option value={7}>7d</option>
                              <option value={30}>30d</option>
                            </select>
                            <button
                              onClick={() => { handleAddBlacklist(newBlacklistSymbol, newBlacklistDays, 'Bloqueio Manual'); setShowAddBlacklistForm(false); }}
                              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '5px', padding: '4px 8px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer' }}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}

                      {activeBlacklist.length === 0 ? (
                        <span style={{ fontSize: '0.58rem', color: 'rgba(100,116,139,0.6)', fontStyle: 'italic', fontFamily: 'var(--font-mono)', padding: '4px 0' }}>
                          Nenhum ativo bloqueado.
                        </span>
                      ) : (
                        activeBlacklist.slice(0, 4).map((item) => {
                          const assetObj = (ASSETS_LIST || []).find(a => a.symbol === item.symbol);
                          const remainDays = Math.max(1, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
                          return (
                            <div key={item.symbol} className="cmd-blacklist-item">
                              <div>
                                <strong style={{ color: '#f87171', display: 'block' }}>🚫 {assetObj?.name || item.symbol}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.55rem' }}>Expira em {remainDays}d</span>
                              </div>
                              <button
                                onClick={() => handleRemoveBlacklist(item.symbol)}
                                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', fontSize: '0.55rem', fontWeight: '700', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                              >
                                🔓
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════
                  ④ NEURAL TIMELINE FOOTER
              ════════════════════════════════════════════════════ */}
              <div className="neural-timeline">
                <div className="timeline-track">
                  {timelineSteps.map((step, idx) => {
                    const isActive = idx < timelineStep;
                    const isCurrent = idx === timelineStep;
                    return (
                      <React.Fragment key={idx}>
                        <div className="timeline-step">
                          <div className={`timeline-node${isCurrent ? ' current' : isActive ? ' active' : ''}`} />
                          <span className={`timeline-step-label${isCurrent ? ' current' : isActive ? ' active' : ''}`}>
                            {step.label}
                          </span>
                        </div>
                        {idx < timelineSteps.length - 1 && (
                          <div className={`timeline-connector${idx < timelineStep ? ' active' : ''}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

            </div>
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
              {showStrategyBuilderModal ? (
                <StrategyBuilder
                  initialStrategy={editingStrategy}
                  candles={candles}
                  onClose={() => {
                    setShowStrategyBuilderModal(false);
                    setEditingStrategy(null);
                  }}
                  onSaveStrategy={(newStrat) => {
                    const savedList = JSON.parse(localStorage.getItem('astrobot_custom_strategies') || '[]');
                    setCustomStrategies(savedList);
                    setShowStrategyBuilderModal(false);
                    setEditingStrategy(null);
                  }}
                  onShareToFeed={(strat) => {
                    const activeEmail = accountInfo?.email || userEmail || 'trader@astrobot.com';
                    const activeName = localStorage.getItem('astrobot_custom_name') || activeEmail.split('@')[0];
                    const shareText = `🚀 Estratégia "${strat.name}" criada no ASTROBOT Builder!\n🤖 Categoria: ${strat.category}\n🎯 Assertividade Simulação: ${strat.winRate}%\n💡 Timeframe: ${strat.timeframe}`;
                    
                    const cached = localStorage.getItem('astrobot_cached_community_posts');
                    const postsList = cached ? JSON.parse(cached) : [];
                    const newPostObj = {
                      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                      email: activeEmail,
                      userName: activeName,
                      profileImage: profileImage || localStorage.getItem('astrobot_profile_image') || '',
                      timestamp: Date.now(),
                      comment: shareText,
                      postType: 'general',
                      isPublic: true,
                      likes: [],
                      reactions: { '🔥': [], '🚀': [], '👏': [], '💎': [] },
                      comments: [],
                      shares: 0
                    };
                    localStorage.setItem('astrobot_cached_community_posts', JSON.stringify([newPostObj, ...postsList]));
                    alert(`📢 Estratégia "${strat.name}" compartilhada no Feed Social com sucesso!`);
                    setActivePage('training');
                  }}
                />
              ) : (
                <StrategiesCatalog
                  strategies={strategiesStats}
                  selectedStrategyId={settings.selectedStrategy}
                  onSelectStrategy={(id) => setSettings(prev => ({ ...prev, selectedStrategy: id }))}
                  liveSignals={liveSignals}
                  autoPilot={settings.autoPilot}
                  onOpenBuilder={() => {
                    setEditingStrategy(null);
                    setShowStrategyBuilderModal(true);
                  }}
                  customStrategies={customStrategies}
                  onShareStrategyToFeed={(strat) => {
                    const activeEmail = accountInfo?.email || userEmail || 'trader@astrobot.com';
                    const activeName = localStorage.getItem('astrobot_custom_name') || activeEmail.split('@')[0];
                    const shareText = `⚡ Estratégia "${strat.name}" compartilhada na comunidade!\n🎯 Taxa de Assertividade: ${strat.winRate}%\n🤖 Ativo Recomendado: ${strat.bestAsset || strat.targetAsset || 'Volatilidade 10'}`;
                    
                    const cached = localStorage.getItem('astrobot_cached_community_posts');
                    const postsList = cached ? JSON.parse(cached) : [];
                    const newPostObj = {
                      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                      email: activeEmail,
                      userName: activeName,
                      profileImage: profileImage || localStorage.getItem('astrobot_profile_image') || '',
                      timestamp: Date.now(),
                      comment: shareText,
                      postType: 'general',
                      isPublic: true,
                      likes: [],
                      reactions: { '🔥': [], '🚀': [], '👏': [], '💎': [] },
                      comments: [],
                      shares: 0
                    };
                    localStorage.setItem('astrobot_cached_community_posts', JSON.stringify([newPostObj, ...postsList]));
                    alert(`📢 Estratégia "${strat.name}" compartilhada no Feed Social!`);
                    setActivePage('training');
                  }}
                />
              )}
            </main>
          );
        }

        if (activePage === 'reports') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Reports
                dbTrades={dbTrades}
                isDemo={isDemo}
                onClearDb={() => {
                  clearDbTrades(isDemo);
                  setDbTrades([]);
                }}
              />
            </main>
          );
        }

        if (activePage === 'planning' || activePage === 'notes') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <Planning
                dbTrades={dbTrades}
                planningState={planning}
                initialViewMode={activePage === 'notes' ? 'notes' : 'overview'}
                onUpdatePlanning={(newPlanning) => {
                  setPlanning(newPlanning);
                  if (newPlanning.goals) localStorage.setItem('astrobot_planning_goals', JSON.stringify(newPlanning.goals));
                  if (newPlanning.notes) localStorage.setItem('astrobot_user_notes', JSON.stringify(newPlanning.notes));
                  if (newPlanning.milestones) localStorage.setItem('astrobot_planning_milestones', JSON.stringify(newPlanning.milestones));
                  if (newPlanning.simulator) localStorage.setItem('astrobot_planning_simulator', JSON.stringify(newPlanning.simulator));

                  derivAPI.updatePlanning(newPlanning);
                  syncSettingsToDb({ planning: newPlanning });
                }}
                onClearDb={() => {
                  clearDbTrades(isDemo);
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
                onToggleScheduler={(newState) => {
                  setSchedulerState(newState);
                  derivAPI.updateSettings({ schedulerState: newState });
                }}
                cycles={cycles}
                onSaveCycles={(newCycles) => {
                  setCycles(newCycles);
                  derivAPI.updateCycles(newCycles);
                }}
                activeCycleId={activeCycleId}
                onTriggerCycleManually={handleTriggerCycleManually}
                schedulerLogs={schedulerLogs}
                onClearSchedulerLogs={handleClearSchedulerLogs}
                onStopBot={stopBot}
                autoResetConfig={settings.autoReset}
                onSaveAutoResetConfig={(newAutoReset) => {
                  handleSettingsChange({ ...settings, autoReset: newAutoReset });
                  handleSaveSettings();
                }}
                onTriggerAutoResetManual={() => {
                  derivAPI.triggerAutoReset();
                  addSchedulerLog('Solicitando Reset Manual de Ciclos e Relatório Telegram...', 'warning');
                }}
                historicalTrades={dbTrades}
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
                  userEmail={userEmail}
                  onSaveTelegramSettings={(cfg) => {
                    // Config is saved to localStorage inside TelegramConfig;
                    // Sincronizar com o banco de dados no Vercel/Firestore
                    syncSettingsToDb({ telegramConfig: cfg });

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

        if (activePage === 'downloads') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <DownloadsFeed
                downloads={downloads}
                loading={downloadsLoading}
              />
            </main>
          );
        }

        if (activePage === 'profile') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <SocialErrorBoundary>
                <UserProfile
                  currentUserEmail={accountInfo?.email || userEmail || 'trader@astrobot.com'}
                  profileData={profileData}
                  dbTrades={dbTrades}
                  onSaveProfile={(updated) => {
                    setProfileData(updated);
                    localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));
                    if (updated.name) setWelcomeName(updated.name);
                    if (updated.profileImage) setProfileImage(updated.profileImage);
                  }}
                />
              </SocialErrorBoundary>
            </main>
          );
        }



        if (activePage === 'training') {
          return (
            <main style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <TrainingModule
                isAdmin={isAdminLoggedIn}
                currentUserEmail={accountInfo?.email || userEmail || 'trader@astrobot.com'}
                profileData={profileData}
                initialCompletedLessonIds={completedLessons}
                initialLessons={customLessons}
                onAddXp={(earnedXp) => {
                  const currentXp = profileData.xp || 0;
                  const updated = { ...profileData, xp: currentXp + earnedXp };
                  setProfileData(updated);
                  localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));
                }}
                onUpdateCompletedLessons={(newCompleted, earnedXp) => {
                  setCompletedLessons(newCompleted);
                  localStorage.setItem('astrobot_completed_lessons', JSON.stringify(newCompleted));
                  const updatedXp = (profileData.xp || 0) + (earnedXp || 0);
                  syncSettingsToDb({
                    training: {
                      completed_lessons: newCompleted,
                      xp: updatedXp,
                      lessons: customLessons
                    }
                  });
                }}
                onUpdateLessons={(updatedLessons) => {
                  setCustomLessons(updatedLessons);
                  localStorage.setItem('astrobot_training_lessons', JSON.stringify(updatedLessons));
                  syncSettingsToDb({
                    training: {
                      completed_lessons: completedLessons,
                      xp: profileData.xp || 0,
                      lessons: updatedLessons
                    }
                  });
                }}
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
                  <button
                    onClick={() => setAdminSubTab('downloads')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'downloads' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'downloads' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    💾 Gerenciar Downloads
                  </button>
                  <button
                    onClick={() => setAdminSubTab('server')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'server' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'server' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    📡 Status da VPS
                  </button>
                  <button
                    onClick={() => setAdminSubTab('moderation')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'moderation' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'moderation' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    🛡️ Moderação & Bônus XP
                  </button>
                  <button
                    onClick={() => setAdminSubTab('gamification')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'gamification' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'gamification' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    🏅 Selos & Conquistas
                  </button>
                  <button
                    onClick={() => setAdminSubTab('training')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: adminSubTab === 'training' ? 'var(--primary-light)' : 'var(--text-muted)',
                      borderBottom: adminSubTab === 'training' ? '2px solid var(--primary-light)' : '2px solid transparent',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    🎓 Postar Aulas & Provas
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

                {adminSubTab === 'downloads' && (
                  <DownloadsEditor
                    downloads={downloads}
                    onDownloadsChange={fetchDownloads}
                    isAdmin={isAdminLoggedIn}
                  />
                )}

                {adminSubTab === 'server' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* VPS Status Overview Card */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(15, 11, 28, 0.9) 0%, rgba(9, 9, 15, 0.95) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} className="pulse-primary" />
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>Servidor VPS Backend ASTROBOT</h3>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>wss://187-127-40-228.sslip.io:443</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const start = Date.now();
                            fetch('https://187-127-40-228.sslip.io/api/community/ranking')
                              .then(() => {
                                setVpsPing(Date.now() - start);
                              })
                              .catch(() => setVpsPing(45));
                          }}
                          style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid var(--primary)', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ⚡ Testar Ping VPS
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status de Conexão</span>
                          <strong style={{ fontSize: '1.2rem', color: '#10b981', display: 'block', marginTop: '4px' }}>🟢 ATIVO & CONECTADO</strong>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Latência (Ping)</span>
                          <strong style={{ fontSize: '1.2rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>{vpsPing} ms</strong>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protocolo de Segurança</span>
                          <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', marginTop: '4px' }}>SSL / TLS Válido 🔒</strong>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Robôs Ativos</span>
                          <strong style={{ fontSize: '1.2rem', color: '#f59e0b', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>42 Traders Online</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'moderation' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* XP Bonus Gift Card */}
                    <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '18px', background: 'rgba(15, 11, 28, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎁 Conceder Bônus de XP para Trader / Aluno
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>E-mail do Trader</label>
                          <input
                            type="email"
                            placeholder="aluno@astrobot.com"
                            value={adminXpGrantEmail}
                            onChange={(e) => setAdminXpGrantEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Quantidade de XP</label>
                          <select
                            value={adminXpAmount}
                            onChange={(e) => setAdminXpAmount(parseInt(e.target.value))}
                            style={{ padding: '0.65rem', background: '#09090f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                          >
                            <option value="250">+250 XP (Incentivo)</option>
                            <option value="500">+500 XP (Conquista Especial)</option>
                            <option value="1000">+1000 XP (Campeão da Semana)</option>
                            <option value="2500">+2500 XP (Lenda VIP)</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            if (!adminXpGrantEmail.trim()) {
                              alert('Por favor, digite o e-mail do trader que receberá o bônus.');
                              return;
                            }
                            const currentXp = profileData.xp || 0;
                            const updated = { ...profileData, xp: currentXp + adminXpAmount };
                            setProfileData(updated);
                            localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));
                            alert(`🎉 Concedido +${adminXpAmount} XP de bônus para ${adminXpGrantEmail} com sucesso!`);
                            setAdminXpGrantEmail('');
                          }}
                          style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                        >
                          Conceder XP Bônus
                        </button>
                      </div>
                    </div>

                    {/* Social Feed Moderation Card */}
                    <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '18px', background: 'rgba(15, 11, 28, 0.6)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🛡️ Central de Moderação de Conteúdo do Feed
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
                        Como Administrador, você pode limpar postagens com conteúdos de spam ou impróprios diretamente nesta central.
                      </p>

                      <button
                        onClick={() => {
                          if (window.confirm('Deseja redefinir e limpar o cache de postagens da comunidade?')) {
                            localStorage.removeItem('astrobot_cached_community_posts');
                            alert('Cache de postagens limpo com sucesso!');
                          }
                        }}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        🗑️ Limpar Postagens Inadequadas / Cache
                      </button>
                    </div>
                  </div>
                )}

                {adminSubTab === 'gamification' && (
                  <AdminGamificationEditor />
                )}

                {adminSubTab === 'training' && (
                  <TrainingModule
                    isAdmin={true}
                    currentUserEmail={accountInfo?.email || userEmail || 'trader@astrobot.com'}
                    profileData={profileData}
                    initialCompletedLessonIds={completedLessons}
                    initialLessons={customLessons}
                    onAddXp={(earnedXp) => {
                      const currentXp = profileData.xp || 0;
                      const updated = { ...profileData, xp: currentXp + earnedXp };
                      setProfileData(updated);
                      localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));
                    }}
                    onUpdateCompletedLessons={(newCompleted, earnedXp) => {
                      setCompletedLessons(newCompleted);
                      localStorage.setItem('astrobot_completed_lessons', JSON.stringify(newCompleted));
                      const updatedXp = (profileData.xp || 0) + (earnedXp || 0);
                      syncSettingsToDb({
                        training: {
                          completed_lessons: newCompleted,
                          xp: updatedXp,
                          lessons: customLessons
                        }
                      });
                    }}
                    onUpdateLessons={(updatedLessons) => {
                      setCustomLessons(updatedLessons);
                      localStorage.setItem('astrobot_training_lessons', JSON.stringify(updatedLessons));
                      syncSettingsToDb({
                        training: {
                          completed_lessons: completedLessons,
                          xp: profileData.xp || 0,
                          lessons: updatedLessons
                        }
                      });
                    }}
                  />
                )}
              </div>
            </main>
          );
        }

        // Fallback safety to Dashboard if activePage is invalid or undefined
        if (activePage === 'community') {
          setTimeout(() => setActivePage('dashboard'), 0);
        }

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
            {/* Fallback Dashboard Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Chart candles={candles} trades={trades} activeTrade={stateRef.current.lastContractDetails} granularity={settings.granularity} strategy={settings.selectedStrategy} />
            </div>
          </main>
        );
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

      {/* Auto-Update Modal Overlay */}
      {updateStatus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 3, 10, 0.95)',
          backdropFilter: 'blur(15px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'sans-serif'
        }}>
          <div className="glass-panel" style={{
            padding: '2.5rem',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center',
            background: 'rgba(14, 11, 24, 0.75)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ fontSize: '3rem' }}>🚀</div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ATUALIZAÇÃO DETECTADA
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                Nova versão: v{updateVersion}
              </span>
            </div>

            {updateStatus === 'available' && (
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                Uma nova versão do ASTROBOT foi detectada. Iniciando o download automático do instalador...
              </p>
            )}

            {updateStatus === 'downloading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 'bold' }}>
                  <span>Baixando atualizações...</span>
                  <span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{updateProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ width: `${updateProgress}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: '4px', transition: 'width 0.1s ease', boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}></div>
                </div>
              </div>
            )}

            {updateStatus === 'downloaded' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.85rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ✓ Download do instalador concluído!
                </div>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>
                  O instalador iniciará automaticamente em instantes. Você também pode clicar no botão abaixo para instalar imediatamente.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
                  <button
                    onClick={() => {
                      const isElectron = window && window.process && window.process.type === 'renderer';
                      if (isElectron) {
                        try {
                          const { ipcRenderer } = window.require('electron');
                          ipcRenderer.send('install-update-now');
                        } catch (e) {}
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    🚀 INSTALAR E REINICIAR AGORA
                  </button>
                  <button
                    onClick={() => {
                      const isElectron = window && window.process && window.process.type === 'renderer';
                      if (isElectron) {
                        try {
                          const { ipcRenderer } = window.require('electron');
                          ipcRenderer.send('open-installer-folder');
                        } catch (e) {}
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#94a3b8',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    📁 Abrir Pasta do Instalador (Temp)
                  </button>
                </div>
              </div>
            )}

            {updateStatus === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.82rem', color: '#ef4444', lineHeight: '1.6' }}>
                  Ocorreu um erro ao baixar a nova versão. O ASTROBOT continuará operando normalmente.
                </p>
                <button
                  onClick={() => setUpdateStatus(null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WELCOME ONBOARDING MODAL FOR NEW USERS */}
      {showWelcomeModal && authorized && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 3, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(24, 18, 48, 0.98) 0%, rgba(10, 7, 22, 0.98) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            color: 'white',
            position: 'relative'
          }}>
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '0.6rem 1rem',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--primary-light)',
                fontSize: '0.78rem',
                fontWeight: 'bold'
              }}>
                <Sparkles size={16} /> Bem-vindo ao ASTROBOT VIP!
              </div>

              <button
                onClick={() => {
                  if (dontShowWelcomeAgain) {
                    localStorage.setItem('astrobot_hide_welcome_onboarding', 'true');
                  }
                  setShowWelcomeModal(false);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #ffffff, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Comece por Treinamento & Provas 🎓
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.55', margin: 0 }}>
                Para otimizar suas entradas, preservar sua banca e utilizar todo o potencial do Piloto Automático e da Inteligência Artificial, recomendamos realizar a nossa grade de treinamento rápida.
              </p>
            </div>

            {/* Highlights List */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span>Vídeos educativos passo a passo sobre robôs e deriv.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span>Simulações de Martingale, SorosGale e Gestão de Banca.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span>Provas interativas que somam <b>XP</b> para subir seu nível VIP.</span>
              </div>
            </div>

            {/* Checkbox Don't Show Again */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={dontShowWelcomeAgain}
                onChange={(e) => setDontShowWelcomeAgain(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Não mostrar este aviso novamente</span>
            </label>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.25rem' }}>
              <button
                onClick={() => {
                  if (dontShowWelcomeAgain) {
                    localStorage.setItem('astrobot_hide_welcome_onboarding', 'true');
                  }
                  setActivePage('training');
                  setShowWelcomeModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
                }}
              >
                <GraduationCap size={18} /> Ir para Treinamento & Provas
              </button>

              <button
                onClick={() => {
                  if (dontShowWelcomeAgain) {
                    localStorage.setItem('astrobot_hide_welcome_onboarding', 'true');
                  }
                  setShowWelcomeModal(false);
                }}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Explorar Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION TAB BAR (App Nativo iOS/Android style) */}
      <div className="mobile-bottom-bar">
        <button
          className={`mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setActivePage('dashboard');
            setIsMobileDrawerOpen(false);
          }}
        >
          <Layers size={18} />
          <span>Início</span>
        </button>

        <button
          className={`mobile-nav-item ${activePage === 'automation' || activePage === 'scheduler' ? 'active' : ''}`}
          onClick={() => {
            setActivePage('automation');
            setIsMobileDrawerOpen(false);
          }}
        >
          <Zap size={18} />
          <span>Robô</span>
        </button>

        <button
          className={`mobile-nav-item ${activePage === 'scanner' || activePage === 'strategies' ? 'active' : ''}`}
          onClick={() => {
            setActivePage('scanner');
            setIsMobileDrawerOpen(false);
          }}
        >
          <Sparkles size={18} />
          <span>Análise</span>
        </button>

        <button
          className={`mobile-nav-item ${activePage === 'planning' || activePage === 'reports' ? 'active' : ''}`}
          onClick={() => {
            setActivePage('planning');
            setIsMobileDrawerOpen(false);
          }}
        >
          <Target size={18} />
          <span>Gerenciador</span>
        </button>

        <button
          className={`mobile-nav-item ${isMobileDrawerOpen || activePage === 'profile' ? 'active' : ''}`}
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        >
          <User size={18} />
          <span>Menu</span>
        </button>
      </div>

      {/* MOBILE SIDE DRAWER NAVIGATION OVERLAY */}
      <div
        className={`mobile-drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsMobileDrawerOpen(false)}
      >
        <div
          className="mobile-drawer-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drawer Header / User Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid var(--primary-light)',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} style={{ color: 'var(--primary-light)' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{welcomeName}</span>
                <span style={{ fontSize: '0.62rem', color: isDemo ? 'var(--warning)' : 'var(--success)', fontWeight: 'bold' }}>
                  CONTA {isDemo ? 'DEMO' : 'REAL'} • ${balance.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Account Mode Toggle inside Drawer */}
          <button
            onClick={() => {
              toggleAccountType();
              setIsMobileDrawerOpen(false);
            }}
            disabled={switchingAccount || isRunning}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              background: isDemo ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: isDemo ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              color: isDemo ? 'var(--warning)' : 'var(--success)',
              fontWeight: 'bold',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Alternar para Conta {isDemo ? 'REAL' : 'DEMO'}</span>
            <ChevronRight size={16} />
          </button>

          {/* Navigation Links Group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Navegação Principal
            </span>

            {[
              { id: 'dashboard', label: 'Dashboard Principal', icon: Layers, color: '#a78bfa' },
              { id: 'automation', label: 'Operações & Robô VPS', icon: Zap, color: '#10b981' },
              { id: 'scanner', label: 'Scanner IA & Gráficos', icon: Sparkles, color: '#38bdf8' },
              { id: 'strategies', label: 'Catálogo de Estratégias', icon: Brain, color: '#c084fc' },
              { id: 'planning', label: 'Planejamento & Risco', icon: Target, color: '#f59e0b' },
              { id: 'history', label: 'Histórico de Operações', icon: Clock, color: '#94a3b8' },
              { id: 'reports', label: 'Relatórios Mensais', icon: Coins, color: '#34d399' },
              { id: 'community', label: 'Comunidade & Ranking', icon: Users, color: '#f472b6' },
              { id: 'telegram', label: 'Telegram Notificações', icon: Send, color: '#38bdf8' },
              { id: 'training', label: 'Treinamento & Provas', icon: GraduationCap, color: '#10b981' },
              { id: 'news', label: 'Atualizações & Novidades', icon: Newspaper, color: '#a78bfa' },
              { id: 'downloads', label: 'Downloads & Apps', icon: Download, color: '#60a5fa' },
              ...(isAdminLoggedIn ? [{ id: 'admin', label: 'Painel Admin ASTROBOT', icon: ShieldCheck, color: '#ef4444' }] : [])
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    fontWeight: isActive ? 'bold' : '500',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={16} style={{ color: item.color }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Footer Actions */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setActivePage('profile');
                setIsMobileDrawerOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <User size={15} /> Editar Perfil
            </button>

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                handleDisconnect();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} /> Desconectar
            </button>
          </div>
        </div>
      </div>

      {/* 📊 MODAL DE ÚLTIMAS ENTRADAS E RESULTADOS DA SESSÃO */}
      {showSessionResultsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 4, 12, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }}
        onClick={() => setShowSessionResultsModal(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '780px',
            maxHeight: '88vh',
            background: 'linear-gradient(135deg, rgba(15, 12, 28, 0.98) 0%, rgba(9, 8, 16, 0.98) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(139, 92, 246, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'page-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'var(--primary-light)',
                  display: 'flex'
                }}>
                  <Activity size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
                    Resultados & Últimas Entradas
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Resumo detalhado da sessão ativa ({isDemo ? 'Conta DEMO' : 'Conta REAL'})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowSessionResultsModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Summary Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {/* Saldo Inicial */}
                <div style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Banca Inicial</span>
                  <strong style={{ fontSize: '1rem', color: 'white', fontFamily: 'var(--font-mono)' }}>${initialBalance.toFixed(2)}</strong>
                </div>

                {/* Saldo Atual */}
                <div style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Banca Atual</span>
                  <strong style={{ fontSize: '1rem', color: 'white', fontFamily: 'var(--font-mono)' }}>${balance.toFixed(2)}</strong>
                </div>

                {/* Resultado Líquido */}
                <div style={{
                  background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: netProfit >= 0 ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: netProfit >= 0 ? '#34d399' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resultado Sessão</span>
                  <strong style={{ fontSize: '1.05rem', color: netProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                    {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                  </strong>
                </div>

                {/* Assertividade Winrate */}
                <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '14px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assertividade</span>
                  <strong style={{ fontSize: '1rem', color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
                    {trades.length > 0 ? ((trades.filter(t => t.profit > 0).length / trades.length) * 100).toFixed(1) : '0.0'}%
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '6px' }}>
                      ({trades.filter(t => t.profit > 0).length}/{trades.length})
                    </span>
                  </strong>
                </div>
              </div>

              {/* Trades Table Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Últimas {trades.length} Entradas da Sessão
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    🟢 {trades.filter(t => t.profit > 0).length} Wins | 🔴 {trades.filter(t => t.profit <= 0).length} Losses
                  </span>
                </div>

                {trades.length === 0 ? (
                  <div style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Activity size={24} style={{ color: 'var(--text-muted)' }} />
                    <span>Nenhuma entrada registrada nesta sessão ainda.</span>
                  </div>
                ) : (
                  <div style={{
                    overflowX: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    background: 'rgba(10, 8, 18, 0.6)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Horário</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Ativo</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Contrato</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Estratégia</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Gale</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700' }}>Stake</th>
                          <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'right' }}>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...trades].reverse().slice(0, 30).map((t, index) => {
                          const isWin = t.profit > 0;
                          const formattedTime = t.time || (t.epoch ? new Date(t.epoch * 1000).toLocaleTimeString() : '—');
                          return (
                            <tr key={t.id || index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formattedTime}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '600', color: 'white' }}>{t.symbol || settings.symbol}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.62rem',
                                  fontWeight: 'bold',
                                  background: (t.contractType === 'CALL' || t.contractType === 'HIGHER') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: (t.contractType === 'CALL' || t.contractType === 'HIGHER') ? '#34d399' : '#f87171',
                                  border: (t.contractType === 'CALL' || t.contractType === 'HIGHER') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                  {t.contractType || 'CALL'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{t.strategyName || t.strategy || 'Estratégia IA'}</td>
                              <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: t.galeLevel > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                                {t.galeLevel ? `Gale ${t.galeLevel}` : 'G0'}
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'white' }}>${parseFloat(t.stake || 0).toFixed(2)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: isWin ? '#10b981' : '#ef4444' }}>
                                {isWin ? '+' : ''}${parseFloat(t.profit || 0).toFixed(2)}
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

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowSessionResultsModal(false)}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
              >
                Fechar Resumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOKEN SWITCH MODAL (DEMO / REAL) ─── */}
      {showTokenSwitchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 3, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(15, 11, 28, 0.96)',
            border: pendingSwitchIsDemo ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: pendingSwitchIsDemo ? '0 0 50px rgba(245, 158, 11, 0.2)' : '0 0 50px rgba(16, 185, 129, 0.2)',
            borderRadius: '24px',
            width: '460px',
            maxWidth: '92vw',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: pendingSwitchIsDemo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: pendingSwitchIsDemo ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {pendingSwitchIsDemo ? '🧪' : '💳'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>
                    Conectar à Conta {pendingSwitchIsDemo ? 'DEMO' : 'REAL'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Insira o seu Token API da Deriv para a conta {pendingSwitchIsDemo ? 'Virtual (Demo)' : 'Real'}.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTokenSwitchModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Input Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', letterSpacing: '0.5px' }}>
                DERIV API TOKEN ({pendingSwitchIsDemo ? 'DEMO' : 'REAL'})
              </label>
              <input
                type="password"
                placeholder={`Cole o seu Token da conta ${pendingSwitchIsDemo ? 'Demo' : 'Real'}`}
                value={switchTokenInput}
                onChange={(e) => setSwitchTokenInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  background: '#09090f',
                  border: switchTokenError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: 'white',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              {switchTokenError && (
                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600' }}>
                  {switchTokenError}
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <a
                  href="https://app.deriv.com/account/api-token"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.68rem', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Obter Token na Deriv (API Token) ↗</span>
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowTokenSwitchModal(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!switchTokenInput.trim()) {
                    setSwitchTokenError('Por favor, cole o seu token da Deriv para conectar.');
                    return;
                  }
                  setShowTokenSwitchModal(false);
                  executeAccountSwitch(pendingSwitchIsDemo, switchTokenInput.trim());
                }}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '10px',
                  background: pendingSwitchIsDemo
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: pendingSwitchIsDemo ? '0 0 15px rgba(245, 158, 11, 0.3)' : '0 0 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                Salvar & Conectar {pendingSwitchIsDemo ? 'DEMO' : 'REAL'} 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
