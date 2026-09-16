import { OkxDemoClient, DEMO_SYMBOLS, validateDemoLimitOrder } from './okxDemoClient.js';
import { clearDemoCookie, demoCookieReady, readDemoCookie, sealDemoCredentials, setDemoCookie } from './okxDemoCookie.js';
import { createHash } from 'node:crypto';

const accountRef = (key) => createHash('sha256').update(key).digest('hex').slice(0, 16);

function sameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  try {
    const parsed = new URL(origin);
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https:' : 'http:';
    return !!host && parsed.host === host && parsed.protocol === protocol;
  } catch { return false; }
}

function validCredentials(input) {
  return ['key', 'secret', 'passphrase'].every((name) => typeof input?.[name] === 'string' && input[name].length >= 6 && input[name].length <= 200 && !/[\r\n]/.test(input[name]));
}

function safeAccount(balance, orders, symbol, instrument, ticker, canTrade, ref) {
  const permitted = new Set(['USDT', 'BTC', 'ETH', 'SOL']);
  const balances = (balance[0]?.details || []).filter((row) => permitted.has(row.ccy)).map((row) => ({ ccy: row.ccy, cash: Number(row.cashBal), available: Number(row.availBal), frozen: Number(row.frozenBal) }));
  return {
    connected: true, environment: 'okx-demo', canTrade, accountRef: ref, symbol,
    balances, orders: orders.filter((row) => DEMO_SYMBOLS.has(row.instId)).map((row) => ({ clientId: row.clOrdId, brokerId: row.ordId, symbol: row.instId, side: row.side, price: row.px, quantity: row.sz, filled: row.accFillSz, state: row.state })),
    instrument: { minSize: instrument?.minSz, lotSize: instrument?.lotSz, tickSize: instrument?.tickSz, state: instrument?.state },
    ticker: { last: Number(ticker?.last), bid: Number(ticker?.bidPx), ask: Number(ticker?.askPx), quoteTime: Number(ticker?.ts) }
  };
}

function safeHistory(orders, fills, symbol, fillsAvailable) {
  const selected = orders.filter((row) => row.instId === symbol).slice(0, 50);
  const ids = new Set(selected.map((row) => row.ordId));
  return {
    environment: 'okx-demo', symbol, fillsAvailable,
    scope: 'Ordens concluídas dos últimos 7 dias; execuções consultadas separadamente. Nenhum lucro spot é inferido.',
    orders: selected.map((row) => ({
      brokerId: row.ordId, clientId: row.clOrdId || '', origin: /^AstroD[0-9a-f]{20}$/.test(row.clOrdId || '') ? 'astrobot' : 'externa',
      side: row.side, type: row.ordType, state: row.state, limitPrice: row.px,
      quantity: row.sz, filled: row.accFillSz, averagePrice: row.avgPx,
      createdAt: Number(row.cTime), updatedAt: Number(row.uTime)
    })),
    fills: fills.filter((row) => row.instId === symbol && ids.has(row.ordId)).slice(0, 100).map((row) => ({
      brokerId: row.ordId, tradeId: row.tradeId, side: row.side, price: row.fillPx,
      quantity: row.fillSz, fee: row.fee, feeCurrency: row.feeCcy, filledAt: Number(row.ts)
    }))
  };
}

export function createOkxDemoHandler({ Client = OkxDemoClient, validateOrder = validateDemoLimitOrder } = {}) {
return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!demoCookieReady()) return res.status(503).json({ error: 'Conector Demo OKX ainda não configurado neste ambiente' });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Método não permitido' });
  if (req.method !== 'GET' && !sameOrigin(req)) return res.status(403).json({ error: 'Origem não autorizada' });
  if (req.method === 'DELETE') { clearDemoCookie(req, res); return res.status(200).json({ connected: false }); }

  const action = req.body?.action;
  if (req.method === 'POST' && action === 'connect') {
    if (!validCredentials(req.body)) return res.status(400).json({ error: 'Chave, segredo e passphrase Demo inválidos' });
    const credentials = { key: req.body.key, secret: req.body.secret, passphrase: req.body.passphrase, demo: true };
    try {
      const client = new Client(credentials);
      const [configuration, balances] = await Promise.all([client.config(), client.balance()]);
      const permissions = String(configuration[0]?.perm || '').split(',').map((value) => value.trim().toLowerCase());
      if (!permissions.includes('read_only') || permissions.some((value) => !['read_only', 'trade'].includes(value))) return res.status(400).json({ error: 'Use uma chave Demo apenas com permissões Read e, opcionalmente, Trade' });
      const canTrade = permissions.includes('trade');
      setDemoCookie(req, res, sealDemoCredentials({ ...credentials, canTrade }));
      return res.status(200).json({ connected: true, canTrade, accountRef: accountRef(credentials.key), environment: 'okx-demo', balances: safeAccount(balances, [], 'BTC-USDT', null, null, canTrade).balances });
    } catch { return res.status(401).json({ error: 'Credenciais rejeitadas pela Demo OKX. Crie a chave em Trade → Demo Trading → Demo Trading API e confira a passphrase.' }); }
  }

  const credentials = readDemoCookie(req);
  if (!credentials) return res.status(401).json({ error: 'Conecte novamente a conta Demo OKX' });
  const client = new Client(credentials);
  const symbol = req.method === 'GET' ? req.query?.symbol || 'BTC-USDT' : req.body?.symbol;
  if (!DEMO_SYMBOLS.has(symbol)) return res.status(400).json({ error: 'Ativo Demo não disponível' });

  try {
    if (req.method === 'GET') {
      if (req.query?.view === 'history') {
        const orders = await client.ordersHistory(symbol);
        let fills = []; let fillsAvailable = true;
        try { fills = await client.fillsHistory(symbol); } catch { fillsAvailable = false; }
        return res.status(200).json(safeHistory(orders, fills, symbol, fillsAvailable));
      }
      if (req.query?.view && req.query.view !== 'account') return res.status(400).json({ error: 'Consulta Demo inválida' });
      const [balance, orders, instruments, tickers] = await Promise.all([
        client.balance(), client.pending(symbol), client.instrument(symbol), client.ticker(symbol)
      ]);
      return res.status(200).json(safeAccount(balance, orders, symbol, instruments[0], tickers[0], credentials.canTrade, accountRef(credentials.key)));
    }
    if (action === 'order') {
      if (!credentials.canTrade) return res.status(403).json({ error: 'Chave Demo sem permissão Trade' });
      let order;
      try { order = await validateOrder(client, req.body); }
      catch (error) {
        const brokerUnavailable = /^OKX (HTTP|recusou)/.test(error.message || '') || error.name === 'AbortError';
        return res.status(brokerUnavailable ? 502 : 400).json({ status: 'not_submitted', clientId: req.body?.clientId,
          error: brokerUnavailable ? 'Validação Demo indisponível; nenhuma ordem foi enviada' : error.message });
      }
      try {
        const rows = await client.placeLimitOrder(order);
        const ack = rows[0];
        if (!ack || ack.sCode !== '0') return res.status(400).json({ status: 'rejected', clientId: order.clOrdId, error: `Ordem recusada pela OKX (${ack?.sCode || 'sem código'})` });
        return res.status(200).json({ status: 'acknowledged', clientId: order.clOrdId, brokerId: ack.ordId, message: 'Envio aceito; consulte a ordem para confirmar o estado final' });
      } catch (error) {
        if (error.message?.startsWith('OKX recusou a chamada')) return res.status(400).json({ status: 'rejected', clientId: order.clOrdId, error: error.message });
        try {
          const rows = await client.orderByClientId(symbol, order.clOrdId);
          if (rows[0]) return res.status(200).json({ status: rows[0].state, clientId: order.clOrdId, brokerId: rows[0].ordId });
        } catch { /* Estado ambíguo: nunca reenviar automaticamente. */ }
        return res.status(202).json({ status: 'unknown', clientId: order.clOrdId, message: 'Envio incerto. Consulte pelo identificador antes de qualquer nova ordem.' });
      }
    }
    if (action === 'lookup' || action === 'cancel') {
      const clientId = req.body?.clientId;
      if (!/^AstroD[0-9a-f]{20}$/.test(clientId || '')) return res.status(400).json({ error: 'Identificador de ordem inválido' });
      if (action === 'cancel') {
        if (!credentials.canTrade) return res.status(403).json({ error: 'Chave Demo sem permissão Trade' });
        try {
          const rows = await client.cancel(symbol, clientId);
          if (rows[0]?.sCode !== '0') return res.status(400).json({ error: `Cancelamento recusado (${rows[0]?.sCode || 'sem código'})` });
        } catch (error) {
          if (error.message?.startsWith('OKX recusou a chamada')) return res.status(400).json({ error: error.message });
          return res.status(202).json({ status: 'unknown', clientId, message: 'Cancelamento incerto. Consulte o estado da ordem antes de agir.' });
        }
      }
      let rows;
      try { rows = await client.orderByClientId(symbol, clientId); }
      catch {
        return res.status(202).json({ status: 'unknown', clientId, message: 'A OKX ainda não confirmou o estado da ordem. Consulte novamente.' });
      }
      const row = rows[0];
      return res.status(200).json({ status: row?.state || 'unknown', clientId, brokerId: row?.ordId, filled: row?.accFillSz, averagePrice: row?.avgPx });
    }
    return res.status(400).json({ error: 'Ação Demo inválida' });
  } catch (error) {
    console.error('[OKX Demo]', error.message);
    return res.status(502).json({ error: 'A OKX Demo não respondeu como esperado. Confira a conta e tente consultar novamente.' });
  }
};
}

export default createOkxDemoHandler();
