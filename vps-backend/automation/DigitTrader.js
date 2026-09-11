import { DIGIT_ASSETS, DIGIT_VERSION, extractLastDigit, analyzeDigitDistribution, detectDigitAnomalySignal } from './digitAnomaly.js';

export const DIGIT_DEFAULTS = Object.freeze({
  enabled: false,
  symbols: ['R_100', '1HZ50V'],
  stake: 1.0,
  multiplier: 11.0, // Standard recovery multiplier for ~9.5% payout DIGITDIFF
  maxGale: 1,
  cycleBudget: 25.0,
  minPayout: 0.08,
  windowSize: 60,
  minSamples: 30
});

export function validateDigitConfig(patch, previous = DIGIT_DEFAULTS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw Error('Configuração do laboratório de dígitos inválida.');
  }
  const c = { ...previous, ...patch };
  if (typeof c.enabled !== 'boolean' || !Array.isArray(c.symbols) || !c.symbols.length || c.symbols.length > 5 || c.symbols.some(s => !DIGIT_ASSETS.includes(s))) {
    throw Error('Seleção de ativos inválida para o laboratório de dígitos.');
  }
  c.symbols = [...new Set(c.symbols)];
  for (const [k, min, max] of [
    ['stake', 0.35, 100],
    ['multiplier', 1, 20],
    ['maxGale', 0, 2],
    ['cycleBudget', 0.35, 500],
    ['minPayout', 0.05, 0.5],
    ['windowSize', 20, 200],
    ['minSamples', 10, 100]
  ]) {
    c[k] = Number(c[k]);
    if (!Number.isFinite(c[k]) || c[k] < min || c[k] > max) {
      throw Error(`Valor inválido para o parâmetro: ${k}`);
    }
  }
  return c;
}

export class DigitTrader {
  constructor(session) {
    this.session = session;
    this.busy = false;
    this.destroyed = false;
    this.lastPoll = 0;
    this.tickCache = {}; // symbol -> [{ price, epoch }]
  }

  get state() {
    return this.session.modeStates[this.session.activeMode].digitLab ||= {
      config: { ...DIGIT_DEFAULTS },
      version: DIGIT_VERSION,
      status: 'Desligado',
      pending: [],
      trades: [],
      distribution: {},
      events: [],
      lastScan: 0,
      errors: 0
    };
  }

  snapshot() {
    const s = this.state;
    return {
      config: s.config,
      version: s.version,
      status: s.status,
      pending: (s.pending || []).map(p => ({
        id: p.id,
        symbol: p.symbol,
        contractType: p.contractType,
        targetDigit: p.targetDigit,
        stage: p.stage,
        rule: p.rule,
        score: p.score,
        phase: p.quote ? 'Aguardando tick de saída' : 'Cotando proposta'
      })),
      distribution: Object.fromEntries(
        (s.config.symbols || []).map(sym => [
          sym,
          analyzeDigitDistribution(this.tickCache[sym] || [], sym, s.config.windowSize)
        ])
      ),
      trades: (s.trades || []).slice(-1000),
      events: (s.events || []).slice(-30),
      simulationOnly: true
    };
  }

  save() {
    if (!this.destroyed) {
      this.session.loadedFromFile = true;
      this.session.saveToFile();
      this.session.syncToClients();
    }
  }

  event(message, meta = {}) {
    const s = this.state;
    s.events.push({
      time: Date.now(),
      message,
      symbol: meta.symbol,
      digit: meta.targetDigit
    });
    s.events = s.events.slice(-100);
  }

  configure(patch) {
    const s = this.state;
    if ((s.pending.length || this.busy) && Object.keys(patch).some(k => k !== 'enabled')) {
      throw Error('Aguarde as simulações pendentes antes de alterar parâmetros.');
    }
    s.config = validateDigitConfig(patch, s.config);
    s.status = s.config.enabled ? 'Analisando fluxo de dígitos em tempo real' : 'Pausado';
    if (s.config.enabled && !this.session.derivAPI.connected) {
      this.session.connectDeriv();
    }
    this.save();
  }

  finish(p, reason) {
    const s = this.state;
    s.pending = s.pending.filter(x => x.id !== p.id);
    this.event(reason, p);
  }

  async tick() {
    const s = this.state, api = this.session.derivAPI;
    if (this.busy || this.destroyed || (!s.config.enabled && !s.pending.length) || Date.now() - this.lastPoll < 3000) return;
    if (!api.connected || !api.authorized) {
      s.status = 'Aguardando conexão Deriv';
      return;
    }

    this.busy = true;
    this.lastPoll = Date.now();
    const mode = this.session.activeMode;
    const valid = () => !this.destroyed && mode === this.session.activeMode;

    try {
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') {
        throw Error('Simulação de dígitos requer propostas em USD.');
      }

      // Step 1: Process pending operations
      for (const p of [...s.pending]) {
        if (!valid()) return;

        if (p.quote) {
          // Check for exit tick
          if (Date.now() / 1000 < p.expiry + 1) continue;

          const { history } = await api.sendRequest({
            ticks_history: p.symbol,
            style: 'ticks',
            start: p.expiry,
            end: p.expiry + 4,
            count: 10
          });
          if (!valid()) return;

          const points = (history?.times || []).map((t, i) => ({
            epoch: Number(t),
            price: Number(history.prices?.[i])
          })).filter(t => Number.isFinite(t.epoch) && Number.isFinite(t.price) && t.epoch >= p.expiry)
            .sort((a, b) => a.epoch - b.epoch);

          if (!points.length) {
            if (Date.now() / 1000 - p.expiry > 30) {
              this.finish(p, 'Excluído: tick de saída indisponível');
            }
            continue;
          }

          const exit = points[0];
          const exitDigit = extractLastDigit(exit.price, p.symbol);
          const win = exitDigit !== null && exitDigit !== p.targetDigit; // DIGITDIFF: WIN if exit digit != target

          const profit = win ? (p.quote.payout - p.quote.stake) : -p.quote.stake;
          const row = {
            id: `${p.id}:${p.stage}`,
            timestamp: exit.epoch * 1000,
            symbol: p.symbol,
            contractType: p.contractType,
            targetDigit: p.targetDigit,
            exitDigit,
            stage: p.stage,
            rule: p.rule,
            stake: p.quote.stake,
            payout: p.quote.payout,
            profit: Number(profit.toFixed(2)),
            entryPrice: p.quote.entry,
            exitPrice: exit.price,
            version: DIGIT_VERSION,
            execution: 'simulation',
            indicative: true
          };

          s.trades.push(row);
          s.trades = s.trades.slice(-2000);
          p.accumulatedProfit = (p.accumulatedProfit || 0) + row.profit;

          if (win) {
            this.finish(p, `Vitória no Dígito Dif (alvo: ${p.targetDigit} × saída: ${exitDigit}) · +$${row.profit.toFixed(2)}`);
            continue;
          } else {
            // Loss occurred
            if (p.stage < s.config.maxGale) {
              p.stage++;
              p.quote = null;
              p.scheduled = Date.now() / 1000 + 1;
              this.event(`Loss no dígito ${p.targetDigit}. Preparando Gale ${p.stage}`, p);
            } else {
              this.finish(p, `Ciclo encerrado em loss no Gale ${p.stage} (dígito repetido: ${exitDigit})`);
              continue;
            }
          }
        }

        if (!s.config.enabled) {
          this.finish(p, 'Interrompido pela pausa');
          continue;
        }

        // Request proposal for next stage
        const stake = Math.round(s.config.stake * (s.config.multiplier ** p.stage) * 100) / 100;
        if ((p.spent || 0) + stake > s.config.cycleBudget + 1e-9) {
          this.finish(p, 'Excluído: orçamento do ciclo de dígitos excedido');
          continue;
        }

        const response = await api.sendRequest({
          proposal: 1,
          amount: stake,
          basis: 'stake',
          contract_type: 'DIGITDIFF',
          barrier: String(p.targetDigit),
          currency: 'USD',
          underlying_symbol: p.symbol,
          duration: 1,
          duration_unit: 't'
        });
        if (!valid()) return;

        const q = response.proposal;
        const price = Number(q?.ask_price);
        const payout = Number(q?.payout);
        const entry = Number(q?.spot);
        const epoch = Number(q?.spot_time);

        if (!q?.id || ![price, payout, entry, epoch].every(Number.isFinite) || Math.abs(price - stake) > 0.01 || payout <= price) {
          this.finish(p, 'Excluído: proposta de dígito inválida ou rejeitada');
          continue;
        }

        p.spent = (p.spent || 0) + price;
        p.quote = { stake: price, payout, entry, epoch };
        p.expiry = epoch + 1; // 1 tick
        this.event(`Entrada simulada DIGITDIFF (Alvo: ≠${p.targetDigit}, Stake: $${price})`, p);
      }

      // Step 2: Scan active symbols for new tick anomalies
      if (s.config.enabled && !s.pending.length) {
        for (const symbol of s.config.symbols) {
          if (!valid() || !s.config.enabled || s.pending.length) break;

          const { history } = await api.sendRequest({
            ticks_history: symbol,
            style: 'ticks',
            end: 'latest',
            count: 60
          });
          if (!valid() || !s.config.enabled) break;

          const ticks = (history?.times || []).map((epoch, i) => ({
            epoch: Number(epoch),
            price: Number(history.prices?.[i])
          })).filter(t => Number.isFinite(t.epoch) && Number.isFinite(t.price));

          this.tickCache[symbol] = ticks;

          const anomaly = detectDigitAnomalySignal(ticks, symbol, {
            windowSize: s.config.windowSize,
            minSamples: s.config.minSamples
          });

          if (anomaly.signal) {
            const id = `${mode}:${symbol}:${anomaly.targetDigit}:${Date.now()}`;
            s.pending.push({
              id,
              symbol,
              contractType: 'DIGITDIFF',
              targetDigit: anomaly.targetDigit,
              stage: 0,
              rule: anomaly.rule,
              score: anomaly.score,
              scheduled: Date.now() / 1000,
              accumulatedProfit: 0,
              quote: null
            });
            this.event(`Anomalia detectada em ${symbol}: Alvo ≠${anomaly.targetDigit} (${anomaly.rule})`, {
              symbol,
              targetDigit: anomaly.targetDigit
            });
          }
        }
      }

      s.lastScan = Date.now();
      s.errors = 0;
      s.status = s.config.enabled
        ? `Monitorando dígitos em ${s.config.symbols.join(', ')} · 100% simulado`
        : s.pending.length ? 'Pausado · liquidando simulações pendentes' : 'Pausado';

    } catch (err) {
      s.errors++;
      s.status = `Falha na simulação de dígitos: ${err.message}`;
      if (s.errors >= 5) {
        s.config.enabled = false;
        this.event('Laboratório de dígitos pausado após falhas consecutivas');
      }
    } finally {
      this.busy = false;
      this.save();
    }
  }
}
