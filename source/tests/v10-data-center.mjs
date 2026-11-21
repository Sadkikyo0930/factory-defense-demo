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
 assert.equal(await page.locator('#production-data input[type=number]:visible').count(),0);
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.v10Session.scenario)));
 const before=await state();
 const date='2026-11-20';
 const rw={date,rows:[{name:'TV BD',today:10},{name:'MNT BD',today:7},{name:'MNT 切割',today:3},{name:'黑胶',today:41},{name:'FA',today:76},{name:'TV Disa',today:999}],targetBaseline:{version:1,rows:[{name:'BD',group:'TV',target:0},{name:'BD',group:'MNT',target:9},{name:'切割',group:'MNT',target:3},{name:'黑胶',group:'SHARED',target:11}]}};
 async function file(id,obj){await page.locator('#'+id).setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});try{await page.locator('#data-pending').waitFor({timeout:5000});}catch(e){throw new Error('Import preview failed: '+await page.locator('#data-error').innerText(),{cause:e});}}
 const expected=(qty,rates)=>Object.fromEntries(['POL','BD','NDF','FILM'].map((kind,i)=>[kind,qty*rates[i]/10000]));
 const row=(model,sizeCode,bu,dayQty,nightQty,rates)=>({model,sizeCode,bu,dayQty,nightQty,expectedDay:expected(dayQty,rates),expectedNight:expected(nightQty,rates)});
 const lcmModel='AB238AA31M',ocModel='AB238AAM2B';
 const plan={schemaVersion:1,kind:'rw-mdl-plan',date,dateKey:'20261120',rows:[row('AB315AAA1','315','TV',1000,500,[42,86,570,5]),row(lcmModel,'238','MNT',2000,1000,[33,35,268,4]),row(ocModel,'238','MNT',1000,500,[33,35,268,4])]};
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
 assert.deepEqual((await cells('MNT','OC_VI')).slice(1,4),['4','49','6']);
 assert.deepEqual((await cells('MNT','LCM_VI')).slice(1,4),['5','53','7']);
 assert.equal((await cells('TV','VI'))[1],'2');
 assert.equal((await cells('TV','BD'))[1],'10');assert.equal((await cells('MNT','BD'))[1],'7');
 assert.deepEqual((await cells('MNT','CUT')).slice(1,4),['3','6','3']);
 assert.equal((await cells('TV','BLACK'))[1],'8');assert.equal((await cells('MNT','BLACK'))[1],'33');
 assert.deepEqual((await cells('MNT','REMOVE')).slice(1,4),['23','11','9']);
 assert.match((await cells('MNT','TAPE'))[4],/^总计 156 COF/);
 assert.deepEqual((await cells('MNT','BUBBLE')).slice(1,4),['10','10','0']);
 assert.match((await cells('MNT','BUBBLE'))[4],/^29 片次/);
 assert.equal(await page.locator('#data-ndf-routes').count(),0);
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
 const corrupt={...combined,productionPlan:{...plan,rows:[{...plan.rows[0],expectedNight:{...plan.rows[0].expectedNight,BD:-1}},plan.rows[1]]}};
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
 const rules={[lcmModel]:{panel:'OC',cut:true},[ocModel]:{panel:'LCM',cut:true}};
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
 assert.equal((await state()).targets.PEEL,2);assert.equal((await state()).targets.POL,8);
 const aggregate=(await state()).lots.filter(l=>l.kind==='POL'&&['PEEL','POL'].includes(l.stage));
 assert.equal(aggregate.filter(l=>l.stage==='PEEL').reduce((n,l)=>n+l.count,0),1);
 assert.equal(aggregate.filter(l=>l.stage==='POL').reduce((n,l)=>n+l.count,0),5);
 assert.match((await cells('TV','BUBBLE'))[4],/^6 片次.*汇总按 20%／80% 分配/);
 assert.equal((await state()).forecast,undefined);
 assert.equal((await cells('TV','REMOVE'))[2],'未导入');
 const detailRows=[...legacy.rows.filter(r=>r.name!=='TV POL'),
  {name:'TV POL',today:50,target:60},{name:'TV撕POL',today:2,target:3},{name:'TV贴POL',today:8,target:9}];
 await file('production-json',{date,rows:detailRows,targetBaseline:{version:1,rows:detailRows}});
 assert.deepEqual((await cells('TV','PEEL')).slice(1,4),['2','未导入','3']);
 assert.deepEqual((await cells('TV','POL')).slice(1,4),['8','未导入','9']);
 await page.locator('#data-discard').click();
 // V3.7 emits already-allocated black glue rows; the game must not split them again.
 const allocated=['TV','MNT'].map((group,i)=>({name:group+'黑胶',group,today:i?33:8,allocation:'blackGlue-20-80',sourceName:'黑胶',row:99,column:12}));
 await file('production-json',{...combined,rows:[...combined.rows.filter(r=>r.name!=='黑胶'),...allocated],productionPlan:{...plan,rules}});
 assert.equal((await cells('TV','BLACK'))[1],'8');assert.equal((await cells('MNT','BLACK'))[1],'33');
 await page.locator('#data-confirm').click();
 await page.locator('#close-data').click();await page.locator('#bu-mode').selectOption('MNT');
 const mnt=await state();assert.equal(mnt.forecast.plan,1500);assert.equal(mnt.targets.BD,9);
 assert.equal(mnt.lots.filter(l=>l.stage==='OC_VI'&&l.source==='forecast').reduce((n,l)=>n+l.count,0),13);
 assert.equal(mnt.lots.filter(l=>l.stage==='LCM_VI'&&l.source==='forecast').reduce((n,l)=>n+l.count,0),27);
 assert.equal(mnt.targets.OC_VI,6);assert.equal(mnt.targets.LCM_VI,7);
 assert.equal(mnt.targets.BUBBLE,0);
 assert.equal(mnt.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0),90);
 assert.equal(mnt.lots.filter(l=>l.stage==='BUBBLE'&&l.source==='opening').reduce((n,l)=>n+l.count,0),4);
 assert.ok(mnt.lots.every(l=>l.mode==='MNT'));assert.ok(mnt.lots.some(l=>l.stage==='LCM_VI'&&l.source==='forecast'));
 assert.ok(mnt.lots.some(l=>l.stage==='OC_VI'&&l.source==='forecast'));
 assert.ok(mnt.lots.filter(l=>l.kind!=='REVIEW'&&l.source==='forecast').every(l=>l.mntPanel==='OC'));
 await mkdir('artifacts',{recursive:true});await page.locator('#import-report').click();await page.screenshot({path:'artifacts/v10-data-center.png'});await page.locator('#close-data').click();
 const beforeSettings=await state();
 await page.locator('#task-settings').click();
 assert.equal(await page.locator('#task-dialog details,#task-dialog table,#task-dialog input[type=checkbox],#use-demo').count(),0);
 assert.equal(await page.locator('#pol-black-ratio').inputValue(),'30');
 assert.equal(await page.locator('#pol-cut-ratio').inputValue(),'30');
 await page.screenshot({path:'artifacts/v10-compact-task.png'});
 assert.equal(await page.locator('#budget').count(),0);
 assert.equal(await page.locator('#cof').inputValue(),'3');
 await page.locator('#cof').fill('2');
 await page.locator('#pol-black-ratio').fill('101');await page.locator('#apply-task').click();assert.deepEqual(await state(),beforeSettings);
 await page.locator('#pol-black-ratio').fill('20');await page.locator('#pol-cut-ratio').fill('50');await page.locator('#apply-task').click();
 assert.equal((await state()).cofPerPiece,2);
 await page.locator('#import-report').click();
 assert.equal((await cells('MNT','TAPE'))[2],'20 COF');assert.match((await cells('MNT','TAPE'))[4],/^总计 80 COF/);
 await page.locator('#data-shift').selectOption('DAY');
 assert.match((await cells('MNT','TAPE'))[4],/^总计 156 COF/);
 assert.equal((await cells('MNT','CUT'))[2],'6');
 await page.locator('#data-shift').selectOption('NIGHT');
 assert.match((await cells('MNT','TAPE'))[4],/^总计 80 COF/);
 assert.equal((await state()).conditionalPOLConfirmed,true);
 assert.equal((await cells('MNT','CUT'))[2],'5');
 assert.equal((await cells('MNT','BLACK'))[2],'2');
 const summarize=s=>Object.fromEntries(['opening','forecast','external'].map(source=>[source,s.lots.filter(l=>l.source===source).reduce((n,l)=>n+l.count,0)]));
 assert.deepEqual(summarize(await state()),summarize(beforeSettings));
 assert.deepEqual((await state()).targets,beforeSettings.targets);
 await page.locator('#close-data').click();await page.locator('#battle-start').click();await page.locator('#challenge-player').fill('Synthetic QA');await page.getByRole('button',{name:'确认开战'}).click();
 await page.waitForFunction(()=>window.v10Session.phase==='battle');
 await page.locator('#skip-battle').click();
 await page.locator('#battle-result').waitFor();
 const recap=page.locator('#detailed-recap');
 assert.equal(await recap.locator('tr[data-stage=OUT]').count(),0);
 assert.match(await recap.locator('tr[data-stage=OC_VI]').textContent(),/检.*OUT/);
 assert.match(await recap.locator('tr[data-stage=LCM_VI]').textContent(),/检.*OUT/);
 assert.match(await recap.locator('.result-metrics').textContent(),/成功 OUT \d+/);
 await page.reload();
 await page.waitForFunction(()=>window.v10Scene?.ready);
 await page.locator('#import-report').click();
 assert.equal((await cells('TV','BD'))[3],'未导入');
 assert.equal(await page.locator('#data-version').innerText(),'V1.0-rw38.7');
 assert.match(await page.title(),/V1\.0-rw38\.7/);
 assert.equal(await page.locator('header .brand em').innerText(),'V1.0-rw38.7');
 const jobs=[
  ['REMOVE','祛除'],['TAPE','贴胶'],['BD','BD'],['UV','UV'],['PEEL','撕 POL'],['POL','贴 POL'],
  ['BLACK','黑胶'],['FILM','贴膜'],['PI','PI'],['OUT','OUT']
 ];
 const full=Object.fromEntries([
  ['TV',[...jobs,['VI','VI']]],
  ['MNT',[...jobs,['CUT','切割'],['OC_VI','OC VI / OUT'],['LCM_VI','LCM VI / OUT']]]
 ]);
 const records=Object.entries(full).flatMap(([group,jobs],bu)=>jobs.map(([stage,name],i)=>({
  stage,name:stage==='OC_VI'?'MNT OC':name,group,row:20+bu*30+i,column:12,today:bu*20+i+1,target:bu*20+i+2
 })));
 const oc=records.find(r=>r.stage==='OC_VI');
 const extraOc={...oc,row:90,today:7,target:3};
 const uv=records.find(r=>r.group==='MNT'&&r.stage==='UV');
 uv.shift='白班';
 const tape=records.find(r=>r.group==='MNT'&&r.stage==='TAPE');
 tape.name='OC 贴胶';
 const extraTape={...tape,row:92,name:'贴胶（LCM）',today:5,target:4};
 records.push({...oc,name:'MNT OC VI'},extraOc,{...extraOc},{...uv,row:91,shift:'夜班'},extraTape);
 const makeFull=(rows)=>({date,rows,targetBaseline:{version:1,rows:rows.map(r=>({...r,column:11}))},productionPlan:{...plan,rules}});
 const previous=await state(),loaded=makeFull(records);
 const picker=page.waitForEvent('filechooser');
 await page.locator('#pick-production').click();
 await (await picker).setFiles({name:'synthetic-rw38-full.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(loaded))});
 await page.locator('#data-pending').waitFor();
 assert.deepEqual(await state(),previous);
 for(const [group,stages] of Object.entries(full))for(const [stage] of stages){
  const r=records.find(r=>r.group===group&&r.stage===stage);
  const addition=stage==='OC_VI'?extraOc:r===tape?extraTape:undefined;
  const row=await cells(group,stage);
  if(stage==='OUT'){assert.equal(row.length,0);continue;}
  assert.match(row[4],/片次|COF/);
  if(stage==='TAPE'){assert.match(row[1],/COF/);assert.equal(row[3],'0');continue;}
  if(stage==='VI'||stage==='OC_VI'){
   const out=records.find(r=>r.group===group&&r.stage==='OUT');
   assert.equal(row[1],'待检 '+(r.today+(addition?.today??0))+' / 待 OUT '+out.today);
   assert.equal(row[3],'待检 '+(r.target+(addition?.target??0))+' / 待 OUT '+out.target);
   continue;
  }
  assert.equal(row[1],String(r.today+(addition?.today??0)),group+' '+stage+' opening');
  assert.equal(row[3],String(r.target+(addition?.target??0)),group+' '+stage+' target');
 }
 await page.locator('#data-confirm').click();
 const first=await state();
 assert.equal(first.forecast.plan,1000);
 assert.equal(first.lots.find(l=>l.stage==='OUT'&&l.source==='opening').count,10);
 const second=makeFull(records.map(r=>({...r,today:r.today+1,target:r.target+2})));
 await file('production-json',second);
 await page.locator('#data-confirm').click();
 const saved=await state();
 assert.equal(saved.targets.OUT,first.targets.OUT+2);
 assert.equal(saved.lots.find(l=>l.stage==='OUT'&&l.source==='opening').count,11);
 assert.deepEqual(saved.forecast,first.forecast);
 assert.match((await cells('MNT','OC_VI'))[1],new RegExp('待检 '+(oc.today+extraOc.today+2)+' / 待 OUT'));
 for(const field of ['today','target']){
  const bad=structuredClone(second);
  const list=field==='today'?bad.rows:bad.targetBaseline.rows;
  list.push({...list.find(r=>r.row===90),[field]:999});
  await page.locator('#production-json').setInputFiles({name:'synthetic-conflict.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('Excel 第 90 行'));
  const diagnostic=await page.locator('#data-error').innerText();
  assert.match(diagnostic,/日报岗位数值冲突：/);
  assert.match(diagnostic,field==='today'?/第 12 列/:/第 11 列/);
  assert.match(diagnostic,/999/);
  assert.deepEqual(await state(),saved);
 }
 await page.screenshot({path:'artifacts/v10-rw38-2-source-rows.png'});
 const badShift=makeFull(records.map(r=>r.row===91?{...r,today:r.today+1}:r));
 await page.locator('#production-json').setInputFiles({name:'synthetic-shift-conflict.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(badShift))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('Excel 第 91 行'));
 assert.match(await page.locator('#data-error').innerText(),/日报岗位数值冲突.*Excel 第 53 行.*Excel 第 91 行/);
 assert.deepEqual(await state(),saved);
 const pairs=[
  [49,'TV祛除','TV',12,123,'REMOVE'],[51,'MNT祛除','MNT',31,133,'REMOVE'],
  [53,'TV BD','TV',34,140,'BD'],[55,'MNT BD','MNT',56,150,'BD'],
  [75,'黑胶','SHARED',55,65,'BLACK'],[81,'MNT OC','MNT',77,45,'OC_VI'],[87,'MNT OC','MNT',24,9,'OC_VI'],
  [83,'MNT模组','MNT',31,70,'LCM_VI'],[89,'MNT模组','MNT',6,19,'LCM_VI']
 ];
 const checkPairs=async()=>{
  for(const [group,stage,opening,target] of [
   ['TV','REMOVE',12,123],['TV','BD',34,140],['MNT','REMOVE',31,133],['MNT','BD',56,150],
   ['TV','BLACK',11,13],['MNT','BLACK',44,52],['MNT','OC_VI',101,54],['MNT','LCM_VI',37,89],['TV','PI',14,16]
  ]){
   const values=await cells(group,stage);
   assert.deepEqual([values[1],values[3]],[String(opening),String(target)],group+' '+stage);
  }
 };
 const extraRows=[{name:'TV PI',group:'TV',row:61,today:7,target:8},{name:'TV PI',group:'TV',row:63,today:7,target:8},
  {name:'FA',group:'SHARED',row:30,today:900,target:900},{name:'Disa',group:'TV',row:31,today:900,target:900}];
 for(const withArea of [false,true]){
  const observations=pairs.flatMap(([start,name,group,today,target])=>[start,start+1].map(row=>({name,group,row,today,target,start}))).concat(extraRows);
  const metricRows=(column)=>observations.map(({start,...r})=>({...r,column,...(withArea?{mergeArea:{startRow:start??r.row,endRow:start===undefined?r.row:start+1,startColumn:column,endColumn:column}}:{})}));
  await file('production-json',{date,source:{tool:'rw-win7-vbs'},rows:metricRows(12),targetBaseline:{version:1,rows:metricRows(11)},productionPlan:plan});
  await checkPairs();await page.locator('#data-confirm').click();assert.equal(await page.locator('#data-pending').isVisible(),false);
 }
 const verified=await state();
 const authoritative=makeFull(records);
 authoritative.productionPlan={...plan,rows:plan.rows.map((r,i)=>i===0?{...r,expectedDay:{POL:8,BD:11,NDF:12,FILM:13},expectedNight:{POL:1,BD:2,NDF:3,FILM:4}}:r)};
 await file('production-json',authoritative);
 for(const [stage,count] of [['PEEL','8'],['REMOVE','11'],['VI','44'],['FILM','13']])assert.equal((await cells('TV',stage))[2],count);
 await page.locator('#data-shift').selectOption('NIGHT');
 for(const [stage,count] of [['PEEL','1'],['REMOVE','2'],['VI','10'],['FILM','4']])assert.equal((await cells('TV',stage))[2],count);
 await page.locator('#data-discard').click();
 assert.deepEqual(await state(),verified);
 const unresolved={...loaded,productionPlan:{...plan,rows:[...plan.rows,row('AB238AAA1','238','MNT',100,0,[33,35,268,4])]}};
 await file('production-json',unresolved);
 assert.match(await page.locator('table[data-bu=MNT]').locator('..').innerText(),/未分配.*AB238AAA1/);
 await page.locator('#data-confirm').click();
 assert.match(await page.locator('#data-error').innerText(),/AB238AAA1.*未命中/);
 assert.deepEqual(await state(),verified);
 await page.locator('#data-discard').click();
 const sample=(model,sizeCode,bu,POL,BD,NDF,FILM)=>({
  model,sizeCode,bu,dayQty:10000,nightQty:1000,expectedDay:{POL,BD,NDF,FILM},expectedNight:{POL:3,BD:4,NDF:5,FILM:1}
 });
 const routedPlan={...plan,rows:[
  sample('AB315AAA1','315','TV',20,86,476,2),sample('AB315AAA2','315','TV',37,0,0,0),
  {...sample(lcmModel,'238','MNT',60,207,600,18),PANELTYPE:'OC',OUTTYPE:'OC'},
  {...sample(ocModel,'238','MNT',98,0,761,0),PANELTYPE:'LCM',OUTTYPE:'LCM'},
  sample('AB700AAA1','700','TV',10,10,10,10)
 ],rules:{AB315AAA1:{polBlack:false,filmBlack:true},AB315AAA2:{polBlack:false},
  [lcmModel]:{cut:false,polBlack:true,filmBlack:true},[ocModel]:{cut:false,polBlack:true}},
 ratios:{TV:{NIGHT:{blackRatio:0}}}};
 await file('production-json',{...loaded,productionPlan:routedPlan});
 for(const [group,expected] of Object.entries({
  TV:{REMOVE:86,TAPE:'516 COF',BD:86,UV:86,PEEL:57,POL:57,BUBBLE:57,BLACK:34,FILM:2,PI:143,VI:621},
  MNT:{REMOVE:207,TAPE:'1242 COF',BD:207,UV:207,PEEL:158,POL:158,BUBBLE:158,CUT:95,BLACK:95,FILM:18,PI:365,OC_VI:1144,LCM_VI:600}
 }))for(const [stage,count] of Object.entries(expected))assert.equal((await cells(group,stage))[2],String(count),group+' '+stage);
 assert.equal((await cells('TV','OUT')).length+(await cells('MNT','OUT')).length,0);
 assert.match((await cells('TV','TAPE'))[4],/^总计 528 COF/);
 assert.match((await cells('MNT','TAPE'))[4],/^总计 1374 COF/);
 assert.match((await cells('MNT','OC_VI'))[4],/NDF 761 \/ 维修后 383/);
 assert.match((await cells('MNT','LCM_VI'))[4],/NDF 600 \/ 维修后 0/);
 await page.locator('#data-confirm').click();
 const forecastTotal=s=>s.lots.filter(l=>l.source==='forecast').reduce((n,l)=>n+l.count,0);
 assert.equal(forecastTotal(await state()),621);
 assert.ok((await state()).lots.filter(l=>l.kind==='FILM'&&l.source==='forecast').every(l=>!l.black));
 await page.locator('#data-shift').selectOption('NIGHT');
 assert.equal(forecastTotal(await state()),26);
 assert.equal((await cells('TV','PI'))[2],'14');
 assert.equal((await cells('TV','BLACK'))[2],'0');
 await page.locator('#data-shift').selectOption('DAY');
 await page.locator('#close-data').click();
 await page.locator('#bu-mode').selectOption('MNT');
 assert.equal(forecastTotal(await state()),1744);
 // Synthetic row lattice anchored to the V3.8 report structure.
 const mockRows=[
  [49,'TV祛除','TV',12,123],[51,'MNT祛除','MNT',31,133],[53,'TV BD','TV',34,140],[55,'MNT BD','MNT',56,150],
  [57,'TV UV','TV',5,8],[59,'MNT UV','MNT',8,10],[61,'TV POL','TV',22,30],[63,'MNT POL','MNT',45,55],
  [85,'MNT切割','MNT',4,3],[67,'TV贴膜','TV',2,1],[69,'MNT贴膜','MNT',3,2],
  [71,'TV PI','TV',6,5],[73,'MNT PI','MNT',8,7],[75,'黑胶','SHARED',55,65],[77,'TV VI','TV',17,10],
  [79,'TV OUT','TV',3,2],[81,'MNT OC','MNT',77,45],[83,'MNT模组','MNT',31,70],
  [87,'MNT OC','MNT',24,9],[89,'MNT模组','MNT',6,19]
 ].map(([row,name,group,today,target])=>({row,name,group,today,target}));
 const expectedOpening={
  TV:{REMOVE:[12,86,123,98],TAPE:[138,516,0,654],BD:[34,86,140,120],UV:[5,86,8,91],PEEL:[4,57,6,61],
   POL:[18,57,24,75],BUBBLE:[4,57,0,136],BLACK:[11,34,13,45],FILM:[2,2,1,4],PI:[6,143,5,149],VI:['待检 17 / 待 OUT 3',621,'待检 10 / 待 OUT 2',641]},
  MNT:{REMOVE:[31,207,133,238],TAPE:[261,1242,0,1503],BD:[56,207,150,263],UV:[8,207,10,215],PEEL:[9,158,11,167],
   POL:[36,158,44,194],BUBBLE:[9,158,0,361],CUT:[4,95,3,99],BLACK:[44,95,52,139],FILM:[3,18,2,21],PI:[8,365,7,373],
   OC_VI:[101,1144,54,1245],LCM_VI:[37,600,89,637]}
 };
 const matrixPayload=(withArea,records=mockRows,productionPlan=routedPlan)=>{
  const metric=(column)=>records.flatMap(r=>[r.row,r.row+1].map(row=>({...r,row,column,
   ...(withArea?{mergeArea:{startRow:r.row,endRow:r.row+1,startColumn:column,endColumn:column}}:{})})));
  return {date,source:{tool:'rw-win7-vbs'},rows:metric(12),targetBaseline:{version:1,rows:metric(11)},productionPlan};
 };
 await page.locator('#import-report').click();
 const readMatrix=async()=>Object.fromEntries(await Promise.all(Object.entries(expectedOpening).map(async ([group,stages])=>
  [group,Object.fromEntries(await Promise.all(Object.keys(stages).map(async stage=>[stage,await cells(group,stage)])))]
 )));
 const inkTarget=Number(process.env.FACTORY_TEST_INK_TARGET??37);
 for(const withArea of [false,true]){
  const reportRows=withArea?mockRows:mockRows.flatMap(r=>r.group!=='SHARED'?[r]:['TV','MNT'].map(group=>({
   ...r,group,name:group+'黑胶',sourceName:'黑胶',allocation:'blackGlue-20-80',
   today:r.today*(group==='TV'?.2:.8),target:r.target*(group==='TV'?.2:.8)
  })));
  await file('production-json',matrixPayload(withArea,reportRows));
  for(const [group,stages] of Object.entries(expectedOpening))for(const [stage,[opening,added,target,total]] of Object.entries(stages)){
   const row=await cells(group,stage),cof=stage==='TAPE'?' COF':'';
   assert.deepEqual(row.slice(1,4),[opening+cof,added+cof,String(target)],group+' '+stage+' mergeArea='+withArea);
   assert.ok(row[4].startsWith(cof?'总计 '+total+cof:total+' 片次'),group+' '+stage+' total: '+row[4]);
  }
  await page.locator('#data-confirm').click();
  assert.equal(await page.locator('#data-pending').isVisible(),false);
  assert.equal(await page.locator('#data-error').innerText(),'已确认导入。');
  const clean=await state(),cleanMatrix=await readMatrix();
  const withInk=matrixPayload(withArea,[...reportRows,{row:65,name:'INK',today:0,target:inkTarget}]);
  await file('production-json',withInk);
  assert.doesNotMatch(await page.locator('#data-tables').innerText(),/未映射.*INK/);
  assert.deepEqual(await readMatrix(),cleanMatrix);
  await page.locator('#data-confirm').click();
  assert.equal(await page.locator('#data-pending').isVisible(),false);
  assert.equal(await page.locator('#data-error').innerText(),'已确认导入。');
  assert.deepEqual(await state(),clean);
  assert.deepEqual(await readMatrix(),cleanMatrix);
 }
 const withUnknown=matrixPayload(true);
 withUnknown.targetBaseline.rows.push({name:'INK维修',group:'TV',target:1});
 const prior=await state();
 await file('production-json',withUnknown);
 await page.locator('#data-confirm').click();
 assert.match(await page.locator('#data-error').innerText(),/未映射/);
 assert.deepEqual(await state(),prior);
 await page.locator('#data-discard').click();
 const openingTotal=s=>s.lots.filter(l=>l.source==='opening').reduce((n,l)=>n+l.count,0);
 assert.equal(openingTotal(await state()),337); // Includes the MNT share of shared black glue.
 assert.equal(forecastTotal(await state()),1744);
 await page.screenshot({path:'artifacts/v10-rw38-5-workload.png'});
 const beforeDuplicate=await state(),invalidDuplicate=matrixPayload(false);
 invalidDuplicate.targetBaseline.rows.find(r=>r.row===58).target+=1;
 await page.locator('#production-json').setInputFiles({name:'bad-legacy-merge.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalidDuplicate))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('Excel 第 58 行'));
 assert.deepEqual(await state(),beforeDuplicate);
 await page.locator('#close-data').click();
 await page.locator('#bu-mode').selectOption('TV');assert.equal(openingTotal(await state()),112);
 await page.locator('#task-settings').click();
 assert.equal(await page.locator('#cof').inputValue(),'3');assert.equal(await page.locator('#pol-cut-ratio').isVisible(),false);
 await page.locator('#close-task').click();await page.locator('#bu-mode').selectOption('MNT');
 for(const [ratio,expected] of [['0',0],['100',316],['30',95]]){
  await page.locator('#task-settings').click();await page.locator('#pol-black-ratio').fill(ratio);await page.locator('#pol-cut-ratio').fill(ratio);
  await page.locator('#apply-task').click();await page.locator('#import-report').click();
  assert.equal((await cells('MNT','BLACK'))[2],String(expected));assert.equal((await cells('MNT','CUT'))[2],String(expected));
  assert.equal((await cells('MNT','BLACK'))[1],'44');
  assert.equal(forecastTotal(await state()),1744);
  await page.locator('#close-data').click();
 }
 assert.ok((await state()).lots.filter(l=>l.source==='forecast').every(l=>['REMOVE','PEEL','FILM','OC_VI','LCM_VI'].includes(l.stage)));
 assert.equal((await state()).lots.filter(l=>l.source==='forecast').reduce((n,l)=>n+l.count*(Number(!!l.black)+Number(!!l.extraBlack)),0),95);
 assert.equal((await state()).lots.filter(l=>l.source==='forecast').reduce((n,l)=>n+l.count*(Number(!!l.cut)+Number(!!l.extraCut)),0),95);
 await page.locator('#import-report').click();
 const valid=await state();
 const invalidRatio={...routedPlan,ratios:{...routedPlan.ratios,MNT:{DAY:{cutRatio:1.2}}}};
 await page.locator('#production-json').setInputFiles({name:'invalid-ratio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...loaded,productionPlan:invalidRatio}))});
 await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('POL 比例无效'));
 assert.deepEqual(await state(),valid);
 const revisedPlan={...routedPlan,rows:routedPlan.rows.map(r=>r.model===lcmModel?{...r,expectedDay:{...r.expectedDay,BD:r.expectedDay.BD+1}}:r),ratios:{...routedPlan.ratios,
  MNT:{...routedPlan.ratios.MNT,DAY:{blackRatio:.5,cutRatio:.25}}}};
 const revisedRows=mockRows.map(r=>r.name==='MNT BD'?{...r,today:r.today+1,target:r.target+2}:r);
 await file('production-json',matrixPayload(true,revisedRows,revisedPlan));
 assert.equal((await cells('MNT','BLACK'))[2],'95');
 assert.equal((await cells('MNT','CUT'))[2],'95');
 await page.locator('#data-confirm').click();
 assert.equal((await state()).targets.BD,valid.targets.BD+2);
 assert.equal((await state()).lots.find(l=>l.source==='opening'&&l.stage==='BD').count,valid.lots.find(l=>l.source==='opening'&&l.stage==='BD').count+1);
 assert.equal(forecastTotal(await state()),1745);
 await page.locator('#close-data').click();await page.locator('#work-shift').selectOption('NIGHT');
 await page.locator('#task-settings').click();
 assert.equal(await page.locator('#pol-black-ratio').inputValue(),'20');
 assert.equal(await page.locator('#pol-cut-ratio').inputValue(),'50');
 assert.equal(await page.locator('#cof').inputValue(),'2');
 await page.locator('#close-task').click();await page.locator('#work-shift').selectOption('DAY');await page.locator('#task-settings').click();
 assert.equal(await page.locator('#pol-black-ratio').inputValue(),'30');
 assert.equal(await page.locator('#pol-cut-ratio').inputValue(),'30');
 assert.equal(await page.locator('#cof').inputValue(),'3');
 await page.locator('#close-task').click();
 // The final accepted combined import must support actual battle/settlement, without a second confirmation.
 // Exercise all four BU/shift combinations and preserve visible errors on a failed start.
 for(const bu of ['TV','MNT'])for(const sh of ['DAY','NIGHT']){
  await page.locator('#bu-mode').selectOption(bu);
  await page.locator('#work-shift').selectOption(sh);
  const accepted=await state();
  assert.equal(accepted.synthetic,false);
  assert.equal(accepted.inConfirmed,true);
  assert.equal(accepted.conditionalPOLConfirmed,true);
  await page.locator('#import-report').click();
  assert.equal(await page.locator('#data-conditions').isVisible(),false);
  await page.locator('#close-data').click();
  await page.locator('#clear-formation').click();
  await page.locator('#element-roster [data-plus=BD]').click();
  await page.locator('#battle-start').click();
  await page.locator('#challenge-player').fill('Synthetic QA');
  if(bu==='TV'&&sh==='DAY'){
   await page.evaluate(()=>{
    const s=window.v10Session,original=s.begin;
    s.begin=function(){s.begin=original;throw Error('QA: simulated specific start error');};
   });
   await page.getByRole('button',{name:'确认开战'}).click();
   assert.equal(await page.locator('#player-error').innerText(),'QA: simulated specific start error');
   assert.equal(await page.locator('#challenge-player').isVisible(),true);
   assert.equal(await page.evaluate(()=>window.v10Session.phase),'setup');
  }
  await page.getByRole('button',{name:'确认开战'}).click();
  await page.waitForFunction(()=>window.v10Session.phase==='battle');
  await page.locator('#skip-battle').click();
  await page.locator('#battle-result').waitFor();
  assert.equal(await page.evaluate(()=>window.v10Session.phase),'result');
  await page.locator('#result-retry').click();
 }
 console.log('PASS rw38.7 confirmed import to named battle and settlement in all BU/shift combinations, specific failure remains visible');
 console.log('PASS rw38.5 full TV/MNT matrix in both formats, POL split, COF defaults and saved shift scope, no duplicate physical inventory');
 console.log('PASS rw38.6 INK excluded from both metrics, confirm succeeds for old and new formats, all legal workload cells and task state unchanged');
 console.log('PASS rw38.3 legacy layout and mergeArea imports, exact WIP/target reconciliation, auto NDF routing, shift isolation, and atomic rollback');
 assert.deepEqual(errors,[]);console.log('PASS V3.8-shaped import, atomic rollback, fresh targets, scoped jobs, NDF routing, independent COF, derived bubble WIP and physical conservation');
}finally{await browser.close();await new Promise(r=>server.close(r));}
