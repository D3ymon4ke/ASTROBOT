import React, { useState, useEffect } from 'react';
import Landing3DCard from '../Landing3DCard';
import { Radio, Search, Activity, Sparkles, TrendingUp } from 'lucide-react';

export default function ScannerRadarSection() {
  const [activeTab, setActiveTab] = useState('1HZ75V');
  const [scanPulse, setScanPulse] = useState(0);

  const assets = [
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)', prob: '91.8%', signal: 'MHI Maioria', status: 'MONITORANDO', color: '#10B981' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)', prob: '88.5%', signal: 'Padrão 3x1', status: 'ENTRADA IMINENTE', color: '#8B5CF6' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)', prob: '95.2%', signal: 'Torres Gêmeas', status: 'SINAL DETECTADO', color: '#38BDF8' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)', prob: '93.7%', signal: 'MHI Minoria', status: 'ANALISANDO VELAS', color: '#F59E0B' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)', prob: '86.4%', signal: 'SorosGale', status: 'VARREDURA', color: '#EC4899' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setScanPulse(prev => (prev + 1) % 100);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const selectedAsset = assets.find(a => a.symbol === activeTab) || assets[3];

  return (
    <section style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '6rem 2rem',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <span className="apple-badge" style={{ color: '#38BDF8' }}>
          VARREDURA 24H EM TEMPO REAL
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Scanner de Ativos Inteligente
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          O ASTROBOT varre continuamente múltiplos pares de volatilidade sintética da Deriv, filtrando ruídos de mercado e identificando oportunidades de alta assertividade.
        </p>
      </div>

      {/* Grid Principal do Radar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: '2.5rem',
        alignItems: 'center'
      }} className="hero-grid-responsive">

        {/* Lado Esquerdo - Tabela de Seleção de Ativos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {assets.map((item) => (
            <div
              key={item.symbol}
              onClick={() => setActiveTab(item.symbol)}
              className="glass-apple-card"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '18px',
                cursor: 'pointer',
                border: activeTab === item.symbol ? `1px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                background: activeTab === item.symbol ? 'rgba(139, 92, 246, 0.08)' : 'rgba(14, 17, 27, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: item.color,
                  boxShadow: `0 0 10px ${item.color}`
                }} />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {item.symbol}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {item.name}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: item.color, fontFamily: 'var(--font-mono)' }}>
                  {item.prob}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                  {item.signal}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lado Direito - Display do Radar de Varredura */}
        <Landing3DCard
          intensity={12}
          glowColor="rgba(56, 189, 248, 0.25)"
          className="glass-apple-card"
          style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden', textAlign: 'center' }}
        >
          {/* Fundo do Radar SVG Animado */}
          <div style={{ position: 'relative', width: '260px', height: '260px', margin: '0 auto 2rem auto' }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
              {/* Anéis Concentricos */}
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="15" fill="none" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" />

              {/* Eixos */}
              <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />

              {/* Linha do Sweeper Rotacionando */}
              <g className="radar-sweeper">
                <line x1="100" y1="100" x2="100" y2="10" stroke="url(#radarGradient)" strokeWidth="2.5" />
                <polygon points="100,100 100,10 140,25" fill="rgba(56, 189, 248, 0.15)" />
              </g>

              <defs>
                <linearGradient id="radarGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.1)" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>

              {/* Ponto Pulsante Detectado */}
              <circle cx="135" cy="55" r="5" fill={selectedAsset.color}>
                <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Dados do Ativo Selecionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: selectedAsset.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ● {selectedAsset.status}
            </span>
            
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#FFFFFF', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {selectedAsset.symbol} ({selectedAsset.signal})
            </h3>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '12px 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '0.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>PROBABILIDADE DE WIN</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10B981', fontFamily: 'var(--font-mono)' }}>{selectedAsset.prob}</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255, 255, 255, 0.1)' }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>PACOTE ANALISADO</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF' }}>500 Velas M1</div>
              </div>
            </div>
          </div>

        </Landing3DCard>
      </div>
    </section>
  );
}
