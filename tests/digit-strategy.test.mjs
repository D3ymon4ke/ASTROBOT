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
  assert.equal(extractLastDigit(50123.45, 'R_100'), 5);
  assert.equal(extractLastDigit(1234.567, 'R_10'), 7);
  assert.equal(extractLastDigit(9876.01, '1HZ100V'), 1);
});

test('analyzeQuantumAsymmetricDigits triggers high-payout DIGITUNDER 7 on low digit dominance', () => {
  const ticks = [];
  for (let i = 0; i < 99; i++) {
    const digit = (i % 4); // 0, 1, 2, 3
    ticks.push({ price: 1000 + digit * 0.01, epoch: 1000 + i });
  }
  ticks.push({ price: 1000.02, epoch: 1099 }); // last digit = 2 (<= 5)

  const analysis = analyzeQuantumAsymmetricDigits(ticks, 'R_100');
  assert.equal(analysis.signal, true);
  assert.equal(analysis.contractType, 'DIGITUNDER');
  assert.equal(analysis.barrier, 7);
  assert.ok(analysis.expectedWinRate >= 75);
  assert.ok(analysis.score >= 85);
});

test('analyzeQuantumAsymmetricDigits triggers high-payout DIGITOVER 2 on high digit dominance', () => {
  const ticks = [];
  for (let i = 0; i < 99; i++) {
    const digit = 5 + (i % 4); // 5, 6, 7, 8
    ticks.push({ price: 1000 + digit * 0.01, epoch: 1000 + i });
  }
  ticks.push({ price: 1000.07, epoch: 1099 }); // last digit = 7 (>= 4)

  const analysis = analyzeQuantumAsymmetricDigits(ticks, 'R_100');
  assert.equal(analysis.signal, true);
  assert.equal(analysis.contractType, 'DIGITOVER');
  assert.equal(analysis.barrier, 2);
  assert.ok(analysis.expectedWinRate >= 75);
  assert.ok(analysis.score >= 85);
});

test('validateDigitConfig enforces QAP-V3.1 bounds and rejects invalid inputs', () => {
  assert.throws(() => validateDigitConfig(null), /inválida/);
  assert.throws(() => validateDigitConfig({ stake: 0.1 }), /stake/);
  assert.throws(() => validateDigitConfig({ minScore: 40 }), /minScore/);

  const valid = validateDigitConfig({
    enabled: true,
    stake: 1.0,
    sorosEnabled: true,
    cycleBudget: 20.0,
    minScore: 85,
    sessionTarget: 2.50,
    cooldownMinutes: 15,
    symbols: ['R_100', '1HZ100V']
  });

  assert.equal(valid.enabled, true);
  assert.equal(valid.stake, 1.0);
  assert.equal(valid.sessionTarget, 2.50);
  assert.equal(valid.cooldownMinutes, 15);
});

test('DigitTrader simulates QAP-V3.1 Execution with Fixed Stake and Soros N1', async () => {
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
              payout: req.amount * 1.42,
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
    sorosEnabled: true,
    symbols: ['R_100'],
    sessionTarget: 2.50,
    cooldownMinutes: 15
  });

  assert.equal(trader.state.config.enabled, true);

  // Run tick to trigger scan and asymmetric entry
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending.length, 1);
  assert.equal(trader.state.pending[0].contractType, 'DIGITUNDER');
  assert.equal(trader.state.pending[0].barrier, 7);

  // Quote proposal
  trader.lastPoll = 0;
  await trader.tick();
  assert.ok(trader.state.pending[0].quote != null);
  assert.equal(trader.state.pending[0].quote.stake, 1.0);

  // Advance time and settle win
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  await trader.tick();

  assert.equal(trader.state.trades.length, 1);
  assert.ok(trader.state.trades[0].profit > 0);
  assert.equal(trader.sorosStage, 1); // Soros Stage 1 activated

  // Test reset
  trader.reset();
  assert.equal(trader.state.trades.length, 0);
  assert.equal(trader.state.sessionProfit, 0);
  assert.equal(trader.sorosStage, 0);
});
