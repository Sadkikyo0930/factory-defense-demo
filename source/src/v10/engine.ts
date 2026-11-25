import {Scenario,Formation,Step,Kind,Lot,stages,towers,route,serviceTime,tapeCof,stageSlots,validate,clone,inspectionStage,type InspectionStage} from './spec';
export interface Ledger {opening:number;external:number;forecast:number;upstream:number;processed:number;closing:number;cof:number;busySeconds:number;}
export interface TraceEvent {time:number;stage:Step;kind:Kind;count:number;failed:number;}
/** Read-only presentation journal. Never used for dispatch, yield, accounting or scoring. */
export interface VisualService {lotId:string;first:number;count:number;stage:Step;start:number;end:number;resource:string;}
export interface VisualTerminal {lotId:string;first:number;count:number;outcome:'success'|'failure'|'wip';stage:Step;}
interface Parcel {lot:number;first:number;count:number;step:number;queued:number;}
interface Resource {id:string;stage:Step;end:number;active:Parcel[];actual?:Step;started:number;}
export interface Simulation {ledger:Record<Step,Ledger>;successfulOut:number;failurePool:number;input:number;forecastInput:number;opening:number;closing:number;unreleased:number;total:number;outByKind:Record<Kind,number>;failedByKind:Record<Kind,number>;timeline:TraceEvent[];batches:{start:number;end:number;count:number;modes:string[]}[];conservation:boolean;identityConservation:boolean;resourceBusy:Record<string,number>;maxActive:number;checks:number;visual:{services:VisualService[];terminal:VisualTerminal[]};}
export function identitySuccess(seed:string,lotId:string,ordinal:number,probability:number,attempt=1){let hash=2166136261;const text=seed+'|'+lotId+'|'+ordinal+'|'+attempt;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;return (hash>>>0)/4294967296<probability;}
export function canDamage(expected:Step,attack:Step){return expected===attack||(expected==='OUT'&&['VI','OC_VI','LCM_VI'].includes(attack));}
const kindCounts=():Record<Kind,number>=>({BD:0,POL:0,FILM:0,REVIEW:0,UNKNOWN:0});
/** Discrete-event 10h scheduler. Cohorts carry ID ranges, not one object per WIP sheet. */
export function simulate(s:Scenario,f:Formation):Simulation {
 const total=validate(s,f),paths=s.lots.map(route),queues=Object.fromEntries(stages.map(stage=>[stage,[] as Parcel[]])) as Record<Step,Parcel[]>;
 const ledger=Object.fromEntries(stages.map(stage=>[stage,{opening:0,external:0,forecast:0,upstream:0,processed:0,closing:0,cof:0,busySeconds:0}])) as Record<Step,Ledger>;
 const resources:Resource[]=stages.filter(x=>x!=='CUT'&&x!=='OUT').flatMap<Resource>(stage=>stage==='BUBBLE'?[{id:'BUBBLE-1',stage,end:Infinity,active:[],started:0}]: (f[stage]||[]).map(n=>({id:stage+'-'+n,stage,end:Infinity,active:[],started:0})));
 if(s.cutMNTConfirmed)for(const n of f.CUT||[])resources.push({id:'CUT-'+n,stage:'CUT',end:Infinity,active:[],started:0});
 const arrivals=s.lots.map((l,i)=>({at:l.at,i})).sort((a,b)=>a.at-b.at||a.i-b.i),roundRobin:Partial<Record<Step,number>>={};let arrival=0,time=0,checks=0,maxActive=0;
 const timeline:TraceEvent[]=[],batches:Simulation['batches']=[],outByKind=kindCounts(),failedByKind=kindCounts(),exits:Parcel[]=[],failures:Parcel[]=[],resourceBusy:Record<string,number>={};
 const visualServices:VisualService[]=[];
 function enqueue(p:Parcel,source:'opening'|'external'|'forecast'|'upstream') {const stage=paths[p.lot][p.step];queues[stage].push(p);ledger[stage][source]+=p.count;}
 const eligible=(stage:Step,p:Parcel,operator?:Step)=>stage==='BUBBLE'||(s.lots[p.lot].mode===(s.mode??(stage==='CUT'?'MNT':'TV'))&&(stage!=='OUT'||inspectionStage(s.lots[p.lot])===operator));
 const hasWork=(stage:Step,operator?:Step)=>queues[stage].some(p=>eligible(stage,p,operator));
 function take(stage:Step,max=1,operator?:Step){const picked:Parcel[]=[];let count=0,index=0;while(count<max&&(index=queues[stage].findIndex(p=>eligible(stage,p,operator)))>=0){const p=queues[stage][index],n=Math.min(max-count,p.count);picked.push({...p,count:n});p.first+=n;p.count-=n;count+=n;if(!p.count)queues[stage].splice(index,1);}return picked;}
 function finish(r:Resource){const step=r.actual!;let failure=0;for(const p of r.active){const l=s.lots[p.lot];ledger[step].processed+=p.count;if(step==='TAPE')ledger[step].cof+=p.count*tapeCof(l);
   if(step==='OUT'){outByKind[l.kind]+=p.count;exits.push(p);continue;}
   if(['VI','OC_VI','LCM_VI'].includes(step)&&(l.kind==='BD'||l.kind==='POL'||l.kind==='FILM'||l.kind==='REVIEW')){
    // Individual decisions only for actually processed sheets, never for million-sheet backlog.
    for(let j=0;j<p.count;j++){const unit={...p,first:p.first+j,count:1};if(identitySuccess(s.seed,l.id,unit.first,s.yield[l.kind]))enqueue({...unit,step:p.step+1,queued:time},'upstream');else{failures.push(unit);failedByKind[l.kind]++;failure++;}}
   }else enqueue({...p,step:p.step+1,queued:time},'upstream');
   timeline.push({time,stage:step,kind:l.kind,count:p.count,failed:failure});failure=0;
  }if(step==='OUT')for(const p of r.active)timeline.push({time,stage:step,kind:s.lots[p.lot].kind,count:p.count,failed:0});r.active=[];r.end=Infinity;
 }
 function dispatch(){for(const stage of stages){
  const group=resources.filter(r=>r.stage===stage);if(!group.length)continue;const start=roundRobin[stage]||0;
  for(let offset=0;offset<group.length;offset++){const ix=(start+offset)%group.length,r=group[ix];if(r.active.length||s.disabled.includes(r.id)||time>=Math.min(s.duration,(s.workHours?.[r.id]??10)*3600))continue;
   const actual=(stage==='VI'||stage==='OC_VI'||stage==='LCM_VI')&&hasWork('OUT',stage)?'OUT':stage; // Ship checked stock using the same lane and finite operator time.
   if(!hasWork(actual,stage))continue;const batch=take(actual,stage==='BUBBLE'?8:1,stage);r.active=batch;r.actual=actual;r.started=time;const duration=serviceTime(actual,s.lots[batch[0].lot]);r.end=time+duration;const until=Math.min(s.duration,(s.workHours?.[r.id]??10)*3600);if((s.workHours?.[r.id]??10)<10&&r.end>until+1e-8)r.end=s.duration+1;
   const busy=Math.min(duration,Math.min(s.duration,(s.workHours?.[r.id]??10)*3600)-time);resourceBusy[r.id]=(resourceBusy[r.id]||0)+busy;ledger[actual].busySeconds+=busy;
   for(const p of batch)visualServices.push({lotId:s.lots[p.lot].id,first:p.first,count:p.count,stage:actual,start:time,end:r.end,resource:r.id});
   roundRobin[stage]=(ix+1)%group.length;if(stage==='BUBBLE')batches.push({start:time,end:r.end,count:batch.reduce((n,p)=>n+p.count,0),modes:[...new Set(batch.map(p=>s.lots[p.lot].mode))]});
  }
 }}
 while(time<=s.duration){if(++checks>200000)throw Error('事件预算超限，未生成可审计成绩');
  for(const r of resources)if(r.active.length&&r.end<=time+1e-8)finish(r);
  while(arrival<arrivals.length&&arrivals[arrival].at<=time+1e-8){const i=arrivals[arrival++].i,l=s.lots[i];if(l.count)enqueue({lot:i,first:0,count:l.count,step:0,queued:time},l.source);}
  if(time>=s.duration)break;dispatch();maxActive=Math.max(maxActive,resources.reduce((n,r)=>n+r.active.reduce((a,p)=>a+p.count,0),0));
  const next=Math.min(s.duration,arrivals[arrival]?.at??Infinity,...resources.filter(r=>r.active.length).map(r=>r.end));// Service durations are fractional. A strictly later event must progress even when the gap is below an arbitrary epsilon.
  // Only reject actual non-advancement; preserve the deadlock guard and never invent completion.
  if(!(next>time))throw Error('时间调度未前进：当前 '+time+'，下一事件 '+next);
  time=next;
 }
 const remaining:Parcel[]=[];for(const stage of stages)remaining.push(...queues[stage]);for(const r of resources)remaining.push(...r.active);
 for(const p of remaining)ledger[paths[p.lot][p.step]].closing+=p.count;
 for(const r of resources)resourceBusy[r.id]??=0;
 const unreleased=arrivals.slice(arrival).reduce((n,a)=>n+s.lots[a.i].count,0),closing=remaining.reduce((n,p)=>n+p.count,0),successfulOut=Object.values(outByKind).reduce((a,b)=>a+b,0),failurePool=Object.values(failedByKind).reduce((a,b)=>a+b,0);
 const owned=[...remaining,...exits,...failures];for(const a of arrivals.slice(arrival))owned.push({lot:a.i,first:0,count:s.lots[a.i].count,step:0,queued:0});
 let identityConservation=true;for(let i=0;i<s.lots.length;i++){const ranges=owned.filter(p=>p.lot===i).sort((a,b)=>a.first-b.first);let next=0;for(const p of ranges){if(p.first!==next)identityConservation=false;next=p.first+p.count;}if(next!==s.lots[i].count)identityConservation=false;}
 for(const stage of stages){const r=ledger[stage];if(r.opening+r.external+r.forecast+r.upstream-r.processed!==r.closing)throw Error('岗位守恒失败：'+stage);}
 const conservation=total===closing+unreleased+successfulOut+failurePool;if(!conservation||!identityConservation)throw Error('产品身份或总量守恒失败');
 const visualTerminal:VisualTerminal[]=[];for(const [parcels,outcome] of [[exits,'success'],[failures,'failure'],[remaining,'wip']] as const)for(const p of parcels)visualTerminal.push({lotId:s.lots[p.lot].id,first:p.first,count:p.count,outcome,stage:paths[p.lot][p.step]});
 return {ledger,successfulOut,failurePool,input:s.lots.filter(l=>l.source==='external').reduce((n,l)=>n+l.count,0),forecastInput:s.lots.filter(l=>l.source==='forecast').reduce((n,l)=>n+l.count,0),opening:s.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0),closing,unreleased,total,outByKind,failedByKind,timeline,batches,conservation,identityConservation,resourceBusy,maxActive,checks,visual:{services:visualServices,terminal:visualTerminal}};
}
export function outByInspection(s:Scenario,sim:Simulation){
 const lanes:Record<InspectionStage,{opening:number;external:number;closing:number;completed:number;busySeconds:number}>={
  VI:{opening:0,external:0,closing:0,completed:0,busySeconds:0},
  OC_VI:{opening:0,external:0,closing:0,completed:0,busySeconds:0},
  LCM_VI:{opening:0,external:0,closing:0,completed:0,busySeconds:0}
 };
 const lots=new Map(s.lots.map(l=>[l.id,l]));
 for(const lot of s.lots)if(lot.stage==='OUT'&&lot.source!=='forecast')lanes[inspectionStage(lot)][lot.source]+=lot.count;
 for(const terminal of sim.visual.terminal)if(terminal.stage==='OUT')lanes[inspectionStage(lots.get(terminal.lotId)!)][terminal.outcome==='success'?'completed':'closing']+=terminal.count;
 for(const service of sim.visual.services)if(service.stage==='OUT')lanes[inspectionStage(lots.get(service.lotId)!)].busySeconds+=Math.max(0,Math.min(service.end,s.duration,(s.workHours?.[service.resource]??10)*3600)-service.start);
 return lanes;
}
export interface BattleResult {schemaVersion:1;scenarioId:string;scenarioSeed:string;createdAt:string;synthetic:boolean;scenarioSnapshot:Scenario;formation:Formation;simulation:Simulation;scoreBreakdown:{target:number;staff:number;out:number;total:number;weights:Scenario['weights']};benchmarkOut:number;potential:Record<Step,number>;redundant:string[];deployed:number;notes:string[];}
/** Fixed scenario basis: potential does not depend on the player's staffing or blocked upstream. */
export function evaluate(s:Scenario,f:Formation):BattleResult {
 const simulation=simulate(s,f),potential=Object.fromEntries(stages.map(stage=>[stage,0])) as Record<Step,number>;
 for(const lot of s.lots)for(const stage of route(lot))potential[stage]+=lot.count;
 const sufficient:Formation={};for(const stage of stages)if(stage!=='BUBBLE'&&stage!=='OUT')sufficient[stage]=Array.from({length:stageSlots(stage,s)},(_,i)=>i+1);
 const benchmark=simulate({...s,workHours:undefined},sufficient),work=clone(f),redundant:string[]=[];
 const validStages=stages.filter(stage=>s.targets[stage]!==undefined||(!s.confirmedTargetsOnly&&potential[stage]>0));let hit=0,importance=0;
 for(const stage of validStages){const target=s.targets[stage]||0,excess=Math.max(0,simulation.ledger[stage].closing-target),weight=s.importance?.[stage]||1;importance+=weight;hit+=weight*Math.max(0,1-excess/Math.max(1,potential[stage]-target));}
 for(const stage of stages){for(const slot of [...(work[stage]||[])].sort((a,b)=>b-a)){
  if((work[stage]?.length||0)<=(s.minimum[stage]||0))break;
  const candidate=clone(work);candidate[stage]=candidate[stage]!.filter(n=>n!==slot);const counter=simulate(s,candidate);
  if(stages.every(key=>counter.ledger[key].closing<=Math.max(simulation.ledger[key].closing,s.targets[key]||0))&&counter.successfulOut>=simulation.successfulOut){work[stage]=candidate[stage];redundant.push(stage+'-'+slot);}
 }}
 const deployed=Object.values(f).reduce((n,a)=>n+(a?.length||0),0),target=importance?s.weights.target*hit/importance:s.weights.target,staff=deployed?s.weights.staff*(deployed-redundant.length)/deployed:0,out=benchmark.successfulOut?s.weights.out*Math.min(1,simulation.successfulOut/benchmark.successfulOut):s.weights.out;
 return {schemaVersion:1,scenarioId:s.id,scenarioSeed:s.seed,createdAt:new Date().toISOString(),synthetic:s.synthetic,scenarioSnapshot:clone(s),formation:clone(f),simulation,scoreBreakdown:{target,staff,out,total:Math.round((target+staff+out)*10)/10,weights:clone(s.weights)},benchmarkOut:benchmark.successfulOut,potential,redundant,deployed,notes:['候选权重，未用于员工绩效考核','基准为同情景、同种子、满合法设备槽的可行调度；并非数学最优解','无可完成OUT基准时，产出项按满分；其他两项照常计分','本轮失败进入独立返修池，本班不自动循环']};
}
