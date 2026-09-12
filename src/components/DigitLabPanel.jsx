import React, { useState, useEffect } from 'react';
import { Play, Pause, Save, Download, Cpu, Activity, Zap, AlertCircle, Shield, TrendingUp, BarChart2, Clock, CheckCircle2, RotateCw, Compass, ArrowUpRight, ArrowDownRight, Target, Crosshair } from 'lucide-react';
import { QUANTUM_DEFAULTS, validateDigitConfig } from '../../vps-backend/automation/DigitTrader.js';
import { QUANTUM_ASSETS } from '../../vps-backend/automation/digitAnomaly.js';

const usd = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const percent = (n) => n == null ? '—' : Number(n).toFixed(1) + '%';

export default function DigitLabPanel({ state, available, pending, onConfigure }) {
  const [draft, setDraft] = useState({ ...QUANTUM_DEFAULTS });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('all');

  useEffect(() => {
    if (state?.config && !dirty) {
      setDraft(state.config);
    }
  }, [state?.config, dirty]);

  const update = (key, value) => {
    setDirty(true);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const apply = (patch) => {
    try {
      validateDigitConfig(patch, state?.config || QUANTUM_DEFAULTS);
      onConfigure(patch);
      setDirty(false);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const trades = (state?.trades || []).sort((a, b) => a.timestamp - b.timestamp);
  const filteredTrades = trades.filter(t => selectedAsset === 'all' || t.symbol === selectedAsset);
  
  // Calculate summary metrics
  let net = 0, peak = 0, drawdown = 0, wins = 0, losses = 0, maxWinStreak = 0, curWinStreak = 0;
  const equityPoints = [0];

  for (const t of filteredTrades) {
    net += t.profit;
    peak = Math.max(peak, net);
    drawdown = Math.max(drawdown, peak - net);
    if (t.profit > 0) {
      wins++;
      curWinStreak++;
      if (curWinStreak > maxWinStreak) maxWinStreak = curWinStreak;
    } else {
      losses++;
      curWinStreak = 0;
    }
    equityPoints.push(net);
  }

  const totalOps = wins + losses;
  const winRate = totalOps > 0 ? (wins / totalOps) * 100 : 0;
  const low = Math.min(...equityPoints);
  const high = Math.max(...equityPoints);
  const span = high - low || 1;

  const cooldownSec = state?.cooldownRemainingSec || 0;
  const isCooldown = cooldownSec > 0;
  const cooldownMin = Math.floor(cooldownSec / 60);
  const cooldownSecRemainder = cooldownSec % 60;
  const sessionTarget = state?.config?.sessionTarget || 5.00;
  const sessionProfit = state?.sessionProfit || 0;
  const matrix = state?.matrix || {};

  const exportData = () => {
    const dataBlob = new Blob([JSON.stringify({
      version: state?.version || 'qap-v3',
      simulationOnly: true,
      config: state?.config,
      selectedAsset,
      matrix: state?.matrix,
      trades: filteredTrades,
      metrics: { net, wins, losses, totalOps, winRate, drawdown, maxWinStreak }
    }, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-asymmetric-lab-${selectedAsset}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="digit-lab-panel aut-workspace">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">QUANTUM ASYMMETRIC ENGINE (QAP-V3) · ASSIMETRIA 80%+ / 100% SIMULADO</span>
          <h1>Laboratório Quântico Asimétrico<span>.</span></h1>
          <p>Exploração estatística de alta probabilidade base (<b>DIGITUNDER 8</b> e <b>DIGITOVER 1</b> com 80%+ de acerto) e recuperação suave D'Alembert.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span className={`workspace-status ${state?.config?.enabled ? 'is-online' : ''}`}>
            <i />{state?.status || 'Aguardando VPS'}
          </span>
          {isCooldown && (
            <span style={{ fontSize: '11px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              ⏳ Cooldown Ativo: <b>{cooldownMin}m {cooldownSecRemainder}s</b> restantes (Meta Protegida)
            </span>
          )}
          {state?.config?.enabled && !isCooldown && (
            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              🎯 Meta da Sessão: <b>{usd(sessionProfit)}</b> / {usd(sessionTarget)}
            </span>
          )}
        </div>
      </div>

      {/* MULTI-ASSET SCANNER MATRIX & DIGIT DISTRIBUTION */}
      <section className="aut-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2><Crosshair size={18} /> Scanner de Distribuição L100 & Assimetria Estatística (80%+)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Varredura em tempo real dos 100 últimos dígitos por ativo
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {(state?.config?.symbols || QUANTUM_ASSETS.slice(0, 6)).map((sym) => {
            const m = matrix[sym];
            const hasSignal = m?.contractType != null;
            const percentages = m?.percentages || Array(10).fill(10);
            const coldDigit = m?.coldDigit ?? 0;
            const hotDigit = m?.hotDigit ?? 0;

            return (
              <div
                key={sym}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: hasSignal ? '1px solid #38bdf8' : '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: hasSignal ? '0 0 15px rgba(56, 189, 248, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '14px', color: '#f8fafc' }}>{sym}</b>
                  {hasSignal ? (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        fontWeight: 'bold',
                        border: '1px solid rgba(56, 189, 248, 0.4)'
                      }}
                    >
                      🎯 {m.contractType} {m.barrier ?? ''} ({m.expectedWinRate || 80}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>⚖ Frequência Equilibrada</span>
                  )}
                </div>

                {/* Mini Digit Frequency Bar chart (0-9) */}
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '36px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '4px' }}>
                  {percentages.map((pct, digit) => {
                    const isCold = digit === coldDigit;
                    const isHot = digit === hotDigit;
                    const height = Math.max(4, Math.min(32, Math.round((pct / 25) * 32)));
                    const bg = isCold ? '#38bdf8' : isHot ? '#f43f5e' : 'rgba(148, 163, 184, 0.4)';

                    return (
                      <div
                        key={digit}
                        title={`Dígito ${digit}: ${pct}% (L100)`}
                        style={{
                          flex: 1,
                          height: `${height}px`,
                          background: bg,
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          color: '#fff'
                        }}
                      />
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                  <span>Dígito Frio: <b style={{ color: '#38bdf8' }}>{coldDigit}</b> ({percentages[coldDigit]}%)</span>
                  <span>Último: <b style={{ color: '#f8fafc' }}>{m?.lastDigit ?? '—'}</b></span>
                  <span>Dígito Quente: <b style={{ color: '#f43f5e' }}>{hotDigit}</b> ({percentages[hotDigit]}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PARAMETERS AND STATS */}
      <div className="aut-grid">
        {/* CONTROLS */}
        <section className="aut-card">
          <h2><Cpu size={18} /> Parâmetros QAP-V3 (Assimetria & D'Alembert)</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 16px' }}>
            Operações em contratos de alta probabilidade natural (UNDER 8 / OVER 1 com 80%+). O D'Alembert suave substitui o Martingale destrutivo.
          </p>

          <div className="aut-form">
            <label>
              Entrada simulada base (USD)
              <input
                type="number"
                min="0.35"
                max="100"
                step="0.1"
                value={draft.stake}
                onChange={(e) => update('stake', Number(e.target.value))}
              />
            </label>

            <label>
              Incremento D'Alembert após Loss (USD)
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={draft.dalembertIncrement || 0.50}
                onChange={(e) => update('dalembertIncrement', Number(e.target.value))}
              />
            </label>

            <label>
              Passos Máximos de Recuperação D'Alembert
              <select
                value={draft.maxLossRecoverySteps ?? 2}
                onChange={(e) => update('maxLossRecoverySteps', Number(e.target.value))}
              >
                <option value="0">Sem Progressão (Mão Fixa)</option>
                <option value="1">1 Passo (+0.50 USD)</option>
                <option value="2">2 Passos (+1.00 USD Máx · Recomendado)</option>
                <option value="3">3 Passos Conservadores</option>
              </select>
            </label>

            <label>
              Meta da Micro-Sessão (USD)
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={draft.sessionTarget || 5.00}
                onChange={(e) => update('sessionTarget', Number(e.target.value))}
              />
            </label>

            <label>
              Tempo de Cooldown (minutos)
              <input
                type="number"
                min="1"
                max="240"
                step="5"
                value={draft.cooldownMinutes || 30}
                onChange={(e) => update('cooldownMinutes', Number(e.target.value))}
              />
            </label>

            <label>
              Teto de risco por ciclo (USD)
              <input
                type="number"
                min="1"
                max="500"
                value={draft.cycleBudget || 15.0}
                onChange={(e) => update('cycleBudget', Number(e.target.value))}
              />
            </label>
          </div>

          <fieldset style={{ marginTop: '16px' }}>
            <legend>Ativos Monitorados em Paralelo</legend>
            <div className="aut-checks">
              {QUANTUM_ASSETS.map((sym) => (
                <label key={sym} className="aut-checkbox">
                  <input
                    type="checkbox"
                    checked={(draft.symbols || []).includes(sym)}
                    onChange={(e) => {
                      const current = draft.symbols || [];
                      const next = e.target.checked
                        ? [...current, sym]
                        : current.filter((s) => s !== sym);
                      update('symbols', next);
                    }}
                  />
                  {sym}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="aut-actions">
            <button
              className="workspace-button"
              disabled={pending || (!dirty && !!state?.config) || !!state?.pending?.length}
              onClick={() => apply(draft)}
            >
              <Save size={15} /> Salvar Parâmetros
            </button>

            <button
              className="workspace-button workspace-button-primary"
              disabled={pending}
              onClick={() =>
                apply(
                  state?.config?.enabled
                    ? { enabled: false }
                    : { ...(dirty ? draft : (state?.config || draft)), enabled: true }
                )
              }
            >
              {state?.config?.enabled ? <Pause size={15} /> : <Play size={15} />}
              {state?.config?.enabled ? 'Pausar Laboratório QAP' : 'Iniciar Laboratório QAP'}
            </button>
          </div>

          {error && <p role="alert" style={{ color: '#fb7185', marginTop: '8px' }}>{error}</p>}
        </section>

        {/* METRICS & OVERVIEW */}
        <section className="aut-card">
          <h2><TrendingUp size={18} /> Desempenho Global da Simulação QAP-V3</h2>
          <div className="aut-form" style={{ marginBottom: '16px' }}>
            <label>
              Filtrar Ativo nas Métricas
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
              >
                <option value="all">Todos os Ativos Monitorados</option>
                {QUANTUM_ASSETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="aut-metrics">
            <div className="aut-metric">
              <span className="aut-metric-label">Resultado Simulado Total</span>
              <span
                className="aut-metric-value"
                style={{ color: net >= 0 ? '#34d399' : '#fb7185' }}
              >
                {usd(net)}
              </span>
              <span className="aut-metric-sub">{totalOps} entradas simuladas</span>
            </div>

            <div className="aut-metric">
              <span className="aut-metric-label">Taxa de Acerto Real</span>
              <span
                className="aut-metric-value"
                style={{ color: winRate >= 75 ? '#34d399' : winRate >= 60 ? '#facc15' : '#fb7185' }}
              >
                {percent(winRate)}
              </span>
              <span className="aut-metric-sub">{wins} vitórias · {losses} derrotas</span>
            </div>

            <div className="aut-metric">
              <span className="aut-metric-label">Maior Sequência de Wins</span>
              <span className="aut-metric-value" style={{ color: '#38bdf8' }}>{maxWinStreak}</span>
              <span className="aut-metric-sub">Vitórias consecutivas</span>
            </div>

            <div className="aut-metric">
              <span className="aut-metric-label">Drawdown Máximo</span>
              <span className="aut-metric-value" style={{ color: drawdown > 10 ? '#fb7185' : '#94a3b8' }}>{usd(drawdown)}</span>
              <span className="aut-metric-sub">{state?.pending?.length || 0} ordens em andamento</span>
            </div>
          </div>

          {/* EQUITY CURVE SVG */}
          <div style={{ marginTop: '20px', background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <b>Curva de Capital (Assimetria QAP-V3)</b>
              <span style={{ color: '#94a3b8' }}>{usd(low)} a {usd(high)}</span>
            </div>
            {equityPoints.length > 1 ? (
              <svg width="100%" height="80" style={{ overflow: 'visible' }}>
                <polyline
                  fill="none"
                  stroke={net >= 0 ? '#34d399' : '#fb7185'}
                  strokeWidth="2"
                  points={equityPoints
                    .map(
                      (p, idx) =>
                        `${(idx / (equityPoints.length - 1)) * 300},${
                          70 - ((p - low) / span) * 60
                        }`
                    )
                    .join(' ')}
                />
              </svg>
            ) : (
              <p>Aguardando a primeira oportunidade assimétrica para gerar o gráfico.</p>
            )}
          </div>
        </section>
      </div>

      {/* RECENT TRADES */}
      <section className="aut-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2>Últimas Entradas Assimétricas Simuladas</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="workspace-button"
              disabled={!trades.length && !state?.pending?.length}
              onClick={() => {
                if (window.confirm('Tem certeza que deseja resetar o histórico e zerar as métricas para reiniciar os testes no QAP-V3?')) {
                  onConfigure({ reset: true });
                }
              }}
              style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fb7185' }}
            >
              <RotateCw size={15} /> Resetar Histórico
            </button>
            <button className="workspace-button" disabled={!trades.length} onClick={exportData}>
              <Download size={15} /> Exportar Relatório JSON
            </button>
          </div>
        </div>

        <div className="aut-table">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Ativo</th>
                <th>Contrato</th>
                <th>Barreira</th>
                <th>Dígito de Saída</th>
                <th>Probabilidade</th>
                <th>Stake</th>
                <th>Lucro Líquido</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.slice(-25).reverse().map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                  <td><b>{t.symbol}</b></td>
                  <td>
                    <span
                      className="badge-tag"
                      style={{
                        background: t.profit > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                        color: t.profit > 0 ? '#34d399' : '#fb7185',
                        fontWeight: 'bold'
                      }}
                    >
                      🎯 {t.contractType}
                    </span>
                  </td>
                  <td><b>{t.barrier ?? '—'}</b></td>
                  <td><b style={{ color: '#f8fafc' }}>{t.exitDigit ?? '—'}</b></td>
                  <td><b>{t.expectedWinRate ? `${t.expectedWinRate}%` : '80%'}</b></td>
                  <td>{usd(t.stake)}</td>
                  <td style={{ color: t.profit > 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                    {t.profit > 0 ? `+${usd(t.profit)}` : usd(t.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredTrades.length && <p>Nenhuma entrada assimétrica simulada ainda para este filtro.</p>}

        {/* Live event logs */}
        <div style={{ marginTop: '16px' }}>
          {(state?.events || []).slice(-6).reverse().map((e, i) => (
            <p key={i} style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>
              <time>{new Date(e.time).toLocaleTimeString()}</time> · <b>{e.symbol || 'SISTEMA'}</b>: {e.message}
            </p>
          ))}
        </div>
      </section>
    </section>
  );
}
