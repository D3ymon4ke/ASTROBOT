import React, { useState } from 'react';
import { OPTIONS_ARMS } from '../../vps-backend/automation/optionsStrategies.js';
import { metrics } from '../../vps-backend/automation/evidenceStrategies.js';
import ResearchPulse from './ResearchPulse.jsx';
import LiveLearningNetwork from './LiveLearningNetwork.jsx';
const money = value => Number(value || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
const colors = ['#71d5c2','#baacff','#67a7ff'];
function Curves({ arms, rows, title }) {
  const series = arms.map(a=>{
    let sum=0;
    const data=rows.filter(r=>r.arm===a.id).sort((a,b)=>a.timestamp-b.timestamp);
    return [{time:data[0]?.timestamp||0,value:0},...data.map(r=>({time:r.timestamp,value:sum+=r.profit}))];
  });
  const points=series.filter(s=>s.length>1).flat();
  if(!points.length)return <p>Sem operações apuradas nesta seleção. O gráfico será preenchido por dados novos.</p>;
  const low=Math.min(0,...points.map(p=>p.value)), high=Math.max(0,...points.map(p=>p.value));
  const start=Math.min(...points.map(p=>p.time)),end=Math.max(start+1,...points.map(p=>p.time));
  return <div className="aut-equity"><div><b>{title}</b><span>{money(low)} a {money(high)}</span></div><svg viewBox="0 0 800 200" role="img" aria-label={title}>
    <line x1="20" x2="780" y1={175-(0-low)/(high-low||1)*145} y2={175-(0-low)/(high-low||1)*145} stroke="#ffffff30"/>
    {series.map((s,i)=>s.length>1?<polyline key={arms[i].id} fill="none" stroke={colors[i]} strokeWidth="2" points={s.map(p=>`${(20+(p.time-start)/(end-start)*760).toFixed(2)},${(175-(p.value-low)/(high-low||1)*145).toFixed(2)}`).join(' ')}/>:null)}
  </svg></div>;
}
export default function OptionsResearchPanel({ state }) {
  const [scope,setScope]=useState('research');
  const all=state?.trades||[], rows=all.filter(r=>scope==='research'||r.allocated);
  return <section className="aut-card options-workspace">
    <div className="options-intro"><div><span className="workspace-eyebrow">MESA DE PESQUISA · AO VIVO</span><h2>Forex corrigido e Daily Reset Bull/Bear</h2><p>Somente simulação, com stakes fixas. {state?.lastScan?`Última coleta: ${new Date(state.lastScan).toLocaleTimeString()}`:'Aguardando primeira coleta na VPS.'}</p></div><span className="simulation-seal">SIMULAÇÃO<br/>SEM COMPRAS</span></div>
    <ResearchPulse state={state}/>
    <LiveLearningNetwork state={state}/>
    <div className="evidence-filters"><label>Escopo dos novos testes<select aria-label="Escopo dos novos testes" value={scope} onChange={e=>setScope(e.target.value)}><option value="research">Pesquisa · todos os sinais</option><option value="wallet">Carteiras · com orçamento de risco</option></select></label></div>
    <p className="evidence-note">Carteiras independentes de $100, perda bruta diária de $3 e drawdown máximo de $15. A pesquisa continua coletando quando o orçamento de uma carteira bloqueia alocações. Até 300 registros por variante no painel; saldos são cumulativos. Nenhum teste comprova rentabilidade.</p>
    {['forex','reset'].map(family=>{
      const arms=OPTIONS_ARMS.filter(a=>a.family===family);
      const selected=rows.filter(r=>arms.some(a=>a.id===r.arm));
      return <div key={family} style={{marginTop:24}}><h3>{family==='forex'?'Forex · EUR/USD e GBP/USD':'Daily Reset · Bull e Bear · 24/7'}</h3>
        <p>{family==='forex'?'Tendência EMA 8/20 em 24 velas M15 e controle causal em 15 velas M5. Retomada após recuo é comparada ao controle sem recuo. Rise/Fall de 15 minutos, stake indicativa de $0.50. Segunda a sexta, 07–17 UTC. A rede aprende apenas com o resultado encerrado do controle.':'Os índices Bull e Bear têm tendência embutida e reinício diário. Comparamos direção do viés e oposta em contratos Rise/Fall de 15 minutos, $0.50 por hipótese, com payouts próprios. A pesquisa pausa perto de 00:00 UTC para não cruzar o reset. Sem progressão de stake.'}</p>
        <div className="evidence-cards">{arms.map((a,i)=>{
          const m=metrics(selected.filter(r=>r.arm===a.id)),l=state?.ledgers?.[a.id];
          return <article key={a.id} style={{borderTop:`2px solid ${colors[i]}`,paddingTop:12}}><h3 style={{color:colors[i]}}>{a.name}</h3><div className="evidence-pair"><span>Resultado da seleção<strong className={m.net<0?'negative':'positive'}>{money(m.net)}</strong><small>{m.count} operações · {m.winRate==null?'—':m.winRate.toFixed(1)+'%'} acerto</small></span><span>Carteira acumulada<strong>{money(l?.bank??100)}</strong><small>{l?.count||0} alocações · queda {money(l?.drawdown)}</small></span></div></article>;
        })}</div>
        <Curves arms={arms} rows={selected} title={family==='forex'?'Forex: retomada e referência':'Daily Reset: viés versus direção oposta'}/>
        <p className="evidence-note">{family==='forex'?'O controle pode ter mais operações: compare retorno por contrato e tamanho da amostra. O filtro é uma hipótese, não uma vantagem confirmada.':'As duas direções compartilham preços, mas usam cotações e vencimentos próprios. O payout menor do lado favorecido precisa ser superado por uma taxa de acerto maior; compare expectativa líquida e risco, não apenas wins.'}</p>
      </div>;
    })}
    <div className="aut-card" style={{marginTop:24}}><span className="workspace-eyebrow">ARQUIVO DE TESTES ENCERRADOS</span><h3>Accumulator · coleta suspensa</h3><p>As variantes de 3 e 5 ticks terminaram com resultado líquido negativo. O histórico permanece para auditoria; novas propostas não são abertas.</p><div className="evidence-cards">{OPTIONS_ARMS.filter(a=>a.retired).map(a=>{const m=metrics(all.filter(r=>r.arm===a.id));return <article key={a.id}><h3>{a.name}</h3><strong className={m.net<0?'negative':'positive'}>{money(m.net)}</strong><small>{m.count} contratos apurados · {m.winRate?.toFixed(1)||'—'}% de acerto</small></article>;})}</div></div>
    <div className="aut-events">{Object.entries(state?.scans||{}).map(([key,value])=><p key={key}><b>{key}</b> · {value}</p>)}</div>
    {(state?.positions||[]).map(p=><p key={p.id}><b>{p.symbol}</b> · {p.blocked||'Simulação aguardando apuração'} · {p.legs.filter(l=>!l.done&&l.allocated).length} reservas</p>)}
    <p className="evidence-note">Preços ou barreiras ambíguos mantêm a operação pendente e o risco reservado. Não fabricamos wins/losses. São modelos indicativos, sem contrato comprado na Deriv.</p>
  </section>;
}
