import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCandles, signalFor, validateConfig } from '../vps-backend/automation/signals.js';
import { summarize, walkForward, stressTest } from '../vps-backend/automation/research.js';
import { ContinuousTrader } from '../vps-backend/automation/ContinuousTrader.js';
import { DerivAPI } from '../vps-backend/deriv/DerivAPI.js';

function candles(count = 400, start = 1800000000) {
  return Array.from({ length: count }, (_, i) => {
    const open = 100 + Math.sin(i / 4), close = open + (i % 5 === 0 ? -.5 : .3);
    return { epoch: start + i * 60, open, close, high: Math.max(open, close) + 1, low: Math.min(open, close) - 1 };
  });
}
function fixture() {
  const journal = [], calls = [];
  const session = { activeMode: 'demo', modeStates: { demo: { trades: [] }, real: { trades: [] } },
    balance: 100, initialBalance: 100, sessionStartTime: 1, activeContractId: null,
    saveToFile: () => true, syncToClients() {}, connectDeriv() {}, accountCurrency: 'USD',
    derivAPI: { connected: true, authorized: true, async sendRequest(request) { calls.push(request); return {}; } }
  };
  const trader = new ContinuousTrader(session, e => journal.push(e));
  return { session, trader, journal, calls };
}

test('configuration defaults to observation and rejects unsafe/nonfinite inputs', () => {
  assert.equal(validateConfig({}).execution, 'observe');
  assert.equal(validateConfig({}).enabled, false);
  for (const patch of [{ stake: NaN }, { maxPositions: 3 }, { stake: 10 }, { symbols: [] }, { strategies: ['unknown'] }, { enabled: 'true' }]) assert.throws(() => validateConfig(patch));
});
test('only closed, valid and deduplicated candles feed signals; gaps suppress a signal', () => {
  const data = candles(30);
  assert.equal(cleanCandles([...data, data[0], null, { epoch: 0 }], data.at(-1).epoch).length, 29);
  assert.equal(signalFor(data, 'mhi').direction, 'PUT');
  data[20].epoch += 1;
  assert.equal(signalFor(data, 'mhi'), null);
});
test('shared exposure allows one per engine at two positions and blocks a third or ambiguous purchase', () => {
  const { session, trader } = fixture();
  trader.configure({ execution: 'live', maxPositions: 2, maxExposure: 2 });
  session.modeStates.demo.legacyOrder = { stake: .5 };
  assert.equal(trader.rejection(.35), null);
  trader.state.position = { stake: .35, contractId: '42' };
  assert.match(trader.rejection(.35), /ainda em aberto/);
  session.modeStates.demo.legacyOrder = null;
  assert.equal(trader.rejection(.5, 'timeline'), null);
  trader.state.position.contractId = null;
  assert.match(trader.rejection(.5, 'timeline'), /conciliação/);
});
test('daily loss budget reserves open stakes; wins do not replenish it; legacy settlement deduplicates', () => {
  const { trader } = fixture();
  trader.configure({ execution: 'live', dailyLossLimit: 1 });
  trader.recordLegacy({ id: '1', profit: -.7 });
  trader.recordLegacy({ id: '1', profit: -.7 });
  trader.recordLegacy({ id: '2', profit: 2 });
  assert.equal(trader.state.lossUsed, .7);
  assert.match(trader.rejection(.35), /diário/);
});
test('states are isolated by account mode and malformed old records do not break sync', () => {
  const { trader, session } = fixture();
  session.modeStates.demo.trades.push({ timestamp: 'invalid', profit: -1 });
  trader.configure({ minScore: 75 });
  session.activeMode = 'real';
  assert.equal(trader.state.config.minScore, 60);
  session.activeMode = 'demo';
  assert.equal(trader.snapshot().config.minScore, 75);
});
test('pausing retains and settles open position once; its P&L stays out of timeline balance difference', async () => {
  const { session, trader } = fixture();
  trader.state.position = { contractId: '42', stake: .35, signalId: 's' };
  trader.configure({ enabled: false });
  session.derivAPI.sendRequest = async () => ({ proposal_open_contract: { is_sold: 1, profit: .3 } });
  await trader.tick(); await trader.tick();
  assert.equal(trader.state.trades.length, 1);
  assert.equal(trader.state.trades[0].execution, 'live');
  assert.equal(session.balance - session.initialBalance, 0);
  assert.equal(trader.state.position, null);
});
test('expiry alone is not treated as a financial settlement', async () => {
  const { session, trader } = fixture();
  trader.state.position = { contractId: '42', stake: .35 };
  session.derivAPI.sendRequest = async () => ({ proposal_open_contract: { is_expired: 1, profit: -.35 } });
  await trader.tick();
  assert.ok(trader.state.position);
  assert.equal(trader.state.trades.length, 0);
});
test('indicative observation has separate history and never changes balance or loss budget', async () => {
  const { session, trader } = fixture();
  trader.state.shadows.push({ signalId: 'shadow', expiry: 100, entry: 100, direction: 'CALL', stake: .35, payout: .7 });
  session.derivAPI.sendRequest = async () => ({ history: { times: [100], prices: [101] } });
  await trader.tick();
  assert.equal(trader.state.trades[0].execution, 'observe');
  assert.equal(trader.state.lossUsed, 0);
  assert.equal(session.balance, 100);
});

for (const scenario of ['normal', 'timeline-reserved-during-quote', 'paused-during-quote', 'destroyed-during-quote', 'timeout', 'persistence-failure']) {
  test(`scanner purchase path: ${scenario}`, async t => {
    t.mock.timers.enable({ apis: ['Date'], now: 1800001805000 });
    const { trader, session, calls } = fixture();
    trader.configure({ enabled: true, execution: 'live', symbols: ['R_100'], strategies: ['mhi'] });
    session.derivAPI.fetchCandleHistory = async () => candles(30);
    session.derivAPI.sendRequest = async req => {
      calls.push(req);
      if (req.proposal) {
        if (scenario === 'timeline-reserved-during-quote') session.modeStates.demo.legacyOrder = { stake: .35 };
        if (scenario === 'paused-during-quote') trader.configure({ enabled: false });
        if (scenario === 'destroyed-during-quote') trader.destroyed = true;
        return { proposal: { id: 'quote', ask_price: .35, payout: .7 } };
      }
      if (scenario === 'timeout') throw Error('Timeout');
      return { buy: { contract_id: 42, buy_price: .35 } };
    };
    if (scenario === 'persistence-failure') session.saveToFile = () => false;
    await trader.tick();
    const shouldBuy = ['normal', 'timeout'].includes(scenario);
    assert.equal(calls.filter(r => r.buy).length, shouldBuy ? 1 : 0);
    if (scenario === 'timeout') {
      assert.equal(trader.state.position.phase, 'uncertain');
      t.mock.timers.tick(300000);
      await trader.tick();
      assert.equal(calls.filter(r => r.buy).length, 1);
    }
    if (scenario === 'normal') assert.equal(trader.state.position.contractId, '42');
  });
}
test('request IDs correlate out-of-order replies and timeout buy replies cannot reach legacy handler', async () => {
  const api = new DerivAPI(), sent = [], late = [];
  api.connected = true; api.ws = { send: s => sent.push(JSON.parse(s)) };
  api.onBuySuccess = () => assert.fail('continuous reply leaked into timeline');
  api.onLateResponse = (...args) => late.push(args);
  const a = api.sendRequest({ proposal: 1 }), b = api.sendRequest({ ticks_history: 'R_100' });
  api.handleMessage({ req_id: sent[1].req_id, history: {} });
  api.handleMessage({ req_id: sent[0].req_id, proposal: { id: 'p' } });
  assert.equal((await a).proposal.id, 'p'); await b;
  const request = { buy: 'q', passthrough: { signalId: 'test' } };
  await assert.rejects(api.sendRequest(request, 5), /Timeout/);
  api.handleMessage({ req_id: sent[2].req_id, msg_type: 'buy', buy: { contract_id: 42 } });
  assert.equal(late[0][1].passthrough.signalId, 'test');
});
test('walk-forward selection and earlier test outcomes cannot see later candles', () => {
  const data = candles(600), options = { train: 200, test: 100 };
  const before = walkForward(data, options);
  const changedFuture = data.map((c, i) => i < 300 ? c : { ...c, close: c.open - .9, low: c.open - 1 });
  const after = walkForward(changedFuture, options);
  assert.equal(before.folds.length, 4);
  assert.deepEqual(before.folds[0], after.folds[0]);
  for (const f of before.folds) assert.ok(f.trainEnd < f.testStart && f.testStart <= f.testEnd);
  assert.equal(new Set(before.rows.map(r => r.epoch)).size, before.rows.length);
});
test('metrics count individual losses and stress includes depletion rather than martingale recovery wins', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ stake: .5, profit: i % 2 ? .4 : -.5 }));
  const m = summarize(rows);
  assert.equal(m.wins, 10); assert.equal(m.losses, 10); assert.ok(m.expectancy < 0);
  assert.equal(stressTest(rows, 2, .5).runs, 300);
  assert.equal(stressTest(rows, Infinity), null);
  assert.equal(stressTest(rows.slice(0, 19)), null);
});
test('known legacy orders reconcile even when timeline and continuous are paused', async () => {
  const { session, trader } = fixture();
  session.modeStates.demo.legacyOrder = { contractId: '77', stake: .35 };
  session.derivAPI.sendRequest = async () => ({ proposal_open_contract: { contract_id: 77, is_sold: 1, profit: .3 } });
  let settled = 0;
  session.handleContractUpdate = c => { assert.equal(session.activeContractId, '77'); assert.equal(c.contract_id, 77); settled++; session.modeStates.demo.legacyOrder = null; };
  await trader.tick(); assert.equal(settled, 1);
});
test('ambiguous legacy purchase blocks continuous even with capacity for two', () => {
  const { session, trader } = fixture();
  trader.configure({ maxPositions: 2 });
  session.modeStates.demo.legacyOrder = { stake: .35, requestedAt: Date.now() - 20000 };
  assert.match(trader.rejection(.35), /conciliação/);
});
test('manual reconciliation rejects missing broker fields and wrong purchase identity', async () => {
  const { session, trader } = fixture();
  trader.state.position = { signalId: 'pending', stake: .35, symbol: 'R_100', direction: 'CALL', requestedAt: Date.now() };
  session.derivAPI.sendRequest = async () => ({ proposal_open_contract: { contract_id: 77, contract_type: 'CALL', underlying: 'R_100' } });
  await assert.rejects(trader.reconcile('77'), /não corresponde/);
  assert.equal(trader.state.position.contractId, undefined);
});
test('late response after disconnect stays isolated from legacy callbacks', async () => {
  const api = new DerivAPI(); let sent, late = 0;
  api.connected = true; api.ws = { send: s => sent = JSON.parse(s), removeAllListeners() {}, close() {} };
  api.onBuySuccess = () => assert.fail('orphan response reached legacy');
  api.onLateResponse = () => late++;
  const pending = api.sendRequest({ buy: 'proposal', passthrough: { signalId: 's' } });
  api.disconnect(); await assert.rejects(pending, /encerrada/);
  api.handleMessage({ req_id: sent.req_id, msg_type: 'buy', buy: { contract_id: 123 } });
  assert.equal(late, 1);
});

test('breakout can be configured for observation but never live',()=>{
 assert.deepEqual(validateConfig({execution:'observe',strategies:['breakout']}).strategies,['breakout']);
 assert.throws(()=>validateConfig({execution:'live',strategies:['breakout']}),/observação/);
});
test('scanner rotates asset priority instead of always favoring the first symbol',async t=>{
 t.mock.timers.enable({apis:['Date'],now:1800000005000});
 const {trader,session}=fixture(),order=[];
 trader.configure({enabled:true});session.derivAPI.fetchCandleHistory=async s=>{order.push(s);return [];};
 await trader.tick();t.mock.timers.tick(15000);await trader.tick();
 assert.deepEqual(order,['R_100','1HZ50V','1HZ50V','R_100']);
});
test('observation rejects an exit tick outside the permitted expiry window',async t=>{
 t.mock.timers.enable({apis:['Date'],now:200000});
 const {trader,session}=fixture();
 trader.state.shadows.push({signalId:'bad',symbol:'R_100',expiry:100,entry:100,direction:'CALL',stake:.35,payout:.7});
 session.derivAPI.sendRequest=async()=>({history:{times:[120],prices:[200]}});
 await trader.settleShadows();assert.equal(trader.state.trades.length,0);assert.equal(trader.state.shadows.length,1);
 session.derivAPI.sendRequest=async()=>({history:{times:[102],prices:[101]}});
 await trader.settleShadows();assert.equal(trader.state.trades.length,1);assert.equal(trader.state.trades[0].exitEpoch,102);
});
