import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaperState, observePaper } from '../vps-backend/crypto/paperEngine.js';
import researchHandler from '../server/okxResearch.js';

const H = 3600000;
function bars(count) {
  return Array.from({ length: count }, (_, i) => ({ time: i * H, open: 100 + i,
    close: 100.5 + i, high: 100.7 + i, low: 99.7 + i, closed: true }));
}
function observe(state, count, delay = 1000) {
  const now = count * H + delay;
  return observePaper(state, bars(count), { ask: 101 + count, bid: 100.9 + count, time: now }, now);
}
test('paper bootstrap never converts past signals into fills; future observation survives restart without duplicate entry', () => {
  let state = createPaperState(100 * H).assets['BTC-USDT'];
  state = observe(state, 100);
  assert.equal(state.position, null);
  assert.equal(state.cash, 1000);
  state = observe(state, 101);
  assert.ok(state.position);
  assert.equal(state.cash, 750);
  assert.ok(state.equity < 1000); // Spread + two fees + impact, including liquidation value.
  const restarted = JSON.parse(JSON.stringify(state));
  const repeated = observe(restarted, 101);
  assert.deepEqual(repeated.position, state.position);
  assert.equal(repeated.cash, state.cash);
  assert.equal(repeated.curve.length, state.curve.length);
});
test('paper gaps and late signals do not backfill entries; invalid quotes and candles fail closed', () => {
  const state = observe(createPaperState(100 * H).assets['BTC-USDT'], 100);
  const gap = observe(state, 103);
  assert.equal(gap.position, null);
  assert.equal(gap.gaps, 2);
  assert.equal(observe(state, 101, 11 * 60000).position, null);
  const now = 101 * H + 120000;
  assert.throws(() => observePaper(state, bars(101), { ask: 202, bid: 201, time: now - 61000 }, now), /desatualizada/);
  assert.throws(() => observePaper(state, bars(101).filter((_, i) => i !== 50), { ask: 202, bid: 201, time: now }, now), /descontínuas/);
  assert.equal(state.cash, 1000);
});
test('paper exits use currently observed bid with all costs, once only, including delayed exits', () => {
  let state = observe(createPaperState(100 * H).assets['BTC-USDT'], 100);
  state = observe(state, 101);
  const position = state.position;
  const sample = bars(102);
  sample[101] = { ...sample[101], close: 170, low: 169 };
  const now = 102 * H + 11 * 60000;
  const quote = { ask: 170, bid: 169, time: now };
  const next = observePaper(state, sample, quote, now);
  assert.equal(next.position, null);
  assert.equal(next.closedTrades, 1);
  assert.equal(next.trades[0].delayed, true);
  assert.ok(Math.abs(next.cash - (750 + position.quantity * 169 * .9995 * .999)) < 1e-9);
  assert.equal(observePaper(next, sample, quote, now).closedTrades, 1);
});
test('snapshot API reports stale collection and rejects malformed upstream state', async t => {
  const response = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
  let data = createPaperState(0);
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => JSON.stringify(data) }));
  let res = response();
  await researchHandler({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.equal(res.data.stale, true);
  data = { mode: 'real' };
  res = response();
  await researchHandler({ method: 'GET' }, res);
  assert.equal(res.code, 503);
});
