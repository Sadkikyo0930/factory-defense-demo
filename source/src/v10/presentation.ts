import {Scenario,Step,Kind,Lot,route} from './spec';
import {Simulation,VisualService} from './engine';
export type Outcome='success'|'failure'|'wip';
export interface Beat {stage:Step;start:number;end:number;fraction:number;resource:string;realStart:number;realEnd:number;}
export interface Squad {id:string;lotId:string;ordinal:number;kind:Kind;initialStage:Step;outcome:Outcome;finalStage:Step;spawn:number;arrival:number;finish:number;lane:number;column:number;beats:Beat[];}
export interface SquadState {state:'hidden'|'advance'|'idle'|'attack'|'break'|'defeated'|'escape'|'waiting';stage:Step;hp:number;beat:number;impact:boolean;}
/** One real representative per source/entry-stage group. Never merge unlike WIP phases into a synthetic HP bar. */
export function projectBattle(s:Scenario,simulation:Simulation,limit=12):Squad[]{
 const journal=simulation.visual;if(!journal)throw Error('缺少只读动画记录，不能伪造工序进度');
 const selected:{lot:Lot;ordinal:number;outcome:Outcome;finalStage:Step}[]=[],seen=new Set<string>();
 for(const lot of s.lots.filter(l=>l.count)){const key=lot.kind+'/'+lot.mode+'/'+lot.stage;if(seen.has(key))continue;seen.add(key);const t=journal.terminal.find(t=>t.lotId===lot.id);if(t)selected.push({lot,ordinal:t.first,outcome:t.outcome,finalStage:t.stage});}
 // Show a real failed member as well when the first selected member of that type succeeded.
 for(const kind of ['BD','POL','FILM','REVIEW'] as Kind[]){if(selected.some(v=>v.lot.kind===kind&&v.outcome==='failure'))continue;const t=journal.terminal.find(t=>t.outcome==='failure'&&s.lots.some(l=>l.id===t.lotId&&l.kind===kind));const lot=s.lots.find(l=>l.id===t?.lotId);if(t&&lot)selected.push({lot,ordinal:t.first,outcome:t.outcome,finalStage:t.stage});}
 return selected.slice(0,Math.max(0,Math.min(12,limit))).map((v,i)=>{
  const services=journal.services.filter(e=>e.lotId===v.lot.id&&e.first<=v.ordinal&&v.ordinal<e.first+e.count).sort((a,b)=>a.start-b.start);
  const wave=Math.floor(i/4);
  const spawn=[.05,1.14,2.56][wave]+(i%4)*.12;
  const arrival=spawn+.43;
  const attackStart=arrival+.04;
  const finish=[3.72,4.05,4.43][wave]+(i%4)*.035;
  const weight=services.map(e=>Math.max(1,Math.sqrt(e.end-e.start))),sum=weight.reduce((a,b)=>a+b,0);let cursor=attackStart;
  const beats=services.map((e,index)=>{const span=(finish-attackStart)*weight[index]/Math.max(1,sum),start=cursor;cursor+=span;return {stage:e.stage,start,end:cursor,fraction:Math.min(1,Math.max(0,(s.duration-e.start)/(e.end-e.start))),resource:e.resource,realStart:e.start,realEnd:e.end};});
  return {id:v.lot.id+'#'+v.ordinal,lotId:v.lot.id,ordinal:v.ordinal,kind:v.lot.kind,initialStage:v.lot.stage,outcome:v.outcome,finalStage:v.finalStage,spawn,arrival,finish,lane:i%4,column:wave,beats};
 });
}
export function squadState(s:Squad,time:number):SquadState {
 const base={stage:s.initialStage,hp:1,beat:-1,impact:false};if(time<s.spawn)return {...base,state:'hidden'};
 if(time<s.arrival)return {...base,state:'advance'};
 for(let i=0;i<s.beats.length;i++){const b=s.beats[i];if(time<b.start)return {...base,stage:b.stage,state:'idle',beat:i};
  if(time<b.end){const p=(time-b.start)/(b.end-b.start),breakAt=b.fraction===1?.82:1;return {state:p>=breakAt?'break':'attack',stage:b.stage,hp:Math.max(0,1-Math.min(1,p/.82)*b.fraction),beat:i,impact:p>.22&&p<.82};}
 }
 const last=s.beats[s.beats.length-1],heldHP=last?.stage===s.finalStage?1-last.fraction:1;
 if(time<s.finish+.06)return {...base,state:'waiting',stage:s.finalStage,hp:heldHP};
 return {...base,stage:s.finalStage,state:s.outcome==='success'?'defeated':s.outcome==='failure'?'escape':'waiting',hp:s.outcome==='success'?0:heldHP};
}
export function hasOperator(service:Pick<VisualService,'stage'|'resource'>,s:Scenario,formation:Partial<Record<Step,number[]>>){if(s.disabled.includes(service.resource))return false;if(service.stage==='BUBBLE')return service.resource==='BUBBLE-1';const stage=service.stage==='OUT'?'VI':service.stage;return (formation[stage]||[]).some(n=>service.resource===stage+'-'+n);}
