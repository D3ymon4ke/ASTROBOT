export const STRATEGY_VERSION = 'continuous-v1';
export const ASSETS = ['R_100', '1HZ50V', 'R_50', '1HZ100V'];
export const STRATEGIES = ['mhi', 'pullback'];
export const DEFAULT_CONTINUOUS = Object.freeze({
  enabled: false, execution: 'observe', symbols: ['R_100', '1HZ50V'],
  strategies: ['mhi', 'pullback'], stake: 0.35, minScore: 60,
  minPayout: 0.8, cooldownSeconds: 60, dailyLossLimit: 5,
  maxExposure: 2, maxPositions: 1, durationMinutes: 1
});

export function validateConfig(patch, previous = DEFAULT_CONTINUOUS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw Error('Configuração inválida.');
  const result = { ...previous };
  for (const key of Object.keys(DEFAULT_CONTINUOUS)) if (key in patch) result[key] = patch[key];
  if (typeof result.enabled !== 'boolean' || !['observe', 'live'].includes(result.execution)) throw Error('Modo inválido.');
  for (const [key, allowed] of [['symbols', ASSETS], ['strategies', STRATEGIES]]) {
    if (!Array.isArray(result[key]) || !result[key].length || result[key].length > allowed.length || result[key].some(x => !allowed.includes(x))) throw Error(`Seleção inválida: ${key}`);
    result[key] = [...new Set(result[key])];
  }
  for (const [key, min, max] of [['stake', .35, 100], ['minScore', 40, 90], ['minPayout', .1, 2], ['cooldownSeconds', 30, 3600], ['dailyLossLimit', .35, 10000], ['maxExposure', .35, 1000], ['maxPositions', 1, 2], ['durationMinutes', 1, 5]]) {
    if (!Number.isFinite(Number(result[key])) || Number(result[key]) < min || Number(result[key]) > max) throw Error(`Valor inválido: ${key}`);
    result[key] = Number(result[key]);
  }
  if (!Number.isInteger(result.maxPositions) || !Number.isInteger(result.durationMinutes)) throw Error('Posições e duração devem ser inteiros.');
  if (result.stake > result.maxExposure || result.stake > result.dailyLossLimit) throw Error('A entrada excede o orçamento de risco.');
  return result;
}

export function cleanCandles(candles, nowSeconds = Infinity) {
  return [...new Map((candles || []).filter(c => c && ['epoch', 'open', 'high', 'low', 'close'].every(k => c[k] != null && Number.isFinite(Number(c[k]))))
    .map(c => Object.fromEntries(['epoch', 'open', 'high', 'low', 'close'].map(k => [k, Number(c[k])])))
    .filter(c => c.epoch + 60 <= nowSeconds && c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close))
    .map(c => [c.epoch, c])).values()].sort((a, b) => a.epoch - b.epoch);
}
function ema(values, period) {
  let value = values[0];
  return values.map(x => (value += (x - value) * 2 / (period + 1)));
}

// Scores express rule confluence, NEVER a calibrated win probability.
export function signalFor(candles, strategy) {
  if (candles.length < 30) return null;
  const recent = candles.slice(-30);
  if (recent.some((c, i) => i && c.epoch - recent[i - 1].epoch !== 60)) return null;
  const last = recent.at(-1), previous = recent.at(-2);
  const closes = recent.map(c => c.close), fast = ema(closes, 9), slow = ema(closes, 21);
  const range = recent.slice(-14).reduce((sum, c) => sum + c.high - c.low, 0) / 14;
  if (!(range > 0) || last.close === last.open) return null;
  let direction, score, reasons;
  if (strategy === 'mhi') {
    if ((last.epoch + 60) % 300 !== 0) return null;
    const colors = recent.slice(-3).map(c => Math.sign(c.close - c.open));
    if (colors.includes(0)) return null;
    direction = colors.reduce((a, b) => a + b, 0) > 0 ? 'PUT' : 'CALL';
    score = 50; reasons = ['MHI minoria: três velas fechadas'];
    if (Math.abs(last.close - last.open) / range < 1.5) { score += 10; reasons.push('Vela sem expansão extrema'); }
    if ((direction === 'CALL') === (fast.at(-1) > slow.at(-1))) { score += 15; reasons.push('Médias a favor'); }
  } else if (strategy === 'pullback') {
    const up = fast.at(-1) > slow.at(-1) && slow.at(-1) > slow.at(-4);
    const down = fast.at(-1) < slow.at(-1) && slow.at(-1) < slow.at(-4);
    if (up && previous.low <= fast.at(-2) && last.close > last.open && last.close > previous.close) direction = 'CALL';
    else if (down && previous.high >= fast.at(-2) && last.close < last.open && last.close < previous.close) direction = 'PUT';
    else return null;
    score = 60; reasons = ['Tendência EMA 9/21', 'Recuo e retomada confirmados'];
    if (Math.abs(fast.at(-1) - slow.at(-1)) / range > .2) { score += 10; reasons.push('Separação das médias'); }
    if (Math.abs(last.close - last.open) / range <= 1.5) { score += 10; reasons.push('Retomada sem expansão extrema'); }
  } else return null;
  return { strategy, version: STRATEGY_VERSION, direction, score, reasons, signalEpoch: last.epoch + 60 };
}
