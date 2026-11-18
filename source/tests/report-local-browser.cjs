const {chromium}=require('playwright');
const assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath()});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],failed=[],uploads=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status());});
  page.on('request',r=>{if(r.method()!=='GET')uploads.push(r.method());});
  await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:4186/')+'?qa');
  assert((await page.title()).includes('工厂'));
  await page.waitForFunction(()=>window.factoryGame?.scene.scenes[0]?.viewReady);
  assert(await page.locator('canvas').isVisible());
  for(const file of ['synthetic-xlsx.xlsx','synthetic-biff8.xls','synthetic-xlsx.xlsx']){
   await page.locator('#import-report').click();
   await page.locator('#report-file').setInputFiles(path.join(__dirname,'fixtures/formats',file));
   await page.locator('#import-preview').waitFor({state:'visible'});
   for(const [key,value] of Object.entries({BD:66,BLACK:43,TAPE:0,POL_TOTAL:6,VI:59}))assert.equal(await page.locator(`[data-wip=${key}]`).inputValue(),String(value));
   assert((await page.locator('#import-trace').textContent()).includes('50 4B')||(await page.locator('#import-trace').textContent()).includes('D0 CF'));
   await page.locator('#import-ack').check();await page.locator('#confirm-import').click();
   assert.deepEqual(await page.evaluate(()=>({tv:window.getFactoryModel().initialTV,fa:window.getFactoryModel().sharedFA})),{tv:250,fa:61});
  }
  await page.locator('#import-report').click();
  await page.locator('#report-file').setInputFiles({name:'PRIVATE_FILENAME.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('PRIVATE_BODY_NEVER_LOG_THE_REMAINDER_123456')});
  await page.waitForFunction(()=>document.querySelector('#import-error').textContent.includes('未知格式'));
  const diagnostic=await page.locator('#import-trace').textContent();
  assert(diagnostic.includes('50 52 49 56 41 54 45 5F 42 4F 44 59 5F 4E 45 56'));
  assert(!diagnostic.includes('PRIVATE_'));assert(!diagnostic.includes('123456'));
  assert(!JSON.stringify(await page.evaluate(()=>window.getFactoryDiagnostics().import)).includes('PRIVATE_'));
  assert.equal(await page.evaluate(()=>window.getFactoryModel().initialTV),250);
  const out=path.resolve(process.env.QA_OUTPUT||'artifacts/browser-import');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'local-only-diagnostics.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(uploads,[]);
  fs.writeFileSync(path.join(out,'local-browser-results.json'),JSON.stringify({browser:browser.version(),url:page.url(),standardXlsxAndXlsConfirmed:true,repeatReplacesNotAdds:true,initialTV:250,sharedFA:61,headerHexLimited16:true,diagnosticsNoBodyOrFilename:true,errors,failed,uploads,realCompanyFile:false,chrome109:false},null,2));
  console.log('PASS browser XLSX/XLS confirm, repeat replacement, HEX privacy, failed import preservation; no console errors/404/uploads');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
