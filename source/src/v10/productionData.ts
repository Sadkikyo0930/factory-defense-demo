import {count,normalize} from '../report';
import {classifyMntPanel,forecastPlan,forecastLots,validPlanDate,normalizePlan,demoArrival,ngKinds, type ModelRule,type PlanRecord,type Shift} from './plan';
import {clone,inspectionStages,route,splitPolRatios,validate, type Mode,type Step,type Lot,type Kind,type Scenario,type PolRatios} from './spec';
type Values=Partial<Record<Step,number>>;
export interface RwSnapshot {date:string; opening:Record<Mode,Values>; targets:Record<Mode,Values>; warnings:string[]}
export interface RwPlan {schema:'rw-mdl-plan';version:1;records:PlanRecord[];rules:Record<string,ModelRule>;ratios?:Partial<Record<Mode,Partial<Record<Shift,PolRatios>>>>}
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
const aliases:Record<string,Step|'TOTAL'>={祛除:'REMOVE',去除:'REMOVE',贴胶:'TAPE',BD:'BD',UV:'UV',撕POL:'PEEL',机器撕POL:'PEEL',贴POL:'POL',POL:'TOTAL',脱泡:'BUBBLE',共享脱POL:'BUBBLE',切割:'CUT',黑胶:'BLACK',覆膜:'FILM',贴膜:'FILM',修膜:'FILM',PI:'PI',VI:'VI',OCVI:'OC_VI',LCMVI:'LCM_VI',OUT:'OUT',
 'VI/OUT':'VI','OCVI/OUT':'OC_VI','LCMVI/OUT':'LCM_VI',OC:'OC_VI',LCM:'LCM_VI',OCOUT:'OC_VI',LCMOUT:'LCM_VI',OC检验:'OC_VI',LCM检验:'LCM_VI',条件切割:'CUT',机器切割:'CUT',CUT:'CUT',黑胶维修:'BLACK',脱POL:'BUBBLE'};
function position(name:string,group:unknown,record?:Record<string,unknown>,location='日报'){
 const n=normalize(name),pref=/^(TV|MNT)/.exec(n)?.[1] as Mode|undefined,key=(pref?n.slice(pref.length):n).replace(/^[:：]/,'');
 if(/^(FA|DISA)/.test(key)||key.includes('拆解'))return;
 const g=normalize(group);
 const fail=(reason:string)=>{throw Error('日报工区冲突：'+reason+'；'+location+' '+JSON.stringify({name,group:group??null,sourceName:record?.sourceName,row:record?.row,column:record?.column}));};
 if(g&&!['TV','MNT','SHARED'].includes(g))fail('未知 group');
 if(pref&&g&&g!==pref)fail('岗位前缀 '+pref+' 与 group '+g+' 不一致');
 if(g==='SHARED'&&!['黑胶','黑胶维修'].includes(key))return;
 const alias=(k:string)=>Object.prototype.hasOwnProperty.call(aliases,k)?aliases[k]:undefined;
 const leading=/^\(?(LCM|OC)\)?[:/]?(.+)$/.exec(key);
 const trailing=/^(.+?)(?:\((LCM|OC)\)|[:/](LCM|OC))$/.exec(key);
 const scope=(leading?.[1]??trailing?.[2]??trailing?.[3]) as 'OC'|'LCM'|undefined;
 const stage=alias(key)??alias((leading?.[2]??trailing?.[1]??key).replace(/维修$/,''));
 if(!stage)return;
 const mode=pref??(g==='TV'||g==='MNT'?g:stage==='CUT'?'MNT':undefined);
 if(!mode&&stage!=='BLACK'){
  if(stage==='OC_VI'||stage==='LCM_VI')fail('检测岗位缺少明确 MNT 工区');
  return;
 }
 if(mode==='TV'&&['LCM_VI','OC_VI','CUT'].includes(stage))fail('此岗位不属于 '+mode);
 if(mode==='MNT'&&stage==='VI')return {mode,stage:scope==='LCM'?'LCM_VI' as const:'OC_VI' as const};
 return {mode,stage,scope:stage==='OC_VI'||stage==='LCM_VI'?undefined:scope};
}
function excluded(name:string,group:unknown){
 const key=normalize(name).replace(/^(TV|MNT):?/,'');
 const g=normalize(group);
 return /^(FA|DISA)/.test(key)||key.includes('拆解')||g==='SHARED'||!g&&['脱泡','共享脱POL'].includes(key);
}
const legacyPairs:Record<number,string>={49:'TV:REMOVE',51:'MNT:REMOVE',53:'TV:BD',55:'MNT:BD',75:'SHARED:BLACK',81:'MNT:OC_VI',87:'MNT:OC_VI'};
function mergeIdentity(raw:unknown,row:number|undefined,column:number|undefined){
 if(raw===undefined)return;
 const area=objectValue(raw);
 const coords=['startRow','endRow','startColumn','endColumn'].map(key=>count(area[key]));
 if(coords.some(n=>n===null||n===0)||row===undefined||column===undefined)throw Error('日报合并区域坐标无效');
 const [r1,r2,c1,c2]=coords as number[];
 if(row<r1||row>r2||column<c1||column>c2)throw Error('日报来源行列不在合并区域内：'+row+'/'+column);
 return [r1,r2,c1,c2].join(':');
}
function matchesLegacyLayout(rows:unknown[]){
 const signatures=new Map<number,Set<string>>();
 for(const raw of rows){
  const r=objectValue(raw),row=count(r.row);
  if(row===null||typeof r.name!=='string')continue;
  const p=position(r.name,r.group,r),stage=p?.stage;
  if(!stage)continue;
  const mode=stage==='BLACK'&&r.allocation==='blackGlue-20-80'?'SHARED':p?.mode??'SHARED';
  const labels=signatures.get(row)??new Set<string>();
  labels.add(mode+':'+stage);signatures.set(row,labels);
 }
 return Object.entries(legacyPairs).every(([r,label])=>
  [Number(r),Number(r)+1].every(i=>signatures.get(i)?.size===1&&signatures.get(i)?.has(label)));
}
function collect(rows:unknown[],field:'today'|'target',warnings:string[],knownLayout:boolean){
 const result:Record<Mode,Values>={TV:{},MNT:{}};
 type Reading={key:string;mode?:Mode;stage:Step|'TOTAL';n:number;location:string;allocated:boolean};
 const sources=new Map<string,Reading>(),seenRows=new Map<string,Reading>(),found=new Map<string,Reading>();
 const snapshotKeys=new Set<string>(),rowKeys=new Set<string>();
 const conflict=(a:Reading,b:Reading)=>{throw Error('日报岗位数值冲突：'+a.location+' = '+a.n+'；'+b.location+' = '+b.n);};
 for(const [i,raw] of rows.entries()){
  if(!raw||typeof raw!=='object')throw Error('日报岗位记录无效');
  const r=raw as Record<string,unknown>;
  if(typeof r.name!=='string'||!r.name.trim())throw Error('日报岗位名称缺失');
  const label=(field==='today'?'rows':'targetBaseline.rows')+'['+i+']';
  const p=position(r.name,r.group,r,label);
  const value=r[field];if(value===null||value===undefined||value==='')continue;
  if(!p){
   if(!excluded(r.name,r.group))warnings.push(label+' 未映射：'+r.name);
   continue;
  }
  const n=count(value);if(n===null)throw Error('日报数值无效：'+r.name);
  const key=(p.mode??'SHARED')+':'+p.stage+':'+(p.scope??'');
  const row=r.row==null?undefined:count(r.row),column=r.column==null?undefined:count(r.column);
  if(row===null||row===0||column===null||column===0)throw Error('日报来源坐标无效：'+label+' '+r.name);
  const area=mergeIdentity(r.mergeArea,row,column);
  const legacyLabel=(p.stage==='BLACK'&&r.allocation==='blackGlue-20-80'?'SHARED':p.mode??'SHARED')+':'+p.stage;
  const legacyStart=row!==undefined&&knownLayout?(legacyPairs[row]===legacyLabel?row:legacyPairs[row-1]===legacyLabel?row-1:undefined):undefined;
  const location=label+' '+r.name+(row===undefined?'':'（Excel 第 '+row+' 行'+(column===undefined?'':'，第 '+column+' 列')+'）')+(area?' 合并区 '+area:'');
  const allocated=p.stage==='BLACK'&&!!p.mode&&r.allocation==='blackGlue-20-80'&&['黑胶','黑胶维修'].includes(normalize(r.sourceName));
  const reading={...p,key,n,location,allocated};
  const origin=area?'merge:'+area:legacyStart!==undefined?'legacy:'+legacyStart:row!==undefined?'row:'+row:undefined;
  if(origin!==undefined){
   // V3.8 can emit the two portions of one shared black-glue row.
   const physicalKey=origin+(allocated?':'+p.mode:'');
   const old=sources.get(physicalKey);
   if(old&&(old.n!==n||old.key!==key))conflict(old,reading);
   const other=seenRows.get(origin);
   if(other&&other.allocated!==allocated)conflict(other,reading);
   if(old)continue;
   sources.set(physicalKey,reading);seenRows.set(origin,reading);
  }
  const shift=normalize(r.shift);
  const shiftSnapshot=['DAY','NIGHT','白班','夜班'].includes(shift);
  const snapshot=origin===undefined||shiftSnapshot&&!area&&legacyStart===undefined;
  const bucket=snapshot?'snapshot:'+key:origin+':'+key;
  if((snapshot?rowKeys:snapshotKeys).has(key))throw Error('日报来源不明确：'+location+'，同工序混用独立 Excel 行与无行号或班次快照');
  (snapshot?snapshotKeys:rowKeys).add(key);
  const old=found.get(bucket);
  if(old&&old.n!==n)conflict(old,reading);
  found.set(bucket,reading);
 }
 const keys=new Set([...found.values()].map(r=>r.key));
 const has=(mode:Mode,stage:string)=>['','OC','LCM'].some(scope=>keys.has(mode+':'+stage+':'+scope));
 let sharedBlack:number|undefined;
 for(const {key,mode,stage,n} of found.values()){
  if(!mode){
   if(has('TV','BLACK')||has('MNT','BLACK'))throw Error('共享黑胶与分区黑胶同时存在，不能重复计算');
   sharedBlack=(sharedBlack??0)+n;
   if(!Number.isSafeInteger(sharedBlack))throw Error('共享黑胶合计超出安全整数');
   continue;
  }
  const dest=stage==='TOTAL'?'PEEL':stage;
  if(stage==='TOTAL'&&(has(mode,'PEEL')||has(mode,'POL')))throw Error(mode+' POL 汇总与明细重复');
  if((key.endsWith(':OC')||key.endsWith(':LCM'))&&keys.has(mode+':'+stage+':'))throw Error(mode+' '+stage+' 工序汇总和 OC/LCM 明细并存，不能重复计算');
  const total=(result[mode][dest]??0)+n;
  if(!Number.isSafeInteger(total))throw Error(mode+' '+dest+' 合计超出安全整数');
  result[mode][dest]=total;
 }
 if(sharedBlack!==undefined){result.TV.BLACK=Math.round(sharedBlack*.2);result.MNT.BLACK=sharedBlack-result.TV.BLACK;}
 return result;
}
export function readRwSnapshot(raw:unknown):RwSnapshot{
 const r=raw as {date?:string;rows?:unknown[];source?:{tool?:string};targetBaseline?:{version:number;rows:unknown[]}};
 if(!r||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!validPlanDate(r.date.replace(/-/g,''))||!Array.isArray(r.rows)||!r.rows.length||r.rows.length>4000)throw Error('需要有效的 RW 日报 JSON：date 和 rows');
 const legacyTemplate=r.source?.tool==='rw-win7-vbs'&&!r.rows.some(row=>objectValue(row).mergeArea!==undefined)&&matchesLegacyLayout(r.rows);
 const warnings:string[]=[],opening=collect(r.rows,'today',warnings,legacyTemplate);
 if(!Object.keys(opening.TV).length&&!Object.keys(opening.MNT).length)throw Error('未找到 TV / MNT 维修岗位数据');
 if(r.targetBaseline!==undefined){
  if(!r.targetBaseline||r.targetBaseline.version!==1||!Array.isArray(r.targetBaseline.rows)||r.targetBaseline.rows.length>2000)throw Error('日报目标格式无效');
  if(!r.targetBaseline.rows.length)throw Error('日报目标没有记录');
 }
 const targets=r.targetBaseline?collect(r.targetBaseline.rows,'target',warnings,legacyTemplate):{TV:{},MNT:{}};
 if(r.targetBaseline&&!Object.keys(targets.TV).length&&!Object.keys(targets.MNT).length)throw Error('目标记录没有可映射的 TV / MNT 岗位');
 return {date:r.date,opening,targets,warnings};
}
export function readRwPlan(raw:unknown):RwPlan{
 const data=objectValue(raw);
 let p=data as Partial<RwPlan>;
 const fromV3=data.kind==='rw-mdl-plan'&&data.schemaVersion===1;
 if(fromV3){
  const date=data.dateKey;
  if(typeof date!=='string'||!validPlanDate(date)||typeof data.date!=='string'||data.date.replace(/-/g,'')!==date||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>10000)throw Error('V3 生产计划日期或 rows 无效');
  const records:PlanRecord[]=data.rows.map((rawRow,i)=>{
   const r=objectValue(rawRow),where='V3 计划第 '+(i+1)+' 行';
   if(typeof r.model!=='string'||r.model.length>80||typeof r.dayQty!=='number'||typeof r.nightQty!=='number'||count(r.dayQty)===null||count(r.nightQty)===null)throw Error(where+'型号或班次数量无效');
   const rec:PlanRecord={date,rawModel:r.model,day:r.dayQty,night:r.nightQty,source:'rw-combined-v3'};
   const model=normalizePlan(rec);
   if(model.valid&&(String(model.size)!==r.sizeCode||model.bu!==r.bu))throw Error(where+'型号、尺寸或 BU 不一致');
   rec.expected={DAY:{POL:0,BD:0,REVIEW:0,FILM:0},NIGHT:{POL:0,BD:0,REVIEW:0,FILM:0}};
   for(const [field,qty,shift] of [['expectedDay',rec.day,'DAY'],['expectedNight',rec.night,'NIGHT']] as const){
    const values=objectValue(r[field]);
    for(const kind of ['POL','BD','NDF','FILM'] as const){
     const n=values[kind];
     if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>qty)throw Error(where+' '+field+' '+kind+' 预测与计划量不一致');
     rec.expected[shift][kind==='NDF'?'REVIEW':kind]=n;
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
  rules[model]={cut:r.cut,polBlack:r.polBlack,filmBlack:r.filmBlack};
 }
 const records=fromV3?p.records:p.records.map(({date,rawModel,day,night,source})=>({date,rawModel,day,night,source}));
 for(const rec of records){const model=normalizePlan(rec);if(model.valid&&model.bu==='MNT')rules[model.model]={...rules[model.model],panel:classifyMntPanel(model.model)};}
 const ratios:RwPlan['ratios']={};
 if(data.ratios!==undefined)for(const [mode,rawShifts] of Object.entries(objectValue(data.ratios))){
  if(mode!=='TV'&&mode!=='MNT')throw Error('POL 比例工区无效');
  const shifts:Partial<Record<Shift,PolRatios>>={};
  for(const [shift,rawRatio] of Object.entries(objectValue(rawShifts))){
   if(shift!=='DAY'&&shift!=='NIGHT')throw Error('POL 比例班别无效');
   const entry:PolRatios={};
   for(const [key,value] of Object.entries(objectValue(rawRatio))){
    if((key!=='blackRatio'&&key!=='cutRatio')||typeof value!=='number'||!Number.isFinite(value)||value<0||value>1||mode==='TV'&&key==='cutRatio'&&value!==0)throw Error('POL 比例无效：'+mode+' '+shift+' '+key);
    entry[key]=value;
   }
   shifts[shift]=entry;
  }
  ratios[mode]=shifts;
 }
 return {schema:p.schema,version:p.version,records,rules,ratios};
}
export function projected(plan:RwPlan|undefined,date:string,mode:Mode,shift:Shift,confirmed?:PolRatios){
 if(!plan?.records.some(r=>{if(r.date!==date)return false;const model=normalizePlan(r);return model.valid&&model.bu===mode;}))return;
 const result=forecastPlan(plan.records,date,mode,shift);
 const unrouted=mode==='MNT'?result.batches.filter(b=>b.kind==='REVIEW'&&!plan.rules[b.model]?.panel):[];
 const routable={...result,batches:result.batches.filter(b=>!unrouted.includes(b))};
 const rules=Object.fromEntries(routable.batches.map(b=>[b.model,plan.rules[b.model]??{}]));
 const ratios={...plan.ratios?.[mode]?.[shift],...confirmed};
 const lots=splitPolRatios(forecastLots(routable,mode,rules,demoArrival,true),mode,ratios);
 const values:Values={},pending=new Set<Step>();
 const inspections:Partial<Record<Step,{ndf:number;repair:number}>>={};
 for(const stage of inspectionStages)inspections[stage]={ndf:0,repair:0};
 for(const lot of lots){
  if(lot.kind==='POL'){
   if(lot.black===undefined)pending.add('BLACK');
   if(lot.cut===undefined)pending.add('CUT');
  }
  for(const stage of route(lot)){
   if(stage==='OUT')continue;
   values[stage]=(values[stage]??0)+lot.count;
   const split=inspections[stage];
   if(split)split[lot.kind==='REVIEW'?'ndf':'repair']+=lot.count;
  }
 }
 return {result,values,unrouted,lots,pending,inspections};
}
export function workload(opening:Values|undefined,forecast:Values|undefined,cof:number){
 const sum=(...parts:(number|undefined)[])=>parts.some(n=>n!==undefined)?parts.reduce<number>((total,n)=>total+(n??0),0):undefined;
 const tape=sum(opening?.REMOVE,forecast?.REMOVE,opening?.BD,forecast?.BD);
 return {tape:tape===undefined?undefined:tape*cof,
  bubble:sum(opening?.PEEL,forecast?.PEEL,opening?.POL,forecast?.POL),
  bubbleOpening:sum(opening?.PEEL,opening?.BUBBLE)};
}
export function attachProduction(base:Scenario,snapshot:RwSnapshot|undefined,plan:RwPlan|undefined):Scenario{
 const s=clone(base),mode=s.mode??'TV',shift=s.shift??'DAY',date=s.date??snapshot?.date.replace(/-/g,'')??'';
 const forecast=projected(plan,date,mode,shift,s.polRatios);
 if(!snapshot&&!plan)return s;
 s.polRatios={...plan?.ratios?.[mode]?.[shift],...s.polRatios};
 s.productionBlock=undefined;
 s.lots=s.lots.filter(l=>l.source==='external'&&!base.synthetic);
 s.forecast=undefined;
 if(snapshot?.date.replace(/-/g,'')===date){
  const stages=snapshot.opening[mode],opening:Lot[]=[];
  for(const [key,n] of Object.entries(stages)){
   const stage=key as Step;
   if(!n)continue;
   const kind:Kind=['PEEL','POL','BUBBLE','CUT','BLACK'].includes(stage)?'POL':stage==='FILM'?'FILM':['PI','VI','OC_VI','LCM_VI','OUT'].includes(stage)?'UNKNOWN':'BD';
   const lot:Lot={id:'rw-opening:'+stage,mode,stage,kind,count:n,at:0,source:'opening',cof:s.cofPerPiece??2,mntPanel:mode==='MNT'?(stage==='LCM_VI'?'LCM':'OC'):undefined,cut:stage==='CUT'?true:undefined,black:stage==='BLACK'?true:undefined};
   opening.push(lot);
  }
  s.lots.push(...splitPolRatios(opening,mode,s.polRatios));
  s.rawFA=0;
 }
 if(forecast&&plan){
  if(forecast.unrouted.length){
   const details=forecast.unrouted.slice(0,4).map(b=>b.model+'（'+b.count+' 片）').join('、');
   s.productionBlock='MNT '+(shift==='DAY'?'白班':'夜班')+' NDF 型号无法判定 OC / LCM：'+details+'；BAB 前缀、第 10 位、第 8 位均未命中';
  }else s.lots.push(...forecast.lots.map(lot=>({...lot,cof:s.cofPerPiece??2})));
  s.forecast={plan:forecast.result.plan,version:forecast.result.version,amounts:Object.fromEntries(ngKinds.map(k=>[k,forecast.result.diagnostic[k].count])) as NonNullable<Scenario['forecast']>['amounts']};
 }
 if(snapshot||plan){s.synthetic=false;s.id='production:'+mode+':'+shift+':'+date;s.name=mode+' '+(shift==='DAY'?'白班':'夜班')+' · '+date;s.sourceNote=(s.productionBlock?s.productionBlock+'。':'')+'期初为日报时点快照；预计 NG 是独立预测任务，到料时间为演练假设。';}
 s.targets=snapshot?.date.replace(/-/g,'')===date?{...snapshot.targets[mode],BUBBLE:0}:{};s.confirmedTargetsOnly=true;
 s.conditionalPOLConfirmed=!s.lots.some(l=>l.kind==='POL'&&l.count>0&&['PEEL','POL','BUBBLE'].includes(l.stage)&&(l.cut===undefined||l.black===undefined));
 validate(s,{},false);
 return s;
}
