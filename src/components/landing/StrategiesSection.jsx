import React from 'react';
import Landing3DCard from '../Landing3DCard';
import { Layers, ShieldCheck, Zap, Activity, CheckCircle, ArrowRight } from 'lucide-react';

export default function StrategiesSection() {
  const strategies = [
    {
      title: 'MHI Maioria & Minoria',
      tag: 'Alta Probabilidade 5M',
      winrate: '94.2%',
      desc: 'Analisa as cores das últimas 3 velas de um bloco de 5 minutos, operando a favor da cor predominante ou da minoria conforme a volatilidade.',
      icon: <Layers size={22} color="#8B5CF6" />,
      color: '#8B5CF6'
    },
    {
      title: 'Torres Gêmeas',
      tag: 'Continuidade M1',
      winrate: '91.6%',
      desc: 'Mapeia padrões de dupla repetição de força compradora ou vendedora, realizando entradas precisas na virada de minuto.',
      icon: <Activity size={22} color="#38BDF8" />,
      color: '#38BDF8'
    },
    {
      title: 'Padrão 3x1',
      tag: 'Reversão Estocástica',
      winrate: '89.8%',
      desc: 'Detecta sequências de 3 velas da mesma cor seguidas de uma exaustão de tendência, buscando a entrada na vela de correção.',
      icon: <Zap size={22} color="#10B981" />,
      color: '#10B981'
    },
    {
      title: 'SorosGale Inteligente',
      tag: 'Alavancagem Protegida',
      winrate: '96.5%',
      desc: 'Combina a eficiência dos juros compostos Soros com travas de segurança Martingale, maximizando lucros e limitando perdas.',
      icon: <ShieldCheck size={22} color="#F59E0B" />,
      color: '#F59E0B'
    }
  ];

  return (
    <section style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '6rem 2rem',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <span className="apple-badge" style={{ color: '#10B981' }}>
          ALGORITMOS EXCLUSIVOS
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Estratégias Probabilísticas de Elite
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          Cada setup é validado constantemente em dados históricos reais, permitindo que a IA alterne de forma 100% autônoma para a estratégia mais lucrativa.
        </p>
      </div>

      {/* Grid de Cards 3D */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '2rem',
        width: '100%'
      }} className="hero-grid-responsive">
        {strategies.map((st) => (
          <Landing3DCard
            key={st.title}
            intensity={12}
            glowColor={`${st.color}25`}
            className="glass-apple-card"
            style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              {/* Top Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: `${st.color}15`,
                    border: `1px solid ${st.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {st.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: '700', margin: 0 }}>
                      {st.title}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600' }}>
                      {st.tag}
                    </span>
                  </div>
                </div>

                <div style={{
                  background: `${st.color}12`,
                  border: `1px solid ${st.color}30`,
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  color: st.color,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {st.winrate} Winrate
                </div>
              </div>

              {/* Descrição */}
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: '1.65', margin: 0 }}>
                {st.desc}
              </p>
            </div>

            {/* Bottom Row Footer */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> PILOTO AUTOMÁTICO COMPATÍVEL
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ativo 24h <ArrowRight size={12} />
              </span>
            </div>
          </Landing3DCard>
        ))}
      </div>
    </section>
  );
}
