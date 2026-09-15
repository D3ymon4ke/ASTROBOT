import { OPTIONS_VERSION, OPTIONS_ARMS, forexWindow, forexEvaluation, resetWindow, accumulatorTerms, accumulatorStep, accuProfit } from './optionsStrategies.js';
import { assetPrecision, validTicks } from './evidenceStrategies.js';
import { ensureAdaptiveNetwork, adaptivePredict, trainAdaptiveNetwork, adaptiveDecision, adaptiveQuality } from './adaptiveNetwork.js';
const round = value => Math.round(value * 100) / 100;
export class OptionsResearch {
  constructor(owner) { this.owner = owner; this.lastPoll = 0; this.metadata = {}; }
  get state() {
    const state=this.owner.session.modeStates[this.owner.session.activeMode].optionsResearch ||= {
      version: OPTIONS_VERSION, startedAt: Date.now(), positions: [], trades: [], ledgers: {}, seen: {}, scans: {}, events: [], lastScan: 0
    };
    state.learning=ensureAdaptiveNetwork(state.learning);
    if(state.version!==OPTIONS_VERSION){state.version=OPTIONS_VERSION;state.retiredAccumulatorAt ||= Date.now();state.scans.accu='Encerrado após resultado líquido negativo; histórico preservado';delete state.scans.forex;}
    return state;
  }
  snapshot() { const state=this.state, quality=adaptiveQuality(state.learning); return { ...state, seen: undefined, learning:{...quality,lastPrediction:state.learning.lastPrediction,lastTrainedAt:state.learning.lastTrainedAt,version:state.learning.version}, simulationOnly: true, arms: OPTIONS_ARMS,
    trades: OPTIONS_ARMS.flatMap(a => state.trades.filter(r => r.arm === a.id).slice(-300)) }; }
  event(message) { this.state.events = [...this.state.events, { time: Date.now(), message }].slice(-30); }
  ledger(arm) { return this.state.ledgers[arm] ||= { bank: 100, peak: 100, drawdown: 0, count: 0, day: '', dayLoss: 0, reserved: 0 }; }
  reserve(arm, stake) {
    const l = this.ledger(arm), day = new Date().toISOString().slice(0,10);
    if (l.day !== day) { l.day = day; l.dayLoss = 0; }
    if (l.reserved || l.bank < stake || l.dayLoss + stake > 3 || l.drawdown + stake > 15) return false;
    l.reserved = stake; return true;
  }
  record(p, leg, profit, tick, extra = {}) {
    const row = { id: `${p.id}:${leg.arm}`, pairId: p.id, arm: leg.arm, symbol: p.symbol, stake: leg.stake ?? p.stake, profit: round(profit),
      timestamp: tick.epoch * 1000, entry: p.entry, entryEpoch: p.entryEpoch, exitPrice: tick.price, exitEpoch: tick.epoch,
      allocated: leg.allocated, execution: 'simulation', indicative: true, version: OPTIONS_VERSION, ...extra };
    const s = this.state;
    s.trades = [...s.trades.filter(r => r.arm !== leg.arm), ...s.trades.filter(r => r.arm === leg.arm).slice(-1499), row];
    if (leg.allocated) {
      const l = this.ledger(leg.arm), day = new Date(row.timestamp).toISOString().slice(0,10);
      if (l.day !== day) { l.day = day; l.dayLoss = 0; }
      l.bank = round(l.bank + row.profit); l.peak = Math.max(l.peak,l.bank); l.drawdown = Math.max(l.drawdown,l.peak-l.bank);
      l.dayLoss = round(l.dayLoss + Math.max(0,-row.profit)); l.reserved = 0; l.count++;
    }
    leg.done = true;
  }
  async settle(p, valid) {
    if (p.blocked?.startsWith('Barreira')) return;
    const api = this.owner.session.derivAPI, now = Math.floor(Date.now()/1000);
    const binary = p.family === 'forex' || p.family === 'reset';
    const lastExpiry = Math.max(p.expiry || 0,...p.legs.map(l=>l.expiry||0));
    if (binary && p.entry && now < lastExpiry + 3) return;
    const start = binary && p.entry ? Math.min(p.expiry || lastExpiry,...p.legs.map(l=>l.expiry||lastExpiry)) - 30 : p.lastEpoch ?? Math.floor(p.anchor);
    const end = binary && p.entry ? lastExpiry : Math.min(now,start+30);
    if (end <= start) return;
    const response = await api.sendRequest({ ticks_history:p.symbol,style:'ticks',start,end,count:1000 }); if (!valid()) return;
    const ticks = validTicks(response.history,p.precision);
    if (binary && p.entry) {
      for (const leg of p.legs.filter(l=>!l.done)) {
        const expiry=leg.expiry||p.expiry,exit=ticks.filter(t=>t.epoch<=expiry&&t.epoch>=expiry-30).at(-1);
        if(!exit){p.blocked='Ticks de vencimento ausentes; risco reservado';return;}
        const direction=leg.direction||p.direction,stake=leg.stake??p.stake,payout=leg.payout??p.payout;
        const win=direction*(exit.price-p.entry)>0;
        this.record(p,leg,win?payout-stake:-stake,exit,{payout,expiry,contractType:leg.contractType||p.contractType});
        if(leg.arm==='forex_control'&&!p.learningTrained&&Array.isArray(p.features)){
          trainAdaptiveNetwork(this.state.learning,p.features,win,p.prediction);
          p.learningTrained=true;
        }
      }
      return;
    }
    const future = ticks.filter(t => t.epoch > (p.lastEpoch ?? p.anchor));
    for (const t of future) {
      if (t.epoch - (p.lastEpoch ?? p.anchor) > (binary ? 30 : 5)) { p.blocked = 'Lacuna de ticks; risco reservado'; return; }
      p.blocked = null;
      if (p.entry == null) { p.entry = t.price; p.entryEpoch = t.epoch; p.lastPrice = t.price; p.lastEpoch = t.epoch; if (binary) return; continue; }
      const outcome = accumulatorStep(p.lastPrice,t.price,p.terms);
      if (outcome === 'ambiguous') { p.blocked = 'Barreira com arredondamento ambíguo; resultado não contabilizado e risco reservado'; this.event(`${p.symbol}: ${p.blocked}`); return; }
      p.tickCount++; p.lastEpoch = t.epoch; p.lastPrice = t.price;
      for (const leg of p.legs.filter(l => !l.done)) {
        if (outcome === 'knockout') {
          this.record(p,leg,-1,t,{ nominalProfit:leg.nominalProfit ?? -1,reason:'knockout',targetTicks:leg.ticks,ticks:p.tickCount,ratio:p.terms.ratio });
        } else {
          if (p.tickCount === leg.ticks) leg.nominalProfit = accuProfit(p.tickCount);
          if (p.tickCount === leg.ticks + 1) this.record(p,leg,accuProfit(p.tickCount),t,{ nominalProfit:leg.nominalProfit,reason:'exit_delay_1_tick',targetTicks:leg.ticks,ticks:p.tickCount,ratio:p.terms.ratio });
        }
      }
      if (p.legs.every(l => l.done)) return;
    }
    if (!future.length && now-start > (binary ? 30 : 5)) p.blocked = 'Aguardando ticks históricos; risco reservado';
  }
  fresh(q, stake, now, maxAge = 5) {
    return q?.id && q.spot != null && Number.isFinite(Number(q.spot)) && Number(q.spot) > 0 && Number(q.ask_price) === stake &&
      q.spot_time != null && Number.isFinite(Number(q.spot_time)) && now - Number(q.spot_time) <= maxAge && Number(q.spot_time) <= now+1;
  }
  async scanAccumulator(enabled, valid) {
    const s = this.state, api = this.owner.session.derivAPI, now = Date.now()/1000, slot = Math.floor(now/60);
    if (s.seen.accu === slot || s.positions.some(p => p.family === 'accu')) return;
    s.seen.accu = slot;
    const symbol = ['R_100','1HZ50V'][slot%2], precision = this.metadata[symbol];
    if (!Number.isInteger(precision)) { s.scans.accu = `${symbol}: precisão indisponível`; return; }
    const r = await api.sendRequest({ proposal:1,amount:1,basis:'stake',currency:'USD',underlying_symbol:symbol,contract_type:'ACCU',growth_rate:.01 });
    if (!valid() || !enabled()) return;
    const q = r.proposal, terms = accumulatorTerms(q), createdAt = Date.now();
    if (!this.fresh(q,1,createdAt/1000) || !terms) { s.scans.accu = 'Proposta ou barreiras inválidas; nenhum resultado inventado'; return; }
    s.positions.push({ id:`accu:${slot}`,family:'accu',symbol,precision,stake:1,terms,createdAt,anchor:createdAt/1000+1,tickCount:0,
      legs:OPTIONS_ARMS.filter(a=>a.family==='accu').map(a=>({arm:a.id,ticks:a.ticks,allocated:this.reserve(a.id,1)})) });
    s.scans.accu = `${symbol} · comparação pareada 3/5 ticks · 1% · sem filtro preditivo`;
  }
  async scanForex(enabled, valid) {
    const s = this.state, api = this.owner.session.derivAPI, now = Date.now()/1000, slot = Math.floor(now/300);
    if (!forexWindow(now)) { s.scans.forex = 'Fora da janela de pesquisa: segunda a sexta, 07–17 UTC'; return; }
    delete s.scans.forex;
    const symbols=slot%2?['frxGBPUSD','frxEURUSD']:['frxEURUSD','frxGBPUSD'];
    for (const symbol of symbols) {
      if (!valid() || !enabled()) return;
      if (s.seen[symbol] === slot || s.positions.some(p=>p.symbol===symbol)) continue;
      // Wait for closed candles, but don't retry expired signals within the same slot.
      s.seen[symbol] = slot;
      const precision = this.metadata[symbol];
      if (!Number.isInteger(precision)) { s.scans[symbol] = 'Ativo indisponível'; continue; }
      const m15 = await api.fetchCandleHistory(symbol,900,30); if (!valid() || !enabled()) return;
      const m5 = await api.fetchCandleHistory(symbol,300,20); if (!valid() || !enabled()) return;
      const evaluation = forexEvaluation(m15,m5,Date.now()/1000),signal=evaluation.signal;
      if (!signal) { s.scans[symbol] = evaluation.reason; continue; }
      const r = await api.sendRequest({ proposal:1,amount:.5,basis:'stake',currency:'USD',underlying_symbol:symbol,contract_type:signal.contractType,duration:15,duration_unit:'m' });
      if (!valid() || !enabled()) return;
      const q = r.proposal, createdAt = Date.now(), payout = Number(q?.payout);
      const expiry=Number(q?.date_expiry),duration=expiry-createdAt/1000;
      if (!this.fresh(q,.5,createdAt/1000,30) || !(payout>.5) || !(duration>=870&&duration<=930) || createdAt/1000-signal.signalEpoch>75 || !forexWindow(createdAt/1000)) { s.scans[symbol] = 'Proposta inválida ou sinal vencido'; continue; }
      const prediction=adaptivePredict(s.learning,signal.features), decision=adaptiveDecision(s.learning,prediction.probability,.5,payout);
      const arms = signal.filtered ? ['forex_control','forex_pullback'] : ['forex_control'];
      if(decision.qualified) arms.push('forex_adaptive');
      s.positions.push({ id:`forex:${symbol}:${slot}`,family:'forex',symbol,precision,stake:.5,payout,expiry,contractType:signal.contractType,direction:signal.direction,
        createdAt,anchor:createdAt/1000+1,features:signal.features,prediction:prediction.probability,hidden:prediction.hidden,adaptiveReason:decision.reason,legs:arms.map(arm=>({arm,allocated:this.reserve(arm,.5)})) });
      s.scans[symbol] = `${signal.filtered?'Retomada + controle':'Controle sem retomada'} · rede ${(prediction.probability*100).toFixed(1)}% · ${decision.reason}`;
    }
  }
  async scanReset(enabled,valid) {
    const s=this.state,api=this.owner.session.derivAPI,now=Date.now()/1000,slot=Math.floor(now/900);
    if(!resetWindow(now)){s.scans.reset='Pausa antes do reset diário UTC; evita vencimento atravessando a mudança de base';return;}
    const symbols=slot%2?['RDBEAR','RDBULL']:['RDBULL','RDBEAR'];
    for(const symbol of symbols){
      if(!valid()||!enabled())return;
      const key=`reset:${symbol}`;
      if(s.seen[key]===slot||s.positions.some(p=>p.family==='reset'&&p.symbol===symbol))continue;
      s.seen[key]=slot;
      const precision=this.metadata[symbol];
      if(!Number.isInteger(precision)){s.scans[key]='Ativo indisponível nesta conta';continue;}
      const biasDirection=symbol==='RDBULL'?1:-1;
      const arms=[{arm:'reset_bias',direction:biasDirection,contractType:biasDirection===1?'CALL':'PUT'},
        {arm:'reset_contra',direction:-biasDirection,contractType:biasDirection===1?'PUT':'CALL'}];
      const quotes=[];
      for(const arm of arms){
        const r=await api.sendRequest({proposal:1,amount:.5,basis:'stake',currency:'USD',underlying_symbol:symbol,contract_type:arm.contractType,duration:15,duration_unit:'m'});
        if(!valid()||!enabled())return;
        const q=r.proposal,stamp=Date.now()/1000,expiry=Number(q?.date_expiry);
        if(!this.fresh(q,.5,stamp,10)||!(Number(q.payout)>.5)||!(expiry-stamp>=870&&expiry-stamp<=930)){
          s.scans[key]=`${arm.contractType}: cotação ausente ou vencida`;quotes.length=0;break;
        }
        quotes.push({...arm,stake:.5,payout:Number(q.payout),expiry,spotTime:Number(q.spot_time)});
      }
      if(quotes.length!==2)continue;
      const createdAt=Date.now(),anchor=Math.max(createdAt/1000+1,...quotes.map(q=>q.spotTime+1));
      s.positions.push({id:`reset:${symbol}:${slot}`,family:'reset',symbol,precision,stake:.5,createdAt,anchor,expiry:Math.max(...quotes.map(q=>q.expiry)),
        legs:quotes.map(q=>({...q,allocated:this.reserve(q.arm,.5)}))});
      s.scans[key]=`${symbol}: viés × direção oposta · 15 min · payouts ${quotes.map(q=>q.payout.toFixed(2)).join('/')}`;
    }
  }
  async tick(enabled, valid) {
    if (Date.now()-this.lastPoll<5000) return;
    this.lastPoll = Date.now(); const s = this.state, api = this.owner.session.derivAPI;
    for (const p of [...s.positions]) {
      try { await this.settle(p,valid); } catch(e) { if(valid()) { p.blocked='Falha de dados: '+e.message; } }
      if (!valid()) return;
      if (p.legs.every(l=>l.done)) s.positions=s.positions.filter(x=>x.id!==p.id);
    }
    if (!enabled()) return;
    try {
      if (!Object.keys(this.metadata).length) {
        const r=await api.sendRequest({active_symbols:'brief'}); if(!valid()||!enabled())return;
        for(const a of r.active_symbols||[])this.metadata[a.underlying_symbol||a.symbol]=assetPrecision(a);
      }
      for (const [family,scan] of [['forex',()=>this.scanForex(enabled,valid)],['reset',()=>this.scanReset(enabled,valid)]]) {
        try { await scan(); } catch(e) { if(valid())s.scans[family]='Indisponível: '+e.message; }
        if(!valid()||!enabled())return;
      }
      s.lastScan=Date.now();
    } catch(e) { if(valid())this.event(e.message); }
  }
}
