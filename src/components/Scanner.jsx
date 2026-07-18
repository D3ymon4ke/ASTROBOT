import React, { useState, useEffect } from 'react';
import { Radar, RefreshCw, Play, AlertCircle, Sparkles, TrendingUp, Activity, Zap, Target } from 'lucide-react';
import { derivAPI } from '../deriv/DerivAPI';
import { analyzeStrategies } from '../strategies/tradingStrategies';

const SYNTHETIC = [
  { symbol: 'R_10',    name: 'Volatility 10',    category: 'synthetic' },
  { symbol: 'R_25',    name: 'Volatility 25',    category: 'synthetic' },
  { symbol: 'R_50',    name: 'Volatility 50',    category: 'synthetic' },
  { symbol: 'R_75',    name: 'Volatility 75',    category: 'synthetic' },
  { symbol: 'R_100',   name: 'Volatility 100',   category: 'synthetic' },
  { symbol: '1HZ10V',  name: 'Vol 10 (1s)',      category: 'synthetic' },
  { symbol: '1HZ25V',  name: 'Vol 25 (1s)',      category: 'synthetic' },
  { symbol: '1HZ50V',  name: 'Vol 50 (1s)',      category: 'synthetic' },
  { symbol: '1HZ75V',  name: 'Vol 75 (1s)',      category: 'synthetic' },
  { symbol: '1HZ100V', name: 'Vol 100 (1s)',     category: 'synthetic' },
];
const FOREX = [
  { symbol: 'frxEURUSD', name: 'EUR/USD', category: 'forex' },
  { symbol: 'frxEURGBP', name: 'EUR/GBP', category: 'forex' },
  { symbol: 'frxEURJPY', name: 'EUR/JPY', category: 'forex' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', category: 'forex' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', category: 'forex' },
  { symbol: 'frxAUDUSD', name: 'AUD/USD', category: 'forex' },
  { symbol: 'frxUSDCAD', name: 'USD/CAD', category: 'forex' },
];

function winColor(wr) {
  if (wr >= 70) return '#10b981';
  if (wr >= 55) return '#f59e0b';
  return '#ef4444';
}

function displaySymbol(s) {
  if (s.startsWith('frx')) return s.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
  if (s.startsWith('1HZ')) return s.replace('1HZ', '').replace('V', '') + ' (1s)';
  return s.replace('R_', 'V') ;
}

function RankBadge({ rank }) {
  const colors = ['#f59e0b', '#94a3b8', '#b45309'];
  const labels = ['🥇', '🥈', '🥉'];
  if (rank <= 3) return (
    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{labels[rank - 1]}</span>
  );
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, color: '#475569',
      background: 'rgba(255,255,255,0.05)', borderRadius: '50%',
      width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace'
    }}>{rank}</span>
  );
}

export default function Scanner({ settings, onChange, connected, isRunning }) {
  const [scanning, setScanning]       = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanAsset, setScanAsset]     = useState('');
  const [scanResults, setScanResults] = useState([]);
  const [error, setError]             = useState('');
  const [lastScanTime, setLastScanTime] = useState('');
  const [marketFilter, setMarketFilter] = useState('all');
  const [hoveredRow, setHoveredRow]   = useState(null);

  const targetSymbols = marketFilter === 'all'
    ? [...SYNTHETIC, ...FOREX]
    : marketFilter === 'synthetic' ? SYNTHETIC : FOREX;

  const runScan = async () => {
    if (!connected) { setError('Desconectado. Conecte para iniciar a varredura.'); return; }
    if (scanning) return;
    setScanning(true); setError(''); setScanProgress(0); setScanAsset('');
    const results = [];
    const maxGale = settings.martingaleEnabled ? settings.martingaleMaxLevels : 0;

    for (let i = 0; i < targetSymbols.length; i++) {
      const asset = targetSymbols[i];
      setScanAsset(asset.name);
      try {
        const candles = await derivAPI.fetchCandleHistory(asset.symbol, settings.granularity, 150);
        if (candles?.length > 0) {
          const stats = analyzeStrategies(candles, maxGale);
          const filtered = settings.autoPilot && settings.disableSlowStrategies
            ? stats.filter(s => s.id !== 'pullback' && s.id !== 'reversal') : stats;
          const best = [...filtered].sort((a, b) => b.winRate - a.winRate).find(s => s.winRate > 0);
          if (best) results.push({ ...asset, bestStrategyId: best.id, bestStrategyName: best.name, winRate: best.winRate, wins: best.wins, losses: best.losses, totalTrades: best.totalTrades });
        }
      } catch (e) { /* silent */ }
      setScanProgress(Math.round(((i + 1) / targetSymbols.length) * 100));
      await new Promise(r => setTimeout(r, 400));
    }

    results.sort((a, b) => b.winRate - a.winRate);
    setScanResults(results);
    setScanning(false);
    setLastScanTime(new Date().toLocaleTimeString());
    setScanAsset('');
  };

  useEffect(() => { if (connected && !scanning) runScan(); }, [connected, marketFilter]);
  useEffect(() => {
    if (!connected) return;
    const mins = Math.max(5, parseInt(settings.autoPilotInterval || '5'));
    const id = setInterval(() => { if (!isRunning && !scanning) runScan(); }, mins * 60 * 1000);
    return () => clearInterval(id);
  }, [connected, isRunning, settings.autoPilotInterval, settings.granularity]);

  const handleApply = (item) => {
    if (isRunning) return;
    onChange({ ...settings, symbol: item.symbol, selectedStrategy: item.bestStrategyId });
  };

  const tabs = [
    { id: 'all',       label: 'Todos',          icon: Activity },
    { id: 'synthetic', label: 'Sintéticos',     icon: Zap },
    { id: 'forex',     label: 'Mercado Aberto', icon: TrendingUp },
  ];

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'transparent' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
            <Radar size={18} color="#fff" className={scanning ? 'spin' : ''} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.06em', margin: 0, background: 'linear-gradient(90deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SCANNER MULTI-ATIVOS
            </h2>
            <span style={{ fontSize: '0.62rem', color: '#475569', letterSpacing: '0.04em' }}>
              {lastScanTime ? `Último scan: ${lastScanTime}` : 'Análise em tempo real'}
            </span>
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={scanning || !connected}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 10,
            background: scanning ? 'rgba(124,58,237,0.15)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            border: '1px solid rgba(139,92,246,0.4)',
            color: '#fff', fontSize: '0.72rem', fontWeight: 700,
            cursor: scanning || !connected ? 'not-allowed' : 'pointer',
            boxShadow: scanning ? 'none' : '0 0 14px rgba(124,58,237,0.35)',
            transition: 'all 0.2s', opacity: !connected ? 0.5 : 1
          }}
        >
          <RefreshCw size={12} className={scanning ? 'spin' : ''} />
          {scanning ? 'Escaneando...' : 'Varrer Agora'}
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', gap: 3 }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = marketFilter === id;
          return (
            <button key={id} onClick={() => setMarketFilter(id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              background: active ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
              border: 'none',
              color: active ? '#fff' : '#475569',
              padding: '6px 10px', borderRadius: 8,
              fontSize: '0.7rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: active ? '0 0 10px rgba(124,58,237,0.3)' : 'none'
            }}>
              <Icon size={11} />{label}
            </button>
          );
        })}
      </div>

      {/* ── Scan Progress ── */}
      {scanning && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(124,58,237,0.06)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.18)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
              <Radar size={11} className="spin" style={{ color: '#a78bfa' }} />
              <span>Analisando: <strong style={{ color: '#a78bfa' }}>{scanAsset}</strong></span>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{scanProgress}%</span>
          </div>
          <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${scanProgress}%`, height: '100%',
              background: 'linear-gradient(90deg,#7c3aed,#06b6d4)',
              borderRadius: 99, transition: 'width 0.35s ease',
              boxShadow: '0 0 8px rgba(124,58,237,0.6)'
            }} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: '0.72rem' }}>
          <AlertCircle size={14} /><span>{error}</span>
        </div>
      )}

      {/* ── Results Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {scanResults.length > 0 ? (
          <>
            {/* Column Headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 1.3fr 1.8fr 110px 80px',
              gap: '0.5rem', padding: '0.3rem 0.75rem',
              fontSize: '0.58rem', fontWeight: 700, color: '#334155',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              <span>#</span>
              <span>Ativo</span>
              <span>Melhor Estratégia</span>
              <span style={{ textAlign: 'center' }}>Winrate</span>
              <span style={{ textAlign: 'center' }}>Ação</span>
            </div>

            {scanResults.map((item, idx) => {
              const isActive  = settings.symbol === item.symbol;
              const isTop     = idx === 0;
              const isHovered = hoveredRow === item.symbol;
              const col       = winColor(item.winRate);
              const barW      = Math.min(100, item.winRate);

              return (
                <div
                  key={item.symbol}
                  onMouseEnter={() => setHoveredRow(item.symbol)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: 'grid', gridTemplateColumns: '32px 1.3fr 1.8fr 110px 80px',
                    gap: '0.5rem', alignItems: 'center',
                    padding: '0.6rem 0.75rem', borderRadius: 10,
                    background: isActive
                      ? 'rgba(124,58,237,0.1)'
                      : isHovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                    border: isActive
                      ? '1px solid rgba(139,92,246,0.35)'
                      : isTop ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    cursor: 'default',
                    boxShadow: isTop ? '0 0 12px rgba(245,158,11,0.06)' : 'none'
                  }}
                >
                  {/* Rank */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RankBadge rank={idx + 1} />
                  </div>

                  {/* Symbol */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 800,
                        color: isActive ? '#a78bfa' : isTop ? '#f59e0b' : '#e2e8f0',
                        fontFamily: 'monospace'
                      }}>
                        {displaySymbol(item.symbol)}
                      </span>
                      {item.category === 'synthetic' && (
                        <span style={{ fontSize: '0.48rem', padding: '1px 4px', borderRadius: 4, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.06em' }}>SYN</span>
                      )}
                      {item.category === 'forex' && (
                        <span style={{ fontSize: '0.48rem', padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.06em' }}>FX</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.57rem', color: '#475569' }}>{item.name}</span>
                  </div>

                  {/* Strategy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isTop && <Sparkles size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                    <span style={{
                      fontSize: '0.7rem', fontWeight: isTop ? 700 : 500,
                      color: isTop ? '#e2e8f0' : '#94a3b8',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {item.bestStrategyName}
                    </span>
                  </div>

                  {/* Winrate + Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <strong style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: col, lineHeight: 1 }}>
                        {item.winRate.toFixed(1)}
                      </strong>
                      <span style={{ fontSize: '0.55rem', color: col, opacity: 0.7 }}>%</span>
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ width: 70, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                      <div style={{ width: `${barW}%`, height: '100%', background: col, borderRadius: 99, boxShadow: `0 0 6px ${col}88`, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: '0.55rem', color: '#475569', fontFamily: 'monospace' }}>
                      {item.wins}W · {item.losses}L
                    </span>
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isActive ? (
                      <span style={{
                        fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em',
                        color: '#a78bfa', background: 'rgba(139,92,246,0.15)',
                        padding: '4px 10px', borderRadius: 6,
                        border: '1px solid rgba(139,92,246,0.3)'
                      }}>ATIVO</span>
                    ) : (
                      <button
                        onClick={() => handleApply(item)}
                        disabled={isRunning}
                        title={isRunning ? 'Pare o bot para trocar o ativo' : 'Operar este ativo'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 7,
                          background: isHovered && !isRunning ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isHovered && !isRunning ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
                          color: '#fff', fontSize: '0.62rem', fontWeight: 700,
                          cursor: isRunning ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s', opacity: isRunning ? 0.4 : 1,
                          boxShadow: isHovered && !isRunning ? '0 0 10px rgba(124,58,237,0.3)' : 'none'
                        }}
                      >
                        <Play size={8} fill="currentColor" /> Operar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            <div style={{ marginTop: 8, padding: '0.6rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: '#334155' }}>
                <strong style={{ color: '#475569' }}>{scanResults.length}</strong> ativos analisados
              </span>
              <span style={{ fontSize: '0.62rem', color: '#334155' }}>
                Média: <strong style={{ color: winColor(scanResults.reduce((a, b) => a + b.winRate, 0) / scanResults.length) }}>
                  {(scanResults.reduce((a, b) => a + b.winRate, 0) / scanResults.length).toFixed(1)}%
                </strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: '#334155' }}>
                <Target size={10} style={{ color: '#10b981' }} />
                <span>Top: <strong style={{ color: '#10b981' }}>{scanResults[0]?.symbol}</strong></span>
              </div>
            </div>
          </>
        ) : !scanning ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#334155', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radar size={26} style={{ opacity: 0.4, color: '#a78bfa' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>Nenhuma varredura realizada</p>
              <p style={{ fontSize: '0.68rem', color: '#334155', margin: 0 }}>Clique em "Varrer Agora" para analisar os ativos disponíveis.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
