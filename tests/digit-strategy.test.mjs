import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEMA,
  calculateATR,
  calculateRSI,
  extractLastDigit,
  analyzeQuantumAsymmetricDigits,
  analyzeQuantumTrend,
  QUANTUM_ASSETS
} from '../vps-backend/automation/digitAnomaly.js';
import {
  DigitTrader,
  validateDigitConfig,
  QUANTUM_DEFAULTS
} from '../vps-backend/automation/DigitTrader.js';

test('calculateEMA accurately computes exponential moving averages', () => {
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const ema = calculateEMA(prices, 5);
  assert.equal(ema.length, prices.length);
  assert.ok(ema.at(-1) > ema[0]);
  assert.ok(ema.at(-1) <= 20 && ema.at(-1) >= 15);
});

test('calculateATR computes average true range accurately', () => {
  const candles = [];
  for (let i = 0; i < 20; i++) {
    candles.push({
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      epoch: 1000 + i * 60
    });
  }
  const atr = calculateATR(candles, 14);
  assert.ok(atr > 0);
  assert.ok(Number.isFinite(atr));
});

test('calculateRSI identifies overbought, oversold and neutral momentum', () => {
  const upPrices = [];
  for (let i = 0; i < 30; i++) upPrices.push(100 + i * 2 + (i % 2 === 0 ? 0.5 : -0.5));
  const highRsi = calculateRSI(upPrices, 14);
  assert.ok(highRsi >= 65);

  const downPrices = [];
  for (let i = 0; i < 30; i++) downPrices.push(100 - i * 2 + (i % 2 === 0 ? -0.5 : 0.5));
  const lowRsi = calculateRSI(downPrices, 14);
  assert.ok(lowRsi <= 35);
});

test('extractLastDigit extracts correct decimal digit based on asset precision', () => {
  assert.equal(extractLastDigit(50123.45, 'R_75'), 5);
  assert.equal(extractLastDigit(1234.567, 'R_10'), 7);
  assert.equal(extractLastDigit(9876.01, '1HZ75V'), 1);
});

test('QUANTUM_ASSETS contains exclusively the verified profitable trio', () => {
  assert.deepEqual(QUANTUM_ASSETS, ['R_75', '1HZ75V', '1HZ25V']);
});

test('analyzeQuantumAsymmetricDigits triggers high-payout DIGITUNDER 7 on low digit dominance', () => {
  const ticks = [];
  for (let i = 0; i < 99; i++) {
    const digit = (i % 4); // 0, 1, 2, 3
    ticks.push({ price: 1000 + digit * 0.01, epoch: 1000 + i });
  }
  ticks.push({ price: 1000.02, epoch: 1099 }); // last digit = 2 (<= 5)

  const analysis = analyzeQuantumAsymmetricDigits(ticks, 'R_75');
  assert.equal(analysis.signal, true);
  assert.equal(analysis.contractType, 'DIGITUNDER');
  assert.equal(analysis.barrier, 7);
  assert.ok(analysis.expectedWinRate >= 75);
  assert.ok(analysis.score >= 85);
});

test('validateDigitConfig enforces QAP-V4 bounds and rejects invalid inputs', () => {
  assert.throws(() => validateDigitConfig(null), /inválida/);
  assert.throws(() => validateDigitConfig({ stake: 0.1 }), /stake/);
  assert.throws(() => validateDigitConfig({ minScore: 40 }), /minScore/);

  const valid = validateDigitConfig({
    enabled: true,
    stake: 1.0,
    multiplier: 2.4,
    maxGale: 1,
    cycleBudget: 20.0,
    minScore: 85,
    sessionTarget: 1.00,
    sessionStopLoss: 3.40,
    cooldownMinutes: 10,
    stopCooldownMinutes: 20,
    symbols: ['R_75', '1HZ75V']
  });

  assert.equal(valid.enabled, true);
  assert.equal(valid.stake, 1.0);
  assert.equal(valid.multiplier, 2.4);
  assert.equal(valid.maxGale, 1);
  assert.equal(valid.sessionTarget, 1.00);
  assert.equal(valid.sessionStopLoss, 3.40);
  assert.equal(valid.cooldownMinutes, 10);
  assert.equal(valid.stopCooldownMinutes, 20);
});

test('DigitTrader simulates QAP-V4 Model B Execution with Gale 1 recovery', async () => {
  const mockSession = {
    activeMode: 'demo',
    accountCurrency: 'USD',
    loadedFromFile: false,
    modeStates: {
      demo: {}
    },
    saveToFile() {},
    syncToClients() {},
    connectDeriv() {},
    derivAPI: {
      connected: true,
      authorized: true,
      sendRequest: async (req) => {
        if (req.ticks_history) {
          const nowSec = Math.floor(Date.now() / 1000);
          return {
            history: {
              prices: Array.from({ length: 100 }, (_, i) => 1000 + (i % 4) * 0.01),
              times: Array.from({ length: 100 }, (_, i) => nowSec - 100 + i)
            }
          };
        }
        if (req.proposal) {
          return {
            proposal: {
              id: 'prop-123',
              ask_price: req.amount,
              payout: req.amount * 1.42, // ~42% payout
              spot: 1000.02,
              spot_time: Math.floor(Date.now() / 1000)
            }
          };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(mockSession);
  trader.configure({
    enabled: true,
    stake: 1.0,
    multiplier: 2.4,
    maxGale: 1,
    symbols: ['R_75'],
    sessionTarget: 1.00,
    sessionStopLoss: 3.40,
    cooldownMinutes: 10,
    stopCooldownMinutes: 20
  });

  assert.equal(trader.state.config.enabled, true);

  // Trade 1: Win +0.42
  trader.lastPoll = 0;
  await trader.tick();
  trader.lastPoll = 0;
  await trader.tick();
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  await trader.tick();

  assert.equal(trader.state.trades.length, 1);
  assert.equal(trader.state.sessionProfit, 0.42);
  assert.equal(trader.state.sessionsWon, 0);

  // Trade 2: Win +0.42 -> total 0.84
  trader.lastPoll = 0;
  await trader.tick();
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  await trader.tick();

  assert.equal(trader.state.trades.length, 2);
  assert.equal(trader.state.sessionProfit, 0.84);

  // Trade 3: Win +0.42 -> total 1.26 (Target hit >= 1.00!)
  trader.lastPoll = 0;
  await trader.tick();
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  await trader.tick();

  assert.equal(trader.state.trades.length, 3);
  assert.equal(trader.state.sessionsWon, 1);
  assert.equal(trader.state.totalLockedProfit, 1.26);
  assert.equal(trader.state.completedSessions.length, 1);
  assert.equal(trader.state.completedSessions[0].result, 'WIN');
  assert.ok(trader.state.cooldownUntil > Date.now());

  // Test reset
  trader.reset();
  assert.equal(trader.state.trades.length, 0);
  assert.equal(trader.state.sessionProfit, 0);
  assert.equal(trader.state.totalLockedProfit, 0);
  assert.equal(trader.state.sessionsWon, 0);
  assert.equal(trader.state.completedSessions.length, 0);
});

test('DigitTrader Trailing Profit Lock and Vault Circuit Breaker protections work as expected', async () => {
  const mockSession = {
    activeMode: 'demo',
    accountCurrency: 'USD',
    loadedFromFile: false,
    modeStates: { demo: {} },
    saveToFile() {},
    syncToClients() {},
    connectDeriv() {},
    derivAPI: {
      connected: true,
      authorized: true,
      async sendRequest(req) {
        if (req.proposal) {
          return { proposal: { id: 'prop-lock-1', ask_price: 1.0, payout: 1.42 } };
        }
        if (req.ticks_history) {
          // Exit digit = 8 -> Loss on DIGITUNDER 7
          return {
            history: {
              times: [Math.floor(Date.now() / 1000)],
              prices: [1234.08]
            }
          };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(mockSession);
  trader.configure({
    enabled: true,
    sessionTarget: 1.00,
    trailingProfitLock: 0.70,
    vaultDailyTarget: 2.00,
    maxDailyStops: 2
  });

  // Simulate existing session with high profit (+0.84 USD)
  trader.state.sessionProfit = 0.84;
  trader.currentSessionTrades = [
    { profit: 0.42 },
    { profit: 0.42 }
  ];

  // Setup pending quote that will lose
  trader.state.pending = [{
    id: 'op-trailing',
    symbol: 'R_75',
    contractType: 'DIGITUNDER',
    barrier: 7,
    stage: 0,
    expiry: Math.floor(Date.now() / 1000) - 2,
    quote: { id: 'prop-1', stake: 0.35, payout: 0.49 }
  }];

  trader.lastPoll = 0;
  await trader.tick();

  // Loss happened (-0.35), but sessionProfit was > 0 (0.84 - 0.35 = 0.49 > 0)
  // and peak profit was >= 0.70.
  // Trailing Profit Lock should trigger WIN_PROTECTED, locking +0.49!
  assert.equal(trader.state.sessionsWon, 1);
  assert.equal(trader.state.totalLockedProfit, 0.49);
  assert.equal(trader.state.completedSessions[0].result, 'WIN_PROTECTED');
  assert.equal(trader.state.completedSessions[0].profit, 0.49);
  assert.ok(trader.state.cooldownUntil > Date.now());

  // Test Vault Daily Target Circuit Breaker
  trader.state.totalLockedProfit = 2.50; // Above target of 2.00
  trader.state.cooldownUntil = 0; // cooldown over
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.config.enabled, false);
  assert.match(trader.state.status, /META DIÁRIA DO COFRE ATINGIDA/);

  // Test Max Daily Stops Circuit Breaker
  trader.state.config.enabled = true;
  trader.state.totalLockedProfit = 0;
  trader.state.sessionsLost = 2; // Hit max stops
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.config.enabled, false);
  assert.match(trader.state.status, /DISJUNTOR ACIONADO/);
});

