export const ADAPTIVE_VERSION = 'forex-online-nn-v1';
const INPUTS = 5, HIDDEN = 4, LIMIT = 3;
const sigmoid = value => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, value))));
const clip = (value, limit = LIMIT) => Math.max(-limit, Math.min(limit, Number(value) || 0));

export function createAdaptiveNetwork() {
  return {
    version: ADAPTIVE_VERSION,
    samples: 0,
    wins: 0,
    weights1: [
      [.18,-.09,.11,.04,-.07],[-.12,.16,.06,-.08,.13],
      [.07,.05,-.14,.17,.09],[-.04,.12,.15,-.11,.08]
    ],
    bias1: [0,0,0,0],
    weights2: [.12,-.08,.1,.06],
    bias2: 0,
    audit: [],
    lastPrediction: null,
    lastTrainedAt: null
  };
}

export function ensureAdaptiveNetwork(value) {
  if (!value || value.version !== ADAPTIVE_VERSION || !Array.isArray(value.weights1) || value.weights1.length !== HIDDEN) return createAdaptiveNetwork();
  value.audit ||= [];
  value.samples = Number(value.samples) || 0;
  value.wins = Number(value.wins) || 0;
  return value;
}

export function adaptivePredict(inputModel, rawFeatures) {
  const model = ensureAdaptiveNetwork(inputModel), features = Array.from({length:INPUTS},(_,i)=>clip(rawFeatures?.[i]));
  const hidden = model.weights1.map((weights,j)=>sigmoid(weights.reduce((sum,w,i)=>sum+w*features[i],Number(model.bias1[j])||0)));
  const probability = sigmoid(model.weights2.reduce((sum,w,i)=>sum+w*hidden[i],Number(model.bias2)||0));
  return { probability, hidden, features };
}

export function trainAdaptiveNetwork(inputModel, rawFeatures, rawLabel, priorPrediction) {
  const model = ensureAdaptiveNetwork(inputModel), label = rawLabel ? 1 : 0;
  const forward = adaptivePredict(model,rawFeatures), prediction = Number.isFinite(priorPrediction) ? priorPrediction : forward.probability;
  const baseline = model.samples ? model.wins/model.samples : .5;
  model.audit = [...model.audit,{ prediction, baseline, label, at:Date.now() }].slice(-200);
  const outputDelta = (forward.probability-label)*forward.probability*(1-forward.probability);
  const oldOutput = [...model.weights2], rate=.035, l2=.0002;
  for(let j=0;j<HIDDEN;j++) model.weights2[j]=clip(model.weights2[j]-rate*(outputDelta*forward.hidden[j]+l2*model.weights2[j]),2);
  model.bias2=clip(model.bias2-rate*outputDelta,2);
  for(let j=0;j<HIDDEN;j++) {
    const hiddenDelta=outputDelta*oldOutput[j]*forward.hidden[j]*(1-forward.hidden[j]);
    for(let i=0;i<INPUTS;i++) model.weights1[j][i]=clip(model.weights1[j][i]-rate*(hiddenDelta*forward.features[i]+l2*model.weights1[j][i]),2);
    model.bias1[j]=clip(model.bias1[j]-rate*hiddenDelta,2);
  }
  model.samples++; model.wins+=label; model.lastPrediction=prediction; model.lastTrainedAt=Date.now();
  return model;
}

export function adaptiveQuality(inputModel) {
  const model=ensureAdaptiveNetwork(inputModel), audit=model.audit.slice(-100);
  const average=key=>audit.length ? audit.reduce((sum,row)=>sum+(row[key]-row.label)**2,0)/audit.length : null;
  const brier=average('prediction'), baselineBrier=average('baseline');
  return { samples:model.samples, wins:model.wins, accuracy:model.samples?model.wins/model.samples:null, auditSamples:audit.length, brier, baselineBrier,
    beatsBaseline:brier!=null&&baselineBrier!=null&&brier+.005<baselineBrier };
}

export function adaptiveDecision(inputModel, probability, stake, payout) {
  const quality=adaptiveQuality(inputModel), breakEven=Number(stake)/Number(payout);
  const qualified=quality.samples>=100&&quality.auditSamples>=100&&quality.beatsBaseline&&Number.isFinite(breakEven)&&probability>=breakEven+.04;
  return { qualified, probability, breakEven, quality, reason:quality.samples<100?`Observação: ${quality.samples}/100 resultados`:!quality.beatsBaseline?'A rede ainda não supera a referência':probability<breakEven+.04?'Confiança abaixo da margem mínima':'Sinal adaptativo qualificado' };
}
