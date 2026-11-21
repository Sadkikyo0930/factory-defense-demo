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
 assert.match((await cells('MNT','TAPE'))[4],/^总计 104 COF/);
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
 assert.equal((await state()).targets.PEEL,10);
 const aggregate=(await state()).lots.filter(l=>l.kind==='POL'&&['PEEL','POL'].includes(l.stage));
 assert.ok(aggregate.every(l=>l.stage==='PEEL'));assert.equal(aggregate.reduce((n,l)=>n+l.count,0),6);
 assert.match((await cells('TV','BUBBLE'))[4],/^6 片次.*POL 汇总归撕 POL/);
 assert.equal((await state()).forecast,undefined);
 assert.equal((await cells('TV','REMOVE'))[2],'未导入');
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
 await page.locator('#budget').fill('18');await page.locator('#cof').fill('3');
 await page.locator('#pol-black-ratio').fill('101');await page.locator('#apply-task').click();assert.deepEqual(await state(),beforeSettings);
 await page.locator('#pol-black-ratio').fill('20');await page.locator('#pol-cut-ratio').fill('50');await page.locator('#apply-task').click();
 assert.equal((await state()).budget,18);assert.equal((await state()).cofPerPiece,3);
 await page.locator('#import-report').click();
 assert.equal((await cells('MNT','TAPE'))[2],'30 COF');assert.match((await cells('MNT','TAPE'))[4],/^总计 120 COF/);
 await page.locator('#data-shift').selectOption('DAY');
 assert.match((await cells('MNT','TAPE'))[4],/^总计 104 COF/);
 assert.equal((await cells('MNT','CUT'))[2],'6');
 await page.locator('#data-shift').selectOption('NIGHT');
 assert.match((await cells('MNT','TAPE'))[4],/^总计 120 COF/);
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
 assert.equal(await page.locator('#data-version').innerText(),'V1.0-rw38.4');
 assert.match(await page.title(),/V1\.0-rw38\.4/);
 assert.equal(await page.locator('header .brand em').innerText(),'V1.0-rw38.4');
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
 const extraRows=[{name:'TV PI',group:'TV',row:61,today:7,target:8},{name:'TV PI',group:'TV',row:62,today:7,target:8},
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
  TV:{REMOVE:86,TAPE:'344 COF',BD:86,UV:86,PEEL:57,POL:57,BUBBLE:57,BLACK:34,FILM:2,PI:143,VI:621},
  MNT:{REMOVE:207,TAPE:'828 COF',BD:207,UV:207,PEEL:158,POL:158,BUBBLE:158,CUT:95,BLACK:95,FILM:18,PI:365,OC_VI:1144,LCM_VI:600}
 }))for(const [stage,count] of Object.entries(expected))assert.equal((await cells(group,stage))[2],String(count),group+' '+stage);
 assert.equal((await cells('TV','OUT')).length+(await cells('MNT','OUT')).length,0);
 assert.match((await cells('TV','TAPE'))[4],/^总计 352 COF/);
 assert.match((await cells('MNT','TAPE'))[4],/^总计 916 COF/);
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
 const mockRows=[
  ['TV祛除','TV',12,123],['TV BD','TV',34,140],['TV UV','TV',5,8],['TV撕POL','TV',7,4],['TV贴POL','TV',11,6],
  ['TV脱POL','TV',4,7],['TV贴膜','TV',2,1],['TV PI','TV',6,5],['TV VI','TV',17,10],['TV OUT','TV',3,2],
  ['MNT祛除','MNT',31,133],['MNT BD','MNT',56,150],['MNT UV','MNT',8,10],['MNT撕POL','MNT',13,8],
  ['MNT贴POL','MNT',12,9],['MNT脱POL','MNT',6,11],['MNT切割','MNT',4,3],['MNT贴膜','MNT',3,2],
  ['MNT PI','MNT',8,7],['MNT OC','MNT',101,54],['MNT模组','MNT',37,89],['MNT OUT','MNT',5,4],
  ['黑胶','SHARED',55,65]
 ].map(([name,group,today,target])=>({name,group,today,target}));
 const exact={...makeFull(mockRows),productionPlan:routedPlan};
 await page.locator('#import-report').click();
 await file('production-json',exact);await page.locator('#data-confirm').click();await page.locator('#close-data').click();
 await page.locator('#bu-mode').selectOption('TV');
 await page.locator('#task-settings').click();
 assert.equal(await page.locator('#pol-black-ratio').inputValue(),'30');
 assert.equal(await page.locator('#pol-cut-ratio').isVisible(),false);
 await page.locator('#cof').fill('3');await page.locator('#apply-task').click();
 await page.locator('#import-report').click();
 const expectedOpening={
  TV:{REMOVE:[12,86,123,98],TAPE:[138,516,0,654],BD:[34,86,140,120],UV:[5,86,8,91],PEEL:[7,57,4,64],
   POL:[11,57,6,68],BUBBLE:[11,57,0,132],BLACK:[11,34,13,45],FILM:[2,2,1,4],PI:[6,143,5,149],VI:['待检 17 / 待 OUT 3',621,'待检 10 / 待 OUT 2',641]},
  MNT:{REMOVE:[31,207,133,238],TAPE:[174,828,0,1002],BD:[56,207,150,263],UV:[8,207,10,215],PEEL:[13,158,8,171],
   POL:[12,158,9,170],BUBBLE:[19,158,0,341],CUT:[4,95,3,99],BLACK:[44,95,52,139],FILM:[3,18,2,21],PI:[8,365,7,373],
   OC_VI:['待检 101 / 待 OUT 5',1144,'待检 54 / 待 OUT 4',1250],LCM_VI:[37,600,89,637]}
 };
 for(const [group,stages] of Object.entries(expectedOpening))for(const [stage,[opening,added,target,total]] of Object.entries(stages)){
  const row=await cells(group,stage),cof=stage==='TAPE'?' COF':'';
  assert.deepEqual(row.slice(1,4),[opening+cof,added+cof,String(target)],group+' '+stage);
  assert.ok(row[4].startsWith(cof?'总计 '+total+cof:total+' 片次'),group+' '+stage+' total: '+row[4]);
 }
 await page.screenshot({path:'artifacts/v10-rw38-4-workload.png'});
 await page.locator('#close-data').click();await page.locator('#bu-mode').selectOption('MNT');
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
 await file('production-json',{...makeFull(revisedRows),productionPlan:revisedPlan});
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
 await page.locator('#close-task').click();await page.locator('#work-shift').selectOption('DAY');await page.locator('#task-settings').click();
 assert.equal(await page.locator('#pol-black-ratio').inputValue(),'30');
 assert.equal(await page.locator('#pol-cut-ratio').inputValue(),'30');
 await page.locator('#close-task').click();
 console.log('PASS rw38.4 TV/MNT complete route matrix, configured black/cut, skipped unsupported size, no duplicate OUT or physical forecast');
 console.log('PASS rw38.3 legacy layout and mergeArea imports, exact WIP/target reconciliation, auto NDF routing, shift isolation, and atomic rollback');
 assert.deepEqual(errors,[]);console.log('PASS V3.8-shaped import, atomic rollback, fresh targets, scoped jobs, NDF routing, independent COF, derived bubble WIP and physical conservation');
}finally{await browser.close();await new Promise(r=>server.close(r));}
