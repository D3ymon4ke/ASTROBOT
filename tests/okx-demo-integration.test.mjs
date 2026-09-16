import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { OkxDemoClient, validateDemoLimitOrder } from '../server/okxDemoClient.js';
import { openDemoCredentials, sealDemoCredentials } from '../server/okxDemoCookie.js';
import { createOkxDemoHandler } from '../server/okxDemo.js';
import { demoIntentKey, newDemoClientId, readDemoIntent, unresolvedDemoIntent, writeDemoIntent } from '../src/platform/demoIntent.js';

const originalKey = process.env.OKX_DEMO_COOKIE_KEY;
process.env.OKX_DEMO_COOKIE_KEY = '19'.repeat(32);
process.on('exit', () => { if (originalKey === undefined) delete process.env.OKX_DEMO_COOKIE_KEY; else process.env.OKX_DEMO_COOKIE_KEY = originalKey; });

test('OKX Demo signing includes path, query and body, always flags simulated environment', async () => {
  const calls = [];
  const timestamp = '2026-09-15T18:00:00.000Z';
  const client = new OkxDemoClient({ key: 'sample-key', secret: 'sample-secret', passphrase: 'sample-pass' }, {
    now: () => new Date(timestamp),
    fetchImpl: async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, json: async () => ({ code: '0', data: [] }) }; }
  });
  await client.request('GET', '/account/balance', { query: { ccy: 'BTC' } });
  await client.request('POST', '/trade/order', { body: { instId: 'BTC-USDT', tdMode: 'cash' } });
  await client.ordersHistory('BTC-USDT');
  assert.equal(calls[0].options.headers['x-simulated-trading'], '1');
  assert.equal(calls[0].options.headers['OK-ACCESS-SIGN'], createHmac('sha256', 'sample-secret').update(`${timestamp}GET/api/v5/account/balance?ccy=BTC`).digest('base64'));
  assert.equal(calls[1].options.headers['OK-ACCESS-SIGN'], createHmac('sha256', 'sample-secret').update(`${timestamp}POST/api/v5/trade/order${JSON.stringify({ instId: 'BTC-USDT', tdMode: 'cash' })}`).digest('base64'));
  assert.equal(calls[2].options.headers['x-simulated-trading'], '1');
  assert.equal(calls[2].options.headers['OK-ACCESS-SIGN'], createHmac('sha256', 'sample-secret').update(`${timestamp}GET/api/v5/trade/orders-history?instType=SPOT&instId=BTC-USDT&limit=50`).digest('base64'));
});

test('encrypted demo cookie rejects tampering, expiry and non-demo credential state', () => {
  const sealed = sealDemoCredentials({ key: 'demo-key', secret: 'demo-secret', passphrase: 'demo-pass', demo: true });
  assert.equal(openDemoCredentials(sealed)?.key, 'demo-key');
  const bytes = Buffer.from(sealed, 'base64url'); bytes[bytes.length - 1] ^= 1;
  assert.equal(openDemoCredentials(bytes.toString('base64url')), null);
  assert.equal(openDemoCredentials(sealDemoCredentials({ key: 'real-key', demo: false })), null);
  assert.equal(openDemoCredentials(sealDemoCredentials({ key: 'old-key', demo: true }, Date.now() - 1)), null);
});

function fakeRiskClient(overrides = {}) {
  return {
    instrument: async () => [{ state: 'live', instType: 'SPOT', minSz: '0.0001', lotSz: '0.0001', tickSz: '0.1' }],
    ticker: async () => [{ last: '100', ts: String(Date.now()) }],
    balance: async () => [{ details: [{ ccy: 'USDT', availBal: '100' }, { ccy: 'BTC', availBal: '1' }] }],
    pending: async () => [],
    ...overrides
  };
}

test('server demo risk validates price/lot increments, notional, availability and pending orders', async () => {
  const valid = { symbol: 'BTC-USDT', side: 'buy', price: '100.0', quantity: '0.1000', clientId: `AstroD${'a'.repeat(20)}` };
  const order = await validateDemoLimitOrder(fakeRiskClient(), valid);
  assert.equal(order.tdMode, 'cash'); assert.equal(order.ordType, 'limit');
  assert.match(order.clOrdId, /^AstroD[0-9a-f]{20}$/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient(), { ...valid, clientId: undefined }), /intenção/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient(), { ...valid, quantity: '0.3000' }), /permitido/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient(), { ...valid, price: '100.05' }), /incrementos/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient({ pending: async () => [{ ordId: '1' }] }), valid), /pendente/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient({ balance: async () => [{ details: [{ ccy: 'USDT', availBal: '2' }] }] }), valid), /insuficiente/);
  await assert.rejects(validateDemoLimitOrder(fakeRiskClient({ ticker: async () => [{ last: '100', ts: String(Date.now() - 120000) }] }), valid), /desatualizada/);
});

function response() {
  return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

const baseHeaders = { host: 'localhost:5173', origin: 'http://localhost:5173' };

test('official demo connector isolates cookie, rejects withdrawal keys and never retries ambiguous order', async () => {
  let placementCount = 0;
  let simulateTimeout = false;
  let cancelCount = 0;
  class MockClient {
    constructor(credentials) { this.withdraw = credentials.key === 'withdraw-key'; this.extra = credentials.key === 'extra-key'; this.invalid = credentials.key === 'not-demo-key'; }
    config() { if (this.invalid) throw new Error('OKX HTTP 401'); return Promise.resolve([{ perm: this.withdraw ? 'read_only,trade,withdraw' : this.extra ? 'read_only,trade,transfer' : 'read_only,trade' }]); }
    balance() { return Promise.resolve([{ details: [{ ccy: 'USDT', cashBal: '100', availBal: '100', frozenBal: '0' }] }]); }
    pending() { return Promise.resolve([]); }
    instrument() { return Promise.resolve([{ minSz: '0.0001', lotSz: '0.0001', tickSz: '0.1', state: 'live' }]); }
    ticker() { return Promise.resolve([{ last: '100', bidPx: '99.9', askPx: '100.1', ts: String(Date.now()) }]); }
    placeLimitOrder() { placementCount++; if (simulateTimeout) throw new Error('network timeout'); return Promise.resolve([{ sCode: '0', ordId: 'broker-1' }]); }
    orderByClientId() { throw new Error('not found yet'); }
    cancel() { cancelCount++; return Promise.resolve([{ sCode: '0' }]); }
    ordersHistory() { return Promise.resolve([
      { instId: 'BTC-USDT', ordId: 'broker-1', clOrdId: `AstroD${'a'.repeat(20)}`, side: 'buy', ordType: 'limit', state: 'filled', px: '100', sz: '0.1', accFillSz: '0.1', avgPx: '99.9', cTime: '1000', uTime: '2000', apiKey: 'should-not-leak' },
      { instId: 'BTC-USDT', ordId: 'broker-2', clOrdId: '', side: 'sell', state: 'canceled', px: '101', sz: '0.1', accFillSz: '0', avgPx: '', cTime: '3000', uTime: '4000' },
      { instId: 'ETH-USDT', ordId: 'irrelevant', state: 'filled' }
    ]); }
    fillsHistory() { return Promise.resolve([
      { instId: 'BTC-USDT', ordId: 'broker-1', tradeId: 'fill-1', side: 'buy', fillPx: '99.9', fillSz: '0.1', fee: '-0.001', feeCcy: 'BTC', ts: '2000', apiKey: 'should-not-leak' },
      { instId: 'BTC-USDT', ordId: 'old-order', tradeId: 'old-fill', side: 'buy' }
    ]); }
  }
  const handler = createOkxDemoHandler({ Client: MockClient, validateOrder: async () => ({ clOrdId: 'AstroD' + 'a'.repeat(20), instId: 'BTC-USDT' }) });
  const denied = response();
  await handler({ method: 'POST', headers: { ...baseHeaders, origin: 'https://other.example' }, body: { action: 'connect' } }, denied);
  assert.equal(denied.statusCode, 403);
  const withdrawal = response();
  await handler({ method: 'POST', headers: baseHeaders, body: { action: 'connect', key: 'withdraw-key', secret: 'demo-secret', passphrase: 'demo-pass' } }, withdrawal);
  assert.equal(withdrawal.statusCode, 400);
  assert.equal(withdrawal.headers['set-cookie'], undefined);
  const extra = response();
  await handler({ method: 'POST', headers: baseHeaders, body: { action: 'connect', key: 'extra-key', secret: 'demo-secret', passphrase: 'demo-pass' } }, extra);
  assert.equal(extra.statusCode, 400);
  const wrongEnvironment = response();
  await handler({ method: 'POST', headers: baseHeaders, body: { action: 'connect', key: 'not-demo-key', secret: 'demo-secret', passphrase: 'demo-pass' } }, wrongEnvironment);
  assert.equal(wrongEnvironment.statusCode, 401);
  assert.doesNotMatch(wrongEnvironment.body.error, /HTTP 401/);
  const connected = response();
  await handler({ method: 'POST', headers: baseHeaders, body: { action: 'connect', key: 'demo-key', secret: 'demo-secret', passphrase: 'demo-pass' } }, connected);
  assert.equal(connected.statusCode, 200);
  assert.ok(connected.headers['set-cookie'].includes('HttpOnly'));
  assert.equal(connected.body.environment, 'okx-demo');
  assert.match(connected.body.accountRef, /^[0-9a-f]{16}$/);
  const cookie = connected.headers['set-cookie'].split(';')[0];
  const state = response();
  await handler({ method: 'GET', headers: { cookie }, query: { symbol: 'BTC-USDT' } }, state);
  assert.equal(state.body.connected, true);
  const history = response();
  await handler({ method: 'GET', headers: { cookie }, query: { symbol: 'BTC-USDT', view: 'history' } }, history);
  assert.equal(history.statusCode, 200);
  assert.equal(history.body.orders.length, 2);
  assert.equal(history.body.orders[0].origin, 'astrobot');
  assert.equal(history.body.orders[1].origin, 'externa');
  assert.equal(history.body.fills.length, 1);
  assert.equal(JSON.stringify(history.body).includes('should-not-leak'), false);
  const acknowledged = response();
  await handler({ method: 'POST', headers: { ...baseHeaders, cookie }, body: { action: 'order', symbol: 'BTC-USDT' } }, acknowledged);
  assert.equal(acknowledged.body.status, 'acknowledged');
  const invalidOrderHandler = createOkxDemoHandler({ Client: MockClient, validateOrder: async () => { throw new Error('Valor permitido: $1 a $25'); } });
  const invalid = response();
  await invalidOrderHandler({ method: 'POST', headers: { ...baseHeaders, cookie }, body: { action: 'order', symbol: 'BTC-USDT', clientId: `AstroD${'b'.repeat(20)}` } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.status, 'not_submitted');
  assert.equal(placementCount, 1);
  simulateTimeout = true;
  const uncertain = response();
  await handler({ method: 'POST', headers: { ...baseHeaders, cookie }, body: { action: 'order', symbol: 'BTC-USDT' } }, uncertain);
  assert.equal(uncertain.statusCode, 202);
  assert.equal(uncertain.body.status, 'unknown');
  assert.equal(placementCount, 2);
  const cancellation = response();
  await handler({ method: 'POST', headers: { ...baseHeaders, cookie }, body: { action: 'cancel', symbol: 'BTC-USDT', clientId: `AstroD${'a'.repeat(20)}` } }, cancellation);
  assert.equal(cancellation.statusCode, 202);
  assert.equal(cancellation.body.status, 'unknown');
  assert.equal(cancelCount, 1);
});

test('Demo intent is created before transmission, scoped to account and survives a browser reload without credentials', () => {
  const ref = 'a'.repeat(16);
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) || null, setItem: (key, value) => map.set(key, value) };
  const id = newDemoClientId({ getRandomValues: (bytes) => bytes.fill(0x1a) });
  assert.equal(id, `AstroD${'1a'.repeat(10)}`);
  writeDemoIntent(storage, ref, { clientId: id, symbol: 'BTC-USDT', side: 'buy', price: '100', quantity: '0.01', status: 'prepared', createdAt: 1, secret: 'must-not-persist' });
  const saved = readDemoIntent(storage, ref);
  assert.equal(saved.clientId, id);
  assert.equal(unresolvedDemoIntent(saved), true);
  assert.equal(JSON.stringify(saved).includes('must-not-persist'), false);
  assert.equal(readDemoIntent(storage, 'b'.repeat(16)), null);
  assert.ok(map.has(demoIntentKey(ref)));
  writeDemoIntent(storage, ref, { ...saved, status: 'filled' });
  assert.equal(unresolvedDemoIntent(readDemoIntent(storage, ref)), false);
  assert.equal(unresolvedDemoIntent({ ...saved, status: 'not_submitted' }), false);
});
