import React, { useState, useEffect } from 'react';
import { Radar, RefreshCw, ArrowUpRight, Play, AlertCircle, Sparkles } from 'lucide-react';
import { derivAPI } from '../deriv/DerivAPI';
import { analyzeStrategies } from '../strategies/tradingStrategies';

export default function Scanner({ settings, onChange, connected, isRunning }) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState([]);
  const [error, setError] = useState('');
  const [lastScanTime, setLastScanTime] = useState('');
  const [marketFilter, setMarketFilter] = useState('all');

  const syntheticSymbols = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' }
  ];

  const forexSymbols = [
    { symbol: 'frxEURUSD', name: 'EUR/USD' },
    { symbol: 'frxEURGBP', name: 'EUR/GBP' },
    { symbol: 'frxEURJPY', name: 'EUR/JPY' },
    { symbol: 'frxGBPUSD', name: 'GBP/USD' },
    { symbol: 'frxUSDJPY', name: 'USD/JPY' },
    { symbol: 'frxAUDUSD', name: 'AUD/USD' },
    { symbol: 'frxUSDCAD', name: 'USD/CAD' }
  ];

  const targetSymbols = marketFilter === 'all'
    ? [...syntheticSymbols, ...forexSymbols]
    : marketFilter === 'synthetic' ? syntheticSymbols : forexSymbols;

  const runScan = async () => {
    if (!connected) {
      setError('Bot desconectado. Por favor, conecte para iniciar a varredura.');
      return;
    }
    if (scanning) return;

    derivAPI.log(`[Scanner] Iniciando varredura para ${targetSymbols.length} ativos (modo: ${marketFilter})...`, 'info');
    setScanning(true);
    setError('');
    setScanProgress(0);
    const results = [];

    const total = targetSymbols.length;
    const maxGale = settings.martingaleEnabled ? settings.martingaleMaxLevels : 0;

    for (let i = 0; i < total; i++) {
      const asset = targetSymbols[i];
      try {
        derivAPI.log(`[Scanner] Consultando histórico de ${asset.symbol}...`, 'info');
        // Fetch 150 candles to compute strategy statistics
        const candles = await derivAPI.fetchCandleHistory(asset.symbol, settings.granularity, 150);
        if (candles && candles.length > 0) {
          const stats = analyzeStrategies(candles, maxGale);
          
          // Filter pullbacks if autopilot filtering is on
          const filtered = settings.autoPilot && settings.disableSlowStrategies
            ? stats.filter(s => s.id !== 'pullback' && s.id !== 'reversal')
            : stats;

          const sorted = [...filtered].sort((a, b) => b.winRate - a.winRate);
          const best = sorted.length > 0 && sorted[0].winRate > 0 ? sorted[0] : null;

          if (best) {
            derivAPI.log(`[Scanner] ${asset.symbol}: Melhor estratégia é ${best.name} (${best.winRate.toFixed(1)}% Winrate)`, 'info');
            results.push({
              symbol: asset.symbol,
              name: asset.name,
              bestStrategyId: best.id,
              bestStrategyName: best.name,
              winRate: best.winRate,
              totalTrades: best.totalTrades,
              wins: best.wins,
              losses: best.losses
            });
          } else {
            derivAPI.log(`[Scanner] ${asset.symbol}: Nenhuma estratégia assertiva encontrada.`, 'warning');
          }
        } else {
          derivAPI.log(`[Scanner] ${asset.symbol}: Histórico de candles retornou vazio.`, 'warning');
        }
      } catch (err) {
        console.error(`Erro ao escanear ativo ${asset.symbol}:`, err);
        derivAPI.log(`[Scanner] Falha no ativo ${asset.symbol}: ${err.message || err}`, 'warning');
      }
      setScanProgress(Math.round(((i + 1) / total) * 100));
      // Small throttle delay to prevent API flooding
      await new Promise(r => setTimeout(r, 400));
    }

    // Sort results by highest win rate
    results.sort((a, b) => b.winRate - a.winRate);
    setScanResults(results);
    setScanning(false);
    setLastScanTime(new Date().toLocaleTimeString());
    derivAPI.log(`[Scanner] Varredura concluída! Encontrados ${results.length} ativos válidos.`, 'success');
  };

  // Run scan once connected or when the market filter changes
  useEffect(() => {
    if (connected && !scanning) {
      runScan();
    }
  }, [connected, marketFilter]);

  // Set up auto-scanner interval matching the autopilot interval setting
  useEffect(() => {
    if (!connected) return;

    const intervalMinutes = Math.max(5, parseInt(settings.autoPilotInterval || '5'));
    const intervalId = setInterval(() => {
      if (!isRunning && !scanning) {
        runScan();
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [connected, isRunning, settings.autoPilotInterval, settings.granularity]);

  const handleApplySettings = (item) => {
    if (isRunning) return;

    onChange({
      ...settings,
      symbol: item.symbol,
      selectedStrategy: item.bestStrategyId
    });
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radar size={20} className={scanning ? "spin" : ""} style={{ color: 'var(--primary-light)' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>SCANNER MULTI-ATIVOS</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastScanTime && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Último scan: {lastScanTime}</span>
          )}
          <button
            onClick={runScan}
            disabled={scanning || !connected}
            className="icon-button"
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid var(--border-active)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: '#ffffff',
              cursor: scanning || !connected ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} className={scanning ? "spin" : ""} /> {scanning ? "Escaneando..." : "Varrer Agora"}
          </button>
        </div>
      </div>

      {/* Market Type Filter Tabs */}
      <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.2)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '2px' }}>
        <button
          onClick={() => setMarketFilter('all')}
          style={{
            flex: 1,
            background: marketFilter === 'all' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: marketFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Todos
        </button>
        <button
          onClick={() => setMarketFilter('synthetic')}
          style={{
            flex: 1,
            background: marketFilter === 'synthetic' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: marketFilter === 'synthetic' ? '#ffffff' : 'var(--text-muted)',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Sintéticos
        </button>
        <button
          onClick={() => setMarketFilter('forex')}
          style={{
            flex: 1,
            background: marketFilter === 'forex' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: marketFilter === 'forex' ? '#ffffff' : 'var(--text-muted)',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Mercado Aberto
        </button>
      </div>

      {/* Progress Bar when scanning */}
      {scanning && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            <span>
              {marketFilter === 'synthetic' 
                ? 'Avaliando mercados sintéticos...' 
                : marketFilter === 'forex' 
                ? 'Avaliando mercado aberto...' 
                : 'Avaliando todos os mercados...'}
            </span>
            <strong>{scanProgress}%</strong>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${scanProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)', transition: 'width 0.3s' }}></div>
          </div>
        </div>
      )}

      {/* Errors or Notices */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.75rem' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Leaderboard list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {scanResults.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              <span>ATIVO</span>
              <span>MELHOR ESTRATÉGIA</span>
              <span style={{ textAlign: 'center' }}>WINRATE</span>
              <span>AÇÃO</span>
            </div>
            
            {scanResults.map((item, index) => {
              const isActive = settings.symbol === item.symbol;
              const isBestOverall = index === 0;

              return (
                <div 
                  key={item.symbol} 
                  className="glass-panel" 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 1fr auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: isActive ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    transition: 'all 0.2s hover'
                  }}
                >
                  {/* Symbol */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: isActive ? 'var(--primary-light)' : '#ffffff' }}>
                      {item.symbol.startsWith('frx')
                        ? item.symbol.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2')
                        : item.symbol.replace('1HZ', '').replace('V', ' (1s)')}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{item.name}</span>
                  </div>

                  {/* Best Strategy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isBestOverall && <Sparkles size={11} style={{ color: 'var(--accent)' }} />}
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: isBestOverall ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {item.bestStrategyName}
                    </span>
                  </div>

                  {/* Winrate */}
                  <div style={{ textAlign: 'center' }}>
                    <strong style={{ 
                      fontSize: '0.85rem', 
                      fontFamily: 'monospace',
                      color: item.winRate >= 60 ? 'var(--success)' : item.winRate >= 50 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {item.winRate.toFixed(1)}%
                    </strong>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>
                      {item.wins}W - {item.losses}L
                    </span>
                  </div>

                  {/* Action */}
                  <div>
                    {isActive ? (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 'bold',
                        color: 'var(--primary-light)',
                        background: 'rgba(139, 92, 246, 0.15)',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        ATIVO
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplySettings(item)}
                        disabled={isRunning}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          cursor: isRunning ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title={isRunning ? "Pare o bot para alterar o ativo" : "Operar este ativo agora"}
                      >
                        <Play size={8} fill="currentColor" /> Operar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <Radar size={32} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '0.8rem' }}>Sem dados de análise. Clique em "Varrer Agora" para escanear os ativos.</span>
          </div>
        )}
      </div>
    </div>
  );
}
