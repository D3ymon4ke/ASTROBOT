import React, { useState } from 'react';
import { OPTIONS_ARMS } from '../../vps-backend/automation/optionsStrategies.js';
import { metrics } from '../../vps-backend/automation/evidenceStrategies.js';
const money = value => Number(value || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
const colors = ['#71d5c2','#baacff'];
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
  const [scope,setScope]=useState('research'),[scenario,setScenario]=useState('delay');
  const all=state?.trades||[], rows=all.filter(r=>scope==='research'||r.allocated);
  return <section className="aut-card">
    <span className="workspace-eyebrow">NOVOS TESTES · FOREX + ACCUMULATOR</span><h2>Retomada de tendência e saídas curtas</h2>
    <p>Somente simulação, sem martingale. Iniciam e pausam pelo botão do laboratório. {state?.lastScan?`Última coleta: ${new Date(state.lastScan).toLocaleTimeString()}`:'Aguardando primeira coleta na VPS.'}</p>
    <div className="evidence-filters"><label>Escopo dos novos testes<select aria-label="Escopo dos novos testes" value={scope} onChange={e=>setScope(e.target.value)}><option value="research">Pesquisa · todos os sinais</option><option value="wallet">Carteiras · com orçamento de risco</option></select></label><label>Apuração do Accumulator<select aria-label="Apuração do Accumulator" value={scenario} onChange={e=>setScenario(e.target.value)}><option value="delay">Saída com atraso de 1 tick</option><option value="nominal">Saída no tick planejado</option></select></label></div>
    <p className="evidence-note">Carteiras independentes de $100, perda bruta diária de $3 e drawdown máximo de $15. A pesquisa continua coletando quando o orçamento de uma carteira bloqueia alocações. Até 300 registros por variante no painel; saldos são cumulativos. Nenhum teste comprova rentabilidade.</p>
    {['forex','accu'].map(family=>{
      const arms=OPTIONS_ARMS.filter(a=>a.family===family);
      const selected=rows.filter(r=>arms.some(a=>a.id===r.arm)).map(r=>family==='accu'&&scenario==='nominal'?{...r,profit:r.nominalProfit}:r);
      return <div key={family} style={{marginTop:24}}><h3>{family==='forex'?'Forex · EUR/USD e GBP/USD':'Accumulator · R_100 e 1HZ50V'}</h3>
        <p>{family==='forex'?'Tendência por EMA 20/50 em M15; recuo e retomada em M5. Rise/Fall de 15 minutos, entrada de $0.50. Segunda a sexta, 07–17 UTC (04–14 em Brasília). O controle segue a tendência sem exigir recuo.':'Crescimento de 1%, entrada de $1. Saídas após 3 e 5 ticks sobrevividos, partindo da mesma entrada. Barreiras recalculadas a cada tick com o parâmetro da proposta. Knockout perde a entrada inteira.'}</p>
        <div className="evidence-cards">{arms.map((a,i)=>{
          const m=metrics(selected.filter(r=>r.arm===a.id)),l=state?.ledgers?.[a.id];
          return <article key={a.id} style={{borderTop:`2px solid ${colors[i]}`,paddingTop:12}}><h3 style={{color:colors[i]}}>{a.name}</h3><div className="evidence-pair"><span>Resultado da seleção<strong className={m.net<0?'negative':'positive'}>{money(m.net)}</strong><small>{m.count} operações · {m.winRate==null?'—':m.winRate.toFixed(1)+'%'} acerto</small></span><span>Carteira acumulada<strong>{money(l?.bank??100)}</strong><small>{l?.count||0} alocações · queda {money(l?.drawdown)}</small></span></div></article>;
        })}</div>
        <Curves arms={arms} rows={selected} title={family==='forex'?'Forex: retomada e referência':'Accumulator: comparação de 3 e 5 ticks'}/>
        <p className="evidence-note">{family==='forex'?'O controle pode ter mais operações: comparar também retorno por entrada e amostra; somar carteiras não representa uma única conta. Os pares compartilham cotação e entrada quando o filtro passa.':'O cenário de atraso inclui mais um tick de crescimento e risco de knockout. As carteiras contabilizam esse cenário; selecionar a saída planejada altera apenas a análise. Alto acerto não garante lucro: um knockout pode anular dezenas de ganhos.'}</p>
      </div>;
    })}
    <div className="aut-events">{Object.entries(state?.scans||{}).map(([key,value])=><p key={key}><b>{key}</b> · {value}</p>)}</div>
    {(state?.positions||[]).map(p=><p key={p.id}><b>{p.symbol}</b> · {p.blocked||'Simulação aguardando apuração'} · {p.legs.filter(l=>!l.done&&l.allocated).length} reservas</p>)}
    <p className="evidence-note">Preços ou barreiras ambíguos mantêm a operação pendente e o risco reservado. Não fabricamos wins/losses. São modelos indicativos, sem contrato comprado na Deriv.</p>
  </section>;
}
