import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ListFilter, Trash2, ArrowUpRight, ArrowDownLeft, Clock, Calendar, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';

export default function Logs({ trades, logs, onClearLogs, dbTrades = [], onClearDb }) {
  const [activeTab, setActiveTab] = useState('orders');
  const logTerminalRef = useRef(null);

  // Calculate assertiveness stats from database trades
  const getAssertivenessStats = () => {
    if (!dbTrades || dbTrades.length === 0) return null;

    // 1. Overall stats
    const total = dbTrades.length;
    const wins = dbTrades.filter(t => t.result === 'WIN').length;
    const overallWinRate = ((wins / total) * 100).toFixed(1);

    // 2. Hour stats
    const hours = {};
    dbTrades.forEach(t => {
      const date = t.timestamp ? new Date(t.timestamp) : new Date();
      const hr = date.getHours();
      if (!hours[hr]) hours[hr] = { wins: 0, total: 0 };
      hours[hr].total += 1;
      if (t.result === 'WIN') hours[hr].wins += 1;
    });

    let bestHour = -1;
    let bestHourRate = 0;
    let bestHourTotal = 0;
    Object.keys(hours).forEach(hr => {
      const rate = hours[hr].wins / hours[hr].total;
      if (rate > bestHourRate || (rate === bestHourRate && hours[hr].total > bestHourTotal)) {
        bestHour = parseInt(hr);
        bestHourRate = rate;
        bestHourTotal = hours[hr].total;
      }
    });

    // 3. Day of week stats
    const days = {};
    dbTrades.forEach(t => {
      const date = t.timestamp ? new Date(t.timestamp) : new Date();
      const day = date.getDay();
      if (!days[day]) days[day] = { wins: 0, total: 0 };
      days[day].total += 1;
      if (t.result === 'WIN') days[day].wins += 1;
    });

    let bestDay = -1;
    let bestDayRate = 0;
    let bestDayTotal = 0;
    Object.keys(days).forEach(day => {
      const rate = days[day].wins / days[day].total;
      if (rate > bestDayRate || (rate === bestDayRate && days[day].total > bestDayTotal)) {
        bestDay = parseInt(day);
        bestDayRate = rate;
        bestDayTotal = days[day].total;
      }
    });

    // 4. Strategy stats
    const strategies = {};
    dbTrades.forEach(t => {
      const name = t.strategyName || t.strategyId || 'Piloto Automático';
      if (!strategies[name]) strategies[name] = { wins: 0, total: 0 };
      strategies[name].total += 1;
      if (t.result === 'WIN') strategies[name].wins += 1;
    });

    let bestStrategy = 'Nenhuma';
    let bestStrategyRate = 0;
    let bestStrategyTotal = 0;
    Object.keys(strategies).forEach(name => {
      const rate = strategies[name].wins / strategies[name].total;
      if (rate > bestStrategyRate || (rate === bestStrategyRate && strategies[name].total > bestStrategyTotal)) {
        bestStrategy = name;
        bestStrategyRate = rate;
        bestStrategyTotal = strategies[name].total;
      }
    });

    const daysOfWeekNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    return {
      total,
      wins,
      overallWinRate,
      bestHour: bestHour !== -1 ? `${bestHour}h - ${bestHour + 1}h` : 'N/A',
      bestHourRate: bestHour !== -1 ? (bestHourRate * 100).toFixed(0) : '0',
      bestHourTotal,
      bestDayName: bestDay !== -1 ? daysOfWeekNames[bestDay] : 'N/A',
      bestDayRate: bestDay !== -1 ? (bestDayRate * 100).toFixed(0) : '0',
      bestDayTotal,
      bestStrategy,
      bestStrategyRate: bestStrategyRate !== 0 ? (bestStrategyRate * 100).toFixed(0) : '0',
      bestStrategyTotal,
      daysData: daysOfWeekNames.map((name, idx) => {
        const stats = days[idx] || { wins: 0, total: 0 };
        const rate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : 0;
        return { name, rate, total: stats.total };
      })
    };
  };

  const stats = getAssertivenessStats();

  // Auto-scroll logs
  useEffect(() => {
    if (logTerminalRef.current && activeTab === 'system') {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px', overflow: 'hidden' }}>
      {/* Header and Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '0',
              padding: '0.5rem 0.25rem',
              color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            Histórico de Ordens ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'profit' ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '0',
              padding: '0.5rem 0.25rem',
              color: activeTab === 'profit' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            Evolução do Lucro
          </button>
          <button
            onClick={() => setActiveTab('assertiveness')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'assertiveness' ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '0',
              padding: '0.5rem 0.25rem',
              color: activeTab === 'assertiveness' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            Análise de Assertividade
          </button>
          <button
            onClick={() => setActiveTab('system')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '0',
              padding: '0.5rem 0.25rem',
              color: activeTab === 'system' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            Logs do Sistema
          </button>
        </div>

        {activeTab === 'system' && (
          <button onClick={onClearLogs} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Trash2 size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'orders' ? (
          /* Orders Table */
          trades.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', minHeight: '200px' }}>
              <ListFilter size={32} />
              <span style={{ fontSize: '0.85rem' }}>Nenhuma ordem executada nesta sessão.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>HORÁRIO</th>
                    <th style={{ padding: '0.5rem' }}>ATIVO</th>
                    <th style={{ padding: '0.5rem' }}>ESTRATÉGIA</th>
                    <th style={{ padding: '0.5rem' }}>DIR.</th>
                    <th style={{ padding: '0.5rem' }}>ENTRADA</th>
                    <th style={{ padding: '0.5rem' }}>NÍVEL</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>RETORNO</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice().reverse().map((trade, idx) => {
                    const isWin = trade.result === 'WIN';
                    const isLoss = trade.result === 'LOSS';
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', hover: { background: 'rgba(255,255,255,0.01)' } }}>
                        <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {trade.time}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold' }}>{trade.symbol}</td>
                        <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-secondary)' }}>{trade.strategyName}</td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: trade.contractType === 'CALL' ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 'bold'
                          }}>
                            {trade.contractType === 'CALL' ? (
                              <><ArrowUpRight size={14} /> CALL</>
                            ) : (
                              <><ArrowDownLeft size={14} /> PUT</>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                          ${trade.stake.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: trade.galeLevel > 0 ? 'var(--warning-glow)' : 'rgba(255,255,255,0.05)',
                            color: trade.galeLevel > 0 ? 'var(--warning)' : 'var(--text-secondary)'
                          }}>
                            {trade.galeLevel > 0 ? `Gale ${trade.galeLevel}` : 'Mão Fixa'}
                          </span>
                        </td>
                        <td style={{
                          padding: '0.6rem 0.5rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'bold',
                          color: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)'
                        }}>
                          {isWin ? `+$${trade.profit.toFixed(2)}` : isLoss ? `-$${trade.stake.toFixed(2)}` : 'Pendente'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'profit' ? (
          /* Profit Evolution Chart */
          trades.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', minHeight: '200px' }}>
              <ListFilter size={32} />
              <span style={{ fontSize: '0.85rem' }}>Aguardando operações concluídas para gerar o gráfico de evolução.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', padding: '0 0.5rem' }}>
              {/* Quick stats banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Lucro Acumulado: </span>
                  <strong style={{
                    color: trades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem'
                  }}>
                    {trades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? '+' : ''}${trades.reduce((sum, t) => sum + t.profit, 0).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total Operações: </span>
                  <strong>{trades.length}</strong>
                </div>
              </div>

              {/* SVG Canvas */}
              <div style={{ flex: 1, minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const getCumulativeData = () => {
                    let sum = 0;
                    const points = [0];
                    trades.forEach(t => {
                      sum += t.profit;
                      points.push(sum);
                    });
                    return points;
                  };

                  const profitData = getCumulativeData();
                  const svgWidth = 600;
                  const svgHeight = 160;
                  const padTop = 15;
                  const padBottom = 20;
                  const padLeft = 45;
                  const padRight = 15;
                  
                  const chartW = svgWidth - padLeft - padRight;
                  const chartH = svgHeight - padTop - padBottom;
                  
                  const minY = Math.min(...profitData);
                  const maxY = Math.max(...profitData);
                  const yRange = (maxY - minY) || 10;
                  
                  const points = profitData.map((val, idx) => {
                    const x = padLeft + (idx / (profitData.length - 1)) * chartW;
                    const y = padTop + (1 - (val - minY) / yRange) * chartH;
                    return { x, y, value: val };
                  });
                  
                  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;
                  
                  const gridLevels = [minY, (minY + maxY) / 2, maxY];

                  return (
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      {gridLevels.map((lvl, lIdx) => {
                        const gridY = padTop + (1 - (lvl - minY) / yRange) * chartH;
                        return (
                          <g key={lIdx}>
                            <line
                              x1={padLeft}
                              y1={gridY}
                              x2={svgWidth - padRight}
                              y2={gridY}
                              stroke="rgba(255, 255, 255, 0.05)"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={padLeft - 8}
                              y={gridY + 3}
                              textAnchor="end"
                              fill="rgba(255,255,255,0.4)"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {lvl >= 0 ? '+' : ''}${lvl.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Filled Area */}
                      <path d={areaD} fill="url(#profitGrad)" />

                      {/* Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Reference line at 0 */}
                      {minY < 0 && maxY > 0 && (() => {
                        const zeroY = padTop + (1 - (0 - minY) / yRange) * chartH;
                        return (
                          <line
                            x1={padLeft}
                            y1={zeroY}
                            x2={svgWidth - padRight}
                            y2={zeroY}
                            stroke="rgba(239, 68, 68, 0.15)"
                            strokeWidth="1.5"
                          />
                        );
                      })()}

                      {/* Data dots */}
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r={profitData.length > 25 ? 1.5 : 3.5}
                          fill={p.value >= 0 ? 'var(--success)' : 'var(--danger)'}
                          stroke="rgba(15, 23, 42, 0.9)"
                          strokeWidth={profitData.length > 25 ? 0.75 : 1.5}
                        />
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>
          )
        ) : activeTab === 'assertiveness' ? (
          /* Assertiveness Analysis Dashboard */
          !stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', minHeight: '200px' }}>
              <ListFilter size={32} />
              <span style={{ fontSize: '0.85rem' }}>Nenhuma operação registrada no banco de dados ainda.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto', padding: '0 0.5rem 1rem 0.5rem' }}>
              {/* Header info / Clear Database */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Dados históricos compilados de <strong>{stats.total}</strong> operações
                </span>
                <button
                  onClick={onClearDb}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '6px',
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={12} /> Limpar Banco
                </button>
              </div>

              {/* Grid cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {/* Win Rate Card */}
                <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-light)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    <TrendingUp size={12} /> TAXA DE WIN
                  </div>
                  <strong style={{ fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {stats.overallWinRate}%
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {stats.wins} Wins de {stats.total} total
                  </span>
                </div>

                {/* Best Hour Card */}
                <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    <Clock size={12} /> HORA MAIS ASSERTIVA
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stats.bestHour}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Assertividade: {stats.bestHourRate}% ({stats.bestHourTotal} ordens)
                  </span>
                </div>

                {/* Best Day Card */}
                <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    <Calendar size={12} /> DIA MAIS ASSERTIVO
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stats.bestDayName}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Assertividade: {stats.bestDayRate}% ({stats.bestDayTotal} ordens)
                  </span>
                </div>

                {/* Best Strategy Card */}
                <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    <Sparkles size={12} /> ESTRATÉGIA DOMINANTE
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }} title={stats.bestStrategy}>
                    {stats.bestStrategy}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Assertividade: {stats.bestStrategyRate}% ({stats.bestStrategyTotal} ordens)
                  </span>
                </div>
              </div>

              {/* Day of Week assertiveness progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>ASSERTIVIDADE POR DIA DA SEMANA</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {stats.daysData.map((d, dIdx) => (
                    <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }}>
                      <span style={{ width: '85px', color: 'var(--text-secondary)' }}>{d.name}</span>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${d.rate}%`,
                          height: '100%',
                          background: d.rate >= 60 ? 'var(--success)' : d.rate >= 40 ? 'var(--warning)' : d.total === 0 ? 'rgba(255,255,255,0.05)' : 'var(--danger)',
                          borderRadius: '3px',
                          boxShadow: d.rate >= 60 ? '0 0 5px rgba(34, 197, 94, 0.2)' : 'none'
                        }}></div>
                      </div>
                      <span style={{ width: '65px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: d.total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {d.total > 0 ? `${d.rate}% (${d.total})` : 'Sem dados'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          /* System Logs Terminal */
          <div
            ref={logTerminalRef}
            style={{
              background: '#020617', // Dark terminal background
              borderRadius: '8px',
              padding: '0.75rem',
              height: '100%',
              minHeight: '200px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Terminal iniciado. Aguardando eventos...</span>
            ) : (
              logs.map((log, index) => {
                let color = 'var(--text-secondary)';
                if (log.type === 'success') color = 'var(--success)';
                if (log.type === 'error') color = 'var(--danger)';
                if (log.type === 'warning') color = 'var(--warning)';

                return (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', lineHeight: '1.4' }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.time}]</span>
                    <span style={{ color, wordBreak: 'break-all' }}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
