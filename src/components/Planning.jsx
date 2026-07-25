import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, TrendingDown, Calendar, AlertCircle, HelpCircle, 
  ChevronRight, RefreshCw, Cpu, Award, Zap, DollarSign, ArrowRight,
  Sparkles, Layers, Sliders, Info, CheckCircle, Clock, BarChart2, BookOpen,
  Plus, Search, Pin, Trash2, Edit3, Copy, Check, Filter, StickyNote,
  Flag, Download, Share2
} from 'lucide-react';

export default function Planning({ dbTrades, onClearDb, planningState, onUpdatePlanning, initialViewMode = 'overview' }) {
  // Main Sub-Tab Navigation: 'overview' | 'calculators' | 'milestones' | 'notes'
  const [viewMode, setViewMode] = useState(initialViewMode);

  // Sync initialViewMode if prop changes (e.g. from sidebar direct click)
  useEffect(() => {
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Goal Settings State (Persisted in localStorage as fallback cache)
  const [goals, setGoals] = useState(() => {
    return planningState?.goals || {
      monthly: 500,
      quarterly: 1500,
      annual: 5000,
      custom: 2000,
      customName: 'Notebook Novo',
      configured: false
    };
  });

  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual' | 'custom'

  // Onboarding Setup Form States
  const [tempMonthly, setTempMonthly] = useState(goals.monthly || '');
  const [tempQuarterly, setTempQuarterly] = useState(goals.quarterly || '');
  const [tempAnnual, setTempAnnual] = useState(goals.annual || '');
  const [tempCustom, setTempCustom] = useState(goals.custom || '');
  const [tempCustomName, setTempCustomName] = useState(goals.customName || '');

  // Simulator States
  const [simStake, setSimStake] = useState(() => planningState?.simulator?.simStake ?? 1.0);
  const [simSessions, setSimSessions] = useState(() => planningState?.simulator?.simSessions ?? 2);
  const [simTarget, setSimTarget] = useState(() => planningState?.simulator?.simTarget ?? 3.0);
  const [simWinrate, setSimWinrate] = useState(() => planningState?.simulator?.simWinrate ?? 91);

  // Calendar click state
  const [selectedDayTrades, setSelectedDayTrades] = useState(null);
  const [selectedDayNum, setSelectedDayNum] = useState(null);

  // Martingale Calculator States
  const [calcStake, setCalcStake] = useState(1.0);
  const [calcMultiplier, setCalcMultiplier] = useState(2.2);
  const [calcMaxLevels, setCalcMaxLevels] = useState(3); // 3 = G0 + 2 Gales
  const [calcPayout, setCalcPayout] = useState(88);
  const [calcBank, setCalcBank] = useState(100.0);

  // Soros & SorosGale Calculator States
  const [sorosStake, setSorosStake] = useState(1.0);
  const [sorosLevels, setSorosLevels] = useState(3);
  const [sorosPayout, setSorosPayout] = useState(88);
  const [sorosReinvestPct, setSorosReinvestPct] = useState(100);

  // Notes & Ideas System State
  const [notes, setNotes] = useState(() => {
    if (planningState?.notes && Array.isArray(planningState.notes) && planningState.notes.length > 0) {
      return planningState.notes;
    }
    const cached = localStorage.getItem('astrobot_user_notes');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [
      {
        id: 'note_demo_1',
        title: '💡 Regra de Ouro: Gerenciamento MHI',
        content: 'Operar preferencialmente em horários de baixa volatilidade (09:00 às 11:30h). Se ocorrer 1 Hit consecutivo, aguardar 15 minutos antes de reabrir a sessão.',
        category: 'risco',
        pinned: true,
        createdAt: Date.now() - 86400000
      },
      {
        id: 'note_demo_2',
        title: '🎯 Meta Mensal de $500',
        content: 'Meta dividida em 4 semanas de $125. Stake padrão de $1.00 com Gale 2x. Manter disciplina no Stop Loss diário de $30.',
        category: 'meta',
        pinned: true,
        createdAt: Date.now() - 43200000
      },
      {
        id: 'note_demo_3',
        title: '🚀 Ideia de Algoritmo SorosGale',
        content: 'Testar padrão de 2 vitórias seguidas na Volatilidade 100 1s usando Soros Nível 2 e multiplicador 2.2x após reversão de vela máter.',
        category: 'ideia',
        pinned: false,
        createdAt: Date.now() - 21600000
      }
    ];
  });

  // Note Form / Edit State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('ideia');
  const [notePinned, setNotePinned] = useState(false);
  
  // Note Search & Category Filter State
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedNoteCategoryFilter, setSelectedNoteCategoryFilter] = useState('all');
  const [copiedNoteId, setCopiedNoteId] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Weekly Milestones Completion State
  const [completedMilestones, setCompletedMilestones] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_planning_milestones');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Sync incoming state props
  useEffect(() => {
    if (planningState) {
      if (planningState.goals) {
        setGoals(planningState.goals);
        setTempMonthly(planningState.goals.monthly || '');
        setTempQuarterly(planningState.goals.quarterly || '');
        setTempAnnual(planningState.goals.annual || '');
        setTempCustom(planningState.goals.custom || '');
        setTempCustomName(planningState.goals.customName || '');
      }
      if (planningState.simulator) {
        setSimStake(planningState.simulator.simStake ?? 1.0);
        setSimSessions(planningState.simulator.simSessions ?? 2);
        setSimTarget(planningState.simulator.simTarget ?? 3.0);
        setSimWinrate(planningState.simulator.simWinrate ?? 91);
      }
      if (planningState.notes && Array.isArray(planningState.notes)) {
        setNotes(planningState.notes);
      }
      if (planningState.milestones && typeof planningState.milestones === 'object') {
        setCompletedMilestones(planningState.milestones);
      }
    }
  }, [planningState]);

  // Persist goals and notes to localStorage
  useEffect(() => {
    localStorage.setItem('astrobot_planning_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('astrobot_user_notes', JSON.stringify(notes));
  }, [notes]);

  // Helper to pull current settings from localStorage
  const handlePullCurrentSettings = () => {
    try {
      const raw = localStorage.getItem('astrobot_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.stakeValue) {
          const val = parseFloat(s.stakeValue) || 1.0;
          setCalcStake(val);
          setSorosStake(val);
        }
        if (s.martingaleMultiplier) setCalcMultiplier(parseFloat(s.martingaleMultiplier) || 2.2);
        if (s.martingaleMaxLevels) setCalcMaxLevels((parseInt(s.martingaleMaxLevels) || 2) + 1);
      }
    } catch (e) {}
  };

  // Matrix levels calculation (Martingale)
  const getMatrixLevels = () => {
    const levels = [];
    let currentStake = calcStake;
    let accumulatedCost = 0;

    for (let i = 0; i < calcMaxLevels; i++) {
      if (i > 0) {
        currentStake = currentStake * calcMultiplier;
      }
      accumulatedCost += currentStake;
      const grossReturn = currentStake * (1 + calcPayout / 100);
      const netProfit = grossReturn - accumulatedCost;
      const bankRiskPercent = calcBank > 0 ? (accumulatedCost / calcBank) * 100 : 0;

      levels.push({
        level: i,
        name: i === 0 ? 'G0 (Entrada)' : `Gale ${i}`,
        stake: currentStake,
        accumulatedCost,
        grossReturn,
        netProfit,
        bankRiskPercent
      });
    }
    return levels;
  };

  const matrixLevels = getMatrixLevels();
  const maxRiskTotal = matrixLevels.length > 0 ? matrixLevels[matrixLevels.length - 1].accumulatedCost : 0;
  const g0Profit = matrixLevels.length > 0 ? matrixLevels[0].netProfit : 1;
  const winsToRecoverHit = g0Profit > 0 ? Math.ceil(maxRiskTotal / g0Profit) : 'N/A';
  const survivalCount = maxRiskTotal > 0 ? Math.floor(calcBank / maxRiskTotal) : 0;

  // Soros levels calculation
  const getSorosLevels = () => {
    const levels = [];
    let currentStake = sorosStake;
    let accumulatedProfit = 0;

    for (let i = 1; i <= sorosLevels; i++) {
      const grossProfit = currentStake * (sorosPayout / 100);
      const reinvestAmount = grossProfit * (sorosReinvestPct / 100);
      accumulatedProfit += grossProfit;

      levels.push({
        level: i,
        name: `Mão ${i}`,
        stake: currentStake,
        profit: grossProfit,
        accumulatedProfit,
        nextStake: currentStake + reinvestAmount
      });

      currentStake = currentStake + reinvestAmount;
    }
    return levels;
  };

  const sorosMatrixLevels = getSorosLevels();

  // Ensure active tab points to a configured goal (value > 0)
  useEffect(() => {
    if (goals.configured) {
      const configuredGoals = [
        { id: 'monthly', val: goals.monthly },
        { id: 'quarterly', val: goals.quarterly },
        { id: 'annual', val: goals.annual },
        { id: 'custom', val: goals.custom }
      ].filter(g => g.val > 0);
      
      if (configuredGoals.length > 0) {
        if (!configuredGoals.some(g => g.id === activeTab)) {
          setActiveTab(configuredGoals[0].id);
        }
      }
    }
  }, [goals, activeTab]);

  // Handle Onboarding Completion
  const handleSaveSetup = (e) => {
    if (e) e.preventDefault();
    const mVal = Number(tempMonthly) || 0;
    const qVal = Number(tempQuarterly) || 0;
    const aVal = Number(tempAnnual) || 0;
    const cVal = Number(tempCustom) || 0;

    if (mVal === 0 && qVal === 0 && aVal === 0 && cVal === 0) {
      alert('Por favor, defina pelo menos uma meta financeira.');
      return;
    }

    const newGoals = {
      monthly: mVal,
      quarterly: qVal,
      annual: aVal,
      custom: cVal,
      customName: tempCustomName || 'Objetivo Customizado',
      configured: true
    };
    setGoals(newGoals);
    if (onUpdatePlanning) {
      onUpdatePlanning({
        goals: newGoals,
        simulator: { simStake, simSessions, simTarget, simWinrate },
        notes
      });
    }
  };

  // Reset Configuration
  const handleResetPlanning = () => {
    if (window.confirm('Tem certeza de que deseja reconfigurar suas metas financeiras?')) {
      const newGoals = { ...goals, configured: false };
      setGoals(newGoals);
      if (onUpdatePlanning) {
        onUpdatePlanning({
          goals: newGoals,
          simulator: { simStake, simSessions, simTarget, simWinrate },
          notes
        });
      }
    }
  };

  // Date constants
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Calculate trade history properties
  const totalEarned = dbTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winsCount = dbTrades.filter(t => t.result === 'WIN').length;
  const totalTrades = dbTrades.length;
  const overallWinrate = totalTrades > 0 ? (winsCount / totalTrades) * 100 : 0;

  // Group trades by day of the current month
  const tradesByDay = {};
  dbTrades.forEach(t => {
    const d = new Date(t.timestamp || t.time);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const dateKey = d.getDate();
      if (!tradesByDay[dateKey]) tradesByDay[dateKey] = [];
      tradesByDay[dateKey].push(t);
    }
  });

  // Selected Goal Target value
  const getActiveGoalTarget = () => {
    switch (activeTab) {
      case 'monthly': return goals.monthly;
      case 'quarterly': return goals.quarterly;
      case 'annual': return goals.annual;
      case 'custom': return goals.custom;
      default: return goals.monthly;
    }
  };

  const targetValue = getActiveGoalTarget();

  // Progress Calculations
  const achievedPercent = Math.min(100, Math.max(0, (totalEarned / targetValue) * 100));
  const missingAmount = Math.max(0, targetValue - totalEarned);
  
  // Calculate remaining days in period
  const getRemainingDays = () => {
    const today = now.getDate();
    if (activeTab === 'monthly') {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      return Math.max(1, daysInMonth - today);
    } else if (activeTab === 'quarterly') {
      const currentQuarter = Math.floor(currentMonth / 3) + 1;
      const quarterEndMonth = currentQuarter * 3;
      const endDate = new Date(currentYear, quarterEndMonth, 0);
      const diffTime = Math.abs(endDate - now);
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (activeTab === 'annual') {
      const endDate = new Date(currentYear, 11, 31);
      const diffTime = Math.abs(endDate - now);
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      return 30;
    }
  };
  const remainingDays = getRemainingDays();
  const dailyAverageRequired = missingAmount / remainingDays;

  // IA Smart Projections Calculations
  const getAIProjections = () => {
    const sessions = [];
    let currentSession = [];
    let lastTime = 0;

    const sortedTrades = [...dbTrades].sort((a, b) => new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time));

    sortedTrades.forEach(t => {
      const tTime = new Date(t.timestamp || t.time).getTime();
      if (lastTime === 0 || tTime - lastTime < 30 * 60 * 1000) {
        currentSession.push(t);
      } else {
        sessions.push(currentSession);
        currentSession = [t];
      }
      lastTime = tTime;
    });
    if (currentSession.length > 0) sessions.push(currentSession);

    const totalSessions = Math.max(1, sessions.length);
    const avgProfitPerSession = totalEarned / totalSessions;
    const avgProfitPerOp = totalTrades > 0 ? totalEarned / totalTrades : 0;
    
    const uniqueDays = new Set(sortedTrades.map(t => new Date(t.timestamp || t.time).toDateString())).size;
    const activeDaysCount = Math.max(1, uniqueDays);
    const avgProfitPerDay = totalEarned / activeDaysCount;
    const avgOpsPerSession = totalTrades / totalSessions;

    const martingales = sortedTrades.filter(t => t.message && t.message.toLowerCase().includes('gale')).length;
    const avgMartingale = totalTrades > 0 ? (martingales / totalTrades) : 0;

    const daysToGoal = avgProfitPerDay > 0 ? Math.ceil(missingAmount / avgProfitPerDay) : 999;
    const opsToGoal = avgProfitPerOp > 0 ? Math.ceil(missingAmount / avgProfitPerOp) : 999;
    const sessionsToGoal = avgProfitPerSession > 0 ? Math.ceil(missingAmount / avgProfitPerSession) : 999;
    
    return {
      avgProfitPerSession: avgProfitPerSession || 0,
      avgProfitPerOp: avgProfitPerOp || 0,
      avgProfitPerDay: avgProfitPerDay || 0,
      avgOpsPerSession: avgOpsPerSession || 0,
      avgMartingale: avgMartingale || 0,
      daysToGoal: daysToGoal === 999 ? 'N/A' : `${daysToGoal} dias`,
      opsToGoal: opsToGoal === 999 ? 'N/A' : `${opsToGoal} operações`,
      sessionsToGoal: sessionsToGoal === 999 ? 'N/A' : `${sessionsToGoal} sessões`
    };
  };

  const aiProjs = getAIProjections();

  // AI Financial Advisor
  const getAIAdvisorRecommendations = () => {
    const recommendations = [];

    if (totalTrades < 5) {
      return [
        { text: 'Aguardando mais dados de negociação para gerar análises financeiras personalizadas.', type: 'info' },
        { text: 'Dica: Conecte o robô e realize algumas operações para que o conselheiro analise seu winrate real.', type: 'tip' }
      ];
    }

    if (aiProjs.avgProfitPerDay > dailyAverageRequired) {
      const daysAhead = Math.round(remainingDays - (missingAmount / aiProjs.avgProfitPerDay));
      if (daysAhead > 0) {
        recommendations.push({
          text: `No ritmo atual, sua meta de $${targetValue} será atingida aproximadamente ${daysAhead} dias antes do previsto! Excelente desempenho!`,
          type: 'success'
        });
      }
    } else if (aiProjs.avgProfitPerDay > 0) {
      recommendations.push({
        text: `Seu lucro diário atual ($${aiProjs.avgProfitPerDay.toFixed(2)}) está abaixo da média necessária de $${dailyAverageRequired.toFixed(2)}. Considere aumentar a stake em 15% ou estender as sessões.`,
        type: 'warning'
      });
    }

    if (aiProjs.avgProfitPerSession > 0 && dailyAverageRequired > 0) {
      const sessionsNeededPerDay = dailyAverageRequired / aiProjs.avgProfitPerSession;
      if (sessionsNeededPerDay < 1.0) {
        recommendations.push({
          text: 'Você pode reduzir a frequência das operações para apenas 1 sessão diária e ainda sim cumprir sua meta planejada.',
          type: 'tip'
        });
      }
    }

    if (overallWinrate > 85) {
      const simulatedDoubleStakeDays = Math.ceil(missingAmount / (aiProjs.avgProfitPerDay * 2));
      recommendations.push({
        text: `Com sua assertividade sólida de ${overallWinrate.toFixed(1)}%, aumentar a stake inicial para $${(simStake * 1.5).toFixed(1)} poderá antecipar a meta em até ${Math.max(1, Math.round(remainingDays - simulatedDoubleStakeDays))} dias.`,
        type: 'success'
      });
    }

    recommendations.push({
      text: 'Análise de Sessão: Seus dados indicam maior lucro acumulado entre 09:00 e 11:00h. Evite operar próximo às 17:00h devido à alta volatilidade.',
      type: 'tip'
    });

    if (overallWinrate < 75) {
      recommendations.push({
        text: 'Revisão Necessária: Seu winrate recente caiu abaixo de 75%. Considere desativar estratégias seguidoras em mercados laterais e revisar MHI.',
        type: 'danger'
      });
    }

    return recommendations.slice(0, 4);
  };

  const aiAdvisor = getAIAdvisorRecommendations();

  // Simulator Result Calculation
  const getSimulatedResult = () => {
    const winRatio = simWinrate / 100;
    const lossRatio = 1 - winRatio;
    const opsPerSession = Math.ceil(simTarget / (simStake * 0.95));
    const opsPerDay = opsPerSession * simSessions;
    const grossProfit = opsPerDay * winRatio * (simStake * 0.95);
    const grossLoss = opsPerDay * lossRatio * simStake;
    const dailyNet = Math.max(0, grossProfit - grossLoss);
    return dailyNet * 30;
  };

  const simResult = getSimulatedResult();

  // Pace diff
  const elapsedDays = 30 - remainingDays;
  const expectedPaceAmount = (targetValue / 30) * elapsedDays;
  const paceDiffPercent = expectedPaceAmount > 0 
    ? ((totalEarned - expectedPaceAmount) / expectedPaceAmount) * 100 
    : 0;

  // Calendar rendering helper
  const getCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, status: 'empty', profit: 0 });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dayTrades = tradesByDay[d] || [];
      const netDayProfit = dayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
      let status = 'none';
      if (dayTrades.length > 0) {
        if (netDayProfit < 0) {
          status = 'stop';
        } else if (netDayProfit >= (targetValue / 30)) {
          status = 'goal_beaten';
        } else {
          status = 'profit';
        }
      }
      days.push({ dayNum: d, status, profit: netDayProfit, trades: dayTrades });
    }
    return days;
  };

  const calendarDays = getCalendarDays();

  const handleDayClick = (day) => {
    if (day.dayNum && day.trades && day.trades.length > 0) {
      setSelectedDayTrades(day.trades);
      setSelectedDayNum(day.dayNum);
    }
  };

  // Milestones calculation (4 Weeks)
  const milestones = [
    { id: 'w1', title: 'Semana 1 (25% da Meta)', target: targetValue * 0.25, desc: 'Estabelecer consistência inicial e validar o winrate.' },
    { id: 'w2', title: 'Semana 2 (50% da Meta)', target: targetValue * 0.50, desc: 'Metade do objetivo atingido. Consolidação de lucros.' },
    { id: 'w3', title: 'Semana 3 (75% da Meta)', target: targetValue * 0.75, desc: 'Manter disciplina estrita no Stop Loss e evitar overtrading.' },
    { id: 'w4', title: 'Semana 4 (100% - Meta Concluída)', target: targetValue * 1.00, desc: 'Conclusão da meta e preparação para o próximo ciclo.' }
  ];

  const toggleMilestone = (mId) => {
    const updated = { ...completedMilestones, [mId]: !completedMilestones[mId] };
    setCompletedMilestones(updated);
    localStorage.setItem('astrobot_planning_milestones', JSON.stringify(updated));
    if (onUpdatePlanning) {
      onUpdatePlanning({
        goals,
        simulator: { simStake, simSessions, simTarget, simWinrate },
        notes,
        milestones: updated
      });
    }
  };

  // Export Executive Summary to Clipboard
  const handleExportSummary = () => {
    const summaryText = `
====================================================
🎯 ASTROBOT - RELATÓRIO EXECUTIVO DE PLANEJAMENTO
====================================================
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString()}
Meta Ativa: ${activeTab.toUpperCase()} ($${targetValue.toFixed(2)})
Lucro Acumulado: $${totalEarned.toFixed(2)} (${achievedPercent.toFixed(1)}%)
Faltam para o Alvo: $${missingAmount.toFixed(2)} (${remainingDays} dias restantes)
Ritmo Necessário: $${Math.max(0, dailyAverageRequired).toFixed(2)} / dia

----------------------------------------------------
🧠 PREVISÃO & INTELIGÊNCIA ARTIFICIAL
----------------------------------------------------
• Média por Sessão: $${aiProjs.avgProfitPerSession.toFixed(2)}
• Média por Operação: $${aiProjs.avgProfitPerOp.toFixed(2)}
• Estimativa de Conclusão: ${aiProjs.daysToGoal}
• Status do Ritmo: ${paceDiffPercent >= 0 ? `${paceDiffPercent.toFixed(1)}% acima do esperado` : `${Math.abs(paceDiffPercent).toFixed(1)}% abaixo do esperado`}

----------------------------------------------------
💡 ANOTAÇÕES E REGRAS FIXADAS (${notes.length} notas cadastradas)
----------------------------------------------------
${notes.filter(n => n.pinned).map((n, i) => `${i + 1}. [${n.category.toUpperCase()}] ${n.title}\n   ${n.content}`).join('\n\n') || 'Nenhuma nota fixada.'}
====================================================
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  // Notes CRUD Handlers
  const handleOpenNewNoteModal = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('ideia');
    setNotePinned(false);
    setShowNoteModal(true);
  };

  const handleOpenEditNoteModal = (note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category || 'ideia');
    setNotePinned(!!note.pinned);
    setShowNoteModal(true);
  };

  const handleSaveNote = (e) => {
    if (e) e.preventDefault();
    if (!noteTitle.trim()) {
      alert('Por favor, digite um título para a anotação.');
      return;
    }

    let updatedNotes = [];
    if (editingNoteId) {
      updatedNotes = notes.map(n => n.id === editingNoteId ? {
        ...n,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        pinned: notePinned,
        updatedAt: Date.now()
      } : n);
    } else {
      const newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        pinned: notePinned,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      updatedNotes = [newNote, ...notes];
    }

    setNotes(updatedNotes);
    setShowNoteModal(false);

    if (onUpdatePlanning) {
      onUpdatePlanning({
        goals,
        simulator: { simStake, simSessions, simTarget, simWinrate },
        notes: updatedNotes
      });
    }
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm('Tem certeza de que deseja excluir esta anotação?')) {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      if (onUpdatePlanning) {
        onUpdatePlanning({
          goals,
          simulator: { simStake, simSessions, simTarget, simWinrate },
          notes: updatedNotes
        });
      }
    }
  };

  const handleTogglePinNote = (noteId) => {
    const updatedNotes = notes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n);
    setNotes(updatedNotes);
    if (onUpdatePlanning) {
      onUpdatePlanning({
        goals,
        simulator: { simStake, simSessions, simTarget, simWinrate },
        notes: updatedNotes
      });
    }
  };

  const handleCopyNote = (note) => {
    const textToCopy = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  // Filter notes by search & category
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(noteSearchQuery.toLowerCase());
    
    if (selectedNoteCategoryFilter === 'all') return matchesSearch;
    if (selectedNoteCategoryFilter === 'pinned') return matchesSearch && n.pinned;
    return matchesSearch && n.category === selectedNoteCategoryFilter;
  });

  // Sort: pinned first, then newest
  filteredNotes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });

  // Category Badge Styles
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'ideia':
        return { label: '💡 Ideia', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' };
      case 'meta':
        return { label: '🎯 Meta', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'risco':
        return { label: '⚠️ Risco', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'anotacao':
        return { label: '📝 Anotação', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)' };
      case 'lembrete':
        return { label: '📌 Lembrete', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' };
      default:
        return { label: '📝 Geral', color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  // Setup wizard styling if goals not configured
  if (!goals.configured) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2.5rem 1rem',
        minHeight: '80vh',
        color: 'white'
      }}>
        <div className="glass-panel" style={{
          padding: '2.5rem',
          maxWidth: '540px',
          width: '100%',
          background: 'rgba(15, 11, 28, 0.75)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
          animation: 'scaleUp 0.3s ease-out'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.85rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem', color: 'var(--primary-light)' }}>
              <Target size={36} className="pulse-primary" />
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>Planejamento Financeiro ASTROBOT</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Para começarmos, defina seus objetivos de trading. O ASTROBOT calculará projeções matemáticas e gerará conselhos de evolução baseados em sua performance diária.
            </p>
          </div>

          <form onSubmit={handleSaveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Meta Financeira Mensal ($) <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'none' }}>(Opcional)</span>
              </label>
              <input
                type="number"
                value={tempMonthly}
                onChange={(e) => setTempMonthly(e.target.value)}
                placeholder="Ex: 500"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Meta Trimestral ($) <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'none' }}>(Opcional)</span>
                </label>
                <input
                  type="number"
                  value={tempQuarterly}
                  onChange={(e) => setTempQuarterly(e.target.value)}
                  placeholder="Ex: 1500"
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Meta Anual ($) <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'none' }}>(Opcional)</span>
                </label>
                <input
                  type="number"
                  value={tempAnnual}
                  onChange={(e) => setTempAnnual(e.target.value)}
                  placeholder="Ex: 5000"
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Meta Customizada e Nome do Objetivo <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'none' }}>(Opcional)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ex: Novo Notebook"
                  value={tempCustomName}
                  onChange={(e) => setTempCustomName(e.target.value)}
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', width: '100%' }}
                />
                <input
                  type="number"
                  placeholder="Valor ($)"
                  value={tempCustom}
                  onChange={(e) => setTempCustom(e.target.value)}
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary"
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                borderRadius: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <Sparkles size={16} /> Salvar e Planejar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard content once configured
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      color: 'var(--text-primary)'
    }}>

      {/* HEADER BAR & MAIN SUB-TAB NAVIGATION */}
      <div className="glass-panel" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'rgba(15, 11, 28, 0.75)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              Planejamento & Sistema de Notas
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Gerencie metas financeiras, simule cenários matemáticos e organize suas ideias operacionais.
          </span>
        </div>

        {/* Main Sub-tabs Selector */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={() => setViewMode('overview')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '800',
              background: viewMode === 'overview' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: viewMode === 'overview' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={15} /> Visão Geral & Metas
          </button>
          <button
            onClick={() => setViewMode('calculators')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '800',
              background: viewMode === 'calculators' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: viewMode === 'calculators' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Sliders size={15} /> Calculadoras (Gale/Soros)
          </button>
          <button
            onClick={() => setViewMode('milestones')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '800',
              background: viewMode === 'milestones' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: viewMode === 'milestones' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Flag size={15} /> Marcos Semanais
          </button>
          <button
            onClick={() => setViewMode('notes')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '800',
              background: viewMode === 'notes' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: viewMode === 'notes' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <StickyNote size={15} /> Anotações & Ideias ({notes.length})
          </button>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleExportSummary}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.72rem',
              background: copiedSummary ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.15)',
              border: `1px solid ${copiedSummary ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.3)'}`,
              color: copiedSummary ? '#10b981' : 'var(--primary-light)',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {copiedSummary ? <Check size={14} /> : <Copy size={14} />}
            {copiedSummary ? 'Resumo Copiado!' : 'Exportar Resumo'}
          </button>

          <button
            onClick={handleResetPlanning}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.72rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reconfigurar
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: OVERVIEW & GOALS */}
      {viewMode === 'overview' && (
        <>
          {/* Active Goal Period Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 11, 28, 0.3)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              SELECIONE O PERÍODO DA META:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'monthly', label: `Mensal ($${goals.monthly})`, val: goals.monthly },
                { id: 'quarterly', label: `Trimestral ($${goals.quarterly})`, val: goals.quarterly },
                { id: 'annual', label: `Anual ($${goals.annual})`, val: goals.annual },
                { id: 'custom', label: `${goals.customName} ($${goals.custom})`, val: goals.custom }
              ].filter(tab => tab.val > 0).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                    border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* OVERVIEW STATS & THERMOMETER */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '1.25rem'
          }}>
            {/* Indicators Panel */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.4)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  Indicadores da Meta Ativa ({activeTab === 'custom' ? goals.customName : activeTab})
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Objetivo</span>
                    <strong style={{ fontSize: '1.35rem', color: 'white', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
                      ${targetValue.toFixed(2)}
                    </strong>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Já Conquistado</span>
                    <strong style={{ fontSize: '1.35rem', color: '#10b981', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
                      ${totalEarned.toFixed(2)}
                    </strong>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Faltam</span>
                    <strong style={{ fontSize: '1.35rem', color: missingAmount > 0 ? '#f59e0b' : '#10b981', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
                      ${missingAmount.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Status da Projeção</span>
                  <strong style={{ fontSize: '0.85rem', color: paceDiffPercent >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {paceDiffPercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {paceDiffPercent >= 0 ? `${paceDiffPercent.toFixed(1)}% acima do planejado` : `${Math.abs(paceDiffPercent).toFixed(1)}% atrasado`}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faltam: <strong>{remainingDays} dias</strong></span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Meta Diária Nec: <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${Math.max(0, dailyAverageRequired).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Thermometer Panel */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.4)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              justifyContent: 'center'
            }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="2.8"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={achievedPercent >= 100 ? '#10b981' : 'url(#gGlow)'}
                    strokeDasharray={`${achievedPercent}, 100`}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0px 0px 4px rgba(139, 92, 246, 0.5))' }}
                  />
                  <defs>
                    <linearGradient id="gGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'white' }}>
                    {achievedPercent.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Meta</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 'bold' }}>Termômetro de Evolução</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Você já acumulou <strong style={{ color: '#10b981' }}>${totalEarned.toFixed(1)}</strong> do objetivo final de <strong>${targetValue}</strong>.
                </span>
                <div style={{ width: '140px', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${achievedPercent}%`, height: '100%', background: achievedPercent >= 100 ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #d946ef)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* EVOLUTION SVG CHART & SMART PROJECTIONS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '1.25rem'
          }}>
            {/* SVG Evolution Chart */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.45)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Gráfico de Evolução Financeira
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#8b5cf6' }} /> Lucro Real</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} /> Meta Projetada</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(139, 92, 246, 0.2)', border: '1px dashed #d946ef' }} /> Projeção Futura</span>
                </div>
              </div>

              {/* SVG Line Chart renderer */}
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                {dbTrades.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <BarChart2 size={36} />
                    <span style={{ fontSize: '0.72rem' }}>Aguardando operações para plotar a evolução.</span>
                  </div>
                ) : (() => {
                  const currentMonthTrades = dbTrades.filter(t => {
                    const d = new Date(t.timestamp || t.time);
                    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
                  });

                  const dayProfits = Array(30).fill(0);
                  currentMonthTrades.forEach(t => {
                    const dayIndex = Math.min(29, Math.max(0, new Date(t.timestamp || t.time).getDate() - 1));
                    dayProfits[dayIndex] += (t.profit || 0);
                  });

                  const realPoints = [{ x: 0, y: 0 }];
                  let cumSum = 0;
                  const todayDayNum = now.getDate();
                  
                  dayProfits.forEach((prof, idx) => {
                    cumSum += prof;
                    if (idx < todayDayNum) {
                      realPoints.push({ x: idx + 1, y: cumSum });
                    }
                  });

                  const currentDayNum = Math.max(1, realPoints.length - 1);
                  const dailyAvg = cumSum / currentDayNum;
                  const projPoints = [];
                  for (let i = currentDayNum; i <= 30; i++) {
                    projPoints.push({ x: i, y: cumSum + (dailyAvg * (i - currentDayNum)) });
                  }

                  const w = 600;
                  const h = 220;
                  const pL = 50;
                  const pR = 25;
                  const pT = 20;
                  const pB = 30;

                  const allValues = [
                    0, 
                    targetValue, 
                    ...realPoints.map(pt => pt.y), 
                    ...projPoints.map(pt => pt.y)
                  ];
                  const rawMax = Math.max(...allValues);
                  const rawMin = Math.min(...allValues);
                  const valRangeRaw = rawMax - rawMin;
                  
                  const maxVal = rawMax + (valRangeRaw === 0 ? 10 : valRangeRaw * 0.15);
                  const minVal = rawMin - (valRangeRaw === 0 ? 10 : valRangeRaw * 0.15);
                  const valRange = maxVal - minVal;

                  const getXCoord = (dayIdx) => pL + (dayIdx / 30) * (w - pL - pR);
                  const getYCoord = (val) => h - pB - ((val - minVal) / valRange) * (h - pT - pB);

                  const getBezierPath = (points) => {
                    if (points.length === 0) return '';
                    if (points.length === 1) return `M ${getXCoord(points[0].x)} ${getYCoord(points[0].y)}`;
                    
                    let d = `M ${getXCoord(points[0].x)} ${getYCoord(points[0].y)}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const curr = points[i];
                      const next = points[i + 1];
                      const cp1x = getXCoord(curr.x) + (getXCoord(next.x) - getXCoord(curr.x)) / 2;
                      const cp1y = getYCoord(curr.y);
                      const cp2x = getXCoord(curr.x) + (getXCoord(next.x) - getXCoord(curr.x)) / 2;
                      const cp2y = getYCoord(next.y);
                      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${getXCoord(next.x)} ${getYCoord(next.y)}`;
                    }
                    return d;
                  };

                  const realBezierPath = getBezierPath(realPoints);
                  const projBezierPath = getBezierPath(projPoints);
                  const goalPath = `M ${getXCoord(0)} ${getYCoord(0)} L ${getXCoord(30)} ${getYCoord(targetValue)}`;

                  const yGridLines = [];
                  for (let i = 0; i < 5; i++) {
                    yGridLines.push(minVal + (valRange * i) / 4);
                  }

                  const xDays = [0, 5, 10, 15, 20, 25, 30];

                  return (
                    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="realAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="projAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="realLineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="goalLineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>

                      {yGridLines.map((val, idx) => {
                        const y = getYCoord(val);
                        return (
                          <g key={idx}>
                            <line 
                              x1={pL} 
                              y1={y} 
                              x2={w - pR} 
                              y2={y} 
                              stroke={Math.abs(val) < 1.0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'} 
                              strokeWidth="1" 
                              strokeDasharray={Math.abs(val) < 1.0 ? '0' : '3 3'}
                            />
                            <text 
                              x={pL - 8} 
                              y={y + 3} 
                              fill="var(--text-secondary)" 
                              fontSize="9" 
                              fontWeight="bold"
                              fontFamily="var(--font-mono)"
                              textAnchor="end"
                            >
                              ${val.toFixed(0)}
                            </text>
                          </g>
                        );
                      })}

                      {xDays.map((day, idx) => {
                        const x = getXCoord(day);
                        return (
                          <g key={idx}>
                            <line 
                              x1={x} 
                              y1={pT} 
                              x2={x} 
                              y2={h - pB} 
                              stroke="rgba(255,255,255,0.03)" 
                              strokeWidth="1" 
                            />
                            <text 
                              x={x} 
                              y={h - pB + 16} 
                              fill="var(--text-muted)" 
                              fontSize="9.5" 
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              Dia {day}
                            </text>
                          </g>
                        );
                      })}

                      {realPoints.length > 0 && (
                        <path
                          d={`${realBezierPath} L ${getXCoord(realPoints[realPoints.length - 1].x)} ${getYCoord(minVal)} L ${getXCoord(0)} ${getYCoord(minVal)} Z`}
                          fill="url(#realAreaGradient)"
                        />
                      )}

                      {projPoints.length > 0 && (
                        <path
                          d={`${projBezierPath} L ${getXCoord(30)} ${getYCoord(minVal)} L ${getXCoord(currentDayNum)} ${getYCoord(minVal)} Z`}
                          fill="url(#projAreaGradient)"
                        />
                      )}

                      <path d={goalPath} fill="none" stroke="url(#goalLineGradient)" strokeWidth="2.5" />

                      {projBezierPath && (
                        <path d={projBezierPath} fill="none" stroke="#d946ef" strokeWidth="2.2" strokeDasharray="5 4" />
                      )}

                      {realBezierPath && (
                        <path d={realBezierPath} fill="none" stroke="url(#realLineGradient)" strokeWidth="3.2" strokeLinecap="round" />
                      )}

                      {realPoints.length > 0 && (
                        <g>
                          <circle 
                            cx={getXCoord(realPoints[realPoints.length - 1].x)} 
                            cy={getYCoord(realPoints[realPoints.length - 1].y)} 
                            r="8" 
                            fill="#8b5cf6" 
                            opacity="0.3"
                          />
                          <circle 
                            cx={getXCoord(realPoints[realPoints.length - 1].x)} 
                            cy={getYCoord(realPoints[realPoints.length - 1].y)} 
                            r="4" 
                            fill="white" 
                            stroke="#8b5cf6" 
                            strokeWidth="2"
                          />
                        </g>
                      )}
                    </svg>
                  );
                })()}
              </div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px', textAlign: 'center' }}>
                Eixo X: Dias do Mês (1 a 30) | Eixo Y: Lucro acumulado em USD ($)
              </span>
            </div>

            {/* IA Smart Forecast */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.45)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  Projeção Inteligente
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Média por Sessão:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${aiProjs.avgProfitPerSession.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Média por Operação:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${aiProjs.avgProfitPerOp.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Lucro Médio por Dia:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>${aiProjs.avgProfitPerDay.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Gale Médio por Sinal:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{aiProjs.avgMartingale.toFixed(1)} lvl</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.12)', padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-light)', fontSize: '0.78rem', fontWeight: 'bold' }}>
                  <Cpu size={14} /> Previsão IA: Meta Atingida em:
                </div>
                <strong style={{ display: 'block', fontSize: '1.25rem', color: '#10b981', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  {aiProjs.daysToGoal}
                </strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Restando aproximadamente: <strong style={{ color: 'white' }}>{aiProjs.opsToGoal}</strong> ou <strong style={{ color: 'white' }}>{aiProjs.sessionsToGoal}</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* PARAMETRIC SIMULATOR & IA FINANCIAL ADVISOR */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem'
          }}>
            {/* Dynamic Simulator */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.45)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px'
            }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                Simulador Paramétrico de Metas
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>VALOR DA ENTRADA (STAKE)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="range"
                        min="0.35"
                        max="10.0"
                        step="0.05"
                        value={simStake}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimStake(val);
                          if (onUpdatePlanning) {
                            onUpdatePlanning({
                              goals,
                              simulator: { simStake: val, simSessions, simTarget, simWinrate },
                              notes
                            });
                          }
                        }}
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px' }}>${simStake.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>META POR SESSÃO ($)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="range"
                        min="1.0"
                        max="20.0"
                        step="0.5"
                        value={simTarget}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimTarget(val);
                          if (onUpdatePlanning) {
                            onUpdatePlanning({
                              goals,
                              simulator: { simStake, simSessions, simTarget: val, simWinrate },
                              notes
                            });
                          }
                        }}
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px' }}>${simTarget.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>SESSÕES DIÁRIAS</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSimSessions(s);
                            if (onUpdatePlanning) {
                              onUpdatePlanning({
                                goals,
                                simulator: { simStake, simSessions: s, simTarget, simWinrate },
                                notes
                              });
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '4px',
                            fontSize: '0.7rem',
                            borderRadius: '6px',
                            background: simSessions === s ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>ASSERTIVIDADE ESTIMADA</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="range"
                        min="70"
                        max="99"
                        step="1"
                        value={simWinrate}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSimWinrate(val);
                          if (onUpdatePlanning) {
                            onUpdatePlanning({
                              goals,
                              simulator: { simStake, simSessions, simTarget, simWinrate: val },
                              notes
                            });
                          }
                        }}
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px' }}>{simWinrate}%</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.12)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block' }}>RETORNO ESTIMADO MENSAL</span>
                    <strong style={{ fontSize: '1.25rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      +${simResult.toFixed(2)} / mês
                    </strong>
                  </div>
                  <Sparkles size={24} style={{ color: '#fbbf24' }} className="pulse-primary" />
                </div>
              </div>
            </div>

            {/* AI Advisor Panel */}
            <div className="glass-panel" style={{
              padding: '1.5rem',
              background: 'rgba(15, 11, 28, 0.45)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                Conselheiro Financeiro IA
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto' }}>
                {aiAdvisor.map((rec, idx) => {
                  let bg = 'rgba(255,255,255,0.02)';
                  let border = 'rgba(255,255,255,0.04)';
                  let badgeText = 'CONSELHO';
                  let badgeColor = '#94a3b8';

                  if (rec.type === 'success') {
                    bg = 'rgba(16, 185, 129, 0.03)';
                    border = 'rgba(16, 185, 129, 0.15)';
                    badgeText = 'OTIMIZAÇÃO';
                    badgeColor = '#10b981';
                  } else if (rec.type === 'warning') {
                    bg = 'rgba(245, 158, 11, 0.03)';
                    border = 'rgba(245, 158, 11, 0.15)';
                    badgeText = 'ALERTA';
                    badgeColor = '#f59e0b';
                  } else if (rec.type === 'tip') {
                    bg = 'rgba(139, 92, 246, 0.04)';
                    border = 'rgba(139, 92, 246, 0.15)';
                    badgeText = 'SUGESTÃO';
                    badgeColor = 'var(--primary-light)';
                  } else if (rec.type === 'danger') {
                    bg = 'rgba(239, 68, 68, 0.04)';
                    border = 'rgba(239, 68, 68, 0.15)';
                    badgeText = 'CRÍTICO';
                    badgeColor = '#ef4444';
                  }

                  return (
                    <div key={idx} style={{
                      padding: '0.75rem',
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {badgeText}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.3' }}>
                        {rec.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MONTHLY CALENDAR GRID */}
          <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'rgba(15, 11, 28, 0.45)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={18} style={{ color: 'var(--primary-light)' }} />
                <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Calendário Mensal de Evolução ({monthNames[currentMonth]} {currentYear})
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} /> Sem Ops</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }} /> Lucro</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.4)', border: '1px solid #10b981', boxShadow: '0 0 5px rgba(16,185,129,0.3)' }} /> Meta Batida</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }} /> Stop Loss Hit</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <span key={d} style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{d}</span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', minHeight: '260px' }}>
              {calendarDays.map((cell, idx) => {
                const isClickable = cell.dayNum && cell.trades.length > 0;
                let bg = 'rgba(255,255,255,0.01)';
                let border = '1px solid rgba(255,255,255,0.02)';
                let shadow = 'none';

                if (cell.status === 'profit') {
                  bg = 'rgba(16, 185, 129, 0.1)';
                  border = '1px solid rgba(16, 185, 129, 0.25)';
                } else if (cell.status === 'goal_beaten') {
                  bg = 'rgba(16, 185, 129, 0.3)';
                  border = '1.5px solid #10b981';
                  shadow = '0 0 10px rgba(16, 185, 129, 0.2)';
                } else if (cell.status === 'stop') {
                  bg = 'rgba(239, 68, 68, 0.15)';
                  border = '1px solid rgba(239, 68, 68, 0.35)';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(cell)}
                    style={{
                      background: bg,
                      border: border,
                      boxShadow: shadow,
                      borderRadius: '10px',
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity: cell.dayNum ? 1 : 0.2
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: cell.dayNum ? 'white' : 'transparent' }}>
                        {cell.dayNum}
                      </span>
                      {cell.trades && cell.trades.length > 0 && (
                        <span style={{ fontSize: '0.58rem', padding: '1px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          {cell.trades.length} ops
                        </span>
                      )}
                    </div>

                    {cell.dayNum && cell.trades.length > 0 ? (
                      <strong style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: cell.profit >= 0 ? '#10b981' : '#ef4444', textAlign: 'right', display: 'block', marginTop: '0.5rem' }}>
                        {cell.profit >= 0 ? '+' : ''}${cell.profit.toFixed(1)}
                      </strong>
                    ) : (
                      <span style={{ height: '14px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 2: CALCULATORS (GALE & SOROS) */}
      {viewMode === 'calculators' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* MARTINGALE MATRIX CALCULATOR */}
          <div className="glass-panel" style={{
            padding: '1.75rem',
            background: 'rgba(15, 11, 28, 0.55)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.12)', borderRadius: '12px', color: 'var(--primary-light)' }}>
                  <Sliders size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'white' }}>
                    Calculadora Martingale (Gale Matrix)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Simule cenários de recuperação com multiplicadores por nível de perda.
                  </span>
                </div>
              </div>

              <button
                onClick={handlePullCurrentSettings}
                style={{
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} /> Puxar Configurações do Robô
              </button>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Stake Inicial ($)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.35"
                  value={calcStake}
                  onChange={(e) => setCalcStake(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Multiplicador Gale</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={calcMultiplier}
                  onChange={(e) => setCalcMultiplier(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Níveis (Total)</label>
                <select
                  value={calcMaxLevels}
                  onChange={(e) => setCalcMaxLevels(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl} {lvl === 1 ? 'Nível (G0)' : `Níveis (G0 a G${lvl - 1})`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Payout Corretora (%)</label>
                <input
                  type="number"
                  step="1"
                  min="50"
                  max="100"
                  value={calcPayout}
                  onChange={(e) => setCalcPayout(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Banca / Capital ($)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={calcBank}
                  onChange={(e) => setCalcBank(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(9, 9, 15, 0.75)', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nível</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Entrada ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Custo Acumulado ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Retorno Bruto ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Lucro Líquido ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>% Risco da Banca</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixLevels.map((lvl) => (
                    <tr key={lvl.level} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: lvl.level % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'white' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--primary-light)' }}>
                          {lvl.name}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'white' }}>${lvl.stake.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>${lvl.accumulatedCost.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>${lvl.grossReturn.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: lvl.netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                        {lvl.netProfit >= 0 ? '+' : ''}${lvl.netProfit.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: lvl.bankRiskPercent > 100 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {lvl.bankRiskPercent.toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 'bold',
                          background: lvl.bankRiskPercent > 100 ? 'rgba(239, 68, 68, 0.15)' : lvl.bankRiskPercent > 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: lvl.bankRiskPercent > 100 ? '#ef4444' : lvl.bankRiskPercent > 50 ? '#f59e0b' : '#10b981',
                          border: `1px solid ${lvl.bankRiskPercent > 100 ? 'rgba(239, 68, 68, 0.3)' : lvl.bankRiskPercent > 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {lvl.bankRiskPercent > 100 ? '❌ Banca Insuficiente' : lvl.bankRiskPercent > 50 ? '⚠️ Risco Elevado' : '✅ Seguro'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insights Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 'bold', textTransform: 'uppercase' }}>Stop Loss Total do Gale</span>
                <strong style={{ fontSize: '1.2rem', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>${maxRiskTotal.toFixed(2)}</strong>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Custo máximo em caso de hit no último nível</span>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase' }}>WINs p/ Recuperar 1 Hit</span>
                <strong style={{ fontSize: '1.2rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>{winsToRecoverHit} WINs em G0</strong>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Para cobrir o prejuízo de 1 Stop Loss completo</span>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>Sobrevivência da Banca</span>
                <strong style={{ fontSize: '1.2rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{survivalCount} Hits seguidos</strong>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Quantos Stop Losses consecutivos sua banca suporta</span>
              </div>
            </div>
          </div>

          {/* SOROS & SOROSGALE MATRIX CALCULATOR */}
          <div className="glass-panel" style={{
            padding: '1.75rem',
            background: 'rgba(15, 11, 28, 0.55)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '12px', color: '#10b981' }}>
                <Zap size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  Simulador de Alavancagem Soros & SorosGale
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Projete reinvestimento de lucros em sequência (Mão Composta) para multiplicar capital com risco limitado.
                </span>
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Entrada Inicial ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.35"
                  value={sorosStake}
                  onChange={(e) => setSorosStake(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Níveis da Sequência</label>
                <select
                  value={sorosLevels}
                  onChange={(e) => setSorosLevels(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                >
                  {[2, 3, 4, 5, 6].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl} Mãos Consecutivas</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Payout Corretora (%)</label>
                <input
                  type="number"
                  step="1"
                  min="50"
                  max="100"
                  value={sorosPayout}
                  onChange={(e) => setSorosPayout(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Reinvestimento do Lucro (%)</label>
                <select
                  value={sorosReinvestPct}
                  onChange={(e) => setSorosReinvestPct(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                >
                  <option value={100}>100% (Soros Completo - Max Retorno)</option>
                  <option value={80}>80% (Soros Moderado - Trava Lucro)</option>
                  <option value={50}>50% (Soros Conservador - Retira Mão)</option>
                </select>
              </div>
            </div>

            {/* Soros Matrix Table */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(9, 9, 15, 0.75)', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Mão Soros</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Entrada ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Lucro da Mão ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Lucro Acumulado ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Próxima Entrada ($)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Multiplicador do Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {sorosMatrixLevels.map((lvl) => (
                    <tr key={lvl.level} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: lvl.level % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'white' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
                          {lvl.name}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'white' }}>${lvl.stake.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#34d399' }}>+${lvl.profit.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 'bold' }}>+${lvl.accumulatedProfit.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>${lvl.nextStake.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: '#fbbf24', fontWeight: 'bold' }}>
                        {(lvl.accumulatedProfit / sorosStake).toFixed(1)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase' }}>LUCRO POTENCIAL DA SEQUÊNCIA COMPLETA</span>
                <strong style={{ fontSize: '1.25rem', color: '#10b981', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '2px' }}>
                  +${sorosMatrixLevels.length > 0 ? sorosMatrixLevels[sorosMatrixLevels.length - 1].accumulatedProfit.toFixed(2) : '0.00'}
                </strong>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Risco Máximo: <strong style={{ color: '#ef4444' }}>${sorosStake.toFixed(2)}</strong> (Apenas a 1ª entrada)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: MILESTONES (MARCOS SEMANAIS) */}
      {viewMode === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'rgba(15, 11, 28, 0.45)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  🏁 Decomposição em Marcos Semanais (Meta: ${targetValue})
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Acompanhe e marque os marcos à medida que avança na sua meta operacional.
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>
                {Object.values(completedMilestones).filter(Boolean).length} de 4 Marcos Concluídos
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {milestones.map((m, idx) => {
                const isDone = !!completedMilestones[m.id];
                const isCurrent = !isDone && (idx === 0 || completedMilestones[milestones[idx - 1].id]);

                return (
                  <div key={m.id} style={{
                    padding: '1.25rem',
                    background: isDone ? 'rgba(16, 185, 129, 0.08)' : isCurrent ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                    border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : isCurrent ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.04)'}`,
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isDone ? '#10b981' : isCurrent ? 'var(--primary-light)' : 'var(--text-muted)'
                        }}>
                          {isDone ? '✅ CONCLUÍDO' : isCurrent ? '⚡ EM ANDAMENTO' : '⏳ PENDENTE'}
                        </span>
                        <strong style={{ fontSize: '1.1rem', color: 'white', fontFamily: 'var(--font-mono)' }}>
                          ${m.target.toFixed(0)}
                        </strong>
                      </div>

                      <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'white' }}>
                        {m.title}
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                        {m.desc}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleMilestone(m.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isDone ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: isDone ? '#10b981' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isDone ? <Check size={14} /> : <CheckCircle size={14} />}
                      {isDone ? 'Concluído' : 'Marcar Concluído'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 4: NOTES & IDEAS SYSTEM */}
      {viewMode === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Notes Top Control Bar */}
          <div className="glass-panel" style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(15, 11, 28, 0.55)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#09090f', border: '1px solid var(--border-color)', padding: '0.5rem 0.85rem', borderRadius: '10px', width: '280px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar em ideias e notas..."
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.78rem', width: '100%', outline: 'none' }}
              />
              {noteSearchQuery && (
                <button onClick={() => setNoteSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'pinned', label: '📌 Fixadas' },
                { id: 'ideia', label: '💡 Ideias' },
                { id: 'meta', label: '🎯 Metas' },
                { id: 'risco', label: '⚠️ Risco' },
                { id: 'anotacao', label: '📝 Anotações' },
                { id: 'lembrete', label: '📌 Lembretes' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedNoteCategoryFilter(f.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    background: selectedNoteCategoryFilter === f.id ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                    border: selectedNoteCategoryFilter === f.id ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    color: selectedNoteCategoryFilter === f.id ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* New Note Button */}
            <button
              onClick={handleOpenNewNoteModal}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
              }}
            >
              <Plus size={16} /> Nova Anotação / Ideia
            </button>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem 1rem', textAlign: 'center', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.3)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <StickyNote size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'white', fontSize: '1rem' }}>Nenhuma anotação encontrada</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Clique em "Nova Anotação / Ideia" para registrar regras, sacadas e pensamentos do seu trading.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {filteredNotes.map((n) => {
                const catMeta = getCategoryMeta(n.category);
                const isCopied = copiedNoteId === n.id;

                return (
                  <div
                    key={n.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      background: n.pinned ? 'rgba(15, 11, 28, 0.75)' : 'rgba(15, 11, 28, 0.4)',
                      border: n.pinned ? `1px solid ${catMeta.color}` : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      gap: '0.85rem',
                      boxShadow: n.pinned ? `0 4px 20px ${catMeta.color}22` : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: catMeta.bg,
                          border: `1px solid ${catMeta.border}`,
                          color: catMeta.color
                        }}>
                          {catMeta.label}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => handleTogglePinNote(n.id)}
                            title={n.pinned ? 'Desafixar nota' : 'Fixar no topo'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: n.pinned ? '#fbbf24' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                          >
                            <Pin size={14} style={{ transform: n.pinned ? 'rotate(-45deg)' : 'none' }} />
                          </button>

                          <button
                            onClick={() => handleCopyNote(n)}
                            title="Copiar nota"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isCopied ? '#10b981' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          </button>

                          <button
                            onClick={() => handleOpenEditNoteModal(n)}
                            title="Editar nota"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            title="Excluir nota"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white', lineHeight: '1.3' }}>
                        {n.title}
                      </h4>

                      {/* Content */}
                      <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {n.content}
                      </p>
                    </div>

                    {/* Footer timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.65rem', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(n.updatedAt || n.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                      {n.pinned && <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>📌 Fixado</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      {showNoteModal && (
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
          zIndex: 3000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(15, 11, 28, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.25)',
            borderRadius: '20px',
            width: '540px',
            maxWidth: '90%',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={20} style={{ color: 'var(--primary-light)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  {editingNoteId ? 'Editar Anotação / Ideia' : 'Nova Anotação / Ideia'}
                </h3>
              </div>
              <button onClick={() => setShowNoteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Título</label>
                <input
                  type="text"
                  placeholder="Ex: Padrão MHI de 3 velas verdes"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Categoria</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.8rem' }}
                  >
                    <option value="ideia">💡 Ideia de Estratégia</option>
                    <option value="meta">🎯 Meta & Objetivo</option>
                    <option value="risco">⚠️ Gerenciamento de Risco</option>
                    <option value="anotacao">📝 Anotação Geral</option>
                    <option value="lembrete">📌 Lembrete Importante</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: 'white' }}>
                    <input
                      type="checkbox"
                      checked={notePinned}
                      onChange={(e) => setNotePinned(e.target.checked)}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    Fixar no topo (Destaque)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Conteúdo / Detalhes</label>
                <textarea
                  rows={5}
                  placeholder="Escreva sua ideia, observação sobre os mercados ou regras de gerenciamento..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.85rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={16} /> Salvar Anotação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR SELECTED DAY'S TRADES */}
      {selectedDayTrades && (
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
            width: '560px',
            maxWidth: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  Operações do Dia {selectedDayNum} de {monthNames[currentMonth]}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Resumo detalhado das transações do robô.
                </span>
              </div>
              <button
                onClick={() => setSelectedDayTrades(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedDayTrades.map((t, idx) => {
                const isWin = t.result === 'WIN';
                return (
                  <div key={idx} style={{
                    padding: '0.85rem 1rem',
                    background: isWin ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${isWin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                        {t.symbol.replace('Volatility ', '').replace(' Index', '')} ({t.strategy})
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                        Hora: {new Date(t.timestamp || t.time).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block' }}>Stake: ${t.stake?.toFixed(2)}</span>
                        <strong style={{ fontSize: '0.85rem', color: isWin ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                          {isWin ? '+' : ''}${t.profit?.toFixed(2)}
                        </strong>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isWin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isWin ? '#10b981' : '#ef4444'
                      }}>
                        {t.result}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Small icon helper
function X({ size, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
