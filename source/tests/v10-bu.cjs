const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'), ts=require('typescript');
const cache={};function load(name){if(cache[name])return cache[name];const m={exports:{}};cache[name]=m.exports;
 const text=fs.readFileSync(path.join(__dirname,'../src/v10',name+'.ts'),'utf8');
 new Function('exports','require','module',ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText)(m.exports,n=>load(n.slice(2)),m);return m.exports;}
const P=load('plan'),S=load('spec'),E=load('engine');
for(const [model,panel] of Object.entries({BAB238AAMM:'OC',AB238AAM2B:'OC',AB238AA31M:'LCM',AB238AAB:'OC',AB238AAD:'OC',AB238AA3:'OC',AB238AAM:'LCM',AB238AA1:'LCM',AB238AAA1:undefined}))assert.equal(P.classifyMntPanel(model),panel,model);
const date='20261119', row=(rawModel,day=300,night=100,dateValue=date)=>({date:dateValue,rawModel,day,night,source:'SYNTHETIC'});
assert.equal(P.normalizePlan(row('AB315AAA1 → AB238AAA1')).bu,'TV');
assert.equal(P.normalizePlan(row('AB340AAA1')).bu,'TV');
assert.equal(P.normalizePlan(row('BAB238AAA1')).bu,'MNT');
for(const n of [120,600])assert.equal(P.normalizePlan(row('AB'+n+'AAA1')).valid,false);
assert.match(P.normalizePlan(row('AB238D001')).reason,/D/);
assert.equal(P.normalizePlan(row('BAD')).valid,false);
const expectedRates={236:[.23,.31,1.23,.01],185:[.22,.50,2.70,.03],215:[.18,.39,1.62,.02],238:[.33,.35,2.68,.04],245:[.26,.70,2.53,.03],240:[1.1,1.43,2.53,.09],250:[.27,.48,1.96,.03],270:[.37,.69,3.68,.02],282:[.80,1.42,6.09,.05],315:[.42,.86,5.70,.05],320:[.60,.56,3.14,.03],340:[.43,.91,3.14,.02],400:[.17,.30,1.65,.01],430:[.32,.53,3.47,.02],550:[.61,.88,4.66,.02]};
for(const [size,rates] of Object.entries(expectedRates)){
 const r=row('AB'+size+'AAA1',10000),f=P.forecastPlan([r],date,P.normalizePlan(r).bu,'DAY');
 assert.deepEqual(P.ngKinds.map(k=>f.diagnostic[k].count),rates.map(n=>Math.round(n*100)));
}
const plans=[row('AB238AAA1'),row('AB238AAA1'),row('AB238AAA2'),row('AB315AAA1'),row('AB239AAA1',0,0),row('AB238D001'),row('AB238AAA1',111,222,'20261120')];
const day=P.forecastPlan(plans,date,'MNT','DAY'),night=P.forecastPlan(plans,date,'MNT','NIGHT');
assert.equal(day.plan,900);assert.equal(night.plan,300);
assert.equal(P.forecastPlan(plans,'20261120','MNT','NIGHT').plan,222);
assert.equal(day.diagnostic.POL.count,3);assert.equal(day.diagnostic.REVIEW.count,24);
assert.ok(day.batches.some(x=>x.kind==='REVIEW'));
assert.throws(()=>P.forecastPlan([row('AB239AAA1')],date,'MNT','DAY'),/未配置/);
assert.throws(()=>P.forecastLots(day,'MNT',{},P.demoArrival),/未确认/);
for(const bu of ['TV','MNT'])for(const shift of ['DAY','NIGHT']){
 const scenario=P.shiftScenario(bu,shift,date),formation={};
 for(const stage of S.visibleTowers(scenario))if(stage!=='BUBBLE')formation[stage]=Array.from({length:S.stageSlots(stage,scenario)},(_,i)=>i+1);
 const a=E.evaluate(scenario,formation),b=E.evaluate(scenario,formation),sim=a.simulation;
 assert.deepEqual(a.scoreBreakdown,b.scoreBreakdown);assert.deepEqual(sim,b.simulation);
 assert.equal(sim.opening,12);assert.equal(sim.input,0);assert.ok(sim.forecastInput>0);assert.ok(sim.successfulOut>0);
 assert.ok(sim.batches.every((entry,i)=>entry.count<=8&&(i===0||sim.batches[i-1].end<=entry.start+1e-8)));
 for(const lot of scenario.lots.filter(l=>l.source==='forecast'))assert.ok(lot.at>0);
 if(bu==='MNT'){
  for(const [stage,max] of Object.entries({REMOVE:2,BD:2,PEEL:1,POL:1,CUT:1,FILM:3,PI:3,OC_VI:4,LCM_VI:2})){
   assert.equal(S.stageSlots(stage,scenario),max);
   assert.throws(()=>S.validate(scenario,{[stage]:[max+1]}),/部署位不合法/);
  }
  assert.equal(S.capacity('PEEL',scenario.lots[0]),200);
  assert.ok(scenario.lots.filter(l=>l.source==='forecast'&&l.kind==='POL').every(l=>l.stage==='PEEL'&&S.route(l)[1]==='POL'));
  assert.equal(S.stageSlots('VI',scenario),0);
  const adjusted=S.clone(scenario),eligible=adjusted.lots.filter(l=>l.kind==='POL'&&l.stage==='PEEL'),sum=eligible.reduce((n,l)=>n+l.count,0);
  S.configurePOL(adjusted,.3,.6);
  const lots=adjusted.lots.filter(l=>l.kind==='POL'&&l.stage==='PEEL');
  assert.equal(lots.reduce((n,l)=>n+l.count,0),sum);
  assert.equal(lots.filter(l=>l.black).reduce((n,l)=>n+l.count,0),Math.round(sum*.3));
  assert.equal(lots.filter(l=>l.cut).reduce((n,l)=>n+l.count,0),Math.round(sum*.6));
  assert.deepEqual(S.route(lots.find(l=>l.black&&l.cut)) .slice(0,5),['PEEL','POL','BUBBLE','CUT','BLACK']);
  S.configurePOL(adjusted,0,0);
  assert.ok(adjusted.lots.filter(l=>l.kind==='POL').every(l=>!l.black&&!l.cut));
  assert.equal(S.capacity('BD',scenario.lots[0]),115);
  assert.ok(sim.ledger.OC_VI.processed>0&&sim.ledger.LCM_VI.processed>0&&sim.ledger.CUT.processed>0);
  assert.ok(scenario.lots.some(l=>l.kind==='POL'&&!S.route(l).includes('CUT')&&!S.route(l).includes('BLACK')));
  assert.ok(scenario.lots.some(l=>l.kind==='FILM'));
  assert.ok(scenario.lots.filter(l=>l.kind==='FILM').every(l=>!S.route({...l,black:true}).includes('BLACK')));
  const onlyOC=E.simulate(scenario,{...formation,LCM_VI:[]});assert.equal(onlyOC.ledger.LCM_VI.processed,0);assert.ok(onlyOC.ledger.LCM_VI.closing>0);
 }else assert.equal(S.stageSlots('BD',scenario),2);
}
console.log('PASS plan, 15 NG sizes, four BU/shift modes, explicit routes, OC/LCM stops and deterministic conservation');
