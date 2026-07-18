import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, Percent, ShieldCheck, Activity, Award, BarChart2, Download, AlertCircle, Trash2, Clock, DollarSign, RefreshCw } from 'lucide-react';

export default function Reports({ dbTrades = [], onClearDb }) {
  const [exportHover, setExportHover] = useState(null);

  // Formatting helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // 1. Calculations & Metrics
  const stats = useMemo(() => {
    if (!dbTrades || dbTrades.length === 0) {
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

    const totalTrades = dbTrades.length;
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
    const sortedTrades = [...dbTrades].sort((a, b) => (a.timestamp || a.epoch * 1000) - (b.timestamp || b.epoch * 1000));

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
  }, [dbTrades]);

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
          <span style={{ fontSize: '0.72rem' }}>Requer pelo menos 2 operações persistidas.</span>
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
    if (dbTrades.length === 0) return;
    const headers = ['Data/Hora', 'Timestamp', 'Ativo', 'Contrato', 'Entrada', 'Gale', 'Lucro', 'Resultado', 'Estratégia'];
    const rows = dbTrades.map(t => [
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
    if (dbTrades.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbTrades, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `astrobot_trade_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: 'white' }}>
      
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
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>EVOLUÇÃO PATRIMONIAL (EQUITY CURVE)</h3>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>Ordens Totais: {stats.totalTrades}</span>
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
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>TAXA DE ASSERTIVIDADE</h3>
              <p style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.3 }}>
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
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>MAPA DE OPERAÇÕES LUCRATIVAS</h3>
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
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>DISTRIBUIÇÃO DE RECUPERAÇÃO (MARTINGALE)</h3>
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
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>ESTRATÉGIAS MAIS LUCRATIVAS</h3>
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
                        <tr key={name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)', hover: { background: 'rgba(255,255,255,0.01)' } }}>
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
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>ATIVOS MAIS LUCRATIVOS</h3>
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
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em' }}>EXPORTAR HISTÓRICO ANALÍTICO</h4>
            <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Baixe os dados operacionais estruturados do seu banco de dados local para planilhas ou sistemas externos.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleExportCSV}
            disabled={dbTrades.length === 0}
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
              cursor: dbTrades.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dbTrades.length === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            EXPORTAR CSV
          </button>
          
          <button
            onClick={handleExportJSON}
            disabled={dbTrades.length === 0}
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
              cursor: dbTrades.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dbTrades.length === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            EXPORTAR JSON
          </button>

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
            APAGAR DADOS
          </button>
        </div>
      </div>

    </div>
  );
}
