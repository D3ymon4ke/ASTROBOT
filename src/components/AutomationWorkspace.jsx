import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Calendar, FlaskConical, Play, Pause, Save, Download, ShieldCheck } from 'lucide-react';
import { derivAPI } from '../deriv/DerivAPI';
import { ASSETS, DEFAULT_CONTINUOUS, validateConfig } from '../../vps-backend/automation/signals.js';
import { summarize, stressTest, walkForward } from '../../vps-backend/automation/research.js';
import './AutomationWorkspace.css';
import ResearchPanel from './ResearchPanel';

const money = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const percent = n => Number.isFinite(n) ? n.toFixed(1) + '%' : '—';
function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Metrics({ rows }) {
  const m = useMemo(() => summarize(rows), [rows]);
  return <div className="aut-metrics">
    <article><span>Contratos avaliados</span><strong>{m.count}</strong><small>{m.wins} ganhos · {m.losses} perdas</small></article>
    <article><span>Resultado líquido</span><strong className={m.net < 0 ? 'negative' : 'positive'}>{money(m.net)}</strong><small>Expectativa por contrato: {m.count ? money(m.expectancy) : '—'}</small></article>
    <article><span>Acerto por contrato</span><strong>{percent(m.winRate)}</strong><small>Fator de lucro: {m.profitFactor === null ? '—' : m.profitFactor.toFixed(2)}</small></article>
    <article><span>Maior queda acumulada</span><strong>{money(m.drawdown)}</strong><small>Maior sequência de perdas: {m.maxLossRun}</small></article>
  </div>;
}
function Equity({ rows }) {
  const m = summarize(rows);
  const values = [0, ...m.curve.map(x => x.equity)];
  const low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  const points = values.map((v, i) => `${20 + i / Math.max(1, values.length - 1) * 760},${160 - (v - low) / span * 135}`).join(' ');
  return <div className="aut-equity"><div><b>Curva de resultado</b><span>{money(low)} a {money(high)}</span></div>{rows.length ? <svg viewBox="0 0 800 190" role="img" aria-label={`Curva de resultado de ${rows.length} contratos. Resultado final ${money(m.net)}`}><line x1="20" x2="780" y1={160 + low / span * 135} y2={160 + low / span * 135} stroke="#ffffff20" /><polyline points={points} fill="none" stroke={m.net < 0 ? '#fb8b9e' : '#a998f5'} strokeWidth="2.5" /></svg> : <p>Os resultados aparecerão após as primeiras liquidações.</p>}</div>;
}

export default function AutomationWorkspace({ children, continuous, research, timelineEnabled, timelineTrades = [], accountMode = 'demo', initialTab = 'timeline', onTabChange }) {
  const [tab, updateTab] = useState(initialTab);
  const setTab = value => { updateTab(value); onTabChange?.(value); };
  const [draft, setDraft] = useState({ ...DEFAULT_CONTINUOUS });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [labBusy, setLabBusy] = useState(false);
  const [labResult, setLabResult] = useState(null);
  const [labError, setLabError] = useState('');
  const [labSymbol, setLabSymbol] = useState('R_100');
  const [labPayout, setLabPayout] = useState(.9);
  const [labTrain, setLabTrain] = useState(200);
  const [labTest, setLabTest] = useState(100);
  const [bankroll, setBankroll] = useState(100);
  const [riskStake, setRiskStake] = useState(.35);
  const [source, setSource] = useState('live');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [contractId, setContractId] = useState('');
  const fileRef = useRef(null);
  const accountRef = useRef(accountMode);
  accountRef.current = accountMode;
  const available = continuous?.version === 1 && derivAPI.connected;
  useEffect(() => { if (continuous?.config && !dirty) setDraft(continuous.config); }, [continuous?.config, dirty]);
  useEffect(() => { setDirty(false); setLabResult(null); setLabBusy(false); setNotice(''); }, [accountMode]);
  useEffect(() => {
    const previousLab = derivAPI.onLaboratoryResult, previousMessage = derivAPI.onAutomationMessage;
    derivAPI.onLaboratoryResult = result => { if (result.accountMode && result.accountMode !== accountRef.current) return; setLabResult(result); setSource('backtest'); setLabBusy(false); setLabError(''); };
    derivAPI.onAutomationMessage = payload => { setNotice(payload.message); setPending(false); if (payload.type === 'error') { setLabBusy(false); setLabError(payload.message); } else setDirty(false); };
    return () => { derivAPI.onLaboratoryResult = previousLab; derivAPI.onAutomationMessage = previousMessage; };
  }, []);
  useEffect(() => {
    if (!pending && !labBusy) return;
    const timer = setTimeout(() => { setPending(false); setLabBusy(false); setNotice('Sem confirmação da VPS. Confira a conexão e o estado recebido antes de reenviar.'); }, 30000);
    return () => clearTimeout(timer);
  }, [pending, labBusy]);
  const update = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setDirty(true); };
  const apply = config => {
    try { validateConfig(config, continuous?.config || DEFAULT_CONTINUOUS); setPending(true); setNotice('Aguardando confirmação da VPS…'); derivAPI.configureContinuous(config); }
    catch (err) { setNotice(err.message); setPending(false); }
  };
  const allRows = useMemo(() => source === 'backtest' ? labResult?.rows || [] : source === 'timeline' ? timelineTrades : (continuous?.trades || []).filter(t => t.execution === source), [source, labResult?.rows, timelineTrades, continuous?.trades]);
  const rows = useMemo(() => [...new Map(allRows.map(t => [String(t.id || t.signalId || t.epoch), t])).values()]
    .filter(t => t.profit != null && Number.isFinite(Number(t.profit)) && Number.isFinite(Number(t.stake)) && Number(t.stake) > 0)
    .filter(t => (strategyFilter === 'all' || (t.strategy || t.strategyId || t.strategyName) === strategyFilter) && (assetFilter === 'all' || (t.symbol || labResult?.symbol) === assetFilter))
    .sort((a, b) => (a.timestamp || a.epoch * 1000) - (b.timestamp || b.epoch * 1000)), [allRows, strategyFilter, assetFilter, labResult?.symbol]);
  const stress = useMemo(() => stressTest(rows, Number(bankroll), Number(riskStake)), [rows, bankroll, riskStake]);
  const runLab = () => { setLabBusy(true); setLabError(''); derivAPI.runLaboratory(labSymbol, { train: Number(labTrain), test: Number(labTest), payout: Number(labPayout), stake: Number(riskStake), minScore: Number(draft.minScore), duration: Number(draft.durationMinutes) }); };
  const importCandles = async event => {
    try {
      const file = event.target.files?.[0]; if (!file) return;
      if (file.size > 5_000_000) throw Error('Arquivo excede 5 MB.');
      const parsed = JSON.parse(await file.text()); const candles = Array.isArray(parsed) ? parsed : parsed.candles;
      if (!Array.isArray(candles) || candles.length > 10000) throw Error('Importe até 10.000 velas M1 em um array JSON.');
      const result = walkForward(candles.filter(c => Number(c.epoch) + 60 <= Date.now() / 1000), { train: Number(labTrain), test: Number(labTest), payout: Number(labPayout), stake: Number(riskStake), minScore: Number(draft.minScore), duration: Number(draft.durationMinutes) });
      setLabResult({ ...result, symbol: labSymbol, generatedAt: Date.now(), origin: 'import' }); setSource('backtest'); setLabError('');
    } catch (err) { setLabError(err.message); }
    event.target.value = '';
  };
  return <div className="aut-workspace">
    <nav className="aut-tabs" aria-label="Áreas de automação">{[
      ['timeline', Calendar, 'Linha do tempo'], ['continuous', Activity, 'Trader contínuo'], ['lab', FlaskConical, 'Laboratório']
    ].map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}<span className="aut-account">{accountMode === 'demo' ? 'CONTA DEMO' : 'CONTA REAL'}</span></nav>
    {notice && <p className="aut-notice" role="status">{notice}</p>}
    {tab === 'timeline' && children}
    {tab === 'continuous' && <>
      <div className="workspace-heading"><div><span className="workspace-eyebrow">AUTOMAÇÃO / MONITORAMENTO CONTÍNUO</span><h1>O mercado não para<span>.</span></h1><p>Scanner na VPS, independente da agenda. A execução respeita a exposição compartilhada.</p></div><span className={'workspace-status ' + (continuous?.config?.enabled ? 'is-online' : '')}><i />{continuous?.status || 'Aguardando VPS'}</span></div>
      {!available && <p className="aut-notice">Conecte-se à VPS com suporte ao Trader Contínuo para salvar ou iniciar. Esta tela não executa ordens no navegador.</p>}
      <div className="aut-coexist"><span><Calendar size={15} /> Linha do tempo: <b>{timelineEnabled ? 'habilitada' : 'pausada'}</b></span><span><Activity size={15} /> Trader contínuo: <b>{continuous?.config?.enabled ? 'ligado' : 'desligado'}</b></span><span><ShieldCheck size={15} /> Os modos têm resultados separados.</span></div>
      <div className="aut-columns"><section className="aut-card"><h2>Configuração do trader</h2><p>Confluência é uma pontuação de regras, não uma probabilidade de ganho.</p>
        <div className="aut-form">
          <label>Execução<select value={draft.execution} onChange={e => update('execution', e.target.value)}><option value="observe">Observação — sem compras</option><option value="live">Compras automáticas nesta conta</option></select></label>
          <label>Entrada fixa (USD)<input type="number" min="0.35" max="100" step="0.01" value={draft.stake} onChange={e => update('stake', e.target.value)} /></label>
          <label>Confluência mínima<input type="number" min="40" max="90" value={draft.minScore} onChange={e => update('minScore', e.target.value)} /></label>
          <label>Payout líquido mínimo (%)<input type="number" min="10" max="200" value={Math.round(draft.minPayout * 100)} onChange={e => update('minPayout', Number(e.target.value) / 100)} /></label>
          <label>Intervalo entre entradas (s)<input type="number" min="30" max="3600" value={draft.cooldownSeconds} onChange={e => update('cooldownSeconds', e.target.value)} /></label>
          <label>Duração do contrato (min)<select value={draft.durationMinutes} onChange={e => update('durationMinutes', Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <fieldset><legend>Ativos acompanhados</legend><div className="aut-checks">{ASSETS.map(symbol => <label key={symbol}><input type="checkbox" checked={draft.symbols.includes(symbol)} onChange={e => update('symbols', e.target.checked ? [...draft.symbols, symbol] : draft.symbols.filter(x => x !== symbol))} />{symbol}</label>)}</div></fieldset>
        <fieldset><legend>Estratégias experimentais</legend><div className="aut-checks">{[['mhi', 'MHI minoria'], ['pullback', 'Pullback EMA 9/21']].map(([id, name]) => <label key={id}><input type="checkbox" checked={draft.strategies.includes(id)} onChange={e => update('strategies', e.target.checked ? [...draft.strategies, id] : draft.strategies.filter(x => x !== id))} />{name}</label>)}</div></fieldset>
        <div className="aut-actions"><button className="workspace-button" disabled={!available || pending || !dirty} onClick={() => apply({ ...draft, enabled: !!continuous?.config?.enabled })}><Save size={15} />Salvar parâmetros</button><button className="workspace-button workspace-button-primary" disabled={!available || pending} onClick={() => continuous?.config?.enabled ? apply({ enabled: false }) : apply({ ...draft, enabled: true })}>{continuous?.config?.enabled ? <Pause size={15} /> : <Play size={15} />}{continuous?.config?.enabled ? 'Pausar trader' : draft.execution === 'live' ? 'Iniciar compras automáticas' : 'Iniciar observação'}</button></div>
        {draft.execution === 'live' && <p className="aut-notice">Ao iniciar, o trader poderá comprar contratos na conta {accountMode === 'real' ? 'REAL' : 'DEMO'} conectada. As regras são experimentais e não garantem retorno positivo.</p>}
      </section><section className="aut-card"><h2>Proteção compartilhada</h2><p>Em modo de compras, os limites abrangem agenda, operações manuais e Trader Contínuo. Pausar não encerra contratos abertos.</p><div className="aut-form">
        <label>Orçamento de perdas / dia UTC<input type="number" min="0.35" step="0.01" value={draft.dailyLossLimit} onChange={e => update('dailyLossLimit', e.target.value)} /></label>
        <label>Exposição máxima (USD)<input type="number" min="0.35" step="0.01" value={draft.maxExposure} onChange={e => update('maxExposure', e.target.value)} /></label>
        <label>Posições simultâneas<select value={draft.maxPositions} onChange={e => update('maxPositions', Number(e.target.value))}><option value="1">1 compartilhada</option><option value="2">Até 2 — uma por modo</option></select></label>
      </div><div className="aut-risk"><span>Perdas realizadas hoje</span><strong>{money(continuous?.lossUsed)}</strong><small>Ganhos não repõem o orçamento. Renovação às 00:00 UTC.</small></div>
        <h3>Monitor de ativos</h3>{(continuous?.markets || []).map(m => <div className="aut-market" key={m.symbol}><b>{m.symbol}</b><span>{m.status}{m.score != null ? ` · ${m.score} pontos` : ''}</span></div>)}{!continuous?.markets?.length && <p>O monitor aparecerá após iniciar o trader.</p>}
        <small>Última varredura: {continuous?.lastScan ? new Date(continuous.lastScan).toLocaleTimeString() : '—'}</small>
        {continuous?.position && <p className="aut-notice">Contrato: {continuous.position.contractId || 'confirmação pendente'} · {continuous.position.symbol} · {money(continuous.position.stake)}</p>}
        {continuous?.position && !continuous.position.contractId && <div className="aut-form"><label>ID do contrato para conciliação<input value={contractId} onChange={e => setContractId(e.target.value)} inputMode="numeric" /></label><button className="workspace-button" disabled={!available || pending || !/^\d+$/.test(contractId)} onClick={() => { setPending(true); derivAPI.reconcileContinuous(contractId); }}>Consultar e conciliar</button></div>}
        {continuous?.legacyOrder && !continuous.legacyOrder.contractId && <div className="aut-form"><p className="aut-notice">Uma compra da agenda aguarda confirmação. A exposição permanece reservada.</p><label>ID do contrato da agenda<input value={contractId} onChange={e => setContractId(e.target.value)} inputMode="numeric" /></label><button className="workspace-button" disabled={!available || pending || !/^\d+$/.test(contractId)} onClick={() => { setPending(true); derivAPI.reconcileContinuous(contractId, 'timeline'); }}>Conciliar compra da agenda</button></div>}
      </section></div>
      <section className="aut-card"><h2>Decisões do trader</h2><p>Cada avaliação informa seu motivo. Nenhum critério é reduzido por tempo sem operar.</p><div className="aut-events">{[...(continuous?.events || [])].reverse().map((e, i) => <div key={e.time + ':' + i}><time>{new Date(e.time).toLocaleTimeString()}</time><b>{e.symbol || e.kind}</b><span>{e.message}</span>{e.score != null && <small>{e.score} pts</small>}</div>)}{!continuous?.events?.length && <p>Aguardando a primeira avaliação.</p>}</div></section>
    </>}
    {tab === 'lab' && <>

      <div className="workspace-heading"><div><span className="workspace-eyebrow">PESQUISA / VALIDAÇÃO</span><h1>Laboratório de estratégias<span>.</span></h1><p>Separe evidência, simulação e execução antes de decidir.</p></div><button className="workspace-button" onClick={() => download('astrobot-laboratorio.json', { accountMode, source, rows, metrics: summarize(rows), stress, walkForward: labResult, events: continuous?.events || [] })}><Download size={15} />Exportar análise</button></div>
      <ResearchPanel research={research} available={available} pending={pending} busy={labBusy} symbols={draft.symbols} symbol={labSymbol} onSymbol={setLabSymbol} result={labResult}
        onConfigure={(enabled, symbols) => { setPending(true); derivAPI.configureResearch(enabled, symbols); }}
        onReplay={(date, options) => { setLabBusy(true); setLabError(''); derivAPI.replayResearch(date, labSymbol, options); }} />
      <section className="aut-card"><h2>Teste cronológico fora da amostra</h2><p>Compara MHI e pullback no treino. Só seleciona candidatos com ao menos 10 sinais e expectativa positiva; mede o resultado nas velas seguintes, sem usar o futuro na seleção.</p>
        <div className="aut-form lab-parameters"><label>Ativo<select value={labSymbol} onChange={e => setLabSymbol(e.target.value)}>{ASSETS.map(s => <option key={s}>{s}</option>)}</select></label><label>Treino (velas M1)<input type="number" min="40" value={labTrain} onChange={e => setLabTrain(e.target.value)} /></label><label>Teste (velas M1)<input type="number" min="20" value={labTest} onChange={e => setLabTest(e.target.value)} /></label><label>Payout hipotético líquido (%)<input type="number" min="10" max="200" value={Math.round(labPayout * 100)} onChange={e => setLabPayout(Number(e.target.value) / 100)} /></label></div>
        <div className="aut-actions"><button className="workspace-button workspace-button-primary" disabled={!available || labBusy} onClick={runLab}><FlaskConical size={15} />{labBusy ? 'Avaliando…' : 'Avaliar histórico recente'}</button><button className="workspace-button" onClick={() => fileRef.current?.click()}>Importar velas JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importCandles} /></div><small>Importação: array de velas M1 com epoch em segundos, open, high, low e close. Até 10.000 velas / 5 MB. Usa a duração e confluência configuradas na aba Trader Contínuo.</small>
        <p className="aut-notice">O replay usa abertura/fechamento de velas e payout constante. A observação usa ticks e propostas, mas não representa preenchimento real. Nenhum desses resultados libera compras automaticamente.</p>
        {labError && <p role="alert" className="negative">{labError}</p>}
      </section>
      <div className="aut-filters"><label>Fonte<select value={source} onChange={e => { setSource(e.target.value); setStrategyFilter('all'); setAssetFilter('all'); }}><option value="live">Trader contínuo — contratos comprados ({accountMode})</option><option value="observe">Trader contínuo — observação indicativa</option><option value="timeline">Histórico da agenda / manual ({accountMode})</option><option value="backtest">Replay de pesquisa (OHLC / ticks)</option></select></label><label>Estratégia<select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)}><option value="all">Todas</option>{[...new Set(allRows.map(t => t.strategy || t.strategyId || t.strategyName).filter(Boolean))].map(s => <option key={s}>{s}</option>)}</select></label><label>Ativo<select value={assetFilter} onChange={e => setAssetFilter(e.target.value)}><option value="all">Todos</option>{[...new Set(allRows.map(t => t.symbol || labResult?.symbol).filter(Boolean))].map(s => <option key={s}>{s}</option>)}</select></label></div>
      <Metrics rows={rows} /><Equity rows={rows} />
      <div className="aut-columns"><section className="aut-card"><h2>Teste de estresse</h2><p>Reamostra blocos de cinco retornos, com entrada fixa. É uma simulação condicionada ao histórico, não previsão.</p><div className="aut-form"><label>Banca hipotética (USD)<input type="number" min="1" value={bankroll} onChange={e => setBankroll(e.target.value)} /></label><label>Entrada da simulação (USD)<input type="number" min="0.35" step="0.01" value={riskStake} onChange={e => setRiskStake(e.target.value)} /></label></div>{stress ? <p>Em {stress.runs} simulações: queda de até <b>{money(stress.drawdown95)}</b> no percentil 95; banca insuficiente para a próxima entrada em <b>{percent(stress.depletionPct)}</b> dos caminhos.</p> : <p>São necessários pelo menos 20 resultados válidos.</p>}</section>
      <section className="aut-card"><h2>Qualidade da evidência</h2><p>Amostra: <b>{rows.length}</b> contratos. Intervalo descritivo de acerto (95%): <b>{summarize(rows).interval?.map(percent).join(' a ') || '—'}</b>.</p><p>O intervalo supõe independência. Sinais correlacionados, seleção entre estratégias e mudanças no mercado reduzem a força dessa evidência.</p><p>Expectativa por unidade arriscada: <b>{rows.length ? summarize(rows).unitExpectancy.toFixed(4) : '—'}</b>. O histórico antigo pode não identificar a estratégia exata do piloto automático.</p></section></div>
      {labResult?.folds && <section className="aut-card"><h2>Janelas de validação</h2><p>{labResult.candleCount} velas fechadas disponíveis · {labResult.folds.length} janelas completas.</p><div className="aut-table"><table><thead><tr><th>Teste a partir de</th><th>Selecionada no treino</th><th>Contratos de teste</th><th>Resultado de teste</th></tr></thead><tbody>{labResult.folds.map((f, i) => <tr key={i}><td>{new Date(f.testStart * 1000).toLocaleString()}</td><td>{f.selected || 'Sem candidato elegível'}</td><td>{f.metrics.count}</td><td>{money(f.metrics.net)}</td></tr>)}</tbody></table>{!labResult.folds.length && <p>Histórico insuficiente para completar uma janela de treino e teste.</p>}</div></section>}
      <section className="aut-card"><h2>Registro de operações</h2><p>Exibindo os últimos 100 resultados da seleção. A exportação inclui todos os resultados carregados; o diário completo permanece na VPS.</p><div className="aut-table"><table><thead><tr><th>Data</th><th>Estratégia</th><th>Ativo</th><th>Entrada</th><th>Resultado</th><th>Origem</th></tr></thead><tbody>{rows.slice(-100).reverse().map((t, i) => <tr key={t.id || i}><td>{new Date(t.timestamp || t.epoch * 1000).toLocaleString()}</td><td>{t.strategy || t.strategyId || t.strategyName}</td><td>{t.symbol || labResult?.symbol}</td><td>{money(t.stake)}</td><td className={t.profit < 0 ? 'negative' : 'positive'}>{money(t.profit)}</td><td>{t.execution || t.source || 'legado'}</td></tr>)}</tbody></table>{!rows.length && <p>Nenhum resultado nesta seleção.</p>}</div></section>
    </>}
  </div>;
}
