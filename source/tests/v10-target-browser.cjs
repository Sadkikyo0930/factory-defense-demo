const assert=require('node:assert/strict'),{chromium}=require('playwright');
const rows=(bd,pi)=>[
 {name:'BD',group:'TV',today:bd,target:pi},{name:'BD',group:'TV',today:bd,target:pi},
 {name:'BD',group:'MNT',today:1001,target:901},{name:'OC VI',group:'MNT',today:90,target:89},
 {name:'LCM VI',group:'MNT',today:88,target:87},{name:'POL',group:'TV',today:6,target:10},
 {name:'PI',group:'TV',today:16,target:0},{name:'FA分析岗',group:'SHARED',today:61,target:null}
];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath()});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:4194/')+'?qa');
  await page.waitForFunction(()=>!!window.v10Session);
  const state=()=>page.evaluate(()=>({targets:window.v10Session.scenario.targets,lots:window.v10Session.scenario.lots,baseline:window.v10Session.targetBaseline}));
  async function preview(reportRows,date='2026-11-18',hasTargets=true){
   await page.locator('#import-report').click();await page.locator('#production-json').setInputFiles({name:'synthetic-rw.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({date,rows:reportRows,targetBaseline:hasTargets?{version:1,rows:reportRows}:undefined}))});
   await page.locator('#data-pending').waitFor({state:'visible'});await page.locator('#mnt-opening-panel').selectOption('OC');
  }
  const zero=await state();await preview(rows(66,17));
  assert.match(await page.locator('#data-tables').innerText(),/MNT · BD/);
  assert.deepEqual(await state(),zero);
  await page.locator('#data-save-target').check();await page.locator('#data-confirm').click();
  assert.match(await page.locator('#data-error').innerText(),/撕 POL/);assert.deepEqual(await state(),zero);
  await page.locator('#data-tv-peel').fill('3');await page.locator('#data-confirm').click();
  assert.equal(await page.locator('#data-pending').isVisible(),false);
  let saved=await state();assert.deepEqual(saved.targets,{BD:17,PI:0,PEEL:3,POL:7});assert.equal(saved.baseline.mntTargets[0].target,901);
  assert.equal(saved.lots.find(l=>l.stage==='BD').count,66);
  await page.locator('#close-data').click();
  const conflict=rows(21,123);conflict[1].target=99;
  await page.locator('#import-report').click();
  await page.locator('#production-json').setInputFiles({name:'conflict.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({date:'2026-11-18',rows:conflict,targetBaseline:{version:1,rows:conflict}}))});
  await page.waitForFunction(()=>document.querySelector('#data-error').textContent.includes('冲突'));
  assert.deepEqual(await state(),saved);await page.locator('#close-data').click();
  await preview(rows(21,123),'2026-11-19');await page.locator('#data-confirm').click();
  assert.equal((await state()).lots.find(l=>l.stage==='BD').count,21);assert.deepEqual((await state()).targets,saved.targets);await page.locator('#close-data').click();
  await preview(rows(22,444),'2026-11-19',false);await page.locator('#data-confirm').click();
  assert.equal((await state()).lots.find(l=>l.stage==='BD').count,22);assert.deepEqual((await state()).baseline,saved.baseline);
  await page.reload();await page.waitForFunction(()=>!!window.v10Session);assert.deepEqual((await state()).targets,saved.targets);
  await preview(rows(91,123));await page.locator('#data-save-target').check();await page.locator('#data-tv-peel').fill('4');
  page.once('dialog',d=>d.dismiss());await page.locator('#data-confirm').click();assert.deepEqual((await state()).baseline,saved.baseline);
  page.once('dialog',d=>d.accept());await page.locator('#data-confirm').click();
  assert.deepEqual((await state()).targets,{BD:123,PI:0,PEEL:4,POL:6});
  assert.deepEqual(errors,[]);console.log('PASS browser: staged WIP and TV/MNT, POL split, old JSON, pin/reload, replace confirmation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
