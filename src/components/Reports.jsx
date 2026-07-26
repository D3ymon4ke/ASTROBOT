import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Percent, 
  ShieldCheck, 
  Activity, 
  Award, 
  BarChart2, 
  Download, 
  AlertCircle, 
  Trash2, 
  Clock, 
  DollarSign, 
  RefreshCw,
  Scale,
  ArrowLeft,
  Save,
  Check,
  Filter,
  Sliders,
  Zap,
  ShieldAlert,
  PieChart,
  Target,
  Cpu,
  Layers,
  Eye,
  HelpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { loadMonthlyReports, saveMonthlyReport, deleteMonthlyReport } from '../utils/db';

// Helper to format year-month key (e.g. "2026-07")
const getMonthKey = (timestamp) => {
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
};

// Helper to format PT-BR month name (e.g. "Julho de 2026")
const getMonthLabel = (key) => {
  const [year, month] = key.split('-');
  const monthsPt = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthsPt[parseInt(month) - 1]} de ${year}`;
};

// Standard statistics calculator for a given list of trades
const calculateStats = (tradesList) => {
  if (!tradesList || tradesList.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      netProfit: 0,
      totalStake: 0,
      roi: 0,
      maxDrawdown: 0,
      winStreak: 0,
      lossStreak: 0,
      dailyProfit: 0,
      weeklyProfit: 0,
      monthlyProfit: 0,
      martingaleDist: { G0: 0, G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, G2Plus: 0, byLevel: {}, maxLevel: 0 },
      hourlyWinrates: Array(24).fill({ total: 0, wins: 0, rate: 0 }),
      dailyWinrates: Array(7).fill({ total: 0, wins: 0, rate: 0 }),
      strategyStats: {},
      assetStats: {},
      equityCurve: [],
      hourlyDetailed: Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0, wins: 0, losses: 0, profit: 0, lossAmount: 0, rate: 0, lossRate: 0, gales: { G0: 0, G1: 0, G2: 0, G3Plus: 0 }, totalGales: 0 })),
      worstHoursByLoss: [],
      worstHoursByCount: [],
      galeRiskHours: [],
      assetDetailed: [],
      worstAssets: []
    };
  }

  const totalTrades = tradesList.length;
  let wins = 0;
  let losses = 0;
  let netProfit = 0;
  let totalStake = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  // Time periods profit
  let dailyProfit = 0;
  let weeklyProfit = 0;
  let monthlyProfit = 0;

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  const oneMonthMs = 30 * oneDayMs;

  // Dynamic Martingale distribution
  const galeCounts = {};
  let maxGaleFound = 0;

  // Heatmaps & Hourly Analysis
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0, wins: 0, losses: 0, profit: 0, lossAmount: 0, gales: { G0: 0, G1: 0, G2: 0, G3Plus: 0 } }));
  const dailyData = Array.from({ length: 7 }, (_, i) => ({ day: i, total: 0, wins: 0 }));

  // Strategy & Asset tables
  const strategyStats = {};
  const assetStats = {};

  // Equity Curve
  const equityCurve = [];
  let runningBalance = 0;
  let maxBalance = 0;
  let maxDrawdown = 0;

  // Sort trades chronologically
  const sortedTrades = [...tradesList].sort((a, b) => (a.timestamp || a.epoch * 1000) - (b.timestamp || b.epoch * 1000));

  sortedTrades.forEach((trade) => {
    const isWin = trade.result === 'WIN';
    const profitVal = trade.profit || 0;
    const stakeVal = trade.stake || 0;
    const timestamp = trade.timestamp || (trade.epoch * 1000);
    const date = new Date(timestamp);
    const hour = date.getHours();
    const day = date.getDay(); // 0 is Sunday
    const gale = Number(trade.galeLevel) || 0;

    // Core stats
    if (isWin) {
      wins++;
      currentWinStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      currentLossStreak = 0;
    } else {
      losses++;
      currentLossStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      currentWinStreak = 0;
    }

    netProfit += profitVal;
    totalStake += stakeVal;

    // Drawdown calculation & Rich Equity Curve
    runningBalance += profitVal;
    if (runningBalance > maxBalance) {
      maxBalance = runningBalance;
    }
    const currentDd = maxBalance > 0 ? ((maxBalance - runningBalance) / maxBalance) * 100 : 0;
    if (currentDd > maxDrawdown) {
      maxDrawdown = currentDd;
    }

    equityCurve.push({
      tradeIndex: wins + losses,
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString(),
      fullDate: date.toLocaleString(),
      value: parseFloat(runningBalance.toFixed(2)),
      profit: parseFloat(profitVal.toFixed(2)),
      stake: parseFloat(stakeVal.toFixed(2)),
      result: isWin ? 'WIN' : 'LOSS',
      symbol: trade.symbol || 'Volatilidade 10 (1s)',
      strategyName: trade.strategyName ? trade.strategyName.replace('_', ' ') : 'Piloto Automático',
      galeLevel: gale,
      drawdown: parseFloat(currentDd.toFixed(1)),
      isAth: runningBalance === maxBalance && runningBalance > 0
    });

    // Time filters
    const diffMs = now - date;
    if (diffMs <= oneDayMs) dailyProfit += profitVal;
    if (diffMs <= oneWeekMs) weeklyProfit += profitVal;
    if (diffMs <= oneMonthMs) monthlyProfit += profitVal;

    // Martingale dist
    if (isWin) {
      galeCounts[gale] = (galeCounts[gale] || 0) + 1;
      if (gale > maxGaleFound) maxGaleFound = gale;
    }

    // Hourly Breakdown
    hourlyData[hour].total++;
    hourlyData[hour].profit += profitVal;
    const galeKey = gale === 0 ? 'G0' : gale === 1 ? 'G1' : gale === 2 ? 'G2' : 'G3Plus';
    hourlyData[hour].gales[galeKey] = (hourlyData[hour].gales[galeKey] || 0) + 1;

    if (isWin) {
      hourlyData[hour].wins++;
    } else {
      hourlyData[hour].losses++;
      hourlyData[hour].lossAmount += Math.abs(profitVal);
    }

    // Daily Heatmap
    dailyData[day].total++;
    if (isWin) dailyData[day].wins++;

    // Strategy breakdown
    const rawStrat = trade.strategyName || 'Piloto Automático';
    const strategyKey = rawStrat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (!strategyStats[strategyKey]) {
      strategyStats[strategyKey] = { trades: 0, wins: 0, profit: 0 };
    }
    strategyStats[strategyKey].trades++;
    strategyStats[strategyKey].profit += profitVal;
    if (isWin) strategyStats[strategyKey].wins++;

    // Asset breakdown
    const assetKey = trade.symbol || 'Unknown';
    if (!assetStats[assetKey]) {
      assetStats[assetKey] = { 
        symbol: assetKey, 
        name: trade.symbol, 
        trades: 0, 
        wins: 0, 
        losses: 0, 
        profit: 0, 
        lossAmount: 0, 
        totalStake: 0, 
        gales: { G0: 0, G1: 0, G2: 0, G3Plus: 0 },
        currentLossStreak: 0,
        maxLossStreak: 0
      };
    }
    assetStats[assetKey].trades++;
    assetStats[assetKey].profit += profitVal;
    assetStats[assetKey].totalStake += stakeVal;
    assetStats[assetKey].gales[galeKey] = (assetStats[assetKey].gales[galeKey] || 0) + 1;

    if (isWin) {
      assetStats[assetKey].wins++;
      assetStats[assetKey].currentLossStreak = 0;
    } else {
      assetStats[assetKey].losses++;
      assetStats[assetKey].lossAmount += Math.abs(profitVal);
      assetStats[assetKey].currentLossStreak++;
      if (assetStats[assetKey].currentLossStreak > assetStats[assetKey].maxLossStreak) {
        assetStats[assetKey].maxLossStreak = assetStats[assetKey].currentLossStreak;
      }
    }
  });

  // Finalize streaks
  maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
  maxLossStreak = Math.max(maxLossStreak, currentLossStreak);

  // Compute winrates
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const roi = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;

  const hourlyWinrates = hourlyData.map(h => ({
    hour: h.hour,
    total: h.total,
    wins: h.wins,
    rate: h.total > 0 ? (h.wins / h.total) * 100 : 0
  }));

  const dailyWinrates = dailyData.map(d => ({
    day: d.day,
    total: d.total,
    wins: d.wins,
    rate: d.total > 0 ? (d.wins / d.total) * 100 : 0
  }));

  // Process Detailed Hourly Analysis
  const hourlyDetailedProcessed = hourlyData.map(h => ({
    ...h,
    rate: h.total > 0 ? (h.wins / h.total) * 100 : 0,
    lossRate: h.total > 0 ? (h.losses / h.total) * 100 : 0,
    totalGales: (h.gales.G1 || 0) + (h.gales.G2 || 0) + (h.gales.G3Plus || 0)
  }));

  const worstHoursByLoss = [...hourlyDetailedProcessed]
    .filter(h => h.total > 0 && h.losses > 0)
    .sort((a, b) => b.lossAmount - a.lossAmount);

  const worstHoursByCount = [...hourlyDetailedProcessed]
    .filter(h => h.total > 0 && h.losses > 0)
    .sort((a, b) => b.losses - a.losses);

  const galeRiskHours = [...hourlyDetailedProcessed]
    .filter(h => h.total > 0 && h.totalGales > 0)
    .sort((a, b) => b.totalGales - a.totalGales);

  // Process Detailed Asset Analysis
  const assetDetailedProcessed = Object.values(assetStats).map(a => ({
    ...a,
    rate: a.trades > 0 ? (a.wins / a.trades) * 100 : 0,
    lossRate: a.trades > 0 ? (a.losses / a.trades) * 100 : 0,
    totalGales: (a.gales.G1 || 0) + (a.gales.G2 || 0) + (a.gales.G3Plus || 0)
  }));

  const worstAssets = [...assetDetailedProcessed]
    .filter(a => a.trades > 0)
    .sort((a, b) => a.profit - b.profit); // Most negative profit first

  const g0 = galeCounts[0] || 0;
  const g1 = galeCounts[1] || 0;
  const g2 = galeCounts[2] || 0;
  const g3 = galeCounts[3] || 0;
  const g4 = galeCounts[4] || 0;
  const g5 = galeCounts[5] || 0;
  const g2Plus = Object.entries(galeCounts).reduce((acc, [lvl, cnt]) => Number(lvl) >= 2 ? acc + cnt : acc, 0);

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    netProfit,
    totalStake,
    roi,
    maxDrawdown,
    winStreak: maxWinStreak,
    lossStreak: maxLossStreak,
    dailyProfit,
    weeklyProfit,
    monthlyProfit,
    martingaleDist: {
      G0: g0,
      G1: g1,
      G2: g2,
      G3: g3,
      G4: g4,
      G5: g5,
      G2Plus: g2Plus,
      byLevel: galeCounts,
      maxLevel: maxGaleFound
    },
    hourlyWinrates,
    dailyWinrates,
    strategyStats,
    assetStats,
    equityCurve,
    hourlyDetailed: hourlyDetailedProcessed,
    worstHoursByLoss,
    worstHoursByCount,
    galeRiskHours,
    assetDetailed: assetDetailedProcessed,
    worstAssets
  };
};

// Simulation Engine helper ("What-If" Analysis)
const runSimulation = (tradesList, simParams = {}) => {
  const {
    excludedHours = [], // Array of hour numbers [14, 15]
    excludedAssets = [], // Array of asset symbols
    maxGaleAllowed = null // null (unlimited), 0 (G0 only), 1 (Max G1), 2 (Max G2)
  } = simParams;

  if (!tradesList || tradesList.length === 0) {
    return {
      simulatedTrades: [],
      stats: calculateStats([])
    };
  }

  const simulatedTrades = [];

  tradesList.forEach(trade => {
    const timestamp = trade.timestamp || (trade.epoch * 1000);
    const date = new Date(timestamp);
    const hour = date.getHours();
    const symbol = trade.symbol || 'Unknown';
    const galeLevel = Number(trade.galeLevel) || 0;

    // Filter out excluded hours
    if (excludedHours.includes(hour)) {
      return;
    }

    // Filter out excluded assets
    if (excludedAssets.includes(symbol)) {
      return;
    }

    // Martingale cap simulation logic
    if (maxGaleAllowed !== null && maxGaleAllowed !== undefined) {
      if (galeLevel > maxGaleAllowed) {
        // Trade reached a gale level higher than the max allowed limit.
        // It counts as stopping at maxGaleAllowed as a LOSS.
        const baseStake = trade.stake || 1;
        simulatedTrades.push({
          ...trade,
          result: 'LOSS',
          profit: -Math.abs(baseStake),
          galeLevel: maxGaleAllowed
        });
        return;
      }
    }

    simulatedTrades.push(trade);
  });

  return {
    simulatedTrades,
    stats: calculateStats(simulatedTrades)
  };
};

// Dynamic Martingale Level Helpers
const getGaleGradient = (level) => {
  const gradients = [
    'linear-gradient(90deg, #10b981, #059669)', // G0 - Emerald Green
    'linear-gradient(90deg, #8b5cf6, #7c3aed)', // G1 - Purple
    'linear-gradient(90deg, #ec4899, #db2777)', // G2 - Pink / Magenta
    'linear-gradient(90deg, #06b6d4, #0284c7)', // G3 - Cyan / Blue
    'linear-gradient(90deg, #f59e0b, #d97706)', // G4 - Amber / Orange
    'linear-gradient(90deg, #f43f5e, #e11d48)', // G5 - Rose / Red
    'linear-gradient(90deg, #a855f7, #9333ea)', // G6 - Violet
    'linear-gradient(90deg, #14b8a6, #0d9488)', // G7 - Teal
    'linear-gradient(90deg, #6366f1, #4f46e5)', // G8 - Indigo
    'linear-gradient(90deg, #3b82f6, #1d4ed8)', // G9 - Blue
    'linear-gradient(90deg, #e11d48, #9f1239)', // G10+ - Crimson
  ];
  return gradients[Math.min(level, gradients.length - 1)];
};

const getGaleTextColor = (level) => {
  const colors = ['#10b981', '#a78bfa', '#f472b6', '#38bdf8', '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf', '#818cf8', '#60a5fa', '#f43f5e'];
  return colors[Math.min(level, colors.length - 1)];
};

const getMartingaleLevelsList = (dist) => {
  if (!dist) return [];

  if (dist.byLevel && Object.keys(dist.byLevel).length > 0) {
    const levelsInObj = Object.keys(dist.byLevel).map(Number);
    const maxLvl = Math.max(3, ...levelsInObj, dist.maxLevel || 0);
    const list = [];
    for (let i = 0; i <= maxLvl; i++) {
      const cnt = dist.byLevel[i] || 0;
      if (cnt > 0 || i <= 3) {
        list.push({
          level: i,
          label: i === 0 ? 'Primeira Entrada (G0)' : `Martingale Nível ${i} (G${i})`,
          shortLabel: i === 0 ? 'G0 (Entrada Direta)' : `Gale ${i} (G${i})`,
          count: cnt
        });
      }
    }
    return list;
  }

  // Fallback for older stored formats
  const list = [
    { level: 0, label: 'Primeira Entrada (G0)', shortLabel: 'G0 (Entrada Direta)', count: dist.G0 || 0 },
    { level: 1, label: 'Martingale Nível 1 (G1)', shortLabel: 'Gale 1 (G1)', count: dist.G1 || 0 }
  ];

  if (dist.G2 !== undefined || dist.G3 !== undefined || dist.G4 !== undefined || dist.G5 !== undefined) {
    if (dist.G2 !== undefined) list.push({ level: 2, label: 'Martingale Nível 2 (G2)', shortLabel: 'Gale 2 (G2)', count: dist.G2 });
    if (dist.G3 !== undefined) list.push({ level: 3, label: 'Martingale Nível 3 (G3)', shortLabel: 'Gale 3 (G3)', count: dist.G3 });
    if (dist.G4 !== undefined) list.push({ level: 4, label: 'Martingale Nível 4 (G4)', shortLabel: 'Gale 4 (G4)', count: dist.G4 });
    if (dist.G5 !== undefined) list.push({ level: 5, label: 'Martingale Nível 5 (G5)', shortLabel: 'Gale 5 (G5)', count: dist.G5 });
  } else {
    list.push({ level: 2, label: 'Gale 2 ou superior (G2+)', shortLabel: 'Gale 2+ (G2+)', count: dist.G2Plus || 0 });
  }

  return list;
};

export default function Reports({ dbTrades = [], onClearDb, isDemo = true }) {
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or key like '2026-07'
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [viewingArchivedReport, setViewingArchivedReport] = useState(null);
  
  // Compare Mode State
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState('');
  const [compareMonthB, setCompareMonthB] = useState('');
  
  const [exportHover, setExportHover] = useState(null);
  const [toast, setToast] = useState(null);

  // Equity Curve Interactive States
  const [equityZoom, setEquityZoom] = useState('all'); // 'all' | 20 | 50 | 100
  const [hoveredEquityPoint, setHoveredEquityPoint] = useState(null);

  // Load saved monthly reports on mount and when isDemo changes
  useEffect(() => {
    setMonthlyReports(loadMonthlyReports(isDemo));
  }, [isDemo]);

  // Show auto-dismiss toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Formatting helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Find all distinct months inside active trades
  const activeMonths = useMemo(() => {
    const monthsMap = {};
    dbTrades.forEach(trade => {
      const ts = trade.timestamp || (trade.epoch * 1000);
      if (ts) {
        const key = getMonthKey(ts);
        monthsMap[key] = true;
      }
    });
    return Object.keys(monthsMap).sort((a, b) => b.localeCompare(a));
  }, [dbTrades]);

  // Filter active trades based on month selection
  const filteredTrades = useMemo(() => {
    if (selectedMonth === 'all') return dbTrades;
    return dbTrades.filter(trade => {
      const ts = trade.timestamp || (trade.epoch * 1000);
      return ts && getMonthKey(ts) === selectedMonth;
    });
  }, [dbTrades, selectedMonth]);

  // Determine current active metrics
  const stats = useMemo(() => {
    if (viewingArchivedReport) {
      return viewingArchivedReport.stats;
    }
    return calculateStats(filteredTrades);
  }, [filteredTrades, viewingArchivedReport]);

  const displayedTrades = useMemo(() => {
    if (viewingArchivedReport) {
      return viewingArchivedReport.trades;
    }
    return filteredTrades;
  }, [filteredTrades, viewingArchivedReport]);

  // Sub-Tab Navigation State
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'risk' | 'simulator' | 'compare'
  
  // Simulator States
  const [simExcludedHours, setSimExcludedHours] = useState([]);
  const [simExcludedAssets, setSimExcludedAssets] = useState([]);
  const [simMaxGale, setSimMaxGale] = useState(null); // null (unlimited), 0 (G0), 1 (G1), 2 (G2)

  // Simulation computation result
  const simResult = useMemo(() => {
    return runSimulation(displayedTrades, {
      excludedHours: simExcludedHours,
      excludedAssets: simExcludedAssets,
      maxGaleAllowed: simMaxGale
    });
  }, [displayedTrades, simExcludedHours, simExcludedAssets, simMaxGale]);

  // Dual Equity Chart SVG for Simulation Tab
  const renderSimulatedEquityChart = () => {
    const realCurve = stats.equityCurve || [];
    const simCurve = simResult.stats.equityCurve || [];

    if (realCurve.length < 2) {
      return (
        <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem', background: 'rgba(9, 9, 15, 0.4)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.06)' }}>
          <Activity size={28} style={{ opacity: 0.3, color: '#38bdf8' }} />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Requer pelo menos 2 operações executadas para gerar a curva simulada.</span>
        </div>
      );
    }

    const width = 800;
    const height = 240;
    const padding = { top: 30, right: 40, bottom: 35, left: 55 };

    const allVals = [...realCurve.map(c => c.value), ...simCurve.map(c => c.value)];
    const minVal = Math.min(0, ...allVals) - 4;
    const maxVal = Math.max(10, ...allVals) + 4;
    const valRange = maxVal - minVal || 1;

    const realPoints = realCurve.map((d, index) => {
      const x = padding.left + (index / Math.max(1, realCurve.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((d.value - minVal) / valRange) * (height - padding.top - padding.bottom);
      return { x, y, data: d };
    });

    const simPoints = simCurve.map((d, index) => {
      const x = padding.left + (index / Math.max(1, Math.max(1, simCurve.length - 1))) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((d.value - minVal) / valRange) * (height - padding.top - padding.bottom);
      return { x, y, data: d };
    });

    const realPathString = realPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const simPathString = simPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const zeroLineY = height - padding.bottom - ((0 - minVal) / valRange) * (height - padding.top - padding.bottom);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '240px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="simPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid */}
            <line x1={padding.left} y1={zeroLineY} x2={width - padding.right} y2={zeroLineY} stroke="rgba(255,255,255,0.12)" strokeDasharray="4,4" />
            <text x={padding.left - 8} y={zeroLineY + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">$0.00</text>

            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="rgba(255,255,255,0.04)" />
            <text x={padding.left - 8} y={padding.top + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">+${maxVal.toFixed(0)}</text>

            {/* Real Curve Path (Original - Dashed Purple) */}
            <path
              d={realPathString}
              fill="none"
              stroke="rgba(167, 139, 250, 0.45)"
              strokeWidth="2"
              strokeDasharray="4,4"
            />

            {/* Sim Area Fill */}
            {simPoints.length > 0 && (
              <path
                d={`M ${padding.left},${height - padding.bottom} L ${simPathString.replace('M ', '')} L ${width - padding.right},${height - padding.bottom} Z`}
                fill="url(#simPositiveGrad)"
              />
            )}

            {/* Simulated Curve Path (Optimized - Solid Emerald) */}
            <path
              d={simPathString}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa' }}>
            <span style={{ width: 16, height: 2, background: '#a78bfa', display: 'inline-block', borderStyle: 'dashed' }}></span>
            <span>Resultado Real (Original)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 'bold' }}>
            <span style={{ width: 16, height: 3, background: '#10b981', display: 'inline-block' }}></span>
            <span>Resultado Simulado (Otimizado)</span>
          </div>
        </div>
      </div>
    );
  };

  // Render Risk Analysis Sub-Tab
  const renderRiskAnalysisView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
        
        {/* Risk Banner */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(14, 11, 24, 0.5) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} style={{ color: '#f87171' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '0.04em' }}>DIAGNÓSTICO DE RISCO & ZONAS CRÍTICAS</h3>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '3px 0 0 0' }}>Análise detalhada de horários de prejuízo acumulado, picos de Martingale e ativos de maior drawdown.</p>
            </div>
          </div>

          <button
            onClick={() => {
              const top3Worst = stats.worstHoursByLoss.slice(0, 3).map(h => h.hour);
              setSimExcludedHours(top3Worst);
              setActiveSubTab('simulator');
              showToast('Piores 3 horários pré-carregados no Simulador!');
            }}
            style={{
              padding: '0.6rem 1.1rem',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)'
            }}
          >
            <Sliders size={14} /> Simular Exclusão dos Piores Horários
          </button>
        </div>

        {/* Grid 1: Horários Zica (Worst Hours by Loss) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>🔥 HORÁRIOS ZICA (MAIOR PREJUÍZO ACUMULADO)</h3>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Ordenado pelo valor total em USD perdido no horário</span>
          </div>

          {stats.worstHoursByLoss.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {stats.worstHoursByLoss.slice(0, 4).map((item, idx) => {
                const hourFormatted = `${String(item.hour).padStart(2, '0')}:00h - ${String(item.hour).padStart(2, '0')}:59h`;
                const isExcludedInSim = simExcludedHours.includes(item.hour);
                return (
                  <div
                    key={item.hour}
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>
                          #{idx + 1}
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'white' }}>{hourFormatted}</strong>
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: item.rate >= 50 ? '#10b981' : '#f87171', background: 'rgba(0,0,0,0.3)', padding: '2px 7px', borderRadius: '6px' }}>
                        {item.rate.toFixed(0)}% Acertos
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Prejuízo Acumulado</span>
                        <strong style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.95rem' }}>-${item.lossAmount.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Contagem de Losses</span>
                        <strong style={{ color: '#f87171', fontFamily: 'monospace', fontSize: '0.95rem' }}>{item.losses} / {item.total} ops</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.5rem', fontSize: '0.65rem' }}>
                      <span style={{ color: '#94a3b8' }}>⚡ Gales: G1({item.gales.G1 || 0}) G2({item.gales.G2 || 0}) G3+({item.gales.G3Plus || 0})</span>
                      <button
                        onClick={() => {
                          if (isExcludedInSim) {
                            setSimExcludedHours(prev => prev.filter(h => h !== item.hour));
                          } else {
                            setSimExcludedHours(prev => [...prev, item.hour]);
                            setActiveSubTab('simulator');
                            showToast(`Hora ${item.hour}h adicionada ao Simulador!`);
                          }
                        }}
                        style={{
                          background: isExcludedInSim ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isExcludedInSim ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                          color: isExcludedInSim ? '#f87171' : 'white',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {isExcludedInSim ? '✓ Excluído no Sim' : '🚫 Excluir no Sim'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>
              Nenhuma perda registrada no histórico selecionado.
            </div>
          )}
        </div>

        {/* Grid 2: Matriz de Martingales por Hora */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} style={{ color: '#a78bfa' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>📊 FATOR DE RISCO MARTINGALE POR FAIXA HORÁRIA</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
            {stats.hourlyDetailed.map(h => {
              const totalG = h.totalGales;
              const hasHighRisk = totalG >= 3 || h.gales.G3Plus > 0;
              return (
                <div
                  key={h.hour}
                  style={{
                    background: hasHighRisk ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: hasHighRisk ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '10px',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{String(h.hour).padStart(2, '0')}:00h</strong>
                    <span style={{ fontSize: '0.58rem', color: totalG > 0 ? '#fbbf24' : '#64748b', fontWeight: 'bold' }}>
                      {totalG} gales
                    </span>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'flex', gap: '4px' }}>
                    <span>G1: <strong style={{ color: '#a78bfa' }}>{h.gales.G1 || 0}</strong></span>
                    <span>G2: <strong style={{ color: '#f472b6' }}>{h.gales.G2 || 0}</strong></span>
                    <span>G3+: <strong style={{ color: '#ef4444' }}>{h.gales.G3Plus || 0}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid 3: Ativos Danosos (Ativos com mais Loss) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: '#db2777' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>📉 DIAGNÓSTICO DE ATIVOS (ORDENADO POR MAIOR PREJUÍZO)</h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700 }}>Ativo</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Total Ops</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>WIN / LOSS</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Assertividade</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Gales Disparados</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Resultado Líquido</th>
                  <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Ação Simulador</th>
                </tr>
              </thead>
              <tbody>
                {stats.worstAssets.length > 0 ? (
                  stats.worstAssets.map(a => {
                    const isExcludedInSim = simExcludedAssets.includes(a.symbol);
                    const displayName = a.symbol.startsWith('frx')
                      ? a.symbol.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2')
                      : a.symbol.replace('1HZ', '').replace('V', ' (1s)').replace('R_', 'V');

                    return (
                      <tr key={a.symbol} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '10px 6px', fontWeight: 700, color: '#e2e8f0' }}>{displayName}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{a.trades}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                          <span style={{ color: '#10b981' }}>{a.wins}W</span> / <span style={{ color: '#ef4444' }}>{a.losses}L</span>
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: a.rate >= 60 ? '#10b981' : a.rate >= 45 ? '#fb923c' : '#ef4444', fontFamily: 'monospace' }}>
                          {a.rate.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#a78bfa' }}>
                          {a.totalGales}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800, color: a.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {a.profit >= 0 ? '+' : ''}${a.profit.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              if (isExcludedInSim) {
                                setSimExcludedAssets(prev => prev.filter(s => s !== a.symbol));
                              } else {
                                setSimExcludedAssets(prev => [...prev, a.symbol]);
                                setActiveSubTab('simulator');
                                showToast(`Ativo ${displayName} adicionado ao Simulador!`);
                              }
                            }}
                            style={{
                              background: isExcludedInSim ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isExcludedInSim ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                              color: isExcludedInSim ? '#f87171' : 'white',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.62rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {isExcludedInSim ? '✓ Excluído no Sim' : '🚫 Excluir no Sim'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Sem dados de ativos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // Render Simulator Sub-Tab
  const renderSimulatorView = () => {
    const realStats = stats;
    const simStats = simResult.stats;

    const deltaProfit = simStats.netProfit - realStats.netProfit;
    const deltaWinRate = simStats.winRate - realStats.winRate;
    const deltaDrawdown = realStats.maxDrawdown - simStats.maxDrawdown; // positive = drawdown reduced
    const lossesAvoided = realStats.losses - simStats.losses;
    const tradesRemoved = realStats.totalTrades - simStats.totalTrades;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
        
        {/* Simulator Banner */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 11, 24, 0.5) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={22} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '0.04em' }}>LABORATÓRIO DE SIMULAÇÃO ("E SE...")</h3>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '3px 0 0 0' }}>Filtre horários, ativos e limite níveis de gale para recalcular instantaneamente o resultado da sua banca.</p>
            </div>
          </div>

          <button
            onClick={() => {
              setSimExcludedHours([]);
              setSimExcludedAssets([]);
              setSimMaxGale(null);
              showToast('Filtros de simulação resetados!');
            }}
            style={{
              padding: '0.5rem 0.9rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={13} /> Resetar Filtros
          </button>
        </div>

        {/* Side-by-Side KPI Deltas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          
          {/* Lucro Simulado */}
          <div style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lucro Líquido Simulado</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '1.3rem', color: simStats.netProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                {simStats.netProfit >= 0 ? '+' : ''}${simStats.netProfit.toFixed(2)}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>(Real: ${realStats.netProfit.toFixed(2)})</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: deltaProfit >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {deltaProfit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>Variação: {deltaProfit >= 0 ? '+' : ''}${deltaProfit.toFixed(2)}</span>
            </div>
          </div>

          {/* Winrate Simulado */}
          <div style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Winrate Simulado</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '1.3rem', color: '#a78bfa', fontFamily: 'monospace' }}>
                {simStats.winRate.toFixed(1)}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>(Real: {realStats.winRate.toFixed(1)}%)</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: deltaWinRate >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Delta Assertividade: {deltaWinRate >= 0 ? '+' : ''}{deltaWinRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Drawdown Simulado */}
          <div style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Max Drawdown Simulado</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '1.3rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                {simStats.maxDrawdown.toFixed(1)}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>(Real: {realStats.maxDrawdown.toFixed(1)}%)</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: deltaDrawdown >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Redução de Risco: {deltaDrawdown >= 0 ? '-' : '+'}{Math.abs(deltaDrawdown).toFixed(1)}%</span>
            </div>
          </div>

          {/* Losses Evitados */}
          <div style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Perdas Evitadas</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '1.3rem', color: '#34d399', fontFamily: 'monospace' }}>
                {lossesAvoided} Losses
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>({tradesRemoved} ops filtradas)</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#34d399' }}>
              Operações mantidas: {simStats.totalTrades}
            </div>
          </div>

        </div>

        {/* Simulation Control Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          
          {/* Horários Filter */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} style={{ color: '#38bdf8' }} />
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0 }}>EXCLUIR HORÁRIOS DO DIA</h4>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    const top3 = stats.worstHoursByLoss.slice(0, 3).map(h => h.hour);
                    setSimExcludedHours(top3);
                  }}
                  style={{ padding: '2px 7px', fontSize: '0.58rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  3 Piores
                </button>
                <button
                  onClick={() => setSimExcludedHours([])}
                  style={{ padding: '2px 7px', fontSize: '0.58rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
              {stats.hourlyDetailed.map(h => {
                const isExcluded = simExcludedHours.includes(h.hour);
                return (
                  <button
                    key={h.hour}
                    onClick={() => {
                      if (isExcluded) {
                        setSimExcludedHours(prev => prev.filter(x => x !== h.hour));
                      } else {
                        setSimExcludedHours(prev => [...prev, h.hour]);
                      }
                    }}
                    style={{
                      padding: '4px 2px',
                      borderRadius: '6px',
                      background: isExcluded ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.03)',
                      border: isExcluded ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
                      color: isExcluded ? '#f87171' : '#cbd5e1',
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                    title={`${String(h.hour).padStart(2, '0')}:00h - WR: ${h.rate.toFixed(0)}%`}
                  >
                    {String(h.hour).padStart(2, '0')}h
                    {isExcluded && <span style={{ display: 'block', fontSize: '0.5rem' }}>OFF</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ativos & Martingale Filter */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
            
            {/* Martingale Capping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} style={{ color: '#a78bfa' }} />
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0 }}>LIMITADOR DE NÍVEL DE MARTINGALE</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { value: null, label: 'Todas Ops' },
                  { value: 0, label: 'Apenas G0' },
                  { value: 1, label: 'Máx G1' },
                  { value: 2, label: 'Máx G2' }
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setSimMaxGale(opt.value)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '8px',
                      background: simMaxGale === opt.value ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'rgba(255,255,255,0.03)',
                      border: simMaxGale === opt.value ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.05)',
                      color: simMaxGale === opt.value ? 'white' : '#94a3b8',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assets Exclusion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} style={{ color: '#db2777' }} />
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0 }}>EXCLUIR ATIVOS</h4>
                </div>
                <button
                  onClick={() => {
                    const negAssets = stats.worstAssets.filter(a => a.profit < 0).map(a => a.symbol);
                    setSimExcludedAssets(negAssets);
                  }}
                  style={{ padding: '2px 7px', fontSize: '0.58rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Excluir Negativos
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {stats.assetDetailed.map(a => {
                  const isExcluded = simExcludedAssets.includes(a.symbol);
                  const displayName = a.symbol.startsWith('frx')
                    ? a.symbol.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2')
                    : a.symbol.replace('1HZ', '').replace('V', ' (1s)').replace('R_', 'V');

                  return (
                    <button
                      key={a.symbol}
                      onClick={() => {
                        if (isExcluded) {
                          setSimExcludedAssets(prev => prev.filter(x => x !== a.symbol));
                        } else {
                          setSimExcludedAssets(prev => [...prev, a.symbol]);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isExcluded ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.03)',
                        border: isExcluded ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
                        color: isExcluded ? '#f87171' : '#cbd5e1',
                        fontSize: '0.62rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {displayName} {isExcluded ? '🚫' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Dual Equity Line Chart (Real vs Simulated) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>📈 EVOLUÇÃO PATRIMONIAL DUPLA (REAL VS SIMULADA)</h3>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>Filtros Ativos: {simExcludedHours.length}h excluídas • {simExcludedAssets.length} ativos excluídos</span>
          </div>

          <div style={{ flex: 1, minHeight: '220px' }}>
            {renderSimulatedEquityChart()}
          </div>
        </div>

        {/* Dynamic Optimization Insights Card */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.04) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399', margin: 0, letterSpacing: '0.04em' }}>💡 RECOMENDAÇÃO DE INTELIGÊNCIA OPERACIONAL</h4>
            <p style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px', margin: 0, lineHeight: 1.4 }}>
              {deltaProfit > 0 ? (
                <>
                  Com esta configuração simulada, você <strong>economizaria ${deltaProfit.toFixed(2)}</strong>, aumentaria sua assertividade em <strong>+{deltaWinRate.toFixed(1)}%</strong> e reduziria o drawdown máximo em <strong>{deltaDrawdown.toFixed(1)}%</strong>. 
                  Recomendamos bloquear os ativos/horários filtrados na <strong>Blacklist</strong> do painel principal para as próximas operações reais.
                </>
              ) : (
                <>
                  Ajuste os filtros de horários e ativos acima para testar cenários hipotéticos e descobrir como otimizar a rentabilidade do seu histórico.
                </>
              )}
            </p>
          </div>
        </div>

      </div>
    );
  };

  // Handler for Month View Selector
  const handleMonthSelectChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('archived_')) {
      const reportId = val.replace('archived_', '');
      const found = monthlyReports.find(r => r.id === reportId);
      if (found) {
        setViewingArchivedReport(found);
      }
    } else {
      setViewingArchivedReport(null);
      setSelectedMonth(val);
    }
  };

  // Load archived report direct action
  const handleLoadArchivedReport = (report) => {
    setViewingArchivedReport(report);
    setCompareMode(false);
    showToast(`Visualizando arquivo: ${report.monthLabel}`);
  };

  // Save current month to database
  const handleSaveCurrentMonth = () => {
    if (selectedMonth === 'all') return;
    if (filteredTrades.length === 0) {
      showToast('Sem operações para salvar no mês selecionado.', 'error');
      return;
    }
    const report = {
      id: selectedMonth,
      monthLabel: getMonthLabel(selectedMonth),
      stats: stats,
      trades: filteredTrades
    };
    const updated = saveMonthlyReport(report, isDemo);
    setMonthlyReports(updated);
    showToast(`Relatório de ${report.monthLabel} salvo com sucesso!`);
  };

  // Delete saved month from database
  const handleDeleteSavedMonth = (id, label) => {
    if (confirm(`Tem certeza de que deseja apagar permanentemente o arquivo de ${label}?`)) {
      const updated = deleteMonthlyReport(id, isDemo);
      setMonthlyReports(updated);
      if (viewingArchivedReport && viewingArchivedReport.id === id) {
        setViewingArchivedReport(null);
        setSelectedMonth('all');
      }
      showToast(`Relatório de ${label} excluído do banco.`);
    }
  };

  // Get statistics for comparison
  const statsA = useMemo(() => {
    if (!compareMonthA) return null;
    if (compareMonthA.startsWith('archived_')) {
      const id = compareMonthA.replace('archived_', '');
      const found = monthlyReports.find(r => r.id === id);
      return found ? found.stats : null;
    }
    if (compareMonthA === 'all') {
      return calculateStats(dbTrades);
    }
    const filtered = dbTrades.filter(t => {
      const ts = t.timestamp || (t.epoch * 1000);
      return ts && getMonthKey(ts) === compareMonthA;
    });
    return calculateStats(filtered);
  }, [compareMonthA, dbTrades, monthlyReports]);

  const statsB = useMemo(() => {
    if (!compareMonthB) return null;
    if (compareMonthB.startsWith('archived_')) {
      const id = compareMonthB.replace('archived_', '');
      const found = monthlyReports.find(r => r.id === id);
      return found ? found.stats : null;
    }
    if (compareMonthB === 'all') {
      return calculateStats(dbTrades);
    }
    const filtered = dbTrades.filter(t => {
      const ts = t.timestamp || (t.epoch * 1000);
      return ts && getMonthKey(ts) === compareMonthB;
    });
    return calculateStats(filtered);
  }, [compareMonthB, dbTrades, monthlyReports]);

  const getMonthDisplayName = (key) => {
    if (!key) return '';
    if (key === 'all') return 'Todos os Meses (Ativo)';
    if (key.startsWith('archived_')) {
      const id = key.replace('archived_', '');
      const found = monthlyReports.find(r => r.id === id);
      return found ? `📁 ${found.monthLabel} (Salvo)` : 'Arquivo';
    }
    return getMonthLabel(key);
  };

  // Heatmap Color Generator (intensity based on winrate)
  const getHeatmapColor = (rate, total) => {
    if (total === 0) return 'rgba(255, 255, 255, 0.02)';
    if (rate >= 70) return 'rgba(16, 185, 129, 0.25)'; // deep emerald
    if (rate >= 55) return 'rgba(124, 58, 237, 0.22)'; // neon purple
    if (rate >= 45) return 'rgba(245, 158, 11, 0.18)'; // deep orange
    return 'rgba(239, 68, 68, 0.18)'; // deep crimson
  };

  const getHeatmapTextColor = (rate, total) => {
    if (total === 0) return '#475569';
    if (rate >= 70) return '#10b981';
    if (rate >= 55) return '#a78bfa';
    if (rate >= 45) return '#fb923c';
    return '#f87171';
  };

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Advanced Interactive Equity SVG Line Chart
  const renderEquityChart = () => {
    const rawCurve = stats.equityCurve || [];

    if (rawCurve.length < 2) {
      return (
        <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '0.5rem', background: 'rgba(9, 9, 15, 0.4)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.06)' }}>
          <Activity size={28} style={{ opacity: 0.3, color: '#a78bfa' }} />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Requer pelo menos 2 operações executadas para gerar a curva patrimonial.</span>
        </div>
      );
    }

    // Apply Zoom Filter
    const activeCurve = equityZoom === 'all' ? rawCurve : rawCurve.slice(-parseInt(equityZoom));

    const width = 800;
    const height = 240;
    const padding = { top: 30, right: 40, bottom: 35, left: 55 };

    const values = activeCurve.map(c => c.value);
    const minVal = Math.min(0, ...values) - 4;
    const maxVal = Math.max(10, ...values) + 4;
    const valRange = maxVal - minVal || 1;

    // Highest Peak & Lowest Point
    let peakPoint = activeCurve[0];
    let lowestPoint = activeCurve[0];

    activeCurve.forEach(pt => {
      if (pt.value > peakPoint.value) peakPoint = pt;
      if (pt.value < lowestPoint.value) lowestPoint = pt;
    });

    // Compute Canvas Points
    const chartPoints = activeCurve.map((d, index) => {
      const x = padding.left + (index / Math.max(1, activeCurve.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((d.value - minVal) / valRange) * (height - padding.top - padding.bottom);
      return { x, y, data: d, index };
    });

    const pathString = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const zeroLineY = height - padding.bottom - ((0 - minVal) / valRange) * (height - padding.top - padding.bottom);

    // Peak and Lowest Y
    const peakCanvasY = height - padding.bottom - ((peakPoint.value - minVal) / valRange) * (height - padding.top - padding.bottom);
    const peakCanvasX = padding.left + (activeCurve.findIndex(p => p === peakPoint) / Math.max(1, activeCurve.length - 1)) * (width - padding.left - padding.right);

    // Mouse Movement Handler for Crosshair and Tooltip
    const handleMouseMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const svgMouseX = (mouseX / rect.width) * width;

      // Find closest point by X coordinate
      let closest = chartPoints[0];
      let minDistance = Math.abs(chartPoints[0].x - svgMouseX);

      for (let i = 1; i < chartPoints.length; i++) {
        const dist = Math.abs(chartPoints[i].x - svgMouseX);
        if (dist < minDistance) {
          minDistance = dist;
          closest = chartPoints[i];
        }
      }

      setHoveredEquityPoint(closest);
    };

    const handleMouseLeave = () => {
      setHoveredEquityPoint(null);
    };

    const isPositiveTotal = (activeCurve[activeCurve.length - 1]?.value || 0) >= 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
        
        {/* Top Control Bar & High-Level Metrics */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(9, 9, 15, 0.4)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          
          {/* Quick Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Maior Pico (ATH)</span>
              <strong style={{ fontSize: '0.88rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>+${peakPoint.value.toFixed(2)}</strong>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '1rem' }}>
              <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Saldo Atual</span>
              <strong style={{ fontSize: '0.88rem', color: isPositiveTotal ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {isPositiveTotal ? '+' : ''}${activeCurve[activeCurve.length - 1]?.value.toFixed(2)}
              </strong>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '1rem' }}>
              <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Max Drawdown</span>
              <strong style={{ fontSize: '0.88rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{stats.maxDrawdown.toFixed(1)}%</strong>
            </div>
          </div>

          {/* Zoom Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold', padding: '0 6px' }}>Exibir:</span>
            {[
              { id: 'all', label: `Todos (${rawCurve.length})` },
              { id: '20', label: '20 Ops' },
              { id: '50', label: '50 Ops' },
              { id: '100', label: '100 Ops' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setEquityZoom(btn.id)}
                style={{
                  background: equityZoom === btn.id ? 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)' : 'transparent',
                  color: equityZoom === btn.id ? 'white' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 9px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>

        {/* SVG Container with Interactive Overlay */}
        <div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ position: 'relative', width: '100%', minHeight: '240px', cursor: 'crosshair', userSelect: 'none' }}
        >
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="equityPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="equityLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Reference Grid Lines */}
            <line x1={padding.left} y1={zeroLineY} x2={width - padding.right} y2={zeroLineY} stroke="rgba(255,255,255,0.12)" strokeDasharray="4,4" />
            <text x={padding.left - 8} y={zeroLineY + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">$0.00</text>

            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="rgba(255,255,255,0.04)" />
            <text x={padding.left - 8} y={padding.top + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">+${maxVal.toFixed(0)}</text>

            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(255,255,255,0.04)" />
            <text x={padding.left - 8} y={height - padding.bottom + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">${minVal.toFixed(0)}</text>

            {/* Peak ATH Line */}
            {peakPoint && (
              <>
                <line x1={padding.left} y1={peakCanvasY} x2={width - padding.right} y2={peakCanvasY} stroke="rgba(16, 185, 129, 0.25)" strokeDasharray="2,2" />
                <rect x={width - padding.right - 65} y={peakCanvasY - 9} width="65" height="15" rx="4" fill="rgba(16, 185, 129, 0.2)" stroke="rgba(16, 185, 129, 0.4)" />
                <text x={width - padding.right - 32} y={peakCanvasY + 2} fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">🏆 PICO ATH</text>
              </>
            )}

            {/* Fill Area below line */}
            <path
              d={`M ${padding.left},${height - padding.bottom} L ${pathString.replace('M ', '')} L ${width - padding.right},${height - padding.bottom} Z`}
              fill="url(#equityPositiveGrad)"
            />

            {/* Main Equity Path Line */}
            <path
              d={pathString}
              fill="none"
              stroke="url(#equityLineGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* ATH Peak Marker Dot */}
            {peakPoint && (
              <g>
                <circle cx={peakCanvasX} cy={peakCanvasY} r="5" fill="#10b981" opacity="0.4" className="ping" />
                <circle cx={peakCanvasX} cy={peakCanvasY} r="3" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
              </g>
            )}

            {/* Endpoint Indicator */}
            {chartPoints.length > 0 && (() => {
              const lastPt = chartPoints[chartPoints.length - 1];
              return (
                <g>
                  <circle cx={lastPt.x} cy={lastPt.y} r="6" fill="#a78bfa" opacity="0.3" className="ping" />
                  <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
                </g>
              );
            })()}

            {/* Interactive Crosshairs & Selected Point Highlight */}
            {hoveredEquityPoint && (
              <g>
                {/* Vertical Crosshair Line */}
                <line
                  x1={hoveredEquityPoint.x}
                  y1={padding.top}
                  x2={hoveredEquityPoint.x}
                  y2={height - padding.bottom}
                  stroke="rgba(167, 139, 250, 0.5)"
                  strokeDasharray="3,3"
                  strokeWidth="1.2"
                />

                {/* Horizontal Crosshair Line */}
                <line
                  x1={padding.left}
                  y1={hoveredEquityPoint.y}
                  x2={width - padding.right}
                  y2={hoveredEquityPoint.y}
                  stroke="rgba(167, 139, 250, 0.5)"
                  strokeDasharray="3,3"
                  strokeWidth="1.2"
                />

                {/* Pulsing Active Circle */}
                <circle
                  cx={hoveredEquityPoint.x}
                  cy={hoveredEquityPoint.y}
                  r="8"
                  fill="rgba(167, 139, 250, 0.3)"
                  className="ping"
                />
                <circle
                  cx={hoveredEquityPoint.x}
                  cy={hoveredEquityPoint.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>

          {/* Rich Floating Tooltip Card */}
          {hoveredEquityPoint && (
            <div style={{
              position: 'absolute',
              top: Math.max(10, Math.min(140, (hoveredEquityPoint.y / height) * 240 - 70)),
              left: hoveredEquityPoint.x > width / 2 
                ? `${(hoveredEquityPoint.x / width) * 100 - 32}%` 
                : `${(hoveredEquityPoint.x / width) * 100 + 4}%`,
              background: 'rgba(10, 8, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              color: 'white',
              boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
              zIndex: 50,
              pointerEvents: 'none',
              minWidth: '210px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '5px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold' }}>
                  Op nº {hoveredEquityPoint.data.tradeIndex} • {hoveredEquityPoint.data.time}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: hoveredEquityPoint.data.result === 'WIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: hoveredEquityPoint.data.result === 'WIN' ? '#10b981' : '#ef4444',
                  border: `1px solid ${hoveredEquityPoint.data.result === 'WIN' ? '#10b981' : '#ef4444'}`
                }}>
                  {hoveredEquityPoint.data.result} ({hoveredEquityPoint.data.profit >= 0 ? '+' : ''}${hoveredEquityPoint.data.profit})
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.72rem', marginTop: '2px' }}>
                <div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Saldo Acumulado</span>
                  <strong style={{ color: hoveredEquityPoint.data.value >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                    {hoveredEquityPoint.data.value >= 0 ? '+' : ''}${hoveredEquityPoint.data.value.toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>Drawdown do Pico</span>
                  <strong style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    {hoveredEquityPoint.data.drawdown}%
                  </strong>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '4px', fontSize: '0.65rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>🤖 <strong>Estratégia:</strong> {hoveredEquityPoint.data.strategyName} {hoveredEquityPoint.data.galeLevel > 0 && `(Gale ${hoveredEquityPoint.data.galeLevel})`}</div>
                <div>📊 <strong>Ativo:</strong> {hoveredEquityPoint.data.symbol}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  };

  // Export handlers
  const handleExportCSV = () => {
    if (displayedTrades.length === 0) return;
    const headers = ['Data/Hora', 'Timestamp', 'Ativo', 'Contrato', 'Entrada', 'Gale', 'Lucro', 'Resultado', 'Estratégia'];
    const rows = displayedTrades.map(t => [
      t.time || new Date(t.timestamp || t.epoch * 1000).toLocaleString(),
      t.timestamp || t.epoch * 1000,
      t.symbol,
      t.contractType,
      t.stake,
      t.galeLevel,
      t.profit,
      t.result,
      t.strategyName
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `astrobot_trade_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (displayedTrades.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayedTrades, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `astrobot_trade_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Comparison Card Helper
  const renderCompareCard = (title, valA, valB, formatType) => {
    let diff = 0;
    let diffPercent = 0;
    let diffText = '';
    let color = '#94a3b8'; // neutral

    const numA = parseFloat(valA) || 0;
    const numB = parseFloat(valB) || 0;

    if (formatType === 'currency') {
      diff = numB - numA;
      diffPercent = numA !== 0 ? (diff / Math.abs(numA)) * 100 : 0;
      diffText = `${diff >= 0 ? '+' : ''}${formatCurrency(diff)} (${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`;
      color = diff >= 0 ? '#10b981' : '#ef4444';
    } else if (formatType === 'percent') {
      diff = numB - numA;
      diffText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
      color = diff >= 0 ? '#10b981' : '#ef4444';
    } else if (formatType === 'count') {
      diff = numB - numA;
      diffPercent = numA !== 0 ? (diff / numA) * 100 : 0;
      diffText = `${diff >= 0 ? '+' : ''}${diff} (${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`;
      color = diff >= 0 ? '#10b981' : '#ef4444';
    } else if (formatType === 'drawdown') {
      diff = numB - numA;
      diffText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
      color = diff <= 0 ? '#10b981' : '#ef4444'; // Lower is better
    }

    const displayValA = formatType === 'currency' ? formatCurrency(numA) 
                     : formatType === 'percent' ? `${numA.toFixed(1)}%` 
                     : numA;
    const displayValB = formatType === 'currency' ? formatCurrency(numB) 
                     : formatType === 'percent' ? `${numB.toFixed(1)}%` 
                     : numB;

    return (
      <div style={{
        padding: '1.25rem',
        background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.45) 0%, rgba(255, 255, 255, 0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block' }}>Período A</span>
            <strong style={{ fontSize: '1rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{displayValA}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block' }}>Período B</span>
            <strong style={{ fontSize: '1.05rem', color: '#ffffff', fontFamily: 'monospace' }}>{displayValB}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 'bold', color: color }}>
          {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>Delta: {diffText}</span>
        </div>
      </div>
    );
  };

  // RENDER COMPARISON MODE SCREEN
  if (compareMode) {
    const allStrats = Array.from(new Set([
      ...Object.keys(statsA?.strategyStats || {}),
      ...Object.keys(statsB?.strategyStats || {})
    ]));

    const allAssets = Array.from(new Set([
      ...Object.keys(statsA?.assetStats || {}),
      ...Object.keys(statsB?.assetStats || {})
    ]));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: 'white' }}>
        
        {/* Comparison Header */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          background: 'rgba(14, 11, 24, 0.45)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCompareMode(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Voltar aos Relatórios
            </button>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#a78bfa' }}>📊 COMPARADOR DE DESEMPENHO MENSAL</h3>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Period A Select */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#94a3b8' }}>SELECIONAR PERÍODO A</span>
              <select
                value={compareMonthA}
                onChange={(e) => setCompareMonthA(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <option value="">-- Selecione o Período A --</option>
                <option value="all">Todos os Meses (Ativo)</option>
                {activeMonths.map(m => (
                  <option key={m} value={m}>{getMonthLabel(m)}</option>
                ))}
                {monthlyReports.map(r => (
                  <option key={r.id} value={`archived_${r.id}`}>📁 {r.monthLabel} (Salvo)</option>
                ))}
              </select>
            </div>

            {/* Period B Select */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#94a3b8' }}>SELECIONAR PERÍODO B</span>
              <select
                value={compareMonthB}
                onChange={(e) => setCompareMonthB(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <option value="">-- Selecione o Período B --</option>
                <option value="all">Todos os Meses (Ativo)</option>
                {activeMonths.map(m => (
                  <option key={m} value={m}>{getMonthLabel(m)}</option>
                ))}
                {monthlyReports.map(r => (
                  <option key={r.id} value={`archived_${r.id}`}>📁 {r.monthLabel} (Salvo)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Grid Results */}
        {statsA && statsB ? (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {renderCompareCard('Lucro Líquido', statsA.netProfit, statsB.netProfit, 'currency')}
              {renderCompareCard('Assertividade', statsA.winRate, statsB.winRate, 'percent')}
              {renderCompareCard('Volume Operado', statsA.totalStake, statsB.totalStake, 'currency')}
              {renderCompareCard('Total Operações', statsA.totalTrades, statsB.totalTrades, 'count')}
              {renderCompareCard('Retorno ROI', statsA.roi, statsB.roi, 'percent')}
              {renderCompareCard('Max Rebaixamento', statsA.maxDrawdown, statsB.maxDrawdown, 'drawdown')}
              {renderCompareCard('Max Sequência Wins', statsA.winStreak, statsB.winStreak, 'count')}
              {renderCompareCard('Max Sequência Losses', statsA.lossStreak, statsB.lossStreak, 'count')}
            </div>

            {/* Strategy & Asset Comparison side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              
              {/* Strategy comparison table */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={16} style={{ color: '#db2777' }} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>COMPARAÇÃO DE ESTRATÉGIAS</h3>
                </div>
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700 }}>Estratégia</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período A</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Lucro A</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período B</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Lucro B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStrats.length > 0 ? (
                        allStrats.map(name => {
                          const dataA = statsA.strategyStats[name] || { trades: 0, wins: 0, profit: 0 };
                          const dataB = statsB.strategyStats[name] || { trades: 0, wins: 0, profit: 0 };
                          const wrA = dataA.trades > 0 ? (dataA.wins / dataA.trades) * 100 : 0;
                          const wrB = dataB.trades > 0 ? (dataB.wins / dataB.trades) * 100 : 0;
                          return (
                            <tr key={name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <td style={{ padding: '10px 4px', fontWeight: 700, color: '#e2e8f0' }}>{name}</td>
                              <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>
                                {dataA.trades} ops ({wrA.toFixed(0)}%)
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 800, color: dataA.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                ${dataA.profit.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'monospace', color: '#cbd5e1' }}>
                                {dataB.trades} ops ({wrB.toFixed(0)}%)
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 800, color: dataB.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                ${dataB.profit.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>Sem dados de estratégias no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Asset comparison table */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={16} style={{ color: '#a78bfa' }} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>COMPARAÇÃO DE ATIVOS</h3>
                </div>
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700 }}>Ativo</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período A</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Lucro A</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período B</th>
                        <th style={{ padding: '8px 4px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Lucro B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAssets.length > 0 ? (
                        allAssets.map(symbol => {
                          const dataA = statsA.assetStats[symbol] || { trades: 0, wins: 0, profit: 0 };
                          const dataB = statsB.assetStats[symbol] || { trades: 0, wins: 0, profit: 0 };
                          const wrA = dataA.trades > 0 ? (dataA.wins / dataA.trades) * 100 : 0;
                          const wrB = dataB.trades > 0 ? (dataB.wins / dataB.trades) * 100 : 0;

                          const displayName = symbol.startsWith('frx')
                            ? symbol.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2')
                            : symbol.replace('1HZ', '').replace('V', ' (1s)').replace('R_', 'V');

                          return (
                            <tr key={symbol} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <td style={{ padding: '10px 4px', fontWeight: 700, color: '#e2e8f0' }}>{displayName}</td>
                              <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>
                                {dataA.trades} ops ({wrA.toFixed(0)}%)
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 800, color: dataA.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                ${dataA.profit.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'monospace', color: '#cbd5e1' }}>
                                {dataB.trades} ops ({wrB.toFixed(0)}%)
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 800, color: dataB.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                ${dataB.profit.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>Sem dados de ativos no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Martingale comparison block */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={16} style={{ color: '#a78bfa' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>COMPARAÇÃO DE DISTRIBUIÇÃO MARTINGALE</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700 }}>Nível Martingale</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período A (WINs)</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Período B (WINs)</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const listA = getMartingaleLevelsList(statsA.martingaleDist);
                      const listB = getMartingaleLevelsList(statsB.martingaleDist);
                      const allLevelsMap = {};
                      listA.forEach(item => { allLevelsMap[item.level] = { label: item.label, countA: item.count, countB: 0 }; });
                      listB.forEach(item => {
                        if (!allLevelsMap[item.level]) {
                          allLevelsMap[item.level] = { label: item.label, countA: 0, countB: item.count };
                        } else {
                          allLevelsMap[item.level].countB = item.count;
                        }
                      });
                      const sortedLevels = Object.keys(allLevelsMap).map(Number).sort((a, b) => a - b);
                      if (sortedLevels.length === 0) {
                        return (
                          <tr><td colSpan="4" style={{ textAlign: 'center', color: '#475569', padding: '1.5rem' }}>Sem dados de martingale no período.</td></tr>
                        );
                      }
                      return sortedLevels.map(lvl => {
                        const item = allLevelsMap[lvl];
                        const pctA = statsA.wins > 0 ? (item.countA / statsA.wins) * 100 : 0;
                        const pctB = statsB.wins > 0 ? (item.countB / statsB.wins) * 100 : 0;
                        const diffCount = item.countB - item.countA;
                        const textColor = getGaleTextColor(lvl);
                        return (
                          <tr key={lvl} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                            <td style={{ padding: '10px 6px', fontWeight: 700, color: textColor }}>{item.label}</td>
                            <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#cbd5e1' }}>
                              {item.countA} WINs ({pctA.toFixed(1)}%)
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#ffffff' }}>
                              {item.countB} WINs ({pctB.toFixed(1)}%)
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800, color: diffCount >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                              {diffCount >= 0 ? '+' : ''}{diffCount} WINs
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Scale size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
            <h4 style={{ color: 'white', marginBottom: '0.4rem' }}>Aguardando Seleção de Períodos</h4>
            <p style={{ fontSize: '0.75rem' }}>Selecione o Período A e o Período B nos seletores acima para calcular a comparação em tempo real.</p>
          </div>
        )}
      </div>
    );
  }

  // STANDARD VIEW RENDER
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: 'white', position: 'relative' }}>
      
      {/* Toast Alert Feedback */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Monthly Manager Bar */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        background: 'rgba(14, 11, 24, 0.5)',
        border: '1px solid rgba(139, 92, 246, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>GERENCIADOR DE RELATÓRIOS MENSAL</h3>
              <p style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px', margin: 0 }}>Filtre suas operações por mês, compare períodos e salve snapshots no banco de dados.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* View Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8' }}>Período:</span>
              <select
                value={viewingArchivedReport ? `archived_${viewingArchivedReport.id}` : selectedMonth}
                onChange={handleMonthSelectChange}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <optgroup label="Histórico de Trades Ativos">
                  <option value="all">Todos os Meses</option>
                  {activeMonths.map(m => (
                    <option key={m} value={m}>{getMonthLabel(m)}</option>
                  ))}
                </optgroup>
                {monthlyReports.length > 0 && (
                  <optgroup label="Arquivos Salvos no Banco">
                    {monthlyReports.map(r => (
                      <option key={r.id} value={`archived_${r.id}`}>📁 {r.monthLabel} (Salvo)</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Save Current Month Button */}
            {!viewingArchivedReport && selectedMonth !== 'all' && (
              <button
                onClick={handleSaveCurrentMonth}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  color: '#34d399',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                <Save size={13} /> Salvar Mês no Banco
              </button>
            )}

            {/* Compare Button */}
            <button
              onClick={() => {
                setCompareMonthA('all');
                setCompareMonthB(monthlyReports[0] ? `archived_${monthlyReports[0].id}` : '');
                setCompareMode(true);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(124, 58, 237, 0.12)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
                color: '#a78bfa',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Scale size={13} /> Comparar Meses
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setActiveSubTab('overview'); setCompareMode(false); }}
              style={{
                background: activeSubTab === 'overview' && !compareMode ? 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.03)',
                color: activeSubTab === 'overview' && !compareMode ? 'white' : '#94a3b8',
                border: activeSubTab === 'overview' && !compareMode ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <BarChart2 size={14} /> 📊 Visão Geral
            </button>

            <button
              onClick={() => { setActiveSubTab('risk'); setCompareMode(false); }}
              style={{
                background: activeSubTab === 'risk' && !compareMode ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'rgba(255,255,255,0.03)',
                color: activeSubTab === 'risk' && !compareMode ? 'white' : '#94a3b8',
                border: activeSubTab === 'risk' && !compareMode ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <ShieldAlert size={14} /> 🔍 Análise Avançada de Risco
            </button>

            <button
              onClick={() => { setActiveSubTab('simulator'); setCompareMode(false); }}
              style={{
                background: activeSubTab === 'simulator' && !compareMode ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : 'rgba(255,255,255,0.03)',
                color: activeSubTab === 'simulator' && !compareMode ? 'white' : '#94a3b8',
                border: activeSubTab === 'simulator' && !compareMode ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Sliders size={14} /> 🧪 Simulador "E Se..."
            </button>

            <button
              onClick={() => {
                setActiveSubTab('compare');
                setCompareMonthA('all');
                setCompareMonthB(monthlyReports[0] ? `archived_${monthlyReports[0].id}` : '');
                setCompareMode(true);
              }}
              style={{
                background: compareMode || activeSubTab === 'compare' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'rgba(255,255,255,0.03)',
                color: compareMode || activeSubTab === 'compare' ? 'white' : '#94a3b8',
                border: compareMode || activeSubTab === 'compare' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Scale size={14} /> ⚔️ Comparar Meses
            </button>
          </div>
        </div>

        {/* Saved Months Horizontal/Grid List */}
        {monthlyReports.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Meses Arquivados no Banco de Dados ({monthlyReports.length})
            </span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '0.65rem'
            }}>
              {monthlyReports.map(r => {
                const profit = r.stats.netProfit || 0;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: viewingArchivedReport && viewingArchivedReport.id === r.id 
                        ? '1px solid rgba(167, 139, 250, 0.4)' 
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.72rem', color: '#f1f5f9', display: 'block' }}>📁 {r.monthLabel}</strong>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '3px', fontSize: '0.62rem' }}>
                        <span style={{ color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>
                          {r.stats.winRate.toFixed(0)}% WR
                        </span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span style={{ color: '#cbd5e1' }}>
                          {r.stats.totalTrades} ops
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleLoadArchivedReport(r)}
                        style={{
                          background: 'rgba(167, 139, 250, 0.1)',
                          border: '1px solid rgba(167, 139, 250, 0.25)',
                          borderRadius: '6px',
                          color: '#c084fc',
                          padding: '0.3rem 0.5rem',
                          fontSize: '0.6rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => handleDeleteSavedMonth(r.id, r.monthLabel)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          color: '#f87171',
                          padding: '0.3rem 0.5rem',
                          fontSize: '0.6rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Archived Mode Banner Indicator */}
      {viewingArchivedReport && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'linear-gradient(90deg, rgba(167, 139, 250, 0.12) 0%, rgba(139, 92, 246, 0.03) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#cbd5e1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} style={{ color: '#a78bfa' }} />
            <span>
              Você está visualizando o relatório arquivado de <strong>{viewingArchivedReport.monthLabel}</strong> (salvo em {new Date(viewingArchivedReport.createdAt).toLocaleDateString()}).
            </span>
          </div>
          <button
            onClick={() => {
              setViewingArchivedReport(null);
              setSelectedMonth('all');
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Voltar aos Dados Ativos
          </button>
        </div>
      )}

      {/* Tip for empty Saved Months */}
      {monthlyReports.length === 0 && selectedMonth !== 'all' && (
        <div style={{
          padding: '0.65rem 1rem',
          background: 'rgba(139, 92, 246, 0.04)',
          border: '1px dashed rgba(139, 92, 246, 0.18)',
          borderRadius: '10px',
          fontSize: '0.65rem',
          color: '#a78bfa',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>💡 <strong>Dica:</strong> Gostou dos resultados deste mês? Clique no botão <strong>"Salvar Mês no Banco"</strong> acima para arquivar e comparar mais tarde.</span>
        </div>
      )}

      {/* Sub-Tab Content Rendering */}
      {activeSubTab === 'risk' && renderRiskAnalysisView()}
      {activeSubTab === 'simulator' && renderSimulatorView()}
      {activeSubTab === 'overview' && (
        <>
          {/* Upper Widgets (Time period metrics) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            {/* Lucro Diário */}
            <div style={{
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.45) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lucro Diário (24h)</span>
                <strong style={{ fontSize: '1.2rem', color: stats.dailyProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>
                  {stats.dailyProfit >= 0 ? '+' : ''}{formatCurrency(stats.dailyProfit)}
                </strong>
              </div>
              <div style={{ background: stats.dailyProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '0.55rem', borderRadius: '10px', border: `1px solid ${stats.dailyProfit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <Calendar size={18} style={{ color: stats.dailyProfit >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
            </div>

            {/* Lucro Semanal */}
            <div style={{
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.45) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lucro Semanal (7d)</span>
                <strong style={{ fontSize: '1.2rem', color: stats.weeklyProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>
                  {stats.weeklyProfit >= 0 ? '+' : ''}{formatCurrency(stats.weeklyProfit)}
                </strong>
              </div>
              <div style={{ background: stats.weeklyProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '0.55rem', borderRadius: '10px', border: `1px solid ${stats.weeklyProfit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <Activity size={18} style={{ color: stats.weeklyProfit >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
            </div>

            {/* Lucro Mensal */}
            <div style={{
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.45) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lucro Mensal (30d)</span>
                <strong style={{ fontSize: '1.2rem', color: stats.monthlyProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>
                  {stats.monthlyProfit >= 0 ? '+' : ''}{formatCurrency(stats.monthlyProfit)}
                </strong>
              </div>
              <div style={{ background: stats.monthlyProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '0.55rem', borderRadius: '10px', border: `1px solid ${stats.monthlyProfit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <TrendingUp size={18} style={{ color: stats.monthlyProfit >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
            </div>

            {/* ROI & Drawdown */}
            <div style={{
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.45) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ROI Geral</span>
                <strong style={{ fontSize: '1.2rem', color: stats.roi >= 0 ? '#a78bfa' : '#ef4444', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>
                  {stats.roi.toFixed(1)}%
                </strong>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1rem', flex: 1 }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rebaixamento</span>
                <strong style={{ fontSize: '1.2rem', color: '#e2e8f0', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>
                  {stats.maxDrawdown.toFixed(1)}%
                </strong>
              </div>
            </div>

          </div>

          {/* Middle Block (Charts / Visualizations) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
            
            {/* Equity Line Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} style={{ color: '#a78bfa' }} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>EVOLUÇÃO PATRIMONIAL (EQUITY CURVE)</h3>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#475569' }}>Ordens no Período: {stats.totalTrades}</span>
              </div>
              <div style={{ flex: 1, minHeight: '180px' }}>
                {renderEquityChart()}
              </div>
            </div>

            {/* Circular Assertiveness & Streaks */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              {/* Gauge */}
              <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.02)"
                    strokeWidth="3.2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#radialGlow)"
                    strokeWidth="3.2"
                    strokeDasharray={`${stats.winRate}, 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="radialGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', lineHeight: '1', color: '#ffffff' }}>
                    {stats.winRate.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: '0.45rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '3px' }}>
                    Acertos
                  </span>
                </div>
              </div>

              {/* Streak Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem', letterSpacing: '0.04em', margin: 0 }}>TAXA DE ASSERTIVIDADE</h3>
                  <p style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.3, margin: 0 }}>
                    <strong style={{ color: '#10b981' }}>{stats.wins}W</strong> e <strong style={{ color: '#ef4444' }}>{stats.losses}L</strong> de {stats.totalTrades} operações.
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                  <div>
                    <span style={{ fontSize: '0.52rem', color: '#64748b', display: 'block', fontWeight: 800, letterSpacing: '0.04em' }}>MAX WIN STREAK</span>
                    <strong style={{ fontSize: '0.85rem', color: '#10b981', fontFamily: 'monospace' }}>{stats.winStreak} consecutivas</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.52rem', color: '#64748b', display: 'block', fontWeight: 800, letterSpacing: '0.04em' }}>MAX LOSS STREAK</span>
                    <strong style={{ fontSize: '0.85rem', color: '#ef4444', fontFamily: 'monospace' }}>{stats.lossStreak} consecutivas</strong>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Heatmaps & Martingale Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
            
            {/* Heatmaps Block (Hours & Days) */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} style={{ color: '#a78bfa' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>MAPA DE OPERAÇÕES LUCRATIVAS</h3>
              </div>

              {/* Hourly Heatmap Row */}
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>ASSERTIVIDADE POR HORA DO DIA (00h - 23h)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px' }}>
                  {stats.hourlyWinrates.map((item, idx) => {
                    const color = getHeatmapColor(item.rate, item.total);
                    const txtColor = getHeatmapTextColor(item.rate, item.total);
                    return (
                      <div
                        key={idx}
                        style={{
                          height: '24px',
                          borderRadius: '4px',
                          background: color,
                          border: item.total > 0 ? `1px solid ${txtColor}33` : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.55rem',
                          fontWeight: 'bold',
                          color: txtColor,
                          cursor: 'default'
                        }}
                        title={`Hora: ${String(idx).padStart(2, '0')}:00h | Assertividade: ${item.rate.toFixed(1)}% (${item.wins}/${item.total})`}
                      >
                        {idx}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Heatmap Row */}
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>ASSERTIVIDADE POR DIA DA SEMANA</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {stats.dailyWinrates.map((item, idx) => {
                    const color = getHeatmapColor(item.rate, item.total);
                    const txtColor = getHeatmapTextColor(item.rate, item.total);
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: color,
                          border: item.total > 0 ? `1px solid ${txtColor}33` : '1px solid rgba(255,255,255,0.02)',
                          textAlign: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: item.total > 0 ? '#e2e8f0' : '#475569',
                          cursor: 'default'
                        }}
                        title={`Dia: ${weekdays[idx]} | Assertividade: ${item.rate.toFixed(1)}% (${item.wins}/${item.total})`}
                      >
                        <span style={{ color: item.total > 0 ? '#ffffff' : '#475569', display: 'block' }}>{weekdays[idx]}</span>
                        <span style={{ fontSize: '0.58rem', display: 'block', color: txtColor, marginTop: 2, fontFamily: 'monospace' }}>
                          {item.total > 0 ? `${item.rate.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Martingale Distribution Bar Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart2 size={16} style={{ color: '#a78bfa' }} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>DISTRIBUIÇÃO DE RECUPERAÇÃO (MARTINGALE)</h3>
                </div>
                {(() => {
                  const totalGaleWins = stats.wins - (stats.martingaleDist?.G0 || 0);
                  const galeWinPct = stats.wins > 0 ? ((totalGaleWins / stats.wins) * 100).toFixed(0) : 0;
                  return (
                    <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                      Recuperação Gale: {totalGaleWins} WINs ({galeWinPct}%)
                    </span>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }} className="modules-scrollbar">
                {getMartingaleLevelsList(stats.martingaleDist).map((lvlItem) => {
                  const pct = stats.wins > 0 ? (lvlItem.count / stats.wins) * 100 : 0;
                  const textColor = getGaleTextColor(lvlItem.level);
                  const gradient = getGaleGradient(lvlItem.level);

                  return (
                    <div key={lvlItem.level}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#cbd5e1' }}>{lvlItem.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.62rem', color: '#64748b' }}>({pct.toFixed(1)}%)</span>
                          <strong style={{ fontFamily: 'monospace', color: textColor, fontSize: '0.75rem' }}>{lvlItem.count} WINs</strong>
                        </div>
                      </div>
                      <div style={{ height: '7px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: gradient, 
                            borderRadius: '99px', 
                            transition: 'width 0.4s ease' 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Strategy & Asset Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            
            {/* Strategy Table */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={16} style={{ color: '#db2777' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ESTRATÉGIAS MAIS LUCRATIVAS</h3>
              </div>
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700 }}>Estratégia</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Winrate</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(stats.strategyStats).length > 0 ? (
                      Object.entries(stats.strategyStats)
                        .sort((a, b) => b[1].profit - a[1].profit)
                        .map(([name, data]) => {
                          const wr = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
                          return (
                            <tr key={name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 700, color: '#e2e8f0' }}>{name}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{data.trades}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: wr >= 65 ? '#10b981' : wr >= 50 ? '#fb923c' : '#ef4444', fontFamily: 'monospace' }}>
                                {wr.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800, color: data.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>Sem dados de análise cadastrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Table */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: '#a78bfa' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ATIVOS MAIS LUCRATIVOS</h3>
              </div>
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700 }}>Ativo</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Winrate</th>
                      <th style={{ padding: '8px 6px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(stats.assetStats).length > 0 ? (
                      Object.entries(stats.assetStats)
                        .sort((a, b) => b[1].profit - a[1].profit)
                        .map(([symbol, data]) => {
                          const wr = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
                          const displayName = symbol.startsWith('frx')
                            ? symbol.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2')
                            : symbol.replace('1HZ', '').replace('V', ' (1s)').replace('R_', 'V');
                          return (
                            <tr key={symbol} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 700, color: '#e2e8f0' }}>{displayName}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{data.trades}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: wr >= 65 ? '#10b981' : wr >= 50 ? '#fb923c' : '#ef4444', fontFamily: 'monospace' }}>
                                {wr.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800, color: data.profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>Sem dados de análise cadastrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Export & Actions Footer Panel */}
          <div className="glass-panel" style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(14, 11, 24, 0.5) 0%, rgba(139, 92, 246, 0.03) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={18} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0 }}>EXPORTAR HISTÓRICO ANALÍTICO</h4>
                <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2, margin: 0 }}>Baixe os dados operacionais estruturados do seu período selecionado para planilhas ou sistemas externos.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleExportCSV}
                disabled={displayedTrades.length === 0}
                onMouseEnter={() => setExportHover('csv')}
                onMouseLeave={() => setExportHover(null)}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: exportHover === 'csv' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                  border: exportHover === 'csv' ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: displayedTrades.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: displayedTrades.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                EXPORTAR CSV
              </button>
              
              <button
                onClick={handleExportJSON}
                disabled={displayedTrades.length === 0}
                onMouseEnter={() => setExportHover('json')}
                onMouseLeave={() => setExportHover(null)}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: exportHover === 'json' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                  border: exportHover === 'json' ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: displayedTrades.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: displayedTrades.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                EXPORTAR JSON
              </button>

              {!viewingArchivedReport && (
                <button
                  onClick={() => {
                    if (confirm('Tem certeza de que deseja apagar permanentemente todo o histórico de operações do banco de dados? Esta ação não poderá ser desfeita.')) {
                      onClearDb();
                    }
                  }}
                  disabled={dbTrades.length === 0}
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    color: '#f87171',
                    cursor: dbTrades.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: dbTrades.length === 0 ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  APAGAR DADOS ATIVOS
                </button>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
