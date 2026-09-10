import { DEFAULT_CONTINUOUS, validateConfig, cleanCandles, signalFor } from './signals.js';

const day = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ config: { ...DEFAULT_CONTINUOUS }, status: 'Desligado', seen: {}, events: [], trades: [], shadows: [], position: null,
  riskDay: day(), lossUsed: 0, legacyIds: [], lastScan: 0, lastEntry: 0, markets: [], errorCount: 0 });

export class ContinuousTrader {
  constructor(session, journal = () => {}) { this.session = session; this.journal = journal; this.busy = false; this.destroyed = false; }
  get state() {
    const mode = this.session.modeStates[this.session.activeMode];
    if (!mode.continuous) {
      mode.continuous = empty();
      // Seed shared loss budget from existing timeline contracts on the first use.
      for (const t of mode.trades || []) if (Number.isFinite(Number(t.profit)) && new Date(t.timestamp || t.epoch * 1000).toJSON()?.slice(0, 10) === day()) {
        mode.continuous.lossUsed += Math.max(0, -Number(t.profit || 0));
        mode.continuous.legacyIds.push(String(t.id));
      }
    }
    return mode.continuous;
  }
  save() { if (this.destroyed) return; this.session.saveToFile(); this.session.syncToClients(); }
  event(kind, message, extra = {}) {
    if (this.destroyed) return;
    const state = this.state;
    const record = { time: Date.now(), kind, message, accountMode: this.session.activeMode, ...extra };
    state.events.push(record); state.events = state.events.slice(-200);
    this.journal(record); this.save();
  }
  snapshot() {
    const s = this.state;
    return { ...s, events: s.events.slice(-80), trades: s.trades.slice(-1000), shadows: s.shadows.length,
      legacyOrder: this.session.modeStates[this.session.activeMode].legacyOrder || null,
      seen: undefined, legacyIds: undefined, serverTime: Date.now(), scope: 'current-account', version: 1 };
  }
  configure(patch) {
    const s = this.state;
    if (!patch || typeof patch !== 'object') throw Error('Configuração inválida.');
    if (this.busy || s.position) {
      if (Object.keys(patch).length !== 1 || patch.enabled !== false) throw Error('Aguarde a ordem em curso para alterar os parâmetros. É possível pausar novas entradas.');
    }
    s.config = validateConfig(patch, s.config);
    this.session.loadedFromFile = true;
    if (s.config.enabled && !this.session.derivAPI.connected && !this.session.derivAPI.shouldReconnect) this.session.connectDeriv();
    s.status = s.config.enabled ? 'Aguardando mercado' : 'Desligado';
    this.event('config', s.config.enabled ? `Trader contínuo ligado: ${s.config.execution === 'live' ? 'compras habilitadas' : 'observação'}` : 'Novas entradas pausadas', { config: s.config });
  }
  rollDay() { const s = this.state; if (s.riskDay !== day()) { s.riskDay = day(); s.lossUsed = 0; s.legacyIds = []; this.save(); } }
  recordLegacy(trade) {
    this.rollDay(); const s = this.state, id = String(trade.id);
    if (s.legacyIds.includes(id)) return;
    s.legacyIds.push(id); s.legacyIds = s.legacyIds.slice(-10000);
    s.lossUsed += Math.max(0, -Number(trade.profit || 0));
    this.journal({ kind: 'timeline_settlement', time: Date.now(), accountMode: this.session.activeMode, ...trade });
  }
  exposure() {
    const s = this.state, legacy = this.session.modeStates[this.session.activeMode].legacyOrder;
    const hasLegacy = !!(legacy || this.session.activeContractId);
    const legacyStake = hasLegacy ? Number(legacy?.stake || this.session.lastContractDetails?.stake || Infinity) : 0;
    return { count: Number(hasLegacy) + Number(!!s.position), amount: legacyStake + Number(s.position?.stake || 0) };
  }
  rejection(stake, source = 'continuous') {
    this.rollDay(); const s = this.state, cfg = s.config;
    if (!(Number.isFinite(stake) && stake > 0)) return 'Valor de entrada inválido';
    const exposure = this.exposure();
    if (!this.session.derivAPI.connected || !this.session.derivAPI.authorized) return 'Deriv desconectada';
    if (source === 'continuous' && this.session.accountCurrency && this.session.accountCurrency !== 'USD') return 'Trader contínuo requer conta em USD';
    if (source === 'timeline' && (this.session.activeContractId || this.session.modeStates[this.session.activeMode].legacyOrder)) return 'Ordem da agenda ainda em aberto';
    if (source === 'continuous' && s.position) return 'Contrato contínuo ainda em aberto';
    const legacy = this.session.modeStates[this.session.activeMode].legacyOrder;
    if (legacy && !legacy.contractId && Date.now() - legacy.requestedAt > 15000) return 'Compra da agenda aguardando conciliação';
    // An ambiguous purchase freezes BOTH engines until broker reconciliation.
    if (s.position && !s.position.contractId) return 'Compra aguardando conciliação';
    if (source === 'continuous' || cfg.execution === 'live' || s.position) {
      if (exposure.count >= cfg.maxPositions) return 'Limite compartilhado de posições';
      if (exposure.amount + stake > cfg.maxExposure + 1e-8) return 'Limite compartilhado de exposição';
      if (s.lossUsed + exposure.amount + stake > cfg.dailyLossLimit + 1e-8) return 'Orçamento diário de perdas esgotado (UTC)';
      if (stake + exposure.amount > this.session.balance) return 'Saldo insuficiente para a exposição';
    }
    return null;
  }
  async acknowledgeBuy(data, request) {
    if (this.destroyed) return;
    const s = this.state, p = s.position;
    if (!p || request?.passthrough?.signalId !== p.signalId) return;
    if (data.error) { s.position = null; this.event('rejected', data.error.message, { signalId: p.signalId }); return; }
    if (!data.buy?.contract_id) return;
    p.contractId = String(data.buy.contract_id); p.phase = 'open';
    p.stake = Number(data.buy.buy_price || p.stake);
    this.event('bought', 'Contrato contínuo confirmado', { ...p });
  }
  async reconcile(contractId, source = 'continuous') {
    if (this.busy) throw Error('Aguarde a consulta em andamento.');
    const p = source === 'timeline' ? this.session.modeStates[this.session.activeMode].legacyOrder : this.state.position;
    if (!p || p.contractId || !/^\d+$/.test(String(contractId))) throw Error('Não há compra incerta para conciliar.');
    this.busy = true;
    try {
      const { proposal_open_contract: c } = await this.session.derivAPI.sendRequest({ proposal_open_contract: 1, contract_id: Number(contractId) });
      if (!c || String(c.contract_id) !== String(contractId) || !Number.isFinite(Number(c.buy_price)) || !Number.isFinite(Number(c.date_start)) || c.contract_type !== p.direction || (c.underlying || c.underlying_symbol) !== p.symbol || Math.abs(Number(c.buy_price) - p.stake) > .01 || Math.abs(Number(c.date_start) * 1000 - p.requestedAt) > 30000) throw Error('Contrato não corresponde à compra pendente.');
      p.contractId = String(c.contract_id); p.phase = 'open'; this.event('reconciled', 'Compra vinculada ao contrato informado', { contractId });
    } finally { this.busy = false; }
  }
  async settleLegacy() {
    const order = this.session.modeStates[this.session.activeMode].legacyOrder;
    if (!order?.contractId || Date.now() - (this.lastLegacyPoll || 0) < 15000) return;
    this.lastLegacyPoll = Date.now();
    const { proposal_open_contract: c } = await this.session.derivAPI.sendRequest({ proposal_open_contract: 1, contract_id: Number(order.contractId) });
    if (this.destroyed) return;
    if (c && (c.is_sold === 1 || ['won', 'lost', 'sold'].includes(c.status))) {
      // The old watchdog may have cleared its display lock. Restore the known ID
      // before forwarding the final result through the existing accounting.
      this.session.activeContractId = order.contractId;
      this.session.handleContractUpdate(c);
    }
  }
  async settlePosition() {
    const s = this.state, p = s.position;
    if (!p?.contractId) return;
    const { proposal_open_contract: c } = await this.session.derivAPI.sendRequest({ proposal_open_contract: 1, contract_id: Number(p.contractId) });
    if (this.destroyed) return;
    if (!c || !(c.is_sold || ['won', 'lost', 'sold'].includes(c.status))) return;
    const profit = Number(c.profit);
    if (!Number.isFinite(profit)) throw Error('Liquidação sem resultado financeiro.');
    this.rollDay();
    const trade = { ...p, id: p.contractId, source: 'continuous', execution: 'live', profit, timestamp: Date.now(),
      entryPrice: c.entry_tick, exitPrice: c.exit_tick, dateStart: c.date_start, dateExpiry: c.date_expiry };
    if (!s.trades.some(t => t.id === trade.id)) {
      s.trades.push(trade); s.trades = s.trades.slice(-2000); s.lossUsed += Math.max(0, -profit);
      this.session.balance += profit;
      // Neutralize the independent P&L in the legacy balance-difference accounting.
      if (this.session.sessionStartTime) this.session.initialBalance += profit;
    }
    s.position = null; s.errorCount = 0; this.event('settled', `Resultado contínuo: ${profit.toFixed(2)}`, trade);
  }
  async settleShadows() {
    const s = this.state, now = Date.now() / 1000;
    for (const p of s.shadows.slice(0, 4)) {
      if (now < p.expiry + 3) continue;
      const { history } = await this.session.derivAPI.sendRequest({ ticks_history: p.symbol, style: 'ticks', start: p.expiry, end: p.expiry + 5, count: 20 });
      if (this.destroyed) return;
      const index = history?.times?.findIndex(t => Number(t) >= p.expiry);
      const exit = index >= 0 ? Number(history.prices[index]) : NaN;
      if (!Number.isFinite(exit)) {
        if (now - p.expiry > 600) { s.shadows = s.shadows.filter(x => x.signalId !== p.signalId); this.event('unresolved', 'Observação sem tick de saída; excluída das métricas', p); }
        continue;
      }
      const win = p.direction === 'CALL' ? exit > p.entry : exit < p.entry;
      const trade = { ...p, id: p.signalId, source: 'continuous', execution: 'observe', timestamp: Date.now(), profit: win ? p.payout - p.stake : -p.stake, exitPrice: exit, indicative: true };
      s.trades.push(trade); s.trades = s.trades.slice(-2000); s.shadows = s.shadows.filter(x => x.signalId !== p.signalId);
      this.event('observed', 'Resultado indicativo por ticks, sem compra', trade);
    }
  }
  async tick() {
    if (this.busy || this.destroyed) return;
    const s = this.state, api = this.session.derivAPI;
    if (!s.config.enabled && !s.position && !s.shadows.length && !this.session.modeStates[this.session.activeMode].legacyOrder) return;
    if (!api.connected || !api.authorized) { s.status = 'Aguardando conexão Deriv'; this.save(); return; }
    this.busy = true;
    const mode = this.session.activeMode;
    try {
      await this.settleLegacy(); await this.settlePosition(); await this.settleShadows();
      if (!s.config.enabled || s.position && !s.position.contractId) { s.status = s.position ? 'Compra incerta: concilie o contrato' : 'Desligado'; return; }
      if (Date.now() - s.lastScan < 15000) return;
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') throw Error('Trader contínuo requer conta em USD.');
      s.lastScan = Date.now(); s.status = 'Observando ativos'; s.markets = [];
      for (const symbol of s.config.symbols) {
        if (this.destroyed || mode !== this.session.activeMode || !s.config.enabled) break;
        const candles = cleanCandles(await api.fetchCandleHistory(symbol, 60, 200), Date.now() / 1000);
        const age = Date.now() / 1000 - Number(candles.at(-1)?.epoch + 60);
        if (!Number.isFinite(age) || age > 25 || age < 0) { s.markets.push({ symbol, status: 'Aguardando próxima vela fechada' }); continue; }
        const signals = s.config.strategies.map(id => signalFor(candles, id)).filter(Boolean).sort((a, b) => b.score - a.score);
        s.markets.push({ symbol, status: signals.length ? 'Sinal avaliado' : 'Sem sinal', score: signals[0]?.score });
        for (const signal of signals) {
          const signalId = `${mode}:${symbol}:${signal.strategy}:${signal.version}:${signal.signalEpoch}`;
          if (s.seen[`${symbol}:${signal.strategy}`] === signal.signalEpoch) continue;
          s.seen[`${symbol}:${signal.strategy}`] = signal.signalEpoch;
          const context = { ...signal, signalId, symbol, execution: s.config.execution, accountMode: mode, durationMinutes: s.config.durationMinutes, config: { ...s.config } };
          if (signal.score < s.config.minScore) { this.event('filtered', 'Confluência abaixo do limiar', context); continue; }
          if (Date.now() - s.lastEntry < s.config.cooldownSeconds * 1000) { this.event('filtered', 'Intervalo mínimo entre entradas', context); continue; }
          if (s.config.execution === 'live') {
            const reason = this.rejection(s.config.stake);
            if (reason) { this.event('filtered', reason, context); continue; }
          }
          const requestedAt = Date.now();
          const response = await api.sendRequest({ proposal: 1, amount: s.config.stake, basis: 'stake', contract_type: signal.direction,
            currency: this.session.accountCurrency || 'USD', underlying_symbol: symbol, duration: s.config.durationMinutes, duration_unit: 'm' });
          const quote = response.proposal;
          if (!this.destroyed) this.session.research?.proposal(context, quote, requestedAt);
          const price = Number(quote?.ask_price), payout = Number(quote?.payout);
          if (!quote?.id || !Number.isFinite(payout) || !(price > 0) || !(payout > price) || Math.abs(price - s.config.stake) > .01) { this.event('filtered', 'Proposta sem preço/payout válido', context); continue; }
          const ratio = (payout - price) / price;
          if (ratio < s.config.minPayout) { this.event('filtered', 'Payout abaixo do mínimo', { ...context, payout, price }); continue; }
          // Recheck after I/O: the timeline may have reserved exposure meanwhile.
          if (this.destroyed || !s.config.enabled || mode !== this.session.activeMode || Date.now() / 1000 - signal.signalEpoch > 25) continue;
          if (s.config.execution === 'observe') {
            const entry = Number(quote.spot), spotTime = Number(quote.spot_time);
            if (!Number.isFinite(entry) || !Number.isFinite(spotTime) || Math.abs(Date.now() / 1000 - spotTime) > 10) { this.event('filtered', 'Proposta sem tick recente para observação', context); continue; }
            s.shadows.push({ ...context, stake: price, payout, entry, expiry: spotTime + s.config.durationMinutes * 60 });
            s.shadows = s.shadows.slice(-100); s.lastEntry = Date.now(); this.event('signal', 'Sinal registrado em observação', { ...context, price, payout });
          } else {
            const reason = this.rejection(price);
            if (reason) { this.event('filtered', reason, context); continue; }
            s.position = { ...context, stake: price, payout, requestedAt: Date.now(), phase: 'pending' };
            s.lastEntry = Date.now(); this.event('buy_intent', 'Compra enviada; aguardando confirmação', s.position);
            if (!this.session.saveToFile()) { s.position = null; throw Error('Não foi possível persistir a intenção de compra.'); }
            const request = { buy: quote.id, price, passthrough: { automation: 'continuous', signalId } };
            try { await this.acknowledgeBuy(await api.sendRequest(request), request); }
            catch (err) {
              if (err.definitive) s.position = null;
              else if (s.position) s.position.phase = 'uncertain';
              this.event('error', err.definitive ? 'Compra recusada: ' + err.message : 'Resultado da compra incerto. Não será reenviada.', { signalId });
            }
          }
          break;
        }
      }
      s.errorCount = 0;
      s.status = s.position ? (s.position.contractId ? 'Contrato em andamento' : 'Compra aguardando conciliação') : 'Observando ativos';
    } catch (err) {
      s.errorCount++; s.status = 'Aguardando recuperação da API';
      this.event('error', err.message);
      if (s.errorCount >= 5) { s.config.enabled = false; s.status = 'Pausado após falhas consecutivas'; }
    } finally { this.busy = false; this.save(); }
  }
}
