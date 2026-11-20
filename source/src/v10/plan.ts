import {demoScenario, type Kind,type Lot,type Mode,type Scenario,type Step} from './spec';
export type Shift='DAY'|'NIGHT';
type NgKind=Exclude<Kind,'UNKNOWN'>;
export const ngKinds=['POL','BD','REVIEW','FILM'] as const;
export interface PlanRecord {date:string;rawModel:string;day:number;night:number;source:string}
export interface NormalizedPlan extends PlanRecord {model:string;size?:number;bu?:Mode;valid:boolean;reason?:string}
export interface NgRateTable {version:string;percent:Record<number,readonly [number,number,number,number]>}
export const ngRates:NgRateTable={version:'ng-size-v1',percent:{
 236:[.23,.31,1.23,.01],185:[.22,.50,2.70,.03],215:[.18,.39,1.62,.02],
 238:[.33,.35,2.68,.04],245:[.26,.70,2.53,.03],240:[1.10,1.43,2.53,.09],
 250:[.27,.48,1.96,.03],270:[.37,.69,3.68,.02],282:[.80,1.42,6.09,.05],
 315:[.42,.86,5.70,.05],320:[.60,.56,3.14,.03],340:[.43,.91,3.14,.02],
 400:[.17,.30,1.65,.01],430:[.32,.53,3.47,.02],550:[.61,.88,4.66,.02]
}};
export function validPlanDate(date:string){if(!/^\d{8}$/.test(date))return false;const iso=date.replace(/^(....)(..)(..)$/,'$1-$2-$3'),d=new Date(iso+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===iso;}
export function normalizePlan(row:PlanRecord):NormalizedPlan{
 const model=row.rawModel.normalize('NFKC').trim().toUpperCase().split(/\s*(?:→|⇒|➜|➔|⟶|⟹|[-=]+>)\s*/u)[0].trim();
 const rawSize=model.slice(model.startsWith('BAB')?3:2,model.startsWith('BAB')?6:5);
 const size=/^\d{3}$/.test(rawSize)?Number(rawSize):undefined;
 const bu=size!==undefined&&size>120&&size<600?(size===315||size>=320?'TV':'MNT'):undefined;
 const reason=!validPlanDate(row.date)?'日期无效':!Number.isSafeInteger(row.day)||!Number.isSafeInteger(row.night)||row.day<0||row.night<0?'计划量无效':
 !/^[A-Z0-9_-]{8,80}$/.test(model)||size===undefined?'无效型号或尺寸':model.charAt(model.length-4)==='D'?'新产品 D 标记':!bu?'尺寸不纳入本游戏':undefined;
 return {...row,model,size,bu,valid:!reason,reason};
}
export interface ForecastBatch {kind:NgKind;model:string;count:number;expected:number}
export function forecastPlan(rows:PlanRecord[],date:string,bu:Mode,shift:Shift,table=ngRates){
 if(!validPlanDate(date))throw Error('计划日期无效');
 const models=new Map<string,{size:number;quantity:number}>();
 const rejected:NormalizedPlan[]=[];let plan=0;
 for(const raw of rows){
  if(raw.date!==date)continue;const r=normalizePlan(raw);
  if(!r.valid){rejected.push(r);continue;}if(r.bu!==bu)continue;
  const quantity=shift==='DAY'?r.day:r.night;if(!quantity)continue;
  if(!table.percent[r.size!])throw Error('未配置尺寸 NG 率：'+r.size);
  const total=(models.get(r.model)?.quantity??0)+quantity;plan+=quantity;
  if(!Number.isSafeInteger(plan))throw Error('计划量超出可计算范围');
  models.set(r.model,{size:r.size!,quantity:total});
 }
 const batches:ForecastBatch[]=[],diagnostic={} as Record<NgKind,{expected:number;count:number;roundingDelta:number}>;
 for(const [i,kind] of ngKinds.entries()){
  const parts=[...models].map(([model,m])=>({model,kind,expected:m.quantity*(table.percent[m.size][i]/100)}));
  const expected=parts.reduce((sum,p)=>sum+p.expected,0),count=Math.round(expected);
  diagnostic[kind]={expected,count,roundingDelta:count-expected};
  // Allocate the rounded total to model routes using largest remainders, then stable model order.
  const order=parts.map(p=>({...p,count:Math.floor(p.expected)})).sort((a,b)=>(b.expected-b.count)-(a.expected-a.count)||(a.model<b.model?-1:1));
  const extra=count-order.reduce((sum,p)=>sum+p.count,0);
  order.forEach((p,j)=>{if(j<extra)p.count++;if(p.count)batches.push(p);});
 }
 return {plan,version:table.version,batches,diagnostic,rejected};
}
export type ArrivalStrategy=(batch:ForecastBatch,index:number)=>number;
export const demoArrival:ArrivalStrategy=(_b,i)=>(i%5+1)*3600;
export interface ModelRule {panel?:'OC'|'LCM';cut?:boolean;polBlack?:boolean;filmBlack?:boolean}
export function forecastLots(input:ReturnType<typeof forecastPlan>,mode:Mode,rules:Record<string,ModelRule>,arrival:ArrivalStrategy,productionRouting=false):Lot[]{
 return input.batches.map((b,i)=>{
  const rule=rules[b.model];
  if(!rule||(mode==='MNT'&&!rule.panel&&(!productionRouting||b.kind==='REVIEW')))throw Error('型号维修路径未确认：'+b.model);
  const panel=productionRouting&&mode==='MNT'&&b.kind!=='REVIEW'?'OC':rule.panel;
  const stage:Step=b.kind==='BD'?'REMOVE':b.kind==='POL'?'PEEL':b.kind==='FILM'?'FILM':mode==='TV'?'VI':panel==='OC'?'OC_VI':'LCM_VI';
  return {id:'forecast:'+b.kind+':'+i,mode,kind:b.kind,count:b.count,source:'forecast',stage,at:arrival(b,i),cof:2,mntPanel:panel,cut:b.kind==='POL'&&rule.cut===true,black:b.kind==='POL'?rule.polBlack===true:b.kind==='FILM'&&rule.filmBlack===true};
 });
}
const demoModels={TV:['AB315AAA1','AB430AAA2'],MNT:['AB238AAA1','BAB270AAA2']} as const;
export function shiftScenario(mode:Mode,shift:Shift,date:string):Scenario{
 const models=demoModels[mode],records=models.map((rawModel,i)=>({date,rawModel,day:3600+i*1700,night:2400+i*900,source:'SYNTHETIC'}));
 const forecast=forecastPlan(records,date,mode,shift),s=demoScenario();
 const rules:Record<string,ModelRule>={[models[0]]:{panel:'OC',cut:mode==='MNT',polBlack:true},[models[1]]:{panel:'LCM',filmBlack:mode==='MNT'}};
 s.mode=mode;s.shift=shift;s.date=date;s.configurationVersion=mode==='MNT'?'bu-shift-demo-v4':'bu-shift-demo-v1';s.id=[mode,shift,date,s.configurationVersion].join(':');s.seed=s.id;
 s.name=mode+' '+(shift==='DAY'?'白班':'夜班')+' · '+date+' · SYNTHETIC';
 s.sourceNote='SYNTHETIC 演练；未导入真实计划或快照。预测分类型，可能重叠；到料时刻为演练假设。单 BU 场景共享脱泡只有一台，未计另一 BU 占用。MNT 未确认的工位、产能和型号条件采用演练参数。';
 s.cutMNTConfirmed=mode==='MNT';s.rawFA=0;
 s.lots=[{id:'demo-opening',mode,kind:'BD',stage:'BD',count:12,source:'opening',at:0,cof:2,mntPanel:mode==='MNT'?'OC':undefined},...forecastLots(forecast,mode,rules,demoArrival)];
 s.targets=mode==='MNT'?{BD:5,PI:5,OC_VI:8,LCM_VI:8,OUT:5}:{BD:5,PI:5,VI:10,OUT:5};
 s.forecast={plan:forecast.plan,version:forecast.version,amounts:Object.fromEntries(ngKinds.map(k=>[k,forecast.diagnostic[k].count])) as NonNullable<Scenario['forecast']>['amounts']};
 return s;
}
