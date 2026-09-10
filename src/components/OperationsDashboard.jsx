import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, Database, FlaskConical, Play, Pause, Settings2, ShieldCheck, Wallet, ArrowRight, Radio } from 'lucide-react';
import { summarize } from '../../vps-backend/automation/research.js';
import './OperationsDashboard.css';

const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const timeOf = row => typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : Number(row.timestamp || row.epoch * 1000);
const stamp = value => value ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sem atualização';
function Status({ active, children }) { return <span className={`ops-status ${active ? 'on' : ''}`}><i />{children}</span>; }

function ResultCurve({ rows }) {
  const [hover, setHover] = useState(null);
  const values = [0, ...summarize(rows).curve.map(p => p.equity)];
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = i => 36 + i * 828 / Math.max(values.length - 1, 1), y = v => 195 - (v - min) / span * 155;
  const index = hover == null ? values.length - 1 : Math.min(hover, values.length - 1);
  if (!rows.length) return <div className="ops-empty-curve"><Activity size={30} /><h3>A curva começa com uma operação.</h3><p>Nenhum contrato liquidado nesta seleção. Observações e replays ficam no laboratório.</p></div>;
  return <div className="ops-curve">
    <div className="ops-curve-readout"><span>{index ? stamp(timeOf(rows[index - 1])) : 'Início da seleção'}</span><strong>{money(values[index])}</strong></div>
    <svg viewBox="0 0 900 235" role="img" aria-label={`Resultado acumulado de ${rows.length} contratos: ${money(values.at(-1))}`} onPointerMove={e => { const box = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - box.left) / box.width * 900 - 36) / 828 * (values.length - 1))))); }} onPointerLeave={() => setHover(null)}>
      {[0, .5, 1].map(f => <g key={f}><line x1="36" x2="864" y1={y(min + span * f)} y2={y(min + span * f)} stroke="currentColor" opacity=".12" /><text x="36" y={y(min + span * f) - 8} fill="currentColor" fontSize="11">{money(min + span * f)}</text></g>)}
      <line x1="36" x2="864" y1={y(0)} y2={y(0)} stroke="currentColor" opacity=".3" strokeDasharray="4 6" />
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={values.at(-1) < 0 ? '#ef9a9e' : '#8cd8c4'} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(index)} cy={y(values[index])} r="4" fill="#d9eee9" />
      <text x="36" y="226" fill="currentColor" fontSize="11">Primeiro contrato</text><text x="864" y="226" fill="currentColor" fontSize="11" textAnchor="end">Último contrato</text>
    </svg>
  </div>;
}

export default function OperationsDashboard({ isDemo, balance, sessionProfit, running, connected, brokerConnected, settings, continuous, research, timelineEnabled, timelineTrades, cycles, activeTrade, assets, blacklist, onAddBlacklist, onRemoveBlacklist, onStart, onStop, onResults, onNavigate, onAutomation }) {
  const [source, setSource] = useState('timeline');
  const [period, setPeriod] = useState('7');
  const [blockedSymbol, setBlockedSymbol] = useState('R_100');
  const [blockedDays, setBlockedDays] = useState(1);
  const rows = useMemo(() => {
    const cutoff = period === 'all' ? -Infinity : Date.now() - Number(period) * 86400000;
    const data = source === 'timeline' ? timelineTrades || [] : (continuous?.trades || []).filter(t => t.execution === 'live');
    return [...new Map(data.map((t, i) => [String(t.id ?? `${t.epoch}:${i}`), t])).values()]
      .filter(t => t.profit != null && Number.isFinite(Number(t.profit)) && Number.isFinite(Number(t.stake)) && Number(t.stake) > 0 && Number.isFinite(timeOf(t)) && timeOf(t) >= cutoff)
      .sort((a, b) => timeOf(a) - timeOf(b));
  }, [source, period, timelineTrades, continuous?.trades]);
  const metrics = summarize(rows);
  const missions = [...(cycles || [])].filter(c => c.active).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))).slice(0, 4);
  const positions = [activeTrade && { ...activeTrade, origin: 'Sessão / agenda', direction: activeTrade.contractType || activeTrade.direction }, continuous?.position && { ...continuous.position, origin: 'Trader contínuo' }].filter(Boolean);
  const continuousLabel = continuous?.config?.enabled ? (continuous.config.execution === 'live' ? 'Compras habilitadas' : 'Em observação') : 'Pausado';
  return <main className="ops-dashboard">
    <header className="ops-heading"><div><span className="ops-eyebrow">ASTROBOT / VISÃO GERAL</span><h1>Operações sob controle<span>.</span></h1><p>Acompanhe execução, automação e pesquisa da sua conta.</p></div><div className="ops-heading-actions"><span className={`ops-account ${isDemo ? '' : 'real'}`}>{isDemo ? 'AMBIENTE DEMO' : 'CONTA REAL'}</span><button className="ops-btn" onClick={() => onNavigate('settings')}><Settings2 size={16} /> Configurações</button></div></header>

    {!connected && <p className="ops-sync-note" role="status">Sem conexão com a VPS. Os estados e históricos abaixo refletem os últimos dados disponíveis.</p>}
    <section className="ops-kpis" aria-label="Resumo da conta">
      <article><span><Wallet size={15} /> Saldo da conta</span><strong>{connected ? money(balance) : '—'}</strong><small>{connected ? (isDemo ? 'Saldo virtual' : 'Saldo informado pela sessão') : 'Aguardando conexão com a VPS'}</small></article>
      <article><span><Activity size={15} /> Variação do saldo</span><strong className={sessionProfit < 0 ? 'loss' : ''}>{connected ? money(sessionProfit) : '—'}</strong><small>Variação registrada desde o início da sessão</small></article>
      <article><span><CalendarDays size={15} /> Missões habilitadas</span><strong>{(cycles || []).filter(c => c.active).length}<small> / {(cycles || []).length}</small></strong><small>Agendador {timelineEnabled ? 'habilitado' : 'pausado'}</small></article>
      <article><span><ShieldCheck size={15} /> Posições acompanhadas</span><strong>{positions.length}</strong><small>{positions.length ? 'Inclui confirmação pendente' : 'Nenhuma posição informada'}</small></article>
    </section>

    <section className="ops-engines" aria-label="Motores de operação">
      <article><div className="ops-engine-top"><span className="ops-icon"><CalendarDays size={19} /></span><Status active={running}>{running ? 'Em execução' : 'Pausada'}</Status></div><h2>Sessão e missões</h2><p>{settings.symbol} · {Math.max(1, Math.round(Number(settings.granularity) / 60))} min · entrada {money(settings.stakeValue)}</p><div className="ops-engine-footer"><button className="ops-link" onClick={() => onAutomation('timeline')}>Central de missões <ArrowUpRight size={15} /></button><button className={`ops-control ${running ? 'stop' : ''}`} disabled={!running && (!connected || !brokerConnected)} onClick={running ? onStop : onStart} aria-label={running ? 'Pausar operação da sessão' : 'Iniciar operação da sessão'}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Pausar sessão' : 'Iniciar sessão'}</button></div><small>Este controle não pausa a agenda nem o Trader Contínuo.</small></article>
      <article><div className="ops-engine-top"><span className="ops-icon"><Radio size={19} /></span><Status active={continuous?.config?.enabled}>{continuousLabel}</Status></div><h2>Trader Contínuo</h2><p>{continuous?.status || 'Aguardando sincronização da VPS'}</p><div className="ops-engine-footer"><button className="ops-link" onClick={() => onAutomation('continuous')}>Abrir trader <ArrowUpRight size={15} /></button><span className="ops-subtle">{continuous?.config?.symbols?.length || 0} ativos</span></div><small>Última varredura: {stamp(continuous?.lastScan)}</small></article>
      <article><div className="ops-engine-top"><span className="ops-icon"><Database size={19} /></span><Status active={research?.enabled}>{research?.enabled ? 'Coletando dados' : 'Pausado'}</Status></div><h2>Pesquisa e laboratório</h2><p>{Number(research?.ticks || 0).toLocaleString('pt-BR')} ticks · {Number(research?.proposals || 0).toLocaleString('pt-BR')} propostas registradas</p><div className="ops-engine-footer"><button className="ops-link" onClick={() => onAutomation('lab')}>Abrir laboratório <ArrowUpRight size={15} /></button><FlaskConical size={16} /></div><small>Coleta e rompimento em observação · sem compras</small></article>
    </section>

    <div className="ops-main-grid"><section className="ops-panel ops-performance"><div className="ops-panel-heading"><div><span className="ops-eyebrow">CONTRATOS LIQUIDADOS</span><h2>Evolução do resultado</h2></div><select aria-label="Período do resultado" value={period} onChange={e => setPeriod(e.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="all">Histórico carregado</option></select></div>
      <div className="ops-source-tabs" role="group" aria-label="Origem do resultado"><button aria-pressed={source === 'timeline'} onClick={() => setSource('timeline')}>Agenda / manual</button><button aria-pressed={source === 'continuous'} onClick={() => setSource('continuous')}>Trader Contínuo</button></div>
      <div className="ops-result-summary"><strong className={metrics.net < 0 ? 'loss' : ''}>{money(metrics.net)}</strong><span>{metrics.count} contratos · {metrics.wins} ganhos · {metrics.losses} perdas</span></div>
      <ResultCurve key={`${source}-${period}-${isDemo}`} rows={rows} /><footer className="ops-chart-footer"><span>Queda máxima: <b>{money(metrics.drawdown)}</b></span><span>{isDemo ? 'Execução demo' : 'Execução real'} · sem resultados de observação</span></footer>
    </section><aside className="ops-panel"><div className="ops-panel-heading"><div><span className="ops-eyebrow">EXECUÇÃO</span><h2>Estado operacional</h2></div><ShieldCheck size={19} /></div><dl className="ops-state-list"><div><dt>Conexão com a VPS</dt><dd><Status active={connected}>{connected ? 'Conectada' : 'Desconectada'}</Status></dd></div><div><dt>Autorização Deriv</dt><dd><Status active={connected && brokerConnected}>{connected && brokerConnected ? 'Confirmada' : 'Aguardando'}</Status></dd></div><div><dt>Meta da sessão</dt><dd>{money(settings.takeProfit)}</dd></div><div><dt>Stop da sessão</dt><dd>{money(settings.stopLoss)}</dd></div></dl>
      <div className="ops-risk-note"><span>Orçamento compartilhado</span><strong>{money(continuous?.lossUsed)} <small>/ {money(continuous?.config?.dailyLossLimit)}</small></strong><p>Perdas realizadas no dia UTC. As entradas abertas também consomem orçamento quando a proteção de compras está ativa.</p><button className="ops-link" onClick={() => onAutomation('continuous')}>Revisar proteção <ArrowRight size={14} /></button></div>
      <button className="ops-btn ops-wide" onClick={onResults}>Resultados da sessão <ArrowUpRight size={15} /></button>
    </aside></div>

    <div className="ops-bottom-grid"><section className="ops-panel"><div className="ops-panel-heading"><h2>Missões programadas</h2><button className="ops-link" onClick={() => onAutomation('timeline')}>Ver todas <ArrowRight size={15} /></button></div>{missions.length ? missions.map(c => <div className="ops-mission" key={c.id}><time>{c.startTime}</time><div><b>{c.name}</b><small>{c.symbol || settings.symbol} · {c.status || 'Programada'}</small></div><CalendarDays size={16} /></div>) : <p className="ops-empty-copy">Nenhuma missão habilitada. Organize seus horários na central de missões.</p>}<small className="ops-subtle">Horários configurados na agenda. A execução depende dos dias e das regras de cada missão.</small></section>
      <section className="ops-panel"><div className="ops-panel-heading"><h2>Posições e atividade</h2><Activity size={18} /></div>{positions.length ? positions.map((p, i) => <div className="ops-position" key={p.contractId || i}><div><b>{p.origin}</b><small>{p.symbol} · {p.direction} · {money(p.stake)}</small></div><span>{p.contractId || 'Confirmação pendente'}</span></div>) : <p className="ops-empty-copy">Nenhum contrato aberto informado pelos motores.</p>}{(continuous?.events || []).slice(-3).reverse().map((e, i) => <div className="ops-event" key={e.time + ':' + i}><span>{stamp(e.time)}</span><p>{e.message}</p></div>)}<div className="ops-event"><span>Última captura da pesquisa</span><p>{stamp(research?.lastCapture)}</p></div></section></div>

    <details className="ops-panel ops-advanced"><summary>Restrições da sessão <span>{blacklist.length} ativos bloqueados</span></summary><p>Ajustes da lista de bloqueio existente. Os ativos do Trader Contínuo são configurados separadamente.</p><div className="ops-block-form"><label>Ativo<select value={blockedSymbol} onChange={e => setBlockedSymbol(e.target.value)}>{assets.map(a => <option key={a.symbol} value={a.symbol}>{a.name}</option>)}</select></label><label>Duração<select value={blockedDays} onChange={e => setBlockedDays(Number(e.target.value))}>{[1, 3, 7, 30].map(n => <option key={n} value={n}>{n} dias</option>)}</select></label><button className="ops-btn" onClick={() => onAddBlacklist(blockedSymbol, blockedDays, 'Bloqueio Manual')}>Bloquear ativo</button></div>{blacklist.map(item => <div className="ops-mission" key={item.symbol}><b>{item.symbol}</b><span>Até {stamp(item.expiresAt)}</span><button className="ops-link" onClick={() => onRemoveBlacklist(item.symbol)}>Remover bloqueio de {item.symbol}</button></div>)}</details>
  </main>;
}
