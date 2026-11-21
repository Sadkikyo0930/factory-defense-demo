import type {BattleSession} from './session';
import {attachProduction,projected,readProductionImport,workload,type ProductionImport,type RwPlan,type RwSnapshot} from './productionData';
import {shiftScenario,validPlanDate,type Shift} from './plan';
import {clone,stageLabel,visibleTowers,webVersion,type Mode,type PolRatios} from './spec';


export function setupDataCenter(session:BattleSession,changed:()=>void){
 const dialog=document.createElement('dialog');dialog.id='production-data';
 dialog.innerHTML=`<div class="dialog-heading"><h2>生产任务数据中心 <small id="data-version">${webVersion}</small></h2><button id="close-data">关闭</button></div>
 <div class="data-controls"><button id="pick-production">导入今日生产任务</button>
 <label>日期 <input type="date" id="data-date"></label><label>班次 <select id="data-shift"><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label></div>
 <input type="file" id="production-json" accept=".json,application/json" hidden>
 <p id="data-summary"></p><p>预计新增工作量按维修路线逐站统计，每站独立计次。期初 WIP 来自日报，实际 NG 与实际 OUT 以生产结果为准。FA、Disa 不进入任务。</p>
 <section id="data-conditions" hidden><h3>开战前确认</h3>
 <label id="data-confirm-in-field"><input type="checkbox" id="data-confirm-in"> 确认已有独立新增 IN 口径（没有则保持 0；不会生成新增量）</label>
 <label id="data-cut-field">已确认的 POL 切割比例 (%) <input id="data-route-cut" type="number" min="0" max="100" step="any"></label>
 <label id="data-black-field">已确认的 POL 黑胶比例 (%) <input id="data-route-black" type="number" min="0" max="100" step="any"></label>
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
 const rememberCof=()=>{const s=session.scenario,key=cofKey(s.mode??'TV',s.shift??'DAY',s.date??dateValue());if(s.cofPerPiece!==undefined)cofByShift.set(key,s.cofPerPiece);};
 const selectedPlan=()=>draft?.kind==='report'?undefined:(draft?.plan??plan);
 function show(){
  const rw=draft?.rw??snapshot,p=selectedPlan();
  date.disabled=!!draft?.rw;
  const dateKey=dateValue(),body=$('data-tables');body.replaceChildren();
  if(!validPlanDate(dateKey)){error('请选择有效的任务日期');return;}
  const task=session.scenario,pending=task.lots.filter(l=>l.kind==='POL'&&l.count>0&&['PEEL','POL','BUBBLE'].includes(l.stage));
  $('data-conditions').hidden=!!draft||(task.inConfirmed&&task.conditionalPOLConfirmed!==false);
  $('data-confirm-in-field').hidden=task.inConfirmed;
  $('data-cut-field').hidden=task.conditionalPOLConfirmed!==false||!pending.some(l=>l.cut===undefined);
  $('data-black-field').hidden=task.conditionalPOLConfirmed!==false||!pending.some(l=>l.black===undefined);
  const dateMatched=rw?.date.replace(/-/g,'')===dateKey;
  const shownTargets=dateMatched&&rw?rw.targets:{TV:{},MNT:{}};
  $('data-summary').textContent='期初快照：'+(rw?.date??'未导入')+(rw&&!dateMatched?'（与所选日期不同）':'')+' ｜ 目标快照：'+(rw&&(Object.keys(rw.targets.TV).length||Object.keys(rw.targets.MNT).length)?rw.date:'未导入')+' ｜ 生产计划：'+(p?(draft?.plan?draft.file:planFile)+'（按日期核对）':'未导入')+' ｜ 日报来源：'+(rw?(draft?.rw?draft.file:reportFile):'未导入')+' ｜ 班次：'+(selectedShift()==='DAY'?'白班':'夜班')+(session.scenario.productionBlock?' ｜ '+session.scenario.productionBlock:'');
  for(const mode of ['TV','MNT'] as const){
   const settingsKey=cofKey(mode,selectedShift(),dateKey);
   let forecast:ReturnType<typeof projected>;try{forecast=projected(p,dateKey,mode,selectedShift(),polByShift.get(settingsKey));}catch(e){error(e);}
   const scenario=shiftScenario(mode,selectedShift(),dateKey||'20261120');
   const column=document.createElement('section');column.className='data-bu';
   const heading=document.createElement('h3');heading.textContent=mode+' · 班次计划 '+(forecast?.result.plan??'未导入');column.append(heading);
   if(forecast){
    const note=document.createElement('p');
    const d=forecast.result.diagnostic;
    note.textContent='预计 NG：BD '+d.BD.count+' / POL '+d.POL.count+' / 过判 '+d.REVIEW.count+' / 膜 '+d.FILM.count;
    if(forecast.result.rejected.length)note.textContent+='；'+forecast.result.rejected.length+' 条计划记录未参与（型号规则或尺寸范围）';
    if(forecast.unrouted.length){
     const unresolved=forecast.unrouted.reduce((sum,b)=>sum+b.count,0);
     note.textContent+='；未分配 '+unresolved+' 片：'+forecast.unrouted.slice(0,4).map(b=>b.model).join('、')+'（型号规则未命中）';
    }
    column.append(note);
   }
   const table=document.createElement('table');table.dataset.bu=mode;
   table.innerHTML='<thead><tr><th>岗位</th><th>期初 WIP</th><th>预计新增工作量</th><th>目标期末 WIP</th><th>总工作量／说明</th></tr></thead>';
   const rows=table.createTBody();
   for(const stage of visibleTowers(scenario)){
    const row=rows.insertRow();row.dataset.stage=stage;
    const op=dateMatched?rw?.opening[mode]:undefined,cof=cofByShift.get(settingsKey)??2,w=workload(op,forecast?.values,cof),split=forecast?.inspections[stage];
    const partial=(a:number|undefined,b:number|undefined)=>a===undefined||b===undefined||!forecast?' · 部分来源未导入':'';
    const added=forecast?.values[stage]??0;
    const estimated=!forecast?undefined:forecast.pending.has(stage)?(added?added+' + 待确认':'待确认路线'):stage==='TAPE'?added*cof+' COF':added;
    const showOut=stage==='VI'||stage==='OC_VI';
    const outOpening=showOut&&op?.OUT!==undefined?'待 OUT '+op.OUT:undefined;
    const outTarget=showOut&&shownTargets[mode].OUT!==undefined?'待 OUT '+shownTargets[mode].OUT:undefined;
    const opening=stage==='BUBBLE'?w.bubbleOpening:op?.[stage],target=stage==='BUBBLE'&&dateMatched?0:shownTargets[mode]?.[stage];
    const detail=stage==='TAPE'?(w.tape===undefined?'未导入':'总计 '+w.tape+' COF（含期初，'+cof+'/片）'+partial(op?.REMOVE,op?.BD)):stage==='BUBBLE'?(w.bubble===undefined?'未导入':w.bubble+' 片次'+partial(op?.PEEL,op?.POL)):split?'NDF '+split.ndf+' / 维修后 '+split.repair+'；OUT 按结算统计':'—';
    const v=[stageLabel(stage,scenario),outOpening?'待检 '+(opening??'未导入')+' / '+outOpening:opening,estimated,outTarget?'待检 '+(target??'未导入')+' / '+outTarget:target,detail];
    for(const cell of v)row.insertCell().textContent=String(cell??'未导入');
   }
   column.append(table);body.append(column);
  }
  if(rw?.warnings.length){const note=document.createElement('p');note.textContent=rw.warnings.join('；');body.append(note);}
  $('data-pending').hidden=!draft;
  $('data-preview-label').textContent=draft?.kind==='combined'?'合并文件预览：日报与计划将一次确认。':draft?.kind==='report'?'旧版日报预览：文件不含生产计划；确认后预计新增 NG 显示未导入。':draft?'仅生产计划预览：保留已确认的日报快照。':'';
 }
 function commit(mode:Mode,workShift:Shift,key:string,rw:RwSnapshot|undefined,p:RwPlan|undefined){
  rememberCof();const current=session.scenario,keep=(current.mode??'TV')===mode&&(current.date===key||!current.date);
  const base=keep&&!current.synthetic?{...clone(current),shift:workShift,date:key}:shiftScenario(mode,workShift,key);
  base.cofPerPiece=cofByShift.get(cofKey(mode,workShift,key))??2;
  base.polRatios=polByShift.get(cofKey(mode,workShift,key));
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
  shift.value=s.shift??'DAY';rememberCof();
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
   const answer=(id:string)=>{const input=$<HTMLInputElement>(id);if(!input.validity.valid)throw Error('POL 比例须在 0～100%');return input.value===''?undefined:input.valueAsNumber/100;};
   const confirmIn=$<HTMLInputElement>('data-confirm-in').checked;
   if(!session.scenario.inConfirmed&&!confirmIn)throw Error('请先核对独立新增 IN 口径');
   const cutRatio=answer('data-route-cut'),blackRatio=answer('data-route-black');
   session.confirmProductionConditions({confirmIn,cutRatio,blackRatio});
   const s=session.scenario,key=cofKey(s.mode??'TV',s.shift??'DAY',dateValue());
   polByShift.set(key,{...polByShift.get(key),...(cutRatio===undefined?{}:{cutRatio}),...(blackRatio===undefined?{}:{blackRatio})});
   changed();rememberCof();resetConditions();error('开战条件已确认。');show();
  }catch(e){error(e);}
 };
 function resetConditions(){
  $<HTMLInputElement>('data-confirm-in').checked=false;
  $<HTMLSelectElement>('data-route-cut').value='';$<HTMLSelectElement>('data-route-black').value='';
 }
 function select(){try{resetConditions();error('');if(!draft&&(snapshot||plan)){commit(session.scenario.mode??'TV',selectedShift(),dateValue(),snapshot,plan);changed();}show();}catch(e){error(e);}}
 date.onchange=()=>{if(!draft?.rw)select();};shift.onchange=select;
 return {hasData:()=>!!(snapshot||plan),load:(mode:Mode,workShift:Shift,key:string)=>commit(mode,workShift,key,snapshot,plan)};
}
