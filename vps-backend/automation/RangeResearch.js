import { rangeSignal, multiplierProfit, entryEconomics, RANGE_VERSION, RANGE_ARMS, RANGE_SYMBOLS, RANGE_RULES } from './rangeStrategies.js';
import { assetPrecision, validTicks } from './evidenceStrategies.js';
import { cleanCandles } from './signals.js';
const cents = n => Math.round(n * 100) / 100;
export class RangeResearch {
  constructor(owner) { this.owner = owner; this.lastPoll = 0; this.cursor = 0; this.metadata = {}; }
  get state() {
    return this.owner.session.modeStates[this.owner.session.activeMode].rangeResearch ||= {
      version: RANGE_VERSION, startedAt: Date.now(), trades: [], positions: [], ledgers: {}, seen: {}, status: 'Aguardando canal confirmado', scans: {}, costs: {}, events: []
    };
  }
  snapshot() { return { ...this.state, seen: undefined, arms: RANGE_ARMS, rules: RANGE_RULES, simulationOnly: true, retired: true }; }
  ledger(arm) { return this.state.ledgers[arm] ||= { bank: 100, peak: 100, drawdown: 0, day: '', dayLoss: 0, count: 0, reserved: 0 }; }
  event(message) { this.state.events = [...this.state.events, { time: Date.now(), message }].slice(-30); }
  close(p, tick, reason) {
    const profit = cents(multiplierProfit(p, tick.price)), l = this.ledger(p.arm);
    const day = new Date(tick.epoch * 1000).toISOString().slice(0, 10);
    if (day !== l.day) { l.day = day; l.dayLoss = 0; }
    l.bank = cents(l.bank + profit); l.peak = Math.max(l.peak, l.bank); l.drawdown = Math.max(l.drawdown, l.peak - l.bank);
    l.dayLoss = cents(l.dayLoss + Math.max(0, -profit)); l.reserved = 0; l.count++;
    this.state.trades = [...this.state.trades, { ...p, profit, timestamp: tick.epoch * 1000, exitPrice: tick.price, exitEpoch: tick.epoch, reason,
      execution: 'simulation', indicative: true, version: RANGE_VERSION }].slice(-2000);
    this.state.positions = this.state.positions.filter(x => x.id !== p.id);
  }
  async tick(enabled, valid) {
    if (Date.now() - this.lastPoll < 5000) return;
    this.lastPoll = Date.now();
    const s = this.state, api = this.owner.session.derivAPI;
    try {
      // Incremental path replay retains the first triggering tick across polls and restarts.
      for (const p of [...s.positions]) {
        const now = Math.floor(Date.now() / 1000), start = p.lastEpoch ?? Math.floor(p.anchor);
        const end = Math.min(now, start + 120);
        if (end <= start) continue;
        const response = await api.sendRequest({ ticks_history: p.symbol, style: 'ticks', start, end, count: 1000 });
        if (!valid()) return;
        const ticks = validTicks(response.history, p.precision).filter(t => t.epoch > (p.lastEpoch ?? p.anchor));
        for (const t of ticks) {
          if (t.epoch - (p.lastEpoch ?? p.anchor) > 5) { p.blocked = 'Lacuna de ticks: risco reservado; resultado não inventado'; break; }
          p.blocked = null;
          if (!p.entry) {
            const economic = entryEconomics(p, t.price, p.commission);
            if (!economic.accepted) { this.ledger(p.arm).reserved = 0; s.positions = s.positions.filter(x => x.id !== p.id); this.event(`${p.arm}: entrada futura invalidou custo/risco`); break; }
            p.entry = t.price; p.entryEpoch = t.epoch; p.economics = economic; p.lastEpoch = t.epoch; continue;
          }
          p.lastEpoch = t.epoch;
          const profit = multiplierProfit(p, t.price);
          // Broker stop-out is immediate; software exits use the NEXT observed tick to model latency.
          if (profit <= p.stopOut) { this.close(p, t, 'stop_out'); break; }
          if (p.exitReason) { this.close(p, t, p.exitReason); break; }
          if (p.direction * (t.price - p.stop) <= 0) p.exitReason = 'stop';
          else if (p.direction * (t.price - p.target) >= 0) p.exitReason = 'target';
          else if (t.epoch - p.entryEpoch >= RANGE_RULES.maxSeconds) p.exitReason = 'timeout';
        }
        if (!ticks.length && now - start > 5) p.blocked = 'Aguardando recuperação dos ticks; risco reservado';
      }
      if (!enabled()) { s.status = 'Pausado · posições simuladas continuam sendo apuradas'; return; }
      if (!Object.keys(this.metadata).length) {
        const response = await api.sendRequest({ active_symbols: 'brief' }); if (!valid() || !enabled()) return;
        for (const a of response.active_symbols || []) this.metadata[a.underlying_symbol || a.symbol] = assetPrecision(a);
      }
      const symbol = RANGE_SYMBOLS[this.cursor++ % RANGE_SYMBOLS.length], precision = this.metadata[symbol];
      if (!Number.isInteger(precision)) { s.status = `${symbol} indisponível na conexão`; return; }
      const minute = Math.floor(Date.now() / 60000);
      if (s.seen[symbol] === minute) return;
      const response = await api.fetchCandleHistory(symbol, 60, 40); if (!valid() || !enabled()) return;
      const candles = cleanCandles(Array.isArray(response) ? response : response?.candles || [], Date.now() / 1000);
      s.seen[symbol] = minute;
      for (const arm of RANGE_ARMS) {
        if (!valid() || !enabled()) return;
        const key = `${arm.id}:${symbol}`, l = this.ledger(arm.id), now = Date.now() / 1000;
        const day = new Date().toISOString().slice(0, 10);
        if (l.day !== day) { l.day = day; l.dayLoss = 0; }
        if (s.positions.some(p => p.arm === arm.id)) { s.scans[key] = 'Posição simulada em acompanhamento'; continue; }
        if (l.bank < 1 || l.dayLoss + 1 > 3 || l.drawdown + 1 > 15) { s.scans[key] = 'Orçamento de risco bloqueado'; continue; }
        const signal = rangeSignal(arm.id, candles, now);
        if (!signal) { s.scans[key] = 'Sem canal e confirmação válidos'; continue; }
        const contractType = signal.direction === 1 ? 'MULTUP' : 'MULTDOWN';
        const quote = await api.sendRequest({ proposal: 1, amount: 1, basis: 'stake', currency: 'USD', underlying_symbol: symbol, contract_type: contractType, multiplier: 20 });
        if (!valid() || !enabled()) return;
        const q = quote.proposal, commission = Number(q?.commission), spot = Number(q?.spot), stopOut = Number(q?.limit_order?.stop_out?.order_amount);
        const economics = entryEconomics(signal, spot, commission);
        if (q?.id && Number.isFinite(commission) && q.commission != null) (s.costs ||= {})[key] = { commission, ...economics, updatedAt: Date.now() };
        if (!q?.id || q.commission == null || q.spot == null || Number(q.ask_price) !== 1 || Number(q.multiplier) !== 20 || !Number.isFinite(stopOut) || stopOut >= 0 || stopOut < -1 ||
          !Number.isFinite(Number(q.spot_time)) || Date.now() / 1000 - Number(q.spot_time) > 5 || Number(q.spot_time) > Date.now() / 1000 + 1 ||
          Date.now() / 1000 - signal.signalEpoch > 20 || !entryEconomics(signal, spot, commission).accepted) { s.scans[key] = 'Sinal rejeitado por custo, risco ou cotação'; continue; }
        l.reserved = 1;
        s.positions.push({ ...signal, id: `${key}:${signal.key}`, arm: arm.id, symbol, contractType, stake: 1, multiplier: 20, commission, stopOut, precision, anchor: Date.now() / 1000 + 1, createdAt: Date.now() });
        s.scans[key] = 'Simulação iniciada · entrada no próximo tick';
      }
      s.status = 'Range Break · duas estratégias · somente simulação'; s.lastScan = Date.now();
    } catch (e) { if (valid()) { s.status = `Falha no Range Break: ${e.message}`; this.event(s.status); } }
  }
}
