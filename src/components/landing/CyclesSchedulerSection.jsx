import React from 'react';
import Landing3DCard from '../Landing3DCard';
import { Calendar, Clock, RefreshCw, Bell, Shield, CheckCircle2 } from 'lucide-react';

export default function CyclesSchedulerSection() {
  const cyclesMock = [
    { time: '01:25', name: 'Madrugada - Reversão', status: 'Finalizado', result: '+$14.20', badge: 'win' },
    { time: '07:30', name: 'Manhã - Tendência', status: 'Finalizado', result: '+$18.50', badge: 'win' },
    { time: '11:15', name: 'Manhã - Consolidação', status: 'Finalizado', result: '+$12.00', badge: 'win' },
    { time: '19:30', name: 'Noite - Padrão MHI', status: 'Finalizado', result: '+$16.80', badge: 'win' },
    { time: '21:15', name: 'Noite - Volatilidade', status: 'Finalizado', result: '+$22.40', badge: 'win' },
    { time: '00:10', name: '🔄 RESET & RENOVAÇÃO DIÁRIA', status: 'Agendado', result: 'Auto Reset', badge: 'reset' }
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
        <span className="apple-badge" style={{ color: '#F59E0B' }}>
          AUTOMAÇÃO CONTÍNUA
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Ciclos Inteligentes & Reset Automático
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          Planeje múltiplos blocos de operação ao longo do dia. Chegado o horário do reset (00:10), a IA consolida o balanço, envia a notificação no Telegram e renova as missões automaticamente.
        </p>
      </div>

      {/* Grid Principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '3rem',
        alignItems: 'center'
      }} className="hero-grid-responsive">

        {/* Lado Esquerdo - Card do Cronograma de Ciclos */}
        <Landing3DCard
          intensity={12}
          glowColor="rgba(245, 158, 11, 0.2)"
          className="glass-apple-card"
          style={{ padding: '2.25rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="#F59E0B" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#FFFFFF', margin: 0, fontWeight: '700' }}>
                  Central de Automação de Ciclos
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>6 Missões Diárias Programadas</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'navLinePulse 1.2s infinite' }} />
              RENOVAÇÃO ATIVA 🟢
            </div>
          </div>

          {/* Lista de Ciclos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cyclesMock.map((item) => (
              <div key={item.time} style={{
                background: item.badge === 'reset' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: item.badge === 'reset' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: item.badge === 'reset' ? '#A78BFA' : '#94A3B8',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {item.time}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFFFFF' }}>
                    {item.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    color: item.badge === 'win' ? '#10B981' : '#A78BFA',
                    fontWeight: '700',
                    background: item.badge === 'win' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    padding: '3px 10px',
                    borderRadius: '20px'
                  }}>
                    {item.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Landing3DCard>

        {/* Lado Direito - Descrição e Benefícios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#8B5CF6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              REVOLUÇÃO NA ROTINA DO TRADER
            </span>
            <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#FFFFFF', margin: '0.5rem 0 1rem 0', lineHeight: '1.2' }}>
              Esqueça a necessidade de operar manualmente todos os dias.
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#94A3B8', lineHeight: '1.7', margin: 0 }}>
              Defina os horários estratégicos em que seu mercado favorito apresenta maior assertividade. O ASTROBOT assume o controle, cumpre as metas do ciclo, faz a gestão do capital e reporta tudo direto no seu Telegram.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <CheckCircle2 size={16} color="#10B981" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Reset Automático Programável</h4>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '2px 0 0 0' }}>Sua banca limpa e renovada diariamente às 00:10 sem intervenção humana.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <CheckCircle2 size={16} color="#38BDF8" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Resumo de Lucro & Perda no Telegram</h4>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '2px 0 0 0' }}>Relatórios diários com winrate, resultado em dólar ($) e status de renovação.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
