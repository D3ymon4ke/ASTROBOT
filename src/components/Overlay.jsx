import React, { useState, useEffect } from 'react';
import { Play, Square, ExternalLink, X, Radio, ArrowUpRight, ArrowDownRight, Sliders } from 'lucide-react';

export default function Overlay() {
  const [state, setState] = useState({
    isRunning: false,
    connected: false,
    authorized: false,
    balance: 0,
    initialBalance: 0,
    trades: [],
    activeTradeCountdown: null,
    settings: {
      symbol: 'R_100',
      selectedStrategy: 'mhi_minority',
      martingaleEnabled: true,
      martingaleMaxLevels: 2
    },
    latency: 0
  });

  const [opacity, setOpacity] = useState(0.95);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  // Check if we are in Electron renderer
  const isElectron = window && window.process && window.process.type === 'renderer';

  useEffect(() => {
    if (!isElectron) return;

    const { ipcRenderer } = window.require('electron');

    const handleStateUpdate = (event, updatedState) => {
      setState(updatedState);
    };

    ipcRenderer.on('state-update', handleStateUpdate);

    return () => {
      ipcRenderer.removeListener('state-update', handleStateUpdate);
    };
  }, [isElectron]);

  const handleToggleBot = () => {
    if (isElectron) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('bot-command', 'toggle-bot');
    }
  };

  const handleOpenApp = () => {
    if (isElectron) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('restore-main-window');
    }
  };

  const handleCloseOverlay = () => {
    if (isElectron) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('close-overlay');
    }
  };

  const netProfit = state.balance - state.initialBalance;
  
  // Calculate win rate from received trades
  const wins = state.trades.filter(t => t.result === 'WIN').length;
  const total = state.trades.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const getCleanSymbol = (sym) => {
    return sym.replace('Volatility ', '').replace(' Index', '');
  };

  const getCleanStrategy = (strat) => {
    const names = {
      ma_crossover: 'Média Móvel',
      mhi_minority: 'MHI Minoria',
      mhi_majority: 'MHI Maioria',
      twin_towers: 'Torres Gêmeas',
      three_musketeers: 'Três Mosqueteiros',
      padrao_23: 'Padrão 23',
      padrao_3x1: 'Padrão 3x1',
      padrao_impar: 'Padrão Ímpar',
      r7: 'Padrão R7',
      pullback: 'Pullback',
      reversal: 'Reversão',
      pivot_123: 'Pivô 1-2-3',
      ross_hook: '123 de Ross',
      r10: 'Padrão R10',
      marubozu: 'Marubozu',
      bos_choch: 'BOS + ChoCH',
      master_candle: 'Vela Mestra'
    };
    return names[strat] || strat;
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'rgba(10, 12, 22, 0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      opacity: opacity,
      transition: 'opacity 0.2s ease',
      boxSizing: 'border-box'
    }}>
      {/* Title bar - Drag Region */}
      <div style={{
        height: '34px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        WebkitAppRegion: 'drag',
        cursor: 'grab',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: state.isRunning ? '#10b981' : '#f59e0b',
            boxShadow: state.isRunning ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
          }} />
          <span style={{ fontSize: '0.68rem', fontWeight: '800', letterSpacing: '1px', color: 'rgba(255,255,255,0.7)' }}>
            ASTROBOT OVERLAY
          </span>
        </div>
        
        {/* Buttons - No Drag Region */}
        <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Opacidade"
          >
            <Sliders size={12} />
          </button>
          
          <button 
            onClick={handleCloseOverlay}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Fechar"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
        
        {/* Opacity slider overlay popover */}
        {showOpacitySlider && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '12px',
            background: '#151829',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
          }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>OPACIDADE:</span>
            <input 
              type="range" 
              min="0.15" 
              max="1.0" 
              step="0.05" 
              value={opacity} 
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: '#8b5cf6', cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
          {/* Balance card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', letterSpacing: '0.5px' }}>SALDO ATUAL</span>
            <strong style={{ fontSize: '1.05rem', color: '#ffffff', fontFamily: 'monospace', letterSpacing: '-0.3px', marginTop: '2px' }}>
              {formatCurrency(state.balance)}
            </strong>
          </div>

          {/* Profit card */}
          <div style={{
            background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: netProfit >= 0 ? '1px solid rgba(16, 185, 129, 0.12)' : '1px solid rgba(239, 68, 68, 0.12)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', letterSpacing: '0.5px' }}>LUCRO LÍQUIDO</span>
            <strong style={{
              fontSize: '1.05rem',
              color: netProfit >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'monospace',
              letterSpacing: '-0.3px',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
              {netProfit > 0 ? <ArrowUpRight size={12} /> : netProfit < 0 ? <ArrowDownRight size={12} /> : null}
            </strong>
          </div>
        </div>

        {/* Details and Strategy Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          background: 'rgba(255,255,255,0.02)',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.03)'
        }}>
          <div>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Ativo:</span>{' '}
            <strong style={{ color: '#ffffff' }}>{getCleanSymbol(state.settings.symbol)}</strong>
          </div>
          <div>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Estratégia:</span>{' '}
            <strong style={{ color: 'var(--primary-light)' }}>{getCleanStrategy(state.settings.selectedStrategy)}</strong>
          </div>
          {total > 0 && (
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Assert:</span>{' '}
              <strong style={{ color: '#ffffff' }}>{winRate.toFixed(0)}%</strong>
            </div>
          )}
        </div>

        {/* Active Trade Countdown Progress */}
        {state.activeTradeCountdown && state.activeTradeCountdown.remaining > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '6px 10px',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
              <span style={{
                color: state.activeTradeCountdown.contractType === 'CALL' ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {state.activeTradeCountdown.contractType === 'CALL' ? '▲ CALL' : '▼ PUT'} (${state.activeTradeCountdown.stake.toFixed(1)})
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'monospace' }}>
                EXPIRA EM: <strong>{state.activeTradeCountdown.remaining}s</strong>
              </span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, (state.activeTradeCountdown.remaining / state.activeTradeCountdown.totalDuration) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)',
                borderRadius: '2px',
                transition: 'width 1s linear'
              }} />
            </div>
          </div>
        ) : (
          <div style={{
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.4)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '8px'
          }}>
            Aguardando sinal no mercado...
          </div>
        )}

        {/* Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          {/* Play/Pause Button */}
          {state.isRunning ? (
            <button 
              onClick={handleToggleBot}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Square size={10} fill="currentColor" /> PARAR BOT
            </button>
          ) : (
            <button 
              onClick={handleToggleBot}
              disabled={!state.connected || !state.authorized}
              style={{
                background: (!state.connected || !state.authorized) ? 'rgba(255,255,255,0.02)' : 'rgba(16, 185, 129, 0.1)',
                border: (!state.connected || !state.authorized) ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(16, 185, 129, 0.25)',
                color: (!state.connected || !state.authorized) ? 'rgba(255,255,255,0.2)' : '#10b981',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: (!state.connected || !state.authorized) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Play size={10} fill="currentColor" /> INICIAR BOT
            </button>
          )}

          {/* Open App button */}
          <button 
            onClick={handleOpenApp}
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              color: '#a78bfa',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
          >
            <ExternalLink size={10} /> ABRIR APP
          </button>
        </div>
      </div>
    </div>
  );
}
