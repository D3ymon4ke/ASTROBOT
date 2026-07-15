import React from 'react';
import { Brain, Cpu, Database, Award, Sparkles, TrendingUp } from 'lucide-react';

export default function IntelligenceRecommender({
  bestStrategy,
  currentSymbol,
  sessionAssetStats = {},
  dbTrades = []
}) {
  // 1. Calculate best asset & strategy from DB history
  const getDbRecommendations = () => {
    if (!dbTrades || dbTrades.length === 0) return { asset: null, strategy: null };

    const assetStats = {};
    const strategyStatsMap = {};

    dbTrades.forEach(t => {
      const isWin = t.result === 'WIN';
      
      // Asset stats
      if (!assetStats[t.symbol]) {
        assetStats[t.symbol] = { wins: 0, total: 0 };
      }
      assetStats[t.symbol].total++;
      if (isWin) assetStats[t.symbol].wins++;

      // Strategy stats
      if (t.strategyName) {
        if (!strategyStatsMap[t.strategyName]) {
          strategyStatsMap[t.strategyName] = { wins: 0, total: 0 };
        }
        strategyStatsMap[t.strategyName].total++;
        if (isWin) strategyStatsMap[t.strategyName].wins++;
      }
    });

    let bestAsset = null;
    let maxAssetWinRate = -1;
    let bestAssetTotal = 0;

    Object.entries(assetStats).forEach(([symbol, data]) => {
      const winRate = (data.wins / data.total) * 100;
      if (winRate > maxAssetWinRate || (winRate === maxAssetWinRate && data.total > bestAssetTotal)) {
        maxAssetWinRate = winRate;
        bestAsset = symbol;
        bestAssetTotal = data.total;
      }
    });

    let bestStrat = null;
    let maxStratWinRate = -1;
    let bestStratTotal = 0;

    Object.entries(strategyStatsMap).forEach(([strat, data]) => {
      const winRate = (data.wins / data.total) * 100;
      if (winRate > maxStratWinRate || (winRate === maxStratWinRate && data.total > bestStratTotal)) {
        maxStratWinRate = winRate;
        bestStrat = strat;
        bestStratTotal = data.total;
      }
    });

    return {
      asset: bestAsset ? { name: bestAsset, winRate: maxAssetWinRate, total: bestAssetTotal } : null,
      strategy: bestStrat ? { name: bestStrat, winRate: maxStratWinRate, total: bestStratTotal } : null
    };
  };

  // 2. Get overall best asset loaded during this session
  const getBestSessionAsset = () => {
    let bestSymbol = '';
    let bestWinRate = -1;
    let bestStrat = '';
    
    Object.entries(sessionAssetStats).forEach(([symbol, data]) => {
      if (data.bestWinRate > bestWinRate) {
        bestWinRate = data.bestWinRate;
        bestSymbol = symbol;
        bestStrat = data.bestStrategyName;
      }
    });
    
    if (bestWinRate > 0) {
      return { symbol: bestSymbol, winRate: bestWinRate, strategy: bestStrat };
    }
    return null;
  };

  const dbRecs = getDbRecommendations();
  const sessionAsset = getBestSessionAsset();
  const formatSymbol = (sym) => sym ? sym.replace('Volatility ', '').replace(' Index', '') : '';

  return (
    <div className="glass-panel" style={{
      padding: '0.75rem 1.25rem',
      background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.04) 0%, rgba(217, 70, 239, 0.04) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      flexWrap: 'wrap'
    }}>
      {/* Title block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
        <div style={{
          background: 'var(--primary-glow)',
          padding: '0.4rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-active)'
        }}>
          <Brain size={18} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>MOTOR DE INTELIGÊNCIA</span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>RECOMENDAÇÕES AI</span>
        </div>
      </div>

      {/* Recommended Strategy for CURRENT Asset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '220px' }}>
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '500' }}>
            MELHOR ESTRATÉGIA NO ATIVO ({formatSymbol(currentSymbol)})
          </span>
          {bestStrategy ? (
            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
              {bestStrategy.name} <span style={{ color: 'var(--success)' }}>({bestStrategy.winRate.toFixed(1)}% Assertividade)</span>
            </strong>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analisando velas do mercado...</span>
          )}
        </div>
      </div>

      {/* Recommended Asset based on LIVE backtests */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '220px' }}>
        <TrendingUp size={16} style={{ color: 'var(--primary-light)' }} />
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '500' }}>
            MELHOR ATIVO (SESSÃO EM TEMPO REAL)
          </span>
          {sessionAsset ? (
            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
              {formatSymbol(sessionAsset.symbol)} <span style={{ color: 'var(--success)' }}>({sessionAsset.winRate.toFixed(1)}% via {sessionAsset.strategy.split(' ')[0]})</span>
            </strong>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Navegue por ativos para calcular</span>
          )}
        </div>
      </div>

      {/* Recommended Asset & Strategy based on DB history */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '220px' }}>
        <Database size={16} style={{ color: 'var(--success)' }} />
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '500' }}>
            MAIS ASSERTIVO HISTÓRICO (BANCO DE DADOS)
          </span>
          {dbRecs.asset ? (
            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
              {formatSymbol(dbRecs.asset.name)} <span style={{ color: 'var(--success)' }}>({dbRecs.asset.winRate.toFixed(0)}% Winrate de {dbRecs.asset.total} ordens)</span>
            </strong>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aguardando histórico de operações...</span>
          )}
        </div>
      </div>
    </div>
  );
}
