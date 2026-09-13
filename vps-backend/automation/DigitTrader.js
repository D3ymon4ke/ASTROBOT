import {
  QUANTUM_ASSETS,
  QUANTUM_VERSION,
  extractLastDigit,
  analyzeQuantumAsymmetricDigits,
  analyzeQuantumTrend
} from './digitAnomaly.js';

export const QUANTUM_DEFAULTS = Object.freeze({
  enabled: false,
  strategyMode: 'asymmetric_digits',
  symbols: ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_25', '1HZ25V'],
  stake: 1.0,
  sorosEnabled: false,
  cycleBudget: 15.0,
  minPayout: 0.20,
  minScore: 85,
  sessionTarget: 1.00,  // Fast scalp target ($1.00 USD)
  sessionStopLoss: 1.50, // Short session stop loss ($1.50 USD)
  cooldownMinutes: 10   // 10m pause to break market correlation
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
    ['cycleBudget', 0.35, 500],
    ['minPayout', 0.10, 2.00],
    ['minScore', 50, 99],
    ['sessionTarget', 0.05, 100],
    ['sessionStopLoss', 0.10, 100],
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
    this.tickCache = {};
    this.sorosStage = 0;
    this.lastWinProfit = 0;
    this.currentSessionTrades = [];
  }

  get state() {
    return this.session.modeStates[this.session.activeMode].digitLab ||= {
      config: { ...QUANTUM_DEFAULTS },
      version: QUANTUM_VERSION,
      status: 'Desligado',
      sessionProfit: 0,
      totalLockedProfit: 0,
      sessionsWon: 0,
      sessionsLost: 0,
      completedSessions: [], // Array of finished micro-sessions
      cooldownUntil: 0,
      sorosStage: 0,
      matrix: {},
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
      totalLockedProfit: s.totalLockedProfit || 0,
      sessionsWon: s.sessionsWon || 0,
      sessionsLost: s.sessionsLost || 0,
      completedSessions: (s.completedSessions || []).slice(-50),
      cooldownRemainingSec,
      sorosStage: this.sorosStage || 0,
      matrix: s.matrix || {},
      pending: (s.pending || []).map(p => ({
        id: p.id,
        symbol: p.symbol,
        contractType: p.contractType,
        barrier: p.barrier,
        score: p.score,
        stake: p.quote?.stake || p.stake,
        expectedWinRate: p.expectedWinRate,
        phase: p.quote ? 'Aguardando tick de desfecho' : 'Cotando proposta'
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
      contractType: meta.contractType
    });
    s.events = s.events.slice(-100);
  }

  reset() {
    const s = this.state;
    s.trades = [];
    s.events = [];
    s.pending = [];
    s.sessionProfit = 0;
    s.totalLockedProfit = 0;
    s.sessionsWon = 0;
    s.sessionsLost = 0;
    s.completedSessions = [];
    s.cooldownUntil = 0;
    this.sorosStage = 0;
    this.lastWinProfit = 0;
    this.currentSessionTrades = [];
    this.tickCache = {};
    this.event('Laboratório Quântico QAP-V3.2 resetado com novo histórico de micro-sessões.');
    this.save();
  }

  configure(patch) {
    const s = this.state;
    if (patch?.reset) {
      this.reset();
      return;
    }
    if ((s.pending.length || this.busy) && Object.keys(patch).some(k => k !== 'enabled')) {
      throw Error('Aguarde as operações em curso antes de alterar parâmetros.');
    }
    s.config = validateDigitConfig(patch, s.config);
    s.status = s.config.enabled ? `Micro-Sessões Ativas (Meta: +$${s.config.sessionTarget.toFixed(2)} / Stop: -$${s.config.sessionStopLoss.toFixed(2)})` : 'Pausado';
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
      s.status = `⏳ Cooldown Ativo (${min}m ${sec}s restantes) · Lucro Travado: $${(s.totalLockedProfit || 0).toFixed(2)}`;
      return;
    } else if (s.cooldownUntil && s.cooldownUntil <= Date.now()) {
      s.cooldownUntil = 0;
      this.tickCache = {};
      this.sorosStage = 0;
      this.lastWinProfit = 0;
      this.currentSessionTrades = [];
      this.event('Nova Micro-Sessão iniciada! Buscando meta curta de +' + s.config.sessionTarget.toFixed(2) + ' USD.');
    }

    this.busy = true;
    this.lastPoll = Date.now();
    const mode = this.session.activeMode;
    const valid = () => !this.destroyed && mode === this.session.activeMode;

    try {
      if (this.session.accountCurrency && this.session.accountCurrency !== 'USD') {
        throw Error('Simulação requer propostas em USD.');
      }

      // Step 1: Process pending simulated operations
      for (const p of [...s.pending]) {
        if (!valid()) return;

        if (p.quote) {
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
            if (Date.now() / 1000 - p.expiry > 25) {
              this.finish(p, 'Excluído: tick de desfecho indisponível');
            }
            continue;
          }

          const exit = points[0];
          const exitDigit = extractLastDigit(exit.price, p.symbol);
          let win = false;

          if (p.contractType === 'DIGITUNDER') {
            win = exitDigit < p.barrier;
          } else if (p.contractType === 'DIGITOVER') {
            win = exitDigit > p.barrier;
          } else if (p.contractType === 'DIGITDIFF') {
            win = exitDigit !== p.barrier;
          } else if (p.contractType === 'CALL') {
            win = exit.price > p.quote.entry;
          } else if (p.contractType === 'PUT') {
            win = exit.price < p.quote.entry;
          }

          const profit = win ? (p.quote.payout - p.quote.stake) : -p.quote.stake;
          const row = {
            id: `${p.id}:${p.stage}`,
            timestamp: exit.epoch * 1000,
            symbol: p.symbol,
            contractType: p.contractType,
            barrier: p.barrier,
            direction: p.contractType,
            stage: p.stage,
            rule: p.rule,
            score: p.score,
            expectedWinRate: p.expectedWinRate,
            stake: p.quote.stake,
            payout: p.quote.payout,
            profit: Number(profit.toFixed(2)),
            exitDigit,
            exitPrice: exit.price,
            version: QUANTUM_VERSION,
            execution: 'simulation',
            indicative: true
          };

          s.trades.push(row);
          s.trades = s.trades.slice(-2000);
          this.currentSessionTrades.push(row);
          s.sessionProfit = Number(((s.sessionProfit || 0) + row.profit).toFixed(2));

          if (win) {
            if (s.config.sorosEnabled && this.sorosStage === 0) {
              this.sorosStage = 1;
              this.lastWinProfit = row.profit;
              this.finish(p, `🎯 Vitória ${p.contractType} ${p.barrier ?? ''} (${p.symbol}) · +$${row.profit.toFixed(2)}`);
            } else {
              this.sorosStage = 0;
              this.lastWinProfit = 0;
              this.finish(p, `🎯 Vitória ${p.contractType} ${p.barrier ?? ''} (${p.symbol}) · +$${row.profit.toFixed(2)}`);
            }

            // MICRO-SESSION PROFIT TARGET HIT: Lock profit and start cooldown!
            if (s.sessionProfit >= s.config.sessionTarget) {
              s.cooldownUntil = Date.now() + s.config.cooldownMinutes * 60 * 1000;
              const lockedProfit = s.sessionProfit;
              s.totalLockedProfit = Number(((s.totalLockedProfit || 0) + lockedProfit).toFixed(2));
              s.sessionsWon = (s.sessionsWon || 0) + 1;

              s.completedSessions = s.completedSessions || [];
              s.completedSessions.push({
                id: `sess-${Date.now()}`,
                time: Date.now(),
                result: 'WIN',
                profit: lockedProfit,
                tradesCount: this.currentSessionTrades.length,
                wins: this.currentSessionTrades.filter(t => t.profit > 0).length,
                losses: this.currentSessionTrades.filter(t => t.profit < 0).length,
                accumulatedTotal: s.totalLockedProfit
              });
              s.completedSessions = s.completedSessions.slice(-100);

              s.sessionProfit = 0;
              this.currentSessionTrades = [];
              this.tickCache = {};
              this.sorosStage = 0;
              this.lastWinProfit = 0;
              this.event(`🏆 META DA MICRO-SESSÃO BATIDA (+${lockedProfit.toFixed(2)} USD)! Total Travado no Cofre: +$${s.totalLockedProfit.toFixed(2)} USD. Entrando em Cooldown de ${s.config.cooldownMinutes} min.`);
            }
            continue;
          } else {
            // Loss occurred
            this.sorosStage = 0;
            this.lastWinProfit = 0;
            this.finish(p, `Loss em ${p.contractType} (${p.symbol}) · Dígito ${exitDigit} · Saldo da sessão: ${s.sessionProfit > 0 ? '+' : ''}$${s.sessionProfit.toFixed(2)}`);

            // MICRO-SESSION STOP LOSS HIT: Protect capital and start cooldown!
            if (s.sessionProfit <= -s.config.sessionStopLoss) {
              s.cooldownUntil = Date.now() + s.config.cooldownMinutes * 60 * 1000;
              const lossAmt = Math.abs(s.sessionProfit);
              s.totalLockedProfit = Number(((s.totalLockedProfit || 0) - lossAmt).toFixed(2));
              s.sessionsLost = (s.sessionsLost || 0) + 1;

              s.completedSessions = s.completedSessions || [];
              s.completedSessions.push({
                id: `sess-${Date.now()}`,
                time: Date.now(),
                result: 'STOP',
                profit: -lossAmt,
                tradesCount: this.currentSessionTrades.length,
                wins: this.currentSessionTrades.filter(t => t.profit > 0).length,
                losses: this.currentSessionTrades.filter(t => t.profit < 0).length,
                accumulatedTotal: s.totalLockedProfit
              });
              s.completedSessions = s.completedSessions.slice(-100);

              s.sessionProfit = 0;
              this.currentSessionTrades = [];
              this.tickCache = {};
              this.sorosStage = 0;
              this.lastWinProfit = 0;
              this.event(`🛡️ STOP LOSS DE SESSÃO ATIVADO (-${lossAmt.toFixed(2)} USD). Protegendo banca de anomalias. Cooldown de ${s.config.cooldownMinutes} min.`);
            }
            continue;
          }
        }

        if (!s.config.enabled) {
          this.finish(p, 'Interrompido pela pausa');
          continue;
        }

        let currentStake = s.config.stake;
        if (s.config.sorosEnabled && this.sorosStage === 1 && this.lastWinProfit > 0) {
          currentStake = Math.round((s.config.stake + this.lastWinProfit) * 100) / 100;
        }

        if (currentStake > s.config.cycleBudget) {
          currentStake = s.config.stake;
          this.sorosStage = 0;
        }

        const proposalReq = {
          proposal: 1,
          amount: currentStake,
          basis: 'stake',
          contract_type: p.contractType,
          currency: 'USD',
          underlying_symbol: p.symbol,
          duration: 1,
          duration_unit: 't'
        };

        if (p.barrier != null) {
          proposalReq.barrier = String(p.barrier);
        }

        const response = await api.sendRequest(proposalReq);
        if (!valid()) return;

        const q = response.proposal;
        const price = Number(q?.ask_price);
        const payout = Number(q?.payout);
        const entry = Number(q?.spot);
        const epoch = Number(q?.spot_time);

        if (!q?.id || ![price, payout, entry, epoch].every(Number.isFinite) || Math.abs(price - currentStake) > 0.02 || payout <= price) {
          this.finish(p, 'Excluído: proposta com parâmetros rejeitados pela Deriv');
          continue;
        }

        p.quote = { stake: price, payout, entry, epoch };
        p.expiry = epoch + 2;
        this.event(`Entrada simulada ${p.contractType} ${p.barrier ?? ''} (Stake: $${price}, Payout: $${payout}) em ${p.symbol}`, p);
      }

      // Step 2: Scan active symbols for Asymmetric Setups
      if (s.config.enabled && !s.pending.length && (!s.cooldownUntil || s.cooldownUntil <= Date.now())) {
        s.matrix ||= {};

        for (const symbol of s.config.symbols) {
          if (!valid() || !s.config.enabled || s.pending.length) break;

          const ticksResp = await api.sendRequest({
            ticks_history: symbol,
            style: 'ticks',
            count: 100,
            end: 'latest'
          });
          if (!valid() || !s.config.enabled) break;

          const rawTicks = ticksResp?.history?.prices || [];
          const rawTimes = ticksResp?.history?.times || [];
          const ticks = rawTicks.map((p, i) => ({
            price: Number(p),
            epoch: Number(rawTimes[i])
          })).filter(t => Number.isFinite(t.price));

          this.tickCache[symbol] = ticks;

          const analysis = analyzeQuantumAsymmetricDigits(ticks, symbol, { minScore: s.config.minScore });

          s.matrix[symbol] = {
            contractType: analysis.contractType,
            barrier: analysis.barrier,
            score: analysis.score,
            expectedWinRate: analysis.expectedWinRate,
            rule: analysis.rule,
            counts: analysis.counts,
            percentages: analysis.percentages,
            coldDigit: analysis.coldDigit,
            hotDigit: analysis.hotDigit,
            lastDigit: analysis.lastDigit,
            sampleSize: analysis.sampleSize,
            lastUpdate: Date.now()
          };

          if (analysis.signal && analysis.score >= s.config.minScore) {
            const id = `${mode}:${symbol}:${analysis.contractType}:${Date.now()}`;
            s.pending.push({
              id,
              symbol,
              contractType: analysis.contractType,
              barrier: analysis.barrier,
              score: analysis.score,
              expectedWinRate: analysis.expectedWinRate,
              rule: analysis.rule,
              stage: this.sorosStage,
              quote: null,
              createdAt: Date.now()
            });
            this.event(`🎯 OPORTUNIDADE ASSIMÉTRICA em ${symbol}: ${analysis.contractType} ${analysis.barrier ?? ''} (Probabilidade: ${analysis.expectedWinRate}%)`, { symbol, contractType: analysis.contractType });
            break;
          }
        }
      }

      s.lastScan = Date.now();
      s.errors = 0;
      s.status = s.config.enabled
        ? `Micro-Sessões Ativas · Meta: +$${s.config.sessionTarget.toFixed(2)} (Sessões Vencidas: ${s.sessionsWon || 0} / Perdidas: ${s.sessionsLost || 0})`
        : s.pending.length ? 'Pausado · Finalizando operações' : 'Pausado';

    } catch (e) {
      s.errors = (s.errors || 0) + 1;
      s.status = `Falha na varredura: ${e.message}`;
      if (s.errors >= 5) {
        s.config.enabled = false;
        this.event('Laboratório pausado automaticamente após falhas repetidas.');
      }
    } finally {
      this.busy = false;
      this.save();
    }
  }
}
