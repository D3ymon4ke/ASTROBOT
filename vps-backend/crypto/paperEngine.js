import { currentSpotSignal, SPOT_STUDY_VERSION, SPOT_STUDY_COST } from '../../src/platform/spotResearch.js';

export const SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
const HOUR = 3600000;
const { fee, impact } = SPOT_STUDY_COST;
export function createPaperState(now) {
  return { schema: 1, version: SPOT_STUDY_VERSION, mode: 'paper', startedAt: now, updatedAt: now,
    assets: Object.fromEntries(SYMBOLS.map(symbol => [symbol, { symbol, cash: 1000, equity: 1000,
      peak: 1000, drawdownPct: 0, position: null, lastBar: null, observedAt: null,
      closedTrades: 0, wins: 0, realized: 0, gaps: 0, skipped: 0, curve: [], trades: [],
      status: 'Aguardando primeira coleta', error: null }])) };
}

// Pura e reiniciável: nenhum cliente privado, compra ou venda de corretora.
export function observePaper(previous, candles, quote, now) {
  const state = structuredClone(previous);
  const signal = currentSpotSignal(candles, state.position, now);
  if (state.lastBar !== null && signal.time < state.lastBar) throw new Error('Histórico regrediu');
  if (quote.time < signal.time + HOUR) throw new Error('Cotação anterior ao fechamento');
  // A última vela pode ter até 1h; entradas novas exigem adicionalmente atraso <= 10 minutos.
  if (![quote.ask, quote.bid, quote.time].every(Number.isFinite) || quote.bid <= 0
    || quote.ask < quote.bid || now - quote.time > 60000 || quote.time > now + 5000
    || now - signal.time - HOUR >= HOUR) throw new Error('Cotação ou vela desatualizada');
  const sale = quote.bid * (1 - impact) * (1 - fee);
  state.observedAt = now;
  state.error = null;
  if (!state.benchmark) state.benchmark = { quantity: 250 / (quote.ask * (1 + impact) * (1 + fee)), cash: 750 };
  const first = state.lastBar === null;
  if (first) {
    state.lastBar = signal.time;
    state.status = 'Coleta iniciada; aguardando próximo fechamento H1';
  } else if (signal.time > state.lastBar) {
    const missed = Math.max(0, Math.round((signal.time - state.lastBar) / HOUR) - 1);
    state.gaps += missed;
    state.lastBar = signal.time;
    const late = now - signal.time - HOUR > 10 * 60000;
    if (state.position && signal.exit) {
      const proceeds = state.position.quantity * sale;
      const net = proceeds - state.position.spent;
      state.cash += proceeds;
      state.realized += net;
      state.closedTrades++;
      if (net > 0) state.wins++;
      state.trades.push({ entryTime: state.position.entryTime, exitTime: now, net,
        entryPrice: state.position.price, exitPrice: quote.bid * (1 - impact), delayed: late || missed > 0 });
      state.trades = state.trades.slice(-300);
      state.position = null;
      state.status = 'Saída simulada registrada com bid observado e custos';
    } else if (!state.position && signal.entry && !missed && !late) {
      const spent = state.cash * .25;
      const price = quote.ask * (1 + impact);
      state.position = { entryTime: now, price, quantity: spent / (price * (1 + fee)), spent,
        stop: quote.ask - 2 * signal.atr, signalTime: signal.time };
      state.cash -= spent;
      state.status = 'Entrada simulada registrada com ask observado e custos';
    } else {
      if (missed || late) state.skipped++;
      state.status = missed || late ? 'Entrada ignorada: coleta atrasada; sem reconstruir trades passados'
        : state.position ? 'Posição simulada aberta; acompanhando saída H1' : 'Sem sinal completo de entrada';
    }
  }
  state.equity = state.cash + (state.position?.quantity || 0) * sale;
  state.benchmarkValue = state.benchmark.cash + state.benchmark.quantity * sale;
  state.peak = Math.max(state.peak, state.equity);
  state.drawdownPct = Math.max(state.drawdownPct, (state.peak - state.equity) / state.peak * 100);
  const point = { time: now, value: state.equity, benchmark: state.benchmarkValue };
  // Um ponto por hora; o último acompanha a marcação atual.
  if (state.curve.length && Math.floor(state.curve.at(-1).time / HOUR) === Math.floor(now / HOUR)) state.curve[state.curve.length - 1] = point;
  else state.curve.push(point);
  state.curve = state.curve.slice(-1500);
  return state;
}
