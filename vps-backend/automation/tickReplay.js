import { summarize } from './research.js';

export function replayTicks(records, options = {}) {
  const latencyMs = options.latencyMs ?? 1000, maxGapSeconds = options.maxGapSeconds ?? 5;
  if (!Number.isFinite(latencyMs) || latencyMs < 0 || latencyMs > 30000 || !Number.isFinite(maxGapSeconds) || maxGapSeconds < 1 || maxGapSeconds > 30) throw Error('Latência ou tolerância de dados inválida.');
  const bySymbol = new Map();
  for (const r of records) if (r.kind === 'tick' && Number.isFinite(r.epoch) && Number.isFinite(r.price)) {
    if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, []);
    bySymbol.get(r.symbol).push(r);
  }
  for (const list of bySymbol.values()) list.sort((a, b) => a.epoch - b.epoch);
  const quotes = [...new Map(records.filter(r => r.kind === 'proposal').map(r => [r.signalId, r])).values()].sort((a, b) => a.receivedAt - b.receivedAt);
  const rows = [], excluded = { rejected: 0, missingEntry: 0, missingExit: 0, gap: 0, overlap: 0, invalid: 0 };
  const occupied = new Map();
  const lowerBound = (list, time) => { let lo = 0, hi = list.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].epoch < time) lo = mid + 1; else hi = mid; } return lo; };
  for (const q of quotes) {
    if (!q.eligible) { excluded.rejected++; continue; }
    if (![q.receivedAt, q.stake, q.payout, q.durationMinutes].every(Number.isFinite) || q.stake <= 0 || q.payout <= q.stake || q.durationMinutes < 1 || q.durationMinutes > 5 || !['CALL', 'PUT'].includes(q.direction)) { excluded.invalid++; continue; }
    const ticks = bySymbol.get(q.symbol) || [], entryTime = (q.receivedAt + latencyMs) / 1000;
    const key = `${q.symbol}:${q.strategy}:${q.version}`;
    if ((occupied.get(key) || 0) > entryTime) { excluded.overlap++; continue; }
    const i = lowerBound(ticks, entryTime), entry = ticks[i];
    if (!entry || entry.epoch - entryTime > maxGapSeconds) { excluded.missingEntry++; continue; }
    const expiry = entry.epoch + q.durationMinutes * 60, j = lowerBound(ticks, expiry), exit = ticks[j];
    if (!exit || exit.epoch - expiry > maxGapSeconds) { excluded.missingExit++; continue; }
    if (ticks.slice(i + 1, j + 1).some((t, k) => t.epoch - ticks[i + k].epoch > maxGapSeconds)) { excluded.gap++; continue; }
    occupied.set(key, expiry);
    const win = q.direction === 'CALL' ? exit.price > entry.price : exit.price < entry.price;
    rows.push({ id: q.signalId, signalId: q.signalId, strategy: q.strategy, version: q.version, symbol: q.symbol, direction: q.direction,
      timestamp: entry.epoch * 1000, stake: q.stake, payout: q.payout, profit: win ? q.payout - q.stake : -q.stake,
      entry: entry.price, exit: exit.price, entryEpoch: entry.epoch, exitEpoch: exit.epoch, source: 'tick_proxy', indicative: true });
  }
  return { type: 'tick_proxy', version: 'ticks-v1', config: { latencyMs, maxGapSeconds }, rows, metrics: summarize(rows),
    quoteCount: quotes.length, tickCount: [...bySymbol.values()].reduce((n, ts) => n + ts.length, 0), excluded,
    warning: 'Replay indicativo com payout registrado e latência hipotética. A proposta pode mudar antes da compra; os ticks não reproduzem a liquidação da corretora. Não autoriza compras.' };
}
