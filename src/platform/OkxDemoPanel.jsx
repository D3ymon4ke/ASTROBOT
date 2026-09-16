import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CircleHelp, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import OkxDemoHistory from './OkxDemoHistory.jsx';

const money = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

async function requestDemo(method, body, symbol) {
  const url = `/api/okx?kind=demo${method === 'GET' ? `&symbol=${encodeURIComponent(symbol)}` : ''}`;
  const response = await fetch(url, { method, credentials: 'same-origin', headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error || 'Falha na conexão Demo OKX'), { status: response.status, payload });
  return payload;
}

export default function OkxDemoPanel({ symbol }) {
  const [connection, setConnection] = useState(null);
  const [credentials, setCredentials] = useState({ key: '', secret: '', passphrase: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [side, setSide] = useState('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lastOrder, setLastOrder] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await requestDemo('GET', null, symbol);
      setConnection(data);
      setError('');
    } catch (failure) {
      if (failure.status === 401) setConnection(null);
      else setError(failure.message);
    }
  }, [symbol]);

  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, [refresh]);

  async function connect(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const connected = await requestDemo('POST', { action: 'connect', ...credentials }, symbol);
      setConnection(connected);
      await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setCredentials({ key: '', secret: '', passphrase: '' }); setBusy(false); }
  }

  async function disconnect() {
    setBusy(true);
    try { await requestDemo('DELETE', null, symbol); setConnection(null); setLastOrder(null); setError(''); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function place(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await requestDemo('POST', { action: 'order', symbol, side, price, quantity }, symbol);
      setLastOrder({ ...result, symbol });
      await refresh();
    } catch (failure) {
      setError(failure.message);
      if (failure.payload?.clientId) setLastOrder({ ...failure.payload, symbol });
    } finally { setBusy(false); }
  }

  async function lookup(clientId, orderSymbol = symbol) {
    setBusy(true); setError('');
    try {
      const result = await requestDemo('POST', { action: 'lookup', symbol: orderSymbol, clientId }, orderSymbol);
      setLastOrder({ ...result, symbol: orderSymbol });
      await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function cancel(clientId, orderSymbol = symbol) {
    setBusy(true); setError('');
    try {
      const result = await requestDemo('POST', { action: 'cancel', symbol: orderSymbol, clientId }, orderSymbol);
      setLastOrder({ ...result, symbol: orderSymbol });
      await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const quote = connection?.ticker;
  const assets = connection?.balances || [];
  const base = symbol.split('-')[0];
  const usdt = assets.find((row) => row.ccy === 'USDT');
  const asset = assets.find((row) => row.ccy === base);
  const validQuote = quote?.last > 0 && Date.now() - quote.quoteTime < 60000;

  return <section className="crypto-official-demo">
    <div className="crypto-section-heading"><div><span className="crypto-panel-label">CORRETORA CONECTADA · AMBIENTE SIMULADO</span><h3>Demo oficial da OKX</h3><p>Saldo e ordens vêm da conta Demo da corretora. Esta área não usa a carteira Demo local.</p></div><span className="crypto-sample-pill"><Wallet size={15} /> {connection ? 'Conta conectada' : 'Aguardando conexão'}</span></div>
    <div className="crypto-info-strip"><CircleHelp size={18} /><span>A OKX informa que o mercado Demo pode ter preços diferentes do mercado Real. Use esta conta para conferir integração e execução; avalie estratégias separadamente com dados reais.</span></div>
    {!connection ? <div className="crypto-demo-connect">
      <div><LockKeyhole size={30} /><h4>Conectar com chave da Demo OKX</h4><p>Na OKX, abra <b>Trade → Demo Trading → Personal Center → Demo Trading API</b> e crie uma chave somente para a Demo com Read e, se desejar testar ordens, Trade. Uma chave da conta Real não funciona aqui. Em produção, use HTTPS: o servidor sela as credenciais em um cookie cifrado de até uma hora, sem gravá-las no armazenamento local.</p><a href="https://www.okx.com/docs-v5/en/" target="_blank" rel="noreferrer">Instruções oficiais da API Demo <ExternalLink size={15} /></a></div>
      <form onSubmit={connect}><label htmlFor="okx-demo-key">API key Demo</label><input id="okx-demo-key" required type="password" autoComplete="off" value={credentials.key} onChange={(event) => setCredentials({ ...credentials, key: event.target.value })} /><label htmlFor="okx-demo-secret">Secret key</label><input id="okx-demo-secret" required type="password" autoComplete="off" value={credentials.secret} onChange={(event) => setCredentials({ ...credentials, secret: event.target.value })} /><label htmlFor="okx-demo-pass">Passphrase</label><input id="okx-demo-pass" required type="password" autoComplete="off" value={credentials.passphrase} onChange={(event) => setCredentials({ ...credentials, passphrase: event.target.value })} /><button className="crypto-submit" disabled={busy} type="submit">{busy ? 'Verificando…' : 'Conectar Demo oficial'} <ArrowRight size={17} /></button></form>
    </div> : <>
      <div className="crypto-demo-head"><span><ShieldCheck size={17} /> {connection.canTrade ? 'Demo OKX · Read + Trade' : 'Demo OKX · somente leitura'}</span><button onClick={refresh} disabled={busy}><RefreshCw size={15} /> Atualizar</button><button onClick={disconnect} disabled={busy}>Desconectar</button></div>
      <div className="crypto-demo-grid"><article className="crypto-analysis-card"><h4>Saldo disponível</h4><div className="crypto-list-row"><span>USDT</span><b>{money(usdt?.available)}</b></div><div className="crypto-list-row"><span>{base}</span><b>{asset?.available ?? '0'}</b></div><small>Saldo da conta Demo da OKX, atualizado pela API privada.</small></article><article className="crypto-analysis-card"><h4>Cotação do mercado Demo</h4><strong>{money(quote?.last)}</strong><div className="crypto-list-row"><span>Bid / ask Demo</span><b>{money(quote?.bid)} / {money(quote?.ask)}</b></div><small>Incrementos: lote {connection.instrument?.lotSize || '—'}, preço {connection.instrument?.tickSize || '—'} · mínimo {connection.instrument?.minSize || '—'}</small></article></div>
      <div className="crypto-demo-grid"><form className="crypto-demo-order crypto-analysis-card" onSubmit={place}><h4>Ordem limite spot · Demo</h4><p>Valor de $1 a $25, uma ordem pendente por par. Compra e venda apenas de ativos disponíveis; sem market order nem margem.</p><div className="crypto-side-toggle"><button type="button" className={side === 'buy' ? 'selected' : ''} onClick={() => setSide('buy')}>Comprar</button><button type="button" className={side === 'sell' ? 'selected' : ''} onClick={() => setSide('sell')}>Vender</button></div><label htmlFor="okx-demo-price">Preço limite (USDT)</label><input id="okx-demo-price" required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder={String(quote?.last || '')} /><label htmlFor="okx-demo-qty">Quantidade ({base})</label><input id="okx-demo-qty" required inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={connection.instrument?.minSize || ''} /><div className="crypto-order-estimate"><span>Valor estimado</span><b>{money(Number(price) * Number(quantity))}</b></div><button className="crypto-submit" disabled={busy || !connection.canTrade || !validQuote} type="submit">{busy ? 'Consultando…' : 'Enviar ordem limite Demo'} <ArrowRight size={17} /></button></form><article className="crypto-analysis-card"><h4>Ordens do par</h4>{connection.orders?.length ? connection.orders.map((order) => <div className="crypto-demo-order-row" key={order.clientId || order.brokerId}><b>{order.side === 'buy' ? 'Compra' : 'Venda'} · {order.state}</b><small>{order.quantity} {base} @ {money(order.price)} · preenchido {order.filled || 0}</small>{/^AstroD[0-9a-f]{20}$/.test(order.clientId || '') && <div><button onClick={() => lookup(order.clientId, order.symbol)} disabled={busy}>Consultar</button><button onClick={() => cancel(order.clientId, order.symbol)} disabled={busy}>Cancelar</button></div>}</div>) : <p>Sem ordens pendentes neste par.</p>}{lastOrder && <div className="crypto-demo-last-order" role="status"><b>Última ordem: {lastOrder.status}</b><small>ID {lastOrder.clientId}</small><button onClick={() => lookup(lastOrder.clientId, lastOrder.symbol)} disabled={busy}>Consultar estado na OKX</button></div>}</article></div>
      <OkxDemoHistory key={symbol} symbol={symbol} />
    </>}
    {error && <div className="crypto-alert" role="alert"><CircleHelp size={17} /> {error}</div>}
  </section>;
}
