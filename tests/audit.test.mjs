import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRows, bankReplay, auditGroups, auditCsv } from '../src/components/auditMetrics.js';
const row = (id, time, profit, extra={}) => ({id,timestamp:time,profit,stake:1,strategy:'mhi',symbol:'R_100',...extra});
test('audit sorts chronologically, deduplicates contracts, excludes invalid/open rows and filters',()=>{
 const data=[row('b',2000,0),row('a',1000,-1),row('a',1000,-1),row('c',3000,null),row('d',4000,2,{stake:Infinity})];
 const rows=auditRows(data);assert.deepEqual(rows.map(t=>t.id),['a','b']);
 assert.equal(auditRows(data,{since:1500}).length,1);assert.equal(auditRows(data,{strategy:'other'}).length,0);
 const group=auditGroups(rows,t=>t.strategy)[0];assert.equal(group.losses,1);assert.equal(group.wins,0);assert.equal(group.profitFactor,0);
});
test('bank replay stops before unaffordable entry and never recovers using later profits',()=>{
 const r=bankReplay([row(1,1,-1),row(2,2,9)],1);assert.equal(r.balance,0);assert.equal(r.processed,1);assert.equal(r.stopped,true);
 assert.equal(bankReplay([],0),null);assert.equal(bankReplay([],Infinity),null);
 const d=bankReplay([row(1,1,10),row(2,2,-5)],10);assert.equal(d.drawdownPct,25);
});
test('CSV escapes formula-like strategy names and preserves UTC dates',()=>{const csv=auditCsv([row(1,1000,-1,{strategy:'=1+1'})]);assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes('1970-01-01T00:00:01.000Z'));});
