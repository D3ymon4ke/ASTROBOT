import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEMA,
  calculateATR,
  calculateRSI,
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

test('analyzeQuantumTrend detects pullback wick rejection on EMA', () => {
  const candles = [];
  for (let i = 0; i < 40; i++) {
    const base = 1000 + i * 4;
    candles.push({
      open: base,
      high: base + 5,
      low: base - 2,
      close: base + 3.5,
      epoch: 1000 + i * 60
    });
  }

  const analysis = analyzeQuantumTrend(candles, 'R_100', { minCandles: 30 });
  assert.equal(analysis.trend, 'BULLISH');
  assert.equal(analysis.direction, 'CALL');
  assert.ok(analysis.score >= 75);
  assert.ok(analysis.signal);
});

test('validateDigitConfig enforces QT-Matrix bounds and rejects invalid inputs', () => {
  assert.throws(() => validateDigitConfig(null), /inválida/);
  assert.throws(() => validateDigitConfig({ stake: 0.1 }), /stake/);
  assert.throws(() => validateDigitConfig({ multiplier: 10 }), /multiplier/);
  assert.throws(() => validateDigitConfig({ minScore: 40 }), /minScore/);

  const valid = validateDigitConfig({
    enabled: true,
    stake: 1.5,
    multiplier: 2.1,
    maxGale: 1,
    cycleBudget: 30.0,
    minScore: 75,
    sessionTarget: 5.0,
    cooldownMinutes: 30,
    enableFakegaleLoss: true,
    symbols: ['R_100', '1HZ100V']
  });

  assert.equal(valid.enabled, true);
  assert.equal(valid.stake, 1.5);
  assert.equal(valid.multiplier, 2.1);
  assert.equal(valid.sessionTarget, 5.0);
});

test('DigitTrader simulates M1 CALL/PUT trades with Intelligent Gale and session lock', async () => {
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
              id: 'prop-m1-call',
              ask_price: req.amount,
              payout: req.amount * 1.95,
              spot: 1050.00,
              spot_time: Math.floor(Date.now() / 1000)
            }
          };
        }
        if (req.ticks_history && req.style === 'candles') {
          const candles = [];
          for (let i = 0; i < 40; i++) {
            const base = 1000 + i * 4;
            candles.push({
              epoch: 1000 + i * 60,
              open: base,
              high: base + 5,
              low: base - 2,
              close: base + 3.5
            });
          }
          return { candles };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(session);
  trader.configure({
    enabled: true,
    stake: 1.0,
    multiplier: 2.1,
    maxGale: 1,
    minScore: 75,
    sessionTarget: 0.50,
    cooldownMinutes: 30,
    enableFakegaleLoss: true,
    symbols: ['R_100']
  });

  // Step 1: First scan registers virtual trigger
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending.length, 0);

  // Step 2: Next scan confirms and creates pending trade
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending.length, 1);
  assert.equal(trader.state.pending[0].direction, 'CALL');

  // Step 3: Quote proposal
  trader.lastPoll = 0;
  await trader.tick();
  assert.ok(trader.state.pending[0].quote);
  assert.equal(trader.state.pending[0].quote.stake, 1.0);

  // Step 4: Settle M1 trade (Exit Price 1055.00 > Entry 1050.00 -> WIN on CALL)
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history && req.style !== 'candles') {
      return { history: { times: [trader.state.pending[0].expiry], prices: [1055.00] } };
    }
    return {};
  };

  await trader.tick();
  assert.equal(trader.state.trades.length, 1);
  assert.ok(trader.state.trades[0].profit > 0);
  assert.equal(trader.state.trades[0].profit, 0.95);
  assert.ok(trader.state.cooldownUntil > Date.now());

  // Test reset
  trader.configure({ reset: true });
  assert.equal(trader.state.trades.length, 0);
  assert.equal(trader.state.sessionProfit, 0);
  assert.equal(trader.state.cooldownUntil, 0);
});
