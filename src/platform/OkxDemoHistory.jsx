import { useState } from 'react';
import { ArrowRight, History, RefreshCw } from 'lucide-react';

const amount = (value) => Number.isFinite(Number(value)) && Number(value) > 0
  ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const date = (value) => Number.isFinite(Number(value)) && Number(value) > 0
  ? new Date(Number(value)).toLocaleString('pt-BR') : '—';

export default function OkxDemoHistory({ symbol }) {
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/okx?kind=demo&symbol=${encodeURIComponent(symbol)}&view=history`, { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Histórico Demo indisponível');
      setHistory(payload);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const orders = history?.orders || [];
  const fills = history?.fills || [];
  return <section className="crypto-demo-history" aria-label="Histórico de ordens da Demo OKX">
    <div className="crypto-demo-history-head">
      <div><span className="crypto-panel-label">AUDITORIA DA CORRETORA · SOMENTE LEITURA</span><h4><History size={19} /> Histórico de execução</h4><p>Ordens concluídas e preenchimentos do par {symbol}, obtidos diretamente da Demo OKX. Ordens feitas fora do ASTROBOT também aparecem, identificadas como externas.</p></div>
      <button onClick={load} disabled={busy}>{busy ? <RefreshCw size={15} className="crypto-spin" /> : history ? <RefreshCw size={15} /> : <ArrowRight size={15} />} {busy ? 'Consultando…' : history ? 'Atualizar histórico' : 'Consultar histórico'}</button>
    </div>
    {error && <div className="crypto-alert" role="alert">{error}</div>}
    {!history && !error && <div className="crypto-demo-history-empty">Consulte o histórico para ver o estado final das ordens. Uma ordem aceita pela API pode permanecer pendente, ser parcialmente preenchida ou ser cancelada.</div>}
    {history && <>
      <div className="crypto-demo-history-metrics"><span><b>{orders.length}</b> ordens concluídas</span><span><b>{orders.filter((row) => row.state === 'filled').length}</b> preenchidas</span><span><b>{orders.filter((row) => row.origin === 'astrobot').length}</b> ASTROBOT</span><span><b>{fills.length}</b> execuções detalhadas</span></div>
      <p className="crypto-demo-history-scope">{history.scope} {history.fillsAvailable ? 'Taxas são exibidas na moeda cobrada.' : 'Detalhes de preenchimento indisponíveis nesta consulta.'} Estes números não representam lucro ou vantagem da estratégia.</p>
      {orders.length ? <div className="crypto-demo-history-list">{orders.map((order) => {
        const orderFills = fills.filter((fill) => fill.brokerId === order.brokerId);
        return <article key={order.brokerId || order.clientId} className="crypto-demo-history-row">
          <div className="crypto-demo-history-row-top"><strong>{order.side === 'buy' ? 'Compra' : 'Venda'} · {order.state === 'filled' ? 'preenchida' : order.state === 'canceled' ? 'cancelada' : order.state}</strong><span className={order.origin === 'astrobot' ? 'astrobot' : ''}>{order.origin === 'astrobot' ? 'ASTROBOT' : 'Externa'}</span></div>
          <div className="crypto-demo-history-row-detail"><span>Preenchido <b>{order.filled || '0'} / {order.quantity || '—'}</b></span><span>Preço médio <b>{amount(order.averagePrice)}</b></span><span>Limite <b>{amount(order.limitPrice)}</b></span><span>Atualização <b>{date(order.updatedAt)}</b></span></div>
          {orderFills.length > 0 && <div className="crypto-demo-history-fills">{orderFills.map((fill) => <small key={fill.tradeId || `${fill.filledAt}-${fill.quantity}`}>Execução {fill.quantity} @ {amount(fill.price)} · taxa {fill.fee || '0'} {fill.feeCurrency || '—'} · {date(fill.filledAt)}</small>)}</div>}
        </article>;
      })}</div> : <div className="crypto-demo-history-empty">Nenhuma ordem concluída encontrada para {symbol} nesta janela da OKX.</div>}
    </>}
  </section>;
}
