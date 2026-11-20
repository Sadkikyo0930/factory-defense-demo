import {Scenario,Formation,Step,Kind,clone,freeze,demoScenario,stageSlots,validate,Lot} from './spec';
import {evaluate,BattleResult} from './engine';
import {WipSnapshot,splitPOL,validateSnapshot} from '../report';

export class BattleSession {
 private data:Scenario=freeze(demoScenario());
 private army:Formation={};
 private bubbleOperator=false;
 private state:'setup'|'battle'|'result'='setup';
 private score?:BattleResult;
 private manualTargets?:Scenario['targets'];
 setProductionScenario(s:Scenario,keepFormation=false){
  this.editable();validate(s,keepFormation?this.army:{},false);
  this.data=freeze(clone(s));if(!keepFormation)this.clear();this.score=undefined;
 }
 get phase(){return this.state;}
 get scenario(){return this.data;}
 get formation(){return freeze(clone(this.army));}
 get bubbleOperatorDeployed(){return this.bubbleOperator;}
 get result(){return this.score;}
 private editable(){if(this.state!=='setup')throw Error('开战后阵型、设备、参数与导入已锁定；请先返回同情景重布阵');}
 setScenario(s:Scenario){this.editable();validate(s,{});this.data=freeze(clone(s));this.clear();this.score=undefined;}
 updateScenario(s:Scenario){this.editable();validate(s,this.army,false);if(JSON.stringify(s.targets)!==JSON.stringify(this.data.targets))this.manualTargets=clone(s.targets);this.data=freeze(clone(s));}
 confirmProductionConditions(input:{confirmIn:boolean;cut?:boolean;black?:boolean}){
  this.editable();const next=clone(this.data);
  if(input.confirmIn)next.inConfirmed=true;
  if(next.conditionalPOLConfirmed===false){
   const lots=next.lots.filter(l=>l.kind==='POL'&&['PEEL','POL','BUBBLE'].includes(l.stage)&&l.count>0);
   for(const lot of lots){
    if(lot.cut===undefined){if(input.cut===undefined)throw Error('请选择未分型 POL 的切割条件');lot.cut=input.cut;}
    if(lot.black===undefined){if(input.black===undefined)throw Error('请选择未分型 POL 的黑胶条件');lot.black=input.black;}
   }
   next.conditionalPOLConfirmed=true;
  }
  this.updateScenario(next);
 }
 setSlot(stage:Step,slot:number,occupied:boolean){this.editable();if(stage==='BUBBLE'||stage==='OUT')throw Error('此设备不新增员工');if(slot<1||slot>stageSlots(stage,this.data))throw Error('部署位不合法');const next=clone(this.army),list=next[stage]||[];next[stage]=occupied?[...new Set([...list,slot])]:list.filter(n=>n!==slot);validate(this.data,next,false);this.army=next;}
 setBubbleOperator(deployed:boolean){this.editable();this.bubbleOperator=deployed;}
 clear(){this.editable();this.army={};this.bubbleOperator=false;}
 begin(){this.editable();if(this.data.productionBlock)throw Error('请前往生产任务数据中心：'+this.data.productionBlock);if(!this.data.inConfirmed)throw Error('新增 IN 口径尚未确认，请前往生产任务数据中心');if(this.data.conditionalPOLConfirmed===false)throw Error('POL 型号的切割或黑胶条件尚未确认，请前往生产任务数据中心');validate(this.data,this.army);for(const [stage,min] of Object.entries(this.data.minimum))if((this.army[stage as Step]?.length||0)<min!)throw Error('未达到本情景安全最低配备');this.state='battle';try{this.score=freeze(evaluate(this.data,freeze(clone(this.army))));return this.score;}catch(e){this.state='setup';throw e;}}
 finish(){if(this.state!=='battle')throw Error('当前没有进行中的战斗');this.state='result';return this.score!;}
 cancelFailedPresentation(){if(this.state==='battle'){this.state='setup';this.score=undefined;}}
 retry(){if(this.state!=='result')throw Error('结算后才能重布阵');this.state='setup';this.score=undefined;}
 /** Same mapper/snapshot as V071. Import is transactional and never auto-substitutes a demo. */
 applyInitialWip(snapshot:WipSnapshot){this.editable();validateSnapshot(snapshot);const c=snapshot.counts,p=splitPOL(c.POL_TOTAL,snapshot.peelRatio),lots:Lot[]=[];
  const add=(id:string,kind:Kind,stage:Step,count:number)=>{if(count)lots.push({id:snapshot.fingerprint+':'+id,kind,mode:'TV',stage,count,source:'opening',at:0,cof:2,black:stage==='BLACK'?true:undefined});};
  add('remove','BD','REMOVE',c.REMOVE);add('tape','BD','TAPE',c.TAPE);add('bd','BD','BD',c.BD);add('uv','BD','UV',c.UV);add('peel','POL','PEEL',p.peel);add('pol','POL','POL',p.pol);add('film','FILM','FILM',c.FILM);add('pi','UNKNOWN','PI',c.PI);add('vi','UNKNOWN','VI',c.VI);add('out','UNKNOWN','OUT',c.OUT);add('black','POL','BLACK',c.BLACK);
  const next=demoScenario();next.mode='TV';next.shift=this.data.shift??'DAY';next.date=snapshot.date.replace(/-/g,'');next.configurationVersion='rw-tv-v1';next.id=['TV',next.shift,next.date,next.configurationVersion,snapshot.fingerprint].join(':');next.name='TV '+(next.shift==='DAY'?'白班':'夜班')+' · '+snapshot.date+' 日报快照 · 待确认';next.synthetic=false;next.lots=lots;next.rawFA=c.FA;next.sourceNote='已确认初始WIP快照；没有导入日报IN。新增IN默认0，需在任务设置中确认独立投入口径；后段未分型不反推类型。产能/成功率仍为演练参数，非可审计生产承诺。';
  // Store the source snapshot, but deliberately block starting until the user confirms no extra IN / configures it.
  next.targets=clone(this.manualTargets??(this.data.synthetic?{}:this.data.targets));next.confirmedTargetsOnly=true;
  validate(next,{});next.inConfirmed=false;next.conditionalPOLConfirmed=c.POL_TOTAL===0;
  this.data=freeze(next);this.clear();this.score=undefined;
 }
}
