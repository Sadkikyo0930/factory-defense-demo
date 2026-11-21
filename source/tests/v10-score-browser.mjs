import assert from 'node:assert/strict';
import {mkdir, mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {scoreServer} from '../services/scores/server.mjs';
const parent=resolve('artifacts');await mkdir(parent,{recursive:true});
const directory=await mkdtemp(join(parent,'score-qa-')),db=join(directory,'synthetic.sqlite');
async function start(port=0,password=''){
 const server=scoreServer({file:db,dist:'dist',password});await new Promise(r=>server.listen(port,'127.0.0.1',r));return server;
}
const stop=s=>new Promise(r=>s.close(r));
let server=await start(),port=server.address().port,root='http://127.0.0.1:'+port;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath()});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(root+'/?qa');await page.waitForFunction(()=>window.v10Scene?.ready);
 let played=0;
 for(const bu of ['TV','MNT'])for(const shift of ['DAY','NIGHT']){
  if(played)await page.locator('#result-retry').click();
  await page.locator('#work-shift').selectOption(shift);
  await page.locator('#scenario-date').fill('2026-11-19');
  if(await page.locator('#bu-mode').inputValue()!==bu)await page.locator('#bu-mode').selectOption(bu);
  await page.waitForFunction(({bu,shift})=>window.v10Session.scenario.mode===bu&&window.v10Session.scenario.shift===shift,{bu,shift});
  assert.equal(await page.locator('#apply-mode').count(),0);
  assert.equal(await page.locator('[data-plus=VI]').count(),bu==='TV'?1:0);
  assert.equal(await page.locator('[data-plus=OC_VI]').count(),bu==='MNT'?1:0);
  if(bu==='MNT'){
   assert.equal(await page.locator('[data-plus=BUBBLE]').count(),0);
   assert.equal(await page.locator('[data-select=PEEL] span').last().innerText(),'撕POL');
   for(const [stage,max] of [['PEEL',1],['OC_VI',4],['LCM_VI',2]]){
    const add=page.locator('[data-plus='+stage+']');for(let i=0;i<max;i++)await add.click();
    assert.equal(await page.locator('#count-'+stage).innerText(),String(max));assert.ok(await add.isDisabled());
   }
   assert.deepEqual(await page.evaluate(()=>window.v10Session.formation),{PEEL:[1],OC_VI:[1,2,3,4],LCM_VI:[1,2]});
   assert.equal(await page.locator('#staff-count').innerText(),'7 / 20');
   for(const [stage,max] of [['PEEL',1],['OC_VI',4],['LCM_VI',2]])for(let i=0;i<max;i++)await page.locator('[data-minus='+stage+']').click();
   assert.match(await page.locator('.element-row[data-stage=BUBBLE]').innerText(),/自动生效/);
   assert.match(await page.locator('[data-select=CUT]').innerText(),/切割/);
   await page.locator('#task-settings').click();
   assert.equal(await page.locator('#task-dialog details,#task-dialog table,#task-dialog input[type=checkbox],#use-demo').count(),0);
   await page.locator('#budget').fill('19');
   await page.locator('#apply-task').click();
   assert.equal(await page.locator('#task-dialog').evaluate(e=>e.open),false);
   assert.equal(await page.evaluate(()=>window.v10Session.scenario.budget),19);
  }
  for(const stage of ['BD','PI',...(bu==='TV'?['VI']:['OC_VI','LCM_VI'])])await page.locator('[data-plus='+stage+']').click();
  await page.locator('#battle-start').click();assert.equal(await page.evaluate(()=>window.v10Session.phase),'setup');
  await page.locator('#challenge-player').fill('<fake>');await page.getByRole('button',{name:'确认开战'}).click();
  assert.equal(await page.evaluate(()=>window.v10Session.phase),'setup');
  await page.locator('#challenge-player').fill('合成 班长');await page.getByRole('button',{name:'确认开战'}).click();
  if(played===3)await page.screenshot({path:join(directory,'mnt-night.png')});
  await page.waitForFunction(()=>document.querySelector('#score-save-status').textContent.includes('已保存'),null,{timeout:10000}).catch(async e=>{
   throw new Error([bu,shift,await page.locator('#notice').textContent(),await page.locator('#score-save-status').textContent(),await page.locator('#player-error').textContent(),...errors].join(' | '),{cause:e});
  });
  const records=(await (await fetch(root+'/api/scores')).json()).records;
  assert.equal(records.length,played+1);
  posts.push(records.find(r=>!posts.some(p=>p.id===r.id)));
  assert.deepEqual([posts[played].bu,posts[played].shift],[bu,shift]);assert.equal(posts[played].synthetic,true);
  assert.ok(['target','staff','out'].every(k=>Number.isFinite(posts[played][k])));
  assert.ok(!JSON.stringify(posts[played]).includes('AB238'));
  played++;
 }
 assert.equal(new Set(posts.map(p=>p.id)).size,4);
 async function post(record,origin=root){return fetch(root+'/api/scores',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(record)});}
 assert.equal((await post(posts[0])).status,200);
 assert.equal((await post({...posts[0],player:'其他人'})).status,409);
 assert.equal((await post(posts[0],'http://another.invalid')).status,403);
 assert.equal((await post({...posts[0],fullReport:[]})).status,400);
 await stop(server);server=await start(port);
 await page.reload();await page.waitForFunction(()=>window.v10Scene?.ready);
 await page.locator('#score-history').click();await page.locator('#history-items li').first().waitFor();
 assert.equal(await page.locator('#history-items li').count(),4);
 await page.locator('#score-name').fill('合成 班长');await page.locator('#score-bu').selectOption('MNT');await page.locator('#score-shift').selectOption('NIGHT');await page.getByRole('button',{name:'查询'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('#history-items li').length===1);
 await page.locator('#history-close').click();
 await page.route('**/api/scores',r=>r.abort());
 await page.locator('#battle-start').click();await page.locator('#challenge-player').fill('合成 班长');await page.getByRole('button',{name:'确认开战'}).click();await page.locator('#skip-battle').click();
 await page.waitForFunction(()=>document.querySelector('#score-save-status').textContent.includes('尚未保存'));
 assert.deepEqual(errors,[]);
 await stop(server);server=await start(port,'synthetic-test-key');
 assert.equal((await fetch(root+'/api/scores')).status,401);
 const auth='Basic '+Buffer.from('factory:synthetic-test-key').toString('base64');
 assert.equal((await (await fetch(root+'/api/scores',{headers:{Authorization:auth}})).json()).records.length,4);
 console.log('PASS Chromium four combinations/name gate, SQLite restart, filtered history, idempotency, validation, auth, unavailable status');
 console.log('Synthetic evidence:',directory);
}finally{await browser.close();await stop(server);}
