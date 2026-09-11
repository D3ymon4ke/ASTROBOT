import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLastDigit,
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

test('digit distribution computes uniform frequencies and chi-square statistics', () => {
  // Generate 100 ticks with known digits (10 of each digit 0-9)
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
});

test('anomaly detector identifies double-hit repetition and suppresses triple-hits', () => {
  const ticks = [];
  // 30 normal baseline ticks (digits 0 to 9 cycling)
  for (let i = 0; i < 30; i++) {
    ticks.push({ price: 1000.00 + (i % 10) * 0.01, epoch: 1000 + i });
  }

  // Add double repetition of digit 7 (1000.07 and 1000.17)
  ticks.push({ price: 1000.07, epoch: 1031 });
  ticks.push({ price: 1000.17, epoch: 1032 });

  const signal = detectDigitAnomalySignal(ticks, 'R_100', { minSamples: 20, windowSize: 50 });
  assert.equal(signal.signal, true);
  assert.equal(signal.contractType, 'DIGITDIFF');
  assert.equal(signal.targetDigit, 7);
  assert.equal(signal.rule, 'double_repeat_exhaustion');
  assert.ok(signal.score >= 80);

  // Now add a 3rd repetition of digit 7 (triple hit trap) -> should suppress
  ticks.push({ price: 1000.27, epoch: 1033 });
  const suppressed = detectDigitAnomalySignal(ticks, 'R_100', { minSamples: 20, windowSize: 50 });
  assert.equal(suppressed.signal, false);
  assert.ok(suppressed.reason.includes('já repetiu 3x consecutivas'));
});

test('validateDigitConfig enforces bounds and rejects non-finite or invalid parameters', () => {
  assert.throws(() => validateDigitConfig(null), /inválida/);
  assert.throws(() => validateDigitConfig({ stake: 0.1 }), /stake/);
  assert.throws(() => validateDigitConfig({ stake: -5 }), /stake/);
  assert.throws(() => validateDigitConfig({ multiplier: 0.5 }), /multiplier/);
  assert.throws(() => validateDigitConfig({ maxGale: 5 }), /maxGale/);
  assert.throws(() => validateDigitConfig({ symbols: ['INVALID_ASSET'] }), /ativos/);

  const valid = validateDigitConfig({
    enabled: true,
    stake: 2.0,
    multiplier: 10.0,
    maxGale: 1,
    cycleBudget: 30.0,
    symbols: ['R_100', '1HZ50V']
  });

  assert.equal(valid.enabled, true);
  assert.equal(valid.stake, 2.0);
  assert.equal(valid.multiplier, 10.0);
});

test('DigitTrader simulates DIGITDIFF trades without mutating balance or placing real buys', async () => {
  let saved = false;
  let syncCount = 0;
  const requests = [];

  const session = {
    activeMode: 'demo',
    modeStates: {
      demo: {},
      real: {}
    },
    accountCurrency: 'USD',
    balance: 100.0,
    saveToFile: () => { saved = true; },
    syncToClients: () => { syncCount++; },
    connectDeriv: () => {},
    derivAPI: {
      connected: true,
      authorized: true,
      sendRequest: async (req) => {
        requests.push(req);
        assert.ok(!req.buy, 'DigitTrader should NEVER send real buy requests');
        if (req.proposal) {
          return {
            proposal: {
              id: 'prop-123',
              ask_price: req.amount,
              payout: req.amount * 1.095, // ~9.5% payout for DIGITDIFF
              spot: 1234.56,
              spot_time: Math.floor(Date.now() / 1000)
            }
          };
        }
        if (req.ticks_history) {
          // Provide 30 ticks ending at digit 9, then two consecutive digit 4s
          const times = [];
          const prices = [];
          for (let i = 0; i < 30; i++) {
            times.push(1000 + i);
            prices.push(1000.00 + (i % 10) * 0.01);
          }
          times.push(1030);
          prices.push(1000.04);
          times.push(1031);
          prices.push(1000.14);

          return {
            history: {
              times,
              prices
            }
          };
        }
        return {};
      }
    }
  };

  const trader = new DigitTrader(session);
  trader.configure({ enabled: true, stake: 1.0, symbols: ['R_100'] });

  // First tick scans and detects anomaly (target digit 4)
  trader.lastPoll = 0;
  await trader.tick();
  assert.equal(trader.state.pending.length, 1);
  assert.equal(trader.state.pending[0].targetDigit, 4);

  // Next tick requests proposal for DIGITDIFF barrier: '4'
  trader.lastPoll = 0;
  await trader.tick();
  assert.ok(trader.state.pending[0].quote);
  assert.equal(trader.state.pending[0].quote.stake, 1.0);

  // Advance expiry past threshold for immediate exit resolution
  trader.state.pending[0].expiry = Math.floor(Date.now() / 1000) - 2;
  trader.lastPoll = 0;

  // Mock exit tick with price ending in digit 8 (1234.58 !== 4 -> WIN)
  session.derivAPI.sendRequest = async (req) => {
    if (req.ticks_history) {
      return {
        history: {
          times: [trader.state.pending[0].expiry],
          prices: [1234.58]
        }
      };
    }
    return {};
  };

  // Settle trade
  await trader.tick();
  assert.equal(trader.state.pending.length, 0);
  assert.equal(trader.state.trades.length, 1);
  assert.equal(trader.state.trades[0].exitDigit, 8);
  assert.ok(trader.state.trades[0].profit > 0);
  assert.equal(session.balance, 100.0, 'Balance must remain untouched during simulation');
});
