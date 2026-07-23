import React from 'react';
import Landing3DCard from '../Landing3DCard';
import { Sparkles, ArrowRight, Play, Cpu, Activity, ShieldCheck, Zap } from 'lucide-react';

export default function HeroSection({
  userEmail,
  setShowLanding,
  demoProfit,
  demoWins,
  demoLosses,
  demoChartData,
  demoTrades
}) {
  return (
    <section style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '4rem 2rem 6rem 2rem',
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      gap: '4rem',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box'
    }} className="hero-grid-responsive">
      
      {/* Lado Esquerdo - Apresentação Cinematográfica */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'left' }}>
        
        {/* Status Badge */}
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
          <div className="apple-badge">
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              display: 'inline-block',
              boxShadow: '0 0 10px #10B981',
              animation: 'navLinePulse 1.5s infinite ease-in-out'
            }} />
            <span style={{ color: '#94A3B8' }}>AUTOMAÇÃO IA V2.5</span>
            <span style={{ color: '#CBD5E1', margin: '0 4px' }}>•</span>
            <span style={{ color: '#10B981', fontWeight: '700' }}>SISTEMA ONLINE</span>
          </div>
        </div>

        {/* Headline Monumental */}
        <h1 className="apple-hero-headline" style={{ margin: 0 }}>
          A inteligência artificial feita para traders.
        </h1>

        {/* Subtítulo Elegante */}
        <p className="apple-subtitle" style={{ margin: 0, maxWidth: '560px' }}>
          O ASTROBOT rastreia probabilidades em tempo real, seleciona o melhor setup automaticamente, executa operações inteligentes na Deriv e gerencia seus ciclos com precisão matemática.
        </p>

        {/* Botões CTA */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button
            className="apple-btn-primary"
            onClick={() => setShowLanding(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
          >
            <span>{userEmail ? 'ACESSAR PAINEL' : 'CONECTAR AO ROBÔ'}</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => {
              const target = document.getElementById('painel-preview-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }}
            className="apple-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Play size={16} fill="currentColor" />
            <span>Ver Demonstração</span>
          </button>
        </div>

        {/* Métricas Minimalistas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          paddingTop: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.03em' }}>+50k</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>OPERAÇÕES</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '-0.03em' }}>15</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>SETUPS IA</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38BDF8', letterSpacing: '-0.03em' }}>24/7</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>MONITORAMENTO</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10B981', letterSpacing: '-0.03em' }}>00:10</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>RESET DIÁRIO</div>
          </div>
        </div>
      </div>

      {/* Lado Direito - Centro de Comando Vivo (Software Mockup) */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }} className="hero-mockup-container perspective-container">
        
        {/* Nébula de iluminação de fundo */}
        <div className="pulse-sphere-3d" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(56, 189, 248, 0.08) 50%, rgba(0,0,0,0) 70%)',
          zIndex: -1,
          filter: 'blur(45px)'
        }} />

        {/* Card 3D do Software */}
        <Landing3DCard
          intensity={14}
          glowColor="rgba(139, 92, 246, 0.25)"
          className="glass-apple-card"
          style={{ width: '100%', maxWidth: '470px', padding: 0, overflow: 'hidden' }}
        >
          {/* Top Window Bar */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(9, 11, 18, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F' }} />
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '600', marginLeft: '8px', letterSpacing: '0.02em', fontFamily: 'var(--font-mono)' }}>
                ASTROBOT_COMMAND_CENTER
              </span>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '3px 10px',
              color: '#10B981',
              fontSize: '0.68rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'navLinePulse 1s infinite ease-in-out' }} />
              LIVE EXECUTION
            </div>
          </div>

          {/* Body do Software */}
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Top Cards Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>LUCRO HOJE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10B981', fontFamily: 'var(--font-mono)' }}>+${demoProfit.toFixed(2)}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>VITÓRIAS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{demoWins}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>DERROTAS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#EF4444', fontFamily: 'var(--font-mono)' }}>{demoLosses}</div>
              </div>
            </div>

            {/* Live Chart Area */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '12px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '10px' }}>
                <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Activity size={12} color="#8B5CF6" /> CURVA DE RENDIMENTO ACUMULADO
                </span>
                <span style={{ color: '#38BDF8', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>94.2% ASSERTIVIDADE</span>
              </div>
              
              <div style={{ height: '125px', width: '100%', position: 'relative' }}>
                <svg viewBox="0 0 320 125" style={{ width: '100%', height: '125px' }}>
                  <defs>
                    <linearGradient id="chartGradientLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                      <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="3"
                    points={demoChartData.map((val, idx) => `${idx * 40},${125 - val * 0.65}`).join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: 'points 0.5s ease-in-out' }}
                  />
                  <path
                    d={`M0,125 L${demoChartData.map((val, idx) => `${idx * 40},${125 - val * 0.65}`).join(' ')} L320,125 Z`}
                    fill="url(#chartGradientLive)"
                    style={{ transition: 'd 0.5s ease-in-out' }}
                  />
                </svg>
              </div>
            </div>

            {/* Status bar */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600' }}>STATUS DA IA:</span>
              <span style={{ fontSize: '0.72rem', color: '#A78BFA', fontWeight: '800', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A78BFA', animation: 'navLinePulse 1s infinite ease-in-out' }} />
                ANALISANDO 1HZ75V (MHI MAIORIA)
              </span>
            </div>

            {/* Live Trades Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ÚLTIMAS ORDENS EXECUTADAS
              </div>
              {demoTrades.map((t) => (
                <div key={t.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>{t.time}</span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px', color: '#E2E8F0', fontWeight: '700', fontSize: '0.62rem' }}>{t.symbol}</span>
                    <span style={{ color: t.type === 'CALL' ? '#10B981' : '#EF4444', fontWeight: '800' }}>{t.type}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#94A3B8' }}>Stake: ${t.stake.toFixed(2)}</span>
                    <span style={{
                      fontWeight: '700',
                      color: t.status === 'win' ? '#10B981' : '#94A3B8',
                      background: t.status === 'win' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      border: t.status === 'win' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {t.status === 'win' ? `+$${t.payout.toFixed(2)}` : 'Loss'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </Landing3DCard>
      </div>

    </section>
  );
}
