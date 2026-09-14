import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeSignal, entryEconomics, multiplierProfit } from '../vps-backend/automation/rangeStrategies.js';
import { EvidenceTrader } from '../vps-backend/automation/EvidenceTrader.js';
function channel(last = { open: 100.05, low: 100.02, high: 100.2, close: 100.16 }) {
  const bars = Array.from({ length: 20 }, (_, i) => ({ epoch: i * 60, open: 100.5, close: 100.5, high: i % 4 === 0 ? 101 : 100.7, low: i % 4 === 2 ? 100 : 100.3 }));
  return [...bars, { epoch: 1200, ...last }];
}
function fixture(history = { times: [], prices: [] }) {
  const calls = [];
  const session = { activeMode: 'real', modeStates: { real: {}, demo: {} }, balance: 25, saveToFile() {}, syncToClients() {},
    derivAPI: { connected: true, authorized: true, sendRequest: async req => { calls.push(req); return { history }; } } };
  const owner = new EvidenceTrader(session);
  return { owner, engine: owner.range, session, calls };
}
function position(extra = {}) {
  return { id: 'p', arm: 'range_escape', symbol: 'RB100', direction: 1, contractType: 'MULTUP', stake: 1, multiplier: 20,
    commission: .02, stopOut: -.9, precision: 1, anchor: Date.now() / 1000 - 30, entry: 100, entryEpoch: 1, stop: 99, target: 101, ...extra };
}
test('two structural signals use a confirmed past channel and closed trigger candle', () => {
  assert.equal(rangeSignal('range_rejection', channel(), 1265)?.direction, 1);
  const breakout = channel({ open: 100.9, low: 100.85, high: 101.15, close: 101.12 });
  assert.equal(rangeSignal('range_escape', breakout, 1265)?.direction, 1);
  assert.equal(rangeSignal('range_rejection', breakout, 1265), null);
  assert.equal(rangeSignal('range_escape', breakout, 1259), null);
  assert.equal(rangeSignal('range_escape', breakout, 1281), null);
  assert.equal(rangeSignal('range_rejection', channel().filter((_, i) => i !== 3), 1265), null);
  const future = [...channel(), { epoch: 1260, open: 100, low: 1, high: 999, close: 900 }];
  assert.deepEqual(rangeSignal('range_rejection', future, 1265), rangeSignal('range_rejection', channel(), 1265));
});
test('commission and risk/reward reject expensive or already invalidated signals', () => {
  const signal = { direction: 1, stop: 99.5, target: 101.5 };
  assert.equal(entryEconomics(signal, 100, .02).accepted, true);
  assert.equal(entryEconomics(signal, 100, .2).accepted, false);
  assert.equal(entryEconomics(signal, 102, .02).accepted, false);
  assert.equal(entryEconomics(signal, 99, .02).accepted, false);
  assert.equal(entryEconomics(signal, 100, NaN).accepted, false);
  assert.equal(multiplierProfit(position(), 0), -1);
  assert.ok(Math.abs(multiplierProfit(position(), 101) - .18) < 1e-10);
  assert.ok(Math.abs(multiplierProfit(position({ direction: -1 }), 99) - .18) < 1e-10);
});
test('target closes at following tick, charges commission, persists only simulated results', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 30;
  const { engine, session, calls } = fixture({ times: [anchor + 1, anchor + 2, anchor + 3], prices: [100, 101, 100.8] });
  engine.state.positions = [position({ anchor, entryEpoch: anchor, lastEpoch: anchor })]; engine.ledger('range_escape').reserved = 1;
  await engine.tick(() => false, () => true);
  assert.equal(engine.state.trades.length, 1); assert.equal(engine.state.trades[0].exitEpoch, anchor + 3);
  assert.equal(engine.state.trades[0].profit, .14); assert.equal(engine.ledger('range_escape').bank, 100.14);
  assert.equal(engine.ledger('range_escape').reserved, 0); assert.equal(session.balance, 25);
  assert.ok(calls.every(r => !r.buy && !r.sell));
});
test('first future tick is revalidated and never replaced with quote spot', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 30;
  const { engine } = fixture({ times: [anchor + 1], prices: [102] });
  engine.state.positions = [position({ entry: undefined, entryEpoch: undefined, anchor })]; engine.ledger('range_escape').reserved = 1;
  await engine.tick(() => false, () => true);
  assert.equal(engine.state.positions.length, 0); assert.equal(engine.state.trades.length, 0); assert.equal(engine.ledger('range_escape').reserved, 0);
});
test('stop out precedes delayed exit and caps losses at stake', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 30;
  const { engine } = fixture({ times: [anchor + 1, anchor + 2], prices: [99, 90] });
  engine.state.positions = [position({ anchor, lastEpoch: anchor, entryEpoch: anchor })]; engine.ledger('range_escape').reserved = 1;
  await engine.tick(() => false, () => true);
  assert.equal(engine.state.trades[0].reason, 'stop_out'); assert.equal(engine.state.trades[0].profit, -1);
  assert.equal(engine.ledger('range_escape').dayLoss, 1);
});
test('unrecoverable path gap reserves risk instead of fabricating a profitable exit', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 30;
  const { engine } = fixture({ times: [anchor + 10], prices: [110] });
  engine.state.positions = [position({ anchor, lastEpoch: anchor })]; engine.ledger('range_escape').reserved = 1;
  await engine.tick(() => false, () => true);
  assert.equal(engine.state.trades.length, 0); assert.ok(engine.state.positions[0].blocked); assert.equal(engine.ledger('range_escape').reserved, 1);
});
test('pause still services range positions and account states remain separate', async () => {
  const { owner, engine, session } = fixture(); engine.state.positions = [position()];
  let settled = false; engine.tick = async enabled => { assert.equal(enabled(), false); settled = true; };
  await owner.tick(); assert.equal(settled, true);
  session.activeMode = 'demo'; assert.equal(engine.state.positions.length, 0); assert.equal(session.modeStates.real.rangeResearch.positions.length, 1);
});
test('new simulation requires current quote, reserves full stake and respects daily budget', async () => {
  const { engine, session, calls } = fixture();
  const now = Date.now, epoch = 1800001265;
  Date.now = () => epoch * 1000;
  try {
    const bars = channel({ open: 100.9, low: 100.85, high: 101.15, close: 101.12 }).map(c => ({ epoch: 1800000000 + c.epoch,
      ...Object.fromEntries(['open','low','high','close'].map(k => [k, 100 + (c[k] - 100) * 8])) }));
    engine.metadata = { RB100: 1, RB200: 1 }; session.derivAPI.fetchCandleHistory = async () => bars;
    session.derivAPI.sendRequest = async req => { calls.push(req); return { proposal: { id: 'quote', ask_price: 1, multiplier: 20, commission: .02,
      spot: 108.96, spot_time: epoch, limit_order: { stop_out: { order_amount: -.9 } } } }; };
    await engine.tick(() => true, () => true);
    assert.equal(engine.state.positions.length, 1); assert.equal(engine.state.positions[0].entry, undefined);
    assert.equal(engine.ledger('range_escape').reserved, 1); assert.equal(session.balance, 25);
    engine.state.positions = []; engine.ledger('range_escape').reserved = 0; engine.ledger('range_escape').dayLoss = 3;
    engine.lastPoll = 0; calls.length = 0; await engine.tick(() => true, () => true);
    assert.equal(engine.state.positions.length, 0); assert.ok(!calls.some(r => r.proposal));
  } finally { Date.now = now; }
});
