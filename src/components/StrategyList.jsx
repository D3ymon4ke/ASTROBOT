import React from 'react';
import { Target, Award, ShieldCheck, Activity, Bell } from 'lucide-react';

export default function StrategyList({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  liveSignals,
  autoPilot
}) {
  // Sort strategies by winRate desc, take top 5
  const ranked = [...strategies]
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  const getStatusBadge = (strategyId, signal) => {
    if (signal) {
      const isCall = signal.direction === 'CALL';
      return (
        <span style={{
          fontSize: '0.68rem',
          background: isCall ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isCall ? '#22c55e' : '#ef4444',
          border: `1px solid ${isCall ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 'bold',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isCall ? '#22c55e' : '#ef4444',
            boxShadow: isCall ? '0 0 6px #22c55e' : '0 0 6px #ef4444'
          }} />
          {isCall ? 'COMPRA' : 'VENDA'}
        </span>
      );
    }
    return (
      <span style={{
        fontSize: '0.68rem',
        background: 'rgba(255,255,255,0.03)',
        color: '#64748b',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '2px 8px',
        borderRadius: '12px'
      }}>
        AGUARDANDO
      </span>
    );
  };

  return (
    <div className="glass-panel" style={{
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      height: '100%',
      background: 'rgba(14, 11, 24, 0.55)',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={16} style={{ color: 'var(--accent)' }} className="pulse-primary" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px', color: 'white' }}>RANKING IA (TOP 5)</h2>
        </div>
        {autoPilot && (
          <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
            AUTO-SELEÇÃO
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <th style={{ fontSize: '0.62rem', fontWeight: '800', color: '#64748b', padding: '6px 4px', textTransform: 'uppercase' }}>Rank & Estratégia</th>
              <th style={{ fontSize: '0.62rem', fontWeight: '800', color: '#64748b', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'right' }}>Assertividade</th>
              <th style={{ fontSize: '0.62rem', fontWeight: '800', color: '#64748b', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'center' }}>Histórico</th>
              <th style={{ fontSize: '0.62rem', fontWeight: '800', color: '#64748b', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((strategy, index) => {
              const isSelected = strategy.id === selectedStrategyId;
              const signal = liveSignals[strategy.id];
              const isTop = index === 0;

              return (
                <tr 
                  key={strategy.id}
                  onClick={() => !autoPilot && onSelectStrategy(strategy.id)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                    cursor: autoPilot ? 'default' : 'pointer',
                    background: isSelected ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                    transition: 'all 0.2s ease',
                    opacity: autoPilot && !isTop ? 0.7 : 1
                  }}
                  className={!autoPilot ? 'strategy-row-hover' : ''}
                >
                  {/* Rank & Name */}
                  <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        color: isTop ? 'var(--accent)' : '#94a3b8',
                        background: isTop ? 'rgba(217, 70, 239, 0.15)' : 'rgba(255,255,255,0.03)',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isTop ? '1px solid rgba(217, 70, 239, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                      }}>
                        #{index + 1}
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.74rem', color: isSelected ? 'white' : '#cbd5e1', display: 'block' }}>
                          {strategy.name}
                        </strong>
                        <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block' }}>
                          {strategy.description.substring(0, 32)}...
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Win rate probability */}
                  <td style={{ padding: '8px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 'bold',
                      color: strategy.winRate >= 65 ? '#22c55e' : (strategy.winRate >= 50 ? 'var(--warning)' : '#ef4444')
                    }}>
                      {strategy.winRate.toFixed(1)}%
                    </span>
                  </td>

                  {/* History W - L */}
                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {strategy.wins}W - {strategy.losses}L
                    </span>
                  </td>

                  {/* Status signal */}
                  <td style={{ padding: '8px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                    {getStatusBadge(strategy.id, signal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
