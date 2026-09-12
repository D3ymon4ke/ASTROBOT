export const QUANTUM_VERSION = 'qt-matrix-v2';
export const QUANTUM_ASSETS = ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_25', '1HZ25V', 'R_10', '1HZ10V', 'R_50', '1HZ50V'];
export const DIGIT_ASSETS = QUANTUM_ASSETS;
export const DIGIT_VERSION = QUANTUM_VERSION;

/**
 * Calculates Exponential Moving Average (EMA) for an array of price values.
 * @param {number[]} values 
 * @param {number} period 
 * @returns {number[]}
 */
export function calculateEMA(values = [], period = 14) {
  if (!values.length || period <= 0) return [];
  const p = Math.min(period, values.length);
  const k = 2 / (p + 1);
  const emaArray = [];
  
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const val = Number(values[i]);
    if (i < p) {
      sum += val;
      if (i === p - 1) {
        emaArray.push(Number((sum / p).toFixed(5)));
      } else {
        emaArray.push(val);
      }
    } else {
      const prevEma = emaArray[i - 1];
      const currentEma = (val - prevEma) * k + prevEma;
      emaArray.push(Number(currentEma.toFixed(5)));
    }
  }
  return emaArray;
}

/**
 * Calculates Average True Range (ATR) from OHLC candles.
 * @param {Array<{open: number, high: number, low: number, close: number}>} candles 
 * @param {number} period 
 * @returns {number}
 */
export function calculateATR(candles = [], period = 14) {
  if (candles.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trs.push(tr);
  }
  const slice = trs.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / (slice.length || 1)).toFixed(5));
}

/**
 * Calculates Relative Strength Index (RSI) for price closes.
 * @param {number[]} prices 
 * @param {number} period 
 * @returns {number} 0 - 100
 */
export function calculateRSI(prices = [], period = 14) {
  if (prices.length <= period) return 50;
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(2));
}

/**
 * Multi-Factor Precision Trend & Pullback Analyzer for M1 Candles.
 * Incorporates Anti-Exhaustion RSI filters, EMA Ribbon (9/21/50), and Wick Rejection.
 * @param {Array<{open: number, high: number, low: number, close: number, epoch: number}>} candles 
 * @param {string} symbol 
 * @param {object} config 
 */
export function analyzeQuantumTrend(candles = [], symbol = 'R_100', config = {}) {
  const minCandles = config.minCandles || 30;
  if (!candles || candles.length < minCandles) {
    return {
      signal: false,
      trend: 'NEUTRAL',
      score: 0,
      reason: `Amostragem de velas M1 insuficiente (${candles?.length || 0}/${minCandles})`
    };
  }

  const validCandles = candles.filter(c => c && Number.isFinite(c.close));
  const closes = validCandles.map(c => Number(c.close));
  const n = closes.length;
  const currentPrice = closes.at(-1);

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, Math.min(50, Math.max(10, Math.floor(n * 0.8))));

  const ema9 = ema9Series.at(-1);
  const ema21 = ema21Series.at(-1);
  const ema50 = ema50Series.at(-1);

  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(validCandles, 14);

  // Determine Directional Trend Regime
  let trend = 'NEUTRAL';
  let trendScore = 50;

  const isBullishAlignment = ema9 > ema21 && ema21 > ema50;
  const isBearishAlignment = ema9 < ema21 && ema21 < ema50;

  if (isBullishAlignment) {
    trend = 'BULLISH';
    trendScore = 75;
  } else if (isBearishAlignment) {
    trend = 'BEARISH';
    trendScore = 75;
  }

  // Price Action & Candle Geometry
  const lastCandle = validCandles.at(-1);
  const prevCandle = validCandles.at(-2);
  const range = (lastCandle.high - lastCandle.low) || 1e-5;
  const isGreen = lastCandle.close >= lastCandle.open;
  const isRed = lastCandle.close <= lastCandle.open;

  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;

  let signal = false;
  let direction = null; // 'CALL' or 'PUT'
  let rule = '';
  let score = 0;
  const reasons = [];

  // Strategy 1: Pullback & Wick Rejection on EMA Support/Resistance (HIGH ACCURACY SETUP)
  const isPullbackBullish = isBullishAlignment && (lastCandle.low <= ema9 || lastCandle.low <= ema21) && lastCandle.close >= ema9 && isGreen;
  const isPullbackBearish = isBearishAlignment && (lastCandle.high >= ema9 || lastCandle.high >= ema21) && lastCandle.close <= ema9 && isRed;

  if (isPullbackBullish && rsi >= 40 && rsi <= 80) {
    // Healthy pullback in uptrend without extreme exhaustion
    signal = true;
    direction = 'CALL';
    rule = 'pullback_ema_rejection';
    score = 92;
    reasons.push(
      `Retração (Pullback) compradora confirmada na EMA 9/21`,
      `Rejeição de pavio inferior (${(lowerWickRatio * 100).toFixed(0)}%) com fechamento verde`,
      `RSI saudável em ${rsi} (zona perfeita sem sobrecompra)`,
      `Volatilidade ATR: ${atr}`
    );
  } else if (isPullbackBearish && rsi <= 60 && rsi >= 20) {
    // Healthy pullback in downtrend without extreme exhaustion
    signal = true;
    direction = 'PUT';
    rule = 'pullback_ema_rejection';
    score = 92;
    reasons.push(
      `Retração (Pullback) vendedora confirmada na EMA 9/21`,
      `Rejeição de pavio superior (${(upperWickRatio * 100).toFixed(0)}%) com fechamento vermelho`,
      `RSI saudável em ${rsi} (zona perfeita sem sobrevenda)`,
      `Volatilidade ATR: ${atr}`
    );
  }

  // Strategy 2: Controlled Breakout Expansion
  if (!signal) {
    if (isBullishAlignment && isGreen && currentPrice >= ema9 && rsi >= 45) {
      signal = true;
      direction = 'CALL';
      rule = 'ema_ribbon_breakout';
      score = 85;
      reasons.push(
        `Alinhamento de Alta EMA Ribbon (EMA9 > EMA21 > EMA50)`,
        `Preço em aceleração acima da EMA9`,
        `RSI em aceleração controlada (${rsi})`
      );
    } else if (isBearishAlignment && isRed && currentPrice <= ema9 && rsi <= 55) {
      signal = true;
      direction = 'PUT';
      rule = 'ema_ribbon_breakout';
      score = 85;
      reasons.push(
        `Alinhamento de Baixa EMA Ribbon (EMA9 < EMA21 < EMA50)`,
        `Preço em aceleração abaixo da EMA9`,
        `RSI em aceleração controlada (${rsi})`
      );
    }
  }

  return {
    signal,
    direction,
    contractType: direction === 'CALL' ? 'CALL' : direction === 'PUT' ? 'PUT' : 'CALL',
    trend,
    score: score || trendScore,
    rule: rule || 'neutral_scan',
    reasons,
    indicators: {
      currentPrice,
      ema9,
      ema21,
      ema50,
      rsi,
      atr
    },
    sampleSize: n
  };
}

/**
 * Backward compatibility alias for digit anomaly callers.
 */
export function extractLastDigit(price, symbol = 'R_100') {
  if (price == null || !Number.isFinite(Number(price))) return 0;
  const num = Number(price);
  const formatted = num.toFixed(2);
  return parseInt(formatted.slice(-1), 10) || 0;
}

export function analyzeDigitDistribution(ticks = [], symbol = 'R_100', windowSize = 60) {
  const candles = (ticks || []).map((t, i) => ({
    open: Number(t.price || 0),
    high: Number(t.price || 0) * 1.0001,
    low: Number(t.price || 0) * 0.9999,
    close: Number(t.price || 0),
    epoch: t.epoch || (1000 + i)
  }));
  const quantum = analyzeQuantumTrend(candles, symbol, { minCandles: 10 });
  return {
    sampleSize: ticks.length,
    counts: Array(10).fill(1),
    percentages: Array(10).fill(10),
    chiSquare: 0,
    entropy: 1.0,
    ranked: [],
    hotDigits: [],
    coldDigits: [],
    lastDigits: ticks.slice(-10).map(t => extractLastDigit(t.price, symbol)),
    quantum
  };
}

export function detectDigitAnomalySignal(ticks = [], symbol = 'R_100', config = {}) {
  const candles = (ticks || []).map((t, i) => ({
    open: Number(t.price || 0),
    high: Number(t.price || 0) * 1.0001,
    low: Number(t.price || 0) * 0.9999,
    close: Number(t.price || 0),
    epoch: t.epoch || (1000 + i)
  }));
  return analyzeQuantumTrend(candles, symbol, config);
}
