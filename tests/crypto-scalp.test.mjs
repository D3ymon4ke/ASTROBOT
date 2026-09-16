import test from 'node:test';
import assert from 'node:assert/strict';
import { createScalpState, observeScalp, scalpSignal, SCALP_CONFIG as C } from '../vps-backend/crypto/scalpEngine.js';
import { SYMBOLS } from '../vps-backend/crypto/paperEngine.js';
import handler from '../server/okxResearch.js';

const base = Date.UTC(2026, 8, 16);
function bars(n) {
  const data = Array.from({ length: n }, (_, i) => ({ time: base + i * C.barMs,
    open: 100 + i * .02, close: 100 + i * .02, high: 100.5 + i * .02, low: 99.5 + i * .02, volume: 10, closed: true }));
  const last = data.at(-1);
  last.close += .8; last.high = last.close + .5; last.volume = 20;
  return data;
}
function feeds(n, now, price = 102.4) {
  return Object.fromEntries(SYMBOLS.map(s => [s, { candles: bars(n), quote: { ask: price + .01, bid: price, time: now } }]));
}
function initial() {
  const now = base + 60 * C.barMs + 1000;
  return observeScalp(createScalpState(now), feeds(60, now), now);
}
function entered() {
  const now = base + 61 * C.barMs + 1000;
  return observeScalp(initial(), feeds(61, now), now);
}
test('M5 closed-bar signal validates data and retains fixed causal rules', () => {
  const now = base + 60 * C.barMs + 1000;
  assert.equal(scalpSignal(bars(60), now).entry, true);
  assert.throws(() => scalpSignal(bars(61), now), /inválida/);
  const lowVolume = bars(60); lowVolume.at(-1).volume = 1;
  assert.equal(scalpSignal(lowVolume, now).entry, false);
  const gap = bars(62).filter((_, i) => i !== 10);
  assert.throws(() => scalpSignal(gap, now + C.barMs * 2), /descontínua/);
});
test('bootstrap never buys; normal minute observations are needed before new M5 entry', () => {
  const s = initial();
  assert.ok(SYMBOLS.every(id => !s.assets[id].position));
  const gap = entered(); // Five-minute gap between polls must NOT create an entry.
  assert.ok(SYMBOLS.every(id => !gap.assets[id].position));
});
function continuousEntry() {
  let s = initial();
  const before = base + 61 * C.barMs - 1000;
  s = observeScalp(s, feeds(60, before), before);
  const now = base + 61 * C.barMs + 1000;
  return observeScalp(s, feeds(61, now), now);
}
test('entry reserves shared loss budget, charges costs, and replay after restart cannot duplicate', () => {
  const s = continuousEntry();
  assert.ok(SYMBOLS.every(id => s.assets[id].position));
  const risk = SYMBOLS.reduce((sum, id) => sum + s.assets[id].position.reservedRisk, 0);
  assert.ok(risk <= 3 && risk > 0);
  for (const a of Object.values(s.assets)) {
    assert.ok(a.equity < a.initialCapital);
    assert.ok(a.position.spent <= a.initialCapital * .25 + 1e-8);
  }
  const now = base + 61 * C.barMs + 1000;
  const repeated = observeScalp(JSON.parse(JSON.stringify(s)), feeds(61, now), now);
  assert.equal(repeated.assets['BTC-USDT'].cash, s.assets['BTC-USDT'].cash);
});
test('quote-driven exits work between candle closes and with candle feed down, at observed price', () => {
  const s = continuousEntry(), a = s.assets['BTC-USDT'];
  const now = base + 61 * C.barMs + 11000;
  const f = feeds(61, now);
  f['BTC-USDT'].candles = [];
  f['BTC-USDT'].quote.bid = a.position.stop - 1;
  f['BTC-USDT'].quote.ask = a.position.stop - .99;
  const next = observeScalp(s, f, now), result = next.assets['BTC-USDT'];
  assert.equal(result.position, null);
  assert.equal(result.closedTrades, 1);
  assert.ok(result.error);
  const expected = a.position.quantity * f['BTC-USDT'].quote.bid * .9995 * .999 - a.position.spent;
  assert.ok(Math.abs(result.realized - expected) < 1e-9);
  assert.ok(result.realized < -a.position.reservedRisk); // Gap is not falsely capped at planned stop.
  assert.equal(observeScalp(next, f, now).assets['BTC-USDT'].closedTrades, 1);
});
test('daily goal is sticky, losses never replenish budget, next UTC day resets only daily counters', () => {
  let s = continuousEntry();
  s.day.realized = 5;
  const now = base + 61 * C.barMs + 11000;
  s = observeScalp(s, feeds(61, now), now);
  assert.equal(s.day.halted, true);
  s.day.realized = 4;
  assert.equal(observeScalp(s, feeds(61, now), now).day.halted, true);
  const tomorrow = base + 86400000 + 1000;
  const reset = observeScalp(s, {}, tomorrow);
  assert.equal(reset.day.halted, false);
  assert.equal(reset.day.grossLoss, 0);
  assert.deepEqual(reset.assets['BTC-USDT'].position, s.assets['BTC-USDT'].position);
});
test('excess spread and stale quotes prevent new entries; no phantom exit with stale quotes', () => {
  const s = continuousEntry();
  const now = base + 61 * C.barMs + 31000;
  const f = feeds(61, now, 50);
  f['BTC-USDT'].quote.time = now - 16000;
  const next = observeScalp(s, f, now);
  assert.deepEqual(next.assets['BTC-USDT'].position, s.assets['BTC-USDT'].position);
  assert.equal(next.assets['BTC-USDT'].closedTrades, 0);
  let start = initial();
  const before = base + 61 * C.barMs - 1000;
  start = observeScalp(start, feeds(60, before), before);
  const time = base + 61 * C.barMs + 1000;
  const wide = feeds(61, time); for (const row of Object.values(wide)) row.quote.ask += .2;
  const blocked = observeScalp(start, wide, time);
  assert.ok(SYMBOLS.every(id => !blocked.assets[id].position));
  assert.match(blocked.assets['BTC-USDT'].status, /custos/);
});
test('scalping API uses separate snapshot and short stale threshold', async t => {
  let url;
  const s = createScalpState(Date.now() - 40000);
  t.mock.method(globalThis, 'fetch', async input => { url = String(input); return { ok: true, text: async () => JSON.stringify(s) }; });
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await handler({ method: 'GET', query: { strategy: 'scalp' } }, res);
  assert.equal(res.code, 200); assert.equal(res.data.stale, true); assert.match(url, /crypto-scalp.json$/);
});

test('shared daily budget limits simultaneous signals and time exit uses current quote', () => {
  let s = initial();
  s.day.grossLoss = 4;
  const before = base + 61 * C.barMs - 1000;
  s = observeScalp(s, feeds(60, before), before);
  const now = base + 61 * C.barMs + 1000;
  s = observeScalp(s, feeds(61, now), now);
  const reserved = Object.values(s.assets).reduce((sum, a) => sum + (a.position?.reservedRisk || 0), 0);
  assert.ok(reserved <= 1 + 1e-9);
  assert.ok(reserved > 0);
  const later = now + C.maxHold;
  const next = observeScalp(s, feeds(65, later), later);
  assert.ok(Object.values(next.assets).every(a => !a.position));
  assert.ok(Object.values(next.assets).some(a => a.trades.at(-1)?.reason === '20 minutos'));
  assert.ok(next.day.grossLoss >= 4);
});
