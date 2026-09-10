import { replayTicks } from './tickReplay.js';
// Independent fair-coin reference, with a separately recorded quote per direction.
export function directionBenchmark(records, options) {
  const ticks=records.filter(r=>r.kind==='tick'),pairs=new Map(),groups=new Map(),candidates=[];
  for(const q of records.filter(r=>r.kind==='proposal' && r.pairId)) {
    if(!pairs.has(q.pairId)) pairs.set(q.pairId,{});
    pairs.get(q.pairId)[q.benchmark ? 'opposite' : 'signal']=q;
  }
  const matched=[];
  for(const [pairId,pair] of pairs) {
    const a=pair.signal,b=pair.opposite;if(!a)continue;
    const key=`${a.strategy} · ${a.durationMinutes} min`;
    if(!groups.has(key))groups.set(key,{name:key,pairs:0,excluded:0,signalNet:0,randomExpectedNet:0});
    const g=groups.get(key);
    if(!b || !a.eligible || !b.eligible || a.direction===b.direction || a.stake!==b.stake || a.symbol!==b.symbol || a.durationMinutes!==b.durationMinutes || Math.abs(a.receivedAt-b.receivedAt)>5000){g.excluded++;continue;}
    const time=Math.max(a.receivedAt,b.receivedAt);
    // Unique keys evaluate each opportunity independently without repeated tick sorting.
    candidates.push({...a,receivedAt:time,strategy:pairId+':signal'}, {...b,receivedAt:time,strategy:pairId+':opposite'});
    matched.push({a,b,g});
  }
  const evaluated=new Map(replayTicks([...ticks,...candidates],options).rows.map(r=>[r.id,r]));
  for(const {a,b,g} of matched){const ra=evaluated.get(a.signalId),rb=evaluated.get(b.signalId);if(!ra||!rb){g.excluded++;continue;}g.pairs++;g.signalNet+=ra.profit;g.randomExpectedNet+=(ra.profit+rb.profit)/2;}
  return {groups:[...groups.values()],warning:'Referência 50/50: média dos resultados CALL e PUT com propostas próprias. Entrada comum após a última cotação; pares separados por mais de 5 segundos são excluídos. Oportunidades são avaliadas independentemente, podendo se sobrepor. Isso mede seleção de direção, não uma carteira executável nem significância estatística.'};
}
