import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  BarChart3, 
  Layers, 
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Wallet,
  Shield,
  Award,
  ExternalLink,
  ArrowRight,
  Flame,
  PieChart,
  Sliders,
  Play
} from 'lucide-react';

export default function MethodTracker({ 
  trades = [], 
  isDemo = true, 
  settings = {}, 
  isStandalonePage = false,
  onOpenValidatorPage = null,
  onResetAutomation = null
}) {
  // Epoch for the start of the new method validation
  const [trackerEpoch, setTrackerEpoch] = useState(() => {
    const saved = localStorage.getItem('astrobot_method_tracker_epoch');
    if (saved) return Number(saved);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const defaultEpoch = startOfToday.getTime();
    localStorage.setItem('astrobot_method_tracker_epoch', defaultEpoch.toString());
    return defaultEpoch;
  });

  const [isExpanded, setIsExpanded] = useState(true);

  // Simulated base bankroll (default $100)
  const [simBaseBankroll, setSimBaseBankroll] = useState(() => {
    const saved = localStorage.getItem('astrobot_sim_bankroll');
    return saved ? Number(saved) : 100.0;
  });

  // Target profit in USD (default 10% of base bankroll)
  const [targetPct, setTargetPct] = useState(10); // 10%

  // Custom bankroll input handler
  const handleBankrollChange = (newVal) => {
    const val = Number(newVal) || 100;
    setSimBaseBankroll(val);
    localStorage.setItem('astrobot_sim_bankroll', val.toString());
  };

  // Filter trades that occurred after trackerEpoch
  const filteredTrades = useMemo(() => {
    if (!trades || !Array.isArray(trades)) return [];
    return trades.filter(t => {
      let tradeTime = 0;
      if (t.timestamp) {
        tradeTime = typeof t.timestamp === 'number' ? t.timestamp : (Date.parse(t.timestamp) || Number(t.timestamp) || 0);
      } else if (t.epoch) {
        tradeTime = Number(t.epoch) * 1000;
      }
      // Strictly require tradeTime to be greater than or equal to the tracker epoch
      return tradeTime > 0 && tradeTime >= trackerEpoch;
    });
  }, [trades, trackerEpoch]);

  // Calculations for the new method telemetry and bankroll simulation
  const metrics = useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;
    let netProfit = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalStake = 0;

    let g0Wins = 0;
    let g1Wins = 0;
    let g2Wins = 0;
    let highGaleLosses = 0;

    // Simulation curve for chosen bankroll
    let runningBalance = simBaseBankroll;
    let peakBalance = simBaseBankroll;
    let maxDrawdownValue = 0;

    const assetMap = {};
    const strategyMap = {};

    filteredTrades.forEach(t => {
      const profit = Number(t.profit) || 0;
      const stake = Number(t.stake) || 0;
      const isWin = profit > 0 || t.result === 'WIN' || t.isWin === true;
      const gale = Number(t.galeLevel || t.gale || 0);

      totalStake += stake;
      netProfit += profit;

      // Track equity curve
      runningBalance += profit;
      if (runningBalance > peakBalance) {
        peakBalance = runningBalance;
      }
      const currentDd = peakBalance - runningBalance;
      if (currentDd > maxDrawdownValue) {
        maxDrawdownValue = currentDd;
      }

      if (isWin) {
        totalWins++;
        grossProfit += profit;
        if (gale === 0) g0Wins++;
        else if (gale === 1) g1Wins++;
        else if (gale >= 2) g2Wins++;
      } else {
        totalLosses++;
        grossLoss += Math.abs(profit);
        if (gale >= 2) highGaleLosses++;
      }

      // Asset distribution
      const symbol = t.symbol || 'R_100';
      if (!assetMap[symbol]) assetMap[symbol] = { wins: 0, losses: 0, profit: 0 };
      if (isWin) assetMap[symbol].wins++; else assetMap[symbol].losses++;
      assetMap[symbol].profit += profit;

      // Strategy distribution
      const strat = t.strategy || t.strategyName || 'MHI Auto';
      if (!strategyMap[strat]) strategyMap[strat] = { wins: 0, losses: 0, profit: 0 };
      if (isWin) strategyMap[strat].wins++; else strategyMap[strat].losses++;
      strategyMap[strat].profit += profit;
    });

    const totalOps = totalWins + totalLosses;
    const winRate = totalOps > 0 ? (totalWins / totalOps) * 100 : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99.9 : 0;
    const roi = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;

    // Bankroll simulation outputs
    const simFinalBalance = simBaseBankroll + netProfit;
    const simGrowthPct = simBaseBankroll > 0 ? (netProfit / simBaseBankroll) * 100 : 0;
    const maxDrawdownPct = simBaseBankroll > 0 ? (maxDrawdownValue / simBaseBankroll) * 100 : 0;
    
    const targetUSD = (simBaseBankroll * (targetPct / 100));
    const progressToTarget = targetUSD > 0 ? Math.min(100, Math.max(0, (netProfit / targetUSD) * 100)) : 0;

    // Gale 2 risk calculation ($0.35 + $0.74 + $1.55 = ~$2.64)
    const baseStake = Number(settings.stakeValue || settings.stake || 0.35);
    const galeMultiplier = Number(settings.martingaleMultiplier || 2.1);
    const g1Stake = baseStake * galeMultiplier;
    const g2Stake = g1Stake * galeMultiplier;
    const maxCycleRiskUSD = baseStake + g1Stake + g2Stake;
    const maxCycleRiskPct = simBaseBankroll > 0 ? (maxCycleRiskUSD / simBaseBankroll) * 100 : 0;

    return {
      totalOps,
      totalWins,
      totalLosses,
      winRate,
      netProfit,
      grossProfit,
      grossLoss,
      profitFactor,
      roi,
      g0Wins,
      g1Wins,
      g2Wins,
      highGaleLosses,
      simFinalBalance,
      simGrowthPct,
      maxDrawdownValue,
      maxDrawdownPct,
      targetUSD,
      progressToTarget,
      maxCycleRiskUSD,
      maxCycleRiskPct,
      assetMap,
      strategyMap
    };
  }, [filteredTrades, simBaseBankroll, targetPct, settings]);

  // Handlers for epoch resets
  const handleResetToNow = () => {
    const now = Date.now();
    localStorage.setItem('astrobot_method_tracker_epoch', now.toString());
    setTrackerEpoch(now);
    if (onResetAutomation) onResetAutomation();
  };

  const handleResetToToday = () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const epoch = startOfToday.getTime();
    localStorage.setItem('astrobot_method_tracker_epoch', epoch.toString());
    setTrackerEpoch(epoch);
  };

  const formattedStartDate = new Date(trackerEpoch).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.94) 0%, rgba(15, 23, 42, 0.98) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.35)',
      borderRadius: '18px',
      padding: isStandalonePage ? '1.5rem' : '1.2rem',
      marginBottom: isStandalonePage ? '2rem' : '1.5rem',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)',
      backdropFilter: 'blur(16px)',
      position: 'relative',
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Decorative top ambient bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #8b5cf6 0%, #10b981 50%, #38bdf8 100%)'
      }} />

      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        paddingBottom: isExpanded ? '1rem' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(16, 185, 129, 0.25) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.6)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.35)'
          }}>
            <ShieldCheck size={22} style={{ color: '#34d399' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: isStandalonePage ? '1.15rem' : '1rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
                {isStandalonePage ? 'Laboratório de Validação & Auditoria do Novo Método' : 'Validador do Novo Método (Gestão Blindada)'}
              </h3>
              <span style={{
                background: isDemo ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${isDemo ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                color: isDemo ? '#38bdf8' : '#fbbf24',
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                {isDemo ? 'Conta Demo' : 'Conta Real'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <Calendar size={12} /> Monitorando operações desde: <strong style={{ color: '#e2e8f0' }}>{formattedStartDate}</strong>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!isStandalonePage && onOpenValidatorPage && (
            <button
              onClick={onOpenValidatorPage}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
              }}
            >
              <span>Abrir Página Exclusiva</span>
              <ArrowRight size={12} />
            </button>
          )}

          <button
            onClick={handleResetToToday}
            title="Calcular a partir do início de hoje (00:00)"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '6px 11px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Início de Hoje
          </button>
          
          <button
            onClick={handleResetToNow}
            title="Resetar marco para iniciar a contagem a partir de agora do zero"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(217, 70, 239, 0.2) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#c084fc',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s'
            }}
          >
            <RotateCcw size={12} /> Zerar & Iniciar Agora
          </button>

          {!isStandalonePage && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed quick summary */}
      {!isExpanded && !isStandalonePage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>Operações: <strong style={{ color: 'white' }}>{metrics.totalOps}</strong></span>
            <span>Win Rate: <strong style={{ color: metrics.winRate >= 60 ? '#10b981' : '#f87171' }}>{metrics.winRate.toFixed(1)}%</strong></span>
            <span>Banca ${simBaseBankroll}: <strong style={{ color: metrics.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
              ${metrics.simFinalBalance.toFixed(2)} ({metrics.simGrowthPct >= 0 ? '+' : ''}{metrics.simGrowthPct.toFixed(1)}%)
            </strong></span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 'bold' }}>Clique para expandir</span>
        </div>
      )}

      {/* Expanded detailed stats */}
      {(isExpanded || isStandalonePage) && (
        <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ════════════════════════════════════════════════════════════════
              SEÇÃO EM DESTAQUE: SIMULADOR & AUDITORIA DA BANCA DE $100
          ════════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '1.2rem',
            position: 'relative'
          }}>
            {/* Header com Seletor de Banca */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '8px', borderRadius: '10px' }}>
                  <Wallet size={20} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '900', color: '#ffffff' }}>
                    Simulador & Auditoria da Banca de ${simBaseBankroll.toFixed(2)}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Se você tivesse iniciado este novo método com ${simBaseBankroll.toFixed(2)}, qual seria o seu saldo agora?
                  </span>
                </div>
              </div>

              {/* Seletor Rápido de Banca ($50 / $100 / $200 / $500) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold' }}>Alterar Banca:</span>
                {[50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleBankrollChange(amt)}
                    style={{
                      background: simBaseBankroll === amt ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${simBaseBankroll === amt ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: simBaseBankroll === amt ? '#022c22' : '#cbd5e1',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Hero Card */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: `1px solid ${metrics.netProfit > 0 ? 'rgba(16, 185, 129, 0.3)' : metrics.netProfit < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '12px',
              padding: '0.9rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: metrics.netProfit > 0 ? 'rgba(16, 185, 129, 0.2)' : metrics.netProfit < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '50%'
                }}>
                  {metrics.netProfit > 0 ? (
                    <Award size={24} style={{ color: '#10b981' }} />
                  ) : metrics.netProfit < 0 ? (
                    <TrendingDown size={24} style={{ color: '#ef4444' }} />
                  ) : (
                    <ScaleIcon size={24} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Veredito da Banca
                  </span>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: '900',
                    color: metrics.netProfit > 0 ? '#10b981' : metrics.netProfit < 0 ? '#ef4444' : '#ffffff'
                  }}>
                    {metrics.netProfit > 0 
                      ? `🟢 TERMINARIA NO LUCRO COM $${metrics.simFinalBalance.toFixed(2)}`
                      : metrics.netProfit < 0 
                        ? `🔴 EM AJUSTE COM $${metrics.simFinalBalance.toFixed(2)}`
                        : `⚖️ NO ZERO A ZERO COM $${metrics.simFinalBalance.toFixed(2)}`}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Lucro Líquido Acumulado</span>
                <span style={{
                  fontSize: '1.35rem',
                  fontWeight: '900',
                  fontFamily: 'var(--font-mono)',
                  color: metrics.netProfit >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)} ({metrics.simGrowthPct >= 0 ? '+' : ''}{metrics.simGrowthPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Grid 3 colunas para os números da simulação */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem'
            }}>
              {/* Saldo Final */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Saldo Simulado da Banca
                </span>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: '900',
                  color: metrics.simFinalBalance >= simBaseBankroll ? '#10b981' : '#ef4444',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px'
                }}>
                  ${metrics.simFinalBalance.toFixed(2)}
                </div>
                <span style={{ fontSize: '0.65rem', color: metrics.netProfit >= 0 ? '#34d399' : '#f87171' }}>
                  {metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)} ({metrics.simGrowthPct >= 0 ? '+' : ''}{metrics.simGrowthPct.toFixed(1)}%)
                </span>
              </div>

              {/* Risco do Gale 2 sobre a banca */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Risco Máximo Gale 2
                </span>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: '900',
                  color: '#38bdf8',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px'
                }}>
                  ${metrics.maxCycleRiskUSD.toFixed(2)}
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Apenas <strong>{metrics.maxCycleRiskPct.toFixed(1)}% da banca</strong> por ciclo
                </span>
              </div>

              {/* Drawdown Máximo Sofrido */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Drawdown Máximo Sofrido
                </span>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: '900',
                  color: metrics.maxDrawdownPct <= 10 ? '#10b981' : '#f59e0b',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px'
                }}>
                  {metrics.maxDrawdownPct.toFixed(1)}%
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Queda máxima de ${metrics.maxDrawdownValue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Progresso rumo à meta */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                <span style={{ color: '#cbd5e1' }}>
                  🎯 Progresso rumo à Meta de {targetPct}% (${metrics.targetUSD.toFixed(2)} de Lucro):
                </span>
                <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  {metrics.progressToTarget.toFixed(1)}% (${Math.max(0, metrics.netProfit).toFixed(2)} / ${metrics.targetUSD.toFixed(2)})
                </strong>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${metrics.progressToTarget}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Top 4 Telemetry Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem'
          }}>
            {/* Card 1: Lucro Líquido */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${metrics.netProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '12px',
              padding: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Resultado Líquido
                </span>
                {metrics.netProfit >= 0 ? (
                  <TrendingUp size={15} style={{ color: '#10b981' }} />
                ) : (
                  <TrendingDown size={15} style={{ color: '#ef4444' }} />
                )}
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '900',
                color: metrics.netProfit >= 0 ? '#10b981' : '#ef4444',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px'
              }}>
                {metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                ROI: {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}% sobre entradas
              </span>
            </div>

            {/* Card 2: Assertividade */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Taxa de Acerto (WR)
                </span>
                <Target size={15} style={{ color: '#38bdf8' }} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '900',
                color: metrics.winRate >= 60 ? '#10b981' : metrics.totalOps === 0 ? '#94a3b8' : '#f87171',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px'
              }}>
                {metrics.totalOps > 0 ? `${metrics.winRate.toFixed(1)}%` : '—'}
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                <strong style={{ color: '#10b981' }}>{metrics.totalWins}W</strong> • <strong style={{ color: '#ef4444' }}>{metrics.totalLosses}L</strong> ({metrics.totalOps} ordens)
              </span>
            </div>

            {/* Card 3: Eficiência Gale (G0 / G1 / G2) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Distribuição de Acertos
                </span>
                <Zap size={15} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  G0: {metrics.g0Wins}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  G1: {metrics.g1Wins}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  G2: {metrics.g2Wins}
                </span>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                Gale Máximo Ativo: <strong>Gale 2 (Blindado)</strong>
              </span>
            </div>

            {/* Card 4: Fator de Lucro / Blindagem */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fator de Lucro (PF)
                </span>
                <BarChart3 size={15} style={{ color: '#a78bfa' }} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '900',
                color: metrics.profitFactor >= 1.5 ? '#10b981' : '#cbd5e1',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px'
              }}>
                {metrics.profitFactor.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                +${metrics.grossProfit.toFixed(1)} / -${metrics.grossLoss.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Active Rules Indicator Chips */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.72rem'
          }}>
            <span style={{ color: '#a78bfa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={13} /> Regras do Novo Método Ativas:
            </span>
            <span style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 9px', borderRadius: '6px' }}>
              ✔ Max Gale: 2 (Next Signal)
            </span>
            <span style={{ background: 'rgba(139,92,246,0.12)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.3)', padding: '3px 9px', borderRadius: '6px' }}>
              ✔ Estratégia: MHI Auto Dinâmica
            </span>
            <span style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 9px', borderRadius: '6px' }}>
              🚫 Blacklist: R_50 & 1HZ75V Bloqueados
            </span>
            <span style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '3px 9px', borderRadius: '6px' }}>
              🛡️ Streak Shield: Max 3 Velas
            </span>
          </div>

          {/* Standalone Extra Sections: Performance por Ativo e por Estratégia */}
          {isStandalonePage && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {/* Tabela por Ativo */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1rem'
              }}>
                <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PieChart size={15} style={{ color: '#38bdf8' }} /> Performance por Ativo (Novo Método)
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(metrics.assetMap).length > 0 ? (
                    Object.entries(metrics.assetMap).map(([asset, data]) => {
                      const total = data.wins + data.losses;
                      const wr = total > 0 ? (data.wins / total) * 100 : 0;
                      return (
                        <div key={asset} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{asset}</span>
                          <span style={{ color: '#94a3b8' }}>{data.wins}W / {data.losses}L ({wr.toFixed(1)}%)</span>
                          <span style={{
                            fontWeight: '800',
                            fontFamily: 'var(--font-mono)',
                            color: data.profit >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Aguardando primeiras operações para tabular por ativo...</span>
                  )}
                </div>
              </div>

              {/* Tabela por Estratégia */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1rem'
              }}>
                <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} style={{ color: '#a78bfa' }} /> Performance por Estratégia
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(metrics.strategyMap).length > 0 ? (
                    Object.entries(metrics.strategyMap).map(([strat, data]) => {
                      const total = data.wins + data.losses;
                      const wr = total > 0 ? (data.wins / total) * 100 : 0;
                      return (
                        <div key={strat} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{strat}</span>
                          <span style={{ color: '#94a3b8' }}>{data.wins}W / {data.losses}L ({wr.toFixed(1)}%)</span>
                          <span style={{
                            fontWeight: '800',
                            fontFamily: 'var(--font-mono)',
                            color: data.profit >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Aguardando primeiras operações para tabular por estratégia...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent trades list under the new method */}
          {filteredTrades.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Histórico de Ordens do Novo Método ({filteredTrades.length})
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Exibindo as mais recentes</span>
              </div>
              <div style={{
                maxHeight: isStandalonePage ? '300px' : '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                paddingRight: '4px'
              }}>
                {filteredTrades.slice(isStandalonePage ? -30 : -10).reverse().map((t, idx) => {
                  const profit = Number(t.profit) || 0;
                  const isWin = profit > 0 || t.result === 'WIN' || t.isWin === true;
                  const gale = Number(t.galeLevel || t.gale || 0);

                  return (
                    <div key={t.id || idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isWin ? (
                          <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                        ) : (
                          <XCircle size={14} style={{ color: '#ef4444' }} />
                        )}
                        <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{t.symbol || 'R_100'}</span>
                        <span style={{ color: '#64748b' }}>{t.time || new Date(Number(t.timestamp) || Date.now()).toLocaleTimeString()}</span>
                        <span style={{
                          fontSize: '0.62rem',
                          background: gale === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: gale === 0 ? '#10b981' : '#fbbf24',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {gale === 0 ? 'Mão Fixa (G0)' : `Gale ${gale}`}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{t.strategy || 'MHI'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>Entrada: ${Number(t.stake || 0).toFixed(2)}</span>
                        <span style={{
                          fontWeight: '800',
                          fontFamily: 'var(--font-mono)',
                          color: isWin ? '#10b981' : '#ef4444'
                        }}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Nenhuma operação executada desde o marco inicial ({formattedStartDate}).
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Ao iniciar o robô, cada trade será registrado e contabilizado aqui em tempo real.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Fallback ScaleIcon helper
function ScaleIcon({ size = 20, style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={style}
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}
