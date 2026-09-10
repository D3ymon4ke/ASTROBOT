import { ASSETS, cleanCandles } from './signals.js';
export const FAKEGALE_VERSION = 'fakegale-v2.1';
export const MHI_PATTERNS = [1,2,3].flatMap(variant=>['minority','majority'].map(mode=>({id:`mhi_${variant}_${mode}`,name:`MHI ${variant} · ${mode==='minority'?'Minoria':'Maioria'}`,variant,mode})));
export const FAKEGALE_DEFAULTS = Object.freeze({enabled:false,symbols:['R_100','1HZ50V'],stake:1.5,multiplier:3,cycleBudget:20,minPayout:.8});
export function validateFakegale(patch,previous=FAKEGALE_DEFAULTS) {
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(FAKEGALE_DEFAULTS,k)))throw Error('Somente parâmetros de simulação são aceitos.');
 const c={...previous,...patch};
 if(typeof c.enabled!=='boolean'||!Array.isArray(c.symbols)||!c.symbols.length||c.symbols.length>4||c.symbols.some(s=>!ASSETS.includes(s)))throw Error('Configuração inválida.');
 c.symbols=[...new Set(c.symbols)];
 for(const [k,min,max] of [['stake',.35,100],['multiplier',1,5],['cycleBudget',.35,500],['minPayout',.1,2]]){c[k]=Number(c[k]);if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw Error(`Valor inválido: ${k}`);}
 if([0,1,2].reduce((sum,g)=>sum+Math.round(c.stake*c.multiplier**g*100)/100,0)>c.cycleBudget+1e-9)throw Error('As três entradas excedem o orçamento do ciclo.');
 return c;
}
export function mhiSeeds(candles,now) {
 const block=Math.floor(now/300)*300;if(now-block>15)return [];
 const bars=candles.filter(c=>c.epoch>=block-180&&c.epoch<block);
 if(bars.length!==3||bars.some((c,i)=>c.epoch!==block-180+i*60||c.close===c.open))return [];
 const majority=bars.reduce((n,c)=>n+Math.sign(c.close-c.open),0)>0?'CALL':'PUT';
 return MHI_PATTERNS.map(p=>({...p,direction:p.mode==='majority'?majority:majority==='CALL'?'PUT':'CALL',block,scheduled:block+(p.variant-1)*60}));
}
export function rankMhis(samples,symbol) {
 return MHI_PATTERNS.map(p=>{const data=samples[`${symbol}:${p.id}`]||[],wins=data.filter(Boolean).length,n=data.length;
 const z=1.96,rate=n?wins/n:0,lower=n?(rate+z*z/(2*n)-z*Math.sqrt(rate*(1-rate)/n+z*z/(4*n*n)))/(1+z*z/n):0;
 return {...p,count:n,wins,winRate:n?rate*100:null,lower,ready:n>=20};}).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.lower-a.lower||a.id.localeCompare(b.id));
}
export class FakegaleTrader {
 constructor(session){this.session=session;this.busy=false;this.destroyed=false;this.lastPoll=0;}
 get state(){return this.session.modeStates[this.session.activeMode].fakegale ||= {config:{...FAKEGALE_DEFAULTS},version:FAKEGALE_VERSION,status:'Desligado',seen:{},pending:[],samples:{},trades:[],baseline:[],virtuals:[],cycles:[],events:[],lastScan:0,errors:0};}
 snapshot(){const s=this.state;return {...s,pending:s.pending.map(p=>({id:p.id,symbol:p.symbol,strategy:p.strategy,stage:p.stage,selected:p.selected,phase:p.quote?'Aguardando resultado':'Aguardando entrada',scheduled:p.scheduled})),samples:undefined,seen:undefined,virtuals:(s.virtuals||[]).slice(-1000),rankings:Object.fromEntries(s.config.symbols.map(symbol=>[symbol,rankMhis(s.samples,symbol)])),trades:s.trades.slice(-2000),baseline:s.baseline.slice(-2000),cycles:s.cycles.slice(-1000),events:s.events.slice(-30),simulationOnly:true};}
 save(){if(!this.destroyed){this.session.loadedFromFile=true;this.session.saveToFile();this.session.syncToClients();}}
 event(message,p={}){const s=this.state;s.events.push({time:Date.now(),message,symbol:p.symbol,strategy:p.strategy});s.events=s.events.slice(-100);}
 configure(patch){const s=this.state;if((s.pending.length||this.busy)&&Object.keys(patch).some(k=>k!=='enabled'))throw Error('Pause e aguarde as simulações pendentes antes de alterar parâmetros.');s.config=validateFakegale(patch,s.config);s.status=s.config.enabled?'Aguardando próximo bloco MHI':'Pausado';if(s.config.enabled&&!this.session.derivAPI.connected)this.session.connectDeriv();this.save();}
 finish(p,reason){const s=this.state;s.cycles.push({id:p.id,timestamp:Date.now(),symbol:p.symbol,strategy:p.strategy,selected:p.selected,profit:p.profit,entries:p.entries,reason});s.cycles=s.cycles.slice(-2000);s.pending=s.pending.filter(x=>x.id!==p.id);this.event(reason,p);}
 async tick(){const s=this.state,api=this.session.derivAPI;if(this.busy||this.destroyed||(!s.config.enabled&&!s.pending.length)||Date.now()-this.lastPoll<5000)return;
 if(!api.connected||!api.authorized){s.status='Aguardando Deriv';return;}
 this.busy=true;this.lastPoll=Date.now();const mode=this.session.activeMode;const valid=()=>!this.destroyed&&mode===this.session.activeMode;
 try{
 if(this.session.accountCurrency&&this.session.accountCurrency!=='USD')throw Error('Simulação requer propostas em USD.');
 for(const p of [...s.pending]){
  if(!valid())return;
  if(p.quote){
   if(Date.now()/1000<p.expiry+3)continue;
   const {history}=await api.sendRequest({ticks_history:p.symbol,style:'ticks',start:p.expiry,end:p.expiry+5,count:20});if(!valid())return;
   const points=(history?.times||[]).map((t,i)=>({epoch:Number(t),price:Number(history.prices?.[i])})).filter(t=>Number.isFinite(t.epoch)&&Number.isFinite(t.price)&&t.epoch>=p.expiry&&t.epoch<=p.expiry+5).sort((a,b)=>a.epoch-b.epoch);
   if(!points.length){if(Date.now()/1000-p.expiry>120)this.finish(p,'Excluído: tick de saída indisponível');continue;}
   const exit=points[0],win=p.direction==='CALL'?exit.price>p.quote.entry:exit.price<p.quote.entry;
   const row={id:`${p.id}:${p.stage}`,timestamp:exit.epoch*1000,symbol:p.symbol,strategy:p.strategy,direction:p.direction,stage:p.stage,selected:p.selected,selectedUsing:p.selectedUsing,stake:p.quote.stake,payout:p.quote.payout,profit:win?p.quote.payout-p.quote.stake:-p.quote.stake,entry:p.quote.entry,entryEpoch:p.quote.epoch,exitPrice:exit.price,exitEpoch:exit.epoch,version:FAKEGALE_VERSION,execution:'simulation',indicative:true};
   if(p.stage<2){s.virtuals=[...(s.virtuals||[]),row].slice(-2000);}
   if(p.stage===0){s.baseline.push(row);s.baseline=s.baseline.slice(-4000);const key=`${p.symbol}:${p.strategy}`;s.samples[key]=[...(s.samples[key]||[]),win].slice(-100);}
   if(p.stage>=2){s.trades.push(row);s.trades=s.trades.slice(-4000);p.profit+=row.profit;p.entries++;}
   if(win||p.stage===4){this.finish(p,p.stage<2?'Descartado: vitória virtual':win?'Ciclo simulado positivo':'Ciclo simulado encerrado em perda');continue;}
   p.stage++;p.scheduled=p.expiry+3;p.quote=null;
  }
  if(!s.config.enabled){this.finish(p,'Interrompido pela pausa');continue;}
  if(Date.now()/1000<p.scheduled)continue;
  if(Date.now()/1000-p.scheduled>20){this.finish(p,'Excluído: janela de entrada vencida');continue;}
  const stake=Math.round(s.config.stake*s.config.multiplier**Math.max(0,p.stage-2)*100)/100;
  const response=await api.sendRequest({proposal:1,amount:stake,basis:'stake',contract_type:p.direction,currency:'USD',underlying_symbol:p.symbol,duration:1,duration_unit:'m'});if(!valid())return;
  if(!s.config.enabled){this.finish(p,'Interrompido pela pausa');continue;}
  const q=response.proposal,price=Number(q?.ask_price),payout=Number(q?.payout),entry=Number(q?.spot),epoch=Number(q?.spot_time),now=Date.now()/1000;
  if(!q?.id||![price,payout,entry,epoch].every(Number.isFinite)||Math.abs(price-stake)>.01||payout<=price||(payout-price)/price<s.config.minPayout||epoch>now+1||now-epoch>5||now-p.scheduled>20){this.finish(p,'Excluído: proposta ou tick inválido');continue;}
  if(p.stage>=2){if((p.spent||0)+price>s.config.cycleBudget+1e-9){this.finish(p,'Excluído: orçamento do ciclo excedido');continue;}p.spent=(p.spent||0)+price;}
  p.quote={stake:price,payout,entry,epoch};p.expiry=epoch+60;
  this.event(p.stage<2?`Etapa virtual ${p.stage+1} iniciada`:`Entrada simulada ${p.stage-2} iniciada`,p);
 }
 if(s.config.enabled){
  for(const symbol of s.config.symbols){
   if(!valid()||!s.config.enabled)break;
   const block=Math.floor(Date.now()/1000/300)*300;if(s.seen[symbol]===block||Date.now()/1000-block>15)continue;
   const candles=cleanCandles(await api.fetchCandleHistory(symbol,60,40),Date.now()/1000);if(!valid()||!s.config.enabled)break;
   const seeds=mhiSeeds(candles,Date.now()/1000);if(!seeds.length)continue;
   s.seen[symbol]=block;const leader=rankMhis(s.samples,symbol).find(r=>r.ready);
   for(const seed of seeds)s.pending.push({id:`${mode}:${symbol}:${seed.id}:${block}`,symbol,strategy:seed.id,direction:seed.direction,selected:leader?.id===seed.id,selectedUsing:leader?{count:leader.count,winRate:leader.winRate,lower:leader.lower}:null,stage:0,scheduled:seed.scheduled,profit:0,entries:0,quote:null});
   this.event(leader?`Líder fixado para o bloco: ${leader.name}`:'Aquecendo os seis MHIs: mínimo de 20 resultados iniciais por padrão',{symbol});
  }
 }
 s.lastScan=Date.now();s.errors=0;s.status=s.config.enabled?'Observando seis MHIs por ativo · sem compras':s.pending.length?'Pausado · finalizando simulações':'Pausado';
 }catch(e){s.errors++;s.status=`Falha na observação: ${e.message}`;if(s.errors>=5){s.config.enabled=false;this.event('Novas simulações pausadas após falhas repetidas');}}
 finally{this.busy=false;this.save();}
 }
}
