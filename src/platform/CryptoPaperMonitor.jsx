import { useEffect, useState } from 'react';
import { Activity, Clock3 } from 'lucide-react';

const money = value => Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
export default function CryptoPaperMonitor({ symbol, scalping = false }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const response = await fetch(`/api/okx?kind=research&strategy=${scalping ? 'scalp' : 'h1'}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]), cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível consultar o coletor agora');
        const data = await response.json();
        if (!controller.signal.aborted) { setSnapshot(data); setError(''); }
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      if (!controller.signal.aborted) timer = setTimeout(load, scalping ? 10000 : 30000);
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [scalping]);
  const asset = snapshot?.assets?.[symbol];
  const stale = error || snapshot?.stale || (asset && (asset.error || Date.now() - asset.observedAt > (scalping ? 30000 : 180000)));
  const initial = asset?.initialCapital ?? 1000;
  const curve = asset?.curve || [];
  const values = curve.flatMap(p => [p.value, p.benchmark]);
  const low = Math.min(initial - 1, ...values);
  const high = Math.max(initial + 1, ...values);
  const points = key => curve.map((p, i) => `${12 + i / Math.max(1, curve.length - 1) * 776},${158 - (p[key] - low) / (high - low) * 140}`).join(' ');
  return <section className="crypto-paper-monitor" aria-label="Simulação prospectiva persistente">
    <div className="crypto-study-head"><div><span className="crypto-panel-label">TESTE PROSPECTIVO · VPS · SOMENTE SIMULAÇÃO</span><h3>{scalping ? 'Scalping M5 · retomada na tendência' : 'Acompanhamento contínuo H1'}</h3><p>{scalping ? 'EMA 9/21, recuo até EMA 9 e retomada com volume. $1.000 virtuais no total, divididos entre BTC, ETH e SOL. Até 25% do caixa de cada par por entrada, sem alavancagem ou martingale. Alvo de 3 ATR, stop de 1,5 ATR e prazo máximo de 20 minutos.' : 'Coleta independente do navegador. Cada par começa com $1.000 virtuais; uma posição comprada por par, 25% de alocação, sem alavancagem ou martingale.'}</p></div><span className="crypto-study-live"><Activity size={15} />{!snapshot ? 'Consultando coletor' : stale ? 'Coleta com atraso ou falha' : 'Coletor ativo'}</span></div>
    {scalping && snapshot?.day && <div className="crypto-study-current"><div><small>META CONJUNTA DOS TRÊS ATIVOS · DIA UTC {snapshot.day.date}</small><strong>Realizado: {money(snapshot.day.realized)} / meta $5,00</strong><span>Perdas brutas: {money(snapshot.day.grossLoss)} / orçamento $5,00 · risco planejado até $1 por entrada</span><p>{snapshot.day.halted ? `${snapshot.day.reason}. Novas entradas pausadas até o próximo dia UTC; posições abertas seguem acompanhadas.` : 'Meta é um limite para pausar novas entradas, não promessa de retorno. Ganhos não repõem o orçamento de perdas.'}</p></div></div>}
    {error && <p role="status" className="crypto-alert">{error}. Último resultado, se exibido, está desatualizado.</p>}
    {asset ? <>
      <div className="crypto-study-current"><div><small>{symbol} · {asset.position ? 'POSIÇÃO VIRTUAL ABERTA' : 'SEM POSIÇÃO'}</small><strong>{asset.error || asset.status}</strong><span><Clock3 size={14} /> Início {new Date(snapshot.startedAt).toLocaleString('pt-BR')} · última coleta {asset.observedAt ? new Date(asset.observedAt).toLocaleString('pt-BR') : 'pendente'}</span></div></div>
      {scalping && asset.position && <div className="crypto-info-strip"><span>Entrada {money(asset.position.price)} · stop virtual {money(asset.position.stop)} · alvo virtual {money(asset.position.target)} · saída por prazo a partir de {new Date(asset.position.entryTime + 20 * 60000).toLocaleTimeString('pt-BR')}. Risco planejado reservado: {money(asset.position.reservedRisk)}.</span></div>}
      <div className="crypto-paper-stats">
        <article><small>Saldo marcado a mercado · {symbol}</small><strong>{money(asset.equity)}</strong><span className={asset.equity >= initial ? 'positive' : 'negative'}>Resultado {money(asset.equity - initial)}</span></article>
        <article><small>Comprar e manter · 25%</small><strong>{money(asset.benchmarkValue)}</strong><span>Mesma data inicial e custos</span></article>
        <article><small>Trades encerrados</small><strong>{asset.closedTrades}</strong><span>{asset.wins} ganhos · {asset.closedTrades - asset.wins} perdas/empates</span></article>
        <article><small>Queda máxima observada</small><strong>{asset.drawdownPct.toFixed(2)}%</strong><span>{asset.gaps} {scalping ? 'interrupções >30s' : 'horas ausentes'} · {asset.skipped} avaliações ignoradas</span></article>
      </div>
      {curve.length > 1 ? <figure className="crypto-paper-chart"><figcaption>Saldo virtual <span>— estratégia · — comprar e manter</span></figcaption><svg viewBox="0 0 800 180" role="img" aria-label="Evolução prospectiva do saldo virtual e do controle comprar e manter"><polyline points={points('benchmark')} fill="none" stroke="#98a6be" strokeWidth="2" strokeDasharray="5 5" /><polyline points={points('value')} fill="none" stroke="#61dfbb" strokeWidth="3" /></svg><div><small>{new Date(curve[0].time).toLocaleString('pt-BR')}</small><small>{new Date(curve.at(-1).time).toLocaleString('pt-BR')}</small></div></figure> : <p className="crypto-demo-history-empty">A curva aparecerá após o próximo intervalo de coleta. Nenhum trade histórico é lançado nesta carteira.</p>}
      {asset.trades.length > 0 && <details><summary>Últimos resultados simulados ({asset.trades.length})</summary><div className="crypto-paper-trades">{asset.trades.slice(-10).reverse().map(trade => <div key={trade.exitTime}><span>{new Date(trade.exitTime).toLocaleString('pt-BR')}{trade.delayed ? ' · saída após atraso' : ''}</span><b className={trade.net >= 0 ? 'positive' : 'negative'}>{money(trade.net)}</b></div>)}</div></details>}
    </> : <p className="crypto-demo-history-empty">Aguardando dados do serviço de simulação.</p>}
    <p className="crypto-paper-note">Entradas usam ask e saídas usam bid observados, mais 0,10% de taxa e 0,05% de impacto por lado. {scalping ? 'Sinais somente em fechamento M5; saídas verificadas aproximadamente a cada 10 segundos, sem reconstruir preços entre coletas. Exige recompensa líquida ≥1,2 vezes o risco e ≥2 vezes o custo de ida e volta. Spread máximo de 0,05%; intervalo de 10 minutos entre trades. Stop e orçamento podem ser excedidos em gaps. Novas entradas são bloqueadas se o patrimônio total cair abaixo de $975. Curva com pontos M5.' : 'Avaliação a cada fechamento H1, coleta a cada minuto; saídas dependem do fechamento da vela e podem ocorrer além do limite de 2 ATR.'} Falhas de coleta ficam registradas. Hipótese em teste, sem rentabilidade comprovada e sem ordens Demo ou reais.</p>
  </section>;
}
