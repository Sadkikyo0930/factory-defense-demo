import {Scenario,Formation,Step,Kind,clone,freeze,demoScenario,stageSlots,validate,Lot} from './spec';
import {evaluate,BattleResult} from './engine';
import {WipSnapshot,splitPOL,validateSnapshot} from '../report';
import {buildTargetBaseline,loadTargetBaseline,targetStorageKey,TargetBaseline,TargetInput} from './targetBaseline';
export class BattleSession {
 private data:Scenario=freeze(demoScenario());
 private army:Formation={};
 private bubbleOperator=false;
 private state:'setup'|'battle'|'result'='setup';
 private score?:BattleResult;
 private baseline?:TargetBaseline;
 private baselineProblem='';
 private manualTargets?:Scenario['targets'];
 constructor(private readonly targetStorage?:Pick<Storage,'getItem'|'setItem'>){
  try{if(targetStorage)this.baseline=loadTargetBaseline(targetStorage);}catch{this.baselineProblem='本机目标基准无法读取，请重新初始化。';}
  if(this.baseline)this.data=freeze({...demoScenario(),targets:clone(this.baseline.tvTargets),confirmedTargetsOnly:true});
 }
 get targetBaseline(){return this.baseline&&freeze(clone(this.baseline));}
 get targetBaselineProblem(){return this.baselineProblem;}
 setProductionScenario(s:Scenario,baseline?:TargetBaseline,replace=false,keepFormation=false){
  this.editable();validate(s,keepFormation?this.army:{});
  if(baseline){
   if(this.baseline&&!replace)throw Error('目标已有基准，需单独确认重新初始化');
   if(!this.targetStorage)throw Error('本机存储不可用，目标和任务未更新');
   this.targetStorage.setItem(targetStorageKey,JSON.stringify(baseline));this.baseline=baseline;this.baselineProblem='';
  }
  this.data=freeze(clone(s));if(!keepFormation)this.clear();this.score=undefined;
 }
 get phase(){return this.state;}
 get scenario(){return this.data;}
 get formation(){return freeze(clone(this.army));}
 get bubbleOperatorDeployed(){return this.bubbleOperator;}
 get result(){return this.score;}
 private editable(){if(this.state!=='setup')throw Error('开战后阵型、设备、参数与导入已锁定；请先返回同情景重布阵');}
 setScenario(s:Scenario){this.editable();validate(s,{});this.data=freeze(clone(s));this.clear();this.score=undefined;}
 updateScenario(s:Scenario){this.editable();validate(s,this.army);if(JSON.stringify(s.targets)!==JSON.stringify(this.data.targets))this.manualTargets=clone(s.targets);this.data=freeze(clone(s));}
 setSlot(stage:Step,slot:number,occupied:boolean){this.editable();if(stage==='BUBBLE'||stage==='OUT')throw Error('此设备不新增员工');if(slot<1||slot>stageSlots(stage,this.data))throw Error('部署位不合法');const next=clone(this.army),list=next[stage]||[];next[stage]=occupied?[...new Set([...list,slot])]:list.filter(n=>n!==slot);validate(this.data,next);this.army=next;}
 setBubbleOperator(deployed:boolean){this.editable();this.bubbleOperator=deployed;}
 clear(){this.editable();this.army={};this.bubbleOperator=false;}
 begin(){this.editable();if(this.data.productionBlock)throw Error(this.data.productionBlock);validate(this.data,this.army);if(this.data.conditionalPOLConfirmed===false)throw Error('POL型号/条件切割口径尚未确认，请在任务设置确认后开战');for(const [stage,min] of Object.entries(this.data.minimum))if((this.army[stage as Step]?.length||0)<min!)throw Error('未达到本情景安全最低配备');this.state='battle';try{this.score=freeze(evaluate(this.data,freeze(clone(this.army))));return this.score;}catch(e){this.state='setup';throw e;}}
 finish(){if(this.state!=='battle')throw Error('当前没有进行中的战斗');this.state='result';return this.score!;}
 cancelFailedPresentation(){if(this.state==='battle'){this.state='setup';this.score=undefined;}}
 retry(){if(this.state!=='result')throw Error('结算后才能重布阵');this.state='setup';this.score=undefined;}
 /** Same mapper/snapshot as V071. Import is transactional and never auto-substitutes a demo. */
 applyInitialWip(snapshot:WipSnapshot,targets?:{input:TargetInput;peelTarget?:number;replace:boolean}){this.editable();validateSnapshot(snapshot);const c=snapshot.counts,p=splitPOL(c.POL_TOTAL,snapshot.peelRatio),lots:Lot[]=[];
  if(targets&&this.baseline&&!targets.replace)throw Error('目标已有基准，需单独确认重新初始化');
  const candidate=targets?buildTargetBaseline(targets.input,snapshot.date,targets.peelTarget):this.baseline;
  const add=(id:string,kind:Kind,stage:Step,count:number)=>{if(count)lots.push({id:snapshot.fingerprint+':'+id,kind,mode:'TV',stage,count,source:'opening',at:0,cof:2,black:kind==='POL'});};
  add('remove','BD','REMOVE',c.REMOVE);add('tape','BD','TAPE',c.TAPE);add('bd','BD','BD',c.BD);add('uv','BD','UV',c.UV);add('peel','POL','PEEL',p.peel);add('pol','POL','POL',p.pol);add('film','FILM','FILM',c.FILM);add('pi','UNKNOWN','PI',c.PI);add('vi','UNKNOWN','VI',c.VI);add('out','UNKNOWN','OUT',c.OUT);add('black','POL','BLACK',c.BLACK);
  const next=demoScenario();next.mode='TV';next.shift=this.data.shift??'DAY';next.date=snapshot.date.replace(/-/g,'');next.configurationVersion='rw-tv-v1';next.id=['TV',next.shift,next.date,next.configurationVersion,snapshot.fingerprint].join(':');next.name='TV '+(next.shift==='DAY'?'白班':'夜班')+' · '+snapshot.date+' 日报快照 · 待确认';next.synthetic=false;next.lots=lots;next.rawFA=c.FA;next.sourceNote='已确认初始WIP快照；没有导入日报IN。新增IN默认0，需在任务设置中确认独立投入口径；后段未分型不反推类型。产能/成功率仍为演练参数，非可审计生产承诺。';
  // Store the source snapshot, but deliberately block starting until the user confirms no extra IN / configures it.
  next.targets=clone(candidate?.tvTargets??this.manualTargets??(this.data.synthetic?{}:this.data.targets));next.confirmedTargetsOnly=true;
  validate(next,{});next.inConfirmed=false;next.conditionalPOLConfirmed=c.POL_TOTAL===0;
  if(targets){if(!this.targetStorage)throw Error('本机存储不可用，目标和 WIP 未更新');this.targetStorage.setItem(targetStorageKey,JSON.stringify(candidate));this.baseline=candidate;this.baselineProblem='';}
  this.data=freeze(next);this.clear();this.score=undefined;
 }
}
