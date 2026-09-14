import { breakoutSignal } from './breakout.js';

export const EVIDENCE_VERSION = 'evidence-lab-v1';
export const LAB_ASSETS = ['R_100', '1HZ50V', 'R_75', '1HZ75V', '1HZ25V'];
export const LAB_ARMS = [
  { id: 'digit_transition', name: 'Dígitos · transição', unit: 't', duration: 1, description: 'Estima a próxima paridade a partir das transições após a paridade atual nos últimos 300 ticks. Hipótese prospectiva.' },
  { id: 'digit_control', name: 'Dígitos · controle', unit: 't', duration: 1, description: 'Alterna par e ímpar sem previsão. Referência de custo e acaso; nunca entra na carteira filtrada.' },
  { id: 'breakout_3m', name: 'Rompimento · 3 minutos', unit: 'm', duration: 3, description: 'Seis velas em compressão, fechamento fora do canal e corpo de pelo menos 50% da vela.' },
  { id: 'fakegale_fixed', name: 'Fakegale · entrada única', unit: 'm', duration: 1, description: 'MHI 1 minoria: duas velas fechadas contrárias à previsão, seguidas de uma entrada fixa. Sem gales.' }
];
export const LAB_DEFAULTS = Object.freeze({ enabled: false, symbols: ['R_100', '1HZ50V'], stake: 0.5, initialBank: 100, dailyLossLimit: 3, maxDrawdown: 15 });
export function validateLabConfig(patch, previous = LAB_DEFAULTS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(k => !Object.hasOwn(LAB_DEFAULTS, k))) throw Error('Somente configurações de simulação são aceitas.');
  const c = { ...previous, ...patch };
  if (typeof c.enabled !== 'boolean' || !Array.isArray(c.symbols) || !c.symbols.length || c.symbols.length > 3 || c.symbols.some(s => !LAB_ASSETS.includes(s))) throw Error('Ativos inválidos.');
  c.symbols = [...new Set(c.symbols)];
  for (const [k, min, max] of [['stake', .35, 2], ['initialBank', 35, 10000], ['dailyLossLimit', .35, 100], ['maxDrawdown', .35, 1000]]) {
    if (!Number.isFinite(Number(c[k])) || Number(c[k]) < min || Number(c[k]) > max) throw Error(`Valor inválido: ${k}`);
    c[k] = Number(c[k]);
  }
  if (c.stake > c.initialBank * .01 || c.dailyLossLimit > c.initialBank * .05 || c.maxDrawdown > c.initialBank * .2 || c.stake > c.dailyLossLimit || c.stake > c.maxDrawdown) throw Error('Limites: 1% por entrada, 5% de perdas brutas por dia e 20% de drawdown.');
  return c;
}
export function lastDigit(price, precision) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 10 || !Number.isFinite(Number(price))) return null;
  return Number(Number(price).toFixed(precision).slice(-1));
}
export function assetPrecision(asset) {
  // Legacy API sends pip; PAT API sends the increment (e.g. 0.01) as pip_size.
  const raw = Number(asset.pip ?? asset.pip_size);
  if (!Number.isFinite(raw) || raw < 0) return null;
  if (asset.pip == null && Number.isInteger(raw) && raw <= 10) return raw;
  if (!(raw > 0)) return null;
  const decimals = Math.round(-Math.log10(raw));
  return decimals >= 0 && decimals <= 10 && Math.abs(raw - 10 ** -decimals) < 1e-12 ? decimals : null;
}
export function validTicks(history, precision) {
  const times = history?.times || [], prices = history?.prices || [];
  if (times.length !== prices.length) return [];
  const rows = times.map((t, i) => ({ epoch: Number(t), price: Number(prices[i]), digit: lastDigit(prices[i], precision) }));
  if (rows.some((r, i) => !Number.isFinite(r.epoch) || !Number.isFinite(r.price) || r.digit == null || (i && r.epoch <= rows[i - 1].epoch))) return [];
  return rows;
}
export function candidate(arm, bars, ticks, now) {
  const slot = Math.floor(now / 60);
  if (arm === 'digit_control') return { contractType: slot % 2 ? 'DIGITODD' : 'DIGITEVEN', signalEpoch: slot * 60, key: slot };
  if (arm === 'digit_transition') {
    const rows = ticks.slice(-300);
    if (rows.length < 300 || rows.some((r, i) => i && r.epoch - rows[i - 1].epoch > 5)) return null;
    const parity = rows.at(-1).digit % 2;
    const outcomes = rows.slice(1).filter((r, i) => rows[i].digit % 2 === parity);
    if (outcomes.length < 60) return null;
    const even = outcomes.filter(r => r.digit % 2 === 0).length;
    return { contractType: even >= outcomes.length / 2 ? 'DIGITEVEN' : 'DIGITODD', signalEpoch: rows.at(-1).epoch, key: slot, trainingCount: outcomes.length };
  }
  if (!bars.length || now - (bars.at(-1).epoch + 60) > 15) return null;
  if (arm === 'breakout_3m') {
    const signal = breakoutSignal(bars);
    return signal && { contractType: signal.direction, signalEpoch: signal.signalEpoch, key: signal.signalEpoch };
  }
  if (arm === 'fakegale_fixed') {
    const block = Math.floor(now / 300) * 300;
    if (now - block < 120 || now - block > 135) return null;
    const rows = bars.filter(c => c.epoch >= block - 180 && c.epoch < block + 120);
    if (rows.length !== 5 || rows.some((c, i) => c.epoch !== block - 180 + i * 60 || c.close === c.open)) return null;
    const majority = rows.slice(0, 3).reduce((s, c) => s + Math.sign(c.close - c.open), 0) > 0 ? 'CALL' : 'PUT';
    if (rows.slice(3).some(c => (c.close > c.open ? 'CALL' : 'PUT') !== majority)) return null;
    return { contractType: majority === 'CALL' ? 'PUT' : 'CALL', signalEpoch: block + 120, key: block };
  }
  return null;
}
export function metrics(rows) {
  let net = 0, peak = 0, drawdown = 0, wins = 0, gains = 0, losses = 0, stake = 0;
  for (const r of [...rows].sort((a, b) => a.timestamp - b.timestamp)) {
    net += r.profit; stake += r.stake;
    if (r.profit > 0) { wins++; gains += r.profit; } else losses -= r.profit;
    peak = Math.max(peak, net); drawdown = Math.max(drawdown, peak - net);
  }
  return { count: rows.length, wins, net, drawdown, roi: stake ? net / stake * 100 : null, profitFactor: losses ? gains / losses : null, winRate: rows.length ? wins / rows.length * 100 : null };
}
// Conservative screening, not proof of profitability: correlated markets and repeated testing remain limitations.
export function evidenceGate(rows, payoutRatio) {
  const sample = rows.slice(-400), n = sample.length, wins = sample.filter(r => r.profit > 0).length;
  const z = 2.576, p = n ? wins / n : 0;
  const lower = n ? (p + z*z/(2*n) - z*Math.sqrt(p*(1-p)/n + z*z/(4*n*n))) / (1+z*z/n) : 0;
  const breakEven = 1 / payoutRatio;
  const half = Math.floor(n / 2);
  const positiveHalves = n >= 200 && [sample.slice(0, half), sample.slice(half)].every(rs => rs.reduce((sum, r) => sum + r.profit / r.stake, 0) > 0);
  return { count: n, lower, breakEven, qualified: positiveHalves && lower > breakEven + .02 };
}
