import { createPaperState, SYMBOLS } from './paperEngine.js';

export const SCALP_VERSION = 'spot-pullback-m5-v1';
export const SCALP_CONFIG = Object.freeze({ capital: 1000, goal: 5, dailyLoss: 5, risk: 1,
  fee: .001, impact: .0005, maxHold: 20 * 60000, cooldown: 10 * 60000, barMs: 300000 });
const C = SCALP_CONFIG;
const dayKey = now => new Date(now).toISOString().slice(0, 10);
const sale = bid => bid * (1 - C.impact) * (1 - C.fee);
function ema(data, n) {
  let value = data[0].close;
  return data.map(b => (value += 2 / (n + 1) * (b.close - value)));
}
export function scalpSignal(bars, now) {
  if (bars.length < 60) throw new Error('Menos de 60 velas M5 encerradas');
  bars.forEach((b, i) => {
    if (!b.closed || !Number.isFinite(b.time) || b.time + C.barMs > now
      || ![b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite)
      || Math.min(b.open, b.high, b.low, b.close) <= 0 || b.volume < 0
      || b.high < Math.max(b.open, b.close) || b.low > Math.min(b.open, b.close)
      || (i && b.time - bars[i - 1].time !== C.barMs)) throw new Error('Série M5 inválida ou descontínua');
  });
  const fast = ema(bars, 9), slow = ema(bars, 21);
  const i = bars.length - 1, b = bars[i], prev = bars[i - 1];
  const atr = bars.slice(-14).reduce((sum, item, j) => {
    const prior = bars[bars.length - 15 + j].close;
    return sum + Math.max(item.high - item.low, Math.abs(item.high - prior), Math.abs(item.low - prior));
  }, 0) / 14;
  const volume = bars.slice(-21, -1).reduce((sum, item) => sum + item.volume, 0) / 20;
  const trend = fast[i] > slow[i] && slow[i] > slow[i - 3];
  const pullback = prev.low <= fast[i - 1] && prev.close >= slow[i - 1];
  const recovery = b.close > prev.high && b.close > b.open;
  const liquid = volume > 0 && b.volume >= volume;
  return { time: b.time, atr, entry: trend && pullback && recovery && liquid,
    reason: !trend ? 'Aguardando tendência EMA 9/21' : !pullback ? 'Aguardando recuo até EMA 9'
      : !recovery ? 'Aguardando retomada acima da vela anterior' : !liquid ? 'Volume abaixo da média de 20 velas' : 'Sinal técnico completo' };
}
export function createScalpState(now) {
  const state = createPaperState(now);
  state.version = SCALP_VERSION;
  state.config = C;
  state.day = { date: dayKey(now), realized: 0, grossLoss: 0, halted: false, reason: '' };
  for (const a of Object.values(state.assets)) {
    a.initialCapital = C.capital / SYMBOLS.length;
    a.cash = a.equity = a.peak = a.initialCapital;
    a.lastExit = 0;
    a.status = 'Aguardando primeira coleta M5';
  }
  return state;
}
function quoteValid(q, now) {
  return q && [q.ask, q.bid, q.time].every(Number.isFinite) && q.bid > 0 && q.ask >= q.bid
    && now - q.time <= 15000 && q.time <= now + 3000;
}

// Alocação sequencial compartilha orçamento entre os três pares. Nunca envia ordens.
export function observeScalp(previous, feeds, now) {
  const state = structuredClone(previous);
  if (state.day.date !== dayKey(now)) state.day = { date: dayKey(now), realized: 0, grossLoss: 0, halted: false, reason: '' };
  const decisions = {};
  // Saídas têm prioridade e continuam mesmo quando o histórico de velas falha.
  for (const symbol of SYMBOLS) {
    const a = state.assets[symbol], f = feeds[symbol];
    if (!quoteValid(f?.quote, now)) { a.error = 'Cotação indisponível ou com mais de 15s'; continue; }
    const q = f.quote;
    const delayed = a.observedAt !== null && now - a.observedAt > 30000;
    if (delayed) a.gaps++;
    a.observedAt = now;
    a.error = null;
    if (!a.benchmark) a.benchmark = { cash: a.initialCapital * .75,
      quantity: a.initialCapital * .25 / (q.ask * (1 + C.impact) * (1 + C.fee)) };
    const p = a.position;
    if (p && (q.bid <= p.stop || q.bid >= p.target || now - p.entryTime >= C.maxHold)) {
      const proceeds = p.quantity * sale(q.bid), net = proceeds - p.spent;
      a.cash += proceeds;
      a.realized += net;
      a.closedTrades++;
      if (net > 0) a.wins++;
      state.day.realized += net;
      state.day.grossLoss += Math.max(0, -net);
      a.trades.push({ entryTime: p.entryTime, exitTime: now, entryPrice: p.price,
        exitPrice: q.bid * (1 - C.impact), net, delayed,
        reason: q.bid <= p.stop ? 'stop' : q.bid >= p.target ? 'alvo' : '20 minutos' });
      a.trades = a.trades.slice(-300);
      a.position = null;
      a.lastExit = now;
      a.status = 'Saída simulada; intervalo de 10 minutos antes de nova entrada';
    }
    try {
      const signal = scalpSignal(f.candles || [], now);
      if (now - signal.time - C.barMs >= C.barMs || q.time < signal.time + C.barMs
        || (a.lastBar !== null && signal.time < a.lastBar)) throw new Error('Histórico M5 atrasado');
      const first = a.lastBar === null;
      if (first || signal.time > a.lastBar) {
        const missed = !first && signal.time - a.lastBar > C.barMs;
        a.lastBar = signal.time;
        const late = now - signal.time - C.barMs > 45000;
        if (first || missed || late || delayed) {
          a.skipped++;
          if (!a.position) a.status = first ? 'Inicializado; aguardando próximo fechamento M5' : 'Sinal ignorado por atraso; sem entrada retroativa';
        } else decisions[symbol] = signal;
      }
    } catch (error) { a.error = error.message; }
    a.equity = a.cash + (a.position?.quantity || 0) * sale(q.bid);
    a.benchmarkValue = a.benchmark.cash + a.benchmark.quantity * sale(q.bid);
  }
  if (state.day.realized >= C.goal || state.day.grossLoss >= C.dailyLoss) {
    state.day.halted = true;
    state.day.reason = state.day.realized >= C.goal ? 'Meta diária de $5 atingida' : 'Limite diário de perdas atingido';
  }
  // Valores marcados antigos permanecem explícitos como falha de coleta; não liberam novas entradas.
  const portfolioHealthy = SYMBOLS.every(s => !state.assets[s].error);
  const totalEquity = SYMBOLS.reduce((sum, s) => sum + state.assets[s].equity, 0);
  for (const symbol of SYMBOLS) {
    const a = state.assets[symbol], signal = decisions[symbol];
    if (!signal || a.position) continue;
    a.status = signal.reason;
    if (state.day.halted) { a.status = state.day.reason; continue; }
    if (!portfolioHealthy) { a.status = 'Novas entradas aguardam dados válidos de todos os pares'; continue; }
    if (totalEquity < C.capital * .975) { a.status = 'Proteção: perda acumulada de 2,5%'; continue; }
    if (now - a.lastExit < C.cooldown) { a.status = 'Intervalo de 10 minutos após saída'; continue; }
    if (!signal.entry) continue;
    const q = feeds[symbol].quote;
    const spread = (q.ask - q.bid) / q.ask;
    const price = q.ask * (1 + C.impact), cost = price * (1 + C.fee);
    const stop = q.ask - 1.5 * signal.atr, target = q.ask + 3 * signal.atr;
    const riskUnit = cost - sale(stop), rewardUnit = sale(target) - cost;
    const friction = cost - sale(q.bid);
    if (spread > .0005 || stop <= 0 || signal.atr / q.ask > .02
      || rewardUnit < riskUnit * 1.2 || rewardUnit < friction * 2) {
      a.status = 'Entrada rejeitada: alvo não compensa custos, risco ou spread'; a.skipped++; continue;
    }
    const reserved = SYMBOLS.reduce((sum, s) => sum + (state.assets[s].position?.reservedRisk || 0), 0);
    const availableRisk = Math.min(C.risk, C.dailyLoss - state.day.grossLoss - reserved);
    if (availableRisk < .10) { a.status = 'Orçamento diário reservado por posições ou perdas'; continue; }
    const quantity = Math.min(availableRisk / riskUnit, a.cash * .25 / cost);
    const spent = quantity * cost;
    if (spent < 5) { a.status = 'Alocação menor que $5; entrada ignorada'; continue; }
    a.position = { entryTime: now, signalTime: signal.time, price, quantity, spent, stop, target, reservedRisk: quantity * riskUnit };
    a.cash -= spent;
    a.equity = a.cash + quantity * sale(q.bid);
    a.status = 'Scalp virtual aberto; acompanhando stop, alvo e prazo';
  }
  for (const symbol of SYMBOLS) {
    const a = state.assets[symbol];
    if (!quoteValid(feeds[symbol]?.quote, now)) continue;
    a.peak = Math.max(a.peak, a.equity);
    a.drawdownPct = Math.max(a.drawdownPct, (a.peak - a.equity) / a.peak * 100);
    const point = { time: now, value: a.equity, benchmark: a.benchmarkValue };
    if (a.curve.length && Math.floor(a.curve.at(-1).time / C.barMs) === Math.floor(now / C.barMs)) a.curve[a.curve.length - 1] = point;
    else a.curve.push(point);
    a.curve = a.curve.slice(-1500);
  }
  state.updatedAt = now;
  return state;
}
