import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Beaker, CircleHelp, Clock3, FlaskConical, LockKeyhole, Menu, Radio, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Wallet, Waves } from 'lucide-react';
import { backtestStrategy, DEMO_FEE_RATE, equityOf, INITIAL_DEMO, simulateSpotOrder } from './cryptoCore.js';
import OkxDemoPanel from './OkxDemoPanel.jsx';
import CryptoResearchLab from './CryptoResearchLab.jsx';

const SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
const TABS = [
  { id: 'overview', label: 'Visão geral', icon: Activity },
  { id: 'laboratory', label: 'Laboratório', icon: FlaskConical },
  { id: 'analysis', label: 'Análise', icon: BarChart3 },
  { id: 'accounts', label: 'Contas & modos', icon: Wallet }
];

const currency = (value) => Number.isFinite(value) ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const percent = (value) => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

function PriceChart({ candles, symbol }) {
  const data = candles.slice(-65);
  if (data.length < 2) return <div className="crypto-empty-chart">Aguardando velas reais da OKX…</div>;
  const low = Math.min(...data.map((bar) => bar.low));
  const high = Math.max(...data.map((bar) => bar.high));
  const range = Math.max(high - low, high * 0.001);
  const x = (index) => 20 + index * (960 / (data.length - 1));
  const y = (price) => 285 - ((price - low) / range) * 250;
  const points = data.map((bar, index) => `${x(index)},${y(bar.close)}`).join(' ');
  return <div className="crypto-price-chart" role="img" aria-label={`Gráfico de fechamentos de ${symbol} em velas de 15 minutos`}>
    <div className="crypto-chart-head"><div><strong>Preço · {symbol}</strong><small>Últimas {data.length} velas de 15 min · fonte OKX</small></div><span>15M</span></div>
    <svg viewBox="0 0 1000 320" preserveAspectRatio="none">
      {[70, 140, 210, 280].map((line) => <line key={line} x1="20" x2="980" y1={line} y2={line} stroke="rgba(255,255,255,.07)" />)}
      <polyline points={points} fill="none" stroke="#53e2ce" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(data.length - 1)} cy={y(data.at(-1).close)} r="5" fill="#53e2ce" />
    </svg>
    <div className="crypto-chart-axis"><span>{new Date(data[0].time).toLocaleString('pt-BR')}</span><span>{new Date(data.at(-1).time).toLocaleString('pt-BR')}</span></div>
  </div>;
}

function ResultCard({ label, result, accent }) {
  return <article className={`crypto-result-card ${accent || ''}`}>
    <small>{label}</small><strong className={result?.returnPct >= 0 ? 'positive' : 'negative'}>{result ? percent(result.returnPct) : '—'}</strong>
    <div><span>Valor final</span><b>{result ? currency(result.finalValue) : '—'}</b></div>
    <div><span>Queda máxima</span><b>{result ? `${result.maxDrawdown.toFixed(2)}%` : '—'}</b></div>
    <div><span>Entradas / saídas</span><b>{result ? `${result.entries} / ${result.exits}` : '—'}</b></div>
  </article>;
}

export default function CryptoWorkspace({ onPlatformPortal }) {
  const [tab, setTab] = useState('overview');
  const [mode, setMode] = useState('observe');
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [market, setMarket] = useState(null);
  const [marketError, setMarketError] = useState('');
  const [marketPrices, setMarketPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('astrobot_crypto_demo_v1'));
      return saved && Number.isFinite(saved.cash) && saved.holdings && Array.isArray(saved.trades) ? saved : INITIAL_DEMO;
    } catch { return INITIAL_DEMO; }
  });
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('25');
  const [orderMessage, setOrderMessage] = useState('');

  useEffect(() => { localStorage.setItem('astrobot_crypto_demo_v1', JSON.stringify(portfolio)); }, [portfolio]);

  const holdingsKey = Object.keys(portfolio.holdings).sort().join(',');
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) setLoading(true);
      try {
        const monitored = [symbol, ...holdingsKey.split(',').filter((id) => id && id !== symbol)];
        const results = await Promise.allSettled(monitored.map(async (id) => {
          const response = await fetch(`/api/okx?kind=market&symbol=${encodeURIComponent(id)}${id === symbol ? '' : '&tickerOnly=1'}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Falha ao receber preços da OKX');
          return response.json();
        }));
        const payload = results[0].status === 'fulfilled' ? results[0].value : null;
        if (!Number.isFinite(payload?.ticker?.last) || payload.ticker.last <= 0) throw new Error('Cotação inválida');
        if (active) {
          setMarket(payload);
          setMarketPrices(Object.fromEntries(results.filter((result) => result.status === 'fulfilled' && Number.isFinite(result.value?.ticker?.bid) && result.value.ticker.bid > 0).map((result) => [result.value.symbol, result.value.ticker.bid])));
          setMarketError('');
        }
      } catch (error) { if (active) { setMarketError(error.message); setMarket(null); setMarketPrices({}); } }
      finally { if (active) setLoading(false); }
    };
    setMarket(null);
    load();
    const timer = setInterval(load, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [symbol, holdingsKey]);

  const ticker = market?.ticker;
  const equity = equityOf(portfolio, marketPrices);
  const missingQuotes = Object.keys(portfolio.holdings).filter((id) => !marketPrices[id]).length;
  const closedCandles = useMemo(() => market?.candles?.filter((bar) => bar.closed) || [], [market]);
  const emaResult = useMemo(() => backtestStrategy(market?.candles || [], 'ema'), [market]);
  const breakoutResult = useMemo(() => backtestStrategy(market?.candles || [], 'breakout'), [market]);
  const baseline = useMemo(() => {
    if (closedCandles.length < 35) return null;
    const first = closedCandles[26].open;
    const last = closedCandles.at(-1).close;
    return { returnPct: (last / first * (1 - DEMO_FEE_RATE) ** 2 - 1) * 100, finalValue: 1000 * last / first * (1 - DEMO_FEE_RATE) ** 2 };
  }, [closedCandles]);

  function placeDemoOrder(event) {
    event.preventDefault();
    if (mode !== 'demo' || !ticker || !market || Date.now() - market.timestamp > 30000 || Date.now() - ticker.quoteTime > 60000) { setOrderMessage('Cotação desatualizada. Aguarde uma nova consulta.'); return; }
    try {
      const next = simulateSpotOrder(portfolio, { symbol, side, amount: Number(amount), bid: ticker.bid, ask: ticker.ask });
      setPortfolio(next);
      setOrderMessage(`Ordem ${side === 'buy' ? 'de compra' : 'de venda'} simulada registrada.`);
    } catch (error) { setOrderMessage(error.message); }
  }

  return <div className="crypto-shell">
    <aside className={`crypto-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="crypto-sidebar-brand"><span className="crypto-brand-mark"><Waves size={23} /></span><span><strong>ASTROBOT</strong><small>CRYPTO DESK</small></span></div>
      <div className="crypto-sidebar-caption">MERCADOS</div>
      <nav aria-label="Navegação ASTROBOT Cripto">{TABS.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setMenuOpen(false); }}><Icon size={18} />{label}<ArrowRight size={14} /></button>)}</nav>
      <div className="crypto-sidebar-bottom"><span className="crypto-live-mark"><Radio size={15} /> Mercado cripto · 24/7</span><button onClick={onPlatformPortal}><ArrowLeft size={17} /> Trocar plataforma</button></div>
    </aside>
    <div className="crypto-main">
      <header className="crypto-header"><button className="crypto-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={20} /></button><div><span className="crypto-header-eyebrow">ASTROBOT / CRIPTO</span><h2>{TABS.find((item) => item.id === tab)?.label}</h2></div><div className="crypto-header-right"><span className={`crypto-feed-status ${marketError ? 'error' : ''}`}><span />{marketError ? 'Dados indisponíveis' : loading && !market ? 'Conectando…' : 'Dados OKX'}</span><span className="crypto-mode-badge">{mode === 'demo' ? 'DEMO LOCAL' : mode === 'official' ? 'DEMO OKX' : mode === 'real' ? 'REAL · BLOQUEADO' : 'OBSERVAÇÃO'}</span></div></header>
      <main className="crypto-content">
        <div className="crypto-hero"><div><span className="crypto-eyebrow"><Beaker size={15} /> NOVO AMBIENTE, NOVA METODOLOGIA</span><h1>Trading cripto com<br /><em>controle e clareza.</em></h1><p>Dados reais da OKX, uma carteira demo separada e pesquisa antes de qualquer execução real.</p></div><div className="crypto-hero-orbit"><span>SPOT</span><strong>24<span>/</span>7</strong><small>BTC · ETH · SOL</small></div></div>
        <div className="crypto-toolbar"><div className="crypto-symbol-picker"><label htmlFor="crypto-symbol">Ativo monitorado</label><select id="crypto-symbol" value={symbol} onChange={(event) => { setSymbol(event.target.value); setOrderMessage(''); }}>{SYMBOLS.map((id) => <option key={id} value={id}>{id.replace('-', ' / ')}</option>)}</select></div><div className="crypto-mode-switch" aria-label="Modo de operação">{[['observe', 'Observação'], ['demo', 'Demo local'], ['official', 'Demo OKX'], ['real', 'Real']].map(([id, label]) => <button key={id} className={mode === id ? 'active' : ''} onClick={() => { setMode(id); setOrderMessage(''); }}>{label}</button>)}</div></div>
        {marketError && <div className="crypto-alert"><CircleHelp size={17} /> {marketError}. Sem preços válidos, ordens demo e análises são suspensas.</div>}
        {tab === 'overview' && mode === 'official' && <OkxDemoPanel symbol={symbol} />}
        {tab === 'overview' && mode !== 'official' && <>
          <section className="crypto-kpi-grid"><article><small>Preço OKX</small><strong>{currency(ticker?.last)}</strong><span className={ticker?.change24h >= 0 ? 'positive' : 'negative'}>{ticker ? percent(ticker.change24h * 100) : 'Sem cotação'} · 24h</span></article><article><small>Compra / venda</small><strong className="crypto-small-value">{currency(ticker?.ask)} <span>/</span> {currency(ticker?.bid)}</strong><span>Ask / bid · diferença de execução</span></article><article><small>Patrimônio demo</small><strong>{currency(equity)}</strong><span>Saldo livre {currency(portfolio.cash)}</span></article><article><small>Operações demo</small><strong>{portfolio.trades.length}</strong><span>{portfolio.trades.filter((trade) => trade.side === 'buy').length} compras · {portfolio.trades.filter((trade) => trade.side === 'sell').length} vendas</span></article></section>
          <div className="crypto-overview-grid"><PriceChart candles={market?.candles || []} symbol={symbol} /><div className="crypto-trade-panel"><span className="crypto-panel-label">MODO ATUAL</span><h3>{mode === 'observe' ? 'Monitorar o mercado' : mode === 'demo' ? 'Operar na carteira demo' : 'Operação real'}</h3>{mode === 'observe' ? <div className="crypto-mode-copy"><Radio size={27} /><p>Preços e velas reais, sem enviar ordens. Alterne para Demo quando quiser registrar compras e vendas simuladas.</p><button onClick={() => setMode('demo')}>Abrir modo Demo <ArrowRight size={16} /></button></div> : mode === 'real' ? <div className="crypto-mode-copy"><LockKeyhole size={27} /><p>A conexão de ordens reais ainda não está ativa. Precisamos de autenticação verificável, chaves protegidas no servidor e reconciliação de ordens antes de liberar sua conta.</p><button onClick={() => setTab('accounts')}>Ver preparação da conta <ArrowRight size={16} /></button></div> : <form onSubmit={placeDemoOrder}><p>Compra e venda spot simuladas sobre bid/ask real. A carteira fica neste navegador.</p><div className="crypto-side-toggle"><button type="button" className={side === 'buy' ? 'selected' : ''} onClick={() => setSide('buy')}>Comprar</button><button type="button" className={side === 'sell' ? 'selected' : ''} onClick={() => setSide('sell')}>Vender</button></div><label htmlFor="crypto-amount">Valor em USDT</label><input id="crypto-amount" type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><div className="crypto-order-estimate"><span>Preço indicativo</span><b>{currency(side === 'buy' ? ticker?.ask : ticker?.bid)}</b></div><div className="crypto-order-estimate"><span>Taxa hipotética · 0,10%</span><b>{currency(Number(amount) * DEMO_FEE_RATE)}</b></div><button className="crypto-submit" type="submit" disabled={!ticker}>{side === 'buy' ? 'Registrar compra demo' : 'Registrar venda demo'} <ArrowRight size={17} /></button>{orderMessage && <div className="crypto-order-message" role="status">{orderMessage}</div>}</form>}</div></div>
          <div className="crypto-info-strip"><ShieldCheck size={18} /><span>Demo local: operações hipotéticas com preços reais. Taxas são estimadas; liquidez, slippage e tarifas da sua conta podem alterar o resultado real.{missingQuotes ? ` ${missingQuotes} posição(ões) sem cotação atual usam custo médio na estimativa.` : ''}</span></div>
        </>}
        <div hidden={tab !== 'laboratory'}><CryptoResearchLab selectedSymbol={symbol} /></div>
        {tab === 'laboratory' && <><div className="crypto-section-heading"><div><span className="crypto-panel-label">CONTROLES HISTÓRICOS · M15</span><h3>Comparação rápida</h3><p>As estratégias anteriores permanecem como referência mecânica de curto prazo; o estudo H1 acima usa janelas cronológicas maiores e custos adicionais.</p></div><span className="crypto-sample-pill"><Clock3 size={15} /> {Math.max(0, closedCandles.length - 26)} velas comparadas</span></div><div className="crypto-lab-grid"><ResultCard label="Cruzamento EMA 9/21" result={emaResult} accent="mint" /><ResultCard label="Rompimento 20 velas" result={breakoutResult} accent="orange" /><article className="crypto-result-card"><small>Comprar e manter · controle</small><strong className={baseline?.returnPct >= 0 ? 'positive' : 'negative'}>{baseline ? percent(baseline.returnPct) : '—'}</strong><div><span>Valor final</span><b>{baseline ? currency(baseline.finalValue) : '—'}</b></div><div><span>Período</span><b>{baseline ? `${((closedCandles.length - 26) * 15 / 60).toFixed(1)} h` : '—'}</b></div></article></div><div className="crypto-method-note"><CircleHelp size={19} /><div><strong>Como ler este teste</strong><p>Capital hipotético de $1.000 por variante, mesmo período e taxa indicativa de 0,10% em cada execução. A amostra curta serve para verificar a mecânica; retorno positivo aqui não comprova vantagem estatística nem prevê lucro. O modo demo usa bid/ask; este laboratório usa OHLC M15 e não modela spread ou slippage.</p></div></div></>}
        {tab === 'analysis' && <><div className="crypto-section-heading"><div><span className="crypto-panel-label">SEUS DADOS LOCAIS</span><h3>Análise da carteira demo</h3><p>Saldo e operações registradas neste navegador, separados das contas Deriv e OKX.</p></div></div><section className="crypto-kpi-grid"><article><small>Capital inicial</small><strong>$1,000.00</strong><span>Carteira demo local</span></article><article><small>Patrimônio estimado</small><strong>{currency(equity)}</strong><span>Posições pelo bid mais recente</span></article><article><small>Resultado estimado</small><strong className={equity >= 1000 ? 'positive' : 'negative'}>{currency(equity - 1000)}</strong><span>Inclui posições abertas</span></article><article><small>Resultado realizado</small><strong>{currency(portfolio.trades.reduce((sum, trade) => sum + (trade.realized || 0), 0))}</strong><span>Apenas vendas executadas</span></article></section><div className="crypto-analysis-grid"><article className="crypto-analysis-card"><h4>Posições</h4>{Object.entries(portfolio.holdings).length ? Object.entries(portfolio.holdings).map(([id, holding]) => <div className="crypto-list-row" key={id}><span>{id}</span><b>{holding.qty.toFixed(6)} · médio {currency(holding.avgPrice)}</b></div>) : <p>Sem posições demo abertas.</p>}</article><article className="crypto-analysis-card"><h4>Histórico recente</h4>{portfolio.trades.length ? portfolio.trades.slice(0, 20).map((trade) => <div className="crypto-list-row" key={trade.id}><span>{trade.side === 'buy' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{trade.symbol}<small>{new Date(trade.time).toLocaleString('pt-BR')}</small></span><b>{currency(trade.amount)}{trade.realized !== null && <small className={trade.realized >= 0 ? 'positive' : 'negative'}>P/L {currency(trade.realized)}</small>}</b></div>) : <p>Ainda não há operações demo.</p>}</article></div></>}
        {tab === 'accounts' && <><div className="crypto-section-heading"><div><span className="crypto-panel-label">ACESSO E SEGURANÇA</span><h3>Contas & modos</h3><p>Quatro experiências distintas, com estados claros antes da execução real.</p></div></div><div className="crypto-account-grid"><article><Radio size={23} /><h4>Observação</h4><p>Consulta preços e históricos públicos da OKX. Não registra ordens.</p><span>Disponível agora</span><button onClick={() => { setMode('observe'); setTab('overview'); }}>Entrar em observação</button></article><article><Wallet size={23} /><h4>Demo local</h4><p>Carteira hipotética de $1.000, compra e venda spot pelo bid/ask consultado. Não usa a conta Demo da OKX.</p><span>Disponível agora</span><button onClick={() => { setMode('demo'); setTab('overview'); }}>Entrar no Demo local</button></article><article><Wallet size={23} /><h4>Demo oficial OKX</h4><p>Conta simulada conectada à OKX para consultar saldos e enviar ordens limite pequenas com uma chave Demo.</p><span>Requer chave Demo e conector configurado</span><button onClick={() => { setMode('official'); setTab('overview'); }}>Entrar na Demo OKX</button></article><article><LockKeyhole size={23} /><h4>Conta real OKX</h4><p>Interface preparada para a fase de integração privada. Nenhuma chave Real é solicitada ou guardada no navegador.</p><span>Execução bloqueada nesta etapa</span><button disabled>Conectar conta real</button></article></div><div className="crypto-method-note"><ShieldCheck size={19} /><div><strong>Próxima etapa para a conta Real</strong><p>Autenticação de usuário verificável, cofre de credenciais no servidor, limites de risco cumulativos e auditoria persistente antes de aceitar chaves e ordens reais. A Demo oficial valida conexão, saldo e estado das ordens, mas não comprova rentabilidade.</p></div></div></>}
        <footer className="crypto-footer"><span>ASTROBOT CRIPTO · PESQUISA SPOT</span><span><RefreshCw size={13} /> Atualização a cada 15 segundos · {market?.timestamp ? new Date(market.timestamp).toLocaleTimeString('pt-BR') : 'sem dados'}</span></footer>
      </main>
    </div>
  </div>;
}
