import {count, normalize} from '../report';
import type {Step} from './spec';

export interface TargetRow {name:string;group:'TV'|'MNT'|'SHARED';target:number|null;row?:number;column?:number;today?:number|null}
export interface TargetInput {version:1;rows:TargetRow[]}
export interface TargetBaseline extends TargetInput {
 date:string; confirmed:true; peelTarget?:number; tvTargets:Partial<Record<Step,number>>; mntTargets:TargetRow[];
}
export const targetStorageKey='factory-defense:v10:rw-target-baseline:1';
const aliases:Record<string,Step|'POL_TOTAL'>={祛除:'REMOVE',去除:'REMOVE',贴胶:'TAPE',BD:'BD',UV:'UV',撕POL:'PEEL',机器撕POL:'PEEL',贴POL:'POL',POL:'POL_TOTAL',脱泡:'BUBBLE',黑胶:'BLACK',覆膜:'FILM',贴膜:'FILM',修膜:'FILM',PI:'PI',VI:'VI',OUT:'OUT'};
export function readTargetInput(value:unknown):TargetInput {
 const data=value as TargetInput;
 if(!data||data.version!==1||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>2000)throw Error('目标基准格式不正确');
 return {version:1,rows:data.rows.map(r=>{
  if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>200||!['TV','MNT','SHARED'].includes(r.group)||!(r.target===null||count(r.target)!==null))throw Error('目标岗位、工区或数值无效');
  const n=normalize(r.name),prefix=/^(TV|MNT)/.exec(n)?.[1];
  if(prefix&&prefix!==r.group)throw Error('目标岗位归属冲突：'+r.name);
  return {name:r.name,group:r.group,target:r.target===null?null:count(r.target),row:Number.isSafeInteger(r.row)?r.row:undefined,column:Number.isSafeInteger(r.column)?r.column:undefined,today:r.today===null?null:count(r.today)};
 })};
}
export function buildTargetBaseline(input:TargetInput,date:string,peelTarget?:number):TargetBaseline{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('目标来源日期无效');
 const rows=readTargetInput(input).rows,observed=new Map<string,TargetRow>(),tvTargets:Partial<Record<Step,number>>={},mntTargets:TargetRow[]=[];
 let pol:number|undefined;
 for(const r of rows){
  if(r.group==='SHARED')continue;
  const name=normalize(r.name).replace(new RegExp('^'+r.group),'');
  const stage=r.group==='TV'&&Object.prototype.hasOwnProperty.call(aliases,name)?aliases[name]:undefined;
  if(r.group==='TV'&&!stage)throw Error('未匹配 TV 目标：'+r.name);
  const id=r.group+':'+(stage||name),old=observed.get(id);
  if(r.target===null)continue;
  if(old&&old.target!==r.target)throw Error('目标快照冲突：'+r.group+' '+r.name);
  if(old)continue;
  observed.set(id,r);
  if(r.group==='MNT')mntTargets.push(r);
  else if(stage==='POL_TOTAL')pol=r.target;
  else if(stage)tvTargets[stage]=r.target;
 }
 for(const r of rows)if(r.target===null&&r.group!=='SHARED'){
  const n=normalize(r.name).replace(new RegExp('^'+r.group),'');
  if(!observed.has(r.group+':'+(r.group==='TV'?aliases[n]:n)))throw Error('目标缺失：'+r.group+' '+r.name);
 }
 if(!mntTargets.length||(!Object.keys(tvTargets).length&&pol===undefined))throw Error('初始化需要同时提供 TV 和 MNT 目标');
 if(pol!==undefined){
  if(tvTargets.PEEL!==undefined||tvTargets.POL!==undefined)throw Error('TV POL 汇总和分项目标不能同时生效');
  if(peelTarget===undefined||count(peelTarget)===null||peelTarget>pol)throw Error('请明确填写 TV POL 汇总目标中分给撕 POL 的片数（0～'+pol+'）');
  tvTargets.PEEL=peelTarget;tvTargets.POL=pol-peelTarget;
 }
 return {version:1,rows,date,confirmed:true,peelTarget,tvTargets,mntTargets};
}
export function loadTargetBaseline(storage:Pick<Storage,'getItem'>):TargetBaseline|undefined{
 const raw=storage.getItem(targetStorageKey);if(!raw)return;
 const data=JSON.parse(raw);if(data.confirmed!==true)throw Error('本机目标基准未经确认');
 return buildTargetBaseline(data,data.date,data.peelTarget);
}
