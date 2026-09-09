import { cleanCandles, signalFor, STRATEGIES, STRATEGY_VERSION } from './signals.js';

export function summarize(rows = []) {
  const trades = rows.filter(t => t.profit != null && Number.isFinite(Number(t.profit)) && Number.isFinite(Number(t.stake)) && Number(t.stake) > 0);
  let net = 0, peak = 0, drawdown = 0, grossWin = 0, grossLoss = 0, lossRun = 0, maxLossRun = 0;
  const curve = trades.map(t => {
    const profit = Number(t.profit); net += profit; peak = Math.max(peak, net); drawdown = Math.max(drawdown, peak - net);
    grossWin += Math.max(0, profit); grossLoss += Math.max(0, -profit);
    lossRun = profit < 0 ? lossRun + 1 : 0; maxLossRun = Math.max(maxLossRun, lossRun);
    return { time: t.timestamp || t.epoch * 1000, equity: net };
  });
  const wins = trades.filter(t => t.profit > 0).length, n = trades.length, p = n ? wins / n : 0;
  // Descriptive Wilson interval assumes independent trials; not an approval criterion.
  const z = 1.96, denom = 1 + z * z / (n || 1);
  const center = (p + z * z / (2 * (n || 1))) / denom;
  const margin = z * Math.sqrt(p * (1 - p) / (n || 1) + z * z / (4 * (n || 1) ** 2)) / denom;
  return { count: n, wins, losses: trades.filter(t => t.profit < 0).length, net, drawdown, maxLossRun,
    winRate: n ? p * 100 : null, profitFactor: grossLoss ? grossWin / grossLoss : null,
    grossWin, grossLoss, expectancy: n ? net / n : null,
    unitExpectancy: n ? trades.reduce((s, t) => s + Number(t.profit) / Number(t.stake), 0) / n : null,
    interval: n ? [Math.max(0, center - margin) * 100, Math.min(1, center + margin) * 100] : null, curve };
}

function replay(candles, start, end, strategy, config) {
  const rows = [];
  for (let i = Math.max(30, start); i + config.duration <= end; i++) {
    const history = candles.slice(Math.max(0, i - 100), i);
    const signal = signalFor(history, strategy);
    if (!signal || signal.score < config.minScore || candles[i].epoch !== signal.signalEpoch) continue;
    const exit = candles[i + config.duration - 1];
    if (exit.epoch !== candles[i].epoch + (config.duration - 1) * 60) continue;
    const win = signal.direction === 'CALL' ? exit.close > candles[i].open : exit.close < candles[i].open;
    rows.push({ ...signal, epoch: candles[i].epoch, timestamp: candles[i].epoch * 1000, stake: config.stake,
      profit: config.stake * (win ? config.payout : -1), source: 'candle_proxy', entry: candles[i].open, exit: exit.close });
    i += config.duration - 1;
  }
  return rows;
}

// Selection sees only training data. Each test fold is disjoint and comes later.
export function walkForward(input, options = {}) {
  const candles = cleanCandles(input);
  const config = { train: 200, test: 100, duration: 1, stake: .35, payout: .9, minScore: 60, ...options };
  for (const k of ['train', 'test', 'duration']) if (!Number.isInteger(config[k]) || config[k] < (k === 'train' ? 40 : k === 'test' ? 20 : 1)) throw Error('Janelas inválidas.');
  if (config.duration > 5 || !Number.isFinite(config.stake) || config.stake <= 0 || !Number.isFinite(config.payout) || config.payout <= 0 || config.payout > 2 || !Number.isFinite(config.minScore)) throw Error('Parâmetros inválidos.');
  const folds = [], rows = [];
  for (let start = config.train; start + config.test <= candles.length; start += config.test) {
    const training = candles.slice(start - config.train, start);
    const candidates = STRATEGIES.map(strategy => ({ strategy, metrics: summarize(replay(training, 30, training.length, strategy, config)) }));
    const eligible = candidates.filter(c => c.metrics.count >= 10 && c.metrics.unitExpectancy > 0)
      .sort((a, b) => b.metrics.unitExpectancy - a.metrics.unitExpectancy);
    const selected = eligible[0]?.strategy || null;
    const tested = selected ? replay(candles, start, start + config.test, selected, config) : [];
    rows.push(...tested);
    folds.push({ trainEnd: candles[start - 1].epoch, testStart: candles[start].epoch, testEnd: candles[start + config.test - 1].epoch,
      selected, candidates, metrics: summarize(tested) });
  }
  return { version: STRATEGY_VERSION, type: 'candle_proxy', config, candleCount: candles.length, folds, rows, metrics: summarize(rows),
    warning: 'Simulação OHLC com payout constante, sem latência. Não reproduz liquidação real e não autoriza compras.' };
}

// Block resampling keeps short local loss clusters; stress estimate, not a forecast.
export function stressTest(rows, bankroll = 100, stake = .35, runs = 300) {
  const returns = rows.filter(t => t.stake > 0 && Number.isFinite(Number(t.profit))).map(t => t.profit / t.stake);
  if (returns.length < 20 || ![bankroll, stake, runs].every(Number.isFinite) || !(bankroll > 0) || !(stake > 0) || !Number.isInteger(runs) || runs < 1) return null;
  let seed = 72431;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const results = []; let ruined = 0;
  for (let run = 0; run < Math.min(1000, runs); run++) {
    let equity = bankroll, peak = bankroll, dd = 0;
    for (let n = 0; n < returns.length;) {
      const start = Math.floor(random() * returns.length);
      for (let j = 0; j < 5 && n < returns.length; j++, n++) {
        if (equity < stake) { n = returns.length; break; }
        equity += returns[(start + j) % returns.length] * stake;
        peak = Math.max(peak, equity); dd = Math.max(dd, peak - equity);
      }
    }
    if (equity < stake) ruined++;
    results.push(dd);
  }
  results.sort((a, b) => a - b);
  return { runs: results.length, drawdown95: results[Math.floor(results.length * .95)], depletionPct: 100 * ruined / results.length, blockSize: 5 };
}
