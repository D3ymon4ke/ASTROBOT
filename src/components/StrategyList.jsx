import React from 'react';
import { ShieldCheck, TrendingUp, HelpCircle, BellRing, Target } from 'lucide-react';

export default function StrategyList({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  liveSignals,
  autoPilot
}) {
  // Sort strategies by win rate to recommend the best
  const sorted = [...strategies].sort((a, b) => b.winRate - a.winRate);
  const bestId = sorted.length > 0 && sorted[0].winRate > 0 ? sorted[0].id : null;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>ANÁLISE DE ESTRATÉGIAS</h2>
        </div>
        {autoPilot && (
          <span style={{ fontSize: '0.7rem', background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
            AUTO-SELEÇÃO ATIVA
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {strategies.map((strategy) => {
          const isBest = strategy.id === bestId;
          const isSelected = strategy.id === selectedStrategyId;
          const signal = liveSignals[strategy.id];
          const hasSignal = !!signal;

          // Determine circular chart dash offset
          const radius = 24;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (strategy.winRate / 100) * circumference;

          // Win rate color
          let wrColor = 'var(--text-muted)';
          if (strategy.winRate >= 65) wrColor = 'var(--success)';
          else if (strategy.winRate >= 50) wrColor = 'var(--warning)';
          else if (strategy.winRate > 0) wrColor = 'var(--danger)';

          return (
            <div
              key={strategy.id}
              onClick={() => !autoPilot && onSelectStrategy(strategy.id)}
              className={`glass-panel ${!autoPilot ? 'glass-panel-interactive' : ''}`}
              style={{
                padding: '1rem',
                border: isSelected && !autoPilot ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                background: isSelected && !autoPilot ? 'rgba(139, 92, 246, 0.08)' : '',
                opacity: autoPilot && !isBest ? 0.75 : 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              {/* Top Row: Info & Recommendation Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {strategy.name}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {strategy.description.substring(0, 75)}...
                  </p>
                </div>

                {isBest && (
                  <span style={{ fontSize: '0.65rem', background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                    <ShieldCheck size={10} /> RECOMENDADA
                  </span>
                )}
              </div>

              {/* Middle Row: Win Rate & Trades details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.25rem 0' }}>
                {/* Circular Gauge */}
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background Circle */}
                    <circle cx="28" cy="28" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    {/* Progress Circle */}
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      fill="transparent"
                      stroke={wrColor}
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                      {strategy.winRate.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Statistics Detail */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OPERAÇÕES</span>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{strategy.totalTrades}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ASSERTIVID.</span>
                    <strong style={{ fontSize: '0.8rem', color: wrColor, fontFamily: 'var(--font-mono)' }}>
                      {strategy.wins}W - {strategy.losses}L
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Active Signal Alerts */}
              {hasSignal ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  background: signal.direction === 'CALL' ? 'var(--success-glow)' : 'var(--danger-glow)',
                  border: `1px solid ${signal.direction === 'CALL' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  <BellRing size={13} className={signal.direction === 'CALL' ? 'pulse-dot-green' : 'pulse-dot-red'} style={{ color: signal.direction === 'CALL' ? 'var(--success)' : 'var(--danger)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: signal.direction === 'CALL' ? 'var(--success)' : 'var(--danger)' }}>
                    SINAL: {signal.direction === 'CALL' ? 'COMPRA (CALL)' : 'VENDA (PUT)'}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '24px' }}>
                  <span>Aguardando sinal...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
