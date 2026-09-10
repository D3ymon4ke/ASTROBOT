import React, { useState } from 'react';
import { Database, Play, Pause, FlaskConical } from 'lucide-react';
import { ASSETS } from '../../vps-backend/automation/signals.js';

export default function ResearchPanel({ research, available, pending, busy, symbols, symbol, onSymbol, onConfigure, onReplay, result }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [latency, setLatency] = useState(1000);
  const [gap, setGap] = useState(5);
  const supported = available && research?.version === 1;
  return <section className="aut-card">
    <h2><Database size={18} /> Base de pesquisa e replay por ticks</h2>
    <p>O gravador acompanha os ativos selecionados no Trader Contínuo, mesmo com esse trader pausado. Consulta ticks, registra propostas e observa rompimentos após compressão. Não compra contratos.</p>
    <div className="aut-columns"><div>
    <div className="aut-coexist"><span><b>{research?.status || 'Aguardando VPS compatível'}</b></span><span>{research?.ticks || 0} ticks capturados</span><span>{research?.proposals || 0} propostas registradas</span></div>
    <p>Ativos da captura: {(research?.enabled ? research.symbols : symbols).join(', ')}. Rompimento v1: canal de seis velas, fechamento confirmado, duração de 1 minuto e proposta de USD 0,35, somente em observação.</p>
    <button className="workspace-button workspace-button-primary" disabled={!supported || pending} onClick={() => onConfigure(!research?.enabled, symbols)}>{research?.enabled ? <Pause size={15} /> : <Play size={15} />}{research?.enabled ? 'Pausar gravador' : 'Iniciar gravador e observação'}</button>
    <p>Retenção de 7 dias na VPS; limite de 32 MB por dia e conta. Ao atingir o limite, a coleta pausa. Contadores são acumulados; registros antigos expiram. Última captura: {research?.lastCapture ? new Date(research.lastCapture).toLocaleString() : '—'}.</p>
    </div><div>
    <div className="aut-form">
      <label>Ativo do replay<select value={symbol} onChange={e => onSymbol(e.target.value)}>{ASSETS.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Data da captura (UTC)<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Latência hipotética (ms)<input type="number" min="0" max="30000" step="100" value={latency} onChange={e => setLatency(e.target.value)} /></label>
      <label>Lacuna máxima entre ticks (s)<input type="number" min="1" max="30" value={gap} onChange={e => setGap(e.target.value)} /></label>
    </div>
    <button className="workspace-button" disabled={!supported || busy} onClick={() => onReplay(date, { latencyMs: Number(latency), maxGapSeconds: Number(gap) })}><FlaskConical size={15} />Reproduzir ticks de {symbol}</button>
    <p>Usa payout registrado e o primeiro tick após a latência escolhida. Avalia propostas elegíveis por confluência e payout; isso não implica que a ordem foi executável ou comprada. Cada estratégia é simulada separadamente, sem reinvestimento.</p>
    </div></div>
    {result?.type === 'tick_proxy' && <div className="aut-notice" role="status"><b>Replay por ticks · {result.date}</b><p>{result.tickCount} ticks · {result.quoteCount} propostas · {result.rows.length} operações avaliadas.</p><p>Exclusões: {result.excluded.rejected} por filtros, {result.excluded.missingEntry} sem entrada, {result.excluded.missingExit} sem saída, {result.excluded.gap} por lacunas, {result.excluded.overlap} por sobreposição e {result.excluded.invalid} inválidas.</p>{result.warning}</div>}
  </section>;
}
