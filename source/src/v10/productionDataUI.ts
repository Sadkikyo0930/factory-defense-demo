import type {BattleSession} from './session';
import {attachProduction,projected,readProductionImport,workload,type ProductionImport,type RwPlan,type RwSnapshot} from './productionData';
import {shiftScenario,validPlanDate,type Shift} from './plan';
import {clone,stageLabel,visibleTowers,type Mode} from './spec';


export function setupDataCenter(session:BattleSession,changed:()=>void){
 const dialog=document.createElement('dialog');dialog.id='production-data';
 dialog.innerHTML=`<div class="dialog-heading"><h2>生产任务数据中心 <small id="data-version">V1.0-rw38.2</small></h2><button id="close-data">关闭</button></div>
 <div class="data-controls"><button id="pick-production">导入今日生产任务</button>
 <label>日期 <input type="date" id="data-date"></label><label>班次 <select id="data-shift"><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label></div>
 <input type="file" id="production-json" accept=".json,application/json" hidden>
 <p id="data-summary"></p><p>预计新增 NG 按首道维修工序展示，非实际 NG；期初 WIP 不按班次拆分。FA、Disa 不进入任务；共享黑胶按 TV 20% / MNT 80%。</p>
 <section id="data-conditions" hidden><h3>开战前确认</h3>
 <label id="data-confirm-in-field"><input type="checkbox" id="data-confirm-in"> 确认已有独立新增 IN 口径（没有则保持 0；不会生成新增量）</label>
 <label id="data-cut-field">未指定的 POL 切割条件 <select id="data-route-cut"><option value="">请选择</option><option value="no">不切割</option><option value="yes">需要切割</option></select></label>
 <label id="data-black-field">未指定的 POL 黑胶条件 <select id="data-route-black"><option value="">请选择</option><option value="no">不走黑胶</option><option value="yes">需要黑胶</option></select></label>
 <button id="data-confirm-conditions">确认开战条件</button></section>
 <div id="data-tables"></div>
 <section id="data-pending" hidden><p id="data-preview-label"></p><div id="data-ndf-routes"></div>
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
 const cofKey=(mode:Mode,sh:Shift,key:string)=>[mode,sh,key].join(':');
 const rememberCof=()=>{const s=session.scenario;if(s.cofPerPiece!==undefined)cofByShift.set(cofKey(s.mode??'TV',s.shift??'DAY',s.date??dateValue()),s.cofPerPiece);};
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
   let forecast:ReturnType<typeof projected>;try{forecast=projected(p,dateKey,mode,selectedShift());}catch(e){error(e);}
   const scenario=shiftScenario(mode,selectedShift(),dateKey||'20261120');
   const column=document.createElement('section');column.className='data-bu';
   const heading=document.createElement('h3');heading.textContent=mode+' · 班次计划 '+(forecast?.result.plan??'未导入');column.append(heading);
   if(forecast){
    const note=document.createElement('p');
    const d=forecast.result.diagnostic;
    note.textContent='预计 NG：BD '+d.BD.count+' / POL '+d.POL.count+' / 过判 '+d.REVIEW.count+' / 膜 '+d.FILM.count;
    if(forecast.result.rejected.length)note.textContent+='；'+forecast.result.rejected.length+' 条计划记录未参与（型号规则或尺寸范围）';
    if(mode==='MNT'&&forecast.result.batches.some(b=>b.kind==='REVIEW'&&!p?.rules[b.model]?.panel))note.textContent+='；部分 NDF 型号未确认 OC / LCM，MNT 预测暂不能开战';
    column.append(note);
   }
   const table=document.createElement('table');table.dataset.bu=mode;
   table.innerHTML='<thead><tr><th>岗位</th><th>期初 WIP</th><th>预计新增 NG</th><th>目标期末 WIP</th><th>工作量</th></tr></thead>';
   const rows=table.createTBody();
   for(const stage of [...visibleTowers(scenario),'OUT'] as const){
    const row=rows.insertRow();row.dataset.stage=stage;
    const op=dateMatched?rw?.opening[mode]:undefined,cof=cofByShift.get(cofKey(mode,selectedShift(),dateKey))??2,w=workload(op,forecast?.values,cof);
    const partial=(a:number|undefined,b:number|undefined)=>a===undefined||b===undefined||!forecast?' · 部分来源未导入':'';
    const v=[stageLabel(stage,scenario),stage==='BUBBLE'?w.bubbleOpening:op?.[stage],forecast?(forecast.values[stage]??((mode==='MNT'&&['OC_VI','LCM_VI'].includes(stage))?'待确认路线':'无直接新增 NG')):undefined,stage==='BUBBLE'&&dateMatched?0:shownTargets[mode]?.[stage],stage==='TAPE'?(w.tape===undefined?'未导入':w.tape+' COF（'+cof+'/片）'+partial(op?.REMOVE,op?.BD)):stage==='BUBBLE'?(w.bubble===undefined?'未导入':w.bubble+' 片次'+partial(op?.PEEL,op?.POL)):'—'];
    for(const cell of v)row.insertCell().textContent=String(cell??'未导入');
   }
   column.append(table);body.append(column);
  }
  if(rw?.warnings.length){const note=document.createElement('p');note.textContent=rw.warnings.join('；');body.append(note);}
  const routes=$('data-ndf-routes');routes.replaceChildren();
  if(draft?.plan){
   const models=new Set<string>();
   for(const sh of ['DAY','NIGHT'] as const){
    try{for(const b of projected(draft.plan,dateKey,'MNT',sh)?.result.batches??[])if(b.kind==='REVIEW')models.add(b.model);}catch(e){error(e);}
   }
   for(const model of models){
    const label=document.createElement('label');label.textContent='NDF '+model+' ';
    const select=document.createElement('select');
    for(const value of ['','OC','LCM'])select.add(new Option(value||'待确认路线',value));
    select.value=draft.plan.rules[model]?.panel??'';
    select.onchange=()=>{if(!draft?.plan)return;draft.plan.rules[model]={...draft.plan.rules[model],panel:(select.value||undefined) as 'OC'|'LCM'|undefined};show();};
    label.append(select);routes.append(label);
   }
  }
  $('data-pending').hidden=!draft;
  $('data-preview-label').textContent=draft?.kind==='combined'?'合并文件预览：日报与计划将一次确认。':draft?.kind==='report'?'旧版日报预览：文件不含生产计划；确认后预计新增 NG 显示未导入。':draft?'仅生产计划预览：保留已确认的日报快照。':'';
 }
 function commit(mode:Mode,workShift:Shift,key:string,rw:RwSnapshot|undefined,p:RwPlan|undefined){
  rememberCof();const current=session.scenario,keep=(current.mode??'TV')===mode&&(current.date===key||!current.date);
  const base=keep&&!current.synthetic?{...clone(current),shift:workShift,date:key}:shiftScenario(mode,workShift,key);
  base.cofPerPiece=cofByShift.get(cofKey(mode,workShift,key))??2;
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
   const answer=(id:string)=>{const value=$<HTMLSelectElement>(id).value;return value===''?undefined:value==='yes';};
   const confirmIn=$<HTMLInputElement>('data-confirm-in').checked;
   if(!session.scenario.inConfirmed&&!confirmIn)throw Error('请先核对独立新增 IN 口径');
   session.confirmProductionConditions({confirmIn,cut:answer('data-route-cut'),black:answer('data-route-black')});
   changed();resetConditions();error('开战条件已确认。');show();
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
