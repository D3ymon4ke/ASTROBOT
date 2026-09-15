import { OPTIONS_VERSION, OPTIONS_ARMS, forexWindow, forexSignal, accumulatorTerms, accumulatorStep, accuProfit } from './optionsStrategies.js';
import { assetPrecision, validTicks } from './evidenceStrategies.js';
const round = value => Math.round(value * 100) / 100;
export class OptionsResearch {
  constructor(owner) { this.owner = owner; this.lastPoll = 0; this.metadata = {}; }
  get state() {
    return this.owner.session.modeStates[this.owner.session.activeMode].optionsResearch ||= {
      version: OPTIONS_VERSION, startedAt: Date.now(), positions: [], trades: [], ledgers: {}, seen: {}, scans: {}, events: [], lastScan: 0
    };
  }
  snapshot() { return { ...this.state, seen: undefined, simulationOnly: true, arms: OPTIONS_ARMS,
    trades: OPTIONS_ARMS.flatMap(a => this.state.trades.filter(r => r.arm === a.id).slice(-300)) }; }
  event(message) { this.state.events = [...this.state.events, { time: Date.now(), message }].slice(-30); }
  ledger(arm) { return this.state.ledgers[arm] ||= { bank: 100, peak: 100, drawdown: 0, count: 0, day: '', dayLoss: 0, reserved: 0 }; }
  reserve(arm, stake) {
    const l = this.ledger(arm), day = new Date().toISOString().slice(0,10);
    if (l.day !== day) { l.day = day; l.dayLoss = 0; }
    if (l.reserved || l.bank < stake || l.dayLoss + stake > 3 || l.drawdown + stake > 15) return false;
    l.reserved = stake; return true;
  }
  record(p, leg, profit, tick, extra = {}) {
    const row = { id: `${p.id}:${leg.arm}`, pairId: p.id, arm: leg.arm, symbol: p.symbol, stake: p.stake, profit: round(profit),
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
    if (p.family === 'forex' && p.entry && now < p.expiry + 3) return;
    const start = p.family === 'forex' && p.entry ? p.expiry - 30 : p.lastEpoch ?? Math.floor(p.anchor);
    const end = p.family === 'forex' && p.entry ? p.expiry : Math.min(now,start+30);
    if (end <= start) return;
    const response = await api.sendRequest({ ticks_history:p.symbol,style:'ticks',start,end,count:1000 }); if (!valid()) return;
    const ticks = validTicks(response.history,p.precision);
    if (p.family === 'forex' && p.entry) {
      const exit = ticks.filter(t => t.epoch <= p.expiry && t.epoch >= p.expiry-30).at(-1);
      if (!exit) { p.blocked = 'Ticks de vencimento ausentes; risco reservado'; return; }
      const win = p.direction * (exit.price-p.entry) > 0;
      for (const leg of p.legs) this.record(p,leg,win ? p.payout-p.stake : -p.stake,exit,{ payout:p.payout,expiry:p.expiry,contractType:p.contractType });
      return;
    }
    const future = ticks.filter(t => t.epoch > (p.lastEpoch ?? p.anchor));
    for (const t of future) {
      if (t.epoch - (p.lastEpoch ?? p.anchor) > (p.family === 'forex' ? 30 : 5)) { p.blocked = 'Lacuna de ticks; risco reservado'; return; }
      p.blocked = null;
      if (p.entry == null) { p.entry = t.price; p.entryEpoch = t.epoch; p.lastPrice = t.price; p.lastEpoch = t.epoch; if (p.family === 'forex') return; continue; }
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
    if (!future.length && now-start > (p.family === 'forex' ? 30 : 5)) p.blocked = 'Aguardando ticks históricos; risco reservado';
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
    for (const symbol of ['frxEURUSD','frxGBPUSD']) {
      if (!valid() || !enabled()) return;
      if (s.seen[symbol] === slot || s.positions.some(p=>p.symbol===symbol)) continue;
      // Wait for closed candles, but don't retry expired signals within the same slot.
      s.seen[symbol] = slot;
      const precision = this.metadata[symbol];
      if (!Number.isInteger(precision)) { s.scans[symbol] = 'Ativo indisponível'; continue; }
      const m15 = await api.fetchCandleHistory(symbol,900,65); if (!valid() || !enabled()) return;
      const m5 = await api.fetchCandleHistory(symbol,300,35); if (!valid() || !enabled()) return;
      const signal = forexSignal(m15,m5,Date.now()/1000);
      if (!signal) { s.scans[symbol] = 'Aguardando tendência M15 e candle M5 recente'; continue; }
      const expiry = Math.floor(Date.now()/1000)+900;
      const r = await api.sendRequest({ proposal:1,amount:.5,basis:'stake',currency:'USD',underlying_symbol:symbol,contract_type:signal.contractType,barrier:'+0',date_expiry:expiry });
      if (!valid() || !enabled()) return;
      const q = r.proposal, createdAt = Date.now(), payout = Number(q?.payout);
      if (!this.fresh(q,.5,createdAt/1000,30) || !(payout>.5) || Number(q.date_expiry)!==expiry || createdAt/1000-signal.signalEpoch>45 || !forexWindow(createdAt/1000)) { s.scans[symbol] = 'Proposta inválida ou sinal vencido'; continue; }
      const arms = signal.filtered ? ['forex_control','forex_pullback'] : ['forex_control'];
      s.positions.push({ id:`forex:${symbol}:${slot}`,family:'forex',symbol,precision,stake:.5,payout,expiry,contractType:signal.contractType,direction:signal.direction,
        createdAt,anchor:createdAt/1000+1,legs:arms.map(arm=>({arm,allocated:this.reserve(arm,.5)})) });
      s.scans[symbol] = signal.filtered ? 'Retomada e controle simulados na mesma entrada' : 'Referência de tendência; filtro de retomada não passou';
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
      for (const [family,scan] of [['accu',()=>this.scanAccumulator(enabled,valid)],['forex',()=>this.scanForex(enabled,valid)]]) {
        try { await scan(); } catch(e) { if(valid())s.scans[family]='Indisponível: '+e.message; }
        if(!valid()||!enabled())return;
      }
      s.lastScan=Date.now();
    } catch(e) { if(valid())this.event(e.message); }
  }
}
