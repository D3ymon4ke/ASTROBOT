// Gamification Utility System (Levels, XP, Badges, Achievements)

export const DEFAULT_BADGES = [
  {
    id: 'developer',
    name: '👑 Desenvolvedor',
    icon: '👑',
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    description: 'Criador e mantenedor da plataforma ASTROBOT.',
    criteria: 'Manual Admin'
  },
  {
    id: 'beta_tester',
    name: '🚀 Beta Tester',
    icon: '🚀',
    color: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    description: 'Membro pioneiro que participou dos testes iniciais.',
    criteria: 'Entrou na fase Beta'
  },
  {
    id: 'premium_member',
    name: '💎 Membro Premium',
    icon: '💎',
    color: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    description: 'Possui assinatura VIP ativa e acesso ilimitado.',
    criteria: 'Assinatura Ativa'
  },
  {
    id: 'consistent_trader',
    name: '🏆 Trader Consistente',
    icon: '🏆',
    color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    description: 'Meteu winrate superior a 80% em mais de 50 operações.',
    criteria: 'Winrate > 80% + 50 ops'
  },
  {
    id: 'meta_30_days',
    name: '🔥 Meta 30 Dias',
    icon: '🔥',
    color: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    description: 'Bateu a meta financeira por 30 dias no mês.',
    criteria: '30 dias com meta batida'
  },
  {
    id: 'ai_master',
    name: '🧠 Mestre da IA',
    icon: '🧠',
    color: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
    description: 'Utilizou o piloto automático da IA com alta performance.',
    criteria: '50+ ops no Piloto Automático'
  }
];

export const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'first_trade',
    name: 'Primeiro Passo',
    icon: '🟢',
    description: 'Executou a primeira operação no ASTROBOT.',
    target: 1,
    category: 'trades'
  },
  {
    id: 'first_meta',
    name: 'Alvo Atingido',
    icon: '🎯',
    description: 'Conquistou a primeira meta diária ou sessão.',
    target: 1,
    category: 'meta'
  },
  {
    id: 'trades_100',
    name: 'Centenário de Trades',
    icon: '📈',
    description: 'Completou 100 operações registradas no sistema.',
    target: 100,
    category: 'trades'
  },
  {
    id: 'trades_1000',
    name: 'Lenda das Opções',
    icon: '⚡',
    description: 'Alcançou a marca histórica de 1.000 operações.',
    target: 1000,
    category: 'trades'
  },
  {
    id: 'max_daily_profit',
    name: 'Dia de Ouro',
    icon: '💰',
    description: 'Conquistou um lucro superior a $100 em um único dia.',
    target: 100,
    category: 'profit'
  },
  {
    id: 'win_streak_10',
    name: 'Inabalável',
    icon: '🔥',
    description: 'Alcançou uma sequência ininterrupta de 10 WINs seguidos.',
    target: 10,
    category: 'streak'
  }
];

// Helper to calculate User Level and XP with detailed breakdown rules
export function calculateUserLevel(trades = [], totalProfit = 0, metaHitsCount = 0) {
  const totalOps = trades.length;
  const wins = trades.filter(t => t.result === 'WIN').length;
  const losses = trades.filter(t => t.result === 'LOSS').length;
  
  // Count Martingale recoveries
  const galeWins = trades.filter(t => t.result === 'WIN' && (t.galeLevel > 0 || (t.message && t.message.toLowerCase().includes('gale')))).length;

  // Detailed XP breakdown:
  // 1. +25 XP per trade execution (Entradas)
  const entryXp = totalOps * 25;

  // 2. +50 XP per WIN (Vitórias)
  const winXp = wins * 50;

  // 3. +10 XP per LOSS (Resiliência / Aprendizado)
  const lossXp = losses * 10;

  // 4. +40 XP per Gale Recovery (Recuperação no Martingale)
  const galeXp = galeWins * 40;

  // 5. +250 XP per Target Meta Hit (Meta Diária/Sessão Batida)
  const inferredMetaHits = metaHitsCount || (totalProfit > 0 ? Math.max(1, Math.floor(totalProfit / 20)) : 0);
  const metaXp = inferredMetaHits * 250;

  // 6. +2 XP per $1 Profit Acumulado
  const profitXp = Math.max(0, Math.floor(totalProfit * 2));

  const totalXp = entryXp + winXp + lossXp + galeXp + metaXp + profitXp;

  // Level formula: Level = Math.floor(Math.sqrt(totalXp / 100)) + 1
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const progressInLevel = Math.min(100, Math.max(0, ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    progressInLevel,
    xpBreakdown: {
      entryXp,
      winXp,
      lossXp,
      galeXp,
      metaXp,
      profitXp
    }
  };
}

// Evaluate user's unlocked achievements dynamically based on trades
export function evaluateUserAchievements(trades = [], totalProfit = 0) {
  const totalOps = trades.length;
  const wins = trades.filter(t => t.result === 'WIN').length;

  // Max consecutive wins calculation
  let maxStreak = 0;
  let currentStreak = 0;
  trades.forEach(t => {
    if (t.result === 'WIN') {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  return DEFAULT_ACHIEVEMENTS.map(ach => {
    let currentVal = 0;
    let unlocked = false;

    if (ach.id === 'first_trade') {
      currentVal = totalOps;
      unlocked = totalOps >= 1;
    } else if (ach.id === 'first_meta') {
      unlocked = totalProfit > 0;
      currentVal = unlocked ? 1 : 0;
    } else if (ach.id === 'trades_100') {
      currentVal = totalOps;
      unlocked = totalOps >= 100;
    } else if (ach.id === 'trades_1000') {
      currentVal = totalOps;
      unlocked = totalOps >= 1000;
    } else if (ach.id === 'max_daily_profit') {
      currentVal = totalProfit;
      unlocked = totalProfit >= 100;
    } else if (ach.id === 'win_streak_10') {
      currentVal = maxStreak;
      unlocked = maxStreak >= 10;
    }

    return {
      ...ach,
      currentVal,
      unlocked,
      progress: Math.min(100, (currentVal / ach.target) * 100)
    };
  });
}
