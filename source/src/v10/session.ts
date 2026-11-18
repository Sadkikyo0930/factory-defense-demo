import {Scenario,Formation,Step,Kind,clone,freeze,demoScenario,stageSlots,validate,Lot} from './spec';
import {evaluate,BattleResult} from './engine';
import {WipSnapshot,splitPOL,validateSnapshot} from '../report';
export class BattleSession {
 private data:Scenario=freeze(demoScenario());
 private army:Formation={};
 private state:'setup'|'battle'|'result'='setup';
 private score?:BattleResult;
 get phase(){return this.state;}
 get scenario(){return this.data;}
 get formation(){return freeze(clone(this.army));}
 get result(){return this.score;}
 private editable(){if(this.state!=='setup')throw Error('开战后阵型、设备、参数与导入已锁定；请先返回同情景重布阵');}
 setScenario(s:Scenario){this.editable();validate(s,{});this.data=freeze(clone(s));this.army={};this.score=undefined;}
 updateScenario(s:Scenario){this.editable();validate(s,this.army);this.data=freeze(clone(s));}
 setSlot(stage:Step,slot:number,occupied:boolean){this.editable();if(stage==='BUBBLE'||stage==='OUT')throw Error('此设备不新增员工');if(slot<1||slot>stageSlots(stage,this.data))throw Error('部署位不合法');const next=clone(this.army),list=next[stage]||[];next[stage]=occupied?[...new Set([...list,slot])]:list.filter(n=>n!==slot);validate(this.data,next);this.army=next;}
 clear(){this.editable();this.army={};}
 begin(){this.editable();validate(this.data,this.army);if(this.data.conditionalPOLConfirmed===false)throw Error('POL型号/条件切割口径尚未确认，请在任务设置确认后开战');for(const [stage,min] of Object.entries(this.data.minimum))if((this.army[stage as Step]?.length||0)<min!)throw Error('未达到本情景安全最低配备');this.state='battle';try{this.score=freeze(evaluate(this.data,freeze(clone(this.army))));return this.score;}catch(e){this.state='setup';throw e;}}
 finish(){if(this.state!=='battle')throw Error('当前没有进行中的战斗');this.state='result';return this.score!;}
 retry(){if(this.state!=='result')throw Error('结算后才能重布阵');this.state='setup';this.score=undefined;}
 /** Same mapper/snapshot as V071. Import is transactional and never auto-substitutes a demo. */
 applyInitialWip(snapshot:WipSnapshot){this.editable();validateSnapshot(snapshot);const c=snapshot.counts,p=splitPOL(c.POL_TOTAL,snapshot.peelRatio),lots:Lot[]=[];
  const add=(id:string,kind:Kind,stage:Step,count:number)=>{if(count)lots.push({id:snapshot.fingerprint+':'+id,kind,mode:'TV',stage,count,source:'opening',at:0,cof:2,black:kind==='POL'});};
  add('remove','BD','REMOVE',c.REMOVE);add('tape','BD','TAPE',c.TAPE);add('bd','BD','BD',c.BD);add('uv','BD','UV',c.UV);add('peel','POL','PEEL',p.peel);add('pol','POL','POL',p.pol);add('film','FILM','FILM',c.FILM);add('pi','UNKNOWN','PI',c.PI);add('vi','UNKNOWN','VI',c.VI);add('out','UNKNOWN','OUT',c.OUT);add('black','POL','BLACK',c.BLACK);
  const next=demoScenario();next.id='report:'+snapshot.fingerprint;next.name=snapshot.date+' 日报快照 · 规则待现场验收';next.synthetic=false;next.lots=lots;next.rawFA=c.FA;next.sourceNote='已确认初始WIP快照；没有导入日报IN。新增IN默认0，需在任务设置中确认独立投入口径；后段未分型不反推类型。产能/成功率仍为演练参数，非可审计生产承诺。';
  // Store the source snapshot, but deliberately block starting until the user confirms no extra IN / configures it.
  validate(next,{});next.inConfirmed=false;next.conditionalPOLConfirmed=c.POL_TOTAL===0;this.data=freeze(next);this.army={};this.score=undefined;
 }
}
