import test from 'node:test';
import assert from 'node:assert/strict';
import { runSpotTrendStudy, SPOT_STUDY_VERSION } from '../src/platform/spotResearch.js';
import marketHandler from '../server/okxMarket.js';

function bars(count = 600) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * .06 + Math.sin(index / 11) * 1.4;
    return { time: index * 3600000, open: close - .04, high: close + .22,
      low: close - .22, close, closed: true };
  });
}

test('fixed hourly study separates consecutive windows and does not promote a small historical sample', () => {
  const sample = bars();
  const study = runSpotTrendStudy(sample);
  assert.equal(study.version, SPOT_STUDY_VERSION);
  assert.equal(study.sample, 600);
  assert.equal(study.validation.startTime, sample[301].time);
  assert.equal(study.calibration.endTime, sample[299].time);
  assert.equal(study.verified, false);
  assert.ok(study.calibration.benchmarkValue < 1100); // Controle mantém só 25% de exposição.
});

test('later candles cannot change prior fills, curve or entry decisions', () => {
  const original = bars();
  const changed = original.map((bar) => ({ ...bar }));
  changed[560] = { ...changed[560], close: changed[560].close * 1.5, high: changed[560].high * 1.5 };
  const before = runSpotTrendStudy(original);
  const after = runSpotTrendStudy(changed);
  assert.deepEqual(before.calibration, after.calibration);
  assert.deepEqual(before.validation.curve.slice(0, 250), after.validation.curve.slice(0, 250));
  assert.deepEqual(before.validation.trades.filter((row) => row.exitTime < changed[560].time),
    after.validation.trades.filter((row) => row.exitTime < changed[560].time));
});

test('hourly study endpoint pages older confirmed bars without mixing M15 or duplicate candles', async (t) => {
  const sample = bars();
  const newest = sample.slice(300).reverse();
  const older = sample.slice(0, 300).reverse();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({ code: '0', data: (calls.length === 1 ? newest : older).map((bar) =>
      [String(bar.time), String(bar.open), String(bar.high), String(bar.low), String(bar.close), '1', '1', '1', '1']) }) };
  });
  const response = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await marketHandler({ method: 'GET', query: { symbol: 'BTC-USDT', view: 'study' } }, response);
  assert.equal(response.code, 200);
  assert.equal(response.body.candles.length, 600);
  assert.equal(response.body.candles[0].time, sample[0].time);
  assert.equal(response.body.candles.at(-1).time, sample.at(-1).time);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /bar=1H/);
  assert.match(calls[1], new RegExp(`after=${sample[300].time}`));
});
