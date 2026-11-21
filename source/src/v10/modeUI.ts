import type {BattleSession} from './session';
import {shiftScenario,type Shift} from './plan';
import type {Mode} from './spec';
import {challengeId, makeScore, playerName, scoreRepository, type ScoreRecord} from './scores';

export function setupModeUI(session:BattleSession,refresh:()=>void,say:(e:unknown)=>void,data?:{load(mode:Mode,shift:Shift,date:string):void}){
 const bar=document.createElement('section');bar.className='mode-controls';
 bar.innerHTML='<label>BU <select id="bu-mode"><option>TV</option><option>MNT</option></select></label><label>班次 <select id="work-shift"><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label><label>演练日期 <input id="scenario-date" type="date"></label><button id="score-history">历史成绩</button><span id="ng-summary"></span>';
 document.querySelector('header')!.after(bar);
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 const date=$<HTMLInputElement>('scenario-date');date.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 const loadMode=()=>{
  try{
   if(session.phase!=='setup')throw Error('请先返回布阵');
   const mode=$<HTMLSelectElement>('bu-mode').value as Mode,shift=$<HTMLSelectElement>('work-shift').value as Shift,key=date.value.replace(/-/g,'');
   if(data)data.load(mode,shift,key);else session.setScenario(shiftScenario(mode,shift,key));
   refresh();
  }catch(e){say(e);}
 };
 $('work-shift').onchange=loadMode;
 date.onchange=()=>{if(date.value)loadMode();};
 $('bu-mode').onchange=loadMode;
 const player=document.createElement('dialog');
 player.innerHTML='<form><h2>本次挑战姓名</h2><p>姓名用于记录，非认证身份。</p><label>姓名 <input id="challenge-player" maxlength="24" required></label><p id="player-error" role="alert"></p><button type="button" id="cancel-player">取消</button><button type="submit">确认开战</button></form>';
 document.body.append(player);
 const history=document.createElement('dialog');history.id='history-dialog';
 history.innerHTML='<h2>历史成绩</h2><p>各任务、日期及配置不同，成绩不构成同一排名。</p><form><label>姓名 <input id="score-name" maxlength="24"></label><label>BU <select id="score-bu"><option value="">全部</option><option>TV</option><option>MNT</option></select></label><label>班次 <select id="score-shift"><option value="">全部</option><option value="DAY">白班</option><option value="NIGHT">夜班</option></select></label><button>查询</button><button type="button" id="history-close">关闭</button></form><p id="history-status" role="status"></p><ol id="history-items"></ol>';
 document.body.append(history);
 const status=document.createElement('p');status.id='score-save-status';status.setAttribute('role','status');
 $('battle-result').append(status);
 const repo=scoreRepository();let active:{id:string;player:string}|undefined;
 let completed:ScoreRecord|undefined, saving=false,saved=false,run:(()=>boolean)|undefined;
 $('cancel-player').onclick=()=>player.close();
 const name=$<HTMLInputElement>('challenge-player');
 player.querySelector('form')!.onsubmit=e=>{
  e.preventDefault();try{
   const who=playerName(name.value),id=challengeId();
   active={id,player:who};completed=undefined;saving=false;saved=false;status.textContent='';
   if(!run?.())throw Error('开战未成功，请检查当前任务状态');
   player.close();
  }catch(err){active=undefined;$('player-error').textContent=err instanceof Error?err.message:String(err);}
 };
 async function historyLoad(){
  const notice=$('history-status'),list=$('history-items');list.replaceChildren();notice.textContent='正在查询共享成绩库…';
  try{
   const raw=$<HTMLInputElement>('score-name').value.trim(),records=await repo.query({player:raw?playerName(raw):undefined,bu:$<HTMLSelectElement>('score-bu').value,shift:$<HTMLSelectElement>('score-shift').value});
   const aggregate=new Map<string,{count:number;best:number}>();
   for(const r of records){const group=aggregate.get(r.player)??{count:0,best:0};group.count++;group.best=Math.max(group.best,r.total);aggregate.set(r.player,group);}
   notice.textContent=records.length?'显示最近记录；次数与最高分按当前筛选返回的记录统计。':'暂无记录';
   for(const r of records){const li=document.createElement('li'),sum=aggregate.get(r.player)!;li.textContent=r.player+' · '+r.completedAt.slice(0,10)+' · '+r.bu+' '+(r.shift==='DAY'?'白班':'夜班')+' · '+r.total.toFixed(1)+' 分（WIP '+r.target.toFixed(1)+' / 布阵 '+r.staff.toFixed(1)+' / OUT '+r.out.toFixed(1)+'） · '+sum.count+' 次 / 最高 '+sum.best.toFixed(1)+(r.synthetic?' · SYNTHETIC':' · 待确认')+' · '+r.fingerprint;list.append(li);}
  }catch{notice.textContent='无法查询共享成绩库，请确认服务已启动并获授权。';}
 }
 $('score-history').onclick=()=>{history.showModal();void historyLoad();};
 $('history-close').onclick=()=>history.close();
 history.querySelector('form')!.onsubmit=e=>{e.preventDefault();void historyLoad();};
 return {
  begin(start:()=>boolean){run=start;$('player-error').textContent='';player.showModal();},
  update(){
   bar.hidden=session.phase!=='setup';const s=session.scenario; if(s.mode)$<HTMLSelectElement>('bu-mode').value=s.mode;if(s.shift)$<HTMLSelectElement>('work-shift').value=s.shift;if(s.date)date.value=s.date.replace(/^(....)(..)(..)$/,'$1-$2-$3');const data=s.forecast;
   $('ng-summary').textContent=data?(s.synthetic?'SYNTHETIC':'已导入计划 · 预测')+' · 当班计划 '+data.plan+' · BD '+data.amounts.BD+' · POL '+data.amounts.POL+' · 过判 '+data.amounts.REVIEW+' · 膜 '+data.amounts.FILM+'（各类可能重叠）':'未载入预计 NG 演练；当前可使用既有 TV 情景。';
  },
  async finish(){
   if(!active||!session.result||session.phase!=='result'||saving||saved)return;
   if(!completed)completed=makeScore(session.result,active.player,active.id);
   const record=completed;saving=true;status.textContent='正在保存到共享成绩库…';
   try{await repo.save(record);if(completed===record){saved=true;status.textContent='已保存到共享成绩库。';}}
   catch{if(completed===record)status.textContent='成绩尚未保存到共享成绩库。恢复服务后可再次点「查看战绩」重试。';}
   finally{if(completed===record)saving=false;}
  }
 };
}
