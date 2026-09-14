import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceTrader } from '../vps-backend/automation/EvidenceTrader.js';
import { LAB_DEFAULTS, validateLabConfig, lastDigit, validTicks, candidate, evidenceGate } from '../vps-backend/automation/evidenceStrategies.js';
function fixture(request = async () => ({})) {
  const session = { activeMode: 'real', modeStates: { real: { digitLab: { trades: [{ profit: -5, stake: 1, timestamp: 1 }], config: { enabled: false } } }, demo: {} }, balance: 25, accountCurrency: 'USD', saveToFile() {}, syncToClients() {}, connectDeriv() {}, derivAPI: { connected: true, authorized: true, sendRequest: request, fetchCandleHistory: async () => [] } };
  return { session, engine: new EvidenceTrader(session) };
}
function pending(anchor, extra = {}) { return { id: 'p', arm: 'digit_transition', symbol: 'R_100', contractType: 'DIGITEVEN', unit: 't', duration: 1, precision: 3, stake: .5, payout: .95, createdAt: anchor * 1000 - 1000, anchor, allocated: false, evidence: {}, ...extra }; }
test('lab config rejects real execution, martingale, resets and risk above limits', () => {
  for (const patch of [{ execution: 'live' }, { maxGale: 2 }, { reset: true }, { stake: 2 }, { dailyLossLimit: 6 }, { maxDrawdown: 21 }, { enabled: 'true' }]) assert.throws(() => validateLabConfig(patch));
  assert.deepEqual(validateLabConfig({ enabled: true }), { ...LAB_DEFAULTS, enabled: true });
});
test('digit precision comes from explicit metadata and preserves trailing zeros', () => {
  assert.equal(lastDigit(123.45, 3), 0); assert.equal(lastDigit(123.457, 3), 7);
  assert.equal(lastDigit(123.45, undefined), null);
  assert.deepEqual(validTicks({ times: [1, 1], prices: [1, 2] }, 2), []);
});
test('new state isolates legacy data and accounts without deleting old results', () => {
  const { session, engine } = fixture(); assert.equal(engine.snapshot().legacy.quantum.net, -5);
  engine.state.trades.push({ id: 'new' }); session.activeMode = 'demo'; assert.equal(engine.state.trades.length, 0);
  assert.equal(session.modeStates.real.digitLab.trades.length, 1);
});
test('tick-count settlement uses a future entry then one tick, not two seconds or quote spot', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 20, seen = [];
  const { session, engine } = fixture(async req => { seen.push(req); return { history: { times: [anchor + 1, anchor + 4, anchor + 5], prices: [123.451, 123.452, 123.453] } }; });
  engine.state.pending = [pending(anchor)]; await engine.tick();
  assert.equal(engine.state.trades[0].exitEpoch, anchor + 4); assert.equal(engine.state.trades[0].profit, .45);
  assert.equal(session.balance, 25); assert.ok(seen.every(r => !r.buy && !r.sell));
  engine.lastPoll = 0; await engine.tick(); assert.equal(engine.state.trades.length, 1);
});
test('pause still settles allocated results and releases risk reservation', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 20;
  const { engine } = fixture(async () => ({ history: { times: [anchor + 1, anchor + 2], prices: [123.452, 123.453] } }));
  engine.state.pending = [pending(anchor, { allocated: true })]; engine.ledger('digit_transition').reserved = .5;
  engine.configure({ enabled: false }); await engine.tick();
  assert.equal(engine.ledger('digit_transition').bank, 99.5); assert.equal(engine.ledger('digit_transition').reserved, 0);
});
test('missing ticks are excluded without inventing a result', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 200;
  const { engine } = fixture(async () => ({ history: { times: [], prices: [] } }));
  engine.state.pending = [pending(anchor, { allocated: true })]; engine.ledger('digit_transition').reserved = .5;
  await engine.tick(); assert.equal(engine.state.trades.length, 0); assert.equal(engine.state.pending.length, 0); assert.equal(engine.ledger('digit_transition').reserved, 0);
});
test('duration in minutes starts at future entry and rejects late exit', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 240;
  const { engine } = fixture(async () => ({ history: { times: [anchor + 1, anchor + 181], prices: [100, 101] } }));
  engine.state.pending = [pending(anchor, { unit: 'm', duration: 3, contractType: 'CALL' })]; await engine.tick();
  assert.equal(engine.state.trades[0].profit, .45); assert.equal(engine.state.trades[0].exitEpoch, anchor + 181);
});
test('a tie loses on directional contracts', async () => {
  const anchor = Math.floor(Date.now() / 1000) - 240;
  const { engine } = fixture(async () => ({ history: { times: [anchor + 1, anchor + 181], prices: [100, 100] } }));
  engine.state.pending = [pending(anchor, { unit: 'm', duration: 3, contractType: 'CALL' })]; await engine.tick(); assert.equal(engine.state.trades[0].profit, -.5);
});
test('risk limits reserve exposure, respect gross losses, and reset only daily budget', () => {
  const { engine } = fixture(), now = 1800000000, arm = 'digit_transition', gate = { qualified: true };
  assert.equal(engine.reserve(arm, gate, now), true); assert.equal(engine.reserve(arm, gate, now), false);
  const l = engine.ledger(arm); l.reserved = 0; l.dayLoss = 3;
  assert.equal(engine.reserve(arm, gate, now), false); assert.equal(engine.reserve(arm, gate, now + 86400), true);
  l.reserved = 0; l.drawdown = 15; assert.equal(engine.reserve(arm, gate, now + 172800), false);
  assert.equal(engine.reserve('digit_control', gate, now), false);
});
test('evidence filter requires prospective sample, both halves and positive payout margin', () => {
  const good = Array.from({ length: 200 }, (_, i) => ({ profit: i % 10 ? .45 : -.5, stake: .5 }));
  assert.equal(evidenceGate(good.slice(0, 199), 1.9).qualified, false);
  assert.equal(evidenceGate(good, 1.9).qualified, true);
  assert.equal(evidenceGate(good, 1.05).qualified, false);
  const random = good.map((r, i) => ({ ...r, profit: i % 2 ? .45 : -.5 }));
  assert.equal(evidenceGate(random, 1.9).qualified, false);
});
test('fakegale fixed requires exactly two losses and contiguous closed candles', () => {
  const block = 1800000000, bars = Array.from({ length: 5 }, (_, i) => ({ epoch: block - 180 + i*60, open: 100, close: 101 }));
  assert.equal(candidate('fakegale_fixed', bars, [], block + 122).contractType, 'PUT');
  assert.equal(candidate('fakegale_fixed', bars.slice(1), [], block + 122), null);
  bars[3].close = 99; assert.equal(candidate('fakegale_fixed', bars, [], block + 122), null);
});
test('pause during quotation discards the candidate before allocation', async () => {
  let engine;
  ({ engine } = fixture(async req => {
    if (req.active_symbols) return { active_symbols: [{ symbol: 'R_100', pip: .001 }] };
    if (req.ticks_history) { const now = Math.floor(Date.now()/1000); return { history: { times: Array.from({length:300},(_,i)=>now-299+i), prices: Array.from({length:300},(_,i)=>100+i/1000) } }; }
    if (req.proposal) { engine.configure({ enabled: false }); return { proposal: { id: 'q', ask_price: .5, payout: .95, spot: 100, spot_time: Date.now()/1000 } }; }
    throw Error('Unexpected request');
  }));
  engine.configure({ enabled: true, symbols: ['R_100'] }); await engine.tick(); assert.equal(engine.state.pending.length, 0);
});
