import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePullback, studySignal, EXPERIMENT_VERSION } from '../vps-backend/automation/pullbackStudy.js';
import { signalFor } from '../vps-backend/automation/signals.js';
const q={kind:'proposal',signalId:'p',symbol:'R_100',strategy:'pullback',version:EXPERIMENT_VERSION,direction:'CALL',receivedAt:100000,stake:1,payout:1.85,durationMinutes:1,eligible:true,score:60,features:{strongTrend:false,bodyRange:.8}};
const ticks=Array.from({length:90},(_,i)=>({kind:'tick',symbol:'R_100',epoch:100+i,price:100+i}));
test('fixed variants share baseline opportunities, keep rejected outcomes and isolate legacy proposals',()=>{
 const r=comparePullback([q,{...q,signalId:'old',version:'continuous-v1'},...ticks],{latencyMs:0});
 assert.equal(r.quoteCount,1);assert.deepEqual(r.variants.map(v=>v.metrics.count),[1,0,1,0]);assert.equal(r.variants[1].discarded.count,1);assert.equal(r.variants[1].discarded.net,.8500000000000001);
 assert.deepEqual(comparePullback([q,...ticks.map(t=>t.epoch>160?{...t,price:-999}:t)],{latencyMs:0}).variants,r.variants);
});
test('missing ticks are exclusions rather than invented variant losses; rejected base cannot pass variants',()=>{
 const r=comparePullback([q],{});assert.equal(r.variants[0].metrics.count,0);assert.equal(r.variants[0].excluded.missingEntry,1);
 assert.ok(comparePullback([{...q,score:50},...ticks],{}).variants.every(v=>v.metrics.count===0));
});
test('study preserves production pullback direction and score',()=>{
 const candles=Array.from({length:30},(_,i)=>({epoch:1800000000+i*60,open:100,close:i===29?101.5:100,high:102,low:98}));
 const original=signalFor(candles,'pullback'),study=studySignal(candles);assert.ok(original);assert.equal(study.direction,original.direction);assert.equal(study.score,original.score);assert.ok(Number.isFinite(study.features.bodyRange));
});
