import React, { useState } from 'react';
import { Activity, Archive, ArrowRight, BarChart3, CircleHelp, FlaskConical, ShieldCheck, Wallet } from 'lucide-react';
import { OPTIONS_ARMS } from '../../vps-backend/automation/optionsStrategies.js';
import { metrics } from '../../vps-backend/automation/evidenceStrategies.js';
import ResearchPulse from './ResearchPulse.jsx';
import LiveLearningNetwork from './LiveLearningNetwork.jsx';
import './OptionsStudy.css';

const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const colors = ['#71d5c2', '#baacff', '#67a7ff'];
const variant = {
  forex_pullback: { code: 'FILTRO', detail: 'Espera um recuo em M5 e a retomada na direção da tendência M15.' },
  forex_control: { code: 'REFERÊNCIA', detail: 'Simula a tendência M15 sem exigir recuo. Serve de comparação para o filtro.' },
  forex_adaptive: { code: 'EM APRENDIZADO', detail: 'Aprende após o vencimento do controle; só testa sua seleção ao cumprir o mínimo de evidência.' },
  reset_bias: { code: 'HIPÓTESE', detail: 'CALL no Bull e PUT no Bear: segue o viés descrito para esses índices.' },
  reset_contra: { code: 'CONTROLE', detail: 'PUT no Bull e CALL no Bear: mede o resultado da direção oposta.' }
};
const studies = {
  forex: { number: '01', title: 'Forex', assets: 'EUR/USD · GBP/USD', cadence: 'SEG–SEX · 07–17 UTC',
    description: 'O teste procura tendência em M15 e confere a entrada em M5. A retomada é comparada com a tendência sem recuo. Cada hipótese usa Rise/Fall de 15 minutos e stake indicativa de US$0,50.',
    steps: ['Tendência M15', 'Confirmação M5', 'Apuração em 15 min'], reference: 'forex_control', chart: 'Forex: retomada e referência',
    reading: 'Uma retomada só melhora a estratégia se superar o controle em retorno por contrato, com amostra suficiente. A rede aprende apenas depois de um resultado encerrado.' },
  reset: { number: '02', title: 'Daily Reset', assets: 'Bull · Bear', cadence: 'MERCADO 24/7',
    description: 'Comparamos o viés direcional dos índices Bull/Bear com a direção contrária. As duas cotações têm payouts próprios; cada hipótese usa Rise/Fall de 15 minutos e stake indicativa de US$0,50.',
    steps: ['Cotar os dois lados', 'Entrada futura comum', 'Comparar após 15 min'], reference: 'reset_bias', chart: 'Daily Reset: viés versus direção oposta',
    reading: 'O payout do lado favorecido costuma ser menor. Acerto alto, sozinho, não significa lucro: compare resultado líquido e tamanho da amostra. A coleta pausa perto do reset diário.' }
};

function Curves({ arms, rows, title }) {
  const series = arms.map(arm => {
    let total = 0;
    const data = rows.filter(row => row.arm === arm.id).sort((a, b) => a.timestamp - b.timestamp);
    return [{ time: data[0]?.timestamp || 0, value: 0 }, ...data.map(row => ({ time: row.timestamp, value: total += row.profit }))];
  });
  const points = series.filter(line => line.length > 1).flat();
  if (!points.length) return <div className="study-chart study-chart-empty"><div className="study-chart-empty-icon"><BarChart3 size={22}/></div><div><strong>Curva ainda sem contratos encerrados</strong><p>O gráfico aparece após a primeira apuração nesta visualização. Uma varredura ou proposta pendente ainda não é um resultado.</p></div></div>;
  const low = Math.min(0, ...points.map(point => point.value)), high = Math.max(0, ...points.map(point => point.value));
  const start = Math.min(...points.map(point => point.time)), end = Math.max(start + 1, ...points.map(point => point.time));
  return <div className="aut-equity study-chart"><div><b>{title}</b><span>{money(low)} a {money(high)}</span></div><svg viewBox="0 0 800 200" role="img" aria-label={title}>
    <line x1="20" x2="780" y1={175 - (0 - low) / (high - low || 1) * 145} y2={175 - (0 - low) / (high - low || 1) * 145} stroke="#ffffff30"/>
    {series.map((line, index) => line.length > 1 ? <polyline key={arms[index].id} fill="none" stroke={colors[index]} strokeWidth="2.5" points={line.map(point => `${(20 + (point.time - start) / (end - start) * 760).toFixed(2)},${(175 - (point.value - low) / (high - low || 1) * 145).toFixed(2)}`).join(' ')}/> : null)}
  </svg><div className="study-chart-legend">{arms.map((arm, index) => <span key={arm.id}><i style={{ background: colors[index] }}/>{arm.name}</span>)}</div></div>;
}

function StudySection({ family, rows, state, scope }) {
  const study = studies[family], arms = OPTIONS_ARMS.filter(arm => arm.family === family);
  const selected = rows.filter(row => arms.some(arm => arm.id === row.arm));
  const referenceCount = selected.filter(row => row.arm === study.reference).length;
  const pendingCount = (state?.positions || []).filter(position => position.family === family).length;
  return <section className={`market-study market-study-${family}`} aria-label={`Estudo ${study.title}`}>
    <div className="market-study-head"><div className="market-study-index">{study.number}</div><div className="market-study-heading"><span className="workspace-eyebrow">ESTUDO ATIVO · {study.cadence}</span><h3>{study.title}<span>{study.assets}</span></h3><p>{study.description}</p></div><div className="market-study-count"><strong>{referenceCount}</strong><span>{family === 'reset' ? 'pares apurados' : 'sinais de referência'}</span><small>{pendingCount ? `${pendingCount} em apuração` : 'Nenhuma posição pendente'}</small></div></div>
    <div className="study-flow" aria-label={`Etapas do estudo ${study.title}`}>{study.steps.map((step, index) => <React.Fragment key={step}><span><b>{index + 1}</b>{step}</span>{index < 2 && <ArrowRight size={15} aria-hidden="true"/>}</React.Fragment>)}</div>
    <div className="study-cards">{arms.map((arm, index) => {
      const detail = variant[arm.id], result = metrics(selected.filter(row => row.arm === arm.id)), ledger = state?.ledgers?.[arm.id];
      const sample = result.count > 0, allocated = ledger?.count || 0;
      const stateLabel = arm.id === 'forex_adaptive' && !sample ? `Aprendizado ${state?.learning?.samples || 0}/100` : sample ? `${result.count} contrato${result.count === 1 ? '' : 's'} apurado${result.count === 1 ? '' : 's'}` : 'Aguardando primeiro resultado';
      return <article key={arm.id} className="study-arm" style={{ '--study-accent': colors[index] }}><div className="study-arm-top"><span>{detail.code}</span><span className={sample ? 'study-arm-state is-active' : 'study-arm-state'}>{stateLabel}</span></div><h4>{arm.name}</h4><p>{detail.detail}</p><div className="study-arm-results"><div><span>Resultado {scope === 'wallet' ? 'alocado' : 'de pesquisa'}</span><strong className={!sample ? 'is-empty' : result.net < 0 ? 'negative' : result.net > 0 ? 'positive' : ''}>{sample ? money(result.net) : '—'}</strong><small>{sample ? `${result.winRate.toFixed(1)}% de acerto · ${money(result.net / result.count)} por contrato` : 'Sem apuração nesta visualização'}</small></div><div><span>Carteira da variante</span><strong>{money(ledger?.bank ?? 100)}</strong><small>{allocated ? `${allocated} alocações · queda ${money(ledger?.drawdown)}` : 'US$100 iniciais · nenhuma alocação'}</small></div></div></article>;
    })}</div>
    <Curves arms={arms} rows={selected} title={study.chart}/>
    <div className="study-reading"><CircleHelp size={17} aria-hidden="true"/><p><strong>Como interpretar:</strong> {study.reading}</p></div>
  </section>;
}

export default function OptionsResearchPanel({ state }) {
  const [scope, setScope] = useState('research');
  const all = state?.trades || [], rows = all.filter(row => scope === 'research' || row.allocated);
  return <section className="aut-card options-workspace">
    <div className="options-intro"><div><span className="workspace-eyebrow">MESA DE PESQUISA · AO VIVO</span><h2>Forex e Daily Reset, lado a lado</h2><p>Hipóteses em simulação, com stake fixa. {state?.lastScan ? `Última coleta: ${new Date(state.lastScan).toLocaleTimeString()}` : 'Aguardando primeira coleta na VPS.'}</p></div><span className="simulation-seal">SIMULAÇÃO<br/>SEM COMPRAS</span></div>
    <ResearchPulse state={state}/>
    <LiveLearningNetwork state={state}/>
    <section className="study-toolbar" aria-label="Visualização dos resultados"><div className="study-toolbar-intro"><span className="workspace-eyebrow">COMO LER OS RESULTADOS</span><h3>Escolha a visão dos contratos</h3><p>Pesquisa inclui todos os sinais apurados. Carteiras mostra somente entradas que receberam orçamento de risco.</p></div><div className="study-toggle" role="group" aria-label="Escopo dos novos testes"><button type="button" aria-pressed={scope === 'research'} onClick={() => setScope('research')}><FlaskConical size={16}/><span>Pesquisa<small>Todos os resultados</small></span></button><button type="button" aria-pressed={scope === 'wallet'} onClick={() => setScope('wallet')}><Wallet size={16}/><span>Carteiras<small>Somente alocadas</small></span></button></div><div className="study-limits"><span><Wallet size={14}/> US$100 iniciais</span><span><ShieldCheck size={14}/> US$3 perda/dia</span><span><Activity size={14}/> US$15 queda máxima</span></div><p className="study-toolbar-foot">A carteira exibida em cada cartão é cumulativa para a variante. Os gráficos usam até 300 registros recentes por variante. Nenhum resultado atual comprova rentabilidade.</p></section>
    <StudySection family="forex" rows={rows} state={state} scope={scope}/>
    <StudySection family="reset" rows={rows} state={state} scope={scope}/>
    <details className="study-archive"><summary><span><Archive size={18}/> <b>Arquivo de testes encerrados</b><small>Accumulator · histórico preservado, sem novas propostas</small></span><span className="study-archive-action">Ver resultados</span></summary><div className="study-archive-body"><p>As variantes de 3 e 5 ticks terminaram com resultado líquido negativo. O histórico permanece para auditoria e não entra nas curvas acima.</p><div className="study-archive-cards">{OPTIONS_ARMS.filter(arm => arm.retired).map(arm => { const result = metrics(all.filter(row => row.arm === arm.id)); return <article key={arm.id}><span>{arm.name}</span><strong className={result.net < 0 ? 'negative' : ''}>{money(result.net)}</strong><small>{result.count} contratos · {result.winRate?.toFixed(1) || '—'}% acerto</small></article>; })}</div></div></details>
    <div className="aut-events study-events">{Object.entries(state?.scans || {}).map(([key, value]) => <p key={key}><b>{key}</b> · {value}</p>)}</div>
    {(state?.positions || []).map(position => <p key={position.id}><b>{position.symbol}</b> · {position.blocked || 'Simulação aguardando apuração'} · {position.legs.filter(leg => !leg.done && leg.allocated).length} reservas</p>)}
    <p className="evidence-note">Dados ausentes ou ambíguos mantêm a posição pendente e o risco reservado. Não fabricamos wins ou losses. As cotações são modelos indicativos, sem contrato comprado na Deriv.</p>
  </section>;
}
