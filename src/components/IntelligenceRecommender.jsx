import React from 'react';
import { Brain, Cpu, Database, Award, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

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
  
  const formatSymbol = (sym) => {
    if (!sym) return '';
    if (sym.startsWith('frx')) return sym.replace('frx', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
    if (sym.startsWith('1HZ')) return sym.replace('1HZ', '').replace('V', '') + ' (1s)';
    return sym.replace('Volatility ', 'Vol ').replace(' Index', '');
  };

  return (
    <div style={{
      padding: '0.85rem 1.5rem',
      background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.05) 0%, rgba(217, 70, 239, 0.05) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.25)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      flexWrap: 'wrap',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Title block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          padding: '0.5rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 12px rgba(124, 58, 237, 0.35)'
        }}>
          <Brain size={18} style={{ color: '#ffffff' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.58rem', color: '#a78bfa', display: 'block', fontWeight: 800, letterSpacing: '0.08em' }}>MOTOR DE INTELIGÊNCIA</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', background: 'linear-gradient(90deg, #ffffff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RECOMENDAÇÕES AI</span>
        </div>
      </div>

      {/* Recommended Strategy for CURRENT Asset */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flex: 1,
        minWidth: '220px',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '10px'
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} style={{ color: '#f472b6' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.05em' }}>
            ESTRATÉGIA RECOMENDADA ({formatSymbol(currentSymbol)})
          </span>
          {bestStrategy ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <strong style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 700 }}>
                {bestStrategy.name}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                {bestStrategy.winRate.toFixed(1)}% WR
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>Analisando mercado...</span>
          )}
        </div>
      </div>

      {/* Recommended Asset based on LIVE backtests */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flex: 1,
        minWidth: '220px',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '10px'
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={14} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.05em' }}>
            MELHOR ATIVO (SESSÃO LIVE)
          </span>
          {sessionAsset ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <strong style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 700 }}>
                {formatSymbol(sessionAsset.symbol)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }} title={sessionAsset.strategy}>
                {sessionAsset.winRate.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>Nenhum ativo analisado ainda</span>
          )}
        </div>
      </div>

      {/* Recommended Asset & Strategy based on DB history */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flex: 1,
        minWidth: '220px',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '10px'
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Database size={14} style={{ color: '#34d399' }} />
        </div>
        <div>
          <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.05em' }}>
            MAIS ASSERTIVO HISTÓRICO (BD)
          </span>
          {dbRecs.asset ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <strong style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 700 }}>
                {formatSymbol(dbRecs.asset.name)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                {dbRecs.asset.winRate.toFixed(0)}% ({dbRecs.asset.total} op)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>Sem dados históricos</span>
          )}
        </div>
      </div>
    </div>
  );
}
