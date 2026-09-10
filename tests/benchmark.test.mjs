import test from 'node:test';
import assert from 'node:assert/strict';
import {directionBenchmark} from '../vps-backend/automation/directionBenchmark.js';
const q={kind:'proposal',pairId:'pair',signalId:'a',symbol:'R_100',strategy:'breakout',version:'breakout-v1',direction:'CALL',receivedAt:100000,stake:1,payout:1.8,durationMinutes:1,eligible:true};
const opposite={...q,signalId:'b',benchmark:true,direction:'PUT',payout:1.9};
const ticks=Array.from({length:200},(_,i)=>({kind:'tick',symbol:'R_100',epoch:100+i,price:100+i}));
test('paired benchmark uses each direction payout and excludes missing or stale pairs',()=>{
 const r=directionBenchmark([q,opposite,...ticks],{latencyMs:0}).groups[0];assert.equal(r.pairs,1);assert.ok(Math.abs(r.randomExpectedNet+.1)<1e-9);assert.ok(Math.abs(r.signalNet-.8)<1e-9);
 assert.equal(directionBenchmark([q,...ticks],{}).groups[0].excluded,1);
 assert.equal(directionBenchmark([q,{...opposite,receivedAt:110000},...ticks],{}).groups[0].excluded,1);
});
