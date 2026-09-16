import { useEffect, useMemo, useState } from 'react';
import { Activity, CircleHelp, Clock3, ShieldCheck } from 'lucide-react';
import { runSpotTrendStudy, SPOT_STUDY_COST } from './spotResearch.js';

const SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
const pct = (value) => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';
const magnitude = (value) => Number.isFinite(value) ? `${value.toFixed(2)}%` : '—';

function WindowCard({ title, result }) {
  return <article className="crypto-study-window">
    <small>{title}</small>
    <strong className={result?.returnPct >= 0 ? 'positive' : 'negative'}>{pct(result?.returnPct)}</strong>
    <div><span>Comprar/manter · mesma exposição</span><b>{pct(result?.benchmarkPct)}</b></div>
    <div><span>Diferença após custos</span><b className={result?.excessPct >= 0 ? 'positive' : 'negative'}>{pct(result?.excessPct)}</b></div>
    <div><span>Trades encerrados</span><b>{result?.closedTrades ?? '—'}</b></div>
    <div><span>Queda máxima</span><b>{magnitude(result?.maxDrawdownPct)}</b></div>
    <small>{result ? `${result.bars} velas H1 · ${new Date(result.startTime).toLocaleDateString('pt-BR')} a ${new Date(result.endTime).toLocaleDateString('pt-BR')}` : 'Sem histórico suficiente'}</small>
  </article>;
}

export default function CryptoResearchLab({ selectedSymbol }) {
  const [studies, setStudies] = useState({});
  const [errors, setErrors] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [symbol, setSymbol] = useState(selectedSymbol);
  useEffect(() => { setSymbol(selectedSymbol); }, [selectedSymbol]);

  useEffect(() => {
    let active = true;
    let fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      if (active) setBusy(true);
      const outcomes = await Promise.allSettled(SYMBOLS.map(async (id) => {
        const response = await fetch(`/api/okx?kind=market&view=study&symbol=${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Histórico OKX indisponível (${response.status})`);
        const payload = await response.json();
        const study = runSpotTrendStudy(payload.candles || []);
        if (!study) throw new Error('Menos de 400 velas H1 fechadas');
        return { id, study };
      }));
      if (active) {
        setStudies((previous) => ({ ...previous, ...Object.fromEntries(outcomes.filter((item) => item.status === 'fulfilled').map((item) => [item.value.id, item.value.study])) }));
        setErrors(Object.fromEntries(outcomes.flatMap((item, index) => item.status === 'rejected' ? [[SYMBOLS[index], item.reason.message]] : [])));
        setUpdatedAt(Date.now());
        setBusy(false);
      }
      fetching = false;
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const study = studies[symbol];
  const evidence = useMemo(() => {
    if (!study) return [];
    return [
      { label: '30 trades encerrados em cada janela', pass: study.calibration.closedTrades >= 30 && study.validation.closedTrades >= 30 },
      { label: 'Resultado líquido positivo nas duas janelas', pass: study.calibration.returnPct > 0 && study.validation.returnPct > 0 },
      { label: 'Supera comprar/manter com exposição igual', pass: study.calibration.excessPct > 0 && study.validation.excessPct > 0 },
      { label: 'Acompanhamento prospectivo e execução Demo', pass: false }
    ];
  }, [study]);

  return <section className="crypto-study">
    <div className="crypto-study-head"><div><span className="crypto-panel-label">HIPÓTESE CONGELADA · MONITORAMENTO SEM ORDENS</span><h3>Tendência + rompimento H1</h3><p>Spot comprado, BTC/ETH/SOL, uma posição por par e 25% do capital hipotético por entrada. Exige tendência EMA 24/72, rompimento de 20 velas e volatilidade controlada. Saída quando uma vela fecha abaixo da EMA 24 ou do limite de 2 ATR, ou após 72 horas; não há stop enviado à corretora. Sinais usam somente velas encerradas e preço hipotético na abertura seguinte.</p></div><span className="crypto-study-live"><Activity size={15} /> {busy ? 'Atualizando' : 'Varredura ativa na página'}</span></div>
    <div className="crypto-study-tabs" role="group" aria-label="Ativo do estudo">{SYMBOLS.map((id) => <button key={id} className={symbol === id ? 'active' : ''} onClick={() => setSymbol(id)}>{id.replace('-', ' / ')}<small>{studies[id]?.status || errors[id] || 'Coletando'}</small></button>)}</div>
    {errors[symbol] && <div className="crypto-alert"><CircleHelp size={17} /> {errors[symbol]}. Resultado antigo, se houver, pode estar desatualizado.</div>}
    {study ? <>
      <div className="crypto-study-current"><div><small>LEITURA DA ÚLTIMA VELA ENCERRADA</small><strong>{study.latest}</strong><span><Clock3 size={14} /> {new Date(study.latestClosedAt).toLocaleString('pt-BR')} · atualização {updatedAt ? new Date(updatedAt).toLocaleTimeString('pt-BR') : '—'}</span></div><span className="crypto-study-verdict">{study.status}</span></div>
      <div className="crypto-study-windows"><WindowCard title="Janela inicial · primeira metade" result={study.calibration} /><WindowCard title="Validação cronológica · segunda metade" result={study.validation} /></div>
      <div className="crypto-study-evidence"><strong><ShieldCheck size={17} /> Condições antes de chamar uma estratégia de validada</strong><div>{evidence.map(({ label, pass }) => <span key={label} className={pass ? 'passed' : ''}>{pass ? '✓' : '○'} {label}</span>)}</div></div>
    </> : <div className="crypto-demo-history-empty">Coletando até 600 velas H1 encerradas por par da OKX. Os resultados aparecerão após a primeira varredura.</div>}
    <div className="crypto-info-strip"><CircleHelp size={18} /><span>Capital de $1.000 por variante; custo hipotético de {(SPOT_STUDY_COST.fee * 100).toFixed(2)}% de taxa e {(SPOT_STUDY_COST.impact * 100).toFixed(2)}% de impacto por lado. São duas janelas históricas consecutivas com parâmetros fixos, sem otimização por ativo. A atualização ocorre a cada cinco minutos enquanto o ASTROBOT Cripto está aberto; este monitor não envia ordens nem constitui prova de rentabilidade. Demais resultados da Demo devem ser medidos separadamente.</span></div>
  </section>;
}
