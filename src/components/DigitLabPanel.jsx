import React from 'react';
import { Play, Pause, Download, FlaskConical } from 'lucide-react';
import { EVIDENCE_VERSION, LAB_DEFAULTS, metrics } from '../../vps-backend/automation/evidenceStrategies.js';
import './EvidenceLab.css';
import OptionsResearchPanel from './OptionsResearchPanel.jsx';
const money = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export default function DigitLabPanel({ state, available, pending, onConfigure }) {
  const ready = state?.version === EVIDENCE_VERSION, config = ready ? state.config : LAB_DEFAULTS;
  const old = metrics(state?.trades || []), range = metrics(state?.rangeResearch?.trades || []);
  const activeLastScan = state?.optionsResearch?.lastScan;
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...state, exportScope: 'Janela retida pelo painel; carteiras incluem todo o experimento', exportedAt: Date.now() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'astrobot-laboratorio-evidencia.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="evidence-lab">
    <div className="workspace-heading"><div><span className="workspace-eyebrow">PESQUISA PROSPECTIVA</span><h1>Laboratório de Evidência<span>.</span></h1><p>Forex e Accumulator ativos. Experimentos anteriores preservados no arquivo.</p></div><div className="evidence-actions">
      <button className="workspace-button" disabled={!ready} onClick={download}><Download size={16}/>Exportar evidências</button>
      <button className="workspace-button primary" disabled={!ready || !available || pending} onClick={() => onConfigure({ enabled: !config.enabled })}>{config.enabled ? <Pause size={16}/> : <Play size={16}/>} {config.enabled ? 'Pausar pesquisa' : 'Iniciar pesquisa simulada'}</button>
    </div></div>
    <section className="aut-card evidence-status"><FlaskConical size={22}/><div><strong>{ready ? state.status : 'Aguardando atualização do laboratório na VPS'}</strong><p>Dados e cotações da Deriv · execução indicativa · nenhuma compra real</p></div><span>{activeLastScan ? `Atualizado ${new Date(activeLastScan).toLocaleTimeString()}` : 'Sem coleta nesta versão'}</span></section>
    <OptionsResearchPanel state={state?.optionsResearch}/>
    <section className="aut-card"><span className="workspace-eyebrow">ARQUIVO · COLETA ENCERRADA</span><h2>Experimentos anteriores preservados</h2>
      <div className="aut-metrics"><article><span>Evidência V1</span><strong>{old.count}</strong><small>{money(old.net)} · não gera novos sinais</small></article><article><span>Range Break</span><strong>{range.count}</strong><small>{money(range.net)} · encerrado por inviabilidade de custos</small></article><article><span>Quântico histórico</span><strong>{state?.legacy?.quantum?.count || 0}</strong><small>{money(state?.legacy?.quantum?.net)}</small></article><article><span>Fakegale histórico</span><strong>{state?.legacy?.fakegale?.count || 0}</strong><small>{money(state?.legacy?.fakegale?.net)}</small></article></div>
      <p>Os registros continuam disponíveis na exportação, mas não treinam, filtram nem compõem os gráficos novos. {state?.pending?.length || 0} resultado antigo ainda aguardando apuração será fechado sem abrir outro.</p>
    </section>
  </div>;
}
