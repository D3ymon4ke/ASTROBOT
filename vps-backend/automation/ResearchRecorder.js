import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ASSETS, cleanCandles } from './signals.js';
import { studySignal, comparePullback } from './pullbackStudy.js';
import { breakoutSignal } from './breakout.js';
import { replayTicks } from './tickReplay.js';

const DAY = 86400000, LIMIT = 32 * 1024 * 1024;
export class ResearchRecorder {
  constructor(session, directory) { this.session = session; this.directory = path.resolve(directory); this.busy = false; this.destroyed = false; this.lastPoll = 0; }
  get state() {
    const mode = this.session.modeStates[this.session.activeMode];
    return mode.research ||= { enabled: false, symbols: ['R_100', '1HZ50V'], status: 'Desligado', ticks: 0, proposals: 0, lastEpoch: {}, seen: {}, lastCapture: 0, errors: 0 };
  }
  snapshot() { return { ...this.state, lastEpoch: undefined, seen: undefined, version: 1, experimentsVersion: 'pullback-study-v1', retentionDays: 7, dailyLimitMB: 32 }; }
  configure(enabled, symbols = this.state.symbols) {
    if (enabled === false) symbols = this.state.symbols;
    if (typeof enabled !== 'boolean' || !Array.isArray(symbols) || !symbols.length || symbols.length > 4 || symbols.some(s => !ASSETS.includes(s))) throw Error('Configuração do gravador inválida.');
    if (this.busy && enabled) throw Error('Aguarde a captura em andamento.');
    Object.assign(this.state, { enabled, symbols: [...new Set(symbols)], errors: 0, status: enabled ? 'Aguardando captura' : 'Pausado' });
    this.session.loadedFromFile = true;
    this.session.saveToFile(); this.session.syncToClients();
  }
  append(records) {
    if (this.destroyed || !this.state.enabled || !records.length) return;
    fs.mkdirSync(this.directory, { recursive: true });
    const date = new Date().toISOString().slice(0, 10), file = path.join(this.directory, `${this.session.activeMode}-${date}.jsonl`);
    const body = records.map(r => JSON.stringify({ ...r, accountMode: this.session.activeMode })).join('\n') + '\n';
    if ((fs.existsSync(file) ? fs.statSync(file).size : 0) + Buffer.byteLength(body) > LIMIT) throw Error('Limite diário de 32 MB atingido.');
    fs.appendFileSync(file, body);
    if (this.retentionDay !== date) {
      this.retentionDay = date;
      for (const name of fs.readdirSync(this.directory)) {
        const match = /^(demo|real)-(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(name);
        const target = path.resolve(this.directory, name);
        if (match && path.dirname(target) === this.directory && Date.parse(match[2]) < Date.parse(date) - 6 * DAY) fs.unlinkSync(target);
      }
    }
  }
  fail(error) { Object.assign(this.state, { enabled: false, status: `Captura pausada: ${error.message}` }); this.session.saveToFile(); }
  decision(record) {
    if (!this.state.enabled) return;
    // Explicit projection: never persist credentials or the session settings.
    try { this.append([{ kind: 'decision', time: record.time, signalId: record.signalId, symbol: record.symbol, strategy: record.strategy, version: record.version, decision: record.kind, reason: record.message }]); }
    catch (e) { this.fail(e); }
  }
  proposal(context, quote, requestedAt) {
    if (!this.state.enabled) return;
    const stake = Number(quote?.ask_price), payout = Number(quote?.payout);
    if (!quote?.id || ![stake, payout].every(Number.isFinite) || stake <= 0 || payout <= stake) return;
    try {
      this.append([{ kind: 'proposal', signalId: context.signalId, symbol: context.symbol, strategy: context.strategy, version: context.version,
        features: context.features, direction: context.direction, durationMinutes: context.durationMinutes, score: context.score, stake, payout, requestedAt, receivedAt: Date.now(),
        responseMs: Date.now() - requestedAt, eligible: context.score >= (context.config?.minScore ?? 60) && (payout - stake) / stake >= (context.config?.minPayout ?? .8)
          && Math.abs(stake - Number(context.config?.stake ?? .35)) <= .01 && Date.now() / 1000 - context.signalEpoch <= 25,
        origin: context.strategy === 'breakout' || context.version === 'pullback-study-v1' ? 'candidate-observation' : 'continuous', quoteSpot: Number(quote.spot), quoteTime: Number(quote.spot_time) }]);
      this.state.proposals++;
    } catch (e) { this.fail(e); }
  }
  async tick() {
    const s = this.state, api = this.session.derivAPI;
    if (this.destroyed || this.busy || !s.enabled || Date.now() - this.lastPoll < 15000) return;
    if (!api.connected || !api.authorized) { s.status = 'Aguardando conexão Deriv'; return; }
    this.busy = true; this.lastPoll = Date.now(); const mode = this.session.activeMode;
    try {
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') throw Error('Pesquisa com propostas requer conta USD.');
      for (const symbol of s.symbols) {
        if (!s.enabled || this.destroyed || mode !== this.session.activeMode) break;
        const { history } = await api.sendRequest({ ticks_history: symbol, style: 'ticks', end: 'latest', count: 1000 });
        if (this.destroyed || !s.enabled || mode !== this.session.activeMode) break;
        if (!history?.times || !history?.prices || history.times.length !== history.prices.length) throw Error('Histórico de ticks inválido.');
        const cutoff = s.lastEpoch[symbol] ?? Date.now() / 1000 - 30;
        const ticks = history.times.map((epoch, i) => ({ kind: 'tick', symbol, epoch: Number(epoch), price: Number(history.prices[i]) }))
          .filter(t => Number.isFinite(t.epoch) && Number.isFinite(t.price) && t.epoch > cutoff).sort((a, b) => a.epoch - b.epoch);
        this.append(ticks); s.ticks += ticks.length;
        if (ticks.length) s.lastEpoch[symbol] = ticks.at(-1).epoch;
        const candles = cleanCandles(await api.fetchCandleHistory(symbol, 60, 60), Date.now() / 1000);
        if (this.destroyed || !s.enabled || mode !== this.session.activeMode) break;
        for (const signal of [breakoutSignal(candles), studySignal(candles)].filter(Boolean)) {
          const key = symbol + ':' + signal.version;
          if (Date.now() / 1000 - signal.signalEpoch > 25 || s.seen[key] === signal.signalEpoch) continue;
          s.seen[key] = signal.signalEpoch;
          const context = { ...signal, symbol, signalId: `${mode}:${symbol}:${signal.version}:${signal.signalEpoch}`, durationMinutes: 1 };
          this.decision({ ...context, kind: 'candidate', time: Date.now(), message: signal.reasons.join('; ') });
          const requestedAt = Date.now();
          const { proposal } = await api.sendRequest({ proposal: 1, amount: .35, basis: 'stake', contract_type: signal.direction, currency: this.session.accountCurrency || 'USD', underlying_symbol: symbol, duration: 1, duration_unit: 'm' });
          if (this.destroyed || !s.enabled || mode !== this.session.activeMode) break;
          this.proposal(context, proposal, requestedAt);
        }
      }
      s.lastCapture = Date.now(); s.errors = 0; if (s.enabled) s.status = 'Gravando · rompimento e pullback em observação';
    } catch (e) { s.errors++; s.status = `Captura incompleta: ${e.message}`; if (s.errors >= 5 || /32 MB|ENOSPC|EACCES/.test(e.message)) this.fail(e); }
    finally { this.busy = false; if (!this.destroyed) { this.session.saveToFile(); this.session.syncToClients(); } }
  }
  async replay(date, symbol, options) {
    const accountMode = this.session.activeMode;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !ASSETS.includes(symbol)) throw Error('Data ou ativo inválido.');
    const file = path.join(this.directory, `${this.session.activeMode}-${date}.jsonl`), records = [];
    if (!fs.existsSync(file)) throw Error('Nenhuma captura nessa data e conta. Ligue o gravador para formar a base.');
    const size = fs.statSync(file).size;
    if (size > LIMIT) throw Error('Arquivo excede o limite de leitura de 32 MB.');
    if (!size) return { ...replayTicks([], options), symbol, date, accountMode, generatedAt: Date.now() };
    const nextDate = new Date(Date.parse(date) + DAY).toISOString().slice(0, 10);
    const nextFile = path.join(this.directory, `${this.session.activeMode}-${nextDate}.jsonl`);
    for (const current of [file, nextFile]) {
      if (!fs.existsSync(current)) continue;
      const bytes = fs.statSync(current).size;
      if (!bytes) continue;
      if (bytes > LIMIT) throw Error('Arquivo excede o limite de leitura de 32 MB.');
      const input = fs.createReadStream(current, { encoding: 'utf8', end: bytes - 1 });
      const lines = readline.createInterface({ input, crlfDelay: Infinity });
      try { for await (const line of lines) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (r.symbol === symbol && (current === file || r.kind === 'tick' && r.epoch < Date.parse(nextDate) / 1000 + 360)) records.push(r); } catch { /* A writer may be completing the last record. */ } } }
      finally { lines.close(); input.destroy(); }
    }
    return { ...replayTicks(records.filter(r => r.version !== 'pullback-study-v1'), options), comparison: comparePullback(records, options), symbol, date, accountMode, generatedAt: Date.now() };
  }
}
