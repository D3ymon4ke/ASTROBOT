const SYMBOLS = new Set(['BTC-USDT', 'ETH-USDT', 'SOL-USDT']);

function normalizeCandles(bars) {
  return bars.map((bar) => ({
    time: Number(bar[0]), open: Number(bar[1]), high: Number(bar[2]),
    low: Number(bar[3]), close: Number(bar[4]), volume: Number(bar[5]),
    closed: bar[8] === '1'
  })).filter((bar) => Object.values(bar).every((value) => typeof value !== 'number' || Number.isFinite(value)))
    .sort((a, b) => a.time - b.time);
}

async function okxGet(resource, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = new URL(`https://www.okx.com/api/v5/market/${resource}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`OKX HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.code !== '0' || !Array.isArray(payload.data)) throw new Error('Resposta de mercado inválida da OKX');
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : 'BTC-USDT';
  const tickerOnly = req.query.tickerOnly === '1';
  const view = req.query.view || 'market';
  if (!SYMBOLS.has(symbol)) return res.status(400).json({ error: 'Ativo não disponível' });
  if (!['market', 'study'].includes(view) || (view === 'study' && tickerOnly)) return res.status(400).json({ error: 'Consulta de mercado inválida' });
  try {
    if (view === 'study') {
      const newest = await okxGet('history-candles', { instId: symbol, bar: '1H', limit: '300' });
      if (!newest.length) throw new Error('Histórico horário vazio');
      const older = await okxGet('history-candles', { instId: symbol, bar: '1H', limit: '300', after: newest.at(-1)[0] });
      const candles = [...newest, ...older];
      const unique = [...new Map(normalizeCandles(candles).map((bar) => [bar.time, bar])).values()].sort((a, b) => a.time - b.time);
      if (unique.filter((bar) => bar.closed).length < 400) throw new Error('Amostra histórica insuficiente');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
      return res.status(200).json({ source: 'OKX', symbol, timeframe: '1H', timestamp: Date.now(), candles: unique });
    }
    const [tickers, bars] = await Promise.all([
      okxGet('ticker', { instId: symbol }),
      tickerOnly ? Promise.resolve([]) : okxGet('candles', { instId: symbol, bar: '15m', limit: '120' })
    ]);
    const ticker = tickers[0];
    if (!ticker || (!tickerOnly && !bars.length)) throw new Error('Mercado sem dados');
    const candles = normalizeCandles(bars);
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=20');
    return res.status(200).json({
      source: 'OKX', symbol, timestamp: Date.now(),
      ticker: { last: Number(ticker.last), bid: Number(ticker.bidPx), ask: Number(ticker.askPx), quoteTime: Number(ticker.ts), change24h: Number(ticker.last) / Number(ticker.open24h) - 1 },
      candles
    });
  } catch (error) {
    console.error('[OKX market]', error.message);
    return res.status(502).json({ error: 'Dados da OKX indisponíveis no momento' });
  }
}
