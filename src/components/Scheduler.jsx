import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Trash2, Play, AlertCircle, CheckCircle, RefreshCw, Calendar, Power, 
  X, ChevronRight, ChevronLeft, User, Cpu, ShieldCheck, Layers, TrendingUp, 
  TrendingDown, Info, Sliders, Eye, Settings, Activity, FileText, Check, Search, Award 
} from 'lucide-react';

export default function Scheduler({
  schedulerState,
  onToggleScheduler,
  cycles,
  onSaveCycles,
  activeCycleId,
  onTriggerCycleManually,
  schedulerLogs,
  onClearSchedulerLogs,
  onStopBot
}) {
  const defaultCycle = {
    name: '',
    startTime: '09:00',
    days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    timezone: 'GMT-3',
    symbol: 'R_100',
    granularity: '60', // 1m
    selectedStrategy: 'autopilot',
    moneyManagement: 'martingale',
    stakeValue: 1.0,
    takeProfit: 10.0,
    stopLoss: 20.0,
    martingaleLevels: 2,
    martingaleMultiplier: 2.0,
    enableMasterCandleSecondary: false,
    disableSlowStrategies: false,
    disableMaCrossover: false,
    minProbability: 90,
    minWinRate: 65,
    backupSymbol: '1HZ100V',
    lockProfitSecured: true,
    icon: '🤖',
    color: '#8b5cf6' // Purple
  };

  // Sanitize cycles array on the fly to support old items from localStorage
  const sanitizedCycles = (cycles || []).map(c => ({
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
    timezone: c.timezone || defaultCycle.timezone
  }));

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  
  // Wizard (Modal) States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState(defaultCycle);

  // Scheduling Generator Modal States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorData, setGeneratorData] = useState({
    stakeValue: 1.0,
    takeProfit: 10.0,
    stopLoss: 20.0,
    moneyManagement: 'martingale',
    martingaleLevels: 2,
    martingaleMultiplier: 2.0,
    periods: {
      dawn: true,
      morning: true,
      afternoon: true,
      night: true
    },
    enableMasterCandleSecondary: false,
    disableSlowStrategies: true,
    disableMaCrossover: false
  });

  const handleGenerateTimeline = () => {
    const newCycles = [];
    const periodsSelected = generatorData.periods;
    
    const stake = parseFloat(generatorData.stakeValue) || 1.0;
    const tp = parseFloat(generatorData.takeProfit) || 10.0;
    const sl = parseFloat(generatorData.stopLoss) || 20.0;
    const moneyMgmt = generatorData.moneyManagement || 'martingale';
    const galeLevels = generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' ? 0 : (parseInt(generatorData.martingaleLevels) ?? 2);
    const galeMult = generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' || galeLevels === 0 ? 1.0 : (parseFloat(generatorData.martingaleMultiplier) || 2.0);
    
    const periodConfigs = {
      dawn: [
        { time: '01:25', name: 'Madrugada - Reversão', icon: '🌙', color: '#8b5cf6', strategy: 'reversal' },
        { time: '03:40', name: 'Madrugada - Baixo Ruído', icon: '🌌', color: '#06b6d4', strategy: 'mhi_minority' },
        { time: '05:15', name: 'Madrugada - Transição', icon: '🌅', color: '#10b981', strategy: 'twin_towers' }
      ],
      morning: [
        { time: '07:30', name: 'Manhã - Tendência', icon: '⚡', color: '#f59e0b', strategy: 'ma_crossover' },
        { time: '09:45', name: 'Manhã - Alta Liquidez', icon: '🚀', color: '#8b5cf6', strategy: 'autopilot' },
        { time: '11:15', name: 'Manhã - Consolidação', icon: '🎯', color: '#10b981', strategy: 'three_musketeers' }
      ],
      afternoon: [
        { time: '13:30', name: 'Tarde - Pullback EMA20', icon: '📈', color: '#06b6d4', strategy: 'pullback' },
        { time: '15:45', name: 'Tarde - Consistência', icon: '🤖', color: '#ec4899', strategy: 'autopilot' },
        { time: '17:15', name: 'Tarde - Fim de Turno', icon: '🌇', color: '#ef4444', strategy: 'padrao_23' }
      ],
      night: [
        { time: '19:30', name: 'Noite - Padrão MHI', icon: '🛡️', color: '#8b5cf6', strategy: 'mhi_majority' },
        { time: '21:15', name: 'Noite - Volatilidade', icon: '⚡', color: '#f59e0b', strategy: 'padrao_3x1' },
        { time: '23:30', name: 'Noite - Encerramento', icon: '🌙', color: '#ec4899', strategy: 'autopilot' }
      ]
    };
    
    const targetAssets = ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_50', '1HZ50V'];
    let generatedCount = 0;
    
    Object.keys(periodConfigs).forEach(periodKey => {
      if (periodsSelected[periodKey]) {
        periodConfigs[periodKey].forEach(cfg => {
          const assetIndex = generatedCount % targetAssets.length;
          const symbol = targetAssets[assetIndex];
          
          const strategy = cfg.strategy || 'autopilot';
          const name = `${cfg.name} (Auto)`;
          
          newCycles.push({
            id: 'cycle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            startTime: cfg.time,
            days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            timezone: 'GMT-3',
            symbol: symbol,
            granularity: '60',
            selectedStrategy: strategy,
            stakeValue: stake,
            takeProfit: tp,
            stopLoss: sl,
            moneyManagement: moneyMgmt,
            martingaleLevels: galeLevels,
            martingaleMultiplier: galeMult,
            enableMasterCandleSecondary: !!generatorData.enableMasterCandleSecondary,
            disableSlowStrategies: !!generatorData.disableSlowStrategies,
            disableMaCrossover: !!generatorData.disableMaCrossover,
            minProbability: 92,
            icon: cfg.icon,
            color: cfg.color,
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
    
    const updatedCycles = [...sanitizedCycles, ...newCycles];
    onSaveCycles(updatedCycles);
    setIsGeneratorOpen(false);
  };

  // Filter States for Logs
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'today' | 'yesterday'

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
    { symbol: '1HZ200V', name: 'Volatility 200 (1s) Index' },
    { symbol: '1HZ300V', name: 'Volatility 300 (1s) Index' },
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
    { id: 'ma_crossover', name: 'Cruzamento de Médias (9/21)' },
    { id: 'mhi_minority', name: 'MHI Padrão (Minoria)' },
    { id: 'mhi_majority', name: 'MHI Maioria' },
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

  // Filter logs logic
  const filteredLogs = schedulerLogs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase());
    
    // Filter by date
    if (logFilter === 'today') {
      const todayStr = new Date().toLocaleDateString();
      // Since logs just show HH:MM:SS, let's assume they are today if added this session
      return matchesSearch;
    }
    return matchesSearch;
  });

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

      {/* TOPO: CENTRAL DE AUTOMAÇÃO */}
      <div className="glass-panel" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 11, 28, 0.75)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              Central de Automação de Missões
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Hora Local: <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentTime}</strong> | Missões Ativas: <strong>{sanitizedCycles.filter(c => c.active).length}</strong>
          </span>
        </div>

        {/* Top Quick Stats Grid */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Next Cycle Widget */}
          {nextCycle && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '1.5rem' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próxima Missão</span>
              <strong style={{ fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                {nextCycle.icon} {nextCycle.name} <span style={{ color: 'var(--primary-light)', fontSize: '0.75rem' }}>({nextCycle.startTime})</span>
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '2px', fontWeight: 'bold' }}>
                T-minus {nextCycleCountdown}
              </span>
            </div>
          )}

          {/* Motor Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motor IA</span>
              <strong style={{ fontSize: '0.8rem', color: schedulerState ? '#10b981' : '#ef4444', marginTop: '1px' }}>
                {schedulerState ? 'ONLINE & MONITORANDO' : 'DESACTIVADO'}
              </strong>
            </div>
            <label className="switch" style={{ width: '42px', height: '22px' }}>
              <input
                type="checkbox"
                checked={schedulerState}
                onChange={(e) => onToggleScheduler(e.target.checked)}
              />
              <span className="slider" style={{ borderRadius: '22px' }}></span>
            </label>
          </div>

          {/* Scheduling Generator Button */}
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="action-button-glow"
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: 'var(--primary-light)'
            }}
          >
            <Sliders size={16} /> Gerador de Agendamento
          </button>

          {/* Add New Mission Button */}
          <button
            onClick={handleOpenNewWizard}
            className="primary"
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Nova Missão
          </button>
        </div>
      </div>

      {/* BOTTOM LAYOUT GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr 290px',
        gap: '1.25rem',
        flex: 1,
        overflow: 'hidden',
        minHeight: '620px'
      }}>

        {/* LATERAL ESQUERDA: TIMELINE DOS CICLOS */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(15, 11, 28, 0.4)',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '16px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            Linha do Tempo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {sanitizedCycles.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                <Clock size={28} />
                <span style={{ fontSize: '0.72rem' }}>Nenhuma missão programada.</span>
              </div>
            ) : (
              sanitizedCycles.map((c) => {
                const isSelected = c.id === selectedCycleId;
                const statusInfo = getStatusDisplay(c.status);
                const isRunning = activeCycleId === c.id;
                const isWin = c.status === 'Meta Batida';
                const isLoss = c.status === 'Stop Atingido';
                const isFinished = isWin || isLoss;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCycleId(c.id)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '0.85rem 1rem',
                      background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                      borderLeft: `3px solid ${c.color || 'var(--primary-light)'}`,
                      borderTop: isSelected ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(255,255,255,0.02)',
                      borderRight: isSelected ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(255,255,255,0.02)',
                      borderBottom: isSelected ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
                    }}
                  >
                    {/* Inner Card Content (Blurred if Finished) */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      filter: isFinished ? 'blur(3.5px)' : 'none',
                      opacity: isFinished ? 0.3 : 1,
                      pointerEvents: isFinished ? 'none' : 'auto',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                          <span>{c.icon}</span>
                          <span style={{ color: c.active ? 'white' : 'var(--text-muted)' }}>{c.name}</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--primary-light)' }}>
                          {c.startTime}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        <span>{getCleanSymbolName(c.symbol)}</span>
                        <span>Stake: ${c.stakeValue}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {c.days.length === 7 ? 'Todos os dias' : `${c.days.length} dias`}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
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

                    {/* Translucent Profit/Loss Overlay on Finished Cycle */}
                    {isFinished && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: isWin 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.75) 100%)' 
                          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(127, 29, 29, 0.75) 100%)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        zIndex: 10,
                        borderRadius: '8px',
                        border: isWin ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: isWin ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(239, 68, 68, 0.3)',
                        pointerEvents: 'auto'
                      }}>
                        <div style={{
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          color: isWin ? '#34d399' : '#f87171',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isWin ? '🏆 META BATIDA' : '🛑 STOP LOSS ATINGIDO'}
                        </div>
                        <div style={{
                          fontSize: '1.05rem',
                          fontWeight: '900',
                          fontFamily: 'var(--font-mono)',
                          color: 'white',
                          textShadow: isWin ? '0 0 10px rgba(16, 185, 129, 0.8)' : '0 0 10px rgba(239, 68, 68, 0.8)'
                        }}>
                          {c.finalProfit !== undefined 
                            ? (c.finalProfit >= 0 ? `+$${parseFloat(c.finalProfit).toFixed(2)}` : `-$${Math.abs(parseFloat(c.finalProfit)).toFixed(2)}`)
                            : (isWin ? `+$${c.takeProfit}` : `-$${c.stopLoss}`)}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              onClick={handleResetAllCycles}
              style={{
                padding: '0.45rem',
                fontSize: '0.68rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Resetar Status dos Ciclos
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Apagar todos os ${cycles.length} ciclos? Esta ação não pode ser desfeita.`)) {
                  onSaveCycles([]);
                  setSelectedCycleId(null);
                }
              }}
              style={{
                padding: '0.45rem',
                fontSize: '0.68rem',
                borderRadius: '6px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Limpar Todos os Ciclos
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL: DETALHES COMPLETOS DO CICLO */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'rgba(15, 11, 28, 0.45)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          overflowY: 'auto'
        }}>
          {!selectedCycle ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Sliders size={40} style={{ strokeWidth: 1.2, color: 'var(--primary-light)' }} />
              <strong style={{ fontSize: '0.9rem' }}>Nenhum ciclo selecionado</strong>
              <span style={{ fontSize: '0.72rem' }}>Clique em um ciclo na barra lateral esquerda para gerenciar sua missão.</span>
            </div>
          ) : (
            <>
              {/* Mission Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>{selectedCycle.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>{selectedCycle.name}</h3>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(139,92,246,0.1)',
                        color: 'var(--primary-light)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {selectedCycle.startTime} ({selectedCycle.timezone || 'GMT-3'})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      Ativo em: {selectedCycle.days.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Switch Active & Action triggers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: selectedCycle.active ? '#10b981' : 'var(--text-muted)' }}>
                      {selectedCycle.active ? 'Ativo' : 'Desativado'}
                    </span>
                    <label className="switch" style={{ width: '36px', height: '18px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCycle.active}
                        onChange={() => {
                          if (activeCycleId === selectedCycle.id) {
                            onStopBot();
                          } else {
                            handleToggleCycleActive(selectedCycle.id, selectedCycle.active);
                          }
                        }}
                      />
                      <span className="slider" style={{ borderRadius: '18px' }}></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {activeCycleId === selectedCycle.id ? (
                  <button
                    onClick={onStopBot}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 0 10px rgba(239,68,68,0.2)'
                    }}
                  >
                    <Power size={12} /> Parar Execução
                  </button>
                ) : (
                  <button
                    onClick={() => onTriggerCycleManually(selectedCycle.id)}
                    disabled={!schedulerState}
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#10b981',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Play size={12} fill="currentColor" /> Executar Agora
                  </button>
                )}

                <button
                  onClick={() => handleEditClick(selectedCycle)}
                  disabled={activeCycleId === selectedCycle.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Settings size={12} /> Editar
                </button>

                <button
                  onClick={() => handleDuplicateClick(selectedCycle)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Layers size={12} /> Duplicar
                </button>

                {selectedCycle.status !== 'Aguardando' && (
                  <button
                    onClick={() => handleResetCycleStatus(selectedCycle.id)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} /> Resetar Status
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCycle(selectedCycle.id)}
                  disabled={activeCycleId === selectedCycle.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>

              {/* Grid of detail Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '0.5rem'
              }}>
                {/* Card 1: Mercado & Estratégia */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Configurações de Mercado
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Ativo:</span>
                      <strong style={{ color: 'white' }}>{getCleanSymbolName(selectedCycle.symbol)} ({selectedCycle.symbol})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Timeframe:</span>
                      <strong style={{ color: 'white' }}>{selectedCycle.granularity === '60' ? '1 Minuto (M1)' : selectedCycle.granularity === '300' ? '5 Minutos (M5)' : '15 Minutos (M15)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Estratégia:</span>
                      <strong style={{ color: 'white' }}>{getCleanStrategyName(selectedCycle.selectedStrategy)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Gestão de Risco */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Gestão de Risco
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Valor Entrada:</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${selectedCycle.stakeValue.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Meta de Lucro:</span>
                      <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>${selectedCycle.takeProfit.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Stop Loss:</span>
                      <strong style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>${selectedCycle.stopLoss.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 3: Parâmetros */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scanner & Probabilidade
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Scanner Inteligente:</span>
                      <strong style={{ color: '#10b981' }}>ATIVO</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Probabilidade Mínima:</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>
                        {selectedCycle.minProbability || 90}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Filtro de Tendência:</span>
                      <strong style={{ color: 'white' }}>Médias Móveis</strong>
                    </div>
                  </div>
                </div>

                {/* Card 4: Gale & Autopiloto */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Martingale & Filtros
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Níveis de Martingale:</span>
                      <strong style={{ color: 'white' }}>{selectedCycle.martingaleLevels || 2} Níveis</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Multiplicador Gale:</span>
                      <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{selectedCycle.martingaleMultiplier || 2.0}x</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Vela Mestra Secundária:</span>
                      <strong style={{ color: selectedCycle.enableMasterCandleSecondary ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                        {selectedCycle.enableMasterCandleSecondary ? 'HABILITADA' : 'DESATIVADA'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* FLUXO VISUAL PIPELINE */}
              <div style={{
                background: 'rgba(15, 11, 28, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.02)',
                borderRadius: '14px',
                padding: '1.25rem',
                marginTop: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Pipeline Visual da Automação (Missão)
                </span>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  marginTop: '0.5rem',
                  padding: '0.5rem 0',
                  position: 'relative',
                  overflowX: 'auto'
                }}>
                  {(() => {
                    const activeStep = getPipelineActiveIndex(selectedCycle.status);
                    
                    const pipelineSteps = [
                      { label: 'Agendado', info: selectedCycle.startTime },
                      { label: 'Scanner IA', info: 'Buscando' },
                      { label: 'Estratégia', info: getCleanStrategyName(selectedCycle.selectedStrategy).split(' ')[0] },
                      { label: 'Filtro Prob', info: `>${selectedCycle.minProbability || 90}%` },
                      { label: 'Executado', info: 'Spot' },
                      { label: 'Gale/Soros', info: `${selectedCycle.martingaleLevels || 2} lvl` },
                      { label: 'Meta/Stop', info: 'Concluído' }
                    ];

                    return pipelineSteps.map((step, idx) => {
                      const isCompleted = idx < activeStep;
                      const isCurrent = idx === activeStep;
                      const isFuture = idx > activeStep;

                      let nodeBg = 'rgba(255,255,255,0.02)';
                      let nodeBorder = 'rgba(255,255,255,0.05)';
                      let textColor = 'var(--text-muted)';
                      let badgeColor = 'rgba(255,255,255,0.03)';
                      let badgeText = '#64748b';

                      if (isCompleted) {
                        nodeBg = 'rgba(16, 185, 129, 0.06)';
                        nodeBorder = 'rgba(16, 185, 129, 0.3)';
                        textColor = '#cbd5e1';
                        badgeColor = 'rgba(16, 185, 129, 0.15)';
                        badgeText = '#10b981';
                      } else if (isCurrent) {
                        nodeBg = 'rgba(139, 92, 246, 0.12)';
                        nodeBorder = 'var(--primary-light)';
                        textColor = 'white';
                        badgeColor = 'rgba(139, 92, 246, 0.2)';
                        badgeText = 'var(--primary-light)';
                      }

                      return (
                        <React.Fragment key={idx}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            minWidth: '78px',
                            flex: 1,
                            padding: '6px',
                            borderRadius: '10px',
                            background: nodeBg,
                            border: `1px solid ${nodeBorder}`,
                            boxShadow: isCurrent ? '0 0 15px rgba(139, 92, 246, 0.15)' : 'none',
                            transition: 'all 0.3s'
                          }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: textColor, textAlign: 'center' }}>
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
                              width: '18px',
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
                                  background: 'var(--primary-light)',
                                  boxShadow: '0 0 8px var(--primary-light)'
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

        {/* LATERAL DIREITA: PAINEL DE STATUS EM TEMPO REAL */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(15, 11, 28, 0.4)',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          {/* Engine Real-Time Monitor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              Monitor de Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Motor de Ciclos:</span>
                <strong style={{ color: schedulerState ? '#10b981' : '#ef4444' }}>
                  {schedulerState ? '● OPERANDO' : 'OFFLINE'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scanner Ativo:</span>
                <strong style={{ color: activeCycleId ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                  {activeCycleId ? 'BUSCANDO' : 'STANDBY'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Conexão Deriv:</span>
                <strong style={{ color: '#10b981' }}>SYNCED</strong>
              </div>
            </div>
          </div>

          {/* Logs Timeline Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)' }}>LOGS DE MISSÃO</h4>
              <button 
                onClick={onClearSchedulerLogs}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.6rem', cursor: 'pointer', padding: '2px' }}
              >
                Limpar
              </button>
            </div>

            {/* Log Filters */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '6px' }}>
              <button
                onClick={() => setLogFilter('all')}
                style={{
                  flex: 1,
                  padding: '3px',
                  fontSize: '0.58rem',
                  fontWeight: 'bold',
                  background: logFilter === 'all' ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Todos
              </button>
              <button
                onClick={() => setLogFilter('today')}
                style={{
                  flex: 1,
                  padding: '3px',
                  fontSize: '0.58rem',
                  fontWeight: 'bold',
                  background: logFilter === 'today' ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Hoje
              </button>
            </div>

            {/* Log Search input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Buscar em logs..."
                style={{
                  padding: '0.4rem 0.5rem 0.4rem 1.6rem',
                  fontSize: '0.68rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            </div>

            {/* Timeline scrollbox */}
            <div style={{
              flex: 1,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.02)',
              borderRadius: '8px',
              padding: '0.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {filteredLogs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontStyle: 'italic', textAlign: 'center', display: 'block', marginTop: '1rem' }}>
                  Nenhum registro.
                </span>
              ) : (
                filteredLogs.map((log, idx) => {
                  let badgeColor = 'rgba(255,255,255,0.05)';
                  let icon = '⚪';

                  if (log.type === 'error') {
                    badgeColor = 'rgba(239, 68, 68, 0.15)';
                    icon = '🔴';
                  } else if (log.type === 'success') {
                    badgeColor = 'rgba(16, 185, 129, 0.15)';
                    icon = '🟢';
                  } else if (log.type === 'warning') {
                    badgeColor = 'rgba(245, 158, 11, 0.15)';
                    icon = '🟡';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.4rem',
                        background: badgeColor,
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        borderLeft: `2px solid ${log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#10b981' : '#8b5cf6'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <span>{icon} Evento</span>
                        <span>{log.time}</span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#e2e8f0', margin: 0, lineHeight: '1.3' }}>
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
            background: 'rgba(15, 11, 28, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.2)',
            borderRadius: '20px',
            width: '480px',
            maxWidth: '90%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} style={{ color: 'var(--primary-light)' }} /> Gerador de Linha do Tempo
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Gere missões automaticamente em horários de maior probabilidade.
                </span>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              {/* Numeric Parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>VALOR DA ENTRADA</label>
                  <input
                    type="number"
                    value={generatorData.stakeValue}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, stakeValue: e.target.value }))}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>STOP WIN ($)</label>
                  <input
                    type="number"
                    value={generatorData.takeProfit}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, takeProfit: e.target.value }))}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>STOP LOSS ($)</label>
                  <input
                    type="number"
                    value={generatorData.stopLoss}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, stopLoss: e.target.value }))}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Gerenciamento e Martingale */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>GERENCIAMENTO</label>
                  <select
                    value={generatorData.moneyManagement || 'martingale'}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, moneyManagement: e.target.value }))}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%',
                      height: '38px',
                      outline: 'none'
                    }}
                  >
                    <option value="fixed">Mão Fixa (Fixed)</option>
                    <option value="martingale">Martingale</option>
                    <option value="progressive_gale">Gale Progressivo</option>
                    <option value="soros">Soros</option>
                    <option value="iron_hands">Iron Hands</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>NÍVEIS GALE</label>
                  <select
                    value={generatorData.martingaleLevels ?? 2}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, martingaleLevels: parseInt(e.target.value) }))}
                    disabled={generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands'}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%',
                      height: '38px',
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
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>MULTIPLICADOR</label>
                  <input
                    type="number"
                    value={generatorData.martingaleMultiplier ?? 2.0}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, martingaleMultiplier: parseFloat(e.target.value) }))}
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    disabled={generatorData.moneyManagement === 'fixed' || generatorData.moneyManagement === 'iron_hands' || generatorData.martingaleLevels === 0}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.55rem',
                      background: '#09090f',
                      color: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '100%',
                      height: '38px'
                    }}
                  />
                </div>
              </div>

              {/* Period Selectors */}
              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>PERÍODOS DE OPERAÇÃO</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { key: 'dawn', label: 'Madrugada', desc: '00:00 às 06:00', icon: '🌙' },
                    { key: 'morning', label: 'Manhã', desc: '06:00 às 12:00', icon: '🌅' },
                    { key: 'afternoon', label: 'Tarde', desc: '12:00 às 18:00', icon: '🌇' },
                    { key: 'night', label: 'Noite', desc: '18:00 às 00:00', icon: '🌌' }
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
                          padding: '10px 12px',
                          background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                          border: isSelected ? '1px solid var(--primary-light)' : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>{p.icon}</div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isSelected ? 'white' : '#cbd5e1' }}>{p.label}</div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{p.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Options */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>CONFIGURAÇÕES ADICIONAIS</label>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#cbd5e1' }}>Vela Master como secundária</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={generatorData.enableMasterCandleSecondary} 
                      onChange={(e) => setGeneratorData(prev => ({ ...prev, enableMasterCandleSecondary: e.target.checked }))} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#cbd5e1' }}>Desativar estratégias lentas</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={generatorData.disableSlowStrategies} 
                      onChange={(e) => setGeneratorData(prev => ({ ...prev, disableSlowStrategies: e.target.checked }))} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#cbd5e1' }}>Desativar cruzamento de médias</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={generatorData.disableMaCrossover} 
                      onChange={(e) => setGeneratorData(prev => ({ ...prev, disableMaCrossover: e.target.checked }))} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: 'white',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateTimeline}
                className="action-button-glow"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: 'white',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)'
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
                        value={wizardData.moneyManagement || 'martingale'}
                        onChange={(e) => setWizardData({ ...wizardData, moneyManagement: e.target.value })}
                        style={{ height: '38px', fontSize: '0.85rem' }}
                      >
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
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Vela Mestra Secundária</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Filtra/opera rompimentos baseados em máximas/mínimas</span>
                        </div>
                        <label className="switch" style={{ width: '34px', height: '18px' }}>
                          <input
                            type="checkbox"
                            checked={wizardData.enableMasterCandleSecondary}
                            onChange={(e) => setWizardData({ ...wizardData, enableMasterCandleSecondary: e.target.checked })}
                          />
                          <span className="slider" style={{ borderRadius: '18px' }}></span>
                        </label>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Excluir Estratégias Lentas</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Pula Pullback e Reversão no piloto automático</span>
                        </div>
                        <label className="switch" style={{ width: '34px', height: '18px' }}>
                          <input
                            type="checkbox"
                            checked={wizardData.disableSlowStrategies}
                            onChange={(e) => setWizardData({ ...wizardData, disableSlowStrategies: e.target.checked })}
                          />
                          <span className="slider" style={{ borderRadius: '18px' }}></span>
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Excluir Cruzamento de Médias</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Pula Cruzamento de Médias no piloto automático</span>
                        </div>
                        <label className="switch" style={{ width: '34px', height: '18px' }}>
                          <input
                            type="checkbox"
                            checked={wizardData.disableMaCrossover}
                            onChange={(e) => setWizardData({ ...wizardData, disableMaCrossover: e.target.checked })}
                          />
                          <span className="slider" style={{ borderRadius: '18px' }}></span>
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'white', display: 'block' }}>Travar Lucros e Garantir Meta (`Lock Profit`)</strong>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Encerra o ciclo imediatamente ao bater o Take Profit</span>
                        </div>
                        <label className="switch" style={{ width: '34px', height: '18px' }}>
                          <input
                            type="checkbox"
                            checked={wizardData.lockProfitSecured ?? true}
                            onChange={(e) => setWizardData({ ...wizardData, lockProfitSecured: e.target.checked })}
                          />
                          <span className="slider" style={{ borderRadius: '18px' }}></span>
                        </label>
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

    </div>
  );
}
