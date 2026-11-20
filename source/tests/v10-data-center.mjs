import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {scoreServer} from '../services/scores/server.mjs';
const server=scoreServer({file:':memory:',dist:'dist'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath()});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?qa');
 await page.waitForFunction(()=>window.v10Scene?.ready);
 await page.locator('#import-report').click();
 assert.equal(await page.locator('#production-data input[type=file]').count(),1);
 assert.equal(await page.getByRole('button',{name:'导入今日生产任务'}).count(),1);
 const cells=(bu,stage)=>page.locator('table[data-bu='+bu+'] tr[data-stage='+stage+'] td').allTextContents();
 assert.deepEqual((await cells('TV','BD')).slice(1,4),['未导入','未导入','未导入']);
 assert.equal(await page.locator('#production-data input[type=number]').count(),0);
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.v10Session.scenario)));
 const before=await state();
 const date='2026-11-20';
 const rw={date,rows:[{name:'TV BD',today:10},{name:'MNT BD',today:7},{name:'MNT 切割',today:3},{name:'黑胶',today:41},{name:'FA',today:76},{name:'TV Disa',today:999}],targetBaseline:{version:1,rows:[{name:'BD',group:'TV',target:0},{name:'BD',group:'MNT',target:9},{name:'切割',group:'MNT',target:3},{name:'黑胶',group:'SHARED',target:11}]}};
 async function file(id,obj){await page.locator('#'+id).setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});await page.locator('#data-pending').waitFor();}
 const expected=(qty,rates)=>Object.fromEntries(['POL','BD','NDF','FILM'].map((kind,i)=>[kind,qty*rates[i]/10000]));
 const row=(model,sizeCode,bu,dayQty,nightQty,rates)=>({model,sizeCode,bu,dayQty,nightQty,expectedDay:expected(dayQty,rates),expectedNight:expected(nightQty,rates)});
 const plan={schemaVersion:1,kind:'rw-mdl-plan',date,dateKey:'20261120',rows:[row('AB315AAA1','315','TV',1000,500,[42,86,570,5]),row('AB238AAA1','238','MNT',2000,1000,[33,35,268,4]),row('AB238AAA2','238','MNT',1000,500,[33,35,268,4])]};
 const combined={...rw,productionPlan:plan};
 const inspections=[
  {name:'MNT OC VI / OUT',group:' mnt ',today:4,target:6,row:28,column:12},
  {name:'LCM VI ／ OUT',group:'MNT',today:5,target:7,row:29,column:12},
  {name:'TV VI / OUT',group:'TV',today:2,target:3,row:30,column:12}
 ];
 const repair=[
  {name:'祛除',group:'TV',today:2,target:1},
  {name:'MNT OC 祛除',group:'MNT',today:11,target:4},
  {name:'祛除（LCM）',group:'MNT',today:12,target:5},
  {name:'LCM PI',group:'MNT',today:2,target:1},
  {name:'MNT 撕POL',group:'MNT',today:6,target:1},
  {name:'MNT 贴POL',group:'MNT',today:3,target:2},
  {name:'MNT 脱POL',group:'MNT',today:4,target:7},
  {name:'脱泡',today:666,target:99},
  {name:'其他共享工序',group:'SHARED',today:444,target:88}
 ];
 combined.rows=[...rw.rows,...inspections,...repair];
 combined.targetBaseline={version:1,rows:[...rw.targetBaseline.rows,...inspections,...repair]};
 await file('production-json',combined);assert.deepEqual(await state(),before);
 assert.deepEqual((await cells('MNT','OC_VI')).slice(1,4),['4','待确认路线','6']);
 assert.deepEqual((await cells('MNT','LCM_VI')).slice(1,4),['5','待确认路线','7']);
 assert.equal((await cells('TV','VI'))[1],'2');
 assert.equal((await cells('TV','BD'))[1],'10');assert.equal((await cells('MNT','BD'))[1],'7');
 assert.deepEqual((await cells('MNT','CUT')).slice(1,4),['3','无直接新增 NG','3']);
 assert.equal((await cells('TV','BLACK'))[1],'8');assert.equal((await cells('MNT','BLACK'))[1],'33');
 assert.deepEqual((await cells('MNT','REMOVE')).slice(1,4),['23','10','9']);
 assert.equal((await cells('MNT','TAPE'))[4],'80 COF（2/片）');
 assert.deepEqual((await cells('MNT','BUBBLE')).slice(1),['10','无直接新增 NG','0','19 片次']);
 await page.locator('#data-confirm').click();
 assert.match(await page.locator('#data-error').innerText(),/NDF/);
 assert.deepEqual(await state(),before);
 await page.getByLabel('NDF AB238AAA1').selectOption('LCM');
 await page.getByLabel('NDF AB238AAA2').selectOption('OC');
 await page.locator('#data-confirm').click();
 assert.equal((await state()).lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0),22);
 assert.ok((await state()).lots.some(l=>l.source==='forecast'));
 assert.deepEqual((await cells('TV','REMOVE')).slice(1,3),['2','9']);
 await page.locator('#data-shift').selectOption('NIGHT');
 assert.deepEqual((await cells('TV','REMOVE')).slice(1,3),['2','4']);
 const tv=await state();assert.equal(tv.forecast.plan,500);
 assert.equal(tv.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0),22);
 assert.ok(tv.lots.some(l=>l.source==='forecast'&&l.at>0));
 const invalid={...rw,rows:[...rw.rows,{name:'MNT BD',today:123}]};
 await page.locator('#production-json').setInputFiles({name:'conflict.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('冲突'));
 assert.deepEqual(await state(),tv);
 for(const field of ['rows','targetBaseline']){
  const conflict={name:'MNT OC VI / OUT',group:'TV',row:28,column:12,today:4,target:6};
  const conflicting={...combined,[field]:field==='rows'?[conflict]:{version:1,rows:[conflict]}};
  await page.locator('#production-json').setInputFiles({name:'bu-conflict.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(conflicting))});
  await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('岗位前缀 MNT 与 group TV'));
  assert.match(await page.locator('#data-error').innerText(),/"name":"MNT OC VI \/ OUT","group":"TV","row":28,"column":12/);
  assert.deepEqual(await state(),tv);
 }
 const bad={...combined,productionPlan:{...plan,date:'2026-11-21',dateKey:'20261121'}};
 await page.locator('#production-json').setInputFiles({name:'wrong-date.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('没有日报当天'));
 assert.deepEqual(await state(),tv);
 const corrupt={...combined,productionPlan:{...plan,rows:[{...plan.rows[0],expectedNight:{...plan.rows[0].expectedNight,BD:0}},plan.rows[1]]}};
 await page.locator('#production-json').setInputFiles({name:'bad-ng.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('预测与计划量'));
 assert.deepEqual(await state(),tv);
 const unmapped={...combined,rows:[...combined.rows,{name:'MNT 未知工艺',group:'MNT',today:10}]};
 await file('production-json',unmapped);
 assert.match(await page.locator('#data-tables').innerText(),/未映射：MNT 未知工艺/);
 await page.locator('#data-confirm').click();
 assert.match(await page.locator('#data-error').innerText(),/未映射/);
 assert.deepEqual(await state(),tv);
 await page.locator('#data-discard').click();
 const updated={...combined,rows:combined.rows.map(r=>r.name==='TV BD'?{...r,today:15}:r),
  targetBaseline:{version:1,rows:combined.targetBaseline.rows.map(r=>r.name==='BD'&&r.group==='TV'?{...r,target:20}:r)}};
 const rules={AB238AAA1:{panel:'LCM',cut:true},AB238AAA2:{panel:'OC',cut:true}};
 await file('production-json',{...updated,productionPlan:{...plan,rules}});
 await page.locator('#data-confirm').click();
 assert.equal((await state()).targets.BD,20);
 assert.equal((await state()).forecast.plan,500);
 assert.equal((await cells('TV','BD'))[1],'15');
 const legacy={...rw,rows:[...rw.rows,{name:'TV POL',today:6},{name:'TV POL',today:6}],
  targetBaseline:{version:1,rows:[...rw.targetBaseline.rows,{name:'TV POL',target:10}]}};
 await file('production-json',legacy);
 assert.match(await page.locator('#data-preview-label').innerText(),/不含生产计划/);
 await page.locator('#data-confirm').click();assert.equal((await state()).targets.BD,0);
 assert.equal((await cells('TV','BD'))[1],'10');
 assert.equal((await state()).targets.PEEL,10);
 const aggregate=(await state()).lots.filter(l=>l.kind==='POL'&&['PEEL','POL'].includes(l.stage));
 assert.deepEqual(aggregate.map(l=>[l.stage,l.count]),[['PEEL',6]]);
 assert.equal((await state()).forecast,undefined);
 assert.equal((await cells('TV','REMOVE'))[2],'未导入');
 // V3.7 emits already-allocated black glue rows; the game must not split them again.
 const allocated=['TV','MNT'].map((group,i)=>({name:group+'黑胶',group,today:i?33:8,allocation:'blackGlue-20-80',sourceName:'黑胶'}));
 await file('production-json',{...combined,rows:[...combined.rows.filter(r=>r.name!=='黑胶'),...allocated],productionPlan:{...plan,rules}});
 assert.equal((await cells('TV','BLACK'))[1],'8');assert.equal((await cells('MNT','BLACK'))[1],'33');
 await page.locator('#data-confirm').click();
 await page.locator('#close-data').click();await page.locator('#bu-mode').selectOption('MNT');
 const mnt=await state();assert.equal(mnt.forecast.plan,1500);assert.equal(mnt.targets.BD,9);
 assert.equal(mnt.targets.OC_VI,6);assert.equal(mnt.targets.LCM_VI,7);
 assert.equal(mnt.targets.BUBBLE,0);
 assert.equal(mnt.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0),90);
 assert.equal(mnt.lots.find(l=>l.stage==='BUBBLE'&&l.source==='opening').count,4);
 assert.ok(mnt.lots.every(l=>l.mode==='MNT'));assert.ok(mnt.lots.some(l=>l.stage==='LCM_VI'&&l.source==='forecast'));
 assert.ok(mnt.lots.some(l=>l.stage==='OC_VI'&&l.source==='forecast'));
 assert.ok(mnt.lots.filter(l=>l.kind!=='REVIEW'&&l.source==='forecast').every(l=>l.mntPanel==='OC'));
 await mkdir('artifacts',{recursive:true});await page.locator('#import-report').click();await page.screenshot({path:'artifacts/v10-data-center.png'});await page.locator('#close-data').click();
 const beforeSettings=await state();
 await page.locator('#task-settings').click();
 assert.equal(await page.locator('#task-dialog details,#task-dialog table,#task-dialog input[type=checkbox],#use-demo').count(),0);
 assert.equal(await page.locator('#black-ratio-field').isVisible(),false);
 await page.screenshot({path:'artifacts/v10-compact-task.png'});
 await page.locator('#budget').fill('18');await page.locator('#cof').fill('3');await page.locator('#apply-task').click();
 assert.deepEqual(await state(),{...beforeSettings,budget:18,cofPerPiece:3,lots:beforeSettings.lots.map(l=>({...l,cof:3}))});
 assert.match(await page.evaluate(()=>{try{window.v10Session.begin();return 'unexpected';}catch(e){return e.message;}}),/生产任务数据中心/);
 await page.locator('#import-report').click();
 assert.equal((await cells('MNT','TAPE'))[4],'105 COF（3/片）');
 await page.locator('#data-shift').selectOption('DAY');
 assert.equal((await cells('MNT','TAPE'))[4],'80 COF（2/片）');
 await page.locator('#data-shift').selectOption('NIGHT');
 assert.equal((await cells('MNT','TAPE'))[4],'105 COF（3/片）');
 await page.locator('#data-confirm-conditions').click();
 assert.match(await page.locator('#data-error').innerText(),/黑胶|切割/);
 assert.equal((await state()).conditionalPOLConfirmed,false);
 await page.locator('#data-route-cut').selectOption('yes'); // Opening WIP does not encode model-specific cutting.
 await page.locator('#data-route-black').selectOption('no');
 await page.locator('#data-confirm-conditions').click();assert.equal((await state()).conditionalPOLConfirmed,true);
 const summarize=s=>Object.fromEntries(['opening','forecast','external'].map(source=>[source,s.lots.filter(l=>l.source===source).reduce((n,l)=>n+l.count,0)]));
 assert.deepEqual(summarize(await state()),summarize(beforeSettings));
 assert.deepEqual((await state()).targets,beforeSettings.targets);
 await page.locator('#close-data').click();await page.locator('#battle-start').click();await page.locator('#challenge-player').fill('Synthetic QA');await page.getByRole('button',{name:'确认开战'}).click();
 await page.waitForFunction(()=>window.v10Session.phase==='battle');
 await page.reload();
 await page.waitForFunction(()=>window.v10Scene?.ready);
 await page.locator('#import-report').click();
 assert.equal((await cells('TV','BD'))[3],'未导入');
 assert.deepEqual(errors,[]);console.log('PASS V3.8-shaped import, atomic rollback, fresh targets, scoped jobs, NDF routing, independent COF, derived bubble WIP and physical conservation');
}finally{await browser.close();await new Promise(r=>server.close(r));}
