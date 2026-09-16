import test from 'node:test';
import assert from 'node:assert/strict';
import { backtestStrategy, equityOf, INITIAL_DEMO, simulateSpotOrder } from '../src/platform/cryptoCore.js';
import marketHandler from '../server/okxMarket.js';
import okxHandler from '../api/okx.js';

test('demo spot uses ask to buy, bid to sell, includes fees, and never sells more than held', () => {
  const bought = simulateSpotOrder(INITIAL_DEMO, { symbol: 'BTC-USDT', side: 'buy', amount: 100, bid: 99, ask: 100, time: 1 });
  assert.equal(bought.cash, 899.9);
  assert.equal(bought.holdings['BTC-USDT'].qty, 1);
  assert.equal(bought.holdings['BTC-USDT'].avgPrice, 100.1);
  assert.equal(equityOf(bought, { 'BTC-USDT': 99 }), 998.9);
  assert.throws(() => simulateSpotOrder(bought, { symbol: 'BTC-USDT', side: 'sell', amount: 100, bid: 99, ask: 100 }), /insuficiente/);
  const sold = simulateSpotOrder(bought, { symbol: 'BTC-USDT', side: 'sell', amount: 99, bid: 99, ask: 100, time: 2 });
  assert.equal(Number(sold.cash.toFixed(2)), 998.8);
  assert.equal(Number(sold.trades[0].realized.toFixed(2)), -1.2);
  assert.deepEqual(sold.holdings, {});
});

test('lab decisions before a later changed candle remain identical', () => {
  const candles = Array.from({ length: 70 }, (_, index) => {
    const close = 100 + index * 0.35 + Math.sin(index / 3) * 2;
    return { time: index * 900000, open: close - 0.1, high: close + 0.5, low: close - 0.5, close, closed: true };
  });
  const changed = candles.map((bar) => ({ ...bar }));
  changed[60].close += 30;
  changed[60].high += 30;
  for (const method of ['ema', 'breakout']) {
    const original = backtestStrategy(candles, method);
    const modified = backtestStrategy(changed, method);
    assert.deepEqual(original.curve.slice(0, 33), modified.curve.slice(0, 33));
  }
});

test('public market endpoint rejects unknown instruments without contacting exchange', async () => {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await marketHandler({ method: 'GET', query: { symbol: 'PRIVATE-PAIR' } }, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /Ativo/);
});

test('single OKX function separates market and demo routes without accepting unknown services', async () => {
  const response = () => ({ statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  const unknown = response();
  await okxHandler({ method: 'GET', query: { kind: 'unknown' } }, unknown);
  assert.equal(unknown.statusCode, 400);
  const market = response();
  await okxHandler({ method: 'GET', query: { kind: 'market', symbol: 'PRIVATE-PAIR' } }, market);
  assert.equal(market.statusCode, 400);
  assert.match(market.body.error, /Ativo/);
});
