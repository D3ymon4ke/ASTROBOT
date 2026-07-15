import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Play, AlertCircle, CheckCircle, RefreshCw, Calendar, Power } from 'lucide-react';

export default function Scheduler({
  schedulerState,
  onToggleScheduler,
  cycles,
  onSaveCycles,
  activeCycleId,
  onTriggerCycleManually,
  schedulerLogs,
  onClearSchedulerLogs
}) {
  const [newCycle, setNewCycle] = useState({
    name: '',
    startTime: '09:00',
    takeProfit: 50.0,
    stopLoss: 50.0,
    stakeValue: 1.0,
    symbol: 'R_100',
    selectedStrategy: 'autopilot'
  });

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const assets = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { symbol: '1HZ200V', name: 'Volatility 200 (1s) Index' },
    { symbol: '1HZ300V', name: 'Volatility 300 (1s) Index' },
    { symbol: 'RDBEAR', name: 'Bear Market Index' },
    { symbol: 'RDBULL', name: 'Bull Market Index' },
    { symbol: 'frxEURUSD', name: 'EUR/USD' },
    { symbol: 'frxEURGBP', name: 'EUR/GBP' },
    { symbol: 'frxEURJPY', name: 'EUR/JPY' },
    { symbol: 'frxGBPUSD', name: 'GBP/USD' },
    { symbol: 'frxUSDJPY', name: 'USD/JPY' },
    { symbol: 'frxAUDUSD', name: 'AUD/USD' },
    { symbol: 'frxUSDCAD', name: 'USD/CAD' }
  ];

  const strategies = [
    { id: 'autopilot', name: 'Piloto Automático 🤖' },
    { id: 'ma_crossover', name: 'Cruzamento de Médias (9/21)' },
    { id: 'mhi_minority', name: 'MHI Padrão (Minoria)' },
    { id: 'mhi_majority', name: 'MHI Maioria' },
    { id: 'twin_towers', name: 'Torres Gêmeas' },
    { id: 'three_musketeers', name: 'Três Mosqueteiros' },
    { id: 'padrao_23', name: 'Padrão 23' },
    { id: 'padrao_3x1', name: 'Padrão 3x1' },
    { id: 'padrao_impar', name: 'Padrão Ímpar' },
    { id: 'r7', name: 'Padrão R7' },
    { id: 'pullback', name: 'Pullback na Média (EMA 20)' },
    { id: 'reversal', name: 'Reversão (Hammer / Shooting)' },
    { id: 'pivot_123', name: 'Pivô de 1-2-3' },
    { id: 'ross_hook', name: '123 de Ross' },
    { id: 'r10', name: 'Padrão R10' },
    { id: 'marubozu', name: 'Marubozu' },
    { id: 'bos_choch', name: 'BOS + ChoCH' }
  ];

  const handleAddCycle = (e) => {
    e.preventDefault();
    if (!newCycle.name.trim()) return;

    const cycleToAdd = {
      ...newCycle,
      id: `cycle-${Date.now()}`,
      active: true,
      status: 'Aguardando', // 'Aguardando' | 'Executando' | 'Meta Batida' | 'Stop Atingido' | 'Interrompido'
      lastRun: null
    };

    onSaveCycles([...cycles, cycleToAdd]);
    setNewCycle({
      name: '',
      startTime: '09:00',
      takeProfit: 50.0,
      stopLoss: 50.0,
      stakeValue: 1.0,
      symbol: 'R_100',
      selectedStrategy: 'autopilot'
    });
  };

  const handleDeleteCycle = (id) => {
    onSaveCycles(cycles.filter(c => c.id !== id));
  };

  const handleToggleCycleActive = (id, currentVal) => {
    onSaveCycles(cycles.map(c => c.id === id ? { ...c, active: !currentVal, status: !currentVal ? 'Aguardando' : c.status } : c));
  };

  const handleResetCycleStatus = (id) => {
    onSaveCycles(cycles.map(c => c.id === id ? { ...c, status: 'Aguardando' } : c));
  };

  const handleResetAllCycles = () => {
    onSaveCycles(cycles.map(c => ({ ...c, status: 'Aguardando' })));
  };

  const getCleanSymbolName = (symbolCode) => {
    const asset = assets.find(a => a.symbol === symbolCode);
    return asset ? asset.name.replace('Volatility ', '').replace(' Index', '') : symbolCode;
  };

  const getCleanStrategyName = (strategyId) => {
    const strat = strategies.find(s => s.id === strategyId);
    return strat ? strat.name : strategyId;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem', height: '100%', overflow: 'hidden' }}>
      
      {/* Coluna Esquerda: Adicionar Ciclo e Status Global */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        
        {/* Painel de Controle Global */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Power size={18} style={{ color: schedulerState ? 'var(--success)' : 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.5px' }}>AGENDADOR AUTOMÁTICO</h3>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={schedulerState}
                onChange={(e) => onToggleScheduler(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Hora Local:</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{currentTime}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            <span>Status:</span>
            <span style={{ 
              fontWeight: 'bold', 
              color: schedulerState ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {schedulerState ? (
                <>
                  <span className="pulse-dot-green" style={{ width: '6px', height: '6px', boxShadow: 'none' }} />
                  ATIVO E MONITORANDO
                </>
              ) : (
                'DESATIVADO'
              )}
            </span>
          </div>

          {activeCycleId && (
            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.5rem 0.75rem', 
              background: 'rgba(139, 92, 246, 0.08)', 
              border: '1px solid rgba(139, 92, 246, 0.2)', 
              borderRadius: '8px',
              fontSize: '0.75rem'
            }}>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', fontWeight: 'bold' }}>CICLO EM EXECUÇÃO</span>
              <strong style={{ color: 'var(--primary-light)' }}>
                {cycles.find(c => c.id === activeCycleId)?.name || 'Ciclo Ativo'}
              </strong>
            </div>
          )}
        </div>

        {/* Formulário Novo Ciclo */}
        <form onSubmit={handleAddCycle} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary-light)', letterSpacing: '0.5px' }}>NOVO CICLO DIÁRIO</h4>
          
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>NOME DO CICLO</label>
            <input
              type="text"
              placeholder="Ex: Manhã, Tarde, Noite..."
              value={newCycle.name}
              onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>HORÁRIO INÍCIO</label>
              <input
                type="time"
                value={newCycle.startTime}
                onChange={(e) => setNewCycle({ ...newCycle, startTime: e.target.value })}
                style={{ 
                  fontSize: '0.8rem', 
                  padding: '0.45rem 0.6rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>VALOR ENTRADA ($)</label>
              <input
                type="number"
                value={newCycle.stakeValue}
                onChange={(e) => setNewCycle({ ...newCycle, stakeValue: parseFloat(e.target.value) })}
                min="0.35"
                step="0.01"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>META LUCRO ($)</label>
              <input
                type="number"
                value={newCycle.takeProfit}
                onChange={(e) => setNewCycle({ ...newCycle, takeProfit: parseFloat(e.target.value) })}
                min="1"
                step="1"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>STOP LOSS ($)</label>
              <input
                type="number"
                value={newCycle.stopLoss}
                onChange={(e) => setNewCycle({ ...newCycle, stopLoss: parseFloat(e.target.value) })}
                min="1"
                step="1"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>ATIVO DE NEGOCIAÇÃO</label>
            <select
              value={newCycle.symbol}
              onChange={(e) => setNewCycle({ ...newCycle, symbol: e.target.value })}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', height: '34px' }}
            >
              {assets.map(a => (
                <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>ESTRATÉGIA</label>
            <select
              value={newCycle.selectedStrategy}
              onChange={(e) => setNewCycle({ ...newCycle, selectedStrategy: e.target.value })}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', height: '34px' }}
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="primary" style={{ padding: '0.5rem', fontSize: '0.82rem', fontWeight: 'bold', marginTop: '0.25rem', width: '100%' }}>
            <Plus size={16} /> ADICIONAR CICLO
          </button>
        </form>
      </div>

      {/* Coluna Direita: Lista de Ciclos e Logs do Agendador */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        
        {/* Painel Central: Lista de Ciclos */}
        <div className="glass-panel" style={{ padding: '1.25rem', flex: 1.3, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={18} style={{ color: 'var(--primary-light)' }} />
              CICLOS DE OPERAÇÃO PROGRAMADOS
            </h3>
            <button 
              onClick={handleResetAllCycles} 
              style={{ padding: '3px 8px', fontSize: '0.65rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
              title="Resetar todos os ciclos para Aguardando"
            >
              Resetar Status
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '2px' }}>
            {cycles.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ strokeWidth: 1.5 }} />
                <span style={{ fontSize: '0.78rem' }}>Nenhum ciclo de operação agendado.</span>
                <span style={{ fontSize: '0.68rem', textAlign: 'center', maxWidth: '280px' }}>Adicione ciclos de manhã ou noite usando o formulário ao lado.</span>
              </div>
            ) : (
              cycles.map((cycle) => {
                const isCycleRunning = activeCycleId === cycle.id;
                
                let statusColor = 'var(--text-muted)';
                if (cycle.status === 'Executando') statusColor = 'var(--primary-light)';
                if (cycle.status === 'Meta Batida') statusColor = 'var(--success)';
                if (cycle.status === 'Stop Atingido') statusColor = 'var(--danger)';
                if (cycle.status === 'Interrompido') statusColor = 'var(--warning)';

                return (
                  <div 
                    key={cycle.id} 
                    style={{ 
                      padding: '0.75rem 1rem', 
                      background: isCycleRunning ? 'rgba(139, 92, 246, 0.04)' : 'rgba(255,255,255,0.01)',
                      border: isCycleRunning ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <label className="switch" style={{ width: '34px', height: '18px' }}>
                        <input
                          type="checkbox"
                          checked={cycle.active}
                          onChange={() => handleToggleCycleActive(cycle.id, cycle.active)}
                          disabled={isCycleRunning}
                        />
                        <span className="slider" style={{ borderRadius: '18px' }}></span>
                      </label>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: cycle.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{cycle.name}</strong>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            background: 'rgba(255,255,255,0.05)', 
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--primary-light)',
                            fontWeight: 'bold' 
                          }}>
                            {cycle.startTime}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Entrada: <strong>${cycle.stakeValue}</strong> | TP: <strong style={{ color: 'var(--success)' }}>${cycle.takeProfit}</strong> | SL: <strong style={{ color: 'var(--danger)' }}>${cycle.stopLoss}</strong>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          Ativo: {getCleanSymbolName(cycle.symbol)} | {getCleanStrategyName(cycle.selectedStrategy)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold', 
                        color: statusColor,
                        background: cycle.status === 'Aguardando' ? 'transparent' : 'rgba(255,255,255,0.03)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {cycle.status.toUpperCase()}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {cycle.status !== 'Aguardando' && (
                          <button
                            onClick={() => handleResetCycleStatus(cycle.id)}
                            style={{ padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', color: 'var(--text-secondary)' }}
                            title="Resetar Status para Aguardando"
                          >
                            <RefreshCw size={11} />
                          </button>
                        )}
                        <button
                          onClick={() => onTriggerCycleManually(cycle.id)}
                          disabled={!schedulerState || isCycleRunning}
                          style={{ padding: '4px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '4px', color: 'var(--success)' }}
                          title="Iniciar Ciclo Manualmente Agora"
                        >
                          <Play size={11} fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleDeleteCycle(cycle.id)}
                          disabled={isCycleRunning}
                          style={{ padding: '4px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '4px', color: 'var(--danger)' }}
                          title="Excluir Ciclo"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Inferior: Histórico de Ações do Agendador */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', flex: 0.7, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-primary)' }}>LOGS DE AUTOMAÇÃO</h4>
            <button 
              onClick={onClearSchedulerLogs}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.65rem', cursor: 'pointer', padding: '2px' }}
            >
              Limpar Logs
            </button>
          </div>

          <div style={{ 
            flex: 1, 
            background: 'rgba(0,0,0,0.2)', 
            border: '1px solid rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            padding: '0.5rem',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            {schedulerLogs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', display: 'block', marginTop: '1rem' }}>Sem eventos registrados.</span>
            ) : (
              schedulerLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    color: log.type === 'error' ? 'var(--danger)' : 
                           log.type === 'success' ? 'var(--success)' : 
                           log.type === 'warning' ? 'var(--warning)' : 'var(--text-secondary)',
                    lineHeight: '1.3'
                  }}
                >
                  [{log.time}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
