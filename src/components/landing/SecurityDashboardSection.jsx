import React from 'react';
import Landing3DCard from '../Landing3DCard';
import { ShieldCheck, Lock, KeyRound, Server, Eye, Layers } from 'lucide-react';

export default function SecurityDashboardSection() {
  const securityFeatures = [
    {
      title: 'Token de API com Permissão Restrita',
      desc: 'Sua chave de API Deriv possui autorização exclusiva para execução de trades. O robô nunca possui acesso a saques ou transferências.',
      icon: <KeyRound size={22} color="#10B981" />
    },
    {
      title: 'Servidores Isolados na VPS',
      desc: 'Execução de sessões com isolamento por usuário no backendNode.js rodando em VPS dedicada com conexões WSS seguras.',
      icon: <Server size={22} color="#8B5CF6" />
    },
    {
      title: 'Travas Invioláveis de Stop Loss',
      desc: 'Proteção de banca em nível de código. Se o limite de perda for atingido, a execução é interrompida instantaneamente.',
      icon: <Lock size={22} color="#38BDF8" />
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
          PROTEÇÃO RIGOROSA DE CAPITAL
        </span>
        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Segurança em Nível Bancário
        </h2>
        <p className="apple-subtitle" style={{ maxWidth: '620px', margin: 0 }}>
          Projetado desde o primeiro dia com princípios de segurança de nível institucional. Seus dados e seu saldo continuam sob seu controle total na Deriv.
        </p>
      </div>

      {/* Grid de Segurança */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2rem',
        width: '100%'
      }} className="pricing-grid-responsive">
        {securityFeatures.map((sec) => (
          <Landing3DCard
            key={sec.title}
            intensity={10}
            className="glass-apple-card"
            style={{ padding: '2.25rem' }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              {sec.icon}
            </div>

            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: '700', margin: '0 0 0.75rem 0' }}>
              {sec.title}
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: '1.65', margin: 0 }}>
              {sec.desc}
            </p>
          </Landing3DCard>
        ))}
      </div>
    </section>
  );
}
