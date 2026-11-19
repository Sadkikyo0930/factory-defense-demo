import {readTargetInput} from './targetBaseline';
import type {BattleSession} from './session';
import type {ReportPreview,WipSnapshot} from '../report';
import {normalize} from '../report';

export function targetImportControls(session:BattleSession){
 const panel=document.createElement('fieldset');panel.hidden=true;
 return {
  mount(dialog:HTMLDialogElement){dialog.querySelector('#confirm-import')!.before(panel);},
  render(preview:ReportPreview){
   panel.replaceChildren();const baseline=session.targetBaseline;
   panel.hidden=preview.targetBaseline===undefined&&!baseline&&!session.targetBaselineProblem;
   if(panel.hidden)return;
   const add=(tag:string,value:string)=>{const el=document.createElement(tag);el.textContent=value;panel.append(el);return el;};
   add('legend','TV / MNT 期末目标基准');
   add('p',baseline?'已保存 '+baseline.date+' 目标；本次默认只更新 WIP。MNT 不参与本局。':'尚无已确认目标，本次可继续只导入 WIP。'+session.targetBaselineProblem);
   if(preview.targetBaseline===undefined)return;
   let input;
   try{input=readTargetInput(preview.targetBaseline);}catch(e){add('p','目标不可初始化：'+(e as Error).message);return;}
   const detail=add('details','') as HTMLDetailsElement;detail.open=!baseline;
   const summary=document.createElement('summary');summary.textContent='查看日报目标与今日 WIP';detail.append(summary);
   for(const group of ['TV','MNT','SHARED']){
    const title=document.createElement('h3');title.textContent=group+(group==='MNT'?' · 独立保存':group==='TV'?' · 游戏目标':' · 不自动归属');detail.append(title);
    const list=document.createElement('ul');for(const r of input.rows.filter(r=>r.group===group)){
     const item=document.createElement('li');item.textContent=r.name+' · 今日 '+(r.today??'缺失')+' · 目标 '+(r.target??'缺失')+(r.row&&r.column?' · R'+r.row+'C'+r.column:'');list.append(item);
    }detail.append(list);
   }
   const choice=document.createElement('input');choice.type='checkbox';choice.id='init-target-baseline';
   const label=add('label',baseline?' 重新初始化目标（将再次确认）':' 首次确认并保存 TV / MNT 目标');label.prepend(choice);
   const pol=input.rows.some(r=>r.group==='TV'&&/^(TV)?POL$/.test(normalize(r.name))&&r.target!==null);
   if(pol){const label=add('label','TV POL 汇总中分给撕 POL 的目标片数（其余给贴 POL）');const field=document.createElement('input');field.type='number';field.min='0';field.step='1';field.id='target-peel-count';label.append(field);}
  },
  apply(snapshot:WipSnapshot,preview:ReportPreview){
   if(!panel.querySelector<HTMLInputElement>('#init-target-baseline')?.checked){session.applyInitialWip(snapshot);return;}
   const input=readTargetInput(preview.targetBaseline),replace=!!session.targetBaseline;
   const raw=panel.querySelector<HTMLInputElement>('#target-peel-count')?.value;
   if(replace&&!window.confirm('确定替换已确认的 TV / MNT 目标基准？'))throw Error('已取消重新初始化');
   session.applyInitialWip(snapshot,{input,replace,peelTarget:raw?.trim()?Number(raw):undefined});
  }
 };
}
