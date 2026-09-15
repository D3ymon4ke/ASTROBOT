import React, { useEffect, useState } from 'react';
import { Clock3, Globe2, Radar } from 'lucide-react';
import { forexSchedule, nextAccumulatorScan } from '../../vps-backend/automation/optionsStrategies.js';

function useNow() {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  return now;
}
function remaining(target,now) {
  if(!target)return '—';
  let seconds=Math.max(0,Math.ceil(target-now/1000));
  const days=Math.floor(seconds/86400);seconds%=86400;
  const hours=Math.floor(seconds/3600);seconds%=3600;
  const minutes=Math.floor(seconds/60),secs=seconds%60;
  return `${days?days+'d ':''}${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}
export default function ResearchPulse({ state }) {
  const now=useNow(), schedule=forexSchedule(now/1000), accuScan=nextAccumulatorScan(now/1000);
  const forexPositions=(state?.positions||[]).filter(p=>p.family==='forex').length;
  const accuPositions=(state?.positions||[]).filter(p=>p.family==='accu').length;
  return <div className="research-pulse" aria-label="Agenda ao vivo do laboratório">
    <article className={`market-clock ${schedule.open?'is-open':''}`}><Globe2/><div><span>Mercado Forex</span><strong>{schedule.open?'ABERTO':'FECHADO'}</strong><small>{schedule.open?`Fecha em ${remaining(schedule.closesAt,now)}`:`Abre em ${remaining(schedule.nextOpen,now)}`}</small></div></article>
    <article className="market-clock is-open"><Radar/><div><span>Próxima varredura Forex</span><strong>{remaining(schedule.nextScan,now)}</strong><small>{forexPositions?`${forexPositions} sinal(is) em apuração`:'Uma entrada depende dos filtros M15/M5'}</small></div></article>
    <article className="market-clock is-open"><Clock3/><div><span>Accumulator · mercado 24/7</span><strong>{remaining(accuScan,now)}</strong><small>{accuPositions?'Comparação em apuração':'Próxima coleta indicativa'}</small></div></article>
  </div>;
}
