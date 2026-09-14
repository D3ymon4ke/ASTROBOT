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
  symbols: ['R_75', '1HZ75V', '1HZ25V'], // Verified profitable trio
  stake: 1.0,
  multiplier: 2.4,       // 2.4x Gale 1 recovery on ~42% payout
  maxGale: 1,            // Strict 1 level of Gale only (80.9% historical success)
  cycleBudget: 15.0,
  minPayout: 0.20,
  minScore: 88,          // Elevado para 88 (maior seletividade contra ruídos)
  sessionTarget: 1.00,   // Fast scalp target ($1.00 USD)
  sessionStopLoss: 3.40, // 1 loss ($1.00) + 1 Gale loss ($2.40)
  cooldownMinutes: 10,   // 10m cooldown on win
  stopCooldownMinutes: 20, // 20m cooldown on stop for market decompression
  vaultDailyTarget: 3.00,  // Meta diária consolidada do cofre ($3.00 USD)
  maxDailyStops: 2,        // Disjuntor: máximo 2 stops diários antes de desligar
  trailingProfitLock: 0.70 // Trava lucro se atingir >= 70% da meta e houver recuo
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
    ['multiplier', 1.0, 5.0],
    ['maxGale', 0, 2],
    ['cycleBudget', 0.35, 500],
    ['minPayout', 0.10, 2.00],
    ['minScore', 50, 99],
    ['sessionTarget', 0.05, 100],
    ['sessionStopLoss', 0.10, 100],
    ['cooldownMinutes', 1, 360],
    ['stopCooldownMinutes', 1, 360],
    ['vaultDailyTarget', 0.20, 500],
    ['maxDailyStops', 1, 10],
    ['trailingProfitLock', 0.10, 0.95]
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
      completedSessions: [],
      cooldownUntil: 0,
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
      matrix: s.matrix || {},
      pending: (s.pending || []).map(p => ({
        id: p.id,
        symbol: p.symbol,
        contractType: p.contractType,
        barrier: p.barrier,
        score: p.score,
        stage: p.stage || 0,
        stake: p.quote?.stake || p.stake,
        expectedWinRate: p.expectedWinRate,
        phase: p.quote ? (p.stage > 0 ? 'Gale 1 (2.4x) em andamento' : 'Aguardando tick de desfecho') : 'Cotando proposta'
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
    this.currentSessionTrades = [];
    this.tickCache = {};
    this.event('Laboratório Quântico QAP-V4 resetado com Modelo B (Gale 1 2.4x nos Ativos Vencedores).');
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
    s.status = s.config.enabled ? `QAP-V4 Ativo · Meta: +$${s.config.sessionTarget.toFixed(2)} (Gale 1: ${s.config.multiplier}x nos Ativos Vencedores)` : 'Pausado';
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
      s.status = `⏳ Cooldown Ativo (${min}m ${sec}s restantes) · Saldo no Cofre: $${(s.totalLockedProfit || 0).toFixed(2)}`;
      return;
    } else if (s.cooldownUntil && s.cooldownUntil <= Date.now()) {
      s.cooldownUntil = 0;
      this.tickCache = {};
      this.currentSessionTrades = [];
      this.event(`Nova Micro-Sessão iniciada! Buscando meta de +$${s.config.sessionTarget.toFixed(2)} USD nos ativos vencedores.`);
    }

    // Macro Vault Circuit Breakers
    if (s.config.vaultDailyTarget && s.totalLockedProfit >= s.config.vaultDailyTarget) {
      s.status = `🏆 META DIÁRIA DO COFRE ATINGIDA (+$${s.totalLockedProfit.toFixed(2)} USD) · Robô Desarmado`;
      if (s.config.enabled) {
        s.config.enabled = false;
        this.event(`🏆 META DIÁRIA DO COFRE ALCANÇADA: Saldo de +$${s.totalLockedProfit.toFixed(2)} USD atingiu a meta diária de $${s.config.vaultDailyTarget.toFixed(2)} USD. Lucros travados no cofre!`);
        this.save();
      }
      return;
    }

    if (s.config.maxDailyStops && s.sessionsLost >= s.config.maxDailyStops) {
      s.status = `🛑 DISJUNTOR ACIONADO: Limite de ${s.sessionsLost}/${s.config.maxDailyStops} Stops Atingido · Desarmado`;
      if (s.config.enabled) {
        s.config.enabled = false;
        this.event(`🛑 DISJUNTOR DE CAPITAL ACIONADO: ${s.sessionsLost} stops de sessão atingidos hoje. Robô pausado preventivamente.`);
        this.save();
      }
      return;
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
            this.finish(p, `🎯 Vitória ${p.contractType} ${p.barrier ?? ''} (${p.symbol}) · +$${row.profit.toFixed(2)}${p.stage > 0 ? ' (Gale 1 Recuperado!)' : ''}`);

            // TARGET HIT: Lock profit and start cooldown!
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
              this.event(`🏆 META DA MICRO-SESSÃO BATIDA (+${lockedProfit.toFixed(2)} USD)! Total no Cofre: +$${s.totalLockedProfit.toFixed(2)} USD. Cooldown de ${s.config.cooldownMinutes} min.`);
            }
            continue;
          } else {
            // Loss occurred
            // Trailing Profit Lock Check:
            // Se a sessão já construiu lucro expressivo (>= 70% da meta) e após a perda ainda estiver no verde (> 0),
            // encerramos imediatamente com vitória protegida, evitando disparar Gale 1 e correr risco de stop!
            const lockThreshold = (s.config.sessionTarget || 1.0) * (s.config.trailingProfitLock || 0.70);
            const peakWinsProfit = this.currentSessionTrades.reduce((acc, t) => acc + (t.profit > 0 ? t.profit : 0), 0);

            if (s.sessionProfit > 0 && peakWinsProfit >= lockThreshold) {
              const lockedProfit = s.sessionProfit;
              this.finish(p, `🛡️ Lucro Protegido (Trailing Lock): Sessão finalizada com +$${lockedProfit.toFixed(2)} USD para evitar Gale arriscado.`);
              s.cooldownUntil = Date.now() + (s.config.cooldownMinutes || 10) * 60 * 1000;
              s.totalLockedProfit = Number(((s.totalLockedProfit || 0) + lockedProfit).toFixed(2));
              s.sessionsWon = (s.sessionsWon || 0) + 1;

              s.completedSessions = s.completedSessions || [];
              s.completedSessions.push({
                id: `sess-${Date.now()}`,
                time: Date.now(),
                result: 'WIN_PROTECTED',
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
              this.event(`🏆 MICRO-SESSÃO PROTEGIDA (+${lockedProfit.toFixed(2)} USD)! Total no Cofre: $${s.totalLockedProfit.toFixed(2)} USD. Cooldown de ${s.config.cooldownMinutes} min.`);
              this.save();
              continue;
            }

            if (p.stage < s.config.maxGale) {
              // Prepare Gale 1 with multiplier (2.4x)
              p.stage++;
              p.quote = null;
              p.scheduled = Date.now() / 1000 + 1;
              this.event(`Loss em ${p.contractType} (${p.symbol}) · Preparando Gale 1 (${s.config.multiplier}x = $${(s.config.stake * s.config.multiplier).toFixed(2)}) para recuperação imediata`, p);
              continue;
            } else {
              // Gale 1 failed: End cycle in Stop Loss!
              this.finish(p, `Gale 1 encerrado em loss (${p.symbol}) · Saldo da sessão: ${s.sessionProfit > 0 ? '+' : ''}$${s.sessionProfit.toFixed(2)}`);

              // STOP LOSS TRIGGERED: Lock loss and enter extended cooldown
              if (s.sessionProfit <= -s.config.sessionStopLoss || p.stage >= s.config.maxGale) {
                const lastSession = s.completedSessions?.[s.completedSessions.length - 1];
                const isConsecutiveStop = lastSession && (lastSession.result === 'STOP' || lastSession.profit < 0);
                const basePause = s.config.stopCooldownMinutes || 20;
                const pauseMin = isConsecutiveStop ? Math.min(Math.round(basePause * 2.25), 60) : basePause;

                s.cooldownUntil = Date.now() + pauseMin * 60 * 1000;
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
                this.event(`🛡️ STOP LOSS DE SESSÃO (-${lossAmt.toFixed(2)} USD). Pausa adaptativa de ${pauseMin} min${isConsecutiveStop ? ' (Stops Consecutivos - Cooldown Prolongado)' : ''} para descompressão.`);
              }
              continue;
            }
          }
        }

        if (!s.config.enabled) {
          this.finish(p, 'Interrompido pela pausa');
          continue;
        }

        // Calculate Stake with Gale 1 (2.4x)
        const currentStake = p.stage > 0
          ? Math.round(s.config.stake * s.config.multiplier * 100) / 100
          : s.config.stake;

        if (currentStake > s.config.cycleBudget) {
          this.finish(p, 'Excluído: orçamento do ciclo excedido');
          continue;
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
        this.event(`Entrada simulada ${p.contractType} ${p.barrier ?? ''}${p.stage > 0 ? ' [Gale 1]' : ''} (Stake: $${price}, Payout: $${payout}) em ${p.symbol}`, p);
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
              stage: 0,
              quote: null,
              createdAt: Date.now()
            });
            this.event(`🎯 OPORTUNIDADE ASSIMÉTRICA em ${symbol}: ${analysis.contractType} ${analysis.barrier ?? ''} (~42% Payout · ${analysis.expectedWinRate}% Win Rate)`, { symbol, contractType: analysis.contractType });
            break;
          }
        }
      }

      s.lastScan = Date.now();
      s.errors = 0;
      s.status = s.config.enabled
        ? `QAP-V4 Ativo · Trio Vencedor (${s.config.symbols.join(', ')}) · Meta: +$${s.config.sessionTarget.toFixed(2)} (Sessões Vencidas: ${s.sessionsWon || 0} / Stops: ${s.sessionsLost || 0})`
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
