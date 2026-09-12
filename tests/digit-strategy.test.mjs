import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLastDigit,
  calculateEntropy,
  analyzeDigitDistribution,
  detectDigitAnomalySignal,
  DIGIT_ASSETS
} from '../vps-backend/automation/digitAnomaly.js';
import {
  DigitTrader,
  validateDigitConfig,
  DIGIT_DEFAULTS
} from '../vps-backend/automation/DigitTrader.js';

test('digit extraction accurately parses last digits for all synthetic assets', () => {
  // R_100 has 2 decimals
  assert.equal(extractLastDigit(1234.56, 'R_100'), 6);
  assert.equal(extractLastDigit(1234.50, 'R_100'), 0);
  assert.equal(extractLastDigit(100.0, 'R_100'), 0);

  // 1HZ50V has 4 decimals
  assert.equal(extractLastDigit(543.2109, '1HZ50V'), 9);
  assert.equal(extractLastDigit(543.2100, '1HZ50V'), 0);

  // R_10 has 3 decimals
  assert.equal(extractLastDigit(789.123, 'R_10'), 3);
  assert.equal(extractLastDigit(789.120, 'R_10'), 0);

  // Invalid or null prices
  assert.equal(extractLastDigit(null, 'R_100'), null);
  assert.equal(extractLastDigit(NaN, 'R_100'), null);
  assert.equal(extractLastDigit(undefined, 'R_100'), null);
});

test('calculateEntropy computes normalized Shannon entropy correctly', () => {
  // Perfect uniform distribution (10 of each digit) -> entropy ~ 1.0
  const uniformCounts = Array(10).fill(10);
  const uniformH = calculateEntropy(uniformCounts, 100);
  assert.equal(uniformH, 1.0);

  // Zero/empty counts
  assert.equal(calculateEntropy([], 0), 1.0);

  // Complete concentration in 1 digit -> entropy = 0.0
  const biasedCounts = [100, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const biasedH = calculateEntropy(biasedCounts, 100);
  assert.equal(biasedH, 0.0);
});

test('digit distribution computes uniform frequencies and chi-square statistics', () => {
  const ticks = [];
  for (let i = 0; i < 100; i++) {
    const digit = i % 10;
    ticks.push({ price: 1000.00 + digit * 0.01, epoch: 1000 + i });
  }

  const result = analyzeDigitDistribution(ticks, 'R_100', 100);
  assert.equal(result.sampleSize, 100);
  for (let d = 0; d < 10; d++) {
    assert.equal(result.counts[d], 10);
    assert.equal(result.percentages[d], 10.0);
  }
  assert.equal(result.chiSquare, 0.0);
  assert.equal(result.entropy, 1.0);
});

test('anomaly detector identifies double-hit repetition and suppresses triple-hits', () => {
  const ticks = [];
  for (let i = 0; i < 30; i++) {
    ticks.push({ price: 1000.00 + (i % 10) * 0.01, epoch: 1000 + i });
  }

  // Double repetition of digit 7
  ticks.push({ price: 1000.07, epoch: 1031 });
  ticks.push({ price: 1000.17, epoch: 1032 });

  const signal = detectDigitAnomalySignal(ticks, 'R_100', { minSamples: 20, windowSize: 50 });
  assert.equal(signal.signal, true);
  assert.equal(signal.contractType, 'DIGITDIFF');
  assert.equal(signal.targetDigit, 7);
  assert.equal(signal.rule, 'double_repeat_exhaustion');
  assert.ok(signal.score >= 80);

  // 3rd repetition of digit 7 -> should suppress
  ticks.push({ price: 1000.27, epoch: 1033 });
  const suppressed = detectDigitAnomalySignal(ticks, 'R_100', { minSamples: 20, windowSize: 50 });
  assert.equal(suppressed.signal, false);
  assert.ok(suppressed.reason.includes('já repetiu 3x consecutivas'));
});

test('anomaly detector identifies multi-modality signals (UNDER, OVER, PARITY)', () => {
  const baselineTicks = [];
  for (let i = 0; i < 30; i++) {
    baselineTicks.push({ price: 1000.00 + (i % 10) * 0.01, epoch: 1000 + i });
  }

  // 1. High cluster -> Directional UNDER 7
  const underTicks = [...baselineTicks];
  underTicks.push({ price: 1000.07, epoch: 1031 });
  underTicks.push({ price: 1000.08, epoch: 1032 });
  underTicks.push({ price: 1000.09, epoch: 1033 });
  underTicks.push({ price: 1000.07, epoch: 1034 });
  underTicks.push({ price: 1000.08, epoch: 1035 });

  const underSignal = detectDigitAnomalySignal(underTicks, 'R_100', { minSamples: 20, windowSize: 50, enableRotation: true });
  assert.equal(underSignal.signal, true);
  assert.equal(underSignal.contractType, 'DIGITUNDER');
  assert.equal(underSignal.barrier, '7');
  assert.equal(underSignal.rule, 'directional_under');

  // 2. Low cluster -> Directional OVER 2
  const overTicks = [...baselineTicks];
  overTicks.push({ price: 1000.00, epoch: 1031 });
  overTicks.push({ price: 1000.01, epoch: 1032 });
  overTicks.push({ price: 1000.02, epoch: 1033 });
  overTicks.push({ price: 1000.01, epoch: 1034 });
  overTicks.push({ price: 1000.00, epoch: 1035 });

  const overSignal = detectDigitAnomalySignal(overTicks, 'R_100', { minSamples: 20, windowSize: 50, enableRotation: true });
  assert.equal(overSignal.signal, true);
  assert.equal(overSignal.contractType, 'DIGITOVER');
  assert.equal(overSignal.barrier, '2');
  assert.equal(overSignal.rule, 'directional_over');

  // 3. Parity Reversion (5 even digits -> DIGITODD)
  const evenTicks = [...baselineTicks];
  evenTicks.push({ price: 1000.02, epoch: 1031 });
  evenTicks.push({ price: 1000.04, epoch: 1032 });
  evenTicks.push({ price: 1000.08, epoch: 1033 });
  evenTicks.push({ price: 1000.06, epoch: 1034 });
  evenTicks.push({ price: 1000.04, epoch: 1035 });

  const paritySignal = detectDigitAnomalySignal(evenTicks, 'R_100', { minSamples: 20, windowSize: 50, enableRotation: true });
  assert.equal(paritySignal.signal, true);
  assert.equal(paritySignal.contractType, 'DIGITODD');
  assert.equal(paritySignal.rule, 'parity_reversion');
});

test('validateDigitConfig validates QD-Matrix V2 parameters', () => {
  assert.throws(() => validateDigitConfig(null), /inválida/);
  assert.throws(() => validateDigitConfig({ sessionTarget: 0.01 }), /sessionTarget/);
  assert.throws(() => validateDigitConfig({ cooldownMinutes: 0 }), /cooldownMinutes/);
  assert.throws(() => validateDigitConfig({ warmupTicksRequired: 5 }), /warmupTicksRequired/);

  const valid = validateDigitConfig({
    enabled: true,
    stake: 1.0,
    multiplier: 11.0,
    maxGale: 1,
    cycleBudget: 25.0,
    sessionTarget: 3.00,
    cooldownMinutes: 30,
    enableRotation: true,
    enableFakegaleLoss: true,
    warmupTicksRequired: 30,
    symbols: ['R_100', '1HZ50V']
  });

  assert.equal(valid.enabled, true);
  assert.equal(valid.sessionTarget, 3.00);
  assert.equal(valid.cooldownMinutes, 30);
  assert.equal(valid.enableRotation, true);
  assert.equal(valid.enableFakegaleLoss, true);
  assert.equal(valid.warmupTicksRequired, 30);
});

test('DigitTrader locks profit upon hitting micro-session target and triggers cooldown', async () => {
  const session = {
    activeMode: 'demo',
    modeStates: { demo: {}, real: {} },
    accountCurrency: 'USD',
    balance: 100.0,
    saveToFile: () => {},
    syncToClients: () => {},
    connectDeriv: () => {},
    derivAPI: {
      connected: true,
      authorized: true,
      sendRequest: async (req) => {
        if (req.proposal) {
          return {
            proposal: {
              id: 'prop-v2',
              ask_price: req.amount,
              payout: req.amount * 1.095,
              spot: 1234.56,
              spot_time: Math.floor(Date.now() / 1000)
            }
          };
        }
        if (req.ticks_history) {
          const times = [], prices = [];
          for (let i = 0; i < 30; i++) {
            times.push(1000 + i);
            prices.push(1000.00 + (i % 10) * 0.01);
          }
          times.push(1030);
          prices.push(1000.04);
          times.push(1031);
          prices.push(1000.14); // Double 4
          return { history: { times, prices } };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(session);
  trader.configure({
    enabled: true,
    stake: 1.0,
    sessionTarget: 0.05, // Low target so 1 win locks the session
    cooldownMinutes: 30,
    symbols: ['R_100']
  });

  // Step 1: Scan and detect
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending.length, 1);

  // Step 2: Quote
  trader.lastPoll = 0;
  await trader.tick();
  assert.ok(trader.state.pending[0].quote);

  // Step 3: Exit win (dígito 8 !== 4)
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history) {
      return { history: { times: [trader.state.pending[0].expiry], prices: [1234.58] } };
    }
    return {};
  };

  await trader.tick();
  assert.equal(trader.state.trades.length, 1);
  assert.ok(trader.state.trades[0].profit > 0);
  // Cooldown should be active now!
  assert.ok(trader.state.cooldownUntil > Date.now());
  const snap = trader.snapshot();
  assert.ok(snap.cooldownRemainingSec > 0);
});

test('DigitTrader Post-Loss Fakegale holds Gale until cluster breaks', async () => {
  const session = {
    activeMode: 'demo',
    modeStates: { demo: {}, real: {} },
    accountCurrency: 'USD',
    balance: 100.0,
    saveToFile: () => {},
    syncToClients: () => {},
    connectDeriv: () => {},
    derivAPI: {
      connected: true,
      authorized: true,
      sendRequest: async (req) => {
        if (req.proposal) {
          return {
            proposal: {
              id: 'prop-gale',
              ask_price: req.amount,
              payout: req.amount * 1.095,
              spot: 1234.56,
              spot_time: Math.floor(Date.now() / 1000)
            }
          };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(session);
  trader.configure({
    enabled: true,
    stake: 1.0,
    maxGale: 1,
    enableFakegaleLoss: true,
    symbols: ['R_100']
  });

  // Create an artificial active pending trade targeting DIFF 5
  trader.state.pending = [{
    id: 'test-pending-1',
    symbol: 'R_100',
    contractType: 'DIGITDIFF',
    targetDigit: 5,
    stage: 0,
    rule: 'double_repeat_exhaustion',
    quote: { stake: 1.0, payout: 1.095, entry: 100.0, epoch: 1000 },
    expiry: Math.floor(Date.now() / 1000) - 2,
    accumulatedProfit: 0
  }];

  // Mock exit tick with digit 5 (LOSS on DIFF 5!)
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history) {
      return { history: { times: [trader.state.pending[0].expiry], prices: [1000.55] } };
    }
    return {};
  };

  trader.lastPoll = 0;
  await trader.tick();

  // Trade suffered loss, stage advanced to 1, and Fakegale cluster break filter activated
  assert.equal(trader.state.pending.length, 1);
  assert.equal(trader.state.pending[0].stage, 1);
  assert.equal(trader.state.pending[0].waitingClusterBreak, true);
  assert.equal(trader.state.pending[0].lossDigit, 5);

  // Next tick: market still has digit 5 (cluster continuing) -> fakegale must continue waiting
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history) {
      return { history: { prices: [1000.85] } }; // digit 5
    }
    return {};
  };
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending[0].waitingClusterBreak, true);

  // Next tick: market moves to digit 2 (cluster broken!) -> fakegale clears and allows Gale 1 proposal
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history) {
      return { history: { prices: [1000.82] } }; // digit 2 !== 5
    }
    if (req.proposal) {
      return {
        proposal: {
          id: 'prop-gale-cleared',
          ask_price: req.amount,
          payout: req.amount * 1.095,
          spot: 1000.82,
          spot_time: Math.floor(Date.now() / 1000)
        }
      };
    }
    return {};
  };
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending[0].waitingClusterBreak, false);
  assert.ok(trader.state.pending[0].quote);

  // Test reset method
  trader.state.trades = [{ id: 'trade-1', profit: 5.0 }];
  trader.state.sessionProfit = 5.0;
  trader.configure({ reset: true });
  assert.equal(trader.state.trades.length, 0);
  assert.equal(trader.state.sessionProfit, 0);
});
