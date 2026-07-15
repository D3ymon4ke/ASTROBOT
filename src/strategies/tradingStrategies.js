// Helper: Calculate Exponential Moving Average (EMA)
export function calculateEMA(candles, period) {
  if (candles.length < period) return Array(candles.length).fill(null);
  
  const ema = Array(candles.length).fill(null);
  const k = 2 / (period + 1);
  
  // Calculate initial SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  ema[period - 1] = sum / period;
  
  for (let i = period; i < candles.length; i++) {
    ema[i] = candles[i].close * k + ema[i - 1] * (1 - k);
  }
  
  return ema;
}

// Helper: Get candle color (Green = 'CALL', Red = 'PUT', Doji/Tie = 'NEUTRAL')
export function getCandleColor(candle) {
  if (!candle) return 'NEUTRAL';
  if (candle.close > candle.open) return 'CALL';
  if (candle.close < candle.open) return 'PUT';
  return 'NEUTRAL'; // Doji
}

/**
 * Evaluates the outcome of a trade with potential Martingale steps.
 * @param {Array} candles - Array of candles.
 * @param {number} entryIndex - The index where we enter the trade (start of candle).
 * @param {string} direction - 'CALL' or 'PUT'.
 * @param {number} maxMartingale - Maximum martingale steps (0, 1, 2...).
 * @returns {object} { result: 'WIN' | 'LOSS', steps: number, profitFactor: number }
 */
export function evaluateTrade(candles, entryIndex, direction, maxMartingale = 0) {
  let step = 0;
  while (step <= maxMartingale) {
    const evalIndex = entryIndex + step;
    if (evalIndex >= candles.length) {
      return { result: 'PENDING', steps: step };
    }
    
    const candleColor = getCandleColor(candles[evalIndex]);
    if (candleColor === direction) {
      return { result: 'WIN', steps: step };
    }
    
    // If it's a Doji, it's usually a loss or a tie. In binary options, ties depend on the broker, 
    // but on Deriv, standard rise/fall returns 0 or loses. Let's treat it as a Loss for safety.
    step++;
  }
  
  return { result: 'LOSS', steps: maxMartingale };
}

/**
 * 1. Moving Average Crossover (Cruzamento de Médias)
 * Fast EMA (9) crosses Slow EMA (21)
 */
export function runMACrossoverBacktest(candles, maxMartingale = 0) {
  if (candles.length < 25) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  const emaFast = calculateEMA(candles, 9);
  const emaSlow = calculateEMA(candles, 21);
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  for (let i = 21; i < candles.length - 1; i++) {
    const prevFast = emaFast[i - 1];
    const prevSlow = emaSlow[i - 1];
    const currFast = emaFast[i];
    const currSlow = emaSlow[i];
    
    if (!prevFast || !prevSlow || !currFast || !currSlow) continue;
    
    let direction = null;
    if (prevFast <= prevSlow && currFast > currSlow) {
      direction = 'CALL'; // Golden Cross (Upward)
    } else if (prevFast >= prevSlow && currFast < currSlow) {
      direction = 'PUT'; // Death Cross (Downward)
    }
    
    if (direction) {
      // Trade starts on candle i + 1
      const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
      
      if (evaluation.result !== 'PENDING') {
        const isWin = evaluation.result === 'WIN';
        if (isWin) wins++;
        else losses++;
        
        signals.push({
          epoch: candles[i + 1].epoch,
          time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
          direction,
          result: evaluation.result,
          steps: evaluation.steps,
          candleIndex: i + 1
        });
        
        // Skip evaluated candles to avoid overlapping trades during Martingale
        i += evaluation.steps;
      }
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 2. MHI (Majority High Index)
 * 5-candle cycle. Checks colors of candles 3, 4, 5. Enter on candle 1 of next cycle.
 * Minority is the standard MHI, Majority is the MHI Majority.
 */
export function runMHIBacktest(candles, maxMartingale = 0, mode = 'minority') {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  // Group candles into 5-minute blocks
  // A cycle starts when epoch minute % 5 === 0
  const cycles = {};
  
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 5);
    
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) {
      cycles[cycleId] = [];
    }
    // We store the candle and its index in the main array
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 5 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length - 1; cIdx++) {
    const currentCycleId = cycleIds[cIdx];
    const nextCycleId = cycleIds[cIdx + 1];
    
    const currentCycle = cycles[currentCycleId];
    const nextCycle = cycles[nextCycleId];
    
    // We need candles 3, 4, 5 (positions 2, 3, 4) in the current cycle
    const c3 = currentCycle.find(item => item.minutePos === 2);
    const c4 = currentCycle.find(item => item.minutePos === 3);
    const c5 = currentCycle.find(item => item.minutePos === 4);
    
    if (!c3 || !c4 || !c5) continue;
    
    const color3 = getCandleColor(c3.candle);
    const color4 = getCandleColor(c4.candle);
    const color5 = getCandleColor(c5.candle);
    
    // Ignore if there are neutral dojis that disrupt the count
    if (color3 === 'NEUTRAL' || color4 === 'NEUTRAL' || color5 === 'NEUTRAL') continue;
    
    let greenCount = 0;
    let redCount = 0;
    [color3, color4, color5].forEach(color => {
      if (color === 'CALL') greenCount++;
      if (color === 'PUT') redCount++;
    });
    
    let direction = null;
    if (mode === 'minority') {
      // Bet on minority color
      direction = greenCount < redCount ? 'CALL' : 'PUT';
    } else {
      // Bet on majority color
      direction = greenCount > redCount ? 'CALL' : 'PUT';
    }
    
    // Entry is on Candle 1 of the NEXT cycle (minutePos === 0)
    const nextC1 = nextCycle.find(item => item.minutePos === 0);
    if (!nextC1) continue;
    
    // We evaluate the trade starting at nextC1's index
    const evaluation = evaluateTrade(candles, nextC1.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: nextC1.candle.epoch,
        time: new Date(nextC1.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: nextC1.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 3. Torres Gêmeas (Twin Towers)
 * 5-candle cycle. Compare Candle 1 and Candle 5 of the same cycle.
 * Expect Candle 5 to have the SAME color as Candle 1.
 */
export function runTwinTowersBacktest(candles, maxMartingale = 0) {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 5);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 5 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length; cIdx++) {
    const cycle = cycles[cycleIds[cIdx]];
    
    // We need Candle 1 (minutePos === 0) and Candle 5 (minutePos === 4) of the same cycle
    const c1 = cycle.find(item => item.minutePos === 0);
    const c5 = cycle.find(item => item.minutePos === 4);
    
    if (!c1 || !c5) continue;
    
    const color1 = getCandleColor(c1.candle);
    if (color1 === 'NEUTRAL') continue;
    
    // Entry is on Candle 5 (minutePos === 4)
    // Expecting the SAME color as Candle 1
    const direction = color1; 
    
    const evaluation = evaluateTrade(candles, c5.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: c5.candle.epoch,
        time: new Date(c5.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: c5.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 4. Três Mosqueteiros (Three Musketeers)
 * Checks if the last 3 closed candles have the same color. 
 * Enters opposite (reversal) on the 4th candle.
 */
export function runThreeMusketeersBacktest(candles, maxMartingale = 0) {
  if (candles.length < 5) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  for (let i = 2; i < candles.length - 1; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];
    
    const col1 = getCandleColor(c1);
    const col2 = getCandleColor(c2);
    const col3 = getCandleColor(c3);
    
    if (col1 === 'NEUTRAL' || col2 === 'NEUTRAL' || col3 === 'NEUTRAL') continue;
    
    if (col1 === col2 && col2 === col3) {
      // All 3 have the same color!
      // Reversal direction
      const direction = col1 === 'CALL' ? 'PUT' : 'CALL';
      
      // Trade starts on candle i + 1
      const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
      
      if (evaluation.result !== 'PENDING') {
        const isWin = evaluation.result === 'WIN';
        if (isWin) wins++;
        else losses++;
        
        signals.push({
          epoch: candles[i + 1].epoch,
          time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
          direction,
          result: evaluation.result,
          steps: evaluation.steps,
          candleIndex: i + 1
        });
        
        // Skip evaluated candles to avoid overlapping trades during Martingale
        i += evaluation.steps;
      }
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 5. Padrão 23
 * 5-candle cycle. Reference: Candle 1. Entry: Candle 2, betting SAME color.
 * Martingale: Gale 1 on Candle 3, Gale 2 on Candle 4.
 */
export function runPadrao23Backtest(candles, maxMartingale = 0) {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 5);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 5 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length; cIdx++) {
    const cycle = cycles[cycleIds[cIdx]];
    const c1 = cycle.find(item => item.minutePos === 0);
    const c2 = cycle.find(item => item.minutePos === 1);
    
    if (!c1 || !c2) continue;
    
    const direction = getCandleColor(c1.candle);
    if (direction === 'NEUTRAL') continue;
    
    const evaluation = evaluateTrade(candles, c2.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: c2.candle.epoch,
        time: new Date(c2.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: c2.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 6. Padrão 3x1
 * 5-candle cycle. Look at Candles 1, 2, 3. Entry: Candle 5, betting MINORITY color.
 */
export function runPadrao3x1Backtest(candles, maxMartingale = 0) {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 5);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 5 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length; cIdx++) {
    const cycle = cycles[cycleIds[cIdx]];
    const c1 = cycle.find(item => item.minutePos === 0);
    const c2 = cycle.find(item => item.minutePos === 1);
    const c3 = cycle.find(item => item.minutePos === 2);
    const c5 = cycle.find(item => item.minutePos === 4);
    
    if (!c1 || !c2 || !c3 || !c5) continue;
    
    const color1 = getCandleColor(c1.candle);
    const color2 = getCandleColor(c2.candle);
    const color3 = getCandleColor(c3.candle);
    
    if (color1 === 'NEUTRAL' || color2 === 'NEUTRAL' || color3 === 'NEUTRAL') continue;
    
    let greenCount = 0;
    let redCount = 0;
    [color1, color2, color3].forEach(color => {
      if (color === 'CALL') greenCount++;
      if (color === 'PUT') redCount++;
    });
    
    const direction = greenCount < redCount ? 'CALL' : 'PUT';
    
    const evaluation = evaluateTrade(candles, c5.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: c5.candle.epoch,
        time: new Date(c5.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: c5.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 7. Padrão Ímpar
 * 5-candle cycle. Reference: Candle 3. Entry: Candle 1 of NEXT cycle, betting SAME color.
 */
export function runPadraoImparBacktest(candles, maxMartingale = 0) {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 5);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 5 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length - 1; cIdx++) {
    const currentCycle = cycles[cycleIds[cIdx]];
    const nextCycle = cycles[cycleIds[cIdx + 1]];
    
    const c3 = currentCycle.find(item => item.minutePos === 2);
    const nextC1 = nextCycle.find(item => item.minutePos === 0);
    
    if (!c3 || !nextC1) continue;
    
    const direction = getCandleColor(c3.candle);
    if (direction === 'NEUTRAL') continue;
    
    const evaluation = evaluateTrade(candles, nextC1.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: nextC1.candle.epoch,
        time: new Date(nextC1.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: nextC1.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 8. Padrão R7
 * 10-candle cycle. Reference: Candle 9 of previous block. Entry: Candle 7 of current block, betting SAME color.
 */
export function runR7Backtest(candles, maxMartingale = 0) {
  if (candles.length < 20) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 10);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 10 });
  }
  
  const cycleIds = Object.keys(cycles).sort();
  
  for (let cIdx = 0; cIdx < cycleIds.length - 1; cIdx++) {
    const prevCycle = cycles[cycleIds[cIdx]];
    const currCycle = cycles[cycleIds[cIdx + 1]];
    
    const prevC9 = prevCycle.find(item => item.minutePos === 8);
    const currC7 = currCycle.find(item => item.minutePos === 6);
    
    if (!prevC9 || !currC7) continue;
    
    const direction = getCandleColor(prevC9.candle);
    if (direction === 'NEUTRAL') continue;
    
    const evaluation = evaluateTrade(candles, currC7.index, direction, maxMartingale);
    
    if (evaluation.result !== 'PENDING') {
      const isWin = evaluation.result === 'WIN';
      if (isWin) wins++;
      else losses++;
      
      signals.push({
        epoch: currC7.candle.epoch,
        time: new Date(currC7.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: currC7.index
      });
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 9. Pullback na Média (EMA 20)
 * Trend-following pullback entry on EMA 20 touch.
 */
export function runPullbackBacktest(candles, maxMartingale = 0) {
  if (candles.length < 25) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  const ema20 = calculateEMA(candles, 20);
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  for (let i = 21; i < candles.length - 1; i++) {
    const c = candles[i];
    const emaVal = ema20[i];
    if (!emaVal) continue;
    
    const isUptrendPullback = c.close > emaVal && c.low <= emaVal && c.close < c.open;
    const isDowntrendPullback = c.close < emaVal && c.high >= emaVal && c.close > c.open;
    
    let direction = null;
    if (isUptrendPullback) {
      direction = 'CALL';
    } else if (isDowntrendPullback) {
      direction = 'PUT';
    }
    
    if (direction) {
      const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
      
      if (evaluation.result !== 'PENDING') {
        const isWin = evaluation.result === 'WIN';
        if (isWin) wins++;
        else losses++;
        
        signals.push({
          epoch: candles[i + 1].epoch,
          time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
          direction,
          result: evaluation.result,
          steps: evaluation.steps,
          candleIndex: i + 1
        });
        
        i += evaluation.steps;
      }
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * 10. Reversão (Hammer / Shooting Star)
 * Price Action Reversal pattern after continuous same-direction candles.
 */
export function runReversalBacktest(candles, maxMartingale = 0) {
  if (candles.length < 10) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  let wins = 0;
  let losses = 0;
  const signals = [];
  
  for (let i = 4; i < candles.length - 1; i++) {
    const c = candles[i];
    const body = Math.abs(c.close - c.open);
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;
    
    if (body < 0.0001) continue;
    
    const prev1 = candles[i - 1];
    const prev2 = candles[i - 2];
    const prev3 = candles[i - 3];
    
    const isBearishTrend = prev1.close < prev1.open && prev2.close < prev2.open && prev3.close < prev3.open;
    const isBullishTrend = prev1.close > prev1.open && prev2.close > prev2.open && prev3.close > prev3.open;
    
    let direction = null;
    if (isBearishTrend && lowerShadow >= 2 * body && upperShadow <= 0.3 * body) {
      direction = 'CALL';
    } else if (isBullishTrend && upperShadow >= 2 * body && lowerShadow <= 0.3 * body) {
      direction = 'PUT';
    }
    
    if (direction) {
      const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
      
      if (evaluation.result !== 'PENDING') {
        const isWin = evaluation.result === 'WIN';
        if (isWin) wins++;
        else losses++;
        
        signals.push({
          epoch: candles[i + 1].epoch,
          time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
          direction,
          result: evaluation.result,
          steps: evaluation.steps,
          candleIndex: i + 1
        });
        i += evaluation.steps;
      }
    }
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 12. Pivô de 1-2-3 (pivot_123)
export function runPivot123Backtest(candles, maxMartingale = 0) {
  if (candles.length < 15) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  let wins = 0;
  let losses = 0;
  const signals = [];

  for (let i = 10; i < candles.length - 1; i++) {
    let p1 = -1, p2 = -1, p3 = -1;
    
    // Find local low p3 in last 4 candles [i-4, i-1]
    for (let j = i - 1; j >= i - 4; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
        p3 = j;
        break;
      }
    }
    // Find local high p2 before p3
    if (p3 > 2) {
      for (let j = p3 - 1; j >= p3 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
          p2 = j;
          break;
        }
      }
    }
    // Find local low p1 before p2
    if (p2 > 2) {
      for (let j = p2 - 1; j >= p2 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
          p1 = j;
          break;
        }
      }
    }

    if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
      // Check Call Setup
      if (candles[p3].low > candles[p1].low && candles[p2].high > candles[p3].low) {
        // Breakout of Point 2 High
        if (candles[i-1].close <= candles[p2].high && candles[i].close > candles[p2].high) {
          const evaluation = evaluateTrade(candles, i + 1, 'CALL', maxMartingale);
          if (evaluation.result !== 'PENDING') {
            if (evaluation.result === 'WIN') wins++; else losses++;
            signals.push({
              epoch: candles[i + 1].epoch,
              time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
              direction: 'CALL',
              result: evaluation.result,
              steps: evaluation.steps,
              candleIndex: i + 1
            });
            i += evaluation.steps;
            continue;
          }
        }
      }
    }

    // Now check Put Setup
    p1 = -1; p2 = -1; p3 = -1;
    for (let j = i - 1; j >= i - 4; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
        p3 = j;
        break;
      }
    }
    if (p3 > 2) {
      for (let j = p3 - 1; j >= p3 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
          p2 = j;
          break;
        }
      }
    }
    if (p2 > 2) {
      for (let j = p2 - 1; j >= p2 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
          p1 = j;
          break;
        }
      }
    }

    if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
      if (candles[p3].high < candles[p1].high && candles[p2].low < candles[p3].high) {
        // Breakout of Point 2 Low
        if (candles[i-1].close >= candles[p2].low && candles[i].close < candles[p2].low) {
          const evaluation = evaluateTrade(candles, i + 1, 'PUT', maxMartingale);
          if (evaluation.result !== 'PENDING') {
            if (evaluation.result === 'WIN') wins++; else losses++;
            signals.push({
              epoch: candles[i + 1].epoch,
              time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
              direction: 'PUT',
              result: evaluation.result,
              steps: evaluation.steps,
              candleIndex: i + 1
            });
            i += evaluation.steps;
          }
        }
      }
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 13. 123 de Ross (ross_hook)
export function runRossHookBacktest(candles, maxMartingale = 0) {
  if (candles.length < 20) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  let wins = 0;
  let losses = 0;
  const signals = [];

  for (let i = 12; i < candles.length - 1; i++) {
    let hookHigh = -1;
    let hookIndex = -1;

    for (let j = i - 2; j >= i - 6; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
        hookHigh = candles[j].high;
        hookIndex = j;
        break;
      }
    }

    if (hookIndex !== -1 && candles[hookIndex + 1]) {
      const hasPullback = candles[hookIndex + 1].close < hookHigh;
      if (hasPullback) {
        if (candles[i-1].close <= hookHigh && candles[i].close > hookHigh) {
          const evaluation = evaluateTrade(candles, i + 1, 'CALL', maxMartingale);
          if (evaluation.result !== 'PENDING') {
            if (evaluation.result === 'WIN') wins++; else losses++;
            signals.push({
              epoch: candles[i + 1].epoch,
              time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
              direction: 'CALL',
              result: evaluation.result,
              steps: evaluation.steps,
              candleIndex: i + 1
            });
            i += evaluation.steps;
            continue;
          }
        }
      }
    }

    let hookLow = -1;
    hookIndex = -1;
    for (let j = i - 2; j >= i - 6; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
        hookLow = candles[j].low;
        hookIndex = j;
        break;
      }
    }

    if (hookIndex !== -1 && candles[hookIndex + 1]) {
      const hasPullback = candles[hookIndex + 1].close > hookLow;
      if (hasPullback) {
        if (candles[i-1].close >= hookLow && candles[i].close < hookLow) {
          const evaluation = evaluateTrade(candles, i + 1, 'PUT', maxMartingale);
          if (evaluation.result !== 'PENDING') {
            if (evaluation.result === 'WIN') wins++; else losses++;
            signals.push({
              epoch: candles[i + 1].epoch,
              time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
              direction: 'PUT',
              result: evaluation.result,
              steps: evaluation.steps,
              candleIndex: i + 1
            });
            i += evaluation.steps;
          }
        }
      }
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 14. Padrão R10 (r10)
export function runR10Backtest(candles, maxMartingale = 0) {
  if (candles.length < 15) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  let wins = 0;
  let losses = 0;
  const signals = [];

  const cycles = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.epoch * 1000);
    const minute = date.getMinutes();
    const cycleStartMinute = minute - (minute % 10);
    const cycleId = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${cycleStartMinute}`;
    
    if (!cycles[cycleId]) cycles[cycleId] = [];
    cycles[cycleId].push({ candle: c, index: i, minutePos: minute % 10 });
  }

  const cycleIds = Object.keys(cycles).sort();
  for (let cIdx = 0; cIdx < cycleIds.length; cIdx++) {
    const cycle = cycles[cycleIds[cIdx]];
    const c1 = cycle.find(item => item.minutePos === 0);
    const c2 = cycle.find(item => item.minutePos === 1);
    const c3 = cycle.find(item => item.minutePos === 2);
    const c10 = cycle.find(item => item.minutePos === 9);

    if (!c1 || !c2 || !c3 || !c10) continue;

    const col1 = getCandleColor(c1.candle);
    const col2 = getCandleColor(c2.candle);
    const col3 = getCandleColor(c3.candle);

    if (col1 === 'NEUTRAL' || col2 === 'NEUTRAL' || col3 === 'NEUTRAL') continue;

    let greenCount = 0;
    let redCount = 0;
    [col1, col2, col3].forEach(col => {
      if (col === 'CALL') greenCount++;
      if (col === 'PUT') redCount++;
    });

    const direction = greenCount > redCount ? 'PUT' : 'CALL';

    const evaluation = evaluateTrade(candles, c10.index, direction, maxMartingale);
    if (evaluation.result !== 'PENDING') {
      if (evaluation.result === 'WIN') wins++; else losses++;
      signals.push({
        epoch: c10.candle.epoch,
        time: new Date(c10.candle.epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: c10.index
      });
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 15. Marubozu (marubozu)
export function runMarubozuBacktest(candles, maxMartingale = 0) {
  if (candles.length < 15) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  let wins = 0;
  let losses = 0;
  const signals = [];

  for (let i = 10; i < candles.length - 1; i++) {
    const c = candles[i];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;

    if (range === 0 || body === 0) continue;

    const bodyRatio = body / range;
    if (bodyRatio < 0.85) continue;

    let sumBody = 0;
    for (let j = i - 10; j < i; j++) {
      if (candles[j]) sumBody += Math.abs(candles[j].close - candles[j].open);
    }
    const avgBody = sumBody / 10;
    if (body < avgBody * 1.3) continue;

    const direction = c.close > c.open ? 'CALL' : 'PUT';

    const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
    if (evaluation.result !== 'PENDING') {
      if (evaluation.result === 'WIN') wins++; else losses++;
      signals.push({
        epoch: candles[i + 1].epoch,
        time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
        direction,
        result: evaluation.result,
        steps: evaluation.steps,
        candleIndex: i + 1
      });
      i += evaluation.steps;
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 16. BOS + ChoCH (bos_choch)
export function runBosChochBacktest(candles, maxMartingale = 0) {
  if (candles.length < 25) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  let wins = 0;
  let losses = 0;
  const signals = [];

  for (let i = 21; i < candles.length - 1; i++) {
    const e20 = ema20[i];
    const e50 = ema50[i];
    if (!e20 || !e50) continue;

    let maxHigh = -1;
    let minLow = 9999999;
    for (let j = i - 6; j < i; j++) {
      if (candles[j]) {
        if (candles[j].high > maxHigh) maxHigh = candles[j].high;
        if (candles[j].low < minLow) minLow = candles[j].low;
      }
    }

    let direction = null;
    if (e20 > e50 && candles[i-1].close <= maxHigh && candles[i].close > maxHigh) {
      direction = 'CALL';
    }
    else if (e20 < e50 && candles[i-1].close >= minLow && candles[i].close < minLow) {
      direction = 'PUT';
    }

    if (direction) {
      const evaluation = evaluateTrade(candles, i + 1, direction, maxMartingale);
      if (evaluation.result !== 'PENDING') {
        if (evaluation.result === 'WIN') wins++; else losses++;
        signals.push({
          epoch: candles[i + 1].epoch,
          time: new Date(candles[i + 1].epoch * 1000).toLocaleTimeString(),
          direction,
          result: evaluation.result,
          steps: evaluation.steps,
          candleIndex: i + 1
        });
        i += evaluation.steps;
      }
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

// 17. Vela Mestra / Master Candle (master_candle)
export function runMasterCandleBacktest(candles, maxMartingale = 0) {
  if (candles.length < 15) return { winRate: 0, totalTrades: 0, wins: 0, losses: 0, signals: [] };
  let wins = 0;
  let losses = 0;
  const signals = [];

  for (let i = 5; i < candles.length - 1; i++) {
    const master = candles[i-4];
    if (!master) continue;
    const masterRange = master.high - master.low;

    let sumRange = 0;
    for (let j = i - 9; j < i - 4; j++) {
      if (j >= 0 && candles[j]) sumRange += (candles[j].high - candles[j].low);
    }
    const avgRange = sumRange / 5;
    if (masterRange < avgRange * 1.8) continue;

    let isInside = true;
    for (let j = i - 3; j <= i; j++) {
      if (!candles[j] || candles[j].high > master.high || candles[j].low < master.low) {
        isInside = false;
        break;
      }
    }

    if (isInside) {
      let breakoutIdx = -1;
      let direction = null;

      for (let k = i + 1; k < candles.length; k++) {
        const c = candles[k];
        if (c.close > master.high) {
          breakoutIdx = k;
          direction = 'CALL';
          break;
        } else if (c.close < master.low) {
          breakoutIdx = k;
          direction = 'PUT';
          break;
        }
      }

      if (breakoutIdx !== -1 && breakoutIdx < candles.length - 1) {
        const evaluation = evaluateTrade(candles, breakoutIdx + 1, direction, maxMartingale);
        if (evaluation.result !== 'PENDING') {
          if (evaluation.result === 'WIN') wins++; else losses++;
          signals.push({
            epoch: candles[breakoutIdx + 1].epoch,
            time: new Date(candles[breakoutIdx + 1].epoch * 1000).toLocaleTimeString(),
            direction,
            result: evaluation.result,
            steps: evaluation.steps,
            candleIndex: breakoutIdx + 1
          });
          i = breakoutIdx + evaluation.steps;
        }
      }
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return { winRate, totalTrades: total, wins, losses, signals };
}

/**
 * Run backtests for all strategies and return their stats
 */
export function analyzeStrategies(candles, maxMartingale = 0) {
  const maResult = runMACrossoverBacktest(candles, maxMartingale);
  const mhiMinorityResult = runMHIBacktest(candles, maxMartingale, 'minority');
  const mhiMajorityResult = runMHIBacktest(candles, maxMartingale, 'majority');
  const twinTowersResult = runTwinTowersBacktest(candles, maxMartingale);
  const threeMusketeersResult = runThreeMusketeersBacktest(candles, maxMartingale);
  const padrao23Result = runPadrao23Backtest(candles, maxMartingale);
  const padrao3x1Result = runPadrao3x1Backtest(candles, maxMartingale);
  const padraoImparResult = runPadraoImparBacktest(candles, maxMartingale);
  const r7Result = runR7Backtest(candles, maxMartingale);
  const pullbackResult = runPullbackBacktest(candles, maxMartingale);
  const reversalResult = runReversalBacktest(candles, maxMartingale);
  
  const pivotResult = runPivot123Backtest(candles, maxMartingale);
  const rossResult = runRossHookBacktest(candles, maxMartingale);
  const r10Result = runR10Backtest(candles, maxMartingale);
  const marubozuResult = runMarubozuBacktest(candles, maxMartingale);
  const bosChochResult = runBosChochBacktest(candles, maxMartingale);
  const masterCandleResult = runMasterCandleBacktest(candles, maxMartingale);
  
  return [
    {
      id: 'ma_crossover',
      name: 'Cruzamento de Médias (9/21)',
      winRate: maResult.winRate,
      totalTrades: maResult.totalTrades,
      wins: maResult.wins,
      losses: maResult.losses,
      description: 'Entrada baseada no cruzamento da Média Móvel Rápida (EMA 9) sobre a Média Móvel Lenta (EMA 21).'
    },
    {
      id: 'mhi_minority',
      name: 'MHI Padrão (Minoria)',
      winRate: mhiMinorityResult.winRate,
      totalTrades: mhiMinorityResult.totalTrades,
      wins: mhiMinorityResult.wins,
      losses: mhiMinorityResult.losses,
      description: 'Analisa as últimas 3 velas do ciclo de 5 minutos. Entra a favor da cor de menor ocorrência.'
    },
    {
      id: 'mhi_majority',
      name: 'MHI Maioria',
      winRate: mhiMajorityResult.winRate,
      totalTrades: mhiMajorityResult.totalTrades,
      wins: mhiMajorityResult.wins,
      losses: mhiMajorityResult.losses,
      description: 'Analisa as últimas 3 velas do ciclo de 5 minutos. Entra a favor da cor de maior ocorrência.'
    },
    {
      id: 'twin_towers',
      name: 'Torres Gêmeas',
      winRate: twinTowersResult.winRate,
      totalTrades: twinTowersResult.totalTrades,
      wins: twinTowersResult.wins,
      losses: twinTowersResult.losses,
      description: 'Analisa a 1ª vela do ciclo de 5 minutos. Entra na 5ª vela prevendo a mesma cor.'
    },
    {
      id: 'three_musketeers',
      name: 'Três Mosqueteiros',
      winRate: threeMusketeersResult.winRate,
      totalTrades: threeMusketeersResult.totalTrades,
      wins: threeMusketeersResult.wins,
      losses: threeMusketeersResult.losses,
      description: 'Detecta 3 velas consecutivas da mesma cor e entra na 4ª vela prevendo reversão.'
    },
    {
      id: 'padrao_23',
      name: 'Padrão 23',
      winRate: padrao23Result.winRate,
      totalTrades: padrao23Result.totalTrades,
      wins: padrao23Result.wins,
      losses: padrao23Result.losses,
      description: 'Analisa a 1ª vela do ciclo de 5 minutos. Entra na 2ª vela prevendo a mesma cor.'
    },
    {
      id: 'padrao_3x1',
      name: 'Padrão 3x1',
      winRate: padrao3x1Result.winRate,
      totalTrades: padrao3x1Result.totalTrades,
      wins: padrao3x1Result.wins,
      losses: padrao3x1Result.losses,
      description: 'Analisa as 3 primeiras velas do ciclo de 5 minutos. Entra na 5ª vela na cor da minoria.'
    },
    {
      id: 'padrao_impar',
      name: 'Padrão Ímpar',
      winRate: padraoImparResult.winRate,
      totalTrades: padraoImparResult.totalTrades,
      wins: padraoImparResult.wins,
      losses: padraoImparResult.losses,
      description: 'Analisa a 3ª vela do ciclo de 5 minutos. Entra na 1ª vela do próximo ciclo na mesma cor.'
    },
    {
      id: 'r7',
      name: 'Padrão R7',
      winRate: r7Result.winRate,
      totalTrades: r7Result.totalTrades,
      wins: r7Result.wins,
      losses: r7Result.losses,
      description: 'Analisa a 9ª vela do ciclo de 10 minutos anterior. Entra na 7ª vela do ciclo atual na mesma cor.'
    },
    {
      id: 'pullback',
      name: 'Pullback na Média (EMA 20)',
      winRate: pullbackResult.winRate,
      totalTrades: pullbackResult.totalTrades,
      wins: pullbackResult.wins,
      losses: pullbackResult.losses,
      description: 'Entrada de tendência em toques na Média Móvel EMA 20.'
    },
    {
      id: 'reversal',
      name: 'Reversão (Hammer / Shooting)',
      winRate: reversalResult.winRate,
      totalTrades: reversalResult.totalTrades,
      wins: reversalResult.wins,
      losses: reversalResult.losses,
      description: 'Entrada contra a tendência ao identificar velas de exaustão Hammer/Shooting Star.'
    },
    {
      id: 'pivot_123',
      name: 'Pivô de 1-2-3',
      winRate: pivotResult.winRate,
      totalTrades: pivotResult.totalTrades,
      wins: pivotResult.wins,
      losses: pivotResult.losses,
      description: 'Entrada no rompimento do Pivô de Alta (ponto 2) ou Pivô de Baixa.'
    },
    {
      id: 'ross_hook',
      name: '123 de Ross',
      winRate: rossResult.winRate,
      totalTrades: rossResult.totalTrades,
      wins: rossResult.wins,
      losses: rossResult.losses,
      description: 'Entrada no rompimento do Ross Hook após a formação e rompimento de um pivô 1-2-3.'
    },
    {
      id: 'r10',
      name: 'Padrão R10',
      winRate: r10Result.winRate,
      totalTrades: r10Result.totalTrades,
      wins: r10Result.wins,
      losses: r10Result.losses,
      description: 'Analisa as primeiras 3 velas do ciclo de 10 min e entra contra a maioria na 10ª vela.'
    },
    {
      id: 'marubozu',
      name: 'Marubozu',
      winRate: marubozuResult.winRate,
      totalTrades: marubozuResult.totalTrades,
      wins: marubozuResult.wins,
      losses: marubozuResult.losses,
      description: 'Vela sem pavios e corpo gigante. Entrada a favor do forte fluxo de tendência.'
    },
    {
      id: 'bos_choch',
      name: 'BOS + ChoCH',
      winRate: bosChochResult.winRate,
      totalTrades: bosChochResult.totalTrades,
      wins: bosChochResult.wins,
      losses: bosChochResult.losses,
      description: 'SMC: Quebra de Estrutura (BOS) após Mudança de Caractere (ChoCH) identificada.'
    },
    {
      id: 'master_candle',
      name: 'Vela Mestra (Master Candle)',
      winRate: masterCandleResult.winRate,
      totalTrades: masterCandleResult.totalTrades,
      wins: masterCandleResult.wins,
      losses: masterCandleResult.losses,
      description: 'Vela com grande amplitude que contém as 4 velas seguintes. Entrada no rompimento das extremidades.'
    }
  ];
}

/**
 * Checks for live signal for a given strategy and last candle set
 * @returns {object|null} - { direction: 'CALL'|'PUT', name: string }
 */
export function getLiveSignal(strategyId, candles, maxMartingale = 0) {
  if (candles.length < 5) return null;
  const lastIndex = candles.length - 1;
  const lastCandle = candles[lastIndex];
  const date = new Date(lastCandle.epoch * 1000);
  const min = date.getMinutes();
  const sec = date.getSeconds();
  
  // Note: Binary options signals are evaluated at the exact closing second of a candle (e.g. at 59 seconds)
  // to enter at the opening (00 second) of the next candle.
  
  if (strategyId === 'ma_crossover') {
    const emaFast = calculateEMA(candles, 9);
    const emaSlow = calculateEMA(candles, 21);
    
    const prevFast = emaFast[lastIndex - 1];
    const prevSlow = emaSlow[lastIndex - 1];
    const currFast = emaFast[lastIndex];
    const currSlow = emaSlow[lastIndex];
    
    if (prevFast <= prevSlow && currFast > currSlow) {
      return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
    }
    if (prevFast >= prevSlow && currFast < currSlow) {
      return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
    }
  }
  
  if (strategyId === 'mhi_minority' || strategyId === 'mhi_majority') {
    // MHI checks at the close of candle 5 (minutePos === 4)
    // Candle 5 is active when minute % 5 === 4.
    // If it's closed (i.e. we are at the very end of minute Pos 4, or we are at start of next cycle),
    // let's check the current last 3 candles: indices lastIndex - 2, lastIndex - 1, lastIndex.
    // Ensure they represent minute positions 2, 3, 4 of the current 5-minute block.
    const mPos = min % 5;
    if (mPos === 4) {
      const color3 = getCandleColor(candles[lastIndex - 2]);
      const color4 = getCandleColor(candles[lastIndex - 1]);
      const color5 = getCandleColor(lastCandle);
      
      if (color3 !== 'NEUTRAL' && color4 !== 'NEUTRAL' && color5 !== 'NEUTRAL') {
        let greenCount = 0;
        let redCount = 0;
        [color3, color4, color5].forEach(col => {
          if (col === 'CALL') greenCount++;
          if (col === 'PUT') redCount++;
        });
        
        const isMinority = strategyId === 'mhi_minority';
        let direction = null;
        if (isMinority) {
          direction = greenCount < redCount ? 'CALL' : 'PUT';
        } else {
          direction = greenCount > redCount ? 'CALL' : 'PUT';
        }
        
        // Signal trigger time is start of next minute (which is minutePos 0, start of next cycle)
        return { direction, triggerTime: lastCandle.epoch + 60 };
      }
    }
  }
  
  if (strategyId === 'twin_towers') {
    // Torres Gêmeas:
    // Enter at the start of Candle 5 (minutePos 4).
    // This means we analyze Candle 1 (minutePos 0) of the SAME cycle.
    // Candle 1 was 4 minutes ago. Let's find it.
    // The active candle is Candle 4 (minutePos 3) just closing, and we enter on Candle 5 (minutePos 4).
    const mPos = min % 5;
    if (mPos === 3) {
      // Candle 1 index should be lastIndex - 3
      const c1 = candles[lastIndex - 3];
      if (c1) {
        const color1 = getCandleColor(c1);
        if (color1 !== 'NEUTRAL') {
          // Same color as Candle 1
          return { direction: color1, triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }
  
  if (strategyId === 'three_musketeers') {
    // Three Musketeers:
    // Look at last 3 candles (lastIndex - 2, lastIndex - 1, lastIndex).
    // If same color, enter reversal on next candle.
    const color1 = getCandleColor(candles[lastIndex - 2]);
    const color2 = getCandleColor(candles[lastIndex - 1]);
    const color3 = getCandleColor(lastCandle);
    
    if (color1 !== 'NEUTRAL' && color1 === color2 && color2 === color3) {
      const direction = color1 === 'CALL' ? 'PUT' : 'CALL';
      return { direction, triggerTime: lastCandle.epoch + 60 };
    }
  }

  if (strategyId === 'padrao_23') {
    // Reference: Candle 1 (minutePos === 0).
    // Entry: Candle 2 (minutePos === 1).
    // Trigger signal at end of Candle 1 (mPos === 0).
    const mPos = min % 5;
    if (mPos === 0) {
      const color1 = getCandleColor(lastCandle);
      if (color1 !== 'NEUTRAL') {
        return { direction: color1, triggerTime: lastCandle.epoch + 60 };
      }
    }
  }

  if (strategyId === 'padrao_3x1') {
    // Reference: Minority of Candles 1, 2, 3 (minutePos 0, 1, 2).
    // Entry: Candle 5 (minutePos 4).
    // Trigger signal at end of Candle 4 (mPos === 3).
    const mPos = min % 5;
    if (mPos === 3) {
      const c1 = candles[lastIndex - 3];
      const c2 = candles[lastIndex - 2];
      const c3 = candles[lastIndex - 1];
      if (c1 && c2 && c3) {
        const color1 = getCandleColor(c1);
        const color2 = getCandleColor(c2);
        const color3 = getCandleColor(c3);
        if (color1 !== 'NEUTRAL' && color2 !== 'NEUTRAL' && color3 !== 'NEUTRAL') {
          let greenCount = 0;
          let redCount = 0;
          [color1, color2, color3].forEach(c => {
            if (c === 'CALL') greenCount++;
            if (c === 'PUT') redCount++;
          });
          const direction = greenCount < redCount ? 'CALL' : 'PUT';
          return { direction, triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }

  if (strategyId === 'padrao_impar') {
    // Reference: Candle 3 (minutePos === 2).
    // Entry: Candle 1 of NEXT cycle (minutePos === 0).
    // Trigger signal at end of Candle 5 (mPos === 4).
    const mPos = min % 5;
    if (mPos === 4) {
      const c3 = candles[lastIndex - 2];
      if (c3) {
        const color3 = getCandleColor(c3);
        if (color3 !== 'NEUTRAL') {
          return { direction: color3, triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }

  if (strategyId === 'r7') {
    // Reference: Candle 9 of prev block (minutePos === 8 of prev 10-min block).
    // Entry: Candle 7 of current block (minutePos === 6 of current block).
    // Trigger signal at end of Candle 6 (min % 10 === 5).
    const mPos = min % 10;
    if (mPos === 5) {
      const prevC9 = candles[lastIndex - 7];
      if (prevC9) {
        const color9 = getCandleColor(prevC9);
        if (color9 !== 'NEUTRAL') {
          return { direction: color9, triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }
  
  if (strategyId === 'pullback') {
    const ema20 = calculateEMA(candles, 20);
    const emaVal = ema20[lastIndex];
    if (emaVal) {
      const c = lastCandle;
      const isUptrendPullback = c.close > emaVal && c.low <= emaVal && c.close < c.open;
      const isDowntrendPullback = c.close < emaVal && c.high >= emaVal && c.close > c.open;
      
      if (isUptrendPullback) {
        return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
      }
      if (isDowntrendPullback) {
        return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
      }
    }
  }

  if (strategyId === 'reversal') {
    const c = lastCandle;
    const body = Math.abs(c.close - c.open);
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;
    
    if (body >= 0.0001) {
      const prev1 = candles[lastIndex - 1];
      const prev2 = candles[lastIndex - 2];
      const prev3 = candles[lastIndex - 3];
      if (prev1 && prev2 && prev3) {
        const isBearishTrend = prev1.close < prev1.open && prev2.close < prev2.open && prev3.close < prev3.open;
        const isBullishTrend = prev1.close > prev1.open && prev2.close > prev2.open && prev3.close > prev3.open;
        
        if (isBearishTrend && lowerShadow >= 2 * body && upperShadow <= 0.3 * body) {
          return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
        }
        if (isBullishTrend && upperShadow >= 2 * body && lowerShadow <= 0.3 * body) {
          return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }
  
  if (strategyId === 'pivot_123') {
    let p1 = -1, p2 = -1, p3 = -1;
    for (let j = lastIndex - 1; j >= lastIndex - 4; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
        p3 = j;
        break;
      }
    }
    if (p3 > 2) {
      for (let j = p3 - 1; j >= p3 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
          p2 = j;
          break;
        }
      }
    }
    if (p2 > 2) {
      for (let j = p2 - 1; j >= p2 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
          p1 = j;
          break;
        }
      }
    }
    if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
      if (candles[p3].low > candles[p1].low && candles[p2].high > candles[p3].low) {
        if (candles[lastIndex-1].close <= candles[p2].high && lastCandle.close > candles[p2].high) {
          return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
        }
      }
    }

    p1 = -1; p2 = -1; p3 = -1;
    for (let j = lastIndex - 1; j >= lastIndex - 4; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
        p3 = j;
        break;
      }
    }
    if (p3 > 2) {
      for (let j = p3 - 1; j >= p3 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
          p2 = j;
          break;
        }
      }
    }
    if (p2 > 2) {
      for (let j = p2 - 1; j >= p2 - 4; j--) {
        if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
          p1 = j;
          break;
        }
      }
    }
    if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
      if (candles[p3].high < candles[p1].high && candles[p2].low < candles[p3].high) {
        if (candles[lastIndex-1].close >= candles[p2].low && lastCandle.close < candles[p2].low) {
          return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }

  if (strategyId === 'ross_hook') {
    let hookHigh = -1, hookIndex = -1;
    for (let j = lastIndex - 2; j >= lastIndex - 6; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].high >= candles[j-1].high && candles[j].high >= candles[j+1].high) {
        hookHigh = candles[j].high;
        hookIndex = j;
        break;
      }
    }
    if (hookIndex !== -1 && candles[hookIndex + 1] && candles[hookIndex + 1].close < hookHigh) {
      if (candles[lastIndex-1].close <= hookHigh && lastCandle.close > hookHigh) {
        return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
      }
    }

    let hookLow = -1;
    hookIndex = -1;
    for (let j = lastIndex - 2; j >= lastIndex - 6; j--) {
      if (candles[j] && candles[j-1] && candles[j+1] && candles[j].low <= candles[j-1].low && candles[j].low <= candles[j+1].low) {
        hookLow = candles[j].low;
        hookIndex = j;
        break;
      }
    }
    if (hookIndex !== -1 && candles[hookIndex + 1] && candles[hookIndex + 1].close > hookLow) {
      if (candles[lastIndex-1].close >= hookLow && lastCandle.close < hookLow) {
        return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
      }
    }
  }

  if (strategyId === 'r10') {
    const mPos = min % 10;
    if (mPos === 8) {
      const c1 = candles[lastIndex - 8];
      const c2 = candles[lastIndex - 7];
      const c3 = candles[lastIndex - 6];
      if (c1 && c2 && c3) {
        const col1 = getCandleColor(c1);
        const col2 = getCandleColor(c2);
        const col3 = getCandleColor(c3);
        if (col1 !== 'NEUTRAL' && col2 !== 'NEUTRAL' && col3 !== 'NEUTRAL') {
          let greenCount = 0;
          let redCount = 0;
          [col1, col2, col3].forEach(col => {
            if (col === 'CALL') greenCount++;
            if (col === 'PUT') redCount++;
          });
          const direction = greenCount > redCount ? 'PUT' : 'CALL';
          return { direction, triggerTime: lastCandle.epoch + 60 };
        }
      }
    }
  }

  if (strategyId === 'marubozu') {
    const c = lastCandle;
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    if (range > 0 && body > 0 && (body / range >= 0.85)) {
      let sumBody = 0;
      for (let j = lastIndex - 10; j < lastIndex; j++) {
        if (candles[j]) sumBody += Math.abs(candles[j].close - candles[j].open);
      }
      const avgBody = sumBody / 10;
      if (body >= avgBody * 1.3) {
        const direction = c.close > c.open ? 'CALL' : 'PUT';
        return { direction, triggerTime: lastCandle.epoch + 60 };
      }
    }
  }

  if (strategyId === 'bos_choch') {
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const e20 = ema20[lastIndex];
    const e50 = ema50[lastIndex];
    if (e20 && e50) {
      let maxHigh = -1;
      let minLow = 9999999;
      for (let j = lastIndex - 6; j < lastIndex; j++) {
        if (candles[j]) {
          if (candles[j].high > maxHigh) maxHigh = candles[j].high;
          if (candles[j].low < minLow) minLow = candles[j].low;
        }
      }
      if (e20 > e50 && candles[lastIndex-1].close <= maxHigh && lastCandle.close > maxHigh) {
        return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
      }
      if (e20 < e50 && candles[lastIndex-1].close >= minLow && lastCandle.close < minLow) {
        return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
      }
    }
  }

  if (strategyId === 'master_candle') {
    for (let mIdx = lastIndex - 8; mIdx >= lastIndex - 15; mIdx--) {
      if (mIdx < 5) break;
      const master = candles[mIdx];
      if (!master) continue;
      const masterRange = master.high - master.low;

      let sumRange = 0;
      for (let j = mIdx - 5; j < mIdx; j++) {
        if (candles[j]) sumRange += (candles[j].high - candles[j].low);
      }
      const avgRange = sumRange / 5;
      if (masterRange < avgRange * 1.8) continue;

      let isInside = true;
      for (let j = mIdx + 1; j <= mIdx + 4; j++) {
        if (!candles[j] || candles[j].high > master.high || candles[j].low < master.low) {
          isInside = false;
          break;
        }
      }

      if (isInside) {
        let oldBreakout = false;
        for (let k = mIdx + 5; k < lastIndex; k++) {
          if (candles[k].close > master.high || candles[k].close < master.low) {
            oldBreakout = true;
            break;
          }
        }

        if (!oldBreakout) {
          if (lastCandle.close > master.high) {
            return { direction: 'CALL', triggerTime: lastCandle.epoch + 60 };
          }
          if (lastCandle.close < master.low) {
            return { direction: 'PUT', triggerTime: lastCandle.epoch + 60 };
          }
        }
      }
    }
  }

  return null;
}
