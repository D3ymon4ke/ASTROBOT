// Candidate only: deliberately absent from the live strategy allowlist.
export function breakoutSignal(candles) {
  if (candles.length < 30) return null;
  const bars = candles.slice(-30);
  if (bars.some((c, i) => i && c.epoch - bars[i - 1].epoch !== 60)) return null;
  const last = bars.at(-1), channel = bars.slice(-7, -1), baseline = bars.slice(0, -7);
  const range = baseline.reduce((s, c) => s + c.high - c.low, 0) / baseline.length;
  const upper = Math.max(...channel.map(c => c.high)), lower = Math.min(...channel.map(c => c.low));
  const compressed = channel.reduce((s, c) => s + c.high - c.low, 0) / channel.length;
  if (!(range > 0) || compressed > range * .65 || upper - lower > range * 2 || last.high === last.low) return null;
  const direction = last.close > upper && last.close > last.open ? 'CALL' : last.close < lower && last.close < last.open ? 'PUT' : null;
  if (!direction || Math.abs(last.close - last.open) / (last.high - last.low) < .5) return null;
  return { strategy: 'breakout', version: 'breakout-v1', direction, score: 65,
    signalEpoch: last.epoch + 60, regime: 'compression-breakout', channel: { upper, lower },
    reasons: ['Compressão em seis velas fechadas', 'Fechamento fora do canal', 'Corpo representa ao menos metade da vela'] };
}
