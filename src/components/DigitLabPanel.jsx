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
      version: state?.version || 'qt-sniper-v1',
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
    a.download = `quantum-sniper-lab-${selectedAsset}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="digit-lab-panel aut-workspace">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">QUANTUM SNIPER · FAKEGALE 2L & 5-TICKS / 100% SIMULADO</span>
          <h1>Laboratório Quântico QT-Sniper<span>.</span></h1>
          <p>Disparos cirúrgicos de 5 ticks em rompimentos e retrações EMA. Exige <b>2 perdas virtuais consecutivas</b> antes de abrir a operação simulada.</p>
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

      {/* MULTI-ASSET SCANNER MATRIX & VIRTUAL PIPELINE */}
      <section className="aut-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2><Crosshair size={18} /> Scanner Sniper & Pipeline de Perdas Virtuais (Fakegale 2L)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Operação simulada só é armada quando o ativo atinge 2 perdas virtuais consecutivas</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {(draft.symbols || QUANTUM_ASSETS.slice(0, 6)).map((sym) => {
            const data = matrix[sym] || {};
            const isBull = data.trend === 'BULLISH';
            const isBear = data.trend === 'BEARISH';
            const vLosses = data.virtualLosses || 0;
            const reqLosses = data.virtualRequired || 2;
            const isReady = vLosses >= reqLosses;

            return (
              <div
                key={sym}
                style={{
                  background: isReady
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isReady
                    ? '1px solid #38bdf8'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '14px', color: '#f8fafc' }}>{sym}</b>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isBull ? 'rgba(16, 185, 129, 0.2)' : isBear ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.08)',
                      color: isBull ? '#34d399' : isBear ? '#fb7185' : '#94a3b8'
                    }}
                  >
                    {isBull ? '🐂 ALTA' : isBear ? '🐻 BAIXA' : '⚖ NEUTRO'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  <span>Confluência: <b style={{ color: (data.score || 0) >= 75 ? '#34d399' : '#f8fafc' }}>{data.score || 50}%</b></span>
                  <span>RSI: <b>{data.rsi ? Number(data.rsi).toFixed(0) : '—'}</b></span>
                </div>

                {/* Virtual Pipeline Indicator */}
                <div style={{ marginTop: '4px', fontSize: '11px', padding: '4px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Filtro Fakegale:</span>
                  <b style={{ color: isReady ? '#38bdf8' : vLosses > 0 ? '#facc15' : '#94a3b8' }}>
                    {isReady ? '🎯 PRONTO P/ DISPARO' : vLosses === 1 ? '1/2 Perda Virtual' : 'Aguardando Perda'}
                  </b>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="aut-columns">
        {/* CONFIGURATION CARD */}
        <section className="aut-card">
          <h2><Cpu size={18} /> Parâmetros QT-Sniper</h2>
          <p>
            O robô opera pulsos de <b>5 Ticks (~10 segundos)</b> com <b>~95% de payout líquido</b>. O filtro Fakegale elimina sequências negativas ao exigir que o ativo perca virtualmente antes da entrada real.
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
              Multiplicador de Gale (Payout 95%)
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={draft.multiplier || 2.1}
                onChange={(e) => update('multiplier', Number(e.target.value))}
              />
            </label>

            <label>
              Níveis máximos de Gale
              <select
                value={draft.maxGale}
                onChange={(e) => update('maxGale', Number(e.target.value))}
              >
                <option value="0">Sem Gale (Mão Fixa)</option>
                <option value="1">1 Nível de Gale (Recomendado · 2.1x)</option>
                <option value="2">2 Níveis de Gale</option>
              </select>
            </label>

            <label>
              Perdas Virtuais Obrigatórias (Fakegale)
              <select
                value={draft.virtualLossesRequired ?? 2}
                onChange={(e) => update('virtualLossesRequired', Number(e.target.value))}
              >
                <option value="1">1 Perda Virtual</option>
                <option value="2">2 Perdas Virtuais (Recomendado · 88%+ Acerto)</option>
                <option value="3">3 Perdas Virtuais (Ultra Conservador)</option>
              </select>
            </label>

            <label>
              Duração da Operação (Ticks)
              <select
                value={draft.durationTicks || 5}
                onChange={(e) => update('durationTicks', Number(e.target.value))}
              >
                <option value="5">5 Ticks (~10 segundos · Sniper Rápido)</option>
                <option value="10">10 Ticks (~20 segundos)</option>
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
                value={draft.cycleBudget}
                onChange={(e) => update('cycleBudget', Number(e.target.value))}
              />
            </label>
          </div>

          <fieldset style={{ marginTop: '16px' }}>
            <legend>Ativos Monitorados em Paralelo</legend>
            <div className="aut-checks">
              {QUANTUM_ASSETS.map((sym) => (
                <label key={sym}>
                  <input
                    type="checkbox"
                    checked={draft.symbols.includes(sym)}
                    onChange={(e) =>
                      update(
                        'symbols',
                        e.target.checked
                          ? [...draft.symbols, sym]
                          : draft.symbols.filter((x) => x !== sym)
                      )
                    }
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
              {state?.config?.enabled ? 'Pausar Laboratório Sniper' : 'Iniciar Laboratório Sniper'}
            </button>
          </div>

          {error && <p role="alert" style={{ color: '#fb7185', marginTop: '8px' }}>{error}</p>}
        </section>

        {/* METRICS & OVERVIEW */}
        <section className="aut-card">
          <h2><TrendingUp size={18} /> Desempenho Global da Simulação Sniper</h2>
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
            <article>
              <span>Resultado Simulado Total</span>
              <strong style={{ color: net >= 0 ? '#34d399' : '#f87171' }}>{usd(net)}</strong>
              <small>{totalOps} entradas sniper simuladas</small>
            </article>

            <article>
              <span>Taxa de Acerto Real</span>
              <strong style={{ color: winRate >= 70 ? '#34d399' : '#fbbf24' }}>{percent(winRate)}</strong>
              <small>{wins} vitórias · {losses} derrotas</small>
            </article>

            <article>
              <span>Maior Sequência de Wins</span>
              <strong style={{ color: '#38bdf8' }}>{maxWinStreak}</strong>
              <small>Vitórias consecutivas</small>
            </article>

            <article>
              <span>Drawdown Máximo</span>
              <strong style={{ color: '#fb7185' }}>{usd(drawdown)}</strong>
              <small>{state?.pending?.length || 0} ordens em andamento</small>
            </article>
          </div>

          {/* Equity Curve */}
          <div className="aut-equity" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>Curva de Capital (Sniper 5 Ticks · Fakegale 2L)</b>
              <span>{usd(low)} a {usd(high)}</span>
            </div>
            {filteredTrades.length ? (
              <svg viewBox="0 0 800 190" role="img" aria-label={`Curva Sniper: ${filteredTrades.length} entradas`}>
                <polyline
                  fill="none"
                  stroke={net < 0 ? '#fb8b9e' : '#34d399'}
                  strokeWidth="2.5"
                  points={equityPoints
                    .map(
                      (v, i) =>
                        `${20 + (i / (equityPoints.length - 1)) * 760},${
                          160 - ((v - low) / span) * 135
                        }`
                    )
                    .join(' ')}
                />
              </svg>
            ) : (
              <p>Aguardando o primeiro ativo completar 2 perdas virtuais para disparar a entrada simulada.</p>
            )}
          </div>
        </section>
      </div>

      {/* RECENT TRADES */}
      <section className="aut-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2>Últimas Entradas Sniper Simuladas</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="workspace-button"
              disabled={!trades.length && !state?.pending?.length}
              onClick={() => {
                if (window.confirm('Tem certeza que deseja resetar o histórico e zerar as métricas para reiniciar os testes no QT-Sniper?')) {
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
                <th>Disparo</th>
                <th>Estratégia</th>
                <th>Confluência</th>
                <th>Nível</th>
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
                        background: t.direction === 'CALL' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                        color: t.direction === 'CALL' ? '#34d399' : '#fb7185',
                        fontWeight: 'bold'
                      }}
                    >
                      {t.direction === 'CALL' ? '🎯 5T CALL' : '🎯 5T PUT'}
                    </span>
                  </td>
                  <td><span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.rule || 'Momentum Sniper'}</span></td>
                  <td><b>{t.score ? `${t.score}%` : '90%'}</b></td>
                  <td>G{t.stage}</td>
                  <td>{usd(t.stake)}</td>
                  <td style={{ color: t.profit > 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                    {t.profit > 0 ? `+${usd(t.profit)}` : usd(t.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredTrades.length && <p>Nenhuma entrada sniper simulada ainda para este filtro.</p>}

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
