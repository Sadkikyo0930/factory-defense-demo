import {renderResults} from './ResultsView';
import Phaser from 'phaser';
import './style.css';
import {BattleSession} from './session';
import {Battlefield,positions} from './Battlefield';
import {visibleTowers,Step,label,element,colors,assets,stageSlots,clone,automaticBubble,stageLabel,webVersion} from './spec';
import {setupDataCenter} from './productionDataUI';
import {setupModeUI} from './modeUI';
import {rendererChoice,recordRuntime,runtimeError,sampleRuntime} from '../runtime';
const diagnostics=document.getElementById('runtime-diagnostics');
document.title='工厂攻防战 '+webVersion+' · 元素维修防线';document.body.dataset.version='v10';
document.body.innerHTML=`<header><div class="brand"><span class="brand-symbol">⚙</span><div><b>工厂攻防战 <em>${webVersion}</em></b><small>元素维修防线 · 班组布阵演练</small></div></div><div id="phase-label">战前布阵</div><button id="task-settings">任务设置</button><button id="fullscreen">全屏</button></header>
<div id="boot-status" role="status">正在加载元素维修战场…</div>
<section class="mission"><div class="mission-name"><span id="scenario-name"></span><small id="data-source"></small></div><div><small>期初 WIP</small><strong id="opening-count">0</strong><span id="opening-detail"></span></div><div><small>独立新增 IN</small><strong id="in-count">0</strong><span id="in-detail"></span></div><div><small>目标期末 WIP</small><strong id="target-count">0</strong><span>候选规则 · 10 小时同班次</span></div><div class="clock"><small id="clock-title">等待开战</small><strong id="battle-clock">00:05</strong><div class="clock-track"><i id="clock-fill"></i></div></div></section>
<div id="combat-hud"><b>元素维修防线</b><span id="combat-caption">维修军团来袭</span><strong id="combat-clock">00:05</strong></div><main class="battle-layout"><aside class="roster"><div class="roster-heading"><b>元素兵种</b><span id="staff-count">0</span></div><p>按岗位布阵 · 点击 ＋ 或拖到对应阵地</p><div id="element-roster"></div><div class="roster-note">共享脱泡自动生效</div></aside><section id="game" aria-label="Phaser 元素维修塔防战场"></section></main>
<footer><div id="notice" role="status">选择左侧元素，点击阵地编号部署。开战后全部锁定。</div><button id="clear-formation">清空布阵</button><button id="skip-battle" hidden>跳过动画</button><button id="open-result" hidden>查看战绩</button><button id="retry-battle" hidden>同情景重布阵</button><button id="battle-start" class="primary">开战 <small>10h → 5s</small></button></footer>
<dialog id="task-dialog"><div class="dialog-heading"><h2>本班任务</h2><button id="close-task">关闭</button></div><div class="task-fields"><label>COF / 片（演练）<input id="cof" type="number" min="0.1" max="20" step="0.1"></label><label>BD 成功率<input id="yield-bd" type="number" min="0" max="1" step=".01"></label><label>POL 成功率<input id="yield-pol" type="number" min="0" max="1" step=".01"></label><label id="black-ratio-field" hidden>POL 需黑胶比例（演练）<input id="pol-black-ratio" type="number" min="0" max="100" step="any" value="100"></label><label>目标WIP权重<input id="weight-target" type="number" min="0" max="100"></label><label>精益兵力权重<input id="weight-staff" type="number" min="0" max="100"></label><label>有效OUT权重<input id="weight-out" type="number" min="0" max="100"></label></div><p id="task-error" role="alert"></p><button id="apply-task" class="primary">保存本班任务</button></dialog>
<dialog id="battle-result"><div class="dialog-heading"><h2>本班战绩</h2><button id="close-result">收起战绩</button></div><div id="result-content"></div><div class="result-actions"><button id="export-result">下载本局复盘 JSON</button><button id="result-retry" class="primary">同情景重布阵再战</button></div></dialog>`;
if(diagnostics)document.body.append(diagnostics);
const session=new BattleSession(),scene=new Battlefield(session),$=(id:string)=>document.getElementById(id)!;
const dialog=(id:string)=>$(id) as HTMLDialogElement;
const number=(id:string)=>Number(($(id) as HTMLInputElement).value);
const say=(e:unknown)=>{$('notice').textContent=e instanceof Error?e.message:String(e);};scene.onError=say;
const choice=rendererChoice(new URLSearchParams(location.search).get('renderer')==='canvas');
const game=new Phaser.Game({canvas:choice.canvas,context:choice.context as unknown as CanvasRenderingContext2D,type:choice.webgl?Phaser.WEBGL:Phaser.CANVAS,parent:'game',backgroundColor:'#0a1d3a',scene,scale:{mode:Phaser.Scale.RESIZE,width:$('game').clientWidth,height:$('game').clientHeight},fps:{target:30,limit:30,smoothStep:true},render:{antialias:true,powerPreference:'low-power'}});
function assigned(){return Object.values(session.formation).reduce((n,a)=>n+(a?.length||0),0);}
function change(stage:Step,delta:number){
 try{
  if(stage==='BUBBLE'){
   if(automaticBubble(session.scenario))return;
   if(session.bubbleOperatorDeployed===(delta>0))throw Error(delta>0?'脱泡角色已部署':'脱泡角色尚未部署');
   session.setBubbleOperator(delta>0);
  }else{
   const list=session.formation[stage]||[];
   const slot=delta>0?Array.from({length:stageSlots(stage,session.scenario)},(_,i)=>i+1).find(i=>!list.includes(i)):list[list.length-1];
   if(slot===undefined)throw Error(delta>0?'该岗位已无可用设备槽':'该岗位尚未部署');
   session.setSlot(stage,slot,delta>0);
  }
  scene.refresh();
  refresh();
 }catch(e){say(e);}
}
let rosterKey='';function renderRoster(){const list=visibleTowers(session.scenario),key=(session.scenario.mode??'TV')+':'+list.join(',');if(key===rosterKey)return;rosterKey=key;$('element-roster').replaceChildren();for(const stage of list){const row=document.createElement('div');row.className='element-row';row.dataset.stage=stage;row.classList.toggle('selected',stage===scene.selected);const color='#'+colors[stage].toString(16).padStart(6,'0');row.style.setProperty('--element',color);
 const name=stageLabel(stage,session.scenario);const portrait=stage==='BUBBLE'?'v10/bubble-operator.png':`v05/roles/sprites/${assets[stage]}.png`;
 if(stage==='BUBBLE'&&automaticBubble(session.scenario)){row.textContent='共享脱 POL · 自动生效';$('element-roster').append(row);continue;}
 row.innerHTML=`<button class="element-select" data-select="${stage}" aria-pressed="${stage===scene.selected}"><span class="element-glyph">${element[stage]}</span><img src="${portrait}" alt=""><span>${name}</span></button><button data-minus="${stage}" aria-label="撤下${name}">−</button><strong id="count-${stage}">0</strong><button data-plus="${stage}" aria-label="部署${name}">＋</button>`;
 const button=row.querySelector<HTMLButtonElement>('[data-select]')!;const select=()=>{if(session.phase!=='setup')return;scene.selected=stage;document.querySelectorAll('.element-row').forEach(e=>{const selected=(e as HTMLElement).dataset.stage===stage;e.classList.toggle('selected',selected);e.querySelector('[data-select]')?.setAttribute('aria-pressed',String(selected));});};button.onclick=select;
 let drag:{x:number;y:number}|undefined;button.onpointerdown=e=>{if(session.phase!=='setup')return;select();drag={x:e.clientX,y:e.clientY};button.setPointerCapture(e.pointerId);};button.onpointerup=e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>12;drag=undefined;if(!moved)return;try{if(session.phase!=='setup')throw Error('开战后布阵已锁定');const rect=game.canvas.getBoundingClientRect(),wx=(e.clientX-rect.left-scene.world.x)/scene.world.scaleX,wy=(e.clientY-rect.top-scene.world.y)/scene.world.scaleY;const target=Object.entries(positions).filter(([key])=>visibleTowers(session.scenario).includes(key as Step)).find(([,p])=>Math.abs(p[0]-wx)<65&&Math.abs(p[1]-wy)<65);if(!target||target[0]!==stage)throw Error('请拖到对应元素的岗位阵地');change(stage,1);}catch(err){say(err);}};
 row.querySelector<HTMLButtonElement>('[data-plus]')?.addEventListener('click',()=>change(stage,1));row.querySelector<HTMLButtonElement>('[data-minus]')?.addEventListener('click',()=>change(stage,-1));$('element-roster').append(row);
}
};const refreshGame=()=>{scene.refresh();refresh();};const dataCenter=setupDataCenter(session,refreshGame);const modes=setupModeUI(session,refreshGame,say,dataCenter);let uiPhase='',lastTick=0;
function plusRow(stage:Step){return document.querySelector<HTMLElement>('.element-row[data-stage='+stage+']');}
function refresh(){const s=session.scenario,phase=session.phase;renderRoster();modes.update();document.body.dataset.phase=phase;$('staff-count').textContent=String(assigned());$('scenario-name').textContent=s.name;$('data-source').textContent=s.synthetic?'SYNTHETIC · 不用于正式绩效':'日报快照 · 产能/成功率仍待验收';$('opening-count').textContent=String(s.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0));$('in-count').textContent=String(s.lots.filter(l=>l.source==='external').reduce((n,l)=>n+l.count,0));$('target-count').textContent=Object.keys(s.targets).length?'≤ '+Object.values(s.targets).reduce((n,v)=>n+(v||0),0):'待确认';$('opening-detail').textContent='含各工序独立存量 · FA '+s.rawFA+' 另存';$('in-detail').textContent=s.inConfirmed?'已确认独立投入，不重复计入流入':'IN口径待确认，开战已阻断';

 $('phase-label').textContent=phase==='setup'?'① 战前布阵':phase==='battle'?'② 自动战斗 · 已锁定':'③ 本班结算';
 for(const b of document.querySelectorAll<HTMLButtonElement>('.roster button,#clear-formation,#task-settings,#import-report,#battle-start'))b.disabled=phase!=='setup';
 const formation=session.formation;
 for(const stage of visibleTowers(s)){
  const isBubble=stage==='BUBBLE';if(isBubble&&automaticBubble(s))continue;
  const count=isBubble?Number(session.bubbleOperatorDeployed):formation[stage]?.length||0;
  const full=count>=stageSlots(stage,s);
  const plus=document.querySelector<HTMLButtonElement>('[data-plus='+stage+']')!;
  const minus=document.querySelector<HTMLButtonElement>('[data-minus='+stage+']')!;
  $('count-'+stage).textContent=String(count);
  let choices=document.querySelector<HTMLElement>('[data-hours="'+stage+'"]');
  if(!choices){choices=document.createElement('span');choices.className='soldier-hours';choices.dataset.hours=stage;plusRow(stage)?.append(choices);}
  const key=(formation[stage]||[]).map(slot=>slot+':'+(s.workHours?.[stage+'-'+slot]??10)).join(',')+':'+phase;
  if(choices.dataset.key!==key){choices.dataset.key=key;choices.replaceChildren();for(const slot of formation[stage]||[]){const field=document.createElement('select');field.setAttribute('aria-label',stageLabel(stage,s)+' 小兵'+slot+'班次');for(const [value,text] of [[10,'D'],[8,'A'],[4,'0.5'],[0,'撤']] as const){const option=document.createElement('option');option.value=String(value);option.textContent=text;field.append(option);}field.title='小兵'+slot+'：D班10h / A班8h / 0.5班4h';field.value=String(s.workHours?.[stage+'-'+slot]??10);field.disabled=phase!=='setup';field.onchange=()=>{try{if(field.value==='0')session.setSlot(stage,slot,false);else session.setSlotHours(stage,slot,Number(field.value) as 4|8|10);scene.refresh();refresh();}catch(e){say(e);}};choices.append(field);}}

  plus.disabled=phase!=='setup'||full;
  minus.disabled=phase!=='setup'||count===0;
  const reason=full?'工位已满':isBubble?'部署角色':'可部署';
  plus.title=reason;
  plus.setAttribute('aria-label',stageLabel(stage,s)+' · '+reason);
  plus.closest('.element-row')?.setAttribute('data-limit',full?'工位满':'');
 }
 $('open-result').hidden=phase!=='result';$('battle-start').hidden=phase!=='setup';$('skip-battle').hidden=phase!=='battle';$('retry-battle').hidden=phase!=='result';
 if(phase==='battle'){$('combat-clock').textContent='00:'+Math.max(0,5-Math.floor(scene.progress*5)).toString().padStart(2,'0');$('combat-caption').textContent=scene.progress<.2?'首波来袭':scene.progress<.5?'守住阵地':scene.progress<.88?'增援突进':'战斗收尾';$('battle-clock').textContent='00:'+Math.max(0,5-Math.floor(scene.progress*5)).toString().padStart(2,'0');$('clock-fill').style.width=(100*(1-scene.progress))+'%';$('clock-title').textContent='10 小时班次可视化';}
 else{$('clock-title').textContent=phase==='setup'?'等待开战':'班次结算完成';$('battle-clock').textContent=phase==='setup'?'00:05':'10:00h';$('clock-fill').style.width=phase==='setup'?'100%':'0%';}
 if(uiPhase!==phase){uiPhase=phase;if(phase==='battle')$('combat-hud').append($('skip-battle'));else document.querySelector('footer')!.insertBefore($('skip-battle'),$('retry-battle'));if(phase==='battle')$('notice').textContent='布阵已锁定';}
}
scene.onChange=()=>{if(performance.now()-lastTick>90){lastTick=performance.now();refresh();}};
function start(){try{session.begin();refresh();resize();scene.start();return true;}catch(e){session.cancelFailedPresentation();scene.refresh();refresh();say(e);throw e;}}
$('battle-start').onclick=()=>modes.begin(start);
$('clear-formation').onclick=()=>{try{session.clear();scene.refresh();refresh();}catch(e){say(e);}};
function retry(){try{session.retry();dialog('battle-result').close();scene.progress=0;scene.refresh();refresh();say('已恢复原始情景，可调整布阵；没有把期末 WIP 作为新期初。');}catch(e){say(e);}}
$('retry-battle').onclick=retry;$('result-retry').onclick=retry;
$('skip-battle').onclick=()=>{try{scene.progress=1;scene.animateBattle(1);session.finish();showResult();}catch(e){say(e);}};
function showResult(){void modes.finish();refresh();renderResults($('result-content'),session.result!,session.scenario);if(!dialog('battle-result').open)dialog('battle-result').showModal();say('本班结算完成，可展开详细复盘或同任务重布阵。');}
$('open-result').onclick=showResult;
scene.onFinish=showResult;$('close-result').onclick=()=>dialog('battle-result').close();
$('export-result').onclick=()=>{if(!session.result)return;const blob=new Blob([JSON.stringify(session.result,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='factory-v10-battle-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const ratioField=$('black-ratio-field');
ratioField.replaceChildren('黑胶比例（%）',ratioField.querySelector('input')!);
const cutField=document.createElement('label');cutField.id='cut-ratio-field';
cutField.innerHTML='MNT切割比例（%）<input id="pol-cut-ratio" type="number" min="0" max="100" step="any" value="30">';
ratioField.after(cutField);

function openTask(){
 if(session.phase!=='setup'){say('开战后任务参数已锁定');return;}
 const s=session.scenario,ratios=dataCenter.ratiosFor(s);
 $('task-error').textContent='';
 ratioField.hidden=false;cutField.hidden=s.mode!=='MNT';

 for(const [id,value] of Object.entries({cof:dataCenter.cofFor(s),'yield-bd':s.yield.BD,'yield-pol':s.yield.POL,'weight-target':s.weights.target,'weight-staff':s.weights.staff,'weight-out':s.weights.out,'pol-black-ratio':ratios.blackRatio*100,'pol-cut-ratio':ratios.cutRatio*100}))($(id) as HTMLInputElement).value=String(value);
 dialog('task-dialog').showModal();
}
$('task-settings').onclick=openTask;
$('close-task').onclick=()=>dialog('task-dialog').close();
$('apply-task').onclick=()=>{
 try{
  const s=clone(session.scenario);
  const read=(id:string)=>{const input=$(id) as HTMLInputElement;if(input.value===''||!input.validity.valid)throw Error('请检查设置：'+input.closest('label')?.textContent?.trim());return number(id);};
  s.yield.BD=read('yield-bd');s.yield.POL=read('yield-pol');
  s.weights={target:read('weight-target'),staff:read('weight-staff'),out:read('weight-out')};
  const cof=read('cof');s.cofPerPiece=cof;for(const lot of s.lots)lot.cof=cof;
  dataCenter.saveTask(s,{blackRatio:read('pol-black-ratio')/100,cutRatio:s.mode==='MNT'?read('pol-cut-ratio')/100:dataCenter.ratiosFor(s).cutRatio});
  dialog('task-dialog').close();scene.refresh();refresh();say('本班参数已保存。');
 }catch(e){$('task-error').textContent=(e as Error).message;}
};
// Disabled controls and API guards both apply; synthetic DOM events cannot bypass phase checks.
document.addEventListener('click',e=>{if(session.phase==='setup')return;const target=(e.target as Element).closest?.('#import-report,#data-confirm,#data-confirm-conditions,#apply-task');if(target){e.preventDefault();e.stopImmediatePropagation();say('开战后导入及任务参数已锁定');}},true);
document.addEventListener('change',e=>{if(session.phase!=='setup'&&(e.target as HTMLElement).id==='report-file'){e.stopImmediatePropagation();(e.target as HTMLInputElement).value='';}},true);
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen();};
const resize=()=>{const rect=$('game').getBoundingClientRect();game.scale.resize(rect.width,rect.height);};window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe($('game'));
choice.canvas.addEventListener('webglcontextlost',()=>runtimeError('WebGL上下文丢失；已计算的战绩不会改变，可刷新后重新进入演练'));
sampleRuntime(()=>({version:webVersion,phase:session.phase,renderer:choice.webgl?'WebGL':'Canvas',sprites:scene.units.length+scene.monsters.length}));recordRuntime('version',webVersion);refresh();
if(new URLSearchParams(location.search).has('qa'))Object.assign(window,{v10Session:session,v10Game:game,v10Scene:scene});
