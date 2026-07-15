import React from 'react';
import { DollarSign, Percent, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

export default function Stats({
  balance,
  initialBalance,
  trades,
  stopLoss,
  takeProfit
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
