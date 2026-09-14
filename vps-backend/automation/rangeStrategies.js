export const RANGE_VERSION = 'range-multipliers-v1';
export const RANGE_ARMS = [
  { id: 'range_rejection', name: 'Range Break · rejeição', description: 'Canal de 20 velas M1 com dois testes em cada borda; rejeição confirmada na borda, alvo no centro e stop fora do canal.' },
  { id: 'range_escape', name: 'Range Break · rompimento', description: 'Mesmo canal confirmado; fechamento além da borda com corpo de 60%, alvo de 1,5 vezes o risco e stop de retorno ao canal.' }
];
export const RANGE_SYMBOLS = ['RB100', 'RB200'];
export const RANGE_RULES = Object.freeze({ stake: 1, multiplier: 20, bank: 100, dailyLoss: 3, maxDrawdown: 15, maxSeconds: 1800 });

// Window ends before the signal candle. No fitting or selection using later outcomes.
export function rangeSignal(arm, candles, now) {
  const bars = candles.filter(c => c.epoch + 60 <= now).slice(-21);
  if (bars.length !== 21 || now - bars.at(-1).epoch - 60 > 20 || bars.some((c, i) =>
    !['epoch', 'open', 'high', 'low', 'close'].every(k => Number.isFinite(c[k])) ||
    c.low > Math.min(c.open, c.close) || c.high < Math.max(c.open, c.close) || c.low <= 0 ||
    (i && c.epoch !== bars[i - 1].epoch + 60))) return null;
  const history = bars.slice(0, -1), last = bars.at(-1);
  const lower = Math.min(...history.map(c => c.low)), upper = Math.max(...history.map(c => c.high));
  const width = upper - lower;
  if (!(width > 0)) return null;
  const touches = side => history.filter((c, i) => (side === 'low' ? c.low <= lower + width * .1 : c.high >= upper - width * .1) &&
    (i === 0 || (side === 'low' ? history[i - 1].low > lower + width * .1 : history[i - 1].high < upper - width * .1))).length;
  if (touches('low') < 2 || touches('high') < 2 || Math.abs(history.at(-1).close - history[0].close) > width * .35) return null;
  let direction, stop, target;
  if (arm === 'range_rejection') {
    if (last.low >= lower - width * .05 && last.low <= lower + width * .1 && last.close > last.open && last.close > lower + width * .15 && last.close < lower + width * .3) {
      direction = 1; stop = lower - width * .1; target = (lower + upper) / 2;
    } else if (last.high <= upper + width * .05 && last.high >= upper - width * .1 && last.close < last.open && last.close < upper - width * .15 && last.close > upper - width * .3) {
      direction = -1; stop = upper + width * .1; target = (lower + upper) / 2;
    }
  } else if (arm === 'range_escape' && Math.abs(last.close - last.open) >= (last.high - last.low) * .6) {
    if (last.close > upper + width * .05 && last.close < upper + width * .3) { direction = 1; stop = upper - width * .1; }
    else if (last.close < lower - width * .05 && last.close > lower - width * .3) { direction = -1; stop = lower + width * .1; }
    if (direction) target = last.close + direction * Math.abs(last.close - stop) * 1.5;
  }
  return direction ? { direction, stop, target, lower, upper, signalEpoch: last.epoch + 60, key: last.epoch } : null;
}

export function multiplierProfit(position, price) {
  return Math.max(-position.stake, position.direction * (price / position.entry - 1) * position.multiplier * position.stake - position.commission);
}

export function entryEconomics(signal, entry, commission) {
  const p = { ...signal, entry, commission, ...RANGE_RULES };
  const reward = multiplierProfit(p, signal.target), risk = -multiplierProfit(p, signal.stop);
  // Fixed screen uses current commission, not historical win rate. Costs must not consume the target.
  return { reward, risk, accepted: Number.isFinite(entry) && entry > 0 && Number.isFinite(commission) && commission >= 0 &&
    signal.direction * (signal.target - entry) > 0 && signal.direction * (entry - signal.stop) > 0 &&
    reward >= .05 && risk > 0 && risk <= .5 && reward / risk >= 1.2 && reward >= commission * 3 };
}
