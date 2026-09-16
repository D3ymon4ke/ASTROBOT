export const INITIAL_DEMO = { cash: 1000, holdings: {}, trades: [] };
export const DEMO_FEE_RATE = 0.001; // Hipótese indicativa, não a tarifa da conta OKX.

export function equityOf(portfolio, prices) {
  return portfolio.cash + Object.entries(portfolio.holdings).reduce((total, [symbol, position]) =>
    total + position.qty * (prices[symbol] || position.avgPrice), 0);
}

export function simulateSpotOrder(portfolio, { symbol, side, amount, bid, ask, time = Date.now() }) {
  if (!symbol || !['buy', 'sell'].includes(side) || !Number.isFinite(amount) || amount <= 0) throw new Error('Ordem inválida');
  const price = side === 'buy' ? ask : bid;
  if (!Number.isFinite(price) || price <= 0) throw new Error('Cotação indisponível');
  const fee = amount * DEMO_FEE_RATE;
  const previous = portfolio.holdings[symbol] || { qty: 0, avgPrice: 0 };
  const holdings = { ...portfolio.holdings };
  let cash = portfolio.cash;
  let qty;
  let realized = null;
  if (side === 'buy') {
    if (amount + fee > cash + 1e-8) throw new Error('Saldo demo insuficiente');
    qty = amount / price;
    cash -= amount + fee;
    const newQty = previous.qty + qty;
    holdings[symbol] = { qty: newQty, avgPrice: (previous.qty * previous.avgPrice + amount + fee) / newQty };
  } else {
    qty = amount / price;
    if (qty > previous.qty + 1e-8) throw new Error('Posição demo insuficiente');
    cash += amount - fee;
    realized = amount - fee - qty * previous.avgPrice;
    const remaining = Math.max(0, previous.qty - qty);
    if (remaining < 1e-10) delete holdings[symbol];
    else holdings[symbol] = { ...previous, qty: remaining };
  }
  return {
    cash: Math.max(0, cash), holdings,
    trades: [{ id: `${time}-${Math.random().toString(36).slice(2, 8)}`, symbol, side, amount, qty, price, fee, realized, time }, ...portfolio.trades].slice(0, 200)
  };
}

function ema(values, period) {
  const smoothing = 2 / (period + 1);
  let average = values[0];
  return values.map((value, index) => {
    average = index ? value * smoothing + average * (1 - smoothing) : value;
    return average;
  });
}

export function backtestStrategy(candles, method) {
  const data = candles.filter((bar) => bar.closed && [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite));
  if (data.length < 35) return null;
  const closes = data.map((bar) => bar.close);
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  let cash = 1000;
  let qty = 0;
  let entries = 0;
  let exits = 0;
  const curve = [];
  let peak = 1000;
  let maxDrawdown = 0;
  for (let index = 25; index < data.length - 1; index++) {
    const current = data[index];
    const nextOpen = data[index + 1].open; // Sinal na vela fechada; execução na vela seguinte.
    if (method === 'ema') {
      if (qty === 0 && fast[index - 1] <= slow[index - 1] && fast[index] > slow[index]) {
        qty = cash * (1 - DEMO_FEE_RATE) / nextOpen; cash = 0; entries++;
      } else if (qty > 0 && fast[index - 1] >= slow[index - 1] && fast[index] < slow[index]) {
        cash = qty * nextOpen * (1 - DEMO_FEE_RATE); qty = 0; exits++;
      }
    } else if (method === 'breakout') {
      const previousHigh = Math.max(...data.slice(index - 20, index).map((bar) => bar.high));
      const previousLow = Math.min(...data.slice(index - 10, index).map((bar) => bar.low));
      if (qty === 0 && current.close > previousHigh) {
        qty = cash * (1 - DEMO_FEE_RATE) / nextOpen; cash = 0; entries++;
      } else if (qty > 0 && current.close < previousLow) {
        cash = qty * nextOpen * (1 - DEMO_FEE_RATE); qty = 0; exits++;
      }
    }
    const value = cash + qty * data[index + 1].close;
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
    curve.push({ time: data[index + 1].time, value });
  }
  const finalValue = cash + qty * data.at(-1).close * (qty ? 1 - DEMO_FEE_RATE : 1);
  return { finalValue, returnPct: (finalValue / 1000 - 1) * 100, maxDrawdown: maxDrawdown * 100, entries, exits, openPosition: qty > 0, curve, sample: data.length };
}
