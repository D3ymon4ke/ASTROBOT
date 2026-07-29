import React from 'react';
import { DollarSign, Percent, TrendingUp, TrendingDown, Target, Shield, Users, Brain, Zap } from 'lucide-react';

export default function Stats({
  balance,
  initialBalance,
  trades,
  stopLoss,
  takeProfit,
  recallEnabled = false,
  recallState = null,
  recallAccount = 'demo'
}) {
  const netProfit = balance - initialBalance;
  
  // Calculate trade stats
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.result === 'WIN').length;
  const losses = trades.filter(t => t.result === 'LOSS').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Stop Loss / Take Profit progress
  const profitProgress = takeProfit > 0 ? Math.min(100, Math.max(0, (netProfit / takeProfit) * 100)) : 0;
  const lossProgress = stopLoss > 0 ? Math.min(100, Math.max(0, (Math.abs(Math.min(0, netProfit)) / stopLoss) * 100)) : 0;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', width: '100%' }}>
      {/* Balance Card */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--primary-glow)', padding: '0.5rem', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <DollarSign size={24} style={{ color: 'var(--primary-light)' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold', letterSpacing: '0.05em' }}>SALDO ATUAL</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(balance)}</strong>
        </div>
      </div>

      {/* Profit Card */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: netProfit >= 0 ? 'var(--success-glow)' : 'var(--danger-glow)',
          padding: '0.5rem',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {netProfit >= 0 ? (
            <TrendingUp size={24} style={{ color: 'var(--success)' }} />
          ) : (
            <TrendingDown size={24} style={{ color: 'var(--danger)' }} />
          )}
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold', letterSpacing: '0.05em' }}>LUCRO LÍQUIDO</span>
          <strong style={{ fontSize: '1.2rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
          </strong>
        </div>
      </div>

      {/* Win Rate Card */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--primary-glow)', padding: '0.5rem', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Percent size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold', letterSpacing: '0.05em' }}>ASSERTIVIDADE BOT</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {winRate.toFixed(1)}% <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({wins}W - {losses}L)</span>
          </strong>
        </div>
      </div>

      {/* RECALL ENGINE HUD CARD */}
      {recallEnabled && (
        <div className="glass-panel" style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.4rem',
          background: recallState?.active ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
          border: recallState?.active ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--primary-light)', letterSpacing: '0.5px' }}>
              ──────── RECALL ENGINE ────────
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: recallState?.active ? '#10b981' : '#94A3B8' }}>
              {recallState?.active ? '🟢 OPERANDO' : '⚪ AGUARDANDO'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Conta Alvo:</span>
            <strong style={{ color: 'white', textTransform: 'uppercase' }}>
              {recallState?.targetAccount || recallAccount || 'Demo'}
            </strong>
          </div>

          <div style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {recallState?.active ? (
              recallState?.mode === 'neural_recovery' ? (
                <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>🧠 Neural Recovery: Aguardando sinal &gt; 90% WR...</span>
              ) : recallState?.mode === 'burst' ? (
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚡ Burst Mode: Executando ordem imediata...</span>
              ) : (
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🎯 Sinal Confirmado: Aguardando sinal...</span>
              )
            ) : recallState?.status === 'recovered' ? (
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔ Recuperação Concluída com Sucesso!</span>
            ) : recallState?.status === 'exhausted' ? (
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✖ Recall Encerrado (Limite Atingido)</span>
            ) : (
              <span>● Conta Principal (Acionamento automático após Loss)</span>
            )}
          </div>
        </div>
      )}

      {/* Safety Targets (Stop Loss / Take Profit trackers) */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem' }}>
        {/* Take Profit target */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '2px' }}>
            <span style={{ color: 'var(--success)' }}>META DE LUCRO (TAKE PROFIT)</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{netProfit > 0 ? netProfit.toFixed(1) : 0} / {takeProfit} USD</span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${profitProgress}%`, height: '100%', background: 'var(--success)', borderRadius: '10px', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Stop Loss target */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '2px' }}>
            <span style={{ color: 'var(--danger)' }}>LIMITE DE PERDA (STOP LOSS)</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{netProfit < 0 ? Math.abs(netProfit).toFixed(1) : 0} / {stopLoss} USD</span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${lossProgress}%`, height: '100%', background: 'var(--danger)', borderRadius: '10px', transition: 'width 0.3s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
