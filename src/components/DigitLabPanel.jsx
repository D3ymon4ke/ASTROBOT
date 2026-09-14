import React, { useState } from 'react';
import { Play, Pause, Download, FlaskConical } from 'lucide-react';
import { EVIDENCE_VERSION, LAB_ARMS, LAB_DEFAULTS, metrics } from '../../vps-backend/automation/evidenceStrategies.js';
import './EvidenceLab.css';
import RangeResearchPanel from './RangeResearchPanel.jsx';
const money = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const pct = n => n == null ? '—' : `${n.toFixed(1)}%`;
const colors = ['#71d5c2', '#8896b2', '#baacff', '#ecbc76'];
export default function DigitLabPanel({ state, available, pending, onConfigure }) {
  const [view, setView] = useState('research'), [arm, setArm] = useState('all');
  const ready = state?.version === EVIDENCE_VERSION, config = ready ? state.config : LAB_DEFAULTS;
  const rows = (ready ? state.trades : []) || [];
  const visible = rows.filter(r => (view === 'research' || r.allocated) && (arm === 'all' || r.arm === arm));
  const totals = metrics(visible);
  const curves = LAB_ARMS.filter(a => arm === 'all' || a.id === arm).map(a => {
    let sum = 0;
    const data = visible.filter(r => r.arm === a.id).sort((a, b) => a.timestamp - b.timestamp);
    return { ...a, values: [{ time: data[0]?.timestamp || state?.startedAt || Date.now(), sum: 0 }, ...data.map(r => ({ time: r.timestamp, sum: sum += r.profit }))] };
  });
  const points = curves.flatMap(c => c.values), low = Math.min(0, ...points.map(p => p.sum)), high = Math.max(0, ...points.map(p => p.sum));
  const start = Math.min(...points.map(p => p.time)), end = Math.max(start + 1, ...points.map(p => p.time));
  const y = value => 175 - (value - low) / (high - low || 1) * 145;
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...state, exportScope: 'Janela retida pelo painel; carteiras incluem todo o experimento', exportedAt: Date.now() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'astrobot-laboratorio-evidencia.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="evidence-lab">
    <div className="workspace-heading"><div><span className="workspace-eyebrow">PESQUISA PROSPECTIVA</span><h1>Laboratório de Evidência<span>.</span></h1><p>Novos testes Range Break e históricos comparáveis. Somente simulação.</p></div><div className="evidence-actions">
      <button className="workspace-button" disabled={!ready} onClick={download}><Download size={16}/>Exportar evidências</button>
      <button className="workspace-button primary" disabled={!ready || !available || pending} onClick={() => onConfigure({ enabled: !config.enabled })}>{config.enabled ? <Pause size={16}/> : <Play size={16}/>} {config.enabled ? 'Pausar pesquisa' : 'Iniciar pesquisa simulada'}</button>
    </div></div>
    <section className="aut-card evidence-status"><FlaskConical size={22}/><div><strong>{ready ? state.status : 'Aguardando atualização do laboratório na VPS'}</strong><p>Dados e cotações da Deriv · execução indicativa · nenhuma compra real</p></div><span>{state?.lastScan ? `Atualizado ${new Date(state.lastScan).toLocaleTimeString()}` : 'Sem coleta nesta versão'}</span></section>
    <RangeResearchPanel state={state?.rangeResearch}/>
    <h2>Experimentos anteriores · dígitos e Rise/Fall</h2>
    <div className="evidence-rules"><span>{money(config.initialBank)} por carteira</span><span>Entrada fixa: {money(config.stake)}</span><span>Perdas brutas/dia: {money(config.dailyLossLimit)}</span><span>Drawdown máximo: {money(config.maxDrawdown)}</span><span>Sem martingale</span></div>
    <section className="aut-card"><div className="evidence-filters"><label>Resultados<select aria-label="Resultados" value={view} onChange={e => setView(e.target.value)}><option value="research">Pesquisa · todos os sinais simulados</option><option value="portfolio">Carteiras · somente entradas aprovadas</option></select></label><label>Experimento<select aria-label="Experimento" value={arm} onChange={e => setArm(e.target.value)}><option value="all">Comparar os quatro</option>{LAB_ARMS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
      <p className="evidence-note">A pesquisa continua quando uma carteira está bloqueada. Cada carteira exige 200 resultados novos por ativo, modalidade e estratégia, duas metades positivas e limite inferior de Wilson de 99% acima do equilíbrio do payout + 2 pontos. É um filtro experimental, sujeito a correlação e testes repetidos; não comprova rentabilidade.</p>
      <div className="aut-metrics"><article><span>Contratos nesta janela</span><strong>{totals.count}</strong><small>Até 1.500 registros recentes no painel</small></article><article><span>Resultado da seleção</span><strong className={totals.net < 0 ? 'negative' : 'positive'}>{money(totals.net)}</strong><small>Soma de experimentos independentes</small></article><article><span>Acerto por contrato</span><strong>{pct(totals.winRate)}</strong><small>{totals.wins} vitórias · {totals.count - totals.wins} perdas</small></article><article><span>Retorno sobre entradas</span><strong>{pct(totals.roi)}</strong><small>Acerto alto, sozinho, não demonstra lucro</small></article></div>
      <div className="aut-equity"><div><b>Resultados lado a lado · mesma escala de tempo</b><span>{money(low)} a {money(high)}</span></div>{visible.length ? <svg viewBox="0 0 800 200" role="img" aria-label="Comparação dos resultados simulados"><line x1="20" x2="780" y1={y(0)} y2={y(0)} stroke="#ffffff30"/>{curves.map(c => <polyline key={c.id} points={c.values.map(p => `${20 + (p.time - start) / (end - start) * 760},${y(p.sum)}`).join(' ')} fill="none" stroke={colors[LAB_ARMS.findIndex(a => a.id === c.id)]} strokeWidth="2"/>)}</svg> : <p>{view === 'portfolio' ? 'Nenhuma entrada aprovada nesta janela. A pesquisa continua coletando evidências.' : 'Os resultados aparecerão após a apuração dos primeiros ticks.'}</p>}</div>
    </section>
    <div className="evidence-cards">{LAB_ARMS.map((a, i) => {
      const m = metrics(rows.filter(r => r.arm === a.id)), l = state?.ledgers?.[a.id];
      const gates = Object.entries(state?.matrix || {}).filter(([key]) => key.startsWith(a.id + ':'));
      return <section className="aut-card" key={a.id} style={{ borderTopColor: colors[i] }}><span className="workspace-eyebrow" style={{ color: colors[i] }}>{a.unit === 't' ? 'DÍGITOS · 1 TICK' : `RISE / FALL · ${a.duration} MIN`}</span><h2>{a.name}</h2><p>{a.description}</p><div className="evidence-pair"><span>Pesquisa recente<strong className={m.net < 0 ? 'negative' : 'positive'}>{money(m.net)}</strong><small>{m.count} contratos · {pct(m.winRate)} acerto</small></span><span>Carteira desde o início<strong>{money(l?.bank ?? config.initialBank)}</strong><small>{l?.count || 0} entradas aprovadas · queda {money(l?.drawdown)}</small></span></div>{gates.map(([key, g]) => <div className="evidence-gate" key={key}><b>{key.split(':')[1]} · {g.contractType}</b><span>{g.count}/200 resultados · limite inferior {pct(g.lower * 100)} · equilíbrio {pct(g.breakEven * 100)}</span><small>{a.id === 'digit_control' ? 'Controle: sem alocação' : g.qualified ? 'Filtro estatístico aprovado; sujeito ao orçamento' : 'Em pesquisa · sem vantagem demonstrada'}</small></div>)}{!gates.length && <small>Aguardando a primeira oportunidade válida.</small>}</section>;
    })}</div>
    <section className="aut-card"><h2>Históricos anteriores preservados</h2><p>Quântico: {state?.legacy?.quantum?.count || 0} contratos retidos · {money(state?.legacy?.quantum?.net)}. Fakegale V2: {state?.legacy?.fakegale?.count || 0} contratos retidos · {money(state?.legacy?.fakegale?.net)}.</p><p>Esses registros não treinam nem compõem os resultados novos. O Fakegale antigo contém experimentos sobrepostos e gales; o Quântico antigo usava uma aproximação incorreta de ticks. Os valores não equivalem a perdas reais de conta.</p></section>
    <section className="aut-card"><h2>Apuração e eventos</h2><p>{state?.pending?.length || 0} contratos de pesquisa aguardando resultado. Entrada hipotética no primeiro tick após cotação + 1 segundo; dígitos apurados pelo número de ticks, com precisão oficial do ativo. Ticks ausentes são excluídos.</p><div className="aut-events">{[...(state?.events || [])].reverse().slice(0, 10).map((e, i) => <div key={`${e.time}:${i}`}><time>{new Date(e.time).toLocaleTimeString()}</time><span>{e.message}</span></div>)}</div></section>
  </div>;
}
