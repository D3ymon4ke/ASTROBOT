import {
  QUANTUM_ASSETS,
  QUANTUM_VERSION,
  calculateEMA,
  calculateATR,
  calculateRSI,
  analyzeQuantumTrend
} from './digitAnomaly.js';

export const QUANTUM_DEFAULTS = Object.freeze({
  enabled: false,
  symbols: ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_25', '1HZ25V'],
  stake: 1.0,
  multiplier: 2.1,
  maxGale: 1,
  cycleBudget: 25.0,
  minPayout: 0.85,
  minScore: 75,
  durationTicks: 5,
  virtualLossesRequired: 2, // Requires 2 consecutive virtual losses before opening trade
  sessionTarget: 5.00,
  cooldownMinutes: 30
});

export const DIGIT_DEFAULTS = QUANTUM_DEFAULTS;

export function validateDigitConfig(patch, previous = QUANTUM_DEFAULTS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw Error('Configuração do laboratório quântico inválida.');
  }
  const c = { ...previous, ...patch };
  if (
    typeof c.enabled !== 'boolean' ||
    !Array.isArray(c.symbols) ||
    !c.symbols.length ||
    c.symbols.length > 10 ||
    c.symbols.some(s => !QUANTUM_ASSETS.includes(s))
  ) {
    throw Error('Seleção de ativos inválida para o laboratório.');
  }
  c.symbols = [...new Set(c.symbols)];

  for (const [k, min, max] of [
    ['stake', 0.35, 100],
    ['multiplier', 1, 5],
    ['maxGale', 0, 2],
    ['cycleBudget', 0.35, 500],
    ['minPayout', 0.50, 1.20],
    ['minScore', 50, 95],
    ['durationTicks', 5, 60],
    ['virtualLossesRequired', 0, 5],
    ['sessionTarget', 0.05, 100],
    ['cooldownMinutes', 1, 360]
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
    this.candleCache = {}; // symbol -> [{ open, high, low, close, epoch }]
    this.virtualPipeline = {}; // symbol -> { losses: number, pending: object|null }
  }

  get state() {
    return this.session.modeStates[this.session.activeMode].digitLab ||= {
      config: { ...QUANTUM_DEFAULTS },
      version: QUANTUM_VERSION,
      status: 'Desligado',
      sessionProfit: 0,
      cooldownUntil: 0,
      matrix: {}, // symbol -> { trend, score, rsi, atr, lastUpdate, virtualLosses }
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
    const cooldownRemainingSec = s.cooldownUntil && s.cooldownUntil > Date.now()
      ? Math.ceil((s.cooldownUntil - Date.now()) / 1000)
      : 0;

    return {
      config: s.config,
      version: s.version,
      status: s.status,
      sessionProfit: s.sessionProfit || 0,
      cooldownUntil: s.cooldownUntil || 0,
      cooldownRemainingSec,
      matrix: Object.fromEntries(
        (s.config.symbols || []).map(sym => [
          sym,
          {
            ...(s.matrix?.[sym] || {}),
            virtualLosses: this.virtualPipeline[sym]?.losses || 0,
            virtualRequired: s.config.virtualLossesRequired || 2
          }
        ])
      ),
      pending: (s.pending || []).map(p => ({
        id: p.id,
        symbol: p.symbol,
        contractType: p.contractType,
        direction: p.direction,
        stage: p.stage,
        rule: p.rule,
        score: p.score,
        durationTicks: p.durationTicks || 5,
        phase: p.quote ? 'Aguardando 5 ticks de saída (Sniper)' : 'Cotando proposta'
      })),
      trades: (s.trades || []).slice(-1000),
      events: (s.events || []).slice(-30),
      simulationOnly: true
    };
  }

  save() {
    if (!this.destroyed) {
      this.session.loadedFromFile = true;
      this.session.saveToFile?.();
      this.session.syncToClients?.();
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

  reset() {
    const s = this.state;
    s.trades = [];
    s.events = [];
    s.pending = [];
    s.sessionProfit = 0;
    s.cooldownUntil = 0;
    this.candleCache = {};
    this.virtualPipeline = {};
    this.event('Laboratório Sniper resetado para início limpo.');
    this.save();
  }

  configure(patch) {
    const s = this.state;
    if (patch?.reset) {
      this.reset();
      return;
    }
    if ((s.pending.length || this.busy) && Object.keys(patch).some(k => k !== 'enabled')) {
      throw Error('Aguarde as simulações pendentes antes de alterar parâmetros.');
    }
    s.config = validateDigitConfig(patch, s.config);
    s.status = s.config.enabled ? 'Sniper Quântico ativo (Fakegale 2 Losses)' : 'Pausado';
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
    if (this.busy || this.destroyed || (!s.config.enabled && !s.pending.length) || Date.now() - this.lastPoll < 2000) return;
    if (!api.connected || !api.authorized) {
      s.status = 'Aguardando conexão Deriv';
      return;
    }

    // Cooldown check for micro-sessions
    if (s.cooldownUntil && s.cooldownUntil > Date.now()) {
      const remSec = Math.ceil((s.cooldownUntil - Date.now()) / 1000);
      const min = Math.floor(remSec / 60);
      const sec = remSec % 60;
      s.status = `Cooldown ativo (${min}m ${sec}s restantes) · Meta de $${s.config.sessionTarget.toFixed(2)} protegida`;
      return;
    } else if (s.cooldownUntil && s.cooldownUntil <= Date.now()) {
      s.cooldownUntil = 0;
      this.candleCache = {};
      this.virtualPipeline = {};
      this.event('Cooldown concluído. Retomando varredura quântica.');
    }

    this.busy = true;
    this.lastPoll = Date.now();
    const mode = this.session.activeMode;
    const valid = () => !this.destroyed && mode === this.session.activeMode;

    try {
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') {
        throw Error('Simulação requer propostas em USD.');
      }

      // Step 1: Process pending real simulated operations (5 Ticks Sniper)
      for (const p of [...s.pending]) {
        if (!valid()) return;

        if (p.quote) {
          // Check for contract expiry (5 ticks / ~10 seconds)
          if (Date.now() / 1000 < p.expiry + 1) continue;

          const { history } = await api.sendRequest({
            ticks_history: p.symbol,
            style: 'ticks',
            start: p.expiry - 2,
            end: p.expiry + 5,
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
              this.finish(p, 'Excluído: tick de saída sniper indisponível');
            }
            continue;
          }

          const exit = points[0];
          const entryPrice = p.quote.entry;
          const exitPrice = exit.price;
          const win = p.direction === 'CALL' ? (exitPrice > entryPrice) : (exitPrice < entryPrice);

          const profit = win ? (p.quote.payout - p.quote.stake) : -p.quote.stake;
          const row = {
            id: `${p.id}:${p.stage}`,
            timestamp: exit.epoch * 1000,
            symbol: p.symbol,
            contractType: p.direction === 'CALL' ? 'CALL' : 'PUT',
            direction: p.direction,
            stage: p.stage,
            rule: p.rule,
            score: p.score,
            durationTicks: p.durationTicks || 5,
            stake: p.quote.stake,
            payout: p.quote.payout,
            profit: Number(profit.toFixed(2)),
            entryPrice,
            exitPrice,
            version: QUANTUM_VERSION,
            execution: 'simulation',
            indicative: true
          };

          s.trades.push(row);
          s.trades = s.trades.slice(-2000);
          p.accumulatedProfit = (p.accumulatedProfit || 0) + row.profit;
          s.sessionProfit = Number(((s.sessionProfit || 0) + row.profit).toFixed(2));

          if (win) {
            this.finish(p, `🎯 Vitória Sniper ${p.direction} (${p.symbol}) · +$${row.profit.toFixed(2)}`);
            this.virtualPipeline[p.symbol] = { losses: 0, pending: null };

            // Micro-session profit target check
            if (s.sessionProfit >= s.config.sessionTarget) {
              s.cooldownUntil = Date.now() + s.config.cooldownMinutes * 60 * 1000;
              const lockedProfit = s.sessionProfit;
              s.sessionProfit = 0;
              this.candleCache = {};
              this.virtualPipeline = {};
              this.event(`🏆 Meta da micro-sessão batida (+${lockedProfit.toFixed(2)} USD)! Entrando em Cooldown de ${s.config.cooldownMinutes} min.`);
            }
            continue;
          } else {
            if (p.stage < s.config.maxGale) {
              p.stage++;
              p.quote = null;
              p.scheduled = Date.now() / 1000 + 1;
              this.event(`Loss no Sniper ${p.direction} (${p.symbol}). Preparando Gale ${p.stage} (recuperação 2.1x).`, p);
              continue;
            } else {
              this.finish(p, `Ciclo encerrado em loss no Gale ${p.stage} (${p.symbol})`);
              this.virtualPipeline[p.symbol] = { losses: 0, pending: null };
              continue;
            }
          }
        }

        if (!s.config.enabled) {
          this.finish(p, 'Interrompido pela pausa');
          continue;
        }

        // Request proposal for 5 ticks Sniper (Payout ~95%)
        const stake = Math.round(s.config.stake * (s.config.multiplier ** p.stage) * 100) / 100;
        if ((p.spent || 0) + stake > s.config.cycleBudget + 1e-9) {
          this.finish(p, 'Excluído: orçamento do ciclo excedido');
          continue;
        }

        const proposalReq = {
          proposal: 1,
          amount: stake,
          basis: 'stake',
          contract_type: p.direction === 'CALL' ? 'CALL' : 'PUT',
          currency: 'USD',
          underlying_symbol: p.symbol,
          duration: p.durationTicks || 5,
          duration_unit: 't'
        };

        const response = await api.sendRequest(proposalReq);
        if (!valid()) return;

        const q = response.proposal;
        const price = Number(q?.ask_price);
        const payout = Number(q?.payout);
        const entry = Number(q?.spot);
        const epoch = Number(q?.spot_time);

        if (!q?.id || ![price, payout, entry, epoch].every(Number.isFinite) || Math.abs(price - stake) > 0.01 || payout <= price) {
          this.finish(p, 'Excluído: proposta Sniper inválida ou rejeitada');
          continue;
        }

        p.spent = (p.spent || 0) + price;
        p.quote = { stake: price, payout, entry, epoch };
        p.expiry = epoch + (p.durationTicks || 5) * 2; // ~2s per tick
        this.event(`Entrada simulada Sniper 5 Ticks: ${p.direction} (Score: ${p.score}%, Stake: $${price}) em ${p.symbol}`, p);
      }

      // Step 2: Scan active symbols, evaluate Virtual Pipeline & Trigger Real Entries
      if (s.config.enabled && !s.pending.length && (!s.cooldownUntil || s.cooldownUntil <= Date.now())) {
        s.matrix ||= {};

        for (const symbol of s.config.symbols) {
          if (!valid() || !s.config.enabled || s.pending.length) break;

          this.virtualPipeline[symbol] ||= { losses: 0, pending: null };
          const vState = this.virtualPipeline[symbol];

          // 2.1: Settle existing virtual pending order for this symbol
          if (vState.pending) {
            if (Date.now() / 1000 >= vState.pending.expiryEpoch) {
              const { history } = await api.sendRequest({
                ticks_history: symbol,
                style: 'ticks',
                count: 5,
                end: 'latest'
              });
              if (!valid() || !s.config.enabled) break;

              const latestPrice = Number(history?.prices?.at(-1));
              if (Number.isFinite(latestPrice)) {
                const vWin = vState.pending.direction === 'CALL'
                  ? (latestPrice > vState.pending.entryPrice)
                  : (latestPrice < vState.pending.entryPrice);

                if (vWin) {
                  vState.losses = 0;
                  this.event(`Fakegale: Vitória virtual em ${symbol} (${vState.pending.direction}). Pipeline resetado.`);
                } else {
                  vState.losses++;
                  this.event(`Fakegale: Derrota virtual (${vState.losses}/${s.config.virtualLossesRequired}) em ${symbol}.`);
                }
                vState.pending = null;
              }
            } else {
              // Still waiting for virtual expiry
              continue;
            }
          }

          // 2.2: Scan M1 candles for new quantum setup
          const candlesResp = await api.sendRequest({
            ticks_history: symbol,
            style: 'candles',
            granularity: 60,
            end: 'latest',
            count: 60
          });
          if (!valid() || !s.config.enabled) break;

          const rawCandles = candlesResp?.candles || [];
          const candles = rawCandles.map(c => ({
            epoch: Number(c.epoch),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
          })).filter(c => Number.isFinite(c.epoch) && Number.isFinite(c.close));

          this.candleCache[symbol] = candles;

          const analysis = analyzeQuantumTrend(candles, symbol, { minCandles: 30 });

          s.matrix[symbol] = {
            trend: analysis.trend,
            score: analysis.score,
            signal: analysis.signal,
            direction: analysis.direction,
            rule: analysis.rule,
            rsi: analysis.indicators?.rsi ?? 50,
            atr: analysis.indicators?.atr ?? 0,
            currentPrice: analysis.indicators?.currentPrice ?? 0,
            lastUpdate: Date.now()
          };

          if (analysis.signal && analysis.score >= s.config.minScore) {
            const reqLosses = s.config.virtualLossesRequired ?? 2;

            if (vState.losses < reqLosses) {
              // Open Virtual Simulated Trade (Fakegale Filter)
              vState.pending = {
                entryPrice: analysis.indicators.currentPrice,
                direction: analysis.direction,
                rule: analysis.rule,
                expiryEpoch: Math.floor(Date.now() / 1000) + 10 // 10s (5 ticks)
              };
              this.event(`Fakegale: Testando gatilho virtual em ${symbol} (${analysis.direction} · ${analysis.rule}). Perdas acumuladas: ${vState.losses}/${reqLosses}`);
              continue;
            }

            // GATING SATISFIED: 2 Virtual Losses occurred! Execute Real Simulated Trade
            const id = `${mode}:${symbol}:${analysis.direction}:${Date.now()}`;
            s.pending.push({
              id,
              symbol,
              contractType: analysis.direction === 'CALL' ? 'CALL' : 'PUT',
              direction: analysis.direction,
              durationTicks: analysis.durationTicks || 5,
              stage: 0,
              rule: `${analysis.rule} (Fakegale 2L Gate)`,
              score: analysis.score,
              scheduled: Date.now() / 1000,
              accumulatedProfit: 0,
              quote: null
            });
            this.event(`🎯 SNIPER DISPARADO em ${symbol}: ${analysis.direction} após ${vState.losses} perdas virtuais!`, {
              symbol
            });
            break;
          }
        }
      }

      s.lastScan = Date.now();
      s.errors = 0;
      if (s.cooldownUntil && s.cooldownUntil > Date.now()) {
        const remSec = Math.ceil((s.cooldownUntil - Date.now()) / 1000);
        s.status = `Cooldown ativo (${Math.floor(remSec / 60)}m restantes) · Lucro protegido`;
      } else {
        s.status = s.config.enabled
          ? `Sniper Quântico ativo · Varrendo 6 ativos com Fakegale 2L`
          : s.pending.length ? 'Pausado · liquidando simulações' : 'Pausado';
      }

    } catch (err) {
      s.errors++;
      s.status = `Falha no Sniper Quântico: ${err.message}`;
      if (s.errors >= 5) {
        s.config.enabled = false;
        this.event('Laboratório Sniper pausado após falhas consecutivas');
      }
    } finally {
      this.busy = false;
      this.save();
    }
  }
}
