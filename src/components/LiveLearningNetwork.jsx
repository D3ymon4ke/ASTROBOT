import React from 'react';
import { BrainCircuit } from 'lucide-react';

const inputs=[{id:'trend',label:'Tendência'},{id:'slope',label:'Inclinação'},{id:'distance',label:'Distância EMA'},{id:'candle',label:'Força M5'},{id:'pullback',label:'Recuo'}];
const hidden=['h1','h2','h3','h4'];
const point=(column,index,total)=>({x:[55,245,435][column],y:42+index*(176/Math.max(1,total-1))});
export default function LiveLearningNetwork({ state }) {
  const learning=state?.learning||{}, current=(state?.positions||[]).findLast?.(p=>p.family==='forex');
  const probability=current?.prediction??learning.lastPrediction;
  const status=learning.samples<100?`Aprendendo · ${learning.samples||0}/100`:learning.beatsBaseline?'Referência superada':'Em recalibração';
  const connections=[];
  for(const input of inputs)for(const node of hidden)connections.push({id:`${input.id}-${node}`,from:point(0,inputs.indexOf(input),inputs.length),to:point(1,hidden.indexOf(node),hidden.length)});
  return <section className="learning-network" aria-label="Rede adaptativa ao vivo">
    <div className="learning-head"><div><span className="workspace-eyebrow"><BrainCircuit size={14}/> REDE ADAPTATIVA LOCAL</span><h3>Como um sinal vira aprendizado</h3></div><span className="learning-state">{status}</span></div>
    <div className="network-stage">
      <svg viewBox="0 0 490 260" role="img" aria-label="Cinco sinais de mercado alimentam quatro neurônios e uma estimativa de acerto">
        <g className="network-links">{connections.map(link=><line key={link.id} x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y}/>)}</g>
        <g className="network-links output-links">{hidden.map((node,index)=>{const from=point(1,index,hidden.length),to=point(2,0,1);return <line key={node} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;})}</g>
        {inputs.map((input,index)=>{const p=point(0,index,inputs.length);return <g key={input.id} className="network-node input"><circle cx={p.x} cy={p.y} r="11"/><text x={p.x+18} y={p.y+4}>{input.label}</text></g>;})}
        {hidden.map((node,index)=>{const p=point(1,index,hidden.length);return <g key={node} className="network-node hidden"><circle cx={p.x} cy={p.y} r="14"/><circle className="network-pulse" cx={p.x} cy={p.y} r="19"/></g>;})}
        <g className="network-node output"><circle cx="435" cy="42" r="27"/><text x="435" y="38" textAnchor="middle">{probability==null?'—':`${(probability*100).toFixed(0)}%`}</text><text x="435" y="55" textAnchor="middle">chance</text></g>
      </svg>
      <div className="learning-flow"><span>1 · candles fechados</span><span>2 · previsão antes do resultado</span><span>3 · simulação</span><span>4 · resultado fecha</span><span>5 · pesos ajustados</span></div>
    </div>
    <div className="learning-metrics"><span>Amostra<strong>{learning.samples||0}</strong></span><span>Acerto observado<strong>{learning.accuracy==null?'—':`${(learning.accuracy*100).toFixed(1)}%`}</strong></span><span>Erro Brier<strong>{learning.brier==null?'—':learning.brier.toFixed(3)}</strong></span><span>Referência<strong>{learning.baselineBrier==null?'—':learning.baselineBrier.toFixed(3)}</strong></span></div>
    <p>A rede recebe somente dados disponíveis antes da entrada e aprende depois do encerramento. Ela só libera sua própria variante simulada após 100 resultados e quando seu erro fica melhor que a referência. Não envia compras.</p>
  </section>;
}
