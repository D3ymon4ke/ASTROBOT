import React from 'react';
import { RANGE_ARMS, RANGE_RULES } from '../../vps-backend/automation/rangeStrategies.js';
import { metrics } from '../../vps-backend/automation/evidenceStrategies.js';
const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const colors = ['#71d5c2', '#baacff'];
export default function RangeResearchPanel({ state }) {
  const rows = state?.trades || [], positions = state?.positions || [];
  const curves = RANGE_ARMS.map(a => {
    let sum = 0;
    const values = rows.filter(r => r.arm === a.id).sort((a, b) => a.timestamp - b.timestamp);
    return [{ time: values[0]?.timestamp || state?.startedAt || Date.now(), sum: 0 }, ...values.map(r => ({ time: r.timestamp, sum: sum += r.profit }))];
  });
  const points = curves.flat(), low = Math.min(0, ...points.map(p => p.sum)), high = Math.max(0, ...points.map(p => p.sum));
  const start = Math.min(...points.map(p => p.time)), end = Math.max(start + 1, ...points.map(p => p.time));
  return <section className="aut-card">
    <span className="workspace-eyebrow">NOVOS EXPERIMENTOS · MULTIPLICADORES · V1</span>
    <h2>Range Break: canal e rompimento</h2>
    <p>{state?.status || 'Aguardando atualização na VPS'}. RB100 e RB200 · {money(RANGE_RULES.stake)} por entrada · multiplicador {RANGE_RULES.multiplier}× · sem gales.</p>
    <p className="evidence-note">Duas carteiras simuladas de $100. Uma posição por estratégia, reserva de $1, perda bruta diária de $3 e drawdown de $15. Comissão da proposta descontada; entrada futura e saída no tick seguinte ao gatilho. Limite de 30 minutos. São hipóteses novas: a estrutura do ativo não comprova lucro. Pausar pesquisa também pausa novas entradas deste módulo.</p>
    <div className="evidence-cards">{RANGE_ARMS.map((arm, i) => {
      const m = metrics(rows.filter(r => r.arm === arm.id)), ledger = state?.ledgers?.[arm.id];
      return <article key={arm.id} style={{ borderTop: `2px solid ${colors[i]}`, paddingTop: 12 }}>
        <h3 style={{ color: colors[i] }}>{arm.name}</h3><p>{arm.description}</p>
        <div className="evidence-pair"><span>Carteira desde o início<strong>{money(ledger?.bank ?? 100)}</strong><small>{ledger?.count || 0} operações · queda {money(ledger?.drawdown)}</small></span><span>Resultado na janela<strong className={m.net < 0 ? 'negative' : 'positive'}>{money(m.net)}</strong><small>{m.count} operações · PF {m.profitFactor == null ? '—' : m.profitFactor.toFixed(2)}</small></span></div>
        {Object.entries(state?.scans || {}).filter(([key]) => key.startsWith(`${arm.id}:`)).map(([key, value]) => <p key={key}><b>{key.split(':')[1]}</b> · {value}</p>)}
        {Object.entries(state?.costs || {}).filter(([key]) => key.startsWith(`${arm.id}:`)).map(([key, cost]) => <p className="evidence-note" key={key}>{key.split(':')[1]} · última comissão: {money(cost.commission)} · resultado teórico no alvo: {money(cost.reward)} · perda teórica no stop: {money(cost.risk)}. Valores condicionais, não previsões de ganho.</p>)}
      </article>;
    })}</div>
    <div className="aut-equity"><div><b>Curvas dos novos experimentos</b><span>{rows.length} registros retidos · até 2.000</span></div>
      {rows.length ? <svg viewBox="0 0 800 200" role="img" aria-label="Resultados simulados Range Break">{curves.map((curve, i) => <polyline key={RANGE_ARMS[i].id} fill="none" stroke={colors[i]} strokeWidth="2" points={curve.map(p => `${20 + (p.time - start) / (end - start) * 760},${175 - (p.sum - low) / (high - low || 1) * 145}`).join(' ')}/>)}</svg> : <p>Aguardando oportunidades que cubram os custos e os limites de risco. Nenhum resultado pré-carregado.</p>}
    </div>
    {positions.map(p => <p key={p.id}><b>{p.symbol} · {p.contractType}</b> · {p.blocked || (p.entry ? 'Posição simulada em acompanhamento' : 'Aguardando tick de entrada')} · $1 reservado</p>)}
    <p className="evidence-note">Resultado indicativo, sem compra ou venda na Deriv. Slippage real pode diferir; ticks ausentes bloqueiam a apuração e mantêm o risco reservado. As carteiras de multiplicadores não usam o filtro binário de Wilson dos experimentos abaixo.</p>
  </section>;
}
