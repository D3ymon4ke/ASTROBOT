import {
  DIGIT_ASSETS,
  DIGIT_VERSION,
  extractLastDigit,
  analyzeDigitDistribution,
  detectDigitAnomalySignal
} from './digitAnomaly.js';

export const DIGIT_DEFAULTS = Object.freeze({
  enabled: false,
  symbols: ['R_100', '1HZ50V'],
  stake: 1.0,
  multiplier: 11.0, // Standard recovery multiplier for ~9.5% payout DIGITDIFF
  maxGale: 1,
  cycleBudget: 25.0,
  minPayout: 0.08,
  windowSize: 60,
  minSamples: 30,
  sessionTarget: 2.50, // Profit target per micro-session in USD
  cooldownMinutes: 45, // Cooldown in minutes after hitting sessionTarget
  enableRotation: true, // Multi-modality rotation (DIFF, UNDER, OVER, EVEN, ODD)
  enableFakegaleLoss: true, // Post-loss cluster break filter (fakegale virtual tick)
  warmupTicksRequired: 30 // Fresh ticks required before opening trades after warmup/cooldown
});

export function validateDigitConfig(patch, previous = DIGIT_DEFAULTS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw Error('Configuração do laboratório de dígitos inválida.');
  }
  const c = { ...previous, ...patch };
  if (
    typeof c.enabled !== 'boolean' ||
    !Array.isArray(c.symbols) ||
    !c.symbols.length ||
    c.symbols.length > 5 ||
    c.symbols.some(s => !DIGIT_ASSETS.includes(s))
  ) {
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
    ['minSamples', 10, 100],
    ['sessionTarget', 0.05, 100],
    ['cooldownMinutes', 1, 360],
    ['warmupTicksRequired', 10, 100]
  ]) {
    c[k] = Number(c[k]);
    if (!Number.isFinite(c[k]) || c[k] < min || c[k] > max) {
      throw Error(`Valor inválido para o parâmetro: ${k}`);
    }
  }

  if (typeof c.enableRotation !== 'boolean') {
    c.enableRotation = Boolean(c.enableRotation);
  }
  if (typeof c.enableFakegaleLoss !== 'boolean') {
    c.enableFakegaleLoss = Boolean(c.enableFakegaleLoss);
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
      sessionProfit: 0,
      cooldownUntil: 0,
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
      pending: (s.pending || []).map(p => ({
        id: p.id,
        symbol: p.symbol,
        contractType: p.contractType,
        targetDigit: p.targetDigit,
        barrier: p.barrier,
        stage: p.stage,
        rule: p.rule,
        score: p.score,
        waitingClusterBreak: Boolean(p.waitingClusterBreak),
        phase: p.waitingClusterBreak
          ? 'Filtro Fakegale: aguardando dispersão'
          : p.quote
          ? 'Aguardando tick de saída'
          : 'Cotando proposta'
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

  evaluateWin(contractType, targetDigit, barrier, exitDigit) {
    if (exitDigit === null) return false;
    switch (contractType) {
      case 'DIGITDIFF':
        return exitDigit !== targetDigit;
      case 'DIGITUNDER':
        return exitDigit < Number(barrier);
      case 'DIGITOVER':
        return exitDigit > Number(barrier);
      case 'DIGITEVEN':
        return exitDigit % 2 === 0;
      case 'DIGITODD':
        return exitDigit % 2 !== 0;
      default:
        return exitDigit !== targetDigit;
    }
  }

  async tick() {
    const s = this.state, api = this.session.derivAPI;
    if (this.busy || this.destroyed || (!s.config.enabled && !s.pending.length) || Date.now() - this.lastPoll < 3000) return;
    if (!api.connected || !api.authorized) {
      s.status = 'Aguardando conexão Deriv';
      return;
    }

    // Cooldown check for micro-sessions
    if (s.cooldownUntil && s.cooldownUntil > Date.now()) {
      const remSec = Math.ceil((s.cooldownUntil - Date.now()) / 1000);
      const min = Math.floor(remSec / 60);
      const sec = remSec % 60;
      s.status = `Cooldown ativo (${min}m ${sec}s restantes) · Meta de sessão protegida`;
      return;
    } else if (s.cooldownUntil && s.cooldownUntil <= Date.now()) {
      // Cooldown just finished
      s.cooldownUntil = 0;
      this.tickCache = {};
      this.event(`Cooldown concluído. Iniciando aquecimento limpo (${s.config.warmupTicksRequired} ticks).`);
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

        // Check Fakegale cluster break filter
        if (p.waitingClusterBreak) {
          const { history } = await api.sendRequest({
            ticks_history: p.symbol,
            style: 'ticks',
            end: 'latest',
            count: 5
          });
          if (!valid()) return;

          const recentPrices = history?.prices || [];
          const lastPrice = recentPrices.at(-1);
          const currentDigit = extractLastDigit(lastPrice, p.symbol);

          if (currentDigit !== null && currentDigit !== p.lossDigit) {
            p.waitingClusterBreak = false;
            this.event(`Filtro Fakegale: cluster no dígito ${p.lossDigit} dispersado (tick atual: ${currentDigit}). Prosseguindo com Gale ${p.stage}.`, p);
          } else {
            // Still in cluster or awaiting tick
            continue;
          }
        }

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
          const win = this.evaluateWin(p.contractType, p.targetDigit, p.barrier, exitDigit);

          const profit = win ? (p.quote.payout - p.quote.stake) : -p.quote.stake;
          const row = {
            id: `${p.id}:${p.stage}`,
            timestamp: exit.epoch * 1000,
            symbol: p.symbol,
            contractType: p.contractType,
            targetDigit: p.targetDigit,
            barrier: p.barrier,
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
          s.sessionProfit = Number(((s.sessionProfit || 0) + row.profit).toFixed(2));

          if (win) {
            this.finish(p, `Vitória em ${p.contractType} (${p.rule}) (saída: ${exitDigit}) · +$${row.profit.toFixed(2)}`);

            // Micro-session profit target check
            if (s.sessionProfit >= s.config.sessionTarget) {
              s.cooldownUntil = Date.now() + s.config.cooldownMinutes * 60 * 1000;
              const lockedProfit = s.sessionProfit;
              s.sessionProfit = 0;
              this.tickCache = {};
              this.event(`🎯 Meta da micro-sessão batida (+${lockedProfit.toFixed(2)} USD)! Cooldown de ${s.config.cooldownMinutes} min ativado.`);
            }
            continue;
          } else {
            // Loss occurred
            if (p.stage < s.config.maxGale) {
              p.stage++;
              p.quote = null;
              p.scheduled = Date.now() / 1000 + 1;
              p.lossDigit = exitDigit;

              if (s.config.enableFakegaleLoss) {
                p.waitingClusterBreak = true;
                this.event(`Loss no ${p.contractType} (${exitDigit}). Filtro Fakegale ativado: aguardando dispersão do cluster antes do Gale ${p.stage}.`, p);
              } else {
                this.event(`Loss no ${p.contractType} (${exitDigit}). Preparando Gale ${p.stage}.`, p);
              }
              continue;
            } else {
              this.finish(p, `Ciclo encerrado em loss no Gale ${p.stage} (${p.contractType} · saída: ${exitDigit})`);
              continue;
            }
          }
        }

        if (!s.config.enabled) {
          this.finish(p, 'Interrompido pela pausa');
          continue;
        }

        // Request proposal for next stage
        const galeMultiplier = p.contractType === 'DIGITDIFF' ? s.config.multiplier : 2.1;
        const stake = Math.round(s.config.stake * (galeMultiplier ** p.stage) * 100) / 100;
        if ((p.spent || 0) + stake > s.config.cycleBudget + 1e-9) {
          this.finish(p, 'Excluído: orçamento do ciclo de dígitos excedido');
          continue;
        }

        const proposalReq = {
          proposal: 1,
          amount: stake,
          basis: 'stake',
          contract_type: p.contractType,
          currency: 'USD',
          underlying_symbol: p.symbol,
          duration: 1,
          duration_unit: 't'
        };

        if (p.contractType === 'DIGITDIFF') {
          proposalReq.barrier = String(p.targetDigit);
        } else if (p.contractType === 'DIGITUNDER' || p.contractType === 'DIGITOVER') {
          proposalReq.barrier = String(p.barrier);
        }

        const response = await api.sendRequest(proposalReq);
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
        this.event(`Entrada simulada ${p.contractType} (Alvo: ${p.barrier ?? p.targetDigit ?? 'Paridade'}, Stake: $${price})`, p);
      }

      // Step 2: Scan active symbols for new tick anomalies (only if not in cooldown)
      if (s.config.enabled && !s.pending.length && (!s.cooldownUntil || s.cooldownUntil <= Date.now())) {
        for (const symbol of s.config.symbols) {
          if (!valid() || !s.config.enabled || s.pending.length) break;

          const { history } = await api.sendRequest({
            ticks_history: symbol,
            style: 'ticks',
            end: 'latest',
            count: s.config.windowSize || 60
          });
          if (!valid() || !s.config.enabled) break;

          const ticks = (history?.times || []).map((epoch, i) => ({
            epoch: Number(epoch),
            price: Number(history.prices?.[i])
          })).filter(t => Number.isFinite(t.epoch) && Number.isFinite(t.price));

          this.tickCache[symbol] = ticks;

          // Warmup check: require at least warmupTicksRequired clean ticks
          if (ticks.length < (s.config.warmupTicksRequired || 30)) {
            continue;
          }

          const anomaly = detectDigitAnomalySignal(ticks, symbol, {
            windowSize: s.config.windowSize,
            minSamples: s.config.minSamples,
            enableRotation: s.config.enableRotation
          });

          if (anomaly.signal) {
            const id = `${mode}:${symbol}:${anomaly.contractType}:${Date.now()}`;
            s.pending.push({
              id,
              symbol,
              contractType: anomaly.contractType,
              targetDigit: anomaly.targetDigit,
              barrier: anomaly.barrier,
              stage: 0,
              rule: anomaly.rule,
              score: anomaly.score,
              scheduled: Date.now() / 1000,
              accumulatedProfit: 0,
              quote: null,
              waitingClusterBreak: false
            });
            this.event(`Anomalia detectada em ${symbol}: ${anomaly.contractType} (${anomaly.rule})`, {
              symbol,
              targetDigit: anomaly.targetDigit
            });
          }
        }
      }

      s.lastScan = Date.now();
      s.errors = 0;
      if (s.cooldownUntil && s.cooldownUntil > Date.now()) {
        const remSec = Math.ceil((s.cooldownUntil - Date.now()) / 1000);
        s.status = `Cooldown ativo (${Math.floor(remSec / 60)}m restantes) · Lucro da sessão protegido`;
      } else {
        s.status = s.config.enabled
          ? `Monitorando dígitos em ${s.config.symbols.join(', ')} · QD-Matrix V2`
          : s.pending.length ? 'Pausado · liquidando simulações pendentes' : 'Pausado';
      }

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
