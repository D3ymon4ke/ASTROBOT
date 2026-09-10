import { summarize } from '../../vps-backend/automation/research.js';
export const tradeTime = t => typeof t.timestamp === 'string' ? (Date.parse(t.timestamp) || Number(t.timestamp)) : Number(t.timestamp || t.epoch * 1000);
export const strategyName = t => t.strategy || t.strategyId || t.strategyName || 'Não informada';
export function auditRows(data = [], { since = 0, strategy = 'all', symbol = 'all' } = {}) {
  const seen = new Set();
  return data.filter(t => {
    const id = t.id ?? t.contractId;
    if (id != null && seen.has(String(id))) return false;
    const valid = Number.isFinite(tradeTime(t)) && tradeTime(t) >= since && t.profit != null && Number.isFinite(Number(t.profit)) && Number.isFinite(Number(t.stake)) && Number(t.stake) > 0;
    if (!valid) return false;
    if (id != null) seen.add(String(id));
    return (strategy === 'all' || strategyName(t) === strategy) && (symbol === 'all' || t.symbol === symbol);
  }).sort((a, b) => tradeTime(a) - tradeTime(b));
}
export function bankReplay(rows, initial) {
  if (!Number.isFinite(initial) || initial <= 0) return null;
  let balance = initial, peak = initial, drawdown = 0, drawdownPct = 0, processed = 0;
  for (const t of rows) {
    if (Number(t.stake) > balance + 1e-9) break;
    balance += Number(t.profit); peak = Math.max(peak, balance);
    drawdown = Math.max(drawdown, peak - balance);
    drawdownPct = Math.max(drawdownPct, (peak - balance) / peak * 100); processed++;
  }
  return { balance, drawdown, drawdownPct, processed, stopped: processed < rows.length };
}
export function auditGroups(rows, key) {
  const groups = new Map();
  for (const t of rows) { const name = key(t); if (!groups.has(name)) groups.set(name, []); groups.get(name).push(t); }
  return [...groups].map(([name, data]) => ({ name, ...summarize(data) })).sort((a, b) => b.net - a.net);
}
export function auditCsv(rows) {
  const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
  return '\uFEFF' + [['Data UTC','Estratégia','Ativo','Entrada USD','Resultado USD'], ...rows.map(t => [new Date(tradeTime(t)).toISOString(), strategyName(t), t.symbol, Number(t.stake), Number(t.profit)])].map(r => r.map(cell).join(';')).join('\r\n');
}
