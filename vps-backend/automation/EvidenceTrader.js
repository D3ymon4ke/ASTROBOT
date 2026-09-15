import { cleanCandles } from './signals.js';
import { RangeResearch } from './RangeResearch.js';
import { OptionsResearch } from './OptionsResearch.js';
import { EVIDENCE_VERSION, LAB_DEFAULTS, LAB_ARMS, validateLabConfig, candidate, validTicks, metrics, evidenceGate, assetPrecision } from './evidenceStrategies.js';

const round = n => Math.round(n * 100) / 100;
export class EvidenceTrader {
  constructor(session) { this.session = session; this.busy = false; this.destroyed = false; this.lastPoll = 0; this.metadata = {}; this.range = new RangeResearch(this); this.options = new OptionsResearch(this); }
  get state() {
    const state = this.session.modeStates[this.session.activeMode].evidenceLab ||= {
      version: EVIDENCE_VERSION, config: { ...LAB_DEFAULTS, symbols: [...LAB_DEFAULTS.symbols] }, startedAt: Date.now(),
      pending: [], trades: [], ledgers: {}, samples: {}, seen: {}, matrix: {}, events: [], lastScan: 0, errors: 0, cursor: 0, status: 'Experimentos anteriores encerrados', retiredAt: Date.now()
    };
    state.retiredAt ||= Date.now();
    return state;
  }
  snapshot() {
    const s = this.state, legacy = this.session.modeStates[this.session.activeMode];
    return { ...s, samples: undefined, seen: undefined, simulationOnly: true, trades: s.trades.slice(-1500),
      arms: LAB_ARMS, rangeResearch: this.range.snapshot(), optionsResearch: this.options.snapshot(), legacy: { quantum: metrics(legacy.digitLab?.trades || []), fakegale: metrics(legacy.fakegale?.trades || []), retainedOnly: true },
      pending: s.pending.map(p => ({ id: p.id, arm: p.arm, symbol: p.symbol, contractType: p.contractType, allocated: p.allocated, createdAt: p.createdAt })) };
  }
  save() { if (!this.destroyed) { this.session.loadedFromFile = true; this.session.saveToFile(); this.session.syncToClients(); } }
  event(message) { this.state.events = [...this.state.events, { time: Date.now(), message }].slice(-50); }
  configure(patch) {
    const s = this.state;
    if (Object.keys(patch || {}).some(k => k !== 'enabled') && (s.trades.length || s.pending.length || this.busy)) throw Error('Parâmetros congelados após o início para preservar a comparação.');
    s.config = validateLabConfig(patch, s.config);
    if (s.config.enabled && !this.session.derivAPI.connected) this.session.connectDeriv();
    s.status = s.config.enabled ? 'Nova fase ativa · Forex e Accumulator · somente simulação' : 'Pausado · pendências serão apuradas'; this.save();
  }
  ledger(arm) {
    const s = this.state;
    return s.ledgers[arm] ||= { bank: s.config.initialBank, peak: s.config.initialBank, drawdown: 0, net: 0, count: 0, day: '', dayLoss: 0, reserved: 0 };
  }
  reserve(arm, gate, now) {
    const s = this.state, l = this.ledger(arm), day = new Date(now * 1000).toISOString().slice(0, 10);
    if (l.day !== day) { l.day = day; l.dayLoss = 0; }
    if (arm === 'digit_control' || !gate.qualified || l.reserved || l.bank < s.config.stake || l.drawdown + s.config.stake > s.config.maxDrawdown || l.dayLoss + s.config.stake > s.config.dailyLossLimit) return false;
    l.reserved = s.config.stake; return true;
  }
  exclude(p, reason) {
    if (p.allocated) this.ledger(p.arm).reserved = 0;
    this.state.pending = this.state.pending.filter(x => x.id !== p.id);
    this.event(`${p.arm} · ${p.symbol} · excluído: ${reason}`);
  }
  settle(p, entry, exit) {
    const s = this.state;
    const win = p.contractType === 'DIGITEVEN' ? exit.digit % 2 === 0 : p.contractType === 'DIGITODD' ? exit.digit % 2 === 1 : p.contractType === 'CALL' ? exit.price > entry.price : exit.price < entry.price;
    const row = { id: p.id, arm: p.arm, symbol: p.symbol, contractType: p.contractType, stake: p.stake, payout: p.payout,
      profit: round(win ? p.payout - p.stake : -p.stake), timestamp: exit.epoch * 1000, entryEpoch: entry.epoch, exitEpoch: exit.epoch,
      entry: entry.price, exitPrice: exit.price, exitDigit: exit.digit, precision: p.precision, quotedAt: p.createdAt,
      allocated: p.allocated, evidence: p.evidence, version: EVIDENCE_VERSION, execution: 'simulation', indicative: true };
    s.trades = [...s.trades, row].slice(-6000);
    const key = `${p.arm}:${p.symbol}:${p.contractType}`;
    s.samples[key] = [...(s.samples[key] || []), row].slice(-400);
    if (p.allocated) {
      const l = this.ledger(p.arm), day = new Date(row.timestamp).toISOString().slice(0, 10);
      if (l.day !== day) { l.day = day; l.dayLoss = 0; }
      l.bank = round(l.bank + row.profit); l.net = round(l.net + row.profit); l.count++; l.reserved = 0;
      l.peak = Math.max(l.peak, l.bank); l.drawdown = Math.max(l.drawdown, l.peak - l.bank);
      if (row.profit < 0) l.dayLoss = round(l.dayLoss - row.profit);
    }
    s.pending = s.pending.filter(x => x.id !== p.id);
  }
  async tick() {
    const s = this.state, api = this.session.derivAPI;
    if (this.busy || this.destroyed || (!s.config.enabled && !s.pending.length && !this.range.state.positions.length && !this.options.state.positions.length) || Date.now() - this.lastPoll < 5000) return;
    if (!api.connected || !api.authorized) { s.status = 'Aguardando conexão Deriv'; return; }
    this.busy = true; this.lastPoll = Date.now(); const mode = this.session.activeMode;
    const valid = () => !this.destroyed && this.session.activeMode === mode;
    try {
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') throw Error('Propostas requerem USD.');
      // Range Break and the first evidence arms are retired. Existing positions/results are preserved and settled.
      await this.range.tick(() => false, valid);
      if (!valid()) return;
      await this.options.tick(() => s.config.enabled, valid);
      if (!valid()) return;
      // Settle before all risk gates, pauses and day boundaries.
      for (const p of [...s.pending]) {
        const now = Date.now() / 1000;
        if (p.unit === 'm' && now < p.anchor + p.duration * 60 + 6) continue;
        const response = await api.sendRequest({ ticks_history: p.symbol, style: 'ticks', start: Math.floor(p.anchor), end: Math.floor(now), count: 1000 });
        if (!valid()) return;
        const ticks = validTicks(response.history, p.precision).filter(t => t.epoch > p.anchor);
        // Entry is the first tick after the hypothetical purchase reaches the server.
        const entry = ticks[0];
        const exit = p.unit === 't' ? ticks[p.duration] : entry && ticks.find(t => t.epoch >= entry.epoch + p.duration * 60);
        if (!entry || !exit) { if (now > p.anchor + (p.unit === 'm' ? p.duration * 60 : 0) + 120) this.exclude(p, 'historical ticks unavailable'); continue; }
        if (entry.epoch - p.anchor > 5 || (p.unit === 't' ? exit.epoch - entry.epoch > 5 : exit.epoch - entry.epoch - p.duration * 60 > 5)) { this.exclude(p, 'lacuna nos ticks'); continue; }
        this.settle(p, entry, exit);
      }
      if (!s.retiredAt && s.config.enabled) {
        if (!Object.keys(this.metadata).length) {
          const r = await api.sendRequest({ active_symbols: 'brief' }); if (!valid()) return;
          for (const asset of r.active_symbols || []) {
            const precision = assetPrecision(asset);
            if (Number.isInteger(precision) && precision >= 0 && precision <= 10) this.metadata[asset.symbol || asset.underlying_symbol] = precision;
          }
        }
        const symbols = s.config.symbols, cursor = s.cursor++ % symbols.length;
        // One asset per scan rotates opportunities without flooding the shared API.
        const symbol = symbols[cursor], precision = this.metadata[symbol];
        if (precision == null) { s.status = `Aguardando precisão oficial de ${symbol}`; return; }
        const history = await api.sendRequest({ ticks_history: symbol, style: 'ticks', count: 300, end: 'latest' }); if (!valid() || !s.config.enabled) return;
        const ticks = validTicks(history.history, precision), now = Date.now() / 1000;
        if (!ticks.length || now - ticks.at(-1).epoch > 5 || ticks.at(-1).epoch > now + 1) throw Error('Ticks recentes inválidos');
        const minute = Math.floor(now / 60);
        let bars = [];
        if (s.seen[`bars:${symbol}`] !== minute) {
          bars = cleanCandles(await api.fetchCandleHistory(symbol, 60, 40), Date.now() / 1000);
          if (!valid() || !s.config.enabled) return;
          s.seen[`bars:${symbol}`] = minute;
        }
        for (const arm of LAB_ARMS) {
          if (!valid() || !s.config.enabled) break;
          if (s.pending.some(p => p.arm === arm.id)) continue;
          const signal = candidate(arm.id, bars, ticks, Date.now() / 1000), key = `${arm.id}:${symbol}`;
          if (!signal || s.seen[key] === signal.key) continue;
          s.seen[key] = signal.key;
          const r = await api.sendRequest({ proposal: 1, amount: s.config.stake, basis: 'stake', contract_type: signal.contractType,
            currency: 'USD', underlying_symbol: symbol, duration: arm.duration, duration_unit: arm.unit });
          if (!valid() || !s.config.enabled) return;
          const q = r.proposal, createdAt = Date.now(), quoteTime = Number(q?.spot_time), stake = Number(q?.ask_price), payout = Number(q?.payout);
          if (!q?.id || ![stake, payout, quoteTime, Number(q.spot)].every(Number.isFinite) || Math.abs(stake - s.config.stake) > .001 || payout <= stake || createdAt / 1000 - quoteTime > 5 || quoteTime > createdAt / 1000 + 1 || createdAt / 1000 - signal.signalEpoch > (arm.unit === 't' ? 60 : 20)) {
            this.event(`${key} · proposta inválida ou sinal vencido`); continue;
          }
          const evidence = evidenceGate(s.samples[`${key}:${signal.contractType}`] || [], payout / stake);
          s.matrix[key] = { ...evidence, payoutRatio: payout / stake, contractType: signal.contractType, updatedAt: createdAt };
          const allocated = this.reserve(arm.id, evidence, createdAt / 1000);
          s.pending.push({ id: `${mode}:${key}:${signal.key}`, arm: arm.id, symbol, contractType: signal.contractType, unit: arm.unit,
            duration: arm.duration, precision, stake, payout, createdAt, anchor: createdAt / 1000 + 1, allocated, evidence });
        }
      }
      s.lastScan = Date.now(); s.errors = 0; s.status = s.config.enabled ? 'Nova fase ativa · Forex e Accumulator · sem compras' : 'Pausado';
    } catch (e) {
      s.errors++; s.status = `Falha na pesquisa: ${e.message}`; this.event(s.status);
      if (s.errors >= 5) s.config.enabled = false;
    } finally { this.busy = false; this.save(); }
  }
}
