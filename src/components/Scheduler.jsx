import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Plus, Trash2, Play, AlertCircle, CheckCircle, RefreshCw, Calendar, Power, 
  X, ChevronRight, ChevronLeft, User, Cpu, ShieldCheck, Layers, TrendingUp, 
  TrendingDown, Info, Sliders, Eye, Settings, Activity, FileText, Check, Search, Award 
} from 'lucide-react';
import Switch from './Switch';
import DecisionTreeMapModal from './DecisionTreeMapModal';

export default function Scheduler({
  schedulerState,
  onToggleScheduler,
  cycles,
  onSaveCycles,
  activeCycleId,
  onTriggerCycleManually,
  schedulerLogs,
  onClearSchedulerLogs,
  onStopBot,
  autoResetConfig,
  onSaveAutoResetConfig,
  onTriggerAutoResetManual,
  onSendDecisionTreeTelegram,
  historicalTrades = []
}) {
  const defaultAutoReset = {
    enabled: true,
    time: '00:10',
    resetOnAllFinished: true,
    telegramNotify: true,
    autoRenew: true
  };

  const autoReset = { ...defaultAutoReset, ...(autoResetConfig || {}) };

  const handleUpdateAutoReset = (updates) => {
    const newCfg = { ...autoReset, ...updates };
    if (onSaveAutoResetConfig) {
      onSaveAutoResetConfig(newCfg);
    }
  };

  const defaultCycle = {
    name: '',
    startTime: '09:00',
    days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    timezone: 'GMT-3',
    symbol: 'R_100',
    granularity: '60', // 1m
    selectedStrategy: 'autopilot',
    moneyManagement: 'sorosgale',
    stakeValue: 1.0,
    takeProfit: 5.0,
    stopLoss: 15.0,
    martingaleLevels: 2,
    sorosgaleLevels: 2,
    sorosgaleCompounding: 100,
    sorosgaleAllowGale: true,
    microMetaEnabled: false,
    microMetaTarget: 5.0,
    autoBlacklistConsolidation: true,
    martingaleMultiplier: 2.0,
    enableStreakShield: true,
    maxStreakCandles: 4,
    streakShieldAction: 'block',
    enableMasterCandleSecondary: false,
    disableSlowStrategies: false,
    disableMaCrossover: false,
    minProbability: 90,
    minWinRate: 65,
    backupSymbol: '1HZ100V',
    lockProfitSecured: true,
    icon: '🚀',
    color: '#8b5cf6'
  };

  // Sanitize cycles array on the fly to support old items from localStorage and match historical trades
  const sanitizedCycles = useMemo(() => {
    const rawList = (cycles || []).map(c => ({
      ...defaultCycle,
      ...c,
      selectedStrategy: c.selectedStrategy || c.strategy || defaultCycle.selectedStrategy,
      days: c.days || defaultCycle.days,
      icon: c.icon || defaultCycle.icon,
      color: c.color || defaultCycle.color,
      minProbability: c.minProbability || defaultCycle.minProbability,
      minWinRate: c.minWinRate || defaultCycle.minWinRate,
      backupSymbol: c.backupSymbol || defaultCycle.backupSymbol,
      lockProfitSecured: c.lockProfitSecured ?? defaultCycle.lockProfitSecured,
      moneyManagement: c.moneyManagement || (parseInt(c.martingaleLevels) > 0 ? 'martingale' : 'fixed'),
      martingaleLevels: c.martingaleLevels ?? defaultCycle.martingaleLevels,
      martingaleMultiplier: c.martingaleMultiplier ?? defaultCycle.martingaleMultiplier,
      enableStreakShield: c.enableStreakShield ?? defaultCycle.enableStreakShield,
      maxStreakCandles: c.maxStreakCandles ?? defaultCycle.maxStreakCandles,
      streakShieldAction: c.streakShieldAction || defaultCycle.streakShieldAction,
      timezone: c.timezone || defaultCycle.timezone
    }));

    const sortedCycles = [...rawList].sort((a, b) => {
      const [ah, am] = (a.startTime || '00:00').split(':').map(Number);
      const [bh, bm] = (b.startTime || '00:00').split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    return sortedCycles.map((c, index) => {
      let finalProfit = c.finalProfit;
      let status = c.status;

      if (c.status === 'Aguardando') {
        finalProfit = undefined;
      } else if ((finalProfit === undefined || parseFloat(finalProfit) === 0) && historicalTrades && historicalTrades.length > 0) {
        const now = new Date();
        const [sh, sm] = (c.startTime || '00:00').split(':').map(Number);
        const cycleStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm, 0).getTime();

        let cycleEndTime;
        if (index < sortedCycles.length - 1) {
          const nextC = sortedCycles[index + 1];
          const [nh, nm] = (nextC.startTime || '23:59').split(':').map(Number);
          cycleEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nh, nm, 0).getTime();
        } else {
          cycleEndTime = cycleStartTime + (3 * 3600 * 1000);
        }

        const matchingTrades = historicalTrades.filter(t => {
          const tTime = t.epoch ? (t.epoch * 1000) : (t.timestamp || 0);
          return tTime >= cycleStartTime && tTime <= cycleEndTime;
        });

        if (matchingTrades.length > 0) {
          const calcProfit = matchingTrades.reduce((acc, t) => acc + (parseFloat(t.profit) || 0), 0);
          if (calcProfit !== 0) {
            finalProfit = calcProfit;
            status = calcProfit > 0 ? 'Meta Batida' : 'Stop Atingido';
          }
        }
      }

      return {
        ...c,
        status,
        finalProfit
      };
    });
  }, [cycles, historicalTrades]);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  
  // Wizard (Modal) States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState(defaultCycle);

  // Consolidated KPI Metrics for Today's Automation
  const timelineMetrics = useMemo(() => {
    const total = sanitizedCycles.length;
    const active = sanitizedCycles.filter(c => c.active).length;
    const completed = sanitizedCycles.filter(c => c.status === 'Meta Batida' || c.status === 'Stop Atingido' || c.status === 'Finalizado');
    const wins = sanitizedCycles.filter(c => c.status === 'Meta Batida' || (c.finalProfit !== undefined && parseFloat(c.finalProfit) > 0)).length;
    const losses = sanitizedCycles.filter(c => c.status === 'Stop Atingido' || (c.finalProfit !== undefined && parseFloat(c.finalProfit) < 0)).length;
    
    let totalProfit = 0;
    sanitizedCycles.forEach(c => {
      if (c.finalProfit !== undefined) {
        totalProfit += parseFloat(c.finalProfit) || 0;
      }
    });

    const winRate = completed.length > 0 ? ((wins / completed.length) * 100).toFixed(1) : (total > 0 ? '100.0' : '0.0');
    
    return {
      total,
      active,
      completed: completed.length,
      wins,
      losses,
      totalProfit: totalProfit.toFixed(2),
      winRate
    };
  }, [sanitizedCycles]);

  // Scheduling Generator Modal States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isTreeMapModalOpen, setIsTreeMapModalOpen] = useState(false);
  const [generatorData, setGeneratorData] = useState({
    stakeValue: 1.0,
    takeProfit: 5.0,
    stopLoss: 15.0,
    moneyManagement: 'sorosgale',
    sorosgaleLevels: 2,
    sorosgaleMaxGale: 2,
    sorosgaleCompounding: 100,
    sorosgaleAllowGale: true,
    martingaleLevels: 2,
    martingaleMultiplier: 2.0,
    periods: {
      dawn: true,
      morning: true,
      afternoon: true,
      night: true
    },
    enableStreakShield: true,
    maxStreakCandles: 4,
    streakShieldAction: 'block',
    enableTimeGuard: true,
    enableStalemateFailover: true,
    enableMasterCandleSecondary: false,
    disableSlowStrategies: true,
    disableMaCrossover: false,
    useSmartHours: true,
    onlyMhiR100: true,
    mhiVariant: 'mhi_auto',
    enableFakegale: false
  });

  // ─── Smart Hours Engine ───────────────────────────────────────────────────
  // Analyses historicalTrades and returns the top performing hours
  // "Best hours" = hours with highest win rate where wins resolved in G0-G3
  const computeBestHoursFromHistory = (trades, minTrades = 3, topN = 8, filterSymbol = null) => {
    if (!trades || trades.length === 0) return [];

    let targetTrades = trades;
    if (filterSymbol) {
      const symMatches = trades.filter(t => t.symbol === filterSymbol);
      if (symMatches.length >= 1) {
        targetTrades = symMatches;
      }
    }

    const hourStats = {}; // hour (0-23) => { wins, losses, totalG3Wins, total }

    targetTrades.forEach(trade => {
      let hour = null;
      // Try to get hour from trade timestamp
      if (trade.timestamp) {
        const d = new Date(typeof trade.timestamp === 'number' && trade.timestamp < 1e12
          ? trade.timestamp * 1000 : trade.timestamp);
        hour = d.getHours();
      } else if (trade.date) {
        const d = new Date(trade.date);
        hour = d.getHours();
      }
      if (hour === null || hour === undefined || isNaN(hour)) return;

      if (!hourStats[hour]) {
        hourStats[hour] = { wins: 0, losses: 0, g0Wins: 0, g1Wins: 0, g2Wins: 0, g3Wins: 0, total: 0 };
      }

      const isWin = trade.profit > 0 || trade.result === 'win' || trade.outcome === 'win';
      const galeLevel = trade.galeLevel ?? trade.currentGale ?? 0;

      hourStats[hour].total++;
      if (isWin) {
        hourStats[hour].wins++;
        if (galeLevel === 0) hourStats[hour].g0Wins++;
        else if (galeLevel === 1) hourStats[hour].g1Wins++;
        else if (galeLevel === 2) hourStats[hour].g2Wins++;
        else if (galeLevel === 3) hourStats[hour].g3Wins++;
      } else {
        hourStats[hour].losses++;
      }
    });

    // Score: prioritize hours with many wins at G0-G3 and high win rate
    const scored = Object.entries(hourStats)
      .filter(([, s]) => s.total >= minTrades)
      .map(([hour, s]) => {
        const g3Wins = s.g0Wins + s.g1Wins + s.g2Wins + s.g3Wins;
        const winRate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
        // Score: weight heavily towards wins resolved early (G0-G3)
        const score = (g3Wins * 3) + (winRate * 0.5) - (s.losses * 2);
        return { hour: parseInt(hour), ...s, g3Wins, winRate: winRate.toFixed(1), score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    return scored;
  };

  const smartHours = computeBestHoursFromHistory(historicalTrades, 3, 8, generatorData.onlyMhiR100 ? 'R_100' : null);

  const getPeriodForHour = (hour) => {
    if (hour >= 0 && hour < 6) return 'dawn';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
  };

  const getPeriodIcon = (hour) => {
    if (hour >= 0 && hour < 6) return '🌙';
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 18) return '🌇';
    return '🌌';
  };

  const getPeriodColor = (hour) => {
    if (hour >= 0 && hour < 6) return '#8b5cf6';
    if (hour >= 6 && hour < 12) return '#f59e0b';
    if (hour >= 12 && hour < 18) return '#06b6d4';
    return '#10b981';
  };

  const mhiVariantLabels = {
    fakegale: 'Fakegale (Entrada G1) 🧪',
    mhi_auto: 'Estudo MHI Dinâmico 🧠',
    mhi_minority: 'MHI 1 Minoria',
    mhi_majority: 'MHI 1 Maioria',
    mhi_2_minority: 'MHI 2 Minoria',
    mhi_2_majority: 'MHI 2 Maioria',
    mhi_3_minority: 'MHI 3 Minoria',
    mhi_3_majority: 'MHI 3 Maioria'
  };

  const applyGeneratorPreset = (presetType) => {
    if (presetType === 'fakegale') {
      setGeneratorData(prev => ({
        ...prev,
        onlyMhiR100: true,
        mhiVariant: 'fakegale',
        enableFakegale: true,
        stakeValue: 1.0,
        takeProfit: 5.0,
        stopLoss: 35.0,
        moneyManagement: 'martingale',
        martingaleLevels: 6,
        martingaleMultiplier: 2.0,
        useSmartHours: true,
        enableStreakShield: true,
        enableTimeGuard: true,
        enableStalemateFailover: true,
        periods: { dawn: true, morning: true, afternoon: true, night: true }
      }));
    } else if (presetType === 'mhi_smart') {
      setGeneratorData(prev => ({
        ...prev,
        onlyMhiR100: true,
        mhiVariant: 'mhi_auto',
        stakeValue: 1.0,
        takeProfit: 5.0,
        stopLoss: 15.0,
        moneyManagement: 'sorosgale',
        sorosgaleLevels: 2,
        sorosgaleMaxGale: 2,
        sorosgaleCompounding: 100,
        useSmartHours: true,
        enableStreakShield: true,
        enableTimeGuard: true,
        enableStalemateFailover: true,
        periods: { dawn: true, morning: true, afternoon: true, night: true }
      }));
    } else if (presetType === 'sorosgale_turbo') {
      setGeneratorData(prev => ({
        ...prev,
        onlyMhiR100: true,
        mhiVariant: 'mhi_auto',
        moneyManagement: 'sorosgale',
        sorosgaleLevels: 3,
        sorosgaleMaxGale: 2,
        sorosgaleCompounding: 100,
        stakeValue: 1.5,
        takeProfit: 8.0,
        stopLoss: 25.0,
        useSmartHours: true,
        enableStreakShield: true
      }));
    } else if (presetType === 'conservative') {
      setGeneratorData(prev => ({
        ...prev,
        onlyMhiR100: true,
        mhiVariant: 'mhi_auto',
        moneyManagement: 'fixed',
        martingaleLevels: 0,
        stakeValue: 1.0,
        takeProfit: 3.0,
        stopLoss: 10.0,
        enableStreakShield: true,
        useSmartHours: true
      }));
    } else if (presetType === 'smart_hours_g3') {
      setGeneratorData(prev => ({
        ...prev,
        useSmartHours: true,
        enableStreakShield: true,
        periods: { dawn: true, morning: true, afternoon: true, night: true }
      }));
    }
  };

  const previewSummary = useMemo(() => {
    let count = 0;
    const periodsSelected = generatorData.periods || {};
    
    const defaultPeriodCounts = { dawn: 3, morning: 3, afternoon: 3, night: 3 };
    let periodCounts = defaultPeriodCounts;
    
    if (generatorData.useSmartHours && smartHours.length > 0) {
      const smartCounts = { dawn: 0, morning: 0, afternoon: 0, night: 0 };
      smartHours.forEach(h => {
        const p = getPeriodForHour(h.hour);
        if (periodsSelected[p]) smartCounts[p]++;
      });
      const hasSmart = Object.values(smartCounts).some(c => c > 0);
      if (hasSmart) periodCounts = smartCounts;
    }
    
    Object.keys(periodCounts).forEach(k => {
      if (periodsSelected[k]) count += periodCounts[k];
    });

    const tp = parseFloat(generatorData.takeProfit) || 5.0;
    const totalPotentialWin = (count * tp).toFixed(2);
    
    return {
      missionCount: count,
      strategyLabel: generatorData.onlyMhiR100 
        ? (mhiVariantLabels[generatorData.mhiVariant || 'mhi_auto'] || 'MHI')
        : 'Piloto Automático Diversificado',
      symbolLabel: generatorData.onlyMhiR100 ? 'Volatility 100 Index (R_100)' : 'Multi-Ativos (R_100, 1HZ100V, R_75...)',
      totalPotentialWin
    };
  }, [generatorData, smartHours]);

  const handleGenerateTimeline = () => {
    const newCycles = [];
    const periodsSelected = generatorData.periods;
    
    const stake = parseFloat(generatorData.stakeValue) || 1.0;
    const tp = parseFloat(generatorData.takeProfit) || 5.0;
    const isOnlyMhiR100 = !!generatorData.onlyMhiR100;
    const selectedMhiVariant = generatorData.mhiVariant || 'mhi_auto';
    const isFakegaleSelected = !!(generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || selectedMhiVariant === 'fakegale');
    const moneyMgmt = isFakegaleSelected ? 'martingale' : (generatorData.moneyManagement || 'sorosgale');
    const galeLevels = generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' 
      ? 0 
      : (isFakegaleSelected ? (parseInt(generatorData.martingaleLevels) || 6) : (parseInt(generatorData.martingaleLevels) ?? 2));
    const galeMult = generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' || galeLevels === 0 ? 1.0 : (parseFloat(generatorData.martingaleMultiplier) || 2.0);
    const strategyToUse = isOnlyMhiR100 ? selectedMhiVariant : 'autopilot';

    const defaultPeriodConfigs = {
      dawn: [
        { time: '01:25', name: 'Madrugada', icon: '🌙', color: '#8b5cf6' },
        { time: '03:40', name: 'Madrugada', icon: '🌌', color: '#06b6d4' },
        { time: '05:15', name: 'Madrugada', icon: '🌅', color: '#10b981' }
      ],
      morning: [
        { time: '07:30', name: 'Manhã', icon: '⚡', color: '#f59e0b' },
        { time: '09:45', name: 'Manhã', icon: '🚀', color: '#8b5cf6' },
        { time: '11:15', name: 'Manhã', icon: '🎯', color: '#10b981' }
      ],
      afternoon: [
        { time: '13:30', name: 'Tarde', icon: '📈', color: '#06b6d4' },
        { time: '15:45', name: 'Tarde', icon: '🤖', color: '#ec4899' },
        { time: '17:15', name: 'Tarde', icon: '🌇', color: '#ef4444' }
      ],
      night: [
        { time: '19:30', name: 'Noite', icon: '🛡️', color: '#8b5cf6' },
        { time: '21:15', name: 'Noite', icon: '⚡', color: '#f59e0b' },
        { time: '23:30', name: 'Noite', icon: '🌙', color: '#ec4899' }
      ]
    };

    let periodConfigs = defaultPeriodConfigs;

    // SMART HOURS MODE: use real historical best hours instead of presets
    if (generatorData.useSmartHours && smartHours.length > 0) {
      const smartConfigs = { dawn: [], morning: [], afternoon: [], night: [] };
      const periodNames = { dawn: 'Madrugada', morning: 'Manhã', afternoon: 'Tarde', night: 'Noite' };

      smartHours.forEach((h, idx) => {
        const periodKey = getPeriodForHour(h.hour);
        // Check period filter
        if (!periodsSelected[periodKey]) return;
        const mm = '00';
        const timeStr = `${String(h.hour).padStart(2, '0')}:${mm}`;
        const periodName = periodNames[periodKey];
        const icon = getPeriodIcon(h.hour);
        const color = getPeriodColor(h.hour);
        
        smartConfigs[periodKey].push({
          time: timeStr,
          name: `${periodName} - ${h.winRate}% (${h.total} ops)`,
          icon,
          color
        });
      });

      // Only use periods that have smart entries
      const hasSmartEntries = Object.values(smartConfigs).some(arr => arr.length > 0);
      if (hasSmartEntries) {
        periodConfigs = smartConfigs;
      }
    }
    
    // Filter target assets against active blacklisted assets in localStorage
    let activeBlacklistedSymbols = [];
    try {
      const savedBlacklist = localStorage.getItem('astrobot_blacklisted_assets');
      if (savedBlacklist) {
        const parsed = JSON.parse(savedBlacklist);
        const now = Date.now();
        activeBlacklistedSymbols = parsed
          .filter(item => item.expiresAt > now)
          .map(item => item.symbol);
      }
    } catch (e) {
      console.error('Error reading blacklisted assets in Scheduler generator:', e);
    }

    const defaultTargetAssets = isOnlyMhiR100 
      ? ['R_100'] 
      : ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_50', '1HZ50V'];

    const filteredTargetAssets = defaultTargetAssets.filter(s => !activeBlacklistedSymbols.includes(s));
    const targetAssets = filteredTargetAssets.length > 0 ? filteredTargetAssets : ['R_100'];
    let generatedCount = 0;
    
    Object.keys(periodConfigs).forEach(periodKey => {
      if (periodsSelected[periodKey]) {
        periodConfigs[periodKey].forEach(cfg => {
          const assetIndex = generatedCount % targetAssets.length;
          const isFakegale = !!(isFakegaleSelected || selectedMhiVariant === 'fakegale');
          const symbol = (isOnlyMhiR100 || isFakegale) ? 'R_100' : targetAssets[assetIndex];
          const backupSymbol = (isOnlyMhiR100 || isFakegale) ? '1HZ100V' : (generatorData.backupSymbol || '1HZ100V');
          
          const labelSuffix = (isOnlyMhiR100 || isFakegale) ? ` (${mhiVariantLabels[selectedMhiVariant] || 'MHI'})` : '';
          const name = `${cfg.name}${labelSuffix} ${cfg.time}`;
          
          newCycles.push({
            id: 'cycle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            startTime: cfg.time,
            days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            timezone: 'GMT-3',
            symbol: symbol,
            backupSymbol: backupSymbol,
            granularity: '60',
            selectedStrategy: strategyToUse,
            stakeValue: stake,
            takeProfit: tp,
            stopLoss: sl,
            moneyManagement: moneyMgmt,
            enableFakegale: !!(generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || selectedMhiVariant === 'fakegale'),
            fakegale: !!(generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || selectedMhiVariant === 'fakegale'),
            sorosgaleLevels: parseInt(generatorData.sorosgaleLevels) || 2,
            sorosgaleMaxGale: parseInt(generatorData.sorosgaleMaxGale) || 2,
            sorosgaleCompounding: parseFloat(generatorData.sorosgaleCompounding) || 100,
            sorosgaleAllowGale: generatorData.sorosgaleAllowGale !== false,
            martingaleLevels: galeLevels,
            maxGale: galeLevels,
            martingaleMultiplier: galeMult,
            enableStreakShield: generatorData.enableStreakShield ?? true,
            maxStreakCandles: parseInt(generatorData.maxStreakCandles) || 4,
            streakShieldAction: generatorData.streakShieldAction || 'block',
            enableMasterCandleSecondary: !!generatorData.enableMasterCandleSecondary,
            disableSlowStrategies: !!generatorData.disableSlowStrategies,
            disableMaCrossover: !!generatorData.disableMaCrossover,
            minProbability: 92,
            icon: isOnlyMhiR100 ? '🎯' : cfg.icon,
            color: isOnlyMhiR100 ? '#8b5cf6' : cfg.color,
            active: true,
            status: 'Aguardando'
          });
          generatedCount++;
        });
      }
    });
    
    if (newCycles.length === 0) {
      alert('Selecione pelo menos um período para gerar.');
      return;
    }
    
    const sortedNewCycles = [...newCycles].sort((a, b) => {
      const [ah, am] = (a.startTime || '00:00').split(':').map(Number);
      const [bh, bm] = (b.startTime || '00:00').split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    onSaveCycles(sortedNewCycles);
    setIsGeneratorOpen(false);
  };

  // Countdown timer for next scheduled cycle
  const [nextCycleCountdown, setNextCycleCountdown] = useState('--:--:--');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const assets = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { symbol: '1HZ150V', name: 'Volatility 150 (1s) Index' },
    { symbol: '1HZ200V', name: 'Volatility 200 (1s) Index' },
    { symbol: '1HZ300V', name: 'Volatility 300 (1s) Index' },
    { symbol: 'JD75', name: 'Jump 75 Index' },
    { symbol: 'JD100', name: 'Jump 100 Index' },
    { symbol: 'frxXAUUSD', name: 'Ouro / Gold (XAU/USD)' },
    { symbol: 'RDBEAR', name: 'Bear Market Index' },
    { symbol: 'RDBULL', name: 'Bull Market Index' },
    { symbol: 'frxEURUSD', name: 'EUR/USD' },
    { symbol: 'frxEURGBP', name: 'EUR/GBP' },
    { symbol: 'frxEURJPY', name: 'EUR/JPY' },
    { symbol: 'frxGBPUSD', name: 'GBP/USD' },
    { symbol: 'frxUSDJPY', name: 'USD/JPY' },
    { symbol: 'frxAUDUSD', name: 'AUD/USD' },
    { symbol: 'frxUSDCAD', name: 'USD/CAD' }
  ];

  const strategies = [
    { id: 'autopilot', name: 'Piloto Automático 🤖' },
    { id: 'fakegale', name: 'Fakegale (MHI Vol 100) 🧪' },
    { id: 'mhi_auto', name: 'Estudo Dinâmico MHI (1 a 3) 🧠' },
    { id: 'mhi_minority', name: 'MHI 1 (Minoria)' },
    { id: 'mhi_majority', name: 'MHI 1 (Maioria)' },
    { id: 'mhi_2_minority', name: 'MHI 2 (Minoria)' },
    { id: 'mhi_2_majority', name: 'MHI 2 (Maioria)' },
    { id: 'mhi_3_minority', name: 'MHI 3 (Minoria)' },
    { id: 'mhi_3_majority', name: 'MHI 3 (Maioria)' },
    { id: 'ma_crossover', name: 'Cruzamento de Médias (9/21)' },
    { id: 'twin_towers', name: 'Torres Gêmeas' },
    { id: 'three_musketeers', name: 'Três Mosqueteiros' },
    { id: 'padrao_23', name: 'Padrão 23' },
    { id: 'padrao_3x1', name: 'Padrão 3x1' },
    { id: 'padrao_impar', name: 'Padrão Ímpar' },
    { id: 'r7', name: 'Padrão R7' },
    { id: 'pullback', name: 'Pullback na Média (EMA 20)' },
    { id: 'reversal', name: 'Reversão (Hammer / Shooting)' },
    { id: 'pivot_123', name: 'Pivô de 1-2-3' },
    { id: 'ross_hook', name: '123 de Ross' },
    { id: 'r10', name: 'Padrão R10' },
    { id: 'marubozu', name: 'Marubozu' },
    { id: 'bos_choch', name: 'BOS + ChoCH' }
  ];

  const presetIcons = ['🌅', '🌇', '🌙', '🤖', '🚀', '⚡', '🎯', '🛡️'];
  const presetColors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  // Select first cycle by default if selectedCycleId is null
  useEffect(() => {
    if (sanitizedCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(sanitizedCycles[0].id);
    }
  }, [cycles.length, selectedCycleId]);

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

  const getCycleTimeParts = (timezone, dateObj = new Date()) => {
    const offsetHours = parseTimezoneOffset(timezone);
    const targetDate = new Date(dateObj.getTime() + (offsetHours * 3600000));
    
    const hh = targetDate.getUTCHours().toString().padStart(2, '0');
    const mm = targetDate.getUTCMinutes().toString().padStart(2, '0');
    const ss = targetDate.getUTCSeconds().toString().padStart(2, '0');
    const dayIndex = targetDate.getUTCDay();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    return {
      hh: targetDate.getUTCHours(),
      mm: targetDate.getUTCMinutes(),
      ss: targetDate.getUTCSeconds(),
      hhmm: `${hh}:${mm}`,
      timeString: `${hh}:${mm}:${ss}`,
      currentDayName: dayNames[dayIndex]
    };
  };

  const getNextCycle = () => {
    if (!sanitizedCycles || sanitizedCycles.length === 0) return null;
    const activeCycles = sanitizedCycles.filter(c => c.active && c.status === 'Aguardando');
    if (activeCycles.length === 0) return null;

    const now = new Date();
    
    const sorted = [...activeCycles].sort((a, b) => {
      const aParts = getCycleTimeParts(a.timezone || 'GMT-3', now);
      const bParts = getCycleTimeParts(b.timezone || 'GMT-3', now);
      
      const [aH, aM] = a.startTime.split(':').map(Number);
      const [bH, bM] = b.startTime.split(':').map(Number);
      
      const getDiffMinutes = (currDayName, currH, currM, targetH, targetM, targetDays) => {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const currDayIndex = dayNames.indexOf(currDayName);
        const activeDays = targetDays && targetDays.length > 0 ? targetDays : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        
        let minDiffMinutes = Infinity;
        for (const targetDay of activeDays) {
          const targetDayIndex = dayNames.indexOf(targetDay);
          if (targetDayIndex === -1) continue;
          
          let dayDiff = targetDayIndex - currDayIndex;
          if (dayDiff < 0) {
            dayDiff += 7;
          }
          
          let timeDiff = (targetH * 60 + targetM) - (currH * 60 + currM);
          if (dayDiff === 0 && timeDiff <= 0) {
            dayDiff = 7;
          }
          
          const totalDiff = dayDiff * 24 * 60 + timeDiff;
          if (totalDiff < minDiffMinutes) {
            minDiffMinutes = totalDiff;
          }
        }
        return minDiffMinutes;
      };

      const aDiff = getDiffMinutes(aParts.currentDayName, aParts.hh, aParts.mm, aH, aM, a.days);
      const bDiff = getDiffMinutes(bParts.currentDayName, bParts.hh, bParts.mm, bH, bM, b.days);
      
      return aDiff - bDiff;
    });

    return sorted[0];
  };

  // Next cycle countdown logic
  useEffect(() => {
    const timer = setInterval(() => {
      const next = getNextCycle();
      if (!next) {
        setNextCycleCountdown('--:--:--');
        return;
      }
      
      const now = new Date();
      const parts = getCycleTimeParts(next.timezone || 'GMT-3', now);
      const [h, m] = next.startTime.split(':').map(Number);
      
      const getDiffSeconds = (currDayName, currH, currM, currS, targetH, targetM, targetDays) => {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const currDayIndex = dayNames.indexOf(currDayName);
        const activeDays = targetDays && targetDays.length > 0 ? targetDays : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        
        let minDiffSeconds = Infinity;
        for (const targetDay of activeDays) {
          const targetDayIndex = dayNames.indexOf(targetDay);
          if (targetDayIndex === -1) continue;
          
          let dayDiff = targetDayIndex - currDayIndex;
          if (dayDiff < 0) {
            dayDiff += 7;
          }
          
          let timeDiffSecs = (targetH * 3600 + targetM * 60) - (currH * 3600 + currM * 60 + currS);
          if (dayDiff === 0 && timeDiffSecs <= 0) {
            dayDiff = 7;
          }
          
          const totalDiffSecs = dayDiff * 24 * 3600 + timeDiffSecs;
          if (totalDiffSecs < minDiffSeconds) {
            minDiffSeconds = totalDiffSecs;
          }
        }
        return minDiffSeconds;
      };

      const diffSecs = getDiffSeconds(parts.currentDayName, parts.hh, parts.mm, parts.ss, h, m, next.days);
      
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;

      setNextCycleCountdown(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [cycles]);

  const getCleanSymbolName = (symbolCode) => {
    const asset = assets.find(a => a.symbol === symbolCode);
    return asset ? asset.name.replace('Volatility ', '').replace(' Index', '') : symbolCode;
  };

  const getCleanStrategyName = (strategyId) => {
    const strat = strategies.find(s => s.id === strategyId);
    return strat ? strat.name : strategyId;
  };

  // Actions
  const handleOpenNewWizard = () => {
    setWizardData({ ...defaultCycle });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleEditClick = (cycle) => {
    setWizardData({ ...cycle });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleDuplicateClick = (cycle) => {
    const duplicated = {
      ...cycle,
      id: `cycle-${Date.now()}`,
      name: `${cycle.name} (Cópia)`,
      active: true,
      status: 'Aguardando'
    };
    onSaveCycles([...cycles, duplicated]);
  };

  const handleDeleteCycle = (id) => {
    onSaveCycles(cycles.filter(c => c.id !== id));
    if (selectedCycleId === id) {
      const remaining = cycles.filter(c => c.id !== id);
      setSelectedCycleId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleToggleCycleActive = (id, currentVal) => {
    onSaveCycles(cycles.map(c => c.id === id ? { ...c, active: !currentVal, status: !currentVal ? 'Aguardando' : c.status } : c));
  };

  const handleResetCycleStatus = (id) => {
    onSaveCycles(cycles.map(c => c.id === id ? { ...c, status: 'Aguardando' } : c));
  };

  const handleResetAllCycles = () => {
    onSaveCycles(cycles.map(c => ({ ...c, status: 'Aguardando' })));
  };

  const handleBatchToggleActive = (activate) => {
    onSaveCycles(cycles.map(c => ({ ...c, active: activate })));
  };

  const handleBatchClearFinished = () => {
    onSaveCycles(cycles.filter(c => c.status === 'Aguardando' || activeCycleId === c.id));
  };

  const handleBatchClearAll = () => {
    if (window.confirm('Deseja realmente apagar todas as missões da linha do tempo?')) {
      onSaveCycles([]);
      setSelectedCycleId(null);
    }
  };

  const handleSaveWizard = (e) => {
    if (e) e.preventDefault();
    if (!wizardData.name.trim()) return;

    if (wizardData.id) {
      // Edit
      onSaveCycles(cycles.map(c => c.id === wizardData.id ? wizardData : c));
    } else {
      // Add
      const newCycleToAdd = {
        ...wizardData,
        id: `cycle-${Date.now()}`,
        active: true,
        status: 'Aguardando',
        lastRun: null
      };
      onSaveCycles([...cycles, newCycleToAdd]);
      setSelectedCycleId(newCycleToAdd.id);
    }

    setIsWizardOpen(false);
  };

  const nextStep = () => setWizardStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setWizardStep(prev => Math.max(prev - 1, 1));

  // Filtered timeline cycles based on search and period/status filters
  const filteredTimelineCycles = useMemo(() => {
    return sanitizedCycles.filter(c => {
      const search = (timelineSearch || '').toLowerCase().trim();
      const matchesSearch = !search || 
        c.name.toLowerCase().includes(search) || 
        c.symbol.toLowerCase().includes(search) || 
        c.startTime.includes(search) ||
        (c.selectedStrategy && c.selectedStrategy.toLowerCase().includes(search));
      
      if (!matchesSearch) return false;

      if (timelineFilter === 'all') return true;
      if (timelineFilter === 'active') return c.active;
      if (timelineFilter === 'waiting') return c.status === 'Aguardando';
      if (timelineFilter === 'finished') {
        return c.status === 'Meta Batida' || c.status === 'Stop Atingido' || c.status === 'Finalizado';
      }
      if (timelineFilter === 'dawn') {
        const h = parseInt((c.startTime || '00:00').split(':')[0]);
        return h >= 0 && h < 6;
      }
      if (timelineFilter === 'morning') {
        const h = parseInt((c.startTime || '00:00').split(':')[0]);
        return h >= 6 && h < 12;
      }
      if (timelineFilter === 'afternoon') {
        const h = parseInt((c.startTime || '00:00').split(':')[0]);
        return h >= 12 && h < 18;
      }
      if (timelineFilter === 'night') {
        const h = parseInt((c.startTime || '00:00').split(':')[0]);
        return h >= 18 && h <= 23;
      }
      return true;
    });
  }, [sanitizedCycles, timelineSearch, timelineFilter]);

  // Filter logs logic with categories
  const filteredLogs = useMemo(() => {
    return (schedulerLogs || []).filter(log => {
      const search = (logSearch || '').toLowerCase().trim();
      const matchesSearch = !search || log.message.toLowerCase().includes(search);
      if (!matchesSearch) return false;
      
      if (logFilter === 'all') return true;
      if (logFilter === 'ia') {
        return log.message.includes('IA') || log.message.includes('MHI') || log.message.includes('Estudo') || log.message.includes('Scanner');
      }
      if (logFilter === 'trades') {
        return log.message.includes('Ordem') || log.message.includes('Trade') || log.message.includes('Win') || log.message.includes('Loss') || log.message.includes('Stake');
      }
      if (logFilter === 'errors') {
        return log.type === 'error' || log.type === 'warning' || log.message.includes('Erro') || log.message.includes('Stop');
      }
      return true;
    });
  }, [schedulerLogs, logSearch, logFilter]);

  const selectedCycle = sanitizedCycles.find(c => c.id === selectedCycleId);
  const nextCycle = getNextCycle();

  // Status mapping
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Aguardando':
        return { text: 'Aguardando', color: '#94a3b8', dotClass: 'pulse-dot-gray' };
      case 'Executando':
      case 'Monitorando':
        return { text: 'Monitorando', color: '#10b981', dotClass: 'pulse-dot-green' };
      case 'Scanner':
        return { text: 'Scanner', color: '#a78bfa', dotClass: 'pulse-dot-purple' };
      case 'Procurando':
      case 'Procurando Entrada':
        return { text: 'Procurando Entrada', color: '#f59e0b', dotClass: 'pulse-dot-yellow' };
      case 'Executando Ordem':
        return { text: 'Executando Ordem', color: '#3b82f6', dotClass: 'pulse-dot-blue' };
      case 'Meta Batida':
        return { text: 'Meta Batida', color: '#fbbf24', dotClass: '' };
      case 'Stop Atingido':
        return { text: 'Stop Atingido', color: '#ef4444', dotClass: '' };
      case 'Interrompido':
      case 'Finalizado':
        return { text: 'Finalizado', color: '#64748b', dotClass: '' };
      default:
        return { text: status, color: '#94a3b8', dotClass: '' };
    }
  };

  // Pipeline flow highlights
  const getPipelineActiveIndex = (status) => {
    if (status === 'Meta Batida' || status === 'Stop Atingido' || status === 'Finalizado') return 6;
    if (status === 'Executando Ordem') return 4;
    if (status === 'Procurando Entrada' || status === 'Procurando') return 3;
    if (status === 'Scanner') return 2;
    if (status === 'Monitorando' || status === 'Executando') return 1;
    return 0; // Aguardando
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: '100%',
      color: 'var(--text-primary)'
    }}>

      {/* TOPO: CENTRAL DE AUTOMAÇÃO (METRIC HUD & CONTROLS) */}
      <div className="glass-panel" style={{
        padding: '1.15rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(15, 11, 28, 0.88) 0%, rgba(20, 15, 38, 0.75) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        gap: '1.25rem',
        flexWrap: 'wrap'
      }}>
        {/* Left: Brand / Title / Engine Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.25)'
          }}>
            <Cpu size={22} style={{ color: '#c084fc' }} className="pulse-primary" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px', color: 'white' }}>
                Central de Automação de Missões
              </h2>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: '5px',
                background: schedulerState ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: schedulerState ? '#34d399' : '#f87171',
                border: `1px solid ${schedulerState ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: schedulerState ? '#10b981' : '#ef4444' }} className={schedulerState ? 'pulse-dot-green' : ''} />
                {schedulerState ? 'ENGINE ONLINE' : 'ENGINE PAUSADO'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🕒 Local: <strong style={{ fontFamily: 'var(--font-mono)', color: 'white' }}>{currentTime}</strong></span>
              <span>•</span>
              <span>🌐 Servidor: <strong style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>GMT-3</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Live Consolidated Automation KPIs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Missions Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '5px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Missões Ativas</span>
            <strong style={{ fontSize: '0.85rem', color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
              {timelineMetrics.active} <span style={{ fontSize: '0.65rem', color: '#64748b' }}>/ {timelineMetrics.total}</span>
            </strong>
          </div>

          {/* Win Rate KPI */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '5px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Assertividade</span>
            <strong style={{ fontSize: '0.85rem', color: parseFloat(timelineMetrics.winRate) >= 70 ? '#34d399' : '#fbbf24', fontFamily: 'var(--font-mono)' }}>
              {timelineMetrics.winRate}%
            </strong>
          </div>

          {/* Consolidated Profit */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '5px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Resultado Diário</span>
            <strong style={{
              fontSize: '0.85rem',
              color: parseFloat(timelineMetrics.totalProfit) >= 0 ? '#34d399' : '#f87171',
              fontFamily: 'var(--font-mono)'
            }}>
              {parseFloat(timelineMetrics.totalProfit) >= 0 ? '+' : ''}${timelineMetrics.totalProfit}
            </strong>
          </div>

          {/* Next Cycle Widget */}
          {nextCycle && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '10px',
              padding: '5px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '0.55rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: '800' }}>
                Próximo Disparo ({nextCycle.startTime})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                <span style={{ fontSize: '0.75rem' }}>{nextCycle.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  T-minus {nextCycleCountdown}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Master Controls & Generator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Master Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.25)',
            padding: '5px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: schedulerState ? '#34d399' : '#94a3b8' }}>
              {schedulerState ? 'Motor Ativo' : 'Motor Desativado'}
            </span>
            <Switch showStatus={false} scale={0.8} checked={schedulerState} onChange={(e) => onToggleScheduler(e.target.checked)} />
          </div>

          {/* Decision Tree Map Button */}
          <button
            type="button"
            onClick={() => setIsTreeMapModalOpen(true)}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(139, 92, 246, 0.22) 100%)',
              border: '1px solid rgba(244, 114, 182, 0.45)',
              color: '#fbcfe8',
              boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🌳</span> Árvore de Decisão
          </button>

          {/* Scheduling Generator Button */}
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="action-button-glow"
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#e9d5ff',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
            }}
          >
            <Sliders size={15} /> Gerador de Linha do Tempo
          </button>

          {/* Add New Mission Button */}
          <button
            onClick={handleOpenNewWizard}
            className="primary"
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} /> Nova Missão
          </button>
        </div>
      </div>

      {/* BOTTOM LAYOUT GRID (3 COLUMNS: TIMELINE | COCKPIT | AUDIT TERMINAL) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '310px 1fr 310px',
        gap: '1.25rem',
        flex: 1,
        overflow: 'hidden',
        minHeight: '640px'
      }}>

        {/* LATERAL ESQUERDA: TIMELINE DOS CICLOS */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: 'rgba(15, 11, 28, 0.45)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          overflowY: 'hidden'
        }}>
          {/* Header with Title & Batch Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🕒</span> Linha do Tempo ({filteredTimelineCycles.length}/{sanitizedCycles.length})
            </h3>
            {sanitizedCycles.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  title="Ativar todas as missões"
                  onClick={() => handleBatchToggleActive(true)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Ativar
                </button>
                <button
                  type="button"
                  title="Pausar todas as missões"
                  onClick={() => handleBatchToggleActive(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Pausar
                </button>
                <button
                  type="button"
                  title="Limpar missões finalizadas"
                  onClick={handleBatchClearFinished}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Quick Search & Period Filter Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                placeholder="Filtrar por nome, ativo, hora..."
                style={{
                  padding: '0.35rem 0.5rem 0.35rem 1.6rem',
                  fontSize: '0.68rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: '7px', color: 'var(--text-muted)' }} />
            </div>

            {/* Period Filter Chips */}
            <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'active', label: 'Ativos' },
                { key: 'waiting', label: 'Aguard.' },
                { key: 'finished', label: 'Concluídos' },
                { key: 'dawn', label: '🌙 00-06h' },
                { key: 'morning', label: '🌅 06-12h' },
                { key: 'afternoon', label: '🌇 12-18h' },
                { key: 'night', label: '🌌 18-00h' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setTimelineFilter(tab.key)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.56rem',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: timelineFilter === tab.key ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.05)',
                    background: timelineFilter === tab.key ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.02)',
                    color: timelineFilter === tab.key ? '#e9d5ff' : '#94a3b8',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Missions Scrollbox */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
            {filteredTimelineCycles.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                <Clock size={28} />
                <span style={{ fontSize: '0.72rem' }}>Nenhuma missão encontrada para este filtro.</span>
              </div>
            ) : (
              filteredTimelineCycles.map((c, idx) => {
                const isSelected = c.id === selectedCycleId;
                const statusInfo = getStatusDisplay(c.status);
                const isRunning = activeCycleId === c.id;
                const isAguardando = c.status === 'Aguardando';

                const isWinStatus = !isAguardando && (c.status === 'Meta Batida' || (c.finalProfit !== undefined && parseFloat(c.finalProfit) > 0));
                const isLossStatus = !isAguardando && (c.status === 'Stop Atingido' || (c.finalProfit !== undefined && parseFloat(c.finalProfit) < 0));
                const isFinalizedStatus = !isAguardando && (c.status === 'Finalizado' || c.status === 'SEM OP' || c.status === 'Sem Operação' || c.status === 'Interrompido');

                const isFinished = !isAguardando && !isRunning && (isWinStatus || isLossStatus || isFinalizedStatus || (c.finalProfit !== undefined && parseFloat(c.finalProfit) !== 0));

                let outcomeType = 'SEM_OP';
                if (c.finalProfit !== undefined && parseFloat(c.finalProfit) !== 0) {
                  const p = parseFloat(c.finalProfit);
                  if (p > 0) outcomeType = 'WIN';
                  else if (p < 0) outcomeType = 'LOSS';
                  else outcomeType = 'SEM_OP';
                } else if (isWinStatus) {
                  outcomeType = 'WIN';
                } else if (isLossStatus) {
                  outcomeType = 'LOSS';
                } else {
                  outcomeType = 'SEM_OP';
                }

                let overlayConfig = {
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(30, 27, 75, 0.88) 100%)',
                  border: '1px solid rgba(129, 140, 248, 0.45)',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
                  title: '⚡ SEM OP',
                  titleColor: '#818cf8',
                  textShadow: '0 0 10px rgba(99, 102, 241, 0.8)',
                  valueText: '$0.00'
                };

                if (outcomeType === 'WIN') {
                  const hasTarget = c.takeProfit && parseFloat(c.takeProfit) > 0;
                  const isPartial = c.finalProfit !== undefined && hasTarget && parseFloat(c.finalProfit) < (parseFloat(c.takeProfit) - 0.05);

                  overlayConfig = {
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.85) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                    title: isPartial ? '🏆 LUCRO ALCANÇADO' : '🏆 META BATIDA',
                    titleColor: '#34d399',
                    textShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                    valueText: c.finalProfit !== undefined 
                      ? `+$${parseFloat(c.finalProfit).toFixed(2)}` 
                      : `+$${parseFloat(c.takeProfit || 0).toFixed(2)}`
                  };
                } else if (outcomeType === 'LOSS') {
                  const hasStop = c.stopLoss && parseFloat(c.stopLoss) > 0;
                  const isPartialLoss = c.finalProfit !== undefined && hasStop && Math.abs(parseFloat(c.finalProfit)) < (parseFloat(c.stopLoss) - 0.05);

                  overlayConfig = {
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(127, 29, 29, 0.85) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
                    title: isPartialLoss ? '🛑 ENCERRADO COM PERDA' : '🛑 STOP LOSS ATINGIDO',
                    titleColor: '#f87171',
                    textShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    valueText: c.finalProfit !== undefined 
                      ? `-$${Math.abs(parseFloat(c.finalProfit)).toFixed(2)}` 
                      : `-$${parseFloat(c.stopLoss || 0).toFixed(2)}`
                  };
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCycleId(c.id)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '0.8rem 0.95rem',
                      background: isSelected 
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)' 
                        : isRunning 
                        ? 'rgba(16, 185, 129, 0.06)'
                        : 'rgba(255,255,255,0.015)',
                      borderLeft: `3px solid ${c.color || 'var(--primary-light)'}`,
                      borderTop: isSelected ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid rgba(255,255,255,0.03)',
                      borderRight: isSelected ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid rgba(255,255,255,0.03)',
                      borderBottom: isSelected ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 4px 18px rgba(139, 92, 246, 0.18)' : 'none'
                    }}
                  >
                    {/* Inner Card Content */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      filter: isFinished ? 'blur(3.5px)' : 'none',
                      opacity: isFinished ? 0.3 : 1,
                      pointerEvents: isFinished ? 'none' : 'auto',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <span style={{ fontSize: '0.58rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '1px 5px', borderRadius: '4px', color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>#{idx + 1}</span>
                          <span>{c.icon}</span>
                          <span style={{ color: c.active ? 'white' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{c.name}</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: isRunning ? '#34d399' : 'var(--primary-light)' }}>
                          {c.startTime}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.64rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🛡️ {getCleanSymbolName(c.symbol)}</span>
                          {(c.enableFakegale || c.moneyManagement === 'fakegale' || c.selectedStrategy === 'fakegale') && (
                            <span style={{ fontSize: '0.52rem', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.5)', color: '#fbcfe8', padding: '0px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                              🧪 FAKEGALE
                            </span>
                          )}
                        </span>
                        <span>Stake: <strong>${c.stakeValue}</strong></span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.6rem', color: '#34d399', fontWeight: 'bold' }}>
                          Meta: +${c.takeProfit}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          color: statusInfo.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {statusInfo.dotClass && (
                            <span className={statusInfo.dotClass} style={{ width: '5px', height: '5px', boxShadow: 'none' }} />
                          )}
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* Translucent Overlay on Finished Cycle */}
                    {isFinished && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: overlayConfig.background,
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        zIndex: 10,
                        borderRadius: '10px',
                        border: overlayConfig.border,
                        boxShadow: overlayConfig.shadow,
                        pointerEvents: 'auto'
                      }}>
                        <div style={{
                          fontSize: '0.6rem',
                          fontWeight: '800',
                          color: overlayConfig.titleColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {overlayConfig.title}
                        </div>
                        <div style={{
                          fontSize: '1.05rem',
                          fontWeight: '900',
                          fontFamily: 'var(--font-mono)',
                          color: 'white',
                          textShadow: overlayConfig.textShadow
                        }}>
                          {overlayConfig.valueText}
                        </div>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>
                          Missão Concluída
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Batch Controls */}
          <div style={{ display: 'flex', gap: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleResetAllCycles}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.65rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Resetar Status
            </button>
            <button
              onClick={handleBatchClearAll}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.65rem',
                borderRadius: '6px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Limpar Todos
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL: COCKPIT DETALHADO DA MISSÃO */}
        <div className="glass-panel" style={{
          padding: '1.35rem 1.6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
          background: 'rgba(15, 11, 28, 0.5)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '18px',
          overflowY: 'auto'
        }}>
          {!selectedCycle ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(139, 92, 246, 0.15)'
              }}>
                <Sliders size={32} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem', color: 'white', display: 'block' }}>Nenhuma missão selecionada</strong>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block', maxWidth: '340px' }}>
                  Selecione uma missão na linha do tempo para inspecionar parâmetros operacionais, gatilhos MHI e gerenciar sua execução.
                </span>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(true)}
                style={{
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(139, 92, 246, 0.35)'
                }}
              >
                Abrir Gerador de Linha do Tempo 🚀
              </button>
            </div>
          ) : (
            <>
              {/* Mission Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem'
                  }}>
                    {selectedCycle.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'white' }}>{selectedCycle.name}</h3>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.35)',
                        color: '#c084fc',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {selectedCycle.startTime} ({selectedCycle.timezone || 'GMT-3'})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      Dias Ativos: <strong style={{ color: '#cbd5e1' }}>{selectedCycle.days.join(', ')}</strong>
                    </span>
                  </div>
                </div>

                {/* Switch Active */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: selectedCycle.active ? '#34d399' : 'var(--text-muted)' }}>
                    {selectedCycle.active ? 'Missão Ativa' : 'Pausada'}
                  </span>
                  <Switch showStatus={false} scale={0.75} checked={selectedCycle.active} onChange={() => { if (activeCycleId === selectedCycle.id) { onStopBot(); } else { handleToggleCycleActive(selectedCycle.id, selectedCycle.active); } }} />
                </div>
              </div>

              {/* Strategy & MHI AI Dynamic Study Highlight Banner */}
              {(() => {
                const isFakegale = selectedCycle.selectedStrategy === 'fakegale' || selectedCycle.moneyManagement === 'fakegale' || selectedCycle.enableFakegale;
                const isMhiAuto = selectedCycle.selectedStrategy === 'mhi_auto';
                const isSmartHours = selectedCycle.name.includes('%') || selectedCycle.name.includes('ops');
                const winRateMatch = selectedCycle.name.match(/(\d+(?:\.\d+)?%)/);
                const opsMatch = selectedCycle.name.match(/\((\d+\s*ops)\)/);
                const winRateText = winRateMatch ? winRateMatch[1] : null;
                const opsText = opsMatch ? opsMatch[1] : null;

                return (
                  <div style={{
                    background: isFakegale
                      ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.18) 100%)'
                      : isMhiAuto
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    border: isFakegale ? '1.5px solid rgba(244, 114, 182, 0.55)' : isMhiAuto ? '1.5px solid rgba(167, 139, 250, 0.55)' : '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: isFakegale ? '0 0 20px rgba(236, 72, 153, 0.18)' : isMhiAuto ? '0 0 20px rgba(139, 92, 246, 0.15)' : 'none',
                    borderRadius: '14px',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        background: isFakegale ? 'rgba(236, 72, 153, 0.25)' : 'rgba(139, 92, 246, 0.25)',
                        border: isFakegale ? '1px solid rgba(244, 114, 182, 0.45)' : '1px solid rgba(139, 92, 246, 0.45)',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>
                        {isFakegale ? '🧪' : isMhiAuto ? '🧠' : '🏆'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{isFakegale ? 'MODO FAKEGALE VOL 100 — TESTES IA' : isMhiAuto ? 'MODO MHI VOL 100 — AUTO-ESTUDO DINÂMICO IA' : 'SMART HOURS ENGINE (IA ESTATÍSTICA)'}</span>
                          <span style={{ fontSize: '0.58rem', background: isFakegale ? '#ec4899' : '#10B981', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            {isFakegale ? 'TESTES / G1 SNIPER' : isMhiAuto ? 'SNIPER ATIVO' : 'OTIMIZADO'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.66rem', color: '#cbd5e1', marginTop: '2px', display: 'block' }}>
                          {isFakegale
                            ? 'A 1ª vela atua como sinal/teste virtual. Entrada real disparada na 2ª vela (G1) apenas se a 1ª vela der Loss.'
                            : isMhiAuto
                            ? 'O robô estuda continuamente o Volatility 100 Index e decide antes de operar o padrão líder (MHI 1 a 3 Minoria/Maioria).'
                            : isSmartHours
                            ? `Horário de alta assertividade: ${winRateText ? winRateText + ' winrate' : ''} ${opsText ? '(' + opsText + ')' : ''}`
                            : 'Missão operando com busca dinâmica de oportunidades.'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.55rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>GERENCIAMENTO</span>
                        <strong style={{ fontSize: '0.74rem', color: isFakegale ? '#f472b6' : '#c084fc' }}>
                          {isFakegale ? '🧪 Fakegale (G1)' : selectedCycle.moneyManagement === 'sorosgale' ? '🚀 Sorosgale' : selectedCycle.moneyManagement === 'soros' ? 'Soros' : 'Martingale'}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons Toolbar */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {activeCycleId === selectedCycle.id ? (
                  <button
                    onClick={onStopBot}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#f87171',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 0 12px rgba(239,68,68,0.3)'
                    }}
                  >
                    <Power size={13} /> Parar Execução
                  </button>
                ) : (
                  <button
                    onClick={() => onTriggerCycleManually(selectedCycle.id)}
                    disabled={!schedulerState}
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 0 12px rgba(16,185,129,0.2)'
                    }}
                  >
                    <Play size={13} fill="currentColor" /> Executar Agora
                  </button>
                )}

                <button
                  onClick={() => handleEditClick(selectedCycle)}
                  disabled={activeCycleId === selectedCycle.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Settings size={13} /> Editar
                </button>

                <button
                  onClick={() => handleDuplicateClick(selectedCycle)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Layers size={13} /> Duplicar
                </button>

                {selectedCycle.status !== 'Aguardando' && (
                  <button
                    onClick={() => handleResetCycleStatus(selectedCycle.id)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-secondary)',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <RefreshCw size={13} /> Resetar Status
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCycle(selectedCycle.id)}
                  disabled={activeCycleId === selectedCycle.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>

              {/* Grid of 4 Detail Cards (2x2) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                {/* Card 1: Mercado & Estratégia */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <strong style={{ fontSize: '0.72rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>🎯</span> Configurações de Mercado
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Ativo:</span>
                      <strong style={{ color: '#34d399' }}>{getCleanSymbolName(selectedCycle.symbol)} ({selectedCycle.symbol})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Timeframe:</span>
                      <strong style={{ color: 'white' }}>{selectedCycle.granularity === '60' ? '1 Minuto (M1)' : selectedCycle.granularity === '300' ? '5 Minutos (M5)' : '15 Minutos (M15)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Estratégia:</span>
                      <strong style={{ color: '#c084fc' }}>{getCleanStrategyName(selectedCycle.selectedStrategy)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Gestão de Risco & Alvos */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <strong style={{ fontSize: '0.72rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>💰</span> Alvos Financeiros & Micro-Metas
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '0.2rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Entrada</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>${selectedCycle.stakeValue.toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.06)', padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ fontSize: '0.55rem', color: '#34d399', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Stop Win</span>
                      <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>+${selectedCycle.takeProfit.toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.06)', padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span style={{ fontSize: '0.55rem', color: '#f87171', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Stop Loss</span>
                      <strong style={{ color: '#f87171', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>-${selectedCycle.stopLoss.toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Modo</span>
                      <strong style={{ color: '#c084fc', fontSize: '0.74rem' }}>{selectedCycle.moneyManagement}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 3: Scanner & Probabilidade */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <strong style={{ fontSize: '0.72rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📡</span> Scanner & Probabilidade
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Scanner Inteligente:</span>
                      <strong style={{ color: '#34d399' }}>ATIVO 🟢</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Probabilidade Mínima:</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>
                        {selectedCycle.minProbability || 90}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Filtro de Tendência:</span>
                      <strong style={{ color: 'white' }}>Médias Móveis & Streak</strong>
                    </div>
                  </div>
                </div>

                {/* Card 4: Gale & Filtros de Proteção */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <strong style={{ fontSize: '0.72rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>🛡️</span> {selectedCycle.moneyManagement === 'sorosgale' ? 'Sorosgale & Filtros' : 'Martingale & Filtros'}
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {selectedCycle.moneyManagement === 'sorosgale' ? 'Recuperação Gales:' : 'Níveis de Martingale:'}
                      </span>
                      <strong style={{ color: 'white' }}>
                        {selectedCycle.moneyManagement === 'sorosgale'
                          ? `${selectedCycle.sorosgaleMaxGale || selectedCycle.martingaleLevels || 2} Gales`
                          : `${selectedCycle.martingaleLevels || 0} Níveis`}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Multiplicador Gale:</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{selectedCycle.martingaleMultiplier || 2.0}x</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Streak Shield:</span>
                      <strong style={{ color: selectedCycle.enableStreakShield ? '#34d399' : 'var(--text-muted)' }}>
                        {selectedCycle.enableStreakShield ? `ATIVO (${selectedCycle.maxStreakCandles || 4}V)` : 'DESATIVADO'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* FLUXO VISUAL PIPELINE (7 INTERACTIVE STAGES) */}
              <div style={{
                background: 'rgba(15, 11, 28, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡</span> Pipeline de Execução em Tempo Real
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                    Fase Atual: <strong style={{ color: 'white' }}>{selectedCycle.status}</strong>
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  marginTop: '0.25rem',
                  padding: '0.4rem 0',
                  position: 'relative',
                  overflowX: 'auto'
                }}>
                  {(() => {
                    const activeStep = getPipelineActiveIndex(selectedCycle.status);
                    
                    const pipelineSteps = [
                      { label: 'Agendado', info: selectedCycle.startTime },
                      { label: 'Scanner Ativo', info: 'Buscando' },
                      { label: 'Estudo IA', info: selectedCycle.selectedStrategy === 'mhi_auto' ? 'MHI 1-3' : 'Analítico' },
                      { label: 'Gatilho', info: `>${selectedCycle.minProbability || 90}%` },
                      { label: 'Disparo Spot', info: 'Ordem' },
                      { label: 'Gestão Gale', info: `${selectedCycle.martingaleLevels || 2} lvl` },
                      { label: 'Conclusão', info: 'Resultado' }
                    ];

                    return pipelineSteps.map((step, idx) => {
                      const isCompleted = idx < activeStep;
                      const isCurrent = idx === activeStep;

                      let nodeBg = 'rgba(255,255,255,0.02)';
                      let nodeBorder = 'rgba(255,255,255,0.06)';
                      let textColor = 'var(--text-muted)';
                      let badgeColor = 'rgba(255,255,255,0.03)';
                      let badgeText = '#64748b';

                      if (isCompleted) {
                        nodeBg = 'rgba(16, 185, 129, 0.08)';
                        nodeBorder = 'rgba(16, 185, 129, 0.35)';
                        textColor = '#cbd5e1';
                        badgeColor = 'rgba(16, 185, 129, 0.18)';
                        badgeText = '#34d399';
                      } else if (isCurrent) {
                        nodeBg = 'rgba(139, 92, 246, 0.18)';
                        nodeBorder = '#a78bfa';
                        textColor = 'white';
                        badgeColor = 'rgba(139, 92, 246, 0.3)';
                        badgeText = '#c084fc';
                      }

                      return (
                        <React.Fragment key={idx}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            minWidth: '76px',
                            flex: 1,
                            padding: '6px',
                            borderRadius: '10px',
                            background: nodeBg,
                            border: `1px solid ${nodeBorder}`,
                            boxShadow: isCurrent ? '0 0 16px rgba(139, 92, 246, 0.25)' : 'none',
                            transition: 'all 0.3s ease'
                          }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: textColor, textAlign: 'center' }}>
                              {step.label}
                            </span>
                            <span style={{
                              fontSize: '0.55rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: badgeColor,
                              color: badgeText,
                              fontWeight: '800',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {step.info}
                            </span>
                          </div>

                          {idx < pipelineSteps.length - 1 && (
                            <div style={{
                              width: '16px',
                              height: '2px',
                              background: isCompleted ? '#10b981' : 'rgba(255,255,255,0.06)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}>
                              {isCurrent && (
                                <span className="pulse-primary" style={{
                                  position: 'absolute',
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#a78bfa',
                                  boxShadow: '0 0 8px #a78bfa'
                                }} />
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* LATERAL DIREITA: AUDITORIA, MONITOR & LOGS */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          background: 'rgba(15, 11, 28, 0.45)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          {/* Engine Real-Time Monitor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>📡</span> Status do Terminal
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.65rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Motor de Ciclos:</span>
                <strong style={{ color: schedulerState ? '#34d399' : '#f87171' }}>
                  {schedulerState ? '● OPERANDO' : 'OFFLINE'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scanner Ativo:</span>
                <strong style={{ color: activeCycleId ? '#c084fc' : '#64748b' }}>
                  {activeCycleId ? 'BUSCANDO SINAL' : 'STANDBY'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Conexão Deriv:</span>
                <strong style={{ color: '#34d399' }}>SYNCED 🟢</strong>
              </div>
            </div>
          </div>

          {/* PAINEL DE RESET AUTOMÁTICO E RENOVAÇÃO */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            background: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <RefreshCw size={13} className="pulse-primary" /> Renovação Diária
              </span>
              <span style={{
                fontSize: '0.58rem',
                fontWeight: '800',
                padding: '2px 5px',
                borderRadius: '4px',
                background: autoReset.autoRenew ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: autoReset.autoRenew ? '#34d399' : '#f87171'
              }}>
                {autoReset.autoRenew ? 'AUTO 🟢' : 'OFF 🔴'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.7rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reset Diário:</span>
                <Switch showStatus={false} scale={0.7} checked={!!autoReset.enabled} onChange={(e) => handleUpdateAutoReset({ enabled: e.target.checked })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Horário do Reset:</span>
                <input
                  type="time"
                  value={autoReset.time || '00:10'}
                  onChange={(e) => handleUpdateAutoReset({ time: e.target.value })}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    borderRadius: '5px',
                    padding: '2px 5px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Relatório Telegram:</span>
                <Switch showStatus={false} scale={0.7} checked={!!autoReset.telegramNotify} onChange={(e) => handleUpdateAutoReset({ telegramNotify: e.target.checked })} />
              </div>
            </div>

            <button
              onClick={() => {
                if (onTriggerAutoResetManual) {
                  onTriggerAutoResetManual();
                } else {
                  handleResetAllCycles();
                }
              }}
              style={{
                marginTop: '0.2rem',
                padding: '0.4rem',
                fontSize: '0.64rem',
                fontWeight: 'bold',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={11} /> Resetar & Notificar Telegram
            </button>
          </div>

          {/* Logs Timeline Widget with Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>📜</span> LOGS DO SISTEMA ({filteredLogs.length})
              </h4>
              <button 
                onClick={onClearSchedulerLogs}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.58rem', cursor: 'pointer', padding: '2px', fontWeight: 'bold' }}
              >
                Limpar
              </button>
            </div>

            {/* Log Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.25)', padding: '2px', borderRadius: '6px' }}>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'ia', label: '🧠 IA' },
                { key: 'trades', label: '📈 Trades' },
                { key: 'errors', label: '⚠️ Alertas' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setLogFilter(tab.key)}
                  style={{
                    flex: 1,
                    padding: '2px 4px',
                    fontSize: '0.56rem',
                    fontWeight: 'bold',
                    background: logFilter === tab.key ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    color: logFilter === tab.key ? 'white' : '#94a3b8',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Log Search input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Pesquisar registros..."
                style={{
                  padding: '0.35rem 0.5rem 0.35rem 1.5rem',
                  fontSize: '0.66rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: '6px', color: 'var(--text-muted)' }} />
            </div>

            {/* Logs Scrollbox */}
            <div style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '0.45rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              {filteredLogs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontStyle: 'italic', textAlign: 'center', display: 'block', marginTop: '1rem' }}>
                  Nenhum registro encontrado.
                </span>
              ) : (
                filteredLogs.map((log, idx) => {
                  let badgeColor = 'rgba(255,255,255,0.03)';
                  let icon = '⚪';
                  let borderColor = '#8b5cf6';

                  if (log.type === 'error') {
                    badgeColor = 'rgba(239, 68, 68, 0.12)';
                    icon = '🔴';
                    borderColor = '#ef4444';
                  } else if (log.type === 'success') {
                    badgeColor = 'rgba(16, 185, 129, 0.12)';
                    icon = '🟢';
                    borderColor = '#10b981';
                  } else if (log.type === 'warning') {
                    badgeColor = 'rgba(245, 158, 11, 0.12)';
                    icon = '🟡';
                    borderColor = '#f59e0b';
                  } else if (log.message && (log.message.includes('IA') || log.message.includes('MHI'))) {
                    badgeColor = 'rgba(139, 92, 246, 0.12)';
                    icon = '🧠';
                    borderColor = '#a78bfa';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.35rem 0.45rem',
                        background: badgeColor,
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        borderLeft: `2px solid ${borderColor}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.56rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        <span>{icon} {log.type ? log.type.toUpperCase() : 'EVENTO'}</span>
                        <span>{log.time}</span>
                      </div>
                      <p style={{ fontSize: '0.64rem', color: '#e2e8f0', margin: 0, lineHeight: '1.3' }}>
                        {log.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SCHEDULING GENERATOR MODAL */}
      {isGeneratorOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(9, 6, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(12, 10, 24, 0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 0 70px rgba(139, 92, 246, 0.28)',
            borderRadius: '24px',
            width: '1120px',
            maxWidth: '96vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={20} style={{ color: '#a78bfa' }} /> Gerador de Linha do Tempo
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                  Programe missões automáticas de alta probabilidade com inteligência estatística e estudo dinâmico de padrões.
                </span>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div style={{ padding: '0.75rem 1.75rem', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚡ Presets:
              </span>
              <button
                type="button"
                onClick={() => applyGeneratorPreset('fakegale')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || generatorData.mhiVariant === 'fakegale') ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255,255,255,0.04)',
                  border: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || generatorData.mhiVariant === 'fakegale') ? '1px solid #f472b6' : '1px solid rgba(255,255,255,0.08)',
                  color: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale' || generatorData.mhiVariant === 'fakegale') ? '#f472b6' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🧪</span> Fakegale Sniper (MHI G1) [Testes]
              </button>
              <button
                type="button"
                onClick={() => applyGeneratorPreset('mhi_smart')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: generatorData.onlyMhiR100 && generatorData.mhiVariant === 'mhi_auto' && !generatorData.enableFakegale ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.04)',
                  border: generatorData.onlyMhiR100 && generatorData.mhiVariant === 'mhi_auto' && !generatorData.enableFakegale ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)',
                  color: generatorData.onlyMhiR100 && generatorData.mhiVariant === 'mhi_auto' && !generatorData.enableFakegale ? '#c084fc' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🧠</span> MHI Vol 100 Inteligente (Sniper)
              </button>
              <button
                type="button"
                onClick={() => applyGeneratorPreset('sorosgale_turbo')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🚀</span> Sorosgale Turbo
              </button>
              <button
                type="button"
                onClick={() => applyGeneratorPreset('conservative')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🛡️</span> Conservador (Mão Fixa)
              </button>
              <button
                type="button"
                onClick={() => applyGeneratorPreset('smart_hours_g3')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🏆</span> Smart Hours Pro (G3+)
              </button>
            </div>

            {/* Content Body - 3 Columns */}
            <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.05fr 1.05fr', gap: '1.15rem', alignItems: 'start' }}>
                
                {/* COLUMN 1: Estratégia MHI & Filtros de Proteção */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* Card MHI Volatility 100 Exclusivo */}
                  <div style={{
                    background: generatorData.onlyMhiR100 
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.16) 100%)' 
                      : 'rgba(255,255,255,0.02)',
                    border: generatorData.onlyMhiR100 
                      ? '1.5px solid rgba(167, 139, 250, 0.55)' 
                      : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: generatorData.onlyMhiR100
                      ? '0 0 25px rgba(139, 92, 246, 0.2)'
                      : 'none',
                    borderRadius: '16px',
                    padding: '1.1rem',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: generatorData.onlyMhiR100 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.25rem', transition: 'all 0.3s ease'
                        }}>🎯</div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: generatorData.onlyMhiR100 ? '#c084fc' : 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Modo MHI Vol 100</span>
                            {generatorData.onlyMhiR100 && (
                              <span style={{ fontSize: '0.55rem', background: 'rgba(139, 92, 246, 0.35)', border: '1px solid rgba(167, 139, 250, 0.5)', padding: '1px 6px', borderRadius: '4px', color: '#e9d5ff', fontWeight: '800' }}>
                                RECOMENDADO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px' }}>
                            Operar estratégias MHI no Volatility 100 Index (R_100)
                          </div>
                        </div>
                      </div>
                      <Switch
                        showStatus={false}
                        scale={0.9}
                        checked={generatorData.onlyMhiR100}
                        onChange={(e) => setGeneratorData(prev => ({ ...prev, onlyMhiR100: e.target.checked }))}
                      />
                    </div>

                    {generatorData.onlyMhiR100 && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#a78bfa', display: 'block', marginBottom: '3px', letterSpacing: '0.5px' }}>
                              SELEÇÃO DO PADRÃO MHI
                            </label>
                            <select
                              value={generatorData.mhiVariant || 'mhi_auto'}
                              onChange={(e) => setGeneratorData(prev => ({
                                ...prev,
                                mhiVariant: e.target.value,
                                enableFakegale: e.target.value === 'fakegale' ? true : prev.enableFakegale
                              }))}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.5rem',
                                background: '#09090f',
                                color: 'white',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                borderRadius: '8px',
                                width: '100%',
                                outline: 'none',
                                fontWeight: '600'
                              }}
                            >
                              <option value="mhi_auto">🧠 Estudo Automático MHI (IA)</option>
                              <option value="fakegale">🧪 Fakegale MHI (Auto IA - Testes)</option>
                              <option value="mhi_minority">🎯 MHI 1 (Minoria)</option>
                              <option value="mhi_majority">🎯 MHI 1 (Maioria)</option>
                              <option value="mhi_2_minority">🎯 MHI 2 (Minoria)</option>
                              <option value="mhi_2_majority">🎯 MHI 2 (Maioria)</option>
                              <option value="mhi_3_minority">🎯 MHI 3 (Minoria)</option>
                              <option value="mhi_3_majority">🎯 MHI 3 (Maioria)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '3px', letterSpacing: '0.5px' }}>
                              ATIVO EXCLUSIVO
                            </label>
                            <div style={{
                              fontSize: '0.75rem',
                              padding: '0.5rem 0.6rem',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>🛡️ R_100</span>
                            </div>
                          </div>
                        </div>

                        {/* Explanatory callout for MHI */}
                        <div style={{
                          padding: '7px 9px',
                          borderRadius: '8px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          fontSize: '0.62rem',
                          color: '#e2e8f0',
                          lineHeight: '1.35'
                        }}>
                          {(!generatorData.mhiVariant || generatorData.mhiVariant === 'mhi_auto') ? (
                            <div>
                              <strong style={{ color: '#c084fc' }}>🧠 Auto-Estudo Dinâmico:</strong> O robô avalia os ciclos de velas e decide antes de cada horário o melhor padrão entre <strong>MHI 1 a 3 (Minoria/Maioria)</strong>.
                              <div style={{ color: '#a78bfa', marginTop: '2px', fontSize: '0.56rem', fontWeight: 'bold' }}>
                                ✓ Padrão 21 desativado para máxima velocidade.
                              </div>
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: '#c084fc' }}>🎯 Padrão Fixo:</strong> As missões operarão com <strong>{mhiVariantLabels[generatorData.mhiVariant]}</strong> no Volatility 100 Index.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card: Filtros de Proteção */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', display: 'block', marginBottom: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      🛡️ Filtros & Proteção Avançada
                    </span>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <div>
                        <strong style={{ color: '#34d399', display: 'block', fontSize: '0.74rem' }}>Streak Shield</strong>
                        <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>Bloqueia contra tendências de 4+ velas</span>
                      </div>
                      <Switch showStatus={false} scale={0.8} checked={generatorData.enableStreakShield ?? true} onChange={(e) => setGeneratorData(prev => ({ ...prev, enableStreakShield: e.target.checked }))} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <div>
                        <strong style={{ color: '#60a5fa', display: 'block', fontSize: '0.74rem' }}>⏱️ Time Guard (30 Min)</strong>
                        <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>Trava lucro positivo se exceder 30 min</span>
                      </div>
                      <Switch showStatus={false} scale={0.8} checked={generatorData.enableTimeGuard ?? true} onChange={(e) => setGeneratorData(prev => ({ ...prev, enableTimeGuard: e.target.checked }))} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <div>
                        <strong style={{ color: '#fbbf24', display: 'block', fontSize: '0.74rem' }}>🔄 Anti-Estagnação</strong>
                        <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>Troca se 6+ ops sem sair do zero</span>
                      </div>
                      <Switch showStatus={false} scale={0.8} checked={generatorData.enableStalemateFailover ?? true} onChange={(e) => setGeneratorData(prev => ({ ...prev, enableStalemateFailover: e.target.checked }))} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <span style={{ color: '#cbd5e1' }}>Vela Master secundária</span>
                      <Switch showStatus={false} scale={0.8} checked={generatorData.enableMasterCandleSecondary} onChange={(e) => setGeneratorData(prev => ({ ...prev, enableMasterCandleSecondary: e.target.checked }))} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <span style={{ color: '#cbd5e1' }}>Desativar estratégias lentas</span>
                      <Switch showStatus={false} scale={0.8} checked={generatorData.disableSlowStrategies} onChange={(e) => setGeneratorData(prev => ({ ...prev, disableSlowStrategies: e.target.checked }))} />
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Parâmetros Financeiros & Gerenciamento */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* Card 1: Metas Financeiras */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.1rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', display: 'block', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      💰 Parâmetros Financeiros
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '5px', letterSpacing: '0.5px' }}>ENTRADA ($)</label>
                        <input
                          type="number"
                          value={generatorData.stakeValue}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, stakeValue: e.target.value }))}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.55rem',
                            background: '#09090f',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#34d399', display: 'block', marginBottom: '5px', letterSpacing: '0.5px' }}>STOP WIN ($)</label>
                        <input
                          type="number"
                          value={generatorData.takeProfit}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, takeProfit: e.target.value }))}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.55rem',
                            background: '#09090f',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '8px',
                            width: '100%',
                            fontWeight: 'bold'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#f87171', display: 'block', marginBottom: '5px', letterSpacing: '0.5px' }}>STOP LOSS ($)</label>
                        <input
                          type="number"
                          value={generatorData.stopLoss}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, stopLoss: e.target.value }))}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.55rem',
                            background: '#09090f',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            borderRadius: '8px',
                            width: '100%',
                            fontWeight: 'bold'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Gerenciamento & Gale */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', display: 'block', marginBottom: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      📊 Gerenciamento & Martingale
                    </span>
                    
                    <div>
                      <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>MODO DE GESTÃO</label>
                      <select
                        value={generatorData.moneyManagement || 'sorosgale'}
                        onChange={(e) => {
                          const isFake = e.target.value === 'fakegale';
                          setGeneratorData(prev => ({
                            ...prev,
                            moneyManagement: isFake ? 'martingale' : e.target.value,
                            enableFakegale: isFake ? true : prev.enableFakegale,
                            martingaleLevels: isFake ? 6 : prev.martingaleLevels,
                            stopLoss: isFake ? 35.0 : prev.stopLoss
                          }));
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.55rem',
                          background: '#09090f',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          width: '100%',
                          outline: 'none'
                        }}
                      >
                        <option value="sorosgale">🚀 Sorosgale (Recomendado)</option>
                        <option value="fakegale">🧪 Fakegale (Entrada no G1 - Testes)</option>
                        <option value="fixed">Mão Fixa (Fixed)</option>
                        <option value="martingale">Martingale Padrão</option>
                        <option value="progressive_gale">Gale Progressivo</option>
                        <option value="soros">Soros (Apenas Win)</option>
                        <option value="iron_hands">Iron Hands</option>
                      </select>
                    </div>

                    {/* Dedicated Fakegale Toggle Switch */}
                    <div style={{
                      padding: '8px 10px',
                      background: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale') ? 'rgba(236, 72, 153, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale') ? '1px solid rgba(244, 114, 182, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 'bold', color: (generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale') ? '#f472b6' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>🧪 Modo Fakegale</span>
                          <span style={{ fontSize: '0.55rem', background: 'rgba(236, 72, 153, 0.25)', border: '1px solid #f472b6', padding: '1px 5px', borderRadius: '4px', color: '#fbcfe8', fontWeight: '800' }}>
                            EM TESTES
                          </span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: '2px' }}>
                          1ª vela como sinal virtual. Entrada real no G1 após loss.
                        </div>
                      </div>
                      <Switch
                        showStatus={false}
                        scale={0.8}
                        checked={generatorData.enableFakegale || generatorData.moneyManagement === 'fakegale'}
                        onChange={(e) => setGeneratorData(prev => ({
                          ...prev,
                          enableFakegale: e.target.checked,
                          moneyManagement: e.target.checked ? 'fakegale' : (prev.moneyManagement === 'fakegale' ? 'sorosgale' : prev.moneyManagement)
                        }))}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>NÍVEIS GALE</label>
                        <select
                          value={generatorData.martingaleLevels ?? 2}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, martingaleLevels: parseInt(e.target.value) }))}
                          disabled={generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands'}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.5rem',
                            background: '#09090f',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            width: '100%',
                            outline: 'none'
                          }}
                        >
                          <option value="0">Sem Gale</option>
                          <option value="1">1 Gale</option>
                          <option value="2">2 Gales</option>
                          <option value="3">3 Gales</option>
                          <option value="4">4 Gales</option>
                          <option value="5">5 Gales</option>
                          <option value="6">6 Gales</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>MULTIPLICADOR</label>
                        <input
                          type="number"
                          value={generatorData.martingaleMultiplier ?? 2.0}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, martingaleMultiplier: parseFloat(e.target.value) }))}
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          disabled={generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' || generatorData.martingaleLevels === 0}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.5rem',
                            background: '#09090f',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: Períodos & Smart Hours Engine */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* Period Selectors */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.1rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', display: 'block', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      🕒 Períodos de Operação
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'dawn', label: 'Madrugada', desc: '00h às 06h', icon: '🌙' },
                        { key: 'morning', label: 'Manhã', desc: '06h às 12h', icon: '🌅' },
                        { key: 'afternoon', label: 'Tarde', desc: '12h às 18h', icon: '🌇' },
                        { key: 'night', label: 'Noite', desc: '18h às 00h', icon: '🌌' }
                      ].map(p => {
                        const isSelected = generatorData.periods[p.key];
                        return (
                          <div
                            key={p.key}
                            onClick={() => setGeneratorData(prev => ({
                              ...prev,
                              periods: { ...prev.periods, [p.key]: !prev.periods[p.key] }
                            }))}
                            style={{
                              padding: '8px 10px',
                              background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected ? '1px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ fontSize: '1.2rem' }}>{p.icon}</div>
                            <div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 'bold', color: isSelected ? 'white' : '#cbd5e1' }}>{p.label}</div>
                              <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>{p.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── SMART HOURS FEATURE ─── */}
                  <div style={{
                    borderRadius: '16px',
                    border: generatorData.useSmartHours
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: generatorData.useSmartHours
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Toggle Header */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: generatorData.useSmartHours ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', transition: 'all 0.3s ease'
                        }}>🧠</div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: generatorData.useSmartHours ? '#34d399' : 'white' }}>
                            Smart Hours Engine (G3+)
                          </div>
                          <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>
                            Horários de maior assertividade estatística
                          </div>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={generatorData.useSmartHours}
                          onChange={(e) => setGeneratorData(prev => ({ ...prev, useSmartHours: e.target.checked }))}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {/* Smart Hours Preview */}
                    {generatorData.useSmartHours && (
                      <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.75rem 0.9rem' }}>
                        {smartHours.length === 0 ? (
                          <div style={{
                            textAlign: 'center', padding: '0.75rem',
                            color: '#94a3b8', fontSize: '0.68rem',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                          }}>
                            <span style={{ fontSize: '1.2rem' }}>📊</span>
                            <span>Aguardando histórico para ranking estatístico.</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '170px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '0.58rem', fontWeight: '800', color: '#10b981', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                              🏆 Top {smartHours.length} Horários Detectados
                            </div>
                            {smartHours.map((h, idx) => {
                              const periodColor = getPeriodColor(h.hour);
                              return (
                                <div key={h.hour} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 6px',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '6px',
                                  border: `1px solid ${periodColor}22`
                                }}>
                                  <div style={{
                                    width: '18px', height: '18px',
                                    borderRadius: '4px',
                                    background: `${periodColor}22`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.55rem', fontWeight: 'bold', color: periodColor
                                  }}>
                                    #{idx + 1}
                                  </div>
                                  <div style={{ fontSize: '0.75rem' }}>{getPeriodIcon(h.hour)}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'white' }}>
                                        {String(h.hour).padStart(2, '0')}:00h
                                      </span>
                                      <span style={{
                                        fontSize: '0.55rem', fontWeight: 'bold',
                                        color: parseFloat(h.winRate) >= 70 ? '#34d399' : parseFloat(h.winRate) >= 55 ? '#f59e0b' : '#f87171',
                                        background: parseFloat(h.winRate) >= 70 ? 'rgba(52,211,153,0.1)' : parseFloat(h.winRate) >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)',
                                        padding: '1px 4px', borderRadius: '4px'
                                      }}>
                                        {h.winRate}%
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.54rem', color: '#64748b' }}>
                                      {h.total} ops · {h.wins}W / {h.losses}L
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Dynamic Live Preview Panel */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '16px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> Prévia da Linha do Tempo Gerada
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 'bold', background: 'rgba(52, 211, 153, 0.12)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                    {previewSummary.missionCount} Missões Programadas
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', fontSize: '0.72rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase' }}>Estratégia</div>
                    <div style={{ fontWeight: 'bold', color: '#c084fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewSummary.strategyLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ativo Alvo</div>
                    <div style={{ fontWeight: 'bold', color: '#34d399', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewSummary.symbolLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase' }}>Meta / Missão</div>
                    <div style={{ fontWeight: 'bold', color: '#34d399' }}>+${parseFloat(generatorData.takeProfit || 5).toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase' }}>Potencial Diário</div>
                    <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>+${previewSummary.totalPotentialWin}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '1rem 1.75rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  color: '#cbd5e1',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateTimeline}
                className="action-button-glow"
                style={{
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  color: 'white',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)'
                }}
              >
                Gerar Linha do Tempo 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEPPER WIZARD MODAL */}
      {isWizardOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(9, 6, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(15, 11, 28, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.2)',
            borderRadius: '20px',
            width: '540px',
            maxWidth: '90%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Wizard Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  {wizardData.id ? 'Editar Missão Automática' : 'Criar Nova Missão de Automação'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Siga os passos para programar o robô trader.
                </span>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Progress bar */}
            <div style={{ display: 'flex', padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.15)', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {[
                { step: 1, label: 'Identidade' },
                { step: 2, label: 'Agenda' },
                { step: 3, label: 'Mercado' },
                { step: 4, label: 'Risco' },
                { step: 5, label: 'Confirmação' }
              ].map((s) => {
                const isActive = wizardStep === s.step;
                const isPassed = wizardStep > s.step;
                return (
                  <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary)' : (isPassed ? '#10b981' : 'rgba(255,255,255,0.05)'),
                      color: isActive || isPassed ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      border: isActive ? '1px solid white' : 'none'
                    }}>
                      {isPassed ? <Check size={10} /> : s.step}
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 'bold' : '500',
                      color: isActive ? 'white' : (isPassed ? '#cbd5e1' : '#64748b')
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Wizard Form Content */}
            <form onSubmit={handleSaveWizard} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>

                {/* STEP 1: IDENTIDADE */}
                {wizardStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Nome da Missão
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Operação Matinal, Scalper Volatilidade..."
                        value={wizardData.name}
                        onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                        required
                        style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Preset Icons Selection */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Ícone da Missão
                      </label>
                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        {presetIcons.map((ico) => {
                          const isSelected = wizardData.icon === ico;
                          return (
                            <button
                              key={ico}
                              type="button"
                              onClick={() => setWizardData({ ...wizardData, icon: ico })}
                              style={{
                                fontSize: '1.5rem',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                                border: isSelected ? '2px solid var(--primary-light)' : '1.5px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {ico}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preset Colors Selection */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Cor do Tema
                      </label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {presetColors.map((col) => {
                          const isSelected = wizardData.color === col;
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setWizardData({ ...wizardData, color: col })}
                              style={{
                                background: col,
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                border: isSelected ? '2px solid white' : '2px solid transparent',
                                boxShadow: isSelected ? `0 0 10px ${col}` : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: AGENDA */}
                {wizardStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Horário de Início (HH:MM)
                        </label>
                        <input
                          type="time"
                          value={wizardData.startTime}
                          onChange={(e) => setWizardData({ ...wizardData, startTime: e.target.value })}
                          required
                          style={{
                            padding: '0.6rem 0.8rem',
                            fontSize: '0.85rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            width: '100%',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Fuso Horário
                        </label>
                        <select
                          value={wizardData.timezone}
                          onChange={(e) => setWizardData({ ...wizardData, timezone: e.target.value })}
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        >
                          <option value="GMT-3">Brasília (GMT-3)</option>
                          <option value="GMT+0">UTC (GMT+0)</option>
                          <option value="GMT-4">Amazonas (GMT-4)</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Days Multi-selector */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Dias Ativos de Execução
                      </label>
                      <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'space-between' }}>
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => {
                          const isChecked = wizardData.days.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const updatedDays = isChecked
                                  ? wizardData.days.filter(day => day !== d)
                                  : [...wizardData.days, d];
                                setWizardData({ ...wizardData, days: updatedDays });
                              }}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0',
                                borderRadius: '6px',
                                background: isChecked ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                border: isChecked ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                color: isChecked ? 'white' : 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: MERCADO */}
                {wizardStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Ativo de Negociação
                      </label>
                      <select
                        value={wizardData.symbol}
                        onChange={(e) => setWizardData({ ...wizardData, symbol: e.target.value })}
                        style={{ height: '38px', fontSize: '0.85rem' }}
                      >
                        {assets.map(a => (
                          <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Timeframe (Velas)
                        </label>
                        <select
                          value={wizardData.granularity}
                          onChange={(e) => setWizardData({ ...wizardData, granularity: e.target.value })}
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        >
                          <option value="60">1 Minuto (M1)</option>
                          <option value="300">5 Minutos (M5)</option>
                          <option value="900">15 Minutos (M15)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Estratégia Principal
                        </label>
                        <select
                          value={wizardData.selectedStrategy || 'autopilot'}
                          onChange={(e) => setWizardData({ ...wizardData, selectedStrategy: e.target.value })}
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        >
                          {strategies.map(strat => (
                            <option key={strat.id} value={strat.id}>{strat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Assertividade Mínima do Sinal (%)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="range"
                          min="60"
                          max="95"
                          step="5"
                          value={wizardData.minProbability || 90}
                          onChange={(e) => setWizardData({ ...wizardData, minProbability: parseInt(e.target.value) })}
                          style={{ flex: 1, accentColor: 'var(--primary)' }}
                        />
                        <strong style={{ fontSize: '0.9rem', color: 'var(--primary-light)', fontFamily: 'var(--font-mono)', minWidth: '32px' }}>
                          {wizardData.minProbability || 90}%
                        </strong>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Ativo de Contingência / Backup (Failover)
                      </label>
                      <select
                        value={wizardData.backupSymbol || '1HZ100V'}
                        onChange={(e) => setWizardData({ ...wizardData, backupSymbol: e.target.value })}
                        style={{ height: '38px', fontSize: '0.85rem' }}
                      >
                        {assets.map(a => (
                          <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                        Usado automaticamente se o ativo principal estiver em alta volatilidade ou na Blacklist.
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 4: RISCO */}
                {wizardStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Entrada ($)
                        </label>
                        <input
                          type="number"
                          value={wizardData.stakeValue}
                          onChange={(e) => setWizardData({ ...wizardData, stakeValue: parseFloat(e.target.value) })}
                          min="0.35"
                          step="0.01"
                          required
                          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Meta ($)
                        </label>
                        <input
                          type="number"
                          value={wizardData.takeProfit}
                          onChange={(e) => setWizardData({ ...wizardData, takeProfit: parseFloat(e.target.value) })}
                          min="1"
                          step="1"
                          required
                          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Stop Loss ($)
                        </label>
                        <input
                          type="number"
                          value={wizardData.stopLoss}
                          onChange={(e) => setWizardData({ ...wizardData, stopLoss: parseFloat(e.target.value) })}
                          min="1"
                          step="1"
                          required
                          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Gerenciamento de Banca
                      </label>
                      <select
                        value={wizardData.moneyManagement || 'sorosgale'}
                        onChange={(e) => setWizardData({ ...wizardData, moneyManagement: e.target.value, enableFakegale: e.target.value === 'fakegale' ? true : wizardData.enableFakegale })}
                        style={{ height: '38px', fontSize: '0.85rem' }}
                      >
                        <option value="sorosgale">🚀 Sorosgale</option>
                        <option value="fakegale">🧪 Fakegale (G1 Sniper - Testes)</option>
                        <option value="fixed">Mão Fixa (Fixed)</option>
                        <option value="martingale">Martingale</option>
                        <option value="progressive_gale">Gale Progressivo</option>
                        <option value="soros">Soros (Compounding)</option>
                        <option value="iron_hands">Iron Hands</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Níveis de Gale
                        </label>
                        <select
                          value={wizardData.martingaleLevels}
                          onChange={(e) => setWizardData({ ...wizardData, martingaleLevels: parseInt(e.target.value) })}
                          disabled={wizardData.moneyManagement === 'fixed' || wizardData.moneyManagement === 'iron_hands'}
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        >
                          <option value="0">Sem Gale</option>
                          <option value="1">Gale Nível 1</option>
                          <option value="2">Gale Nível 2</option>
                          <option value="3">Gale Nível 3</option>
                          <option value="4">Gale Nível 4</option>
                          <option value="5">Gale Nível 5</option>
                          <option value="6">Gale Nível 6</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Multiplicador Gale
                        </label>
                        <input
                          type="number"
                          value={wizardData.martingaleMultiplier}
                          onChange={(e) => setWizardData({ ...wizardData, martingaleMultiplier: parseFloat(e.target.value) })}
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          disabled={wizardData.moneyManagement === 'fixed' || wizardData.moneyManagement === 'iron_hands' || wizardData.martingaleLevels === 0}
                          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Exclude/Flags checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: '#34d399', display: 'block' }}>🛡️ Trava de Sequência (Streak Shield)</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Bloqueia ordens contra tendências de 4+ velas seguidas</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.enableStreakShield ?? true} onChange={(e) => setWizardData({ ...wizardData, enableStreakShield: e.target.checked })} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: '#60a5fa', display: 'block' }}>⏱️ Time Guard (Trava 30 min)</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Trava lucro positivo acumulado se a sessão passar de 30 min</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.enableTimeGuard ?? true} onChange={(e) => setWizardData({ ...wizardData, enableTimeGuard: e.target.checked })} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'block' }}>🔄 Filtro Anti-Estagnação (Ativo)</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Troca de ativo se registrar 6+ ops sem sair do zero a zero</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.enableStalemateFailover ?? true} onChange={(e) => setWizardData({ ...wizardData, enableStalemateFailover: e.target.checked })} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Vela Mestra Secundária</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Filtra/opera rompimentos baseados em máximas/mínimas</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.enableMasterCandleSecondary} onChange={(e) => setWizardData({ ...wizardData, enableMasterCandleSecondary: e.target.checked })} />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Excluir Estratégias Lentas</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Pula Pullback e Reversão no piloto automático</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.disableSlowStrategies} onChange={(e) => setWizardData({ ...wizardData, disableSlowStrategies: e.target.checked })} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Excluir Cruzamento de Médias</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Pula Cruzamento de Médias no piloto automático</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.disableMaCrossover} onChange={(e) => setWizardData({ ...wizardData, disableMaCrossover: e.target.checked })} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Travar Lucros e Garantir Meta (`Lock Profit`)</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Encerra o ciclo imediatamente ao bater o Take Profit</span>
                        </div>
                        <Switch showStatus={false} scale={0.75} checked={wizardData.lockProfitSecured ?? true} onChange={(e) => setWizardData({ ...wizardData, lockProfitSecured: e.target.checked })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: CONFIRMAÇÃO */}
                {wizardStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                      <span style={{ fontSize: '2.5rem' }}>🚀</span>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0.5rem 0 0.25rem 0', color: 'white' }}>
                        Pronto para Lançamento!
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Revise a configuração da missão antes de registrar.
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Identidade:</span>
                        <strong>{wizardData.icon} {wizardData.name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Agenda:</span>
                        <strong>{wizardData.startTime} ({wizardData.timezone}) | {wizardData.days.join(', ')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Ativo & Timeframe:</span>
                        <strong>{getCleanSymbolName(wizardData.symbol)} | {wizardData.granularity === '60' ? 'M1' : wizardData.granularity === '300' ? 'M5' : 'M15'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Estratégia:</span>
                        <strong>{getCleanStrategyName(wizardData.selectedStrategy)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Gestão Risco:</span>
                        <strong>Entrada: ${wizardData.stakeValue} | Meta: ${wizardData.takeProfit} | Stop: ${wizardData.stopLoss}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Martingale:</span>
                        <strong>{wizardData.martingaleLevels > 0 ? `${wizardData.martingaleLevels} Níveis (${wizardData.martingaleMultiplier}x)` : 'Sem Gale'}</strong>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Wizard Footer buttons */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.1)'
              }}>
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={wizardStep === 1}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: wizardStep === 1 ? 'var(--text-muted)' : 'white',
                    cursor: wizardStep === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ChevronLeft size={14} /> Voltar
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    style={{
                      padding: '0.55rem 1.2rem',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Avançar <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="primary"
                    style={{
                      padding: '0.55rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle size={14} /> Salvar Missão
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ÁRVORE NEURAL DE DECISÃO & FLUXO DE ENTRADAS */}
      <DecisionTreeMapModal
        isOpen={isTreeMapModalOpen}
        onClose={() => setIsTreeMapModalOpen(false)}
        cycles={sanitizedCycles}
        selectedCycleId={selectedCycleId}
        activeCycleId={activeCycleId}
        isRunning={schedulerState}
        onSendTelegram={onSendDecisionTreeTelegram}
      />

    </div>
  );
}
