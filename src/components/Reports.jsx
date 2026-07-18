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
  Check
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
      martingaleDist: { G0: 0, G1: 0, G2Plus: 0 },
      hourlyWinrates: Array(24).fill({ total: 0, wins: 0, rate: 0 }),
      dailyWinrates: Array(7).fill({ total: 0, wins: 0, rate: 0 }),
      strategyStats: {},
      assetStats: {},
      equityCurve: []
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

  // Martingale distribution
  let g0 = 0;
  let g1 = 0;
  let g2Plus = 0;

  // Heatmaps
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0, wins: 0 }));
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

    // Drawdown calculation
    runningBalance += profitVal;
    equityCurve.push({ time: date.toLocaleDateString(), value: runningBalance });
    if (runningBalance > maxBalance) {
      maxBalance = runningBalance;
    }
    const dd = maxBalance > 0 ? ((maxBalance - runningBalance) / maxBalance) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    // Time filters
    const diffMs = now - date;
    if (diffMs <= oneDayMs) dailyProfit += profitVal;
    if (diffMs <= oneWeekMs) weeklyProfit += profitVal;
    if (diffMs <= oneMonthMs) monthlyProfit += profitVal;

    // Martingale dist
    const gale = trade.galeLevel || 0;
    if (isWin) {
      if (gale === 0) g0++;
      else if (gale === 1) g1++;
      else g2Plus++;
    }

    // Hourly Heatmap
    const hour = date.getHours();
    hourlyData[hour].total++;
    if (isWin) hourlyData[hour].wins++;

    // Daily Heatmap
    const day = date.getDay(); // 0 is Sunday
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
      assetStats[assetKey] = { trades: 0, wins: 0, profit: 0, name: trade.symbol };
    }
    assetStats[assetKey].trades++;
    assetStats[assetKey].profit += profitVal;
    if (isWin) assetStats[assetKey].wins++;
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
    martingaleDist: { G0: g0, G1: g1, G2Plus: g2Plus },
    hourlyWinrates,
    dailyWinrates,
    strategyStats,
    assetStats,
    equityCurve
  };
};

export default function Reports({ dbTrades = [], onClearDb }) {
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or key like '2026-07'
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [viewingArchivedReport, setViewingArchivedReport] = useState(null);
  
  // Compare Mode State
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState('');
  const [compareMonthB, setCompareMonthB] = useState('');
  
  const [exportHover, setExportHover] = useState(null);
  const [toast, setToast] = useState(null);

  // Load saved monthly reports on mount
  useEffect(() => {
    setMonthlyReports(loadMonthlyReports());
  }, []);

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
    const updated = saveMonthlyReport(report);
    setMonthlyReports(updated);
    showToast(`Relatório de ${report.monthLabel} salvo com sucesso!`);
  };

  // Delete saved month from database
  const handleDeleteSavedMonth = (id, label) => {
    if (confirm(`Tem certeza de que deseja apagar permanentemente o arquivo de ${label}?`)) {
      const updated = deleteMonthlyReport(id);
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

  // Equity SVG Line Chart Calculations
  const renderEquityChart = () => {
    if (stats.equityCurve.length < 2) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '0.4rem' }}>
          <Activity size={24} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: '0.72rem' }}>Requer pelo menos 2 operações persistidas no período.</span>
        </div>
      );
    }

    const width = 600;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 20, left: 35 };

    const values = stats.equityCurve.map(c => c.value);
    const minVal = Math.min(0, ...values) - 5;
    const maxVal = Math.max(10, ...values) + 5;
    const valRange = maxVal - minVal || 1;

    const points = stats.equityCurve.map((d, index) => {
      const x = padding.left + (index / (stats.equityCurve.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((d.value - minVal) / valRange) * (height - padding.top - padding.bottom);
      return `${x},${y}`;
    }).join(' ');

    const zeroLineY = height - padding.bottom - ((0 - minVal) / valRange) * (height - padding.top - padding.bottom);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="equityGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#db2777" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding.left} y1={zeroLineY} x2={width - padding.right} y2={zeroLineY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgba(255,255,255,0.06)" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(255,255,255,0.06)" />

        {/* Fill Area */}
        <path
          d={`M ${padding.left},${height - padding.bottom} L ${points} L ${width - padding.right},${height - padding.bottom} Z`}
          fill="url(#equityGrad2)"
        />

        {/* Line Path */}
        <path
          d={`M ${points}`}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint indicator dot */}
        {stats.equityCurve.length > 0 && (() => {
          const lastIndex = stats.equityCurve.length - 1;
          const x = padding.left + (lastIndex / lastIndex) * (width - padding.left - padding.right);
          const y = height - padding.bottom - ((values[lastIndex] - minVal) / valRange) * (height - padding.top - padding.bottom);
          return (
            <g>
              <circle cx={x} cy={y} r="6" fill="#f472b6" opacity="0.3" className="ping" />
              <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
            </g>
          );
        })()}
      </svg>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={16} style={{ color: '#a78bfa' }} />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>DISTRIBUIÇÃO DE RECUPERAÇÃO (MARTINGALE)</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
            {/* G0 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: '#94a3b8' }}>Primeira Entrada (G0)</span>
                <strong style={{ fontFamily: 'monospace', color: '#10b981' }}>{stats.martingaleDist.G0} WINs</strong>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${stats.wins > 0 ? (stats.martingaleDist.G0 / stats.wins) * 100 : 0}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #10b981, #059669)', 
                    borderRadius: '99px', 
                    transition: 'width 0.3s' 
                  }} 
                />
              </div>
            </div>

            {/* G1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: '#94a3b8' }}>Gale 1 (G1)</span>
                <strong style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{stats.martingaleDist.G1} WINs</strong>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${stats.wins > 0 ? (stats.martingaleDist.G1 / stats.wins) * 100 : 0}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)', 
                    borderRadius: '99px', 
                    transition: 'width 0.3s' 
                  }} 
                />
              </div>
            </div>

            {/* G2+ */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: '#94a3b8' }}>Gale 2 ou superior (G2+)</span>
                <strong style={{ fontFamily: 'monospace', color: '#f472b6' }}>{stats.martingaleDist.G2Plus} WINs</strong>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${stats.wins > 0 ? (stats.martingaleDist.G2Plus / stats.wins) * 100 : 0}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #ec4899, #db2777)', 
                    borderRadius: '99px', 
                    transition: 'width 0.3s' 
                  }} 
                />
              </div>
            </div>
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

    </div>
  );
}
