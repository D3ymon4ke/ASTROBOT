import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceTrader } from '../vps-backend/automation/EvidenceTrader.js';
import { forexSignal,forexWindow,forexSchedule,nextAccumulatorScan,closedBars,accumulatorTerms,accumulatorStep,accuProfit } from '../vps-backend/automation/optionsStrategies.js';
import { createAdaptiveNetwork,adaptivePredict,trainAdaptiveNetwork,adaptiveDecision,adaptiveQuality } from '../vps-backend/automation/adaptiveNetwork.js';
const now=Date.UTC(2026,8,14,10,0,5)/1000;
function bars() {
  const m15=Array.from({length:60},(_,i)=>({epoch:Math.floor(now/900)*900-(60-i)*900,open:1+i*.002,close:1.001+i*.002,low:.999+i*.002,high:1.003+i*.002}));
  const m5=Array.from({length:30},(_,i)=>({epoch:Math.floor(now/300)*300-(30-i)*300,open:1+i*.002,close:1.001+i*.002,low:.999+i*.002,high:1.003+i*.002}));
  Object.assign(m5[28],{open:1.06,close:1.045,low:1.02,high:1.065});Object.assign(m5[29],{open:1.045,close:1.07,low:1.04,high:1.075});
  return {m15,m5};
}
function fixture(response=async()=>({})) {
  const calls=[],session={activeMode:'real',modeStates:{real:{},demo:{}},balance:25,saveToFile(){},syncToClients(){},derivAPI:{connected:true,authorized:true,sendRequest:async req=>{calls.push(req);return response(req);}}};
  const owner=new EvidenceTrader(session);return {session,owner,engine:owner.options,calls};
}
function accu(anchor) {return {id:'pair',family:'accu',symbol:'R_100',precision:2,stake:1,anchor,tickCount:0,terms:{ratio:.01,barrierUnit:.001},legs:[{arm:'accu_3',ticks:3,allocated:true},{arm:'accu_5',ticks:5,allocated:true}]};}
test('forex signal is causal across M15/M5 and requires the declared weekday session',()=>{
  const {m15,m5}=bars();const signal=forexSignal(m15,m5,now);assert.equal(signal.direction,1);assert.equal(signal.filtered,true);
  assert.deepEqual(forexSignal([...m15,{epoch:now-5,open:2,close:1,low:1,high:2}],m5,now),signal);
  assert.equal(forexSignal(m15,m5.slice(1),now),null);assert.equal(closedBars(m15.filter((_,i)=>i!==20),900,now,60).length,0);
  assert.equal(forexSignal(m15,m5,now+50),null);assert.equal(forexWindow(Date.UTC(2026,8,19,10)/1000),false);
  assert.equal(forexWindow(Date.UTC(2026,8,14,21)/1000),false);
});
test('forex control keeps a trend even when the pullback condition fails',()=>{
  const {m15,m5}=bars();Object.assign(m5[28],{open:1.04,close:1.05,low:1.039,high:1.051});
  const s=forexSignal(m15,m5,now);assert.equal(s.direction,1);assert.equal(s.filtered,false);
});
test('market clocks distinguish sessions from scans across the weekend',()=>{
  const friday=Date.UTC(2026,8,18,16,58,30)/1000, open=forexSchedule(friday);
  assert.equal(open.open,true);assert.equal(open.nextScan,Date.UTC(2026,8,21,7)/1000);assert.equal(open.closesAt,Date.UTC(2026,8,18,17)/1000);
  const closed=forexSchedule(Date.UTC(2026,8,18,18)/1000);assert.equal(closed.open,false);assert.equal(closed.nextOpen,Date.UTC(2026,8,21,7)/1000);assert.equal(closed.nextScan,closed.nextOpen);
  assert.equal(nextAccumulatorScan(125),180);
});
test('adaptive network predicts before labels, learns online and stays gated without evidence',()=>{
  const model=createAdaptiveNetwork(),features=[1,.4,.2,.8,-.3],before=adaptivePredict(model,features).probability;
  assert.ok(before>0&&before<1);assert.equal(model.samples,0);assert.equal(adaptiveDecision(model,.99,.5,.9).qualified,false);
  trainAdaptiveNetwork(model,features,1,before);assert.equal(model.samples,1);assert.equal(model.wins,1);assert.equal(model.audit[0].prediction,before);
  assert.ok(adaptivePredict(model,features).probability>before);assert.equal(adaptiveQuality(model).auditSamples,1);
  for(let i=1;i<100;i++)trainAdaptiveNetwork(model,features,1,adaptivePredict(model,features).probability);
  const decision=adaptiveDecision(model,.99,.5,.9);assert.equal(decision.quality.samples,100);assert.equal(typeof decision.qualified,'boolean');
});
test('accumulator accepts official proposal fields and fails closed on inconsistent barriers',()=>{
  const q={spot:100,contract_details:{tick_size_barrier:.01,barrier_spot_distance:'1.000',high_barrier:'101.000',low_barrier:'99.000',maximum_ticks:250,maximum_payout:6000}};
  assert.equal(accumulatorTerms(q).ratio,.01);
  assert.equal(accumulatorTerms({...q,contract_details:{...q.contract_details,high_barrier:undefined}}),null);
  assert.equal(accumulatorTerms({...q,contract_details:{...q.contract_details,barrier_spot_distance:'2.000'}}),null);
  assert.equal(accumulatorTerms({...q,contract_details:{...q.contract_details,maximum_ticks:5}}),null);
});
test('barriers move with previous tick and uncertain rounding does not become a win',()=>{
  const terms={ratio:.01,barrierUnit:.001};
  assert.equal(accumulatorStep(100,100.5,terms),'inside');assert.equal(accumulatorStep(100,102,terms),'knockout');
  assert.equal(accumulatorStep(100,101,terms),'ambiguous');assert.equal(accumulatorStep(200,201,terms),'inside');
  assert.equal(accuProfit(3),.03);assert.equal(accuProfit(5),.05);
});
test('paired accumulator starts on future tick and records planned and delayed exits separately',async()=>{
  const anchor=Math.floor(Date.now()/1000)-30;
  const {engine,session,calls}=fixture(async()=>({history:{times:Array.from({length:7},(_,i)=>anchor+i+1),prices:Array.from({length:7},(_,i)=>100+i*.01)}}));
  engine.state.positions=[accu(anchor)];engine.ledger('accu_3').reserved=1;engine.ledger('accu_5').reserved=1;
  await engine.tick(()=>false,()=>true);
  const rows=engine.state.trades;assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.profit),[.04,.06]);assert.deepEqual(rows.map(r=>r.nominalProfit),[.03,.05]);
  assert.equal(rows[0].entryEpoch,anchor+1);assert.equal(rows[0].exitEpoch,anchor+5);assert.equal(rows[1].exitEpoch,anchor+7);
  assert.equal(engine.ledger('accu_3').bank,100.04);assert.equal(session.balance,25);assert.ok(calls.every(r=>!r.buy&&!r.sell));
  engine.lastPoll=0;await engine.tick(()=>false,()=>true);assert.equal(engine.state.trades.length,2);
});
test('knockout after planned third tick loses the entire stake in delayed scenario',async()=>{
  const anchor=Math.floor(Date.now()/1000)-30;
  const {engine}=fixture(async()=>({history:{times:[1,2,3,4,5].map(i=>anchor+i),prices:[100,100.1,100.2,100.3,102]}}));
  engine.state.positions=[accu(anchor)];await engine.tick(()=>false,()=>true);
  assert.deepEqual(engine.state.trades.map(r=>r.profit),[-1,-1]);assert.equal(engine.state.trades[0].nominalProfit,.03);assert.equal(engine.state.trades[1].nominalProfit,-1);
});
test('ambiguous barrier and missing path preserve reservation without fabricating PnL',async()=>{
  for(const sample of [{times:[1,2],prices:[100,101]},{times:[1,10],prices:[100,102]}]) {
    const anchor=Math.floor(Date.now()/1000)-30;
    const {engine}=fixture(async()=>({history:{times:sample.times.map(i=>anchor+i),prices:sample.prices}}));
    engine.state.positions=[accu(anchor)];engine.ledger('accu_3').reserved=1;await engine.tick(()=>false,()=>true);
    assert.equal(engine.state.trades.length,0);assert.ok(engine.state.positions[0].blocked);assert.equal(engine.ledger('accu_3').reserved,1);
  }
});
test('forex expiry uses the last tick at or before explicit expiry, never a later winning tick',async()=>{
  const expiry=Math.floor(Date.now()/1000)-10;
  const {engine,session}=fixture(async()=>({history:{times:[expiry-1,expiry+1],prices:[99,101]}}));
  engine.state.positions=[{id:'fx',family:'forex',symbol:'frxEURUSD',precision:5,stake:.5,payout:.95,entry:100,entryEpoch:expiry-900,expiry,direction:1,features:[1,.5,.2,.1,0],prediction:.6,legs:[{arm:'forex_control',allocated:true}]}];
  assert.equal(engine.state.learning.samples,0);await engine.tick(()=>false,()=>true);assert.equal(engine.state.trades[0].profit,-.5);assert.equal(engine.state.trades[0].exitEpoch,expiry-1);assert.equal(session.balance,25);
  assert.equal(engine.state.learning.samples,1);assert.equal(engine.state.learning.wins,0);engine.lastPoll=0;await engine.tick(()=>false,()=>true);assert.equal(engine.state.learning.samples,1);
});
test('risk reserve survives pause and daily gains do not replenish the loss budget',async()=>{
  const {engine,owner,session}=fixture();assert.equal(engine.reserve('accu_3',1),true);assert.equal(engine.reserve('accu_3',1),false);
  const l=engine.ledger('accu_3');l.reserved=0;l.dayLoss=3;assert.equal(engine.reserve('accu_3',1),false);l.dayLoss=0;l.drawdown=15;assert.equal(engine.reserve('accu_3',1),false);
  engine.state.positions=[accu(Date.now()/1000)];let checked=false;engine.tick=async enabled=>{assert.equal(enabled(),false);checked=true;};await owner.tick();assert.equal(checked,true);
  session.activeMode='demo';assert.equal(engine.state.positions.length,0);assert.equal(session.modeStates.real.optionsResearch.positions.length,1);
});
test('pause during accumulator quotation cannot create a position',async()=>{
  let enabled=true;const {engine}=fixture(async()=>{enabled=false;return {proposal:{id:'p'}};});
  engine.metadata={R_100:2,'1HZ50V':2};await engine.scanAccumulator(()=>enabled,()=>true);assert.equal(engine.state.positions.length,0);
});
test('valid accumulator quotation creates matched legs; research continues after wallet limit',async()=>{
  const {engine}=fixture(async()=>({proposal:{id:'p',spot:100,spot_time:Math.floor(Date.now()/1000),ask_price:1,contract_details:{tick_size_barrier:.01,barrier_spot_distance:'1.000',high_barrier:'101.000',low_barrier:'99.000',maximum_ticks:250,maximum_payout:6000}}}));
  engine.metadata={R_100:2,'1HZ50V':2};const l=engine.ledger('accu_3');l.day=new Date().toISOString().slice(0,10);l.dayLoss=3;
  await engine.scanAccumulator(()=>true,()=>true);assert.equal(engine.state.positions.length,1);assert.deepEqual(engine.state.positions[0].legs.map(l=>l.allocated),[false,true]);
});
test('retired evidence and Range Break cannot open new simulations',async()=>{
  const {owner,calls}=fixture(async()=>({}));owner.options.tick=async()=>{};owner.range.tick=async enabled=>assert.equal(enabled(),false);
  owner.state.config.enabled=true;assert.ok(owner.state.retiredAt);await owner.tick();
  assert.equal(owner.state.pending.length,0);assert.equal(owner.range.state.positions.length,0);assert.equal(calls.length,0);
});
