import React, { useState } from 'react';
import Landing3DCard from '../Landing3DCard';
import { Star, ChevronDown, Check, ShieldCheck, ArrowRight } from 'lucide-react';

export default function TestimonialsPricingFaq({ setShowLanding, userEmail }) {
  const [openFaq, setOpenFaq] = useState(null);

  const testimonials = [
    {
      name: 'Lucas Almeida',
      role: 'Trader Autônomo',
      text: 'O sistema de ciclos com reset às 00:10 mudou totalmente minha rotina. O robô faz a gestão perfeita e manda o balanço no Telegram.',
      stars: 5,
      profit: '+$1.420 este mês'
    },
    {
      name: 'Carla Mendonça',
      role: 'Investidora',
      text: 'A estratégia MHI Maioria combinada com SorosGale deu um salto enorme na minha assertividade. Simplesmente espetacular.',
      stars: 5,
      profit: '+$980 este mês'
    },
    {
      name: 'Rodrigo Santoro',
      role: 'Trader de Opções',
      text: 'Servidores rápidos na VPS e zero travamentos nas ordens. O controle de meta automática me salvou de dias ruins.',
      stars: 5,
      profit: '+$2.150 este mês'
    }
  ];

  const faqs = [
    {
      q: 'Preciso deixar o computador ligado para o ASTROBOT funcionar?',
      a: 'Não. O ASTROBOT executa suas missões diretamente em servidores VPS dedicados de alta velocidade na nuvem. Mesmo com seu computador desligado, os ciclos agendados continuam operando e o reset automático às 00:10 é executado normalmente.'
    },
    {
      q: 'O ASTROBOT possui acesso aos saques da minha conta Deriv?',
      a: 'Jamais. A conexão é realizada exclusivamente via Token de API Deriv com autorização restrita para trading. O robô não possui nenhuma permissão para efetuar saques, transferências ou visualizar seus dados bancários.'
    },
    {
      q: 'Qual é a banca mínima recomendada para iniciar?',
      a: 'Recomendamos iniciar com bancas a partir de $50 USD. O robô possui gerenciamento de stakes fracionadas e módulos de recuperação SorosGale ajustáveis para bancas pequenas e de grande porte.'
    },
    {
      q: 'Como funciona o Reset Automático das 00:10?',
      a: 'Ao chegar às 00:10 (horário de Brasília), o sistema consolida o balanço de lucros e perdas do dia anterior, envia um relatório completo no seu bot do Telegram e renova automaticamente os ciclos para a posição "Aguardando", pronto para o novo dia.'
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      
      {/* SEÇÃO DE DEPOIMENTOS */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <span className="apple-badge" style={{ color: '#8B5CF6' }}>
            DEPOIMENTOS DA COMUNIDADE
          </span>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
            Aprovação Garantida por Traders
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }} className="pricing-grid-responsive">
          {testimonials.map((t, idx) => (
            <Landing3DCard key={idx} intensity={10} className="glass-apple-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#E2E8F0', lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#FFFFFF' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{t.role}</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                  {t.profit}
                </span>
              </div>
            </Landing3DCard>
          ))}
        </div>
      </section>

      {/* SEÇÃO DE PLANOS / ACESSO */}
      <section id="planos-section" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <span className="apple-badge" style={{ color: '#10B981' }}>
            ACESSO IMEDIATO
          </span>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
            Escolha seu Plano de Operações
          </h2>
          <p className="apple-subtitle" style={{ maxWidth: '600px', margin: 0 }}>
            Conecte sua conta e ative a inteligência artificial agora mesmo com suporte total a VPS e Telegram.
          </p>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Landing3DCard
            intensity={14}
            glowColor="rgba(139, 92, 246, 0.35)"
            className="glass-apple-card hologram-glow-border"
            style={{ padding: '3rem', textAlign: 'center', border: '1px solid rgba(139, 92, 246, 0.4)' }}
          >
            <span style={{
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#A78BFA',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: '800',
              letterSpacing: '0.05em'
            }}>
              PLANO ILIMITADO PRO
            </span>

            <div style={{ margin: '2rem 0 1rem 0' }}>
              <span style={{ fontSize: '3.2rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.04em' }}>ACESSO LIBERADO</span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginBottom: '2rem' }}>
              Acesso completo a todas as estratégias, ciclos ilimitados, reset às 00:10 e notificações no Telegram.
            </p>

            <button
              className="apple-btn-primary"
              onClick={() => setShowLanding(false)}
              style={{ width: '100%', padding: '1.1rem', fontSize: '1rem', marginBottom: '2rem' }}
            >
              {userEmail ? 'IR PARA O PAINEL DE OPERAÇÕES' : 'CONECTAR SUA CONTA AGORA'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Check size={16} color="#10B981" /> <span>15 Estupos Probabilísticos Ativos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Check size={16} color="#10B981" /> <span>Ciclos Ilimitados & Reset Diário às 00:10</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Check size={16} color="#10B981" /> <span>Integração Oficial com Bot do Telegram</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Check size={16} color="#10B981" /> <span>Servidor VPS de Alta Velocidade Grátis</span>
              </div>
            </div>
          </Landing3DCard>
        </div>
      </section>

      {/* SEÇÃO DE FAQ INTERATIVO */}
      <section style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '6rem 2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span className="apple-badge" style={{ color: '#38BDF8' }}>PERGUNTAS FREQUENTES</span>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: '800', color: '#FFFFFF', margin: '0.5rem 0 0 0' }}>
            Tire Suas Dúvidas
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="glass-apple-card"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              style={{ padding: '1.5rem 2rem', borderRadius: '18px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>{faq.q}</h3>
                <ChevronDown size={20} color="#94A3B8" style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
              </div>
              {openFaq === idx && (
                <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '1rem', lineHeight: '1.65', margin: '1rem 0 0 0' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER TECNOLÓGICO */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '4rem 2rem 3rem 2rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.03em', fontFamily: "'Outfit', sans-serif" }}>
              ASTROBOT<span style={{ color: '#8B5CF6' }}>.IA</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Automação inteligente e probabilística de alta frequência para a Deriv.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'navLinePulse 1.2s infinite' }} />
            SISTEMAS OPERACIONAIS 🟢 • VERCEL & VPS ONLINE
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
          © {new Date().getFullYear()} ASTROBOT. Todos os direitos reservados. Negociar opções binárias e contratos derivativos envolve riscos.
        </div>
      </footer>

    </div>
  );
}
