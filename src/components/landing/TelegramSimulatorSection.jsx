import React, { useState } from 'react';
import Landing3DCard from '../Landing3DCard';
import { Send, Bell, CheckCircle2, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function TelegramSimulatorSection() {
  const [activeTab, setActiveTab] = useState('reset');

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
          NOTIFICAÇÕES PUSH AO VIVO
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Controle Total na Palma da Sua Mão
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          Conecte o bot oficial do Telegram para receber relatórios detalhados de cada entrada, meta batida e o resumo diário com status de renovação automática.
        </p>
      </div>

      {/* Grid com Telegram Mockup */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.9fr 1.1fr',
        gap: '3rem',
        alignItems: 'center'
      }} className="hero-grid-responsive">

        {/* Lado Esquerdo - Controles de Simulação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            onClick={() => setActiveTab('reset')}
            className="glass-apple-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '18px',
              cursor: 'pointer',
              border: activeTab === 'reset' ? '1px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.06)',
              background: activeTab === 'reset' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(14, 17, 27, 0.5)'
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>
              🔄 Relatório de Reset Diário (00:10)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Balanço diário completo com lucro líquido, drawdown e confirmação de renovação ativada.
            </div>
          </div>

          <div
            onClick={() => setActiveTab('tp')}
            className="glass-apple-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '18px',
              cursor: 'pointer',
              border: activeTab === 'tp' ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.06)',
              background: activeTab === 'tp' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 17, 27, 0.5)'
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>
              🎯 Notificação de Meta Batida (Take Profit)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Alerta instantâneo disparado assim que a meta financeira do ciclo é alcançada.
            </div>
          </div>

          <div
            onClick={() => setActiveTab('win')}
            className="glass-apple-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '18px',
              cursor: 'pointer',
              border: activeTab === 'win' ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.06)',
              background: activeTab === 'win' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(14, 17, 27, 0.5)'
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>
              🏆 Alerta de Vitória em Tempo Real (WIN)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Mensagem com par operado, valor da entrada, stake e payout creditado na banca.
            </div>
          </div>
        </div>

        {/* Lado Direito - Mockup Interativo do Telegram */}
        <Landing3DCard
          intensity={14}
          glowColor="rgba(56, 189, 248, 0.25)"
          className="glass-apple-card"
          style={{ padding: 0, overflow: 'hidden', maxWidth: '480px', width: '100%', margin: '0 auto' }}
        >
          {/* Header do Telegram Chat */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #38BDF8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              color: '#FFFFFF',
              fontSize: '0.9rem'
            }}>
              AST
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FFFFFF' }}>
                ASTROBOT Official Bot
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: '600' }}>
                bot • online 24h
              </div>
            </div>
          </div>

          {/* Corpo das Mensagens */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(9, 11, 18, 0.9)' }}>
            
            {activeTab === 'reset' && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                color: '#E2E8F0',
                fontSize: '0.82rem',
                lineHeight: '1.7',
                fontFamily: 'var(--font-mono)'
              }}>
                <div>🔄 <b>RELATÓRIO DE RESET DIÁRIO (00:10)</b></div>
                <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  🟢 <b>Lucro Total:</b> +$84.50<br />
                  🔴 <b>Perda Total:</b> -$12.00<br />
                  💵 <b>Resultado Líquido:</b> +$72.50<br />
                  🏆 <b>Missões Concluídas:</b> 5 / 5<br />
                  🎯 <b>Assertividade Geral:</b> 91.4%
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px 10px', borderRadius: '8px', color: '#10B981', fontWeight: 'bold' }}>
                  🟢 BOTÃO DE RENOVAÇÃO ATIVADO: Os ciclos serão executados novamente hoje.
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94A3B8', marginTop: '6px' }}>00:10</div>
              </div>
            )}

            {activeTab === 'tp' && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                color: '#E2E8F0',
                fontSize: '0.82rem',
                lineHeight: '1.7',
                fontFamily: 'var(--font-mono)'
              }}>
                <div>🎯 <b>META BATIDA COM SUCESSO!</b></div>
                <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  📈 <b>Ciclo:</b> Noite - Volatilidade<br />
                  💰 <b>Lucro Acumulado:</b> +$20.40<br />
                  🎯 <b>Meta Configurada:</b> $20.00<br />
                  🛑 <b>Status:</b> Robô pausado automaticamente.
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94A3B8', marginTop: '6px' }}>21:42</div>
              </div>
            )}

            {activeTab === 'win' && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                color: '#E2E8F0',
                fontSize: '0.82rem',
                lineHeight: '1.7',
                fontFamily: 'var(--font-mono)'
              }}>
                <div>🏆 <b>VITÓRIA CONFIRMADA (WIN)</b></div>
                <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  📊 <b>Ativo:</b> 1HZ75V (Volatility 75 1s)<br />
                  💡 <b>Estratégia:</b> MHI Maioria<br />
                  🟢 <b>Ordem:</b> CALL @ $4.00<br />
                  💵 <b>Payout Creditado:</b> +$7.84
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94A3B8', marginTop: '6px' }}>21:38</div>
              </div>
            )}

          </div>
        </Landing3DCard>
      </div>
    </section>
  );
}
