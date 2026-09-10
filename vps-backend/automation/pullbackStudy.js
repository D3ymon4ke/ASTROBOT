import { signalFor } from './signals.js';
import { replayTicks } from './tickReplay.js';
import { summarize } from './research.js';
export const EXPERIMENT_VERSION = 'pullback-study-v1';
export function studySignal(candles) {
  const signal = signalFor(candles, 'pullback');
  if (!signal) return null;
  const recent = candles.slice(-30), last = recent.at(-1);
  const range = recent.slice(-14).reduce((n,c)=>n+c.high-c.low,0)/14;
  return { ...signal, version: EXPERIMENT_VERSION, features: { bodyRange: Math.abs(last.close-last.open)/range, strongTrend: signal.reasons.includes('Separação das médias') } };
}
export function comparePullback(records, options) {
  const quotes = [...new Map(records.filter(r=>r.kind==='proposal' && r.version===EXPERIMENT_VERSION).map(r=>[r.signalId,r])).values()];
  const ticks = records.filter(r=>r.kind==='tick');
  const variants = [
    ['baseline','Pullback de referência',q=>q.score>=60 && (q.payout-q.stake)/q.stake>=.8],
    ['trend','Tendência mais definida',q=>q.features?.strongTrend===true],
    ['body','Vela sem expansão',q=>Number.isFinite(q.features?.bodyRange) && q.features.bodyRange<=1],
    ['payout','Payout mínimo de 90%',q=>(q.payout-q.stake)/q.stake>=.9]
  ];
  const baseline = variants[0][2];
  const results = variants.map(([id,name,filter])=> {
    const selected=quotes.map(q=>({...q,eligible:q.eligible && baseline(q) && filter(q)}));
    const replay=replayTicks([...ticks,...selected],options);
    const eligible=selected.filter(q=>q.eligible).length;
    return {id,name,eligible,rejected:quotes.length-eligible,metrics:replay.metrics,excluded:replay.excluded,rows:replay.rows};
  });
  const reference=results[0];
  for(const r of results){const ids=new Set(r.rows.map(t=>t.id));r.discarded=summarize(reference.rows.filter(t=>!ids.has(t.id)));r.delta=r.metrics.net-reference.metrics.net;}
  return { version:EXPERIMENT_VERSION,quoteCount:quotes.length,variants:results, warning:'Regras fixadas antes da coleta. Comparação indicativa por ativo, com stake USD 0,35 e duração de 1 minuto; não replica a configuração ou a exposição do trader em produção. Cada variante é reproduzida separadamente. Não promove regras para compras.' };
}
