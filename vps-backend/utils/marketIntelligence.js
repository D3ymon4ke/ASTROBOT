// Utility function to analyze trade history, candle volatility, and determine best trading hours and days for VPS backend

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const SHORT_DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function analyzeMarketConditions({ dbTrades = [], candles = [], currentSymbol = '' }) {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();

  // 1. Hourly Stats Aggregation
  const hourlyStats = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${String(h).padStart(2, '0')}:00h`,
    total: 0,
    wins: 0,
    losses: 0,
    profit: 0
  }));

  // 2. Day of Week Stats Aggregation
  const dayStats = Array.from({ length: 7 }, (_, d) => ({
    day: d,
    dayName: DAY_NAMES[d],
    shortName: SHORT_DAY_NAMES[d],
    total: 0,
    wins: 0,
    losses: 0,
    profit: 0
  }));

  let symbolTradesCount = 0;

  // Process dbTrades
  (dbTrades || []).forEach(t => {
    const tDate = new Date(t.timestamp || t.time || Date.now());
    const h = tDate.getHours();
    const d = tDate.getDay();
    const isWin = t.result === 'WIN' || t.profit > 0;
    const profit = t.profit || 0;

    if (!currentSymbol || t.symbol === currentSymbol) {
      symbolTradesCount++;
    }

    if (h >= 0 && h < 24) {
      hourlyStats[h].total++;
      if (isWin) hourlyStats[h].wins++;
      else hourlyStats[h].losses++;
      hourlyStats[h].profit += profit;
    }

    if (d >= 0 && d < 7) {
      dayStats[d].total++;
      if (isWin) dayStats[d].wins++;
      else dayStats[d].losses++;
      dayStats[d].profit += profit;
    }
  });

  // Calculate Win Rates for Hours
  const hourlyWithWinrate = hourlyStats.map(h => ({
    ...h,
    winRate: h.total > 0 ? (h.wins / h.total) * 100 : 0
  }));

  // Find Best 2-hour Window
  let bestWindow = { startHour: 9, endHour: 11, avgWinRate: 88, totalTrades: 0 };
  let maxWindowWinRate = -1;

  for (let h = 0; h < 23; h++) {
    const totalInWindow = hourlyWithWinrate[h].total + hourlyWithWinrate[h + 1].total;
    const winsInWindow = hourlyWithWinrate[h].wins + hourlyWithWinrate[h + 1].wins;
    const wr = totalInWindow > 0 ? (winsInWindow / totalInWindow) * 100 : 0;

    if (totalInWindow >= 3 && wr > maxWindowWinRate) {
      maxWindowWinRate = wr;
      bestWindow = {
        startHour: h,
        endHour: h + 2,
        avgWinRate: wr,
        totalTrades: totalInWindow
      };
    }
  }

  // Find Worst Hour
  let worstHour = { hour: 17, winRate: 40, total: 0 };
  let minWinRate = 101;
  hourlyWithWinrate.forEach(h => {
    if (h.total >= 2 && h.winRate < minWinRate) {
      minWinRate = h.winRate;
      worstHour = h;
    }
  });

  // Calculate Win Rates for Days
  const daysWithWinrate = dayStats.map(d => ({
    ...d,
    winRate: d.total > 0 ? (d.wins / d.total) * 100 : 0
  }));

  // Sort best days
  const sortedDays = [...daysWithWinrate].sort((a, b) => {
    if (b.total === 0 && a.total === 0) return 0;
    if (b.winRate === a.winRate) return b.total - a.total;
    return b.winRate - a.winRate;
  });

  const bestDays = sortedDays.filter(d => d.total > 0).slice(0, 2);
  const bestDaysFormatted = bestDays.length > 0 
    ? bestDays.map(d => d.dayName).join(' e ')
    : 'Terça-feira e Quinta-feira';

  // 3. Candle Volatility & Trend Check
  let candleVolatility = 'Normal';
  if (candles && candles.length >= 10) {
    const recent = candles.slice(-10);
    const avgBody = recent.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / 10;
    const avgWick = recent.reduce((sum, c) => sum + ((c.high - Math.max(c.open, c.close)) + (Math.min(c.open, c.close) - c.low)), 0) / 10;
    
    if (avgBody > 1.2 || avgWick > 1.5) {
      candleVolatility = 'Alta Volatilidade';
    } else if (avgBody < 0.2) {
      candleVolatility = 'Baixa Volatilidade (Lateral)';
    }
  }

  // 4. Determine Current Hour Status
  const currentHourStats = hourlyWithWinrate[currentHour];
  let status = 'FAVORABLE'; // 'FAVORABLE' | 'MODERATE' | 'HIGH_RISK'
  let statusLabel = 'Horário Altamente Favorável';
  let statusBadge = '🟢 EXCELENTE';
  let statusColor = '#10b981';
  let statusBg = 'rgba(16, 185, 129, 0.15)';
  let statusBorder = 'rgba(16, 185, 129, 0.4)';

  if (currentHourStats.total >= 3) {
    if (currentHourStats.winRate >= 75) {
      status = 'FAVORABLE';
      statusLabel = 'Horário Altamente Favorável';
      statusBadge = `🟢 EXCELENTE (${currentHourStats.winRate.toFixed(0)}% WR)`;
      statusColor = '#10b981';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusBorder = 'rgba(16, 185, 129, 0.4)';
    } else if (currentHourStats.winRate >= 55) {
      status = 'MODERATE';
      statusLabel = 'Horário Moderado / Estável';
      statusBadge = `🟡 MODERADO (${currentHourStats.winRate.toFixed(0)}% WR)`;
      statusColor = '#f59e0b';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      statusBorder = 'rgba(245, 158, 11, 0.4)';
    } else {
      status = 'HIGH_RISK';
      statusLabel = 'Horário de Alto Risco / Instável';
      statusBadge = `🔴 ALTO RISCO (${currentHourStats.winRate.toFixed(0)}% WR)`;
      statusColor = '#ef4444';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      statusBorder = 'rgba(239, 68, 68, 0.4)';
    }
  } else {
    // Default time heuristic for forex/volatility indices
    if (currentHour >= 8 && currentHour <= 12) {
      status = 'FAVORABLE';
      statusLabel = 'Horário Recomendado pela IA (Pico de Liquidez)';
      statusBadge = '🟢 FAVORÁVEL (IA)';
      statusColor = '#10b981';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusBorder = 'rgba(16, 185, 129, 0.4)';
    } else if (currentHour >= 17 && currentHour <= 19) {
      status = 'HIGH_RISK';
      statusLabel = 'Horário de Troca de Turno / Alta Volatilidade';
      statusBadge = '🔴 ALTO RISCO / INSTÁVEL';
      statusColor = '#ef4444';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      statusBorder = 'rgba(239, 68, 68, 0.4)';
    } else {
      status = 'MODERATE';
      statusLabel = 'Horário Padrão de Negociação';
      statusBadge = '🟡 MODERADO (IA)';
      statusColor = '#f59e0b';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      statusBorder = 'rgba(245, 158, 11, 0.4)';
    }
  }

  const bestWindowLabel = `${String(bestWindow.startHour).padStart(2, '0')}:00h - ${String(bestWindow.endHour).padStart(2, '0')}:00h`;
  const worstHourLabel = `${String(worstHour.hour).padStart(2, '0')}:00h`;

  return {
    currentHour,
    currentDayName: DAY_NAMES[currentDay],
    status,
    statusLabel,
    statusBadge,
    statusColor,
    statusBg,
    statusBorder,
    bestWindowLabel,
    worstHourLabel,
    bestDaysFormatted,
    candleVolatility,
    hourlyWithWinrate,
    daysWithWinrate,
    totalDbTrades: dbTrades.length
  };
}
