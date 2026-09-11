import React, { useState, useEffect } from 'react';
import { Play, Pause, Save, Download, Cpu, Activity, Zap, AlertCircle, Shield, TrendingUp, BarChart2 } from 'lucide-react';
import { DIGIT_DEFAULTS, validateDigitConfig } from '../../vps-backend/automation/DigitTrader.js';
import { DIGIT_ASSETS } from '../../vps-backend/automation/digitAnomaly.js';

const usd = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const percent = (n) => n == null ? '—' : Number(n).toFixed(1) + '%';

export default function DigitLabPanel({ state, available, pending, onConfigure }) {
  const [draft, setDraft] = useState({ ...DIGIT_DEFAULTS });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(DIGIT_ASSETS[0]);

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
      validateDigitConfig(patch, state?.config || DIGIT_DEFAULTS);
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

  const currentDistribution = state?.distribution?.[selectedAsset] || {
    counts: Array(10).fill(0),
    percentages: Array(10).fill(0),
    sampleSize: 0,
    chiSquare: 0,
    ranked: [],
    hotDigits: [],
    coldDigits: [],
    lastDigits: []
  };

  const exportData = () => {
    const dataBlob = new Blob([JSON.stringify({
      version: state?.version || 'digit-v1',
      simulationOnly: true,
      config: state?.config,
      selectedAsset,
      distribution: state?.distribution,
      trades: filteredTrades,
      metrics: { net, wins, losses, totalOps, winRate, drawdown, maxWinStreak }
    }, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-digit-lab-${selectedAsset}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="digit-lab-panel aut-workspace">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">PESQUISA CONTÍNUA / 100% SIMULADO</span>
          <h1>Laboratório de Dígitos Quantum<span>.</span></h1>
          <p>Estratégia QD-Differ (Dígito Diferente) com detecção de anomalias estatísticas de repetição e clustering.</p>
        </div>
        <span className={`workspace-status ${state?.config?.enabled ? 'is-online' : ''}`}>
          <i />{state?.status || 'Aguardando VPS'}
        </span>
      </div>

      <div className="aut-columns">
        {/* CONFIGURATION CARD */}
        <section className="aut-card">
          <h2><Cpu size={18} /> Parâmetros do Algoritmo QD-Differ</h2>
          <p>
            Opera no modo <b>DIGITDIFF</b> com 90% de probabilidade matemática base por tick. O filtro aguarda anomalias de repetição dupla ou exaustão de dígitos superaquecidos antes de simular a entrada. Nenhuma ordem real é enviada à corretora.
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
              Multiplicador de Gale
              <input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={draft.multiplier}
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
                <option value="1">1 Nível de Gale (Recomendado)</option>
                <option value="2">2 Níveis de Gale</option>
              </select>
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

            <label>
              Janela de amostragem (ticks)
              <input
                type="number"
                min="20"
                max="200"
                value={draft.windowSize}
                onChange={(e) => update('windowSize', Number(e.target.value))}
              />
            </label>

            <label>
              Amostra mínima para disparo
              <input
                type="number"
                min="10"
                max="100"
                value={draft.minSamples}
                onChange={(e) => update('minSamples', Number(e.target.value))}
              />
            </label>
          </div>

          <fieldset>
            <legend>Ativos Monitorados</legend>
            <div className="aut-checks">
              {DIGIT_ASSETS.map((sym) => (
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
              {state?.config?.enabled ? 'Pausar Laboratório de Dígitos' : 'Iniciar Laboratório de Dígitos'}
            </button>
          </div>

          {error && <p role="alert" style={{ color: '#fb7185', marginTop: '8px' }}>{error}</p>}
          {!state && (
            <p style={{ fontSize: '12px', color: '#fbbf24', marginTop: '10px' }}>
              💡 <b>Aviso:</b> Se a VPS estiver em execução no servidor remoto, execute <code>git pull</code> e reinicie o processo do Node (ex: <code>pm2 restart</code>) para que a VPS ative o motor de dígitos em tempo real.
            </p>
          )}
        </section>

        {/* HEATMAP & DIGIT DISTRIBUTION */}
        <section className="aut-card">
          <h2><BarChart2 size={18} /> Distribuição & Anomalias em Tempo Real</h2>
          <div className="aut-form" style={{ marginBottom: '16px' }}>
            <label>
              Ativo para Inspeção Visual
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
              >
                {DIGIT_ASSETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <p>
            Amostra atual: <b>{currentDistribution.sampleSize} ticks</b> · Teste Qui-Quadrado (&chi;&sup2;): <b>{currentDistribution.chiSquare}</b> (Normal: &lt; 16.9)
          </p>

          {/* Bar Chart Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px', margin: '16px 0', alignItems: 'flex-end', height: '120px', background: 'rgba(0,0,0,0.2)', padding: '12px 8px 4px 8px', borderRadius: '8px' }}>
            {currentDistribution.percentages.map((pct, digit) => {
              const isHot = pct >= 18;
              const isCold = pct <= 4;
              const barHeight = Math.min(100, Math.max(8, pct * 3.5));
              const color = isHot ? '#f43f5e' : isCold ? '#38bdf8' : '#10b981';

              return (
                <div key={digit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>{pct.toFixed(0)}%</span>
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeight}%`,
                      background: color,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      boxShadow: isHot ? '0 0 10px rgba(244, 63, 94, 0.5)' : 'none'
                    }}
                    title={`Dígito ${digit}: ${pct.toFixed(1)}% (${currentDistribution.counts[digit]} vezes)`}
                  />
                  <b style={{ marginTop: '4px', fontSize: '12px', color: isHot ? '#f43f5e' : isCold ? '#38bdf8' : '#f8fafc' }}>
                    {digit}
                  </b>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f43f5e', borderRadius: '2px', marginRight: '4px' }} /> Dígito Quente (&ge; 18%)</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#38bdf8', borderRadius: '2px', marginRight: '4px' }} /> Dígito Frio (&le; 4%)</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', marginRight: '4px' }} /> Equilíbrio (~10%)</span>
          </div>

          {/* Last Digits Stream */}
          <div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Últimos Ticks Capturados:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {currentDistribution.lastDigits.length ? (
                currentDistribution.lastDigits.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 10px',
                      background: i === currentDistribution.lastDigits.length - 1 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                      border: i === currentDistribution.lastDigits.length - 1 ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}
                  >
                    {d}
                  </span>
                ))
              ) : (
                <small style={{ color: '#64748b' }}>Aguardando fluxo de ticks da VPS...</small>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* SIMULATION RESULTS & METRICS */}
      <section className="aut-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2><TrendingUp size={18} /> Resultados da Simulação QD-Differ</h2>
          <button className="workspace-button" disabled={!trades.length} onClick={exportData}>
            <Download size={15} /> Exportar Relatório de Dígitos JSON
          </button>
        </div>

        <div className="aut-metrics">
          <article>
            <span>Resultado Simulado</span>
            <strong style={{ color: net >= 0 ? '#34d399' : '#f87171' }}>{usd(net)}</strong>
            <small>{totalOps} entradas simuladas</small>
          </article>

          <article>
            <span>Taxa de Acerto</span>
            <strong style={{ color: winRate >= 88 ? '#34d399' : '#fbbf24' }}>{percent(winRate)}</strong>
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
            <small>{state?.pending?.length || 0} ordens pendentes</small>
          </article>
        </div>

        {/* Equity Curve */}
        <div className="aut-equity" style={{ marginTop: '20px' }}>
          <div>
            <b>Curva de Capital Simulada (Dígitos)</b>
            <span>{usd(low)} a {usd(high)}</span>
          </div>
          {filteredTrades.length ? (
            <svg viewBox="0 0 800 190" role="img" aria-label={`Curva Dígitos: ${filteredTrades.length} entradas`}>
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
            <p>Aguardando a primeira oportunidade e liquidação simulada no laboratório de dígitos.</p>
          )}
        </div>
      </section>

      {/* RECENT TRADES */}
      <section className="aut-card">
        <h2>Últimas Entradas Simuladas</h2>
        <div className="aut-table">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Ativo</th>
                <th>Contrato</th>
                <th>Alvo Anômalo</th>
                <th>Dígito de Saída</th>
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
                  <td><span className="badge-tag">≠ DIFF</span></td>
                  <td><span style={{ color: '#f43f5e', fontWeight: 'bold' }}>≠ {t.targetDigit}</span></td>
                  <td><span style={{ color: t.profit > 0 ? '#34d399' : '#f43f5e', fontWeight: 'bold' }}>{t.exitDigit ?? '—'}</span></td>
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
        {!filteredTrades.length && <p>Nenhuma entrada simulada ainda para este ativo.</p>}

        {/* Live event logs */}
        <div style={{ marginTop: '16px' }}>
          {(state?.events || []).slice(-5).reverse().map((e, i) => (
            <p key={i} style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>
              <time>{new Date(e.time).toLocaleTimeString()}</time> · <b>{e.symbol || 'SISTEMA'}</b>: {e.message}
            </p>
          ))}
        </div>
      </section>
    </section>
  );
}
