export const OPTIONS_VERSION = 'forex-accumulator-v1';
export const OPTIONS_ARMS = [
  { id: 'forex_pullback', name: 'Forex · retomada', family: 'forex', stake: .5 },
  { id: 'forex_control', name: 'Forex · tendência sem recuo', family: 'forex', stake: .5 },
  { id: 'accu_3', name: 'Accumulator · 3 ticks', family: 'accu', stake: 1, ticks: 3 },
  { id: 'accu_5', name: 'Accumulator · 5 ticks', family: 'accu', stake: 1, ticks: 5 }
];
export function closedBars(input, interval, now, count) {
  const rows = (input || []).map(c => Object.fromEntries(['epoch','open','high','low','close'].map(k => [k, Number(c[k])]))).filter(c => c.epoch + interval <= now).slice(-count);
  return rows.length === count && rows.every((c, i) => Object.values(c).every(Number.isFinite) && c.low > 0 && c.low <= Math.min(c.open,c.close) && c.high >= Math.max(c.open,c.close) && (!i || c.epoch === rows[i-1].epoch + interval)) ? rows : [];
}
const ema = (rows, period) => rows.reduce((values,c) => [...values, values.length ? values.at(-1) + (c.close - values.at(-1)) * 2/(period+1) : c.close], []);
export function forexWindow(now) {
  const d = new Date(now * 1000);
  return d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && d.getUTCHours() >= 7 && d.getUTCHours() < 17;
}
export function forexSignal(m15, m5, now) {
  if (!forexWindow(now)) return null;
  const trend = closedBars(m15,900,now,60), entry = closedBars(m5,300,now,30);
  if (!trend.length || !entry.length || now - entry.at(-1).epoch - 300 > 45 || now - trend.at(-1).epoch - 900 >= 900) return null;
  const fast = ema(trend,20), slow = ema(trend,50), direction = Math.sign(fast.at(-1) - slow.at(-1));
  if (!direction || direction * (fast.at(-1) - fast.at(-5)) <= 0 || direction * (trend.at(-1).close - fast.at(-1)) <= 0) return null;
  const local = ema(entry,20), previous = entry.at(-2), last = entry.at(-1);
  const filtered = direction === 1
    ? previous.low <= local.at(-2) && previous.close < previous.open && last.close > previous.high && last.close > last.open
    : previous.high >= local.at(-2) && previous.close > previous.open && last.close < previous.low && last.close < last.open;
  return { direction, filtered, key: last.epoch, signalEpoch: last.epoch + 300, contractType: direction === 1 ? 'CALL' : 'PUT' };
}
export function accumulatorTerms(q) {
  const d = q?.contract_details, ratio = Number(d?.tick_size_barrier), spot = Number(q?.spot);
  const distance = Number(d?.barrier_spot_distance), unit = 10 ** -(String(d?.barrier_spot_distance).split('.')[1]?.length || 0);
  if (!d || ![d.high_barrier,d.low_barrier,d.maximum_ticks,d.maximum_payout].every(x=>x!=null&&Number.isFinite(Number(x))) || !(ratio > 0 && ratio < .1) || !(spot > 0) || !(distance > 0) || Math.abs(distance - spot * ratio) > unit + 1e-8 ||
    Math.abs(Number(d.high_barrier) - spot - distance) > 1e-7 || Math.abs(spot - Number(d.low_barrier) - distance) > 1e-7 ||
    Number(d.maximum_ticks) < 6 || Number(d.maximum_payout) < 1.07) return null;
  // Broker rounding isn't assumed. A one-unit envelope quarantines ambiguous boundary cases.
  return { ratio, barrierUnit: unit, maxTicks: Number(d.maximum_ticks), maxPayout: Number(d.maximum_payout) };
}
export function accumulatorStep(previous, current, terms) {
  const distance = Math.abs(current - previous), raw = previous * terms.ratio, epsilon = 1e-9;
  if (distance < raw - terms.barrierUnit - epsilon) return 'inside';
  if (distance >= raw + terms.barrierUnit + epsilon) return 'knockout';
  return 'ambiguous';
}
export const accuProfit = ticks => Math.floor((1.01 ** ticks - 1) * 100 + 1e-8) / 100;
