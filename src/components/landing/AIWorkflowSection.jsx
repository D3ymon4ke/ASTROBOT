import React from 'react';
import Landing3DCard from '../Landing3DCard';
import { Database, Cpu, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function AIWorkflowSection() {
  const steps = [
    {
      step: '01',
      title: 'Ingestão de Dados em Tempo Real',
      desc: 'Coleta contínua de ticks e velas via WebSocket com latência ultrabaixa nos índices de volatilidade Deriv.',
      icon: <Database size={24} color="#8B5CF6" />,
      tag: 'WebSocket Stream'
    },
    {
      step: '02',
      title: 'Motor Probabilístico IA',
      desc: 'Processa 15 padrões simultâneos, calculando a taxa de assertividade histórica dos últimos 500 blocos.',
      icon: <Cpu size={24} color="#38BDF8" />,
      tag: 'Pattern Engine'
    },
    {
      step: '03',
      title: 'Filtro de Risco & Trava de Banca',
      desc: 'Calcula o tamanho exato da stake, verificando limites de Stop Loss e Take Profit configurados pelo trader.',
      icon: <ShieldCheck size={24} color="#10B981" />,
      tag: 'Risk Sentinel'
    },
    {
      step: '04',
      title: 'Execução & Recuperação Autônoma',
      desc: 'Disparo instantâneo da ordem com gerenciamento autônomo pós-operatório (Martingale / Soros).',
      icon: <Zap size={24} color="#F59E0B" />,
      tag: 'Auto Recovery'
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
      {/* Header da Seção */}
      <div style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <span className="apple-badge" style={{ color: '#8B5CF6' }}>
          MOTOR DA OPERAÇÃO
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Como a Nossa IA Toma Decisões
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          Em frações de segundo, o ASTROBOT executa uma cadeia rigorosa de análise estatística para proteger seu capital e buscar alvos de lucro.
        </p>
      </div>

      {/* Grid dos 4 Passos em Glass Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        width: '100%'
      }} className="pricing-grid-responsive">
        {steps.map((item, idx) => (
          <Landing3DCard
            key={item.step}
            intensity={10}
            className="glass-apple-card"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
          >
            <div>
              {/* Badge de Etapa */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  ETAPA {item.step}
                </span>

                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </div>
              </div>

              {/* Título & Descrição */}
              <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: '700', margin: '0 0 0.75rem 0', letterSpacing: '-0.01em' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: '1.65' }}>
                {item.desc}
              </p>
            </div>

            {/* Tag de Tecnologia */}
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.tag}
              </span>
              <ArrowRight size={14} color="#64748B" />
            </div>
          </Landing3DCard>
        ))}
      </div>
    </section>
  );
}
