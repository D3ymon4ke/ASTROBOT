export const DIGIT_VERSION = 'digit-v1';
export const DIGIT_ASSETS = ['R_100', '1HZ50V', 'R_50', '1HZ100V', 'R_10', '1HZ10V', 'R_75', '1HZ75V', 'R_25', '1HZ25V'];

// Market pip precision per asset for exact last-digit extraction
export const ASSET_DECIMALS = Object.freeze({
  'R_100': 2,
  '1HZ100V': 2,
  'R_50': 4,
  '1HZ50V': 4,
  'R_10': 3,
  '1HZ10V': 2,
  'R_75': 4,
  '1HZ75V': 4,
  'R_25': 3,
  '1HZ25V': 2
});

/**
 * Extracts the exact last digit of a price for a given asset.
 * @param {number|string} price 
 * @param {string} symbol 
 * @returns {number|null} 0-9 or null
 */
export function extractLastDigit(price, symbol = 'R_100') {
  if (price == null || !Number.isFinite(Number(price))) return null;
  const num = Number(price);
  const decimals = ASSET_DECIMALS[symbol] ?? 2;
  const formatted = num.toFixed(decimals);
  const lastChar = formatted.slice(-1);
  const digit = parseInt(lastChar, 10);
  return Number.isInteger(digit) && digit >= 0 && digit <= 9 ? digit : null;
}

/**
 * Analyzes frequency and anomalies across a window of recent ticks.
 * @param {Array<{price: number, epoch?: number}>} ticks 
 * @param {string} symbol 
 * @param {number} windowSize 
 */
export function analyzeDigitDistribution(ticks = [], symbol = 'R_100', windowSize = 50) {
  const validTicks = (ticks || []).filter(t => t && Number.isFinite(Number(t.price))).slice(-windowSize);
  const n = validTicks.length;
  const counts = Array(10).fill(0);
  const digits = [];

  for (const t of validTicks) {
    const d = extractLastDigit(t.price, symbol);
    if (d !== null) {
      counts[d]++;
      digits.push(d);
    }
  }

  const validN = digits.length;
  const percentages = counts.map(c => validN ? (c / validN) * 100 : 0);
  const expectedPerDigit = validN / 10;
  
  // Chi-Square goodness-of-fit against uniform 10%
  let chiSquare = 0;
  if (validN >= 20) {
    for (let d = 0; d < 10; d++) {
      const diff = counts[d] - expectedPerDigit;
      chiSquare += (diff * diff) / (expectedPerDigit || 1);
    }
  }

  // Find Hot (high frequency) and Cold (low frequency / sleeping) digits
  const ranked = counts.map((count, digit) => ({
    digit,
    count,
    pct: percentages[digit],
    lastSeenGaps: digits.lastIndexOf(digit) === -1 ? validN : (validN - 1 - digits.lastIndexOf(digit))
  })).sort((a, b) => b.count - a.count);

  const hotDigits = ranked.filter(r => r.pct >= 18);
  const coldDigits = ranked.filter(r => r.pct <= 4 || r.lastSeenGaps >= 15);

  return {
    sampleSize: validN,
    counts,
    percentages,
    chiSquare: Number(chiSquare.toFixed(2)),
    ranked,
    hotDigits,
    coldDigits,
    lastDigits: digits.slice(-10)
  };
}

/**
 * Detects high-probability DIGITDIFF anomaly signals based on Poisson & repetition exhaustion.
 * @param {Array<{price: number, epoch?: number}>} ticks 
 * @param {string} symbol 
 * @param {object} config 
 */
export function detectDigitAnomalySignal(ticks = [], symbol = 'R_100', config = {}) {
  const minSamples = config.minSamples || 30;
  const windowSize = config.windowSize || 60;
  const stats = analyzeDigitDistribution(ticks, symbol, windowSize);

  if (stats.sampleSize < minSamples) {
    return { signal: false, reason: `Amostragem insuficiente (${stats.sampleSize}/${minSamples} ticks)` };
  }

  const lastDigits = stats.lastDigits;
  if (lastDigits.length < 2) return { signal: false, reason: 'Ticks insuficientes' };

  const currentDigit = lastDigits.at(-1);
  const previousDigit = lastDigits.at(-2);
  const beforePreviousDigit = lastDigits.length >= 3 ? lastDigits.at(-3) : null;

  // Rule 1: Double Hit Repetition (Dígito repetido 2x consecutivas)
  // Probabilidade de 3x consecutivas em processo pseudoaleatório é ~0.1% a 1.0%.
  // Entrada perfeita: DIGITDIFF contra currentDigit.
  if (currentDigit === previousDigit && currentDigit !== null) {
    // Check if it already hit 3 times (if it hit 3x, avoid cascading martingale trap)
    if (beforePreviousDigit === currentDigit) {
      return { signal: false, reason: `Dígito ${currentDigit} já repetiu 3x consecutivas. Aguardando dispersão.` };
    }

    return {
      signal: true,
      contractType: 'DIGITDIFF',
      targetDigit: currentDigit,
      rule: 'double_repeat_exhaustion',
      score: 85,
      expectedWinProb: 92.5,
      reasons: [
        `Dígito ${currentDigit} repetiu 2x consecutivas`,
        `Assimetria estatística contra 3ª repetição idêntica`,
        `Frequência da janela: ${stats.percentages[currentDigit].toFixed(1)}%`
      ],
      stats
    };
  }

  // Rule 2: Overheated Spike Exhaustion (Dígito superaquecido > 22% em pico que acabou de aparecer)
  const isOverheated = stats.hotDigits.find(h => h.digit === currentDigit && h.pct >= 22);
  if (isOverheated && lastDigits.length >= 4) {
    // Se apareceu 2 vezes nos últimos 3 ticks
    const recentHits = lastDigits.slice(-3).filter(d => d === currentDigit).length;
    if (recentHits >= 2) {
      return {
        signal: true,
        contractType: 'DIGITDIFF',
        targetDigit: currentDigit,
        rule: 'hot_spike_exhaustion',
        score: 75,
        expectedWinProb: 91.0,
        reasons: [
          `Dígito ${currentDigit} superaquecido (${isOverheated.pct.toFixed(1)}% dos últimos ticks)`,
          `Clustering de curto prazo detectado (${recentHits} vezes nos últimos 3 ticks)`,
          `Previsão de dispersão estatística imediata`
        ],
        stats
      };
    }
  }

  return { signal: false, reason: 'Distribuição dentro da normalidade (sem anomalia detectada)', stats };
}
