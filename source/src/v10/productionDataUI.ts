import {mainlinePlan} from './mainlinePlan';
import type {BattleSession} from './session';
import {attachProduction,projected,readProductionImport,taskRatios,workload,type ProductionImport,type RwPlan,type RwSnapshot} from './productionData';
import {shiftScenario,validPlanDate,normalizePlan,type Shift} from './plan';
import {clone,defaultCofPerPiece,stageLabel,visibleTowers,webVersion,splitPolRatios,type Mode,type PolRatios,type Scenario} from './spec';


export function setupDataCenter(session:BattleSession,changed:()=>void){
 const dialog=document.createElement('dialog');dialog.id='production-data';
 dialog.innerHTML=`<div class="dialog-heading"><h2>生产任务数据中心 <small id="data-version">${webVersion}</small></h2><button id="close-data">关闭</button></div>
 <div class="data-controls"><button id="pick-production">导入今日生产任务</button>
 <label>日期 <input type="date" id="data-date"></label><label>班次 <select id="data-shift"><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label></div>
 <input type="file" id="production-json" accept=".json,application/json" hidden>
 <p id="data-summary"></p><p>仅展示主线排产型号及数量；后台岗位数据与计算保持。</p>
 <section id="data-conditions" hidden><h3>开战前确认</h3>
 <label id="data-confirm-in-field"><input type="checkbox" id="data-confirm-in"> 确认已有独立新增 IN 口径（没有则保持 0；不会生成新增量）</label>
 <button id="data-confirm-conditions">确认开战条件</button></section>
 <div id="data-tables"></div>
 <section id="data-pending" hidden><p id="data-preview-label"></p>
 <button id="data-confirm" class="primary">确认导入</button><button id="data-discard">放弃预览</button></section><p id="data-error" role="alert"></p>`;
 document.body.append(dialog);
 const entry=document.createElement('button');entry.id='import-report';entry.textContent='生产任务数据中心';document.querySelector('header')!.append(entry);
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>dialog.querySelector<T>('#'+id)!;
 const date=$<HTMLInputElement>('data-date'),shift=$<HTMLSelectElement>('data-shift');
 const error=(e:unknown)=>{$('data-error').textContent=e instanceof Error?e.message:String(e);};
 let snapshot:RwSnapshot|undefined,plan:RwPlan|undefined;
 let draft:(ProductionImport&{file:string})|undefined, revision=0;
 let reportFile='',planFile='';
 const dateValue=()=>date.value.replace(/-/g,'');
 const selectedShift=()=>shift.value as Shift;
 const cofByShift=new Map<string,number>();
 const polByShift=new Map<string,PolRatios>();
 const cofKey=(mode:Mode,sh:Shift,key:string)=>[mode,sh,key].join(':');
 const savedRatios=(key:string):PolRatios|undefined=>{
  if(polByShift.has(key))return polByShift.get(key);
  try{
   const saved=JSON.parse(localStorage.getItem('factory-pol-ratios:'+key)??'null');
   if(saved&&typeof saved.blackRatio==='number'&&typeof saved.cutRatio==='number'&&[saved.blackRatio,saved.cutRatio].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return saved;
  }catch{/* Storage can be unavailable; current-session settings still work. */}
 };
 const keyFor=(s:Scenario)=>cofKey(s.mode??'TV',s.shift??'DAY',s.date??(document.getElementById('scenario-date') as HTMLInputElement).value.replace(/-/g,''));
 const savedCof=(key:string)=>{
  const current=cofByShift.get(key);
  if(current!==undefined)return current;
  try{
   const saved=Number(localStorage.getItem('factory-cof-per-piece:'+key));
   if(Number.isFinite(saved)&&saved>=.1&&saved<=20)return saved;
  }catch{/* Use the default when browser storage is unavailable. */}
  return defaultCofPerPiece;
 };
 const selectedPlan=()=>draft?.kind==='report'?undefined:(draft?.plan??plan);
 function show(){
  const rw=draft?.rw??snapshot,p=selectedPlan();
  date.disabled=!!draft?.rw;
  const dateKey=dateValue(),body=$('data-tables');body.replaceChildren();
  if(!validPlanDate(dateKey)){error('请选择有效的任务日期');return;}
  const task=session.scenario;
  $('data-conditions').hidden=!!draft||task.inConfirmed;
  $('data-confirm-in-field').hidden=task.inConfirmed;
  const dateMatched=rw?.date.replace(/-/g,'')===dateKey;
  const shownTargets=dateMatched&&rw?rw.targets:{TV:{},MNT:{}};
  $('data-summary').textContent='期初快照：'+(rw?.date??'未导入')+(rw&&!dateMatched?'（与所选日期不同）':'')+' ｜ 目标快照：'+(rw&&(Object.keys(rw.targets.TV).length||Object.keys(rw.targets.MNT).length)?rw.date:'未导入')+' ｜ 生产计划：'+(p?(draft?.plan?draft.file:planFile)+'（按日期核对）':'未导入')+' ｜ 日报来源：'+(rw?(draft?.rw?draft.file:reportFile):'未导入')+' ｜ 班次：'+(selectedShift()==='DAY'?'白班':'夜班')+(session.scenario.productionBlock?' ｜ '+session.scenario.productionBlock:'');
  for(const mode of ['TV','MNT'] as const){
   const column=document.createElement('section');column.className='data-bu';
   const heading=document.createElement('h3');heading.textContent=mode+' · 主线排产';column.append(heading);
   const table=document.createElement('table');table.dataset.bu=mode;table.innerHTML='<thead><tr><th>型号</th><th>排产数量</th></tr></thead>';const bodyRows=table.createTBody();
   const quantities=mainlinePlan(p?.records??[],dateKey,mode,selectedShift());
   for(const {model,quantity} of quantities){const row=bodyRows.insertRow();row.insertCell().textContent=model;row.insertCell().textContent=String(quantity);}
   if(!quantities.length){const note=document.createElement('p');note.textContent=p?'所选日期/班次没有可用型号排产':'未导入主线排产字段；不以岗位维修量代替';column.append(note);}
   column.append(table);body.append(column);
  }
  if(rw?.warnings.length){const note=document.createElement('p');note.textContent=rw.warnings.join('；');body.append(note);}
  $('data-pending').hidden=!draft;
  $('data-preview-label').textContent=draft?.kind==='combined'?'合并文件预览：日报与计划将一次确认。':draft?.kind==='report'?'旧版日报预览：文件不含生产计划；确认后预计新增 NG 显示未导入。':draft?'仅生产计划预览：保留已确认的日报快照。':'';
 }
 function commit(mode:Mode,workShift:Shift,key:string,rw:RwSnapshot|undefined,p:RwPlan|undefined){
  const current=session.scenario,keep=!!(rw||p)&&(current.mode??'TV')===mode&&(current.date===key||!current.date);
  const base=keep&&!current.synthetic?{...clone(current),shift:workShift,date:key}:shiftScenario(mode,workShift,key);
  base.cofPerPiece=savedCof(cofKey(mode,workShift,key));
  if(!rw&&!p)for(const lot of base.lots)lot.cof=base.cofPerPiece;
  base.polRatios=savedRatios(cofKey(mode,workShift,key));
  session.setProductionScenario(attachProduction(base,rw,p),keep);
 }
 function verify(rw:RwSnapshot|undefined,p:RwPlan|undefined,key:string){
  if(rw?.warnings.length)throw Error('请核对未映射的日报岗位，当前任务未更新。');
  for(const mode of ['TV','MNT'] as const)for(const sh of ['DAY','NIGHT'] as const){
   const candidate=attachProduction(shiftScenario(mode,sh,key),rw,p);
   if(candidate.productionBlock)throw Error(candidate.productionBlock);
  }
 }
 function resetSelection(){
  resetConditions();
  const s=session.scenario;
  date.value=s.date?.replace(/^(....)(..)(..)$/,'$1-$2-$3')||(document.getElementById('scenario-date') as HTMLInputElement).value;
  shift.value=s.shift??'DAY';
 }
 entry.onclick=()=>{resetSelection();error('');show();dialog.showModal();};
 function discard(){revision++;draft=undefined;resetSelection();error('');show();}
 $('close-data').onclick=()=>{discard();dialog.close();};dialog.addEventListener('cancel',discard);
 $('data-discard').onclick=discard;
 const input=$<HTMLInputElement>('production-json');
 $('pick-production').onclick=()=>input.click();
  input.onchange=async()=>{
   const file=input.files?.[0];input.value='';if(!file)return;const token=++revision;error('');
   try{
    if(file.size>8*1024*1024)throw Error('JSON 文件超过 8 MB');
    const raw:unknown=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
    if(token!==revision||!dialog.open)return;
    draft={...readProductionImport(raw),file:file.name};
    if(draft.rw)date.value=draft.rw.date;
    else if(draft.plan&&!draft.plan.records.some(r=>r.date===dateValue()))date.value=draft.plan.records[0].date.replace(/^(....)(..)(..)$/,'$1-$2-$3');
    show();
   }catch(e){if(token===revision){draft=undefined;resetSelection();show();error(e);}}
  };
 $('data-confirm').onclick=()=>{
  try{
   if(!draft)return;
   const rw=draft.rw??snapshot,p=selectedPlan();
   verify(rw,p,dateValue());
   commit(session.scenario.mode??'TV',selectedShift(),dateValue(),rw,p);
   if(draft.rw)reportFile=draft.file;if(draft.plan)planFile=draft.file;else if(!p)planFile='';
   snapshot=rw;plan=p;draft=undefined;changed();error('已确认导入。');show();
  }catch(e){error(e);}
 };
 $('data-confirm-conditions').onclick=()=>{
  try{
   const confirmIn=$<HTMLInputElement>('data-confirm-in').checked;
   if(!session.scenario.inConfirmed&&!confirmIn)throw Error('请先核对独立新增 IN 口径');
   session.confirmProductionConditions({confirmIn});
   changed();resetConditions();error('开战条件已确认。');show();
  }catch(e){error(e);}
 };
 function resetConditions(){
  $<HTMLInputElement>('data-confirm-in').checked=false;
 }
 function select(){try{resetConditions();error('');if(!draft&&(snapshot||plan)){commit(session.scenario.mode??'TV',selectedShift(),dateValue(),snapshot,plan);changed();}show();}catch(e){error(e);}}
 date.onchange=()=>{if(!draft?.rw)select();};shift.onchange=select;
 return {load:(mode:Mode,workShift:Shift,key:string)=>commit(mode,workShift,key,snapshot,plan),
  cofFor:(s:Scenario)=>savedCof(keyFor(s)),
  ratiosFor:(s:Scenario)=>taskRatios(!s.synthetic?plan:undefined,s.mode??'TV',s.shift??'DAY',savedRatios(keyFor(s))),
  saveTask(s:Scenario,ratios:Required<PolRatios>){
   const key=keyFor(s),mode=s.mode??'TV';
   s.polRatios=ratios;
   if(s.synthetic)s.lots=(['opening','external','forecast'] as const).flatMap(source=>splitPolRatios(s.lots.filter(lot=>lot.source===source),mode,ratios));
   session.updateScenario(s.synthetic?s:attachProduction(s,snapshot,plan));
   polByShift.set(key,ratios);
   if(s.cofPerPiece!==undefined)cofByShift.set(key,s.cofPerPiece);
   try{
    localStorage.setItem('factory-pol-ratios:'+key,JSON.stringify(ratios));
    if(s.cofPerPiece!==undefined)localStorage.setItem('factory-cof-per-piece:'+key,String(s.cofPerPiece));
   }catch{/* Current-session settings are still saved. */}
   if(dialog.open)show();
  }};
}
