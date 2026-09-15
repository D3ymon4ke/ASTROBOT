import { ASSETS, cleanCandles } from './signals.js';
import { validTicks, assetPrecision } from './evidenceStrategies.js';

export const FAKEGALE_VERSION = 'fakegale-regime-v3';
export const FAKEGALE_ARMS = [
  {id:'reverse_2',name:'Reversão após 2',depth:2,mode:'reverse'},
  {id:'follow_2',name:'Continuação após 2',depth:2,mode:'follow'},
  {id:'reverse_3',name:'Reversão após 3',depth:3,mode:'reverse'},
  {id:'follow_3',name:'Continuação após 3',depth:3,mode:'follow'}
];
export const MHI_PATTERNS = [1,2,3].flatMap(variant=>['minority','majority'].map(mode=>({id:`mhi_${variant}_${mode}`,name:`MHI ${variant} · ${mode==='minority'?'Minoria':'Maioria'}`,variant,mode})));
export const FAKEGALE_DEFAULTS = Object.freeze({enabled:false,symbols:['R_100','1HZ50V'],stake:1,minPayout:.7});
const round=value=>Math.round(value*100)/100;

export function validateFakegale(patch,previous=FAKEGALE_DEFAULTS) {
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!Object.hasOwn(FAKEGALE_DEFAULTS,key)))throw Error('Somente parâmetros da simulação V3 são aceitos.');
  const config={...previous,...patch};
  if(typeof config.enabled!=='boolean'||!Array.isArray(config.symbols)||!config.symbols.length||config.symbols.length>4||config.symbols.some(symbol=>!ASSETS.includes(symbol)))throw Error('Configuração inválida.');
  config.symbols=[...new Set(config.symbols)];config.stake=Number(config.stake);config.minPayout=Number(config.minPayout);
  if(!Number.isFinite(config.stake)||config.stake<.35||config.stake>20||!Number.isFinite(config.minPayout)||config.minPayout<.1||config.minPayout>2)throw Error('Stake ou payout mínimo inválido.');
  return config;
}

export function streakSignal(input,now) {
  const boundary=Math.floor(now/60)*60;if(now-boundary>15)return null;
  const bars=cleanCandles(input,now).filter(c=>c.epoch<boundary).slice(-3);
  if(bars.length!==3||bars.some((c,i)=>!Number.isFinite(c.open)||!Number.isFinite(c.close)||c.open===c.close||(!i?false:c.epoch!==bars[i-1].epoch+60)))return null;
  const colors=bars.map(c=>Math.sign(c.close-c.open)),depth=colors.every(color=>color===colors[2])?3:colors[1]===colors[2]?2:0;
  if(!depth)return null;
  const follow=colors[2]>0?'CALL':'PUT';
  return {depth,follow,reverse:follow==='CALL'?'PUT':'CALL',key:bars[2].epoch,range:round(bars.slice(-depth).reduce((sum,c)=>sum+Math.abs(c.close-c.open),0)/depth)};
}

// Read-only helpers preserve compatibility with archived V2 exports.
export function mhiSeeds(candles,now) {
  const block=Math.floor(now/300)*300;if(now-block>15)return [];
  const bars=candles.filter(c=>c.epoch>=block-180&&c.epoch<block);
  if(bars.length!==3||bars.some((c,i)=>c.epoch!==block-180+i*60||c.close===c.open))return [];
  const majority=bars.reduce((n,c)=>n+Math.sign(c.close-c.open),0)>0?'CALL':'PUT';
  return MHI_PATTERNS.map(p=>({...p,direction:p.mode==='majority'?majority:majority==='CALL'?'PUT':'CALL',block,scheduled:block+(p.variant-1)*60}));
}
export function rankMhis(samples,symbol) {
  return MHI_PATTERNS.map(p=>{const data=samples?.[`${symbol}:${p.id}`]||[],wins=data.filter(Boolean).length,n=data.length;const z=1.96,rate=n?wins/n:0,lower=n?(rate+z*z/(2*n)-z*Math.sqrt(rate*(1-rate)/n+z*z/(4*n*n)))/(1+z*z/n):0;return{...p,count:n,wins,winRate:n?rate*100:null,lower,ready:n>=20};}).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.lower-a.lower||a.id.localeCompare(b.id));
}

const summarize=rows=>({count:rows.length,wins:rows.filter(row=>row.profit>0).length,net:round(rows.reduce((sum,row)=>sum+(Number(row.profit)||0),0))});
export class FakegaleTrader {
  constructor(session){this.session=session;this.busy=false;this.destroyed=false;this.lastPoll=0;this.metadata=null;}
  freshState(legacyV2=null){return{version:FAKEGALE_VERSION,config:{...FAKEGALE_DEFAULTS},status:'Pausado',seen:{},pending:[],trades:[],ledgers:{},events:[],lastScan:0,errors:0,startedAt:Date.now(),legacyV2};}
  get state(){const mode=this.session.modeStates[this.session.activeMode];let state=mode.fakegale;if(!state)state=mode.fakegale=this.freshState();else if(state.version!==FAKEGALE_VERSION)state=mode.fakegale=this.freshState(state);return state;}
  snapshot(){const s=this.state,legacy=s.legacyV2;return{...s,seen:undefined,legacyV2:legacy?{version:legacy.version,trades:summarize(legacy.trades||[]),baseline:summarize(legacy.baseline||[]),cycles:summarize(legacy.cycles||[]),retained:true}:null,trades:FAKEGALE_ARMS.flatMap(arm=>s.trades.filter(row=>row.arm===arm.id).slice(-500)),arms:FAKEGALE_ARMS,simulationOnly:true};}
  save(){if(!this.destroyed){this.session.loadedFromFile=true;this.session.saveToFile();this.session.syncToClients();}}
  event(message,details={}){const s=this.state;s.events=[...s.events,{time:Date.now(),message,...details}].slice(-50);}
  configure(patch){const s=this.state;if((s.pending.length||this.busy)&&Object.keys(patch).some(key=>key!=='enabled'))throw Error('Pause e aguarde as simulações pendentes antes de alterar parâmetros.');s.config=validateFakegale(patch,s.config);s.status=s.config.enabled?'Procurando sequências M1 de 2 e 3 velas':'Pausado';if(s.config.enabled&&!this.session.derivAPI.connected)this.session.connectDeriv();this.save();}
  ledger(arm){return this.state.ledgers[arm]||={bank:100,peak:100,drawdown:0,count:0,day:'',dayLoss:0,reserved:0};}
  reserve(arm,stake){const ledger=this.ledger(arm),day=new Date().toISOString().slice(0,10);if(ledger.day!==day){ledger.day=day;ledger.dayLoss=0;}if(ledger.reserved||ledger.bank<stake||ledger.dayLoss+stake>3||ledger.drawdown+stake>15)return false;ledger.reserved=stake;return true;}
  exclude(position,reason){for(const leg of position.legs){if(leg.allocated)this.ledger(leg.arm).reserved=0;leg.done=true;}position.blocked=reason;this.event(`Excluído: ${reason}`,{symbol:position.symbol});}
  record(position,leg,exit){const win=leg.direction==='CALL'?exit.price>position.entry:exit.price<position.entry,row={id:`${position.id}:${leg.arm}`,pairId:position.id,arm:leg.arm,symbol:position.symbol,depth:position.depth,direction:leg.direction,stake:position.stake,payout:leg.payout,profit:round(win?leg.payout-position.stake:-position.stake),entry:position.entry,entryEpoch:position.entryEpoch,exitPrice:exit.price,exitEpoch:exit.epoch,timestamp:exit.epoch*1000,allocated:leg.allocated,execution:'simulation',indicative:true,version:FAKEGALE_VERSION};this.state.trades=[...this.state.trades.filter(old=>old.arm!==leg.arm),...this.state.trades.filter(old=>old.arm===leg.arm).slice(-1499),row];if(leg.allocated){const ledger=this.ledger(leg.arm),day=new Date(row.timestamp).toISOString().slice(0,10);if(ledger.day!==day){ledger.day=day;ledger.dayLoss=0;}ledger.bank=round(ledger.bank+row.profit);ledger.peak=Math.max(ledger.peak,ledger.bank);ledger.drawdown=Math.max(ledger.drawdown,ledger.peak-ledger.bank);ledger.dayLoss=round(ledger.dayLoss+Math.max(0,-row.profit));ledger.reserved=0;ledger.count++;}leg.done=true;}
  async settle(position,valid){const api=this.session.derivAPI,now=Math.floor(Date.now()/1000);if(position.entry==null){const response=await api.sendRequest({ticks_history:position.symbol,style:'ticks',start:Math.floor(position.anchor),end:now,count:100});if(!valid())return;const entry=validTicks(response.history,position.precision).find(t=>t.epoch>=position.anchor);if(!entry){if(now-position.anchor>30)this.exclude(position,'tick futuro de entrada indisponível');return;}position.entry=entry.price;position.entryEpoch=entry.epoch;position.expiry=entry.epoch+60;return;}if(now<position.expiry+3)return;const response=await api.sendRequest({ticks_history:position.symbol,style:'ticks',start:position.expiry,end:position.expiry+5,count:20});if(!valid())return;const exit=validTicks(response.history,position.precision).find(t=>t.epoch>=position.expiry&&t.epoch<=position.expiry+5);if(!exit){if(now-position.expiry>120)this.exclude(position,'tick de saída indisponível');return;}for(const leg of position.legs)this.record(position,leg,exit);}
  validProposal(proposal,stake,now){const price=Number(proposal?.ask_price),payout=Number(proposal?.payout),spot=Number(proposal?.spot),epoch=Number(proposal?.spot_time);return proposal?.id&&[price,payout,spot,epoch].every(Number.isFinite)&&Math.abs(price-stake)<=.01&&payout>price&&(payout-price)/price>=this.state.config.minPayout&&epoch<=now+1&&now-epoch<=5;}
  async scan(valid){const s=this.state,api=this.session.derivAPI,now=Date.now()/1000,slot=Math.floor(now/60);if(now-slot*60>15)return;for(const symbol of s.config.symbols){if(!valid()||!s.config.enabled)return;if(s.seen[symbol]===slot||s.pending.some(p=>p.symbol===symbol))continue;s.seen[symbol]=slot;const precision=this.metadata?.[symbol];if(!Number.isInteger(precision)){this.event('Precisão do ativo indisponível',{symbol});continue;}const candles=await api.fetchCandleHistory(symbol,60,8);if(!valid()||!s.config.enabled)return;const signal=streakSignal(candles,Date.now()/1000);if(!signal)continue;const [reverseResponse,followResponse]=await Promise.all([signal.reverse,signal.follow].map(contract_type=>api.sendRequest({proposal:1,amount:s.config.stake,basis:'stake',contract_type,currency:'USD',underlying_symbol:symbol,duration:1,duration_unit:'m'})));if(!valid()||!s.config.enabled)return;const created=Date.now()/1000,reverse=reverseResponse.proposal,follow=followResponse.proposal;if(!this.validProposal(reverse,s.config.stake,created)||!this.validProposal(follow,s.config.stake,created)){this.event('Par de propostas rejeitado: cotação incompleta ou payout baixo',{symbol});continue;}const arms=FAKEGALE_ARMS.filter(arm=>arm.depth===signal.depth),id=`${this.session.activeMode}:${symbol}:${signal.key}:${signal.depth}`;s.pending.push({id,symbol,precision,depth:signal.depth,stake:s.config.stake,anchor:Math.max(Number(reverse.spot_time),Number(follow.spot_time))+1,entry:null,createdAt:Date.now(),range:signal.range,legs:arms.map(arm=>({arm:arm.id,direction:arm.mode==='reverse'?signal.reverse:signal.follow,payout:Number(arm.mode==='reverse'?reverse.payout:follow.payout),allocated:this.reserve(arm.id,s.config.stake),done:false}))});this.event(`Sequência ${signal.depth}: reversão e continuação pareadas`,{symbol});}}
  async loadMetadata(valid){if(this.metadata)return;const response=await this.session.derivAPI.sendRequest({active_symbols:'brief'});if(!valid())return;this.metadata={};for(const asset of response.active_symbols||[])this.metadata[asset.underlying_symbol||asset.symbol]=assetPrecision(asset);}
  async tick(){const s=this.state,api=this.session.derivAPI;if(this.busy||this.destroyed||(!s.config.enabled&&!s.pending.length)||Date.now()-this.lastPoll<5000)return;if(!api.connected||!api.authorized){s.status='Aguardando Deriv';return;}this.busy=true;this.lastPoll=Date.now();const mode=this.session.activeMode,valid=()=>!this.destroyed&&mode===this.session.activeMode;try{for(const position of [...s.pending]){await this.settle(position,valid);if(!valid())return;if(position.legs.every(leg=>leg.done))s.pending=s.pending.filter(item=>item.id!==position.id);}if(s.config.enabled){await this.loadMetadata(valid);if(valid())await this.scan(valid);}s.lastScan=Date.now();s.errors=0;s.status=s.config.enabled?'Comparando reversão × continuação · sem compras':s.pending.length?'Pausado · apurando pares':'Pausado';}catch(error){s.errors++;s.status=`Falha na observação: ${error.message}`;if(s.errors>=5){s.config.enabled=false;this.event('Novos pares pausados após falhas repetidas');}}finally{this.busy=false;this.save();}}
}
