async function startNamed(page){await page.locator('#battle-start').click();await page.locator('#challenge-player').fill('Synthetic QA');await page.getByRole('button',{name:'确认开战'}).click();}
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4190/',out=path.resolve(process.env.QA_OUTPUT||'artifacts/v10-combat');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath()});try{
 const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await p.route('**/api/scores',r=>r.fulfill({json:{saved:true}}));await p.goto(base+'?qa');await p.waitForFunction(()=>window.v10Scene?.ready);
 // Fill every real staff slot through user controls; a further click cannot add phantom capacity.
 const bubbleOnField=()=>p.evaluate(()=>window.v10Scene.armyLayer.list.some(o=>o.texture?.key==='v10-bubble-operator'));
 assert.equal(await bubbleOnField(),false);
 const bubble=p.locator('[data-select=BUBBLE]');
 await bubble.click();
 assert.equal(await bubbleOnField(),false);
 const portrait=await bubble.boundingBox();
 const target=await p.evaluate(()=>{const w=window.v10Scene.world,r=window.v10Game.canvas.getBoundingClientRect();return {x:r.left+w.x+75*w.scaleX,y:r.top+w.y+435*w.scaleY};});
 await p.mouse.move(portrait.x+portrait.width/2,portrait.y+portrait.height/2);await p.mouse.down();await p.mouse.move(target.x,target.y,{steps:10});await p.mouse.up();
 assert.equal(await bubbleOnField(),true);assert.equal(await p.locator('#staff-count').innerText(),'0');
 assert(await p.locator('[data-plus=BUBBLE]').isDisabled());
 await p.locator('[data-minus=BUBBLE]').click();assert.equal(await bubbleOnField(),false);
 const all=await p.locator('[data-plus]').evaluateAll(nodes=>nodes.map(n=>n.dataset.plus));for(const stage of all){const add=p.locator(`[data-plus=${stage}]`);while(await add.isEnabled())await add.click();assert(await add.isDisabled());}
 const deployed=await p.evaluate(()=>Object.values(window.v10Session.formation).reduce((n,a)=>n+a.length,0));assert.equal(deployed,18);
 const minus=await p.locator('[data-minus=REMOVE]');
 await minus.click();assert.equal(await p.locator('#count-REMOVE').innerText(),'2');assert.equal(await p.locator('#count-TAPE').innerText(),'1');
 await p.locator('#clear-formation').click();
 await p.locator('[data-plus=REMOVE]').click();assert(await p.locator('[data-plus=BD]').isEnabled());
 // Use a realistic one-per-role formation and two specified VI posts for the visual recording.
 await p.locator('#clear-formation').click();for(const stage of all)if(stage!=='VI')await p.locator(`[data-plus=${stage}]`).click();await p.locator('[data-select=VI]').click();
 for(const [slot,x] of [[2,295],[4,355]]){
  const point=await p.evaluate(x=>{const w=window.v10Scene.world,r=window.v10Game.canvas.getBoundingClientRect();return {x:r.left+w.x+x*w.scaleX,y:r.top+w.y+577*w.scaleY};},x);
  await p.mouse.move(point.x,point.y);
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await p.mouse.click(point.x,point.y,{delay:50});
  await p.waitForFunction(slot=>window.v10Session.formation.VI?.includes(slot),slot);
 }
 assert.deepStrictEqual(await p.evaluate(()=>window.v10Session.formation.VI),[2,4]);
 await p.locator('.roster').evaluate(el=>el.scrollTop=0);
 const roster=await p.locator('.roster').boundingBox(), plus=await p.locator('[data-plus=REMOVE]').boundingBox();
 assert(roster.width>=320&&roster.width<=350);assert(plus.width>=44&&plus.height>=44);
 assert.equal(await p.locator('.element-row').count(),11);
 assert.equal(await p.evaluate(()=>window.v10Game.textures.getTextureKeys().some(k=>k.startsWith('v10-eq-'))),false);
 await p.screenshot({path:path.join(out,'01-prebattle.png')});const original=await p.evaluate(()=>JSON.stringify(window.v10Session.scenario));
 const begin=Date.now();await startNamed(p);await p.waitForFunction(()=>document.body.dataset.phase==='battle');assert.equal(await p.locator('.roster').isVisible(),false);assert.equal(await p.locator('.mission').isVisible(),false);assert(await p.locator('#combat-hud').isVisible());
 assert(await p.evaluate(()=>Boolean(window.v10Scene.combat.actors.get('BUBBLE').operator)));
 assert.equal(await p.evaluate(()=>{try{window.v10Session.setBubbleOperator(false);return false;}catch{return window.v10Session.bubbleOperatorDeployed;}}),true);
 const before=await p.evaluate(()=>window.v10Scene.combat.debug);await p.waitForFunction(()=>window.v10Scene.combat.debug.time>=.49);const entry=await p.evaluate(()=>window.v10Scene.combat.debug);await p.screenshot({path:path.join(out,'02-monster-entry.png')});
 assert(entry.enemies.some(e=>e.wave===0&&e.visible));assert(entry.enemies.every(e=>e.wave===0||!e.visible));assert(entry.enemies.some(e=>e.visible)&&entry.enemies.some(e=>!e.visible),'staggered waves must not spawn all at once');
 const entryPositions=entry.enemies.map(e=>({id:e.id,x:e.x,visible:e.visible}));
 await p.waitForFunction(()=>window.v10Scene.combat.debug.time>=1.55);const attack=await p.evaluate(()=>window.v10Scene.combat.debug);await p.screenshot({path:path.join(out,'03-element-attack.png')});assert(attack.enemies.some(e=>{const old=entryPositions.find(a=>a.id===e.id);return old.visible&&e.x<old.x-20;}),'monsters must visibly advance left');
 for(const t of attack.texts)assert(!/[0-9×%]/.test(t),'combat HP/name must never contain numbers: '+t);assert(attack.enemies.every(e=>e.hp>=0&&e.hp<=102));
 await p.waitForFunction(()=>window.v10Scene.combat.debug.freshShield);await p.screenshot({path:path.join(out,'04-shield-break.png')});
 await p.waitForFunction(()=>window.v10Scene.combat.debug.time>=3.2);
 const waves=await p.evaluate(()=>window.v10Scene.combat.debug);
 assert.equal(new Set(waves.enemies.filter(e=>e.visible).map(e=>e.wave)).size,3);
 assert.equal(new Set(waves.enemies.map(e=>e.lane)).size,4);
 assert(waves.enemies.some(e=>e.wave===2&&e.x<1600&&e.x>1300));
 await p.screenshot({path:path.join(out,'04b-multiple-waves.png')});
 const bounds=await p.evaluate(()=>{const v=window.v10Scene.combat,r=v.root;
  return {actors:[...v.actors.values()].flatMap(a=>[...a.sprites.values()].map(u=>({height:u.sprite.displayHeight*r.scaleY,bottom:r.y+(a.body.y+75)*r.scaleY}))),
    lanes:[...new Set(v.enemies.map(e=>e.y))].map(y=>({top:r.y+(y-122)*r.scaleY,bottom:r.y+(y+67)*r.scaleY}))};});
 assert(bounds.actors.length===11&&bounds.actors.every(a=>a.height>=96&&a.bottom<720));
 assert(bounds.lanes.every(l=>l.top>=52&&l.bottom<=720));
  await p.locator('#battle-result').waitFor({state:'visible',timeout:12000});const elapsed=Date.now()-begin;assert(elapsed>=4700&&elapsed<10000);assert.equal(await p.locator('#detailed-recap').getAttribute('open'),null);assert.equal(await p.locator('#detailed-recap table').isVisible(),false);await p.screenshot({path:path.join(out,'05-independent-results.png')});
 const result=await p.evaluate(()=>window.v10Session.result),telemetry=await p.evaluate(()=>window.v10Scene.combat.telemetry),squads=await p.evaluate(()=>window.v10Scene.combat.enemies.map(e=>e.squad));
 const castStages=new Set(telemetry.casts.map(c=>c.stage==='OUT'?'VI':c.stage));assert.equal(castStages.size,11);assert(telemetry.maxActiveEffects<=30);assert(telemetry.shields.length>0);
 for(const event of telemetry.outcomes){const squad=squads.find(q=>q.id===event.squadId);assert.equal(event.outcome,squad.outcome);const proof=result.simulation.visual.terminal.find(t=>t.lotId===squad.lotId&&t.first<=squad.ordinal&&squad.ordinal<t.first+t.count);assert.equal(event.outcome,proof.outcome);}
 assert(telemetry.outcomes.some(e=>e.outcome==='success'));assert(telemetry.outcomes.some(e=>e.outcome==='failure'));assert.equal(result.scoreBreakdown.total,97.7);
 await p.locator('#detailed-recap > summary').click();assert(await p.locator('#detailed-recap table').isVisible());assert((await p.locator('#detailed-recap').innerText()).includes('134'));await p.screenshot({path:path.join(out,'06-expanded-recap.png')});
 await p.locator('#result-retry').click();assert.equal(await p.evaluate(()=>JSON.stringify(window.v10Session.scenario)),original);assert(await p.locator('.roster').isVisible());
 await p.setViewportSize({width:1600,height:900});
 const cdp=await p.context().newCDPSession(p);
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.15});
 assert((await p.evaluate(()=>visualViewport.scale))>1);
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 await p.locator('[data-minus=REMOVE]').click();assert.equal(await p.locator('#count-REMOVE').innerText(),'0');
 await p.locator('[data-plus=REMOVE]').click();assert.equal(await p.locator('#count-REMOVE').innerText(),'1');
 await p.locator('.roster').evaluate(el=>el.scrollTop=0);await startNamed(p);await p.waitForFunction(()=>window.v10Scene.combat.debug.time>1.7);await p.screenshot({path:path.join(out,'07-combat-1600x900.png')});await p.locator('#skip-battle').click();await p.locator('#battle-result').waitFor({state:'visible'});const replay=await p.evaluate(()=>window.v10Session.result);assert.deepStrictEqual(replay.simulation,result.simulation);assert.deepStrictEqual(replay.scoreBreakdown,result.scoreBreakdown);
 await p.locator('#result-retry').click();await p.locator('#clear-formation').click();await startNamed(p);await p.waitForFunction(()=>window.v10Scene.combat.debug.time>1.5);assert.equal(await p.evaluate(()=>window.v10Scene.combat.telemetry.casts.length),0);await p.locator('#skip-battle').click();await p.locator('#battle-result').waitFor({state:'visible'});
 // Actual Canvas renderer exercises the same art, motion and result flow.
 const canvas=await browser.newPage({viewport:{width:1280,height:720}});canvas.on('pageerror',e=>errors.push(e.message));await canvas.goto(base+'?qa&renderer=canvas');await canvas.waitForFunction(()=>window.v10Scene?.ready);await canvas.locator('[data-plus=VI]').click();await startNamed(canvas);await canvas.waitForFunction(()=>window.v10Scene.combat.debug.time>1.4);assert.equal(await canvas.evaluate(()=>window.v10Game.renderer.type),1);await canvas.screenshot({path:path.join(out,'08-canvas-fallback.png')});await canvas.locator('#skip-battle').click();await canvas.locator('#battle-result').waitFor({state:'visible'});await canvas.close();
 assert.deepStrictEqual(errors,[]);assert.deepStrictEqual(failed,[]);fs.writeFileSync(path.join(out,'combat-browser-results.json'),JSON.stringify({browser:browser.version(),url:base,viewports:['1280x720','1600x900'],durationMs:elapsed,all18SlotsDeployable:true,rosterWidth:roster.width,buttonSize:plus.width,noGlobalHeadcountLimit:true,adjacentRoleUnchanged:true,pageScaleEmulation:true,fourLanes:true,threeWaves:true,monsterEquipmentTexturesLoaded:false,fullBattlefield:true,staggeredEntry:true,leftwardMovement:true,noCombatHPNumbers:true,singleDynamicHP:true,sourceSpecificSquads:true,minimumHeroPixelHeight:Math.min(...bounds.actors.map(a=>a.height)),skills:[...castStages],maxActiveEffects:telemetry.maxActiveEffects,outcomes:telemetry.outcomes,defaultDetailCollapsed:true,exactReplay:true,noUnstaffedAttack:true,canvasFallback:true,score:result.scoreBreakdown,errors,failed,win7Chrome109:false,companyHardware:false},null,2));console.log('PASS combat visuals: real entry and movement, 11 skills, numeric-free current HP, faithful outcomes, 5s finish, collapsed results, 1280/1600, no staff/no attack, Canvas, exact replay');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
