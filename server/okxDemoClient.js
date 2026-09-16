import { createHmac } from 'node:crypto';

export const DEMO_SYMBOLS = new Set(['BTC-USDT', 'ETH-USDT', 'SOL-USDT']);
export const DEMO_MAX_NOTIONAL = 25;

export class OkxDemoClient {
  constructor(credentials, { fetchImpl = fetch, baseUrl = 'https://openapi.okx.com', now = () => new Date() } = {}) {
    this.credentials = credentials;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
    this.now = now;
  }

  async request(method, resource, { query = {}, body, timeoutMs = 7000, deadlineMs } = {}) {
    if (!/^\/(account|trade|market|public)\/[a-z0-9/-]+$/.test(resource)) throw new Error('Recurso OKX inválido');
    const path = `/api/v5${resource}`;
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const requestPath = url.pathname + url.search;
    const timestamp = this.now().toISOString();
    const encodedBody = body === undefined ? '' : JSON.stringify(body);
    const signature = createHmac('sha256', this.credentials.secret).update(timestamp + method + requestPath + encodedBody).digest('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {
        'Content-Type': 'application/json', 'OK-ACCESS-KEY': this.credentials.key,
        'OK-ACCESS-SIGN': signature, 'OK-ACCESS-PASSPHRASE': this.credentials.passphrase,
        'OK-ACCESS-TIMESTAMP': timestamp, 'x-simulated-trading': '1'
      };
      if (deadlineMs) headers.expTime = String(deadlineMs);
      const response = await this.fetchImpl(url, { method, headers, body: encodedBody || undefined, signal: controller.signal });
      if (!response.ok) throw new Error(`OKX HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.code !== '0' || !Array.isArray(payload.data)) throw new Error(`OKX recusou a chamada (${payload.code || 'sem código'})`);
      return payload.data;
    } finally { clearTimeout(timer); }
  }

  config() { return this.request('GET', '/account/config'); }
  balance() { return this.request('GET', '/account/balance'); }
  instrument(symbol) { return this.request('GET', '/public/instruments', { query: { instType: 'SPOT', instId: symbol } }); }
  ticker(symbol) { return this.request('GET', '/market/ticker', { query: { instId: symbol } }); }
  pending(symbol) { return this.request('GET', '/trade/orders-pending', { query: { instType: 'SPOT', instId: symbol } }); }
  ordersHistory(symbol) { return this.request('GET', '/trade/orders-history', { query: { instType: 'SPOT', instId: symbol, limit: '50' } }); }
  fillsHistory(symbol) { return this.request('GET', '/trade/fills-history', { query: { instType: 'SPOT', instId: symbol, limit: '100' } }); }
  orderByClientId(symbol, clientId) { return this.request('GET', '/trade/order', { query: { instId: symbol, clOrdId: clientId } }); }
  placeLimitOrder(order) { return this.request('POST', '/trade/order', { body: order, timeoutMs: 5000, deadlineMs: Date.now() + 5000 }); }
  cancel(symbol, clientId) { return this.request('POST', '/trade/cancel-order', { body: { instId: symbol, clOrdId: clientId } }); }
}

export function getAvailable(balanceRows, currency) {
  const details = balanceRows[0]?.details || [];
  const row = details.find((item) => item.ccy === currency);
  return Number(row?.availBal ?? row?.cashBal ?? 0);
}

export function isStepAligned(value, step) {
  const number = Number(value);
  const increment = Number(step);
  if (!Number.isFinite(number) || !Number.isFinite(increment) || number <= 0 || increment <= 0) return false;
  const units = number / increment;
  return Math.abs(units - Math.round(units)) < 1e-8;
}

export async function validateDemoLimitOrder(client, input) {
  const { symbol, side, price, quantity, clientId } = input || {};
  if (!DEMO_SYMBOLS.has(symbol) || !['buy', 'sell'].includes(side)) throw new Error('Par ou direção inválidos');
  if (!/^AstroD[0-9a-f]{20}$/.test(clientId || '')) throw new Error('Identificador da intenção Demo inválido');
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,10})?$/.test(String(price)) || !/^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/.test(String(quantity))) throw new Error('Use preço e quantidade decimais válidos');
  if (!Number.isFinite(Number(price)) || !Number.isFinite(Number(quantity)) || Number(price) <= 0 || Number(quantity) <= 0) throw new Error('Preço ou quantidade inválidos');
  const notional = Number(price) * Number(quantity);
  if (notional < 1 || notional > DEMO_MAX_NOTIONAL) throw new Error(`Valor permitido: $1 a $${DEMO_MAX_NOTIONAL} por ordem demo`);
  const [instruments, tickers, balances, pending] = await Promise.all([
    client.instrument(symbol), client.ticker(symbol), client.balance(), client.pending(symbol)
  ]);
  const instrument = instruments[0];
  const ticker = tickers[0];
  if (instrument?.state !== 'live' || instrument.instType !== 'SPOT') throw new Error('Par spot não está aberto');
  if (Number(quantity) < Number(instrument.minSz) || !isStepAligned(quantity, instrument.lotSz) || !isStepAligned(price, instrument.tickSz)) throw new Error('Preço ou quantidade fora dos incrementos OKX');
  if (!Number.isFinite(Number(ticker?.last)) || Date.now() - Number(ticker.ts) > 60000 || Math.abs(Number(price) / Number(ticker.last) - 1) > 0.02) throw new Error('Preço demo distante ou cotação desatualizada');
  if (pending.length > 0) throw new Error('Há ordem pendente neste par; resolva-a antes de abrir outra');
  const base = symbol.split('-')[0];
  const available = getAvailable(balances, side === 'buy' ? 'USDT' : base);
  if (side === 'buy' && available < notional * 1.002) throw new Error('USDT disponível insuficiente para ordem e taxa');
  if (side === 'sell' && available < Number(quantity)) throw new Error(`${base} disponível insuficiente`);
  return { instId: symbol, tdMode: 'cash', side, ordType: 'limit', px: String(price), sz: String(quantity), clOrdId: clientId };
}
