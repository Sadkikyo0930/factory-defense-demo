import {count,normalize,splitPOL} from '../report';
import {forecastPlan,forecastLots,validPlanDate,normalizePlan,demoArrival,ngKinds,ngRates, type ModelRule,type PlanRecord,type Shift} from './plan';
import {clone,validate, type Mode,type Step,type Lot,type Kind,type Scenario} from './spec';
import {buildTargetBaseline,type TargetBaseline,type TargetInput} from './targetBaseline';
type Values=Partial<Record<Step,number>>;
export interface RwSnapshot {date:string; opening:Record<Mode,Values>; target?:TargetInput}
export interface RwPlan {schema:'rw-mdl-plan';version:1;records:PlanRecord[];rules:Record<string,ModelRule>}
export interface ProductionImport {kind:'combined'|'report'|'plan';rw?:RwSnapshot;plan?:RwPlan}
function objectValue(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('生产任务 JSON 必须是对象');
 return value as Record<string,unknown>;
}
export function readProductionImport(raw:unknown):ProductionImport{
 const data=objectValue(raw);
 const type=data.schema??data.kind??data.type;
 if(type==='rw-combined'||['productionPlan','plan','report','dailyReport'].some(key=>Object.prototype.hasOwnProperty.call(data,key))){
  if(data.version!==undefined&&data.version!==1&&data.version!==2)throw Error('不支持此合并 JSON 版本');
  const report=data.report??data.dailyReport??(Array.isArray(data.rows)?data:undefined);
  if(!report)throw Error('合并 JSON 缺少 RW 日报');
  const rw=readRwSnapshot(report);
  const plan=readRwPlan(Object.prototype.hasOwnProperty.call(data,'productionPlan')?data.productionPlan:data.plan);
  const date=rw.date.replace(/-/g,'');
  if(!plan.records.some(r=>r.date===date))throw Error('合并 JSON 中生产计划没有日报当天的记录');
  if(data.date!==undefined&&(typeof data.date!=='string'||data.date.replace(/-/g,'')!==date))throw Error('合并 JSON 的任务日期与日报日期不一致');
  return {kind:'combined',rw,plan};
 }
 if(type==='rw-mdl-plan')return {kind:'plan',plan:readRwPlan(data)};
 return {kind:'report',rw:readRwSnapshot(data)};
}
const aliases:Record<string,Step|'TOTAL'>={祛除:'REMOVE',去除:'REMOVE',贴胶:'TAPE',BD:'BD',UV:'UV',撕POL:'PEEL',机器撕POL:'PEEL',贴POL:'POL',POL:'TOTAL',脱泡:'BUBBLE',共享脱POL:'BUBBLE',切割:'CUT',黑胶:'BLACK',覆膜:'FILM',贴膜:'FILM',修膜:'FILM',PI:'PI',VI:'VI',OCVI:'OC_VI',LCMVI:'LCM_VI',OUT:'OUT'};
function position(name:string,group:unknown){
 const n=normalize(name),pref=/^(TV|MNT)/.exec(n)?.[1] as Mode|undefined,key=pref?n.slice(pref.length):n;
 if(/^(FA|DISA)/.test(key))return;
 if(pref&&group&&group!=='SHARED'&&group!==pref)throw Error('日报工区冲突：'+name);
 const mode=pref??(group==='TV'||group==='MNT'?group:undefined),stage=Object.prototype.hasOwnProperty.call(aliases,key)?aliases[key]:undefined;
 if(!stage||(!mode&&stage!=='BLACK'))return;
 if(mode&&(stage==='VI'&&mode==='MNT'||mode==='TV'&&['LCM_VI','OC_VI','CUT'].includes(stage)))return;
 return {mode,stage};
}
function collect(rows:unknown[],field:'today'|'target',ratio:number){
 const result:Record<Mode,Values>={TV:{},MNT:{}};
 const found=new Map<string,{mode?:Mode;stage:Step|'TOTAL';n:number}>();
 for(const raw of rows){
  if(!raw||typeof raw!=='object')throw Error('日报岗位记录无效');
  const r=raw as Record<string,unknown>;
  if(typeof r.name!=='string'||!r.name.trim())throw Error('日报岗位名称缺失');
  const p=position(r.name,r.group);if(!p)continue;
  const value=r[field];if(value===null||value===undefined||value==='')continue;
  const n=count(value);if(n===null)throw Error('日报数值无效：'+r.name);
  const key=(p.mode??'SHARED')+':'+p.stage,old=found.get(key);if(old&&old.n!==n)throw Error('日报岗位数值冲突：'+r.name);
  found.set(key,{...p,n});
 }
 for(const {mode,stage,n} of found.values()){
  if(!mode){if(found.has('TV:BLACK')||found.has('MNT:BLACK'))throw Error('共享黑胶与分区黑胶同时存在，不能重复计算');const tv=Math.round(n*.2);result.TV.BLACK=tv;result.MNT.BLACK=n-tv;continue;}
  if(stage==='TOTAL'){
   if(found.has(mode+':PEEL')||found.has(mode+':POL'))throw Error(mode+' POL 汇总与明细重复');
   if(field==='today'){const p=splitPOL(n,ratio);result[mode].PEEL=p.peel;result[mode].POL=p.pol;}
  }else result[mode][stage]=n;
 }
 return result;
}
export function readRwSnapshot(raw:unknown,ratio=.2):RwSnapshot{
 const r=raw as {date?:string;rows?:unknown[];targetBaseline?:TargetInput};
 if(!r||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!validPlanDate(r.date.replace(/-/g,''))||!Array.isArray(r.rows)||!r.rows.length||r.rows.length>4000)throw Error('需要有效的 RW 日报 JSON：date 和 rows');
 const opening=collect(r.rows,'today',ratio);
 if(!Object.keys(opening.TV).length&&!Object.keys(opening.MNT).length)throw Error('未找到 TV / MNT 维修岗位数据');
 if(r.targetBaseline){
  if(r.targetBaseline.version!==1||!Array.isArray(r.targetBaseline.rows)||r.targetBaseline.rows.length>2000)throw Error('日报目标格式无效');
  collect(r.targetBaseline.rows,'target',ratio);
 }
 return {date:r.date,opening,target:r.targetBaseline};
}
export function confirmRwTargets(input:TargetInput,date:string,tvPeel?:number,mntPeel?:number){
 const rows=input.rows.filter(r=>position(r.name,r.group));
 const values=collect(rows,'target',.2);
 const normalized=rows.filter(r=>position(r.name,r.group)?.mode!==undefined);
 for(const [mode,peel] of [['TV',tvPeel],['MNT',mntPeel]] as const){
  const totals=normalized.filter(r=>{const p=position(r.name,r.group);return p?.mode===mode&&p.stage==='TOTAL'&&count(r.target)!==null;});
  if(!totals.length)continue;
  const n=count(totals[0].target)!;
  if(peel===undefined||count(peel)===null||peel>n)throw Error('请填写 '+mode+' POL 汇总中分给撕 POL 的目标片数（0～'+n+'）');
  values[mode].PEEL=peel;values[mode].POL=n-peel;
 }
 const clean:TargetInput={version:1,rows:(['TV','MNT'] as const).flatMap(group=>Object.entries(values[group]).map(([stage,target])=>({group,name:Object.keys(aliases).find(k=>aliases[k]===stage)!,target})))};
 return buildTargetBaseline(clean,date);
}
export function baselineValues(b?:TargetBaseline):Record<Mode,Values>{
 if(!b)return {TV:{},MNT:{}};
 const tv={...b.tvTargets},mnt=collect(b.mntTargets,'target',.2).MNT;
 const shared=collect(b.rows.filter(r=>r.group==='SHARED'),'target',.2);
 if(shared.TV.BLACK!==undefined){tv.BLACK=shared.TV.BLACK;mnt.BLACK=shared.MNT.BLACK;}
 return {TV:tv,MNT:mnt};
}
export function readRwPlan(raw:unknown):RwPlan{
 const data=objectValue(raw);
 let p=data as Partial<RwPlan>;
 if(data.kind==='rw-mdl-plan'&&data.schemaVersion===1){
  const date=data.dateKey;
  if(typeof date!=='string'||!validPlanDate(date)||typeof data.date!=='string'||data.date.replace(/-/g,'')!==date||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>10000)throw Error('V3 生产计划日期或 rows 无效');
  const records:PlanRecord[]=data.rows.map((rawRow,i)=>{
   const r=objectValue(rawRow),where='V3 计划第 '+(i+1)+' 行';
   if(typeof r.model!=='string'||r.model.length>80||typeof r.dayQty!=='number'||typeof r.nightQty!=='number'||count(r.dayQty)===null||count(r.nightQty)===null)throw Error(where+'型号或班次数量无效');
   const rec:PlanRecord={date,rawModel:r.model,day:r.dayQty,night:r.nightQty,source:'rw-combined-v3'};
   const model=normalizePlan(rec);
   if(!model.valid||String(model.size)!==r.sizeCode||model.bu!==r.bu)throw Error(where+'型号、尺寸或 BU 不一致');
   const rates=ngRates.percent[model.size!];if(!rates)throw Error(where+' NG 率未配置');
   for(const [field,qty] of [['expectedDay',rec.day],['expectedNight',rec.night]] as const){
    const values=objectValue(r[field]);
    for(const [j,kind] of ['POL','BD','NDF','FILM'].entries()){
     const n=values[kind],expected=qty*rates[j]/100;
     if(typeof n!=='number'||!Number.isFinite(n)||n<0||Math.abs(n-expected)>Math.max(1e-9,expected*1e-12))throw Error(where+' '+field+' '+kind+' 预测与计划量及 NG 率不一致');
    }
   }
   return rec;
  });
  p={schema:'rw-mdl-plan',version:1,records,rules:data.rules as RwPlan['rules']};
 }
 if(!p||p.schema!=='rw-mdl-plan'||p.version!==1||!Array.isArray(p.records)||!p.records.length||p.records.length>10000)throw Error('需要 rw-mdl-plan v1 JSON：schema、version、records');
 for(const r of p.records)if(!r||typeof r.date!=='string'||!validPlanDate(r.date)||typeof r.rawModel!=='string'||!r.rawModel.trim()||r.rawModel.length>500||typeof r.source!=='string'||count(r.day)===null||count(r.night)===null||typeof r.day!=='number'||typeof r.night!=='number')throw Error('计划记录日期、型号或班次数量无效');
 const rules:Record<string,ModelRule>=Object.create(null);
 for(const [model,r] of Object.entries(p.rules??{})){
  if(!/^[A-Z0-9_-]+$/.test(model)||!r||typeof r!=='object'||r.panel!==undefined&&!['OC','LCM'].includes(r.panel)||[r.cut,r.polBlack,r.filmBlack].some(v=>v!==undefined&&typeof v!=='boolean'))throw Error('计划型号路线规则无效');
  rules[model]={panel:r.panel,cut:r.cut,polBlack:r.polBlack,filmBlack:r.filmBlack};
 }
 return {schema:p.schema,version:p.version,records:p.records,rules};
}
export function projected(plan:RwPlan|undefined,date:string,mode:Mode,shift:Shift){
 if(!plan?.records.some(r=>{if(r.date!==date)return false;const model=normalizePlan(r);return model.valid&&model.bu===mode;}))return;
 const result=forecastPlan(plan.records,date,mode,shift);
 const values:Values={REMOVE:result.diagnostic.BD.count,PEEL:result.diagnostic.POL.count,FILM:result.diagnostic.FILM.count};
 if(mode==='TV')values.VI=result.diagnostic.REVIEW.count;
 else if(result.batches.filter(x=>x.kind==='REVIEW').every(b=>plan.rules[b.model]?.panel)){
 values.OC_VI=0;values.LCM_VI=0;
 for(const b of result.batches.filter(x=>x.kind==='REVIEW')){
  const panel=plan.rules[b.model]?.panel;
  if(panel){const stage=panel==='OC'?'OC_VI':'LCM_VI';values[stage]=(values[stage]??0)+b.count;}
 }
 }
 return {result,values};
}
export function attachProduction(base:Scenario,snapshot:RwSnapshot|undefined,plan:RwPlan|undefined,baseline:TargetBaseline|undefined,panel?:'OC'|'LCM'):Scenario{
 const s=clone(base),mode=s.mode??'TV',shift=s.shift??'DAY',date=s.date??snapshot?.date.replace(/-/g,'')??'';
 const forecast=projected(plan,date,mode,shift);
 if(!snapshot&&!plan&&!baseline)return s;
 s.productionBlock=undefined;
 s.lots=s.lots.filter(l=>l.source==='external'&&!base.synthetic);
 s.forecast=undefined;
 if(snapshot?.date.replace(/-/g,'')===date){
  const stages=snapshot.opening[mode];
  for(const [key,n] of Object.entries(stages)){
   const stage=key as Step;
   if(!n)continue;
   if(mode==='MNT'&&!panel&&stage!=='OC_VI'&&stage!=='LCM_VI'){
    s.productionBlock='MNT 期初 WIP 须确认未分型批次的 OC / LCM 路线';continue;
   }
   const kind:Kind=['PEEL','POL','BUBBLE','CUT','BLACK'].includes(stage)?'POL':stage==='FILM'?'FILM':['PI','VI','OC_VI','LCM_VI','OUT'].includes(stage)?'UNKNOWN':'BD';
   const lot:Lot={id:'rw-opening:'+stage,mode,stage,kind,count:n,at:0,source:'opening',cof:2,mntPanel:mode==='MNT'?(stage==='OC_VI'?'OC':stage==='LCM_VI'?'LCM':panel):undefined,cut:stage==='CUT'?true:undefined,black:stage==='BLACK'?true:undefined};
   s.lots.push(lot);
  }
  s.rawFA=0;
 }
 if(forecast&&plan){
  const rules:Record<string,ModelRule>=Object.create(null);
  for(const b of forecast.result.batches)rules[b.model]=plan.rules[b.model]??{};
  if(mode==='MNT'&&forecast.result.batches.some(b=>!rules[b.model]?.panel)){
   s.productionBlock='MNT 生产计划缺少型号 OC / LCM 路线；未注入预计 NG，补齐 rules 后重新导入';
  }else s.lots.push(...forecastLots(forecast.result,mode,rules,demoArrival).map((lot,i)=>{
   const rule=rules[forecast.result.batches[i].model];
   return lot.kind==='POL'?{...lot,cut:rule.cut,black:rule.polBlack}:lot;
  }));
  s.forecast={plan:forecast.result.plan,version:forecast.result.version,amounts:Object.fromEntries(ngKinds.map(k=>[k,forecast.result.diagnostic[k].count])) as NonNullable<Scenario['forecast']>['amounts']};
 }
 if(snapshot||plan){s.synthetic=false;s.id='production:'+mode+':'+shift+':'+date;s.name=mode+' '+(shift==='DAY'?'白班':'夜班')+' · '+date;s.sourceNote=(s.productionBlock?s.productionBlock+'。':'')+'期初为日报时点快照；预计 NG 是独立预测任务，到料时间为演练假设。';}
 s.targets=baselineValues(baseline)[mode];s.confirmedTargetsOnly=true;
 s.conditionalPOLConfirmed=!s.lots.some(l=>l.kind==='POL'&&l.count>0&&['PEEL','POL','BUBBLE'].includes(l.stage)&&(l.cut===undefined||l.black===undefined));
 validate(s,{},false);
 return s;
}
