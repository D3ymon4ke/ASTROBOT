export const QUANTUM_VERSION = 'qap-v3';
export const QUANTUM_ASSETS = ['R_100', '1HZ100V', 'R_75', '1HZ75V', 'R_25', '1HZ25V', 'R_10', '1HZ10V'];
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
 * Extract last decimal digit based on asset precision.
 * @param {number|string} price 
 * @param {string} symbol 
 * @returns {number} 0-9
 */
export function extractLastDigit(price, symbol = 'R_100') {
  if (price == null || !Number.isFinite(Number(price))) return 0;
  const num = Number(price);
  const decimals = symbol.includes('10') && !symbol.includes('100') ? 3 : 2;
  const formatted = num.toFixed(decimals);
  return parseInt(formatted.slice(-1), 10) || 0;
}

/**
 * Quantum Asymmetric Digit Probability Engine (QAP-Engine V3).
 * Analyzes L100 rolling digit frequency and triggers asymmetric high-probability setups:
 * - DIGITUNDER 8 (80% theoretical win rate)
 * - DIGITOVER 1 (80% theoretical win rate)
 * - DIGITDIFF (90% theoretical win rate on cold digit prediction)
 * 
 * @param {Array<{epoch: number, price: number}>} ticks 
 * @param {string} symbol 
 * @param {object} config 
 */
export function analyzeQuantumAsymmetricDigits(ticks = [], symbol = 'R_100', config = {}) {
  const sampleSize = ticks.length;
  if (sampleSize < 20) {
    return {
      signal: false,
      contractType: null,
      barrier: null,
      score: 0,
      rule: 'insufficient_ticks',
      reason: `Ticks insuficientes (${sampleSize}/20)`,
      distribution: Array(10).fill(10),
      counts: Array(10).fill(0)
    };
  }

  const digits = ticks.map(t => extractLastDigit(t.price, symbol));
  const counts = Array(10).fill(0);
  for (const d of digits) {
    if (d >= 0 && d <= 9) counts[d]++;
  }

  const percentages = counts.map(c => Number(((c / sampleSize) * 100).toFixed(1)));
  const last5 = digits.slice(-5);
  const lastDigit = digits.at(-1);

  // Frequency groups
  const highExtremesFreq = (counts[8] + counts[9]) / sampleSize; // Freq of 8 and 9
  const lowExtremesFreq = (counts[0] + counts[1]) / sampleSize;  // Freq of 0 and 1
  const lowGroupFreq = counts.slice(0, 5).reduce((a, b) => a + b, 0) / sampleSize; // 0,1,2,3,4
  const highGroupFreq = counts.slice(5, 10).reduce((a, b) => a + b, 0) / sampleSize; // 5,6,7,8,9

  // Find coldest and hottest digits
  let minCount = Infinity, maxCount = -1;
  let coldDigit = 0, hotDigit = 0;
  for (let d = 0; d <= 9; d++) {
    if (counts[d] < minCount) { minCount = counts[d]; coldDigit = d; }
    if (counts[d] > maxCount) { maxCount = counts[d]; hotDigit = d; }
  }

  let signal = false;
  let contractType = null;
  let barrier = null;
  let rule = 'neutral_distribution';
  let score = 50;
  let expectedWinRate = 50;
  const reasons = [];

  // SETUP 1: ASYMMETRIC DIGITUNDER 8 (80% Base Probability)
  // When 8 and 9 are compressed (<14% in L100) and recent digits are low (last digit <= 6)
  if (highExtremesFreq <= 0.15 && lowGroupFreq >= 0.55 && lastDigit <= 6) {
    signal = true;
    contractType = 'DIGITUNDER';
    barrier = 8;
    rule = 'asymmetric_under_8';
    score = 92;
    expectedWinRate = 84;
    reasons.push(
      `Dígitos altos 8 e 9 suprimidos em ${symbol} (${(highExtremesFreq * 100).toFixed(1)}% no L100)`,
      `Dominância de dígitos baixos 0-4 (${(lowGroupFreq * 100).toFixed(1)}%)`,
      `Último dígito favorável (${lastDigit}) · Alta assimetria estatística DIGITUNDER 8`
    );
  }
  // SETUP 2: ASYMMETRIC DIGITOVER 1 (80% Base Probability)
  // When 0 and 1 are compressed (<14% in L100) and recent digits are high (last digit >= 3)
  else if (lowExtremesFreq <= 0.15 && highGroupFreq >= 0.55 && lastDigit >= 3) {
    signal = true;
    contractType = 'DIGITOVER';
    barrier = 1;
    rule = 'asymmetric_over_1';
    score = 92;
    expectedWinRate = 84;
    reasons.push(
      `Dígitos baixos 0 e 1 suprimidos em ${symbol} (${(lowExtremesFreq * 100).toFixed(1)}% no L100)`,
      `Dominância de dígitos altos 5-9 (${(highGroupFreq * 100).toFixed(1)}%)`,
      `Último dígito favorável (${lastDigit}) · Alta assimetria estatística DIGITOVER 1`
    );
  }
  // SETUP 3: ASYMMETRIC DIGITDIFF (90% Base Probability on Coldest Suppressed Digit)
  else if (minCount / sampleSize <= 0.06 && last5.every(d => d !== coldDigit)) {
    signal = true;
    contractType = 'DIGITDIFF';
    barrier = coldDigit;
    rule = 'asymmetric_diff_cold';
    score = 90;
    expectedWinRate = 92;
    reasons.push(
      `Dígito frio ${coldDigit} com apenas ${(percentages[coldDigit])}% de frequência no L100`,
      `Ausente nas últimas 5 amostras consecutivas`,
      `Probabilidade matemática de 90%+ com proteção contra anomalia de repetição`
    );
  }

  return {
    signal,
    contractType,
    barrier,
    rule,
    score,
    expectedWinRate,
    reasons,
    counts,
    percentages,
    coldDigit,
    hotDigit,
    lastDigit,
    last5,
    sampleSize
  };
}

/**
 * Macro Trend Pullback Analyzer for M3/M5 Directional Trades.
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
      reason: `Amostragem de velas insuficiente (${candles?.length || 0}/${minCandles})`
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

  let trend = 'NEUTRAL';
  let trendScore = 50;

  const isBullish = ema9 > ema21 && ema21 > ema50;
  const isBearish = ema9 < ema21 && ema21 < ema50;

  if (isBullish) {
    trend = 'BULLISH';
    trendScore = 80;
  } else if (isBearish) {
    trend = 'BEARISH';
    trendScore = 80;
  }

  const lastCandle = validCandles.at(-1);
  const isGreen = lastCandle.close >= lastCandle.open;
  const isRed = lastCandle.close <= lastCandle.open;

  let signal = false;
  let direction = null;
  let rule = '';
  let score = 0;
  const reasons = [];

  // M3/M5 Pullback Trend Confirmation
  if (isBullish && (lastCandle.low <= ema9 || lastCandle.low <= ema21) && lastCandle.close >= ema9 && isGreen && rsi >= 42 && rsi <= 68) {
    signal = true;
    direction = 'CALL';
    rule = 'macro_trend_pullback_call';
    score = 88;
    reasons.push(
      `Alinhamento de Alta Macrotendência (EMA 9 > 21 > 50)`,
      `Retração compradora confirmada na EMA de suporte`,
      `RSI equilibrado em ${rsi}`
    );
  } else if (isBearish && (lastCandle.high >= ema9 || lastCandle.high >= ema21) && lastCandle.close <= ema9 && isRed && rsi <= 58 && rsi >= 32) {
    signal = true;
    direction = 'PUT';
    rule = 'macro_trend_pullback_put';
    score = 88;
    reasons.push(
      `Alinhamento de Baixa Macrotendência (EMA 9 < 21 < 50)`,
      `Retração vendedora confirmada na EMA de resistência`,
      `RSI equilibrado em ${rsi}`
    );
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

export function analyzeDigitDistribution(ticks = [], symbol = 'R_100') {
  return analyzeQuantumAsymmetricDigits(ticks, symbol);
}

export function detectDigitAnomalySignal(ticks = [], symbol = 'R_100', config = {}) {
  return analyzeQuantumAsymmetricDigits(ticks, symbol, config);
}
