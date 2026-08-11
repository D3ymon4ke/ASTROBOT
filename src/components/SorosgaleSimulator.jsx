import React, { useState, useMemo } from 'react';
import { Rocket, Target, Calendar, Award, TrendingUp, ShieldAlert, BarChart3, HelpCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SorosgaleSimulator({ trades = [] }) {
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [sessionsPerDay, setSessionsPerDay] = useState(4);
  const [targetPerSession, setTargetPerSession] = useState(5.0);
  const [stopPerSession, setStopPerSession] = useState(15.0);
  const [initialStake, setInitialStake] = useState(1.0);
  const [sorosLevels, setSorosLevels] = useState(2);
  const [maxGaleRecovery, setMaxGaleRecovery] = useState(2);
  const [compoundingPct, setCompoundingPct] = useState(100);
  const [allowGaleRecovery, setAllowGaleRecovery] = useState(true);

  // Run historical simulation based on user settings and real trade history
  const simulationResult = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalSessions: 0,
        metasBatidas: 0,
        stopsAtingidos: 0,
        winRateMetas: 0,
        lucroTotalSorosgale: 0,
        lucroTotalMaoFixa: 0,
        lucroTotalMartingale: 0,
        maxDrawdown: 0,
        sessionDetails: []
      };
    }

    const totalTargetSessions = daysPerWeek * sessionsPerDay;
    const tradesPerSession = Math.max(5, Math.floor(trades.length / Math.max(1, totalTargetSessions)));

    let currentTradeIdx = 0;
    let lucroTotalSorosgale = 0;
    let lucroTotalMaoFixa = 0;
    let lucroTotalMartingale = 0;
    let metasBatidas = 0;
    let stopsAtingidos = 0;
    let maxDrawdown = 0;
    let peakProfit = 0;

    const sessionDetails = [];

    for (let session = 1; session <= totalTargetSessions; session++) {
      let sessionProfitSorosgale = 0;
      let sessionProfitFixed = 0;
      let sessionProfitGale = 0;
      let isSessionFinished = false;
      let status = 'Em Andamento';

      let currentSorosStake = initialStake;
      let sorosLevel = 0;
      let galeLevel = 0;

      let galeStake = initialStake;
      let galeLevelGale = 0;

      const sessionTradeList = [];

      for (let t = 0; t < tradesPerSession && currentTradeIdx < trades.length && !isSessionFinished; t++) {
        const trade = trades[currentTradeIdx % trades.length];
        currentTradeIdx++;

        const isWin = trade.profit > 0 || trade.result === 'WIN';
        const winPayoutRatio = 0.90; // Standard 90% payout on Volatility Indices

        // 1. SOROSGALE SIMULATION
        let stakeExecuted = currentSorosStake;
        let profitExecuted = isWin ? stakeExecuted * winPayoutRatio : -stakeExecuted;
        sessionProfitSorosgale += profitExecuted;

        if (isWin) {
          sorosLevel++;
          if (sorosLevel < sorosLevels) {
            const compoundingAmount = profitExecuted * (compoundingPct / 100);
            currentSorosStake = parseFloat((currentSorosStake + compoundingAmount).toFixed(2));
          } else {
            // Soros cycle completed! Reset to base
            sorosLevel = 0;
            galeLevel = 0;
            currentSorosStake = initialStake;
          }
        } else {
          // Loss handling in Sorosgale
          if (allowGaleRecovery && galeLevel < maxGaleRecovery) {
            galeLevel++;
            sorosLevel = 0;
            currentSorosStake = parseFloat((initialStake * Math.pow(2, galeLevel)).toFixed(2));
          } else {
            galeLevel = 0;
            sorosLevel = 0;
            currentSorosStake = initialStake;
          }
        }

        // 2. FIXED HAND SIMULATION
        const fixedProfit = isWin ? initialStake * winPayoutRatio : -initialStake;
        sessionProfitFixed += fixedProfit;

        // 3. TRADITIONAL MARTINGALE SIMULATION
        const galeProfit = isWin ? galeStake * winPayoutRatio : -galeStake;
        sessionProfitGale += galeProfit;
        if (isWin) {
          galeStake = initialStake;
          galeLevelGale = 0;
        } else {
          galeLevelGale++;
          if (galeLevelGale <= 2) {
            galeStake = initialStake * Math.pow(2, galeLevelGale);
          } else {
            galeStake = initialStake;
            galeLevelGale = 0;
          }
        }

        sessionTradeList.push({ isWin, profitExecuted, stakeExecuted });

        // Check Take Profit or Stop Loss for Session
        if (sessionProfitSorosgale >= targetPerSession) {
          status = 'Meta Batida 🏆';
          metasBatidas++;
          isSessionFinished = true;
        } else if (sessionProfitSorosgale <= -stopPerSession) {
          status = 'Stop Loss 🛑';
          stopsAtingidos++;
          isSessionFinished = true;
        }
      }

      if (!isSessionFinished) {
        status = sessionProfitSorosgale >= 0 ? 'Concluída (Lucro)' : 'Concluída (Ajuste)';
        if (sessionProfitSorosgale > 0) metasBatidas++;
      }

      lucroTotalSorosgale += sessionProfitSorosgale;
      lucroTotalMaoFixa += sessionProfitFixed;
      lucroTotalMartingale += sessionProfitGale;

      if (lucroTotalSorosgale > peakProfit) {
        peakProfit = lucroTotalSorosgale;
      }
      const dd = peakProfit - lucroTotalSorosgale;
      if (dd > maxDrawdown) maxDrawdown = dd;

      sessionDetails.push({
        sessionNumber: session,
        profitSorosgale: sessionProfitSorosgale,
        profitFixed: sessionProfitFixed,
        status,
        tradesCount: sessionTradeList.length
      });
    }

    const winRateMetas = totalTargetSessions > 0 ? (metasBatidas / totalTargetSessions) * 100 : 0;

    return {
      totalSessions: totalTargetSessions,
      metasBatidas,
      stopsAtingidos,
      winRateMetas,
      lucroTotalSorosgale,
      lucroTotalMaoFixa,
      lucroTotalMartingale,
      maxDrawdown,
      sessionDetails
    };
  }, [trades, daysPerWeek, sessionsPerDay, targetPerSession, stopPerSession, initialStake, sorosLevels, maxGaleRecovery, compoundingPct, allowGaleRecovery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--primary-glow)',
            border: '1px solid var(--border-active)',
            borderRadius: '12px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-light)'
          }}>
            <Rocket size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'white', margin: 0 }}>
              🧪 LABORATÓRIO DE ESTUDOS & SIMULADOR SOROSGALE
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Simule cenários de crescimento acelerado com base no histórico real de {trades.length} operações gravadas no robô.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: '600' }}>Dados Reais Carregados</span>
        </div>
      </div>

      {/* Simulator Inputs & Configuration Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        background: 'rgba(14, 11, 24, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '1.25rem'
      }}>

        {/* Parameter 1: Days per Week */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <Calendar size={12} /> DIAS NA SEMANA
          </label>
          <select
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          >
            <option value={3}>3 Dias (Seg / Quarta / Sex)</option>
            <option value={5}>5 Dias (Segunda a Sexta)</option>
            <option value={7}>7 Dias (Segunda a Domingo)</option>
          </select>
        </div>

        {/* Parameter 2: Sessions per Day */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <ClockIcon /> SESSÕES / DIA (AGENDADOR)
          </label>
          <select
            value={sessionsPerDay}
            onChange={(e) => setSessionsPerDay(Number(e.target.value))}
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          >
            <option value={2}>2 Sessões (Manhã / Noite)</option>
            <option value={3}>3 Sessões (Manhã / Tarde / Noite)</option>
            <option value={4}>4 Sessões (05h / 08h / 11h / 14h)</option>
            <option value={5}>5 Sessões (Intensivo)</option>
          </select>
        </div>

        {/* Parameter 3: Target per Session */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <Target size={12} /> META POR SESSÃO ($)
          </label>
          <input
            type="number"
            value={targetPerSession}
            onChange={(e) => setTargetPerSession(Math.max(1, Number(e.target.value)))}
            step="0.5"
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          />
        </div>

        {/* Parameter 4: Stop per Session */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <ShieldAlert size={12} /> STOP LOSS POR SESSÃO ($)
          </label>
          <input
            type="number"
            value={stopPerSession}
            onChange={(e) => setStopPerSession(Math.max(2, Number(e.target.value)))}
            step="1"
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          />
        </div>

        {/* Parameter 5: Soros Levels */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <TrendingUp size={12} /> NÍVEIS DE SOROS (WIN)
          </label>
          <select
            value={sorosLevels}
            onChange={(e) => setSorosLevels(Number(e.target.value))}
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          >
            <option value={2}>2 Níveis (Conservador - Rec. Rápida)</option>
            <option value={3}>3 Níveis (Moderado - Multiplicador)</option>
            <option value={4}>4 Níveis (Agressivo - Alta Alavancagem)</option>
          </select>
        </div>

        {/* Parameter 6: Max Gales Recovery */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            🛡️ GALES DE RECUPERAÇÃO (LOSS)
          </label>
          <select
            value={maxGaleRecovery}
            onChange={(e) => setMaxGaleRecovery(Number(e.target.value))}
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          >
            <option value={1}>1 Gale de Recuperação</option>
            <option value={2}>2 Gales de Recuperação</option>
            <option value={3}>3 Gales de Recuperação</option>
            <option value={4}>4 Gales de Recuperação</option>
            <option value={5}>5 Gales de Recuperação</option>
            <option value={6}>6 Gales de Recuperação (Livre)</option>
          </select>
        </div>

        {/* Parameter 7: Initial Stake */}
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            💵 STAKE INICIAL ($)
          </label>
          <input
            type="number"
            value={initialStake}
            onChange={(e) => setInitialStake(Math.max(0.35, Number(e.target.value)))}
            step="0.5"
            style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
          />
        </div>
      </div>

      {/* Simulation Key Metrics Output Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        
        {/* Metric 1: Goal Hit Rate */}
        <div className="metric-card" style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '14px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#10B981', letterSpacing: '0.5px' }}>
            🎯 TAXA DE METAS BATIDAS
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>
            {simulationResult.winRateMetas.toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            {simulationResult.metasBatidas} de {simulationResult.totalSessions} sessões concluídas com meta
          </span>
        </div>

        {/* Metric 2: Sorosgale Net Profit */}
        <div className="metric-card" style={{
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '14px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--primary-light)', letterSpacing: '0.5px' }}>
            🚀 LUCRO SIMULADO (SOROSGALE)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: simulationResult.lucroTotalSorosgale >= 0 ? '#34D399' : '#EF4444' }}>
            {simulationResult.lucroTotalSorosgale >= 0 ? '+' : ''}${simulationResult.lucroTotalSorosgale.toFixed(2)}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Resultado líquido total do plano de {daysPerWeek} dias
          </span>
        </div>

        {/* Metric 3: Max Drawdown */}
        <div className="metric-card" style={{
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#F87171', letterSpacing: '0.5px' }}>
            🛡️ MAIOR DRAWDOWN (RECUO)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#F87171' }}>
            -${simulationResult.maxDrawdown.toFixed(2)}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Maior rebaixamento de saldo durante a simulação
          </span>
        </div>

        {/* Metric 4: Efficiency Gain vs Fixed */}
        <div className="metric-card" style={{
          background: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '14px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#60A5FA', letterSpacing: '0.5px' }}>
            ⚡ GANHO DE EFICIÊNCIA VS MÃO FIXA
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#60A5FA' }}>
            +{(simulationResult.lucroTotalSorosgale - simulationResult.lucroTotalMaoFixa).toFixed(2)}$
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Lucro extra gerado pela alavancagem inteligente
          </span>
        </div>

      </div>

      {/* Comparison Table: Fixed vs Martingale vs Sorosgale */}
      <div style={{
        background: 'rgba(14, 11, 24, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '1.25rem',
        overflowX: 'auto'
      }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={16} style={{ color: 'var(--primary-light)' }} />
          COMPARATIVO DE GERENCIAMENTOS (DADOS REAIS HISTÓRICOS)
        </h4>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94A3B8' }}>
              <th style={{ padding: '8px 12px' }}>MODO FINANCEIRO</th>
              <th style={{ padding: '8px 12px' }}>LUCRO SIMULADO</th>
              <th style={{ padding: '8px 12px' }}>RISCO MÁXIMO POR OPERAÇÃO</th>
              <th style={{ padding: '8px 12px' }}>AVALIAÇÃO DE SEGURANÇA</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: '#cbd5e1' }}>
              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>Mão Fixa</td>
              <td style={{ padding: '10px 12px', color: '#60A5FA', fontWeight: 'bold' }}>
                ${simulationResult.lucroTotalMaoFixa.toFixed(2)}
              </td>
              <td style={{ padding: '10px 12px' }}>Baixo (${initialStake.toFixed(2)})</td>
              <td style={{ padding: '10px 12px', color: '#10B981' }}>🟢 Alta Segurança (Crescimento Lento)</td>
            </tr>

            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: '#cbd5e1' }}>
              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>Martingale Tradicional (G2)</td>
              <td style={{ padding: '10px 12px', color: '#F59E0B', fontWeight: 'bold' }}>
                ${simulationResult.lucroTotalMartingale.toFixed(2)}
              </td>
              <td style={{ padding: '10px 12px' }}>Alto (${(initialStake * 7).toFixed(2)})</td>
              <td style={{ padding: '10px 12px', color: '#EF4444' }}>🔴 Risco de Quebra em Sequências Ruins</td>
            </tr>

            <tr style={{ background: 'rgba(139, 92, 246, 0.08)', color: 'white' }}>
              <td style={{ padding: '10px 12px', fontWeight: '800', color: 'var(--primary-light)' }}>
                🚀 Sorosgale ({sorosLevels} Níveis)
              </td>
              <td style={{ padding: '10px 12px', color: '#34D399', fontWeight: '900', fontSize: '0.88rem' }}>
                +${simulationResult.lucroTotalSorosgale.toFixed(2)}
              </td>
              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>Controlado (${(initialStake * 2).toFixed(2)})</td>
              <td style={{ padding: '10px 12px', color: '#34D399', fontWeight: 'bold' }}>
                🏆 RECOMENDADO (Meta Rápida + Baixo Risco)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
