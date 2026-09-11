import test from 'node:test';
import assert from 'node:assert/strict';
import * as backend from '../vps-backend/strategies/tradingStrategies.js';
import * as frontend from '../src/strategies/tradingStrategies.js';
const base=Date.UTC(2026,8,10,23,0)/1000;
const candle=(i,green=true)=>({epoch:base+i*60,open:100,close:green?101:99,high:102,low:98});
for(const [name,mod] of [['backend',backend],['frontend',frontend]]){
 test(name+': chronological blocks cross minutes, midnight and dates',()=>{
  const cs=Array.from({length:125},(_,i)=>candle(i,Math.floor(i/5)%2===0));
  for(const variant of [1,2,3]){
   const r=mod.runMHIBacktest(cs,0,'minority',variant);
   assert.equal(r.totalTrades,24);
   r.signals.forEach((s,j)=>{
    assert.equal(s.epoch,base+(5*(j+1)+variant-1)*60);
    assert.equal(s.direction,j%2===0?'PUT':'CALL');
   });
  }
 });
 test(name+': missing blocks and interrupted recovery are excluded',()=>{
  const cs=Array.from({length:20},(_,i)=>candle(i));
  assert.equal(mod.runMHIBacktest(cs.filter((_,i)=>i<5||i>=10),0).signals.some(s=>s.epoch===base+600),false);
  assert.equal(mod.runMHIBacktest(cs.filter((_,i)=>i!==6),2).signals.some(s=>s.epoch===base+300),false);
 });
 test(name+': live MHI rejects gaps, duplicate epochs, invalid prices and non-M1 candles',()=>{
  for(const id of ['mhi_minority','mhi_auto','fakegale']){
   assert.ok(mod.getLiveSignal(id,[0,1,2,3,4].map(i=>candle(i))));
   for(const indices of [[0,1,2,3,9],[0,1,2,2,4],[0,2,4,6,9]])
    assert.equal(mod.getLiveSignal(id,indices.map(i=>candle(i))),null);
   const cs=[0,1,2,3,4].map(i=>candle(i)); cs[3].close=NaN;
   assert.equal(mod.getLiveSignal(id,cs),null);
  }
 });
 test(name+': automatic replay matches past-only live decisions and has no overlaps',()=>{
  let seed=13;
  const cs=Array.from({length:180},(_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return candle(i,seed/2**32>.5);});
  for(const gale of [0,1,2]){
   const full=mod.runMHIAutoBacktest(cs,gale);
   full.signals.forEach((s,j)=>{
    const live=mod.getLiveSignal('mhi_auto',cs.slice(0,s.candleIndex),gale);
    assert.equal(s.direction,live.direction);
    assert.equal(s.detectedMhiPattern,live.detectedMhiPattern);
    if(j)assert.ok(s.candleIndex>full.signals[j-1].candleIndex+full.signals[j-1].steps);
   });
   for(const end of [30,55,100]){
    const short=mod.runMHIAutoBacktest(cs.slice(0,end),gale);
    assert.deepEqual(short.signals,full.signals.filter(s=>s.candleIndex+s.steps<end));
   }
  }
 });
 test(name+': first-entry wins are distinct from recovered wins',()=>{
  const cs=Array.from({length:10},(_,i)=>candle(i,i!==6));
  const r=mod.runMHIBacktest(cs,1);
  assert.equal(r.winRate,100); assert.equal(r.directWinRate,0);
 });
}
