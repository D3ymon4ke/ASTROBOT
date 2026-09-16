import { ArrowUpRight, Activity, Layers3, ShieldCheck, Sparkles, Waves } from 'lucide-react';

export default function PlatformPortal({ onSelect }) {
  return <main className="platform-portal">
    <header className="portal-topbar">
      <div className="portal-brand"><span className="portal-brand-mark"><Layers3 size={23} /></span><span>ASTROBOT <small>ECOSSISTEMA</small></span></div>
      <span className="portal-topbar-tag"><ShieldCheck size={14} /> Ambientes independentes</span>
    </header>
    <div className="portal-content">
      <div className="portal-kicker"><Sparkles size={15} /> SUA ESTAÇÃO DE TRADING</div>
      <h1>Escolha seu mercado.<br /><em>Entre no ambiente certo.</em></h1>
      <p className="portal-lead">Uma entrada para a sua plataforma. Cada mercado mantém estratégias, saldo e resultados próprios.</p>
      <div className="portal-grid">
        <button className="portal-card portal-deriv" onClick={() => onSelect('deriv')}>
          <span className="portal-card-top"><span className="portal-card-icon"><Layers3 size={23} /></span><ArrowUpRight size={20} /></span>
          <span className="portal-card-eyebrow">PLATAFORMA ORIGINAL</span>
          <strong>ASTROBOT <span>Deriv</span></strong>
          <span className="portal-card-description">Linha do tempo, Trader Contínuo, estratégias e laboratório da Deriv.</span>
          <span className="portal-card-features"><span>Contratos Deriv</span><span>Demo e real</span><span>Automação</span></span>
          <span className="portal-card-action">Entrar na Deriv <ArrowUpRight size={17} /></span>
        </button>
        <button className="portal-card portal-crypto" onClick={() => onSelect('crypto')}>
          <span className="portal-card-top"><span className="portal-card-icon"><Waves size={23} /></span><ArrowUpRight size={20} /></span>
          <span className="portal-card-eyebrow">NOVO MERCADO · OKX SPOT</span>
          <strong>ASTROBOT <span>Cripto</span></strong>
          <span className="portal-card-description">Mercado cripto 24/7 com observação, carteira demo, pesquisa e análise em um visual próprio.</span>
          <span className="portal-card-features"><span>Dados OKX</span><span>Demo local</span><span>Laboratório</span></span>
          <span className="portal-card-action">Explorar Cripto <ArrowUpRight size={17} /></span>
        </button>
      </div>
      <div className="portal-footnote"><Activity size={16} /> Resultados e credenciais de uma plataforma nunca são compartilhados com a outra.</div>
    </div>
  </main>;
}
