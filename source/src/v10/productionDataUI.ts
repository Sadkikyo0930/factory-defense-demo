import type {BattleSession} from './session';
import {attachProduction,baselineValues,confirmRwTargets,projected,readProductionImport,type ProductionImport,type RwPlan,type RwSnapshot} from './productionData';
import {shiftScenario,validPlanDate,type Shift} from './plan';
import {clone,stageLabel,visibleTowers,type Mode} from './spec';
import type {TargetBaseline} from './targetBaseline';

export function setupDataCenter(session:BattleSession,changed:()=>void){
 const dialog=document.createElement('dialog');dialog.id='production-data';
 dialog.innerHTML=`<div class="dialog-heading"><h2>生产任务数据中心</h2><button id="close-data">关闭</button></div>
 <div class="data-controls"><button id="pick-production">导入今日生产任务</button>
 <label>日期 <input type="date" id="data-date"></label><label>班次 <select id="data-shift"><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label></div>
 <input type="file" id="production-json" accept=".json,application/json" hidden>
 <p id="data-summary"></p><p>预计新增 NG 按首道维修工序展示，非实际 NG；期初 WIP 不按班次拆分。FA、Disa 不进入任务；共享黑胶按 TV 20% / MNT 80%。</p>
 <div id="data-tables"></div>
 <section id="data-pending" hidden><p id="data-preview-label"></p><label>未分型 MNT 期初路线 <select id="mnt-opening-panel"><option value="">不指定</option><option>OC</option><option>LCM</option></select></label>
 <label><input type="checkbox" id="data-save-target"> 确认初始化目标基准（替换需再次确认）</label>
 <label>TV POL 汇总：撕 POL 目标 <input type="number" id="data-tv-peel" min="0" step="1"></label>
 <label>MNT POL 汇总：撕 POL 目标 <input type="number" id="data-mnt-peel" min="0" step="1"></label>
 <button id="data-confirm" class="primary">确认导入</button><button id="data-discard">放弃预览</button></section><p id="data-error" role="alert"></p>`;
 document.body.append(dialog);
 const entry=document.createElement('button');entry.id='import-report';entry.textContent='生产任务数据中心';document.querySelector('header')!.append(entry);
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>dialog.querySelector<T>('#'+id)!;
 const date=$<HTMLInputElement>('data-date'),shift=$<HTMLSelectElement>('data-shift'),panel=$<HTMLSelectElement>('mnt-opening-panel');
 const error=(e:unknown)=>{$('data-error').textContent=e instanceof Error?e.message:String(e);};
 let snapshot:RwSnapshot|undefined,plan:RwPlan|undefined,panelChoice:'OC'|'LCM'|undefined;
 let draft:(ProductionImport&{file:string})|undefined, revision=0;
 let reportFile='',planFile='';
 const dateValue=()=>date.value.replace(/-/g,'');
 const selectedShift=()=>shift.value as Shift;
 const val=(id:string)=>{const input=$<HTMLInputElement>(id);return input.value===''?undefined:Number(input.value);};
 const selectedPlan=()=>draft?.kind==='report'?undefined:(draft?.plan??plan);
 function show(){
  const rw=draft?.rw??snapshot,p=selectedPlan(),upper=session.targetBaseline;
  date.disabled=!!draft?.rw;
  const dateKey=dateValue(),body=$('data-tables');body.replaceChildren();
  if(!validPlanDate(dateKey)){error('请选择有效的任务日期');return;}
  let shownTargets=baselineValues(upper);
  if(draft?.rw?.target&&!upper){
   try{shownTargets=baselineValues(confirmRwTargets(draft.rw.target,draft.rw.date,val('data-tv-peel'),val('data-mnt-peel')));}catch{}
  }
  if(draft?.rw?.target&&$<HTMLInputElement>('data-save-target').checked){
   try{shownTargets=baselineValues(confirmRwTargets(draft.rw.target,draft.rw.date,val('data-tv-peel'),val('data-mnt-peel')));}catch(e){error(e);}
  }
  const dateMatched=rw?.date.replace(/-/g,'')===dateKey;
  $('data-summary').textContent='期初快照：'+(rw?.date??'未导入')+(rw&&!dateMatched?'（与所选日期不同）':'')+' ｜ 目标基准：'+(upper?.date??'未导入')+' ｜ 生产计划：'+(p?(draft?.plan?draft.file:planFile)+'（按日期核对）':'未导入')+' ｜ 日报来源：'+(rw?(draft?.rw?draft.file:reportFile):'未导入')+' ｜ 班次：'+(selectedShift()==='DAY'?'白班':'夜班')+(session.scenario.productionBlock?' ｜ '+session.scenario.productionBlock:'');
  for(const mode of ['TV','MNT'] as const){
   let forecast;try{forecast=projected(p,dateKey,mode,selectedShift());}catch(e){error(e);}
   const scenario=shiftScenario(mode,selectedShift(),dateKey||'20261120');
   const column=document.createElement('section');column.className='data-bu';
   const heading=document.createElement('h3');heading.textContent=mode+' · 班次计划 '+(forecast?.result.plan??'未导入');column.append(heading);
   if(forecast){
    const note=document.createElement('p');
    const d=forecast.result.diagnostic;
    note.textContent='预计 NG：BD '+d.BD.count+' / POL '+d.POL.count+' / 过判 '+d.REVIEW.count+' / 膜 '+d.FILM.count;
    if(forecast.result.rejected.length)note.textContent+='；'+forecast.result.rejected.length+' 条计划记录未参与（型号规则或尺寸范围）';
    if(mode==='MNT'&&forecast.result.batches.some(b=>!p?.rules[b.model]?.panel))note.textContent+='；部分型号未确认 OC / LCM，MNT 预测暂不能开战';
    column.append(note);
   }
   const table=document.createElement('table');table.dataset.bu=mode;
   table.innerHTML='<thead><tr><th>岗位</th><th>期初 WIP</th><th>预计新增 NG</th><th>目标期末 WIP</th></tr></thead>';
   const rows=table.createTBody();
   for(const stage of [...visibleTowers(scenario),'OUT'] as const){
    const row=rows.insertRow();row.dataset.stage=stage;
    const v=[stageLabel(stage,scenario),dateMatched?rw?.opening[mode][stage]:undefined,forecast?.values[stage],shownTargets[mode][stage]];
    for(const cell of v)row.insertCell().textContent=String(cell??'未导入');
   }
   column.append(table);body.append(column);
  }
  if(draft?.rw?.target){
   const details=document.createElement('details');details.open=!upper;
   const summary=document.createElement('summary');summary.textContent='本次日报原始目标（含 POL 汇总）';details.append(summary);
   const list=document.createElement('ul');
   for(const row of draft.rw.target.rows){
    if(!row||typeof row.name!=='string')continue;
    const item=document.createElement('li');item.textContent=row.group+' · '+row.name+'：'+(row.target??'未导入');list.append(item);
   }
   details.append(list);body.append(details);
  }
  $('data-pending').hidden=!draft;
  $('data-preview-label').textContent=draft?.kind==='combined'?'合并文件预览：日报与计划将一次确认。':draft?.kind==='report'?'旧版日报预览：文件不含生产计划；确认后预计新增 NG 显示未导入。':draft?'仅生产计划预览：保留已确认的日报快照。':'';
  for(const id of ['data-save-target','data-tv-peel','data-mnt-peel'])$<HTMLInputElement>(id).disabled=!draft?.rw?.target;
 }
 function commit(mode:Mode,workShift:Shift,key:string,rw:RwSnapshot|undefined,p:RwPlan|undefined,baseline?:TargetBaseline,replace=false,choice=panelChoice){
  const current=session.scenario,keep=(current.mode??'TV')===mode&&(current.date===key||!current.date);
  const base=keep&&!current.synthetic?{...clone(current),shift:workShift,date:key}:shiftScenario(mode,workShift,key);
  session.setProductionScenario(attachProduction(base,rw,p,baseline??session.targetBaseline,choice),baseline,replace,keep);
 }
 function verify(rw:RwSnapshot|undefined,p:RwPlan|undefined,key:string,baseline:TargetBaseline|undefined,choice:'OC'|'LCM'|undefined){
  for(const mode of ['TV','MNT'] as const)for(const sh of ['DAY','NIGHT'] as const)
   attachProduction(shiftScenario(mode,sh,key),rw,p,baseline,choice);
 }
 function resetSelection(){
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
    panel.value=panelChoice??'';
    $<HTMLInputElement>('data-tv-peel').value='';
    $<HTMLInputElement>('data-mnt-peel').value='';
    $<HTMLInputElement>('data-save-target').checked=!!draft.rw?.target&&!session.targetBaseline;
    if(draft.rw)date.value=draft.rw.date;
    else if(draft.plan&&!draft.plan.records.some(r=>r.date===dateValue()))date.value=draft.plan.records[0].date.replace(/^(....)(..)(..)$/,'$1-$2-$3');
    show();
   }catch(e){if(token===revision){draft=undefined;resetSelection();show();error(e);}}
  };
 $('data-confirm').onclick=()=>{
  try{
   if(!draft)return;
   const rw=draft.rw??snapshot,p=selectedPlan(),choice=(draft.rw?(panel.value||undefined):panelChoice) as 'OC'|'LCM'|undefined;
   const save=!!draft.rw?.target&&$<HTMLInputElement>('data-save-target').checked,replace=!!session.targetBaseline;
   const next=save?confirmRwTargets(draft.rw!.target!,draft.rw!.date,val('data-tv-peel'),val('data-mnt-peel')):undefined;
   if(next&&replace&&!window.confirm('确定替换已确认的 TV / MNT 目标基准？'))return;
   verify(rw,p,dateValue(),next??session.targetBaseline,choice);
   commit(session.scenario.mode??'TV',selectedShift(),dateValue(),rw,p,next,replace,choice);
   if(draft.rw)reportFile=draft.file;if(draft.plan)planFile=draft.file;else if(!p)planFile='';
   snapshot=rw;plan=p;panelChoice=choice;draft=undefined;changed();error('已确认导入。');show();
  }catch(e){error(e);}
 };
 for(const id of ['data-save-target','data-tv-peel','data-mnt-peel'])$<HTMLInputElement>(id).onchange=()=>{error('');show();};
 function select(){try{error('');if(!draft&&(snapshot||plan)){commit(session.scenario.mode??'TV',selectedShift(),dateValue(),snapshot,plan);changed();}show();}catch(e){error(e);}}
 date.onchange=()=>{if(!draft?.rw)select();};shift.onchange=select;
 return {hasData:()=>!!(snapshot||plan),load:(mode:Mode,workShift:Shift,key:string)=>commit(mode,workShift,key,snapshot,plan)};
}
