// Hipótese congelada para pesquisa. Nenhum caminho deste módulo envia ordens.
export const SPOT_STUDY_VERSION = 'spot-trend-h1-v1';
export const SPOT_STUDY_COST = { fee: 0.001, impact: 0.0005 };
const CAPITAL = 1000;
const FAST = 24;
const SLOW = 72;
const BREAKOUT = 20;
const ATR_WINDOW = 14;
const MAX_HOLD_BARS = 72;

function ema(values, period) {
  const factor = 2 / (period + 1);
  let value = values[0];
  return values.map((close, index) => {
    value = index ? value + factor * (close - value) : close;
    return value;
  });
}

function indicators(data) {
  const closes = data.map((bar) => bar.close);
  const fast = ema(closes, FAST);
  const slow = ema(closes, SLOW);
  const atr = data.map((_, index) => {
    if (index < ATR_WINDOW) return NaN;
    let sum = 0;
    for (let at = index - ATR_WINDOW + 1; at <= index; at++) {
      const previous = data[at - 1].close;
      const current = data[at];
      sum += Math.max(current.high - current.low,
        Math.abs(current.high - previous), Math.abs(current.low - previous));
    }
    return sum / ATR_WINDOW;
  });
  return { fast, slow, atr };
}

function entrySignal(data, signal, index) {
  if (index < SLOW + 1) return false;
  const bar = data[index];
  const priorHigh = Math.max(...data.slice(index - BREAKOUT, index).map((item) => item.high));
  const volatility = signal.atr[index] / bar.close;
  return signal.fast[index] > signal.slow[index] && bar.close > priorHigh
    && volatility >= 0.001 && volatility <= 0.05;
}

function exitSignal(data, signal, index, position) {
  return data[index].close < signal.fast[index]
    || data[index].close < position.stop
    || index - position.entryIndex >= MAX_HOLD_BARS;
}

// Mesmas regras do estudo, avaliadas exclusivamente sobre velas encerradas.
export function currentSpotSignal(data, position, now) {
  if (data.length < 100) throw new Error('Aquecimento H1 insuficiente');
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    if (!b.closed || !Number.isFinite(b.time) || b.time + 3600000 > now
      || ![b.open, b.high, b.low, b.close].every(v => Number.isFinite(v) && v > 0)
      || b.high < Math.max(b.open, b.close) || b.low > Math.min(b.open, b.close)
      || (i && b.time - data[i - 1].time !== 3600000)) throw new Error('Velas H1 inválidas ou descontínuas');
  }
  const signal = indicators(data);
  const index = data.length - 1;
  return { time: data[index].time, atr: signal.atr[index], entry: entrySignal(data, signal, index),
    exit: !!position && (data[index].close < signal.fast[index] || data[index].close < position.stop
      || data[index].time + 3600000 - position.entryTime >= MAX_HOLD_BARS * 3600000) };
}

function studyWindow(data, signal, start, end) {
  let cash = CAPITAL;
  let quantity = 0;
  let position = null;
  let entries = 0;
  const trades = [];
  const curve = [];
  let peak = CAPITAL;
  let maxDrawdown = 0;
  for (let index = start; index < end - 1; index++) {
    // A decisão usa a vela index já encerrada. Somente a abertura posterior é preenchimento hipotético.
    const next = data[index + 1];
    if (!position && entrySignal(data, signal, index)) {
      const notional = cash * 0.25 / (1 + SPOT_STUDY_COST.fee);
      const fill = next.open * (1 + SPOT_STUDY_COST.impact);
      quantity = notional / fill;
      cash -= notional * (1 + SPOT_STUDY_COST.fee);
      position = { entryIndex: index + 1, entryTime: next.time, entryPrice: fill,
        spent: notional * (1 + SPOT_STUDY_COST.fee), stop: next.open - 2 * signal.atr[index] };
      entries++;
    } else if (position && exitSignal(data, signal, index, position)) {
      const fill = next.open * (1 - SPOT_STUDY_COST.impact);
      const proceeds = quantity * fill * (1 - SPOT_STUDY_COST.fee);
      cash += proceeds;
      trades.push({ entryTime: position.entryTime, exitTime: next.time, net: proceeds - position.spent });
      quantity = 0;
      position = null;
    }
    const value = cash + quantity * next.close * (1 - SPOT_STUDY_COST.fee - SPOT_STUDY_COST.impact);
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
    curve.push({ time: next.time, value });
  }
  const finalValue = curve.at(-1)?.value ?? CAPITAL;
  const firstFill = data[start + 1].open * (1 + SPOT_STUDY_COST.impact);
  const lastSale = data[end - 1].close * (1 - SPOT_STUDY_COST.impact);
  const benchmarkNotional = CAPITAL * 0.25 / (1 + SPOT_STUDY_COST.fee);
  const benchmarkValue = CAPITAL - benchmarkNotional * (1 + SPOT_STUDY_COST.fee)
    + benchmarkNotional / firstFill * lastSale * (1 - SPOT_STUDY_COST.fee);
  return {
    startTime: data[start + 1].time, endTime: data[end - 1].time,
    bars: Math.max(0, end - start - 1), entries, closedTrades: trades.length,
    wins: trades.filter((trade) => trade.net > 0).length, openPosition: !!position,
    finalValue, returnPct: (finalValue / CAPITAL - 1) * 100,
    benchmarkValue, benchmarkPct: (benchmarkValue / CAPITAL - 1) * 100,
    excessPct: (finalValue - benchmarkValue) / CAPITAL * 100,
    maxDrawdownPct: maxDrawdown * 100, trades, curve
  };
}

export function runSpotTrendStudy(candles) {
  const data = candles.filter((bar) => bar.closed && Number.isFinite(bar.time)
    && [bar.open, bar.high, bar.low, bar.close].every((price) => Number.isFinite(price) && price > 0))
    .sort((a, b) => a.time - b.time);
  if (data.length < 400) return null;
  const unique = [...new Map(data.map((bar) => [bar.time, bar])).values()];
  if (unique.length < 400) return null;
  const split = Math.floor(unique.length / 2);
  const signal = indicators(unique);
  const calibration = studyWindow(unique, signal, SLOW + 1, split);
  const validation = studyWindow(unique, signal, split, unique.length);
  const last = unique.length - 1;
  const latest = validation.openPosition
    ? 'Posição hipotética aberta; saída depende da próxima vela encerrada.'
    : entrySignal(unique, signal, last)
      ? 'Rompimento observado na última vela encerrada; entrada somente na abertura seguinte.'
      : 'Sem entrada: tendência, rompimento e volatilidade precisam coincidir.';
  const verified = validation.closedTrades >= 30 && calibration.closedTrades >= 30
    && calibration.returnPct > 0 && validation.returnPct > 0
    && calibration.excessPct > 0 && validation.excessPct > 0;
  return { version: SPOT_STUDY_VERSION, sample: unique.length, latestClosedAt: unique[last].time,
    calibration, validation, latest, verified, status: verified ? 'Candidato histórico — aguarda teste prospectivo' : 'Hipótese sem vantagem comprovada' };
}
