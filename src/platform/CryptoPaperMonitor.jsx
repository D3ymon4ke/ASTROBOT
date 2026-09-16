import { useEffect, useState } from 'react';
import { Activity, Clock3 } from 'lucide-react';

const money = value => Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
export default function CryptoPaperMonitor({ symbol }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const response = await fetch('/api/okx?kind=research', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]), cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível consultar o coletor agora');
        const data = await response.json();
        if (!controller.signal.aborted) { setSnapshot(data); setError(''); }
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      if (!controller.signal.aborted) timer = setTimeout(load, 30000);
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const asset = snapshot?.assets?.[symbol];
  const stale = error || snapshot?.stale || (asset && (asset.error || Date.now() - asset.observedAt > 180000));
  const curve = asset?.curve || [];
  const values = curve.flatMap(p => [p.value, p.benchmark]);
  const low = Math.min(999, ...values);
  const high = Math.max(1001, ...values);
  const points = key => curve.map((p, i) => `${12 + i / Math.max(1, curve.length - 1) * 776},${158 - (p[key] - low) / (high - low) * 140}`).join(' ');
  return <section className="crypto-paper-monitor" aria-label="Simulação prospectiva persistente">
    <div className="crypto-study-head"><div><span className="crypto-panel-label">TESTE PROSPECTIVO · VPS · SOMENTE SIMULAÇÃO</span><h3>Acompanhamento contínuo H1</h3><p>Coleta independente do navegador. Cada par começa com $1.000 virtuais; uma posição comprada por par, 25% de alocação, sem alavancagem ou martingale.</p></div><span className="crypto-study-live"><Activity size={15} />{!snapshot ? 'Consultando coletor' : stale ? 'Coleta com atraso ou falha' : 'Coletor ativo'}</span></div>
    {error && <p role="status" className="crypto-alert">{error}. Último resultado, se exibido, está desatualizado.</p>}
    {asset ? <>
      <div className="crypto-study-current"><div><small>{symbol} · {asset.position ? 'POSIÇÃO VIRTUAL ABERTA' : 'SEM POSIÇÃO'}</small><strong>{asset.error || asset.status}</strong><span><Clock3 size={14} /> Início {new Date(snapshot.startedAt).toLocaleString('pt-BR')} · última coleta {asset.observedAt ? new Date(asset.observedAt).toLocaleString('pt-BR') : 'pendente'}</span></div></div>
      <div className="crypto-paper-stats">
        <article><small>Saldo marcado a mercado</small><strong>{money(asset.equity)}</strong><span className={asset.equity >= 1000 ? 'positive' : 'negative'}>Resultado {money(asset.equity - 1000)}</span></article>
        <article><small>Comprar e manter · 25%</small><strong>{money(asset.benchmarkValue)}</strong><span>Mesma data inicial e custos</span></article>
        <article><small>Trades encerrados</small><strong>{asset.closedTrades}</strong><span>{asset.wins} ganhos · {asset.closedTrades - asset.wins} perdas/empates</span></article>
        <article><small>Queda máxima observada</small><strong>{asset.drawdownPct.toFixed(2)}%</strong><span>{asset.gaps} horas ausentes · {asset.skipped} avaliações ignoradas</span></article>
      </div>
      {curve.length > 1 ? <figure className="crypto-paper-chart"><figcaption>Saldo virtual <span>— estratégia · — comprar e manter</span></figcaption><svg viewBox="0 0 800 180" role="img" aria-label="Evolução prospectiva do saldo virtual e do controle comprar e manter"><polyline points={points('benchmark')} fill="none" stroke="#98a6be" strokeWidth="2" strokeDasharray="5 5" /><polyline points={points('value')} fill="none" stroke="#61dfbb" strokeWidth="3" /></svg><div><small>{new Date(curve[0].time).toLocaleString('pt-BR')}</small><small>{new Date(curve.at(-1).time).toLocaleString('pt-BR')}</small></div></figure> : <p className="crypto-demo-history-empty">A curva aparecerá após a próxima hora de coleta. Nenhum trade histórico é lançado nesta carteira.</p>}
      {asset.trades.length > 0 && <details><summary>Últimos resultados simulados ({asset.trades.length})</summary><div className="crypto-paper-trades">{asset.trades.slice(-10).reverse().map(trade => <div key={trade.exitTime}><span>{new Date(trade.exitTime).toLocaleString('pt-BR')}{trade.delayed ? ' · saída após atraso' : ''}</span><b className={trade.net >= 0 ? 'positive' : 'negative'}>{money(trade.net)}</b></div>)}</div></details>}
    </> : <p className="crypto-demo-history-empty">Aguardando dados do serviço de simulação.</p>}
    <p className="crypto-paper-note">Entradas usam ask e saídas usam bid observados, mais 0,10% de taxa e 0,05% de impacto por lado. Avaliação a cada fechamento H1, coleta a cada minuto; saídas dependem do fechamento da vela e podem ocorrer além do limite de 2 ATR. Falhas de coleta ficam registradas. Hipótese em teste, sem rentabilidade comprovada e sem ordens Demo ou reais.</p>
  </section>;
}
