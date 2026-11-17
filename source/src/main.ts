import {rendererChoice,recordRuntime,sampleRuntime,runtimeError} from './runtime';
import {setupReportImport} from './reportUI';
import {Capability,supportNames} from './capabilities';
import Phaser from 'phaser';
import './style.css';
import { FactoryModel, defaults, Stage, names, Config } from './model';
import { Workshop } from './Workshop';
import {roleFamily,roleAsset} from './roleVisuals';
let model = new FactoryModel();
const scene = new Workshop(model);
const choice=rendererChoice(new URLSearchParams(location.search).get('renderer')==='canvas');
const game = new Phaser.Game({ canvas:choice.canvas,/* Phaser3.80 runtime accepts WebGL here; its declaration only names 2D. */ context:choice.context as unknown as CanvasRenderingContext2D,type: choice.webgl?Phaser.WEBGL:Phaser.CANVAS, parent: 'game', backgroundColor: '#c6d0c5', scene, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: Math.max(200, window.innerHeight - 180) }, fps:{target:30,limit:30,smoothStep:true},render: { antialias: true, powerPreference:'low-power' } });
const el = (id: string) => document.getElementById(id)!;
let lastUI = 0;
scene.onChange = () => { const now = Date.now(); if (now - lastUI < 150)
    return; lastUI = now; el('metrics').textContent = `投入 ${model.input}  新完 ${model.done} 初完 ${model.initialCompleted}  WIP ${model.wip}  人员 ${model.deployedWorkers.length}  ${Math.floor(model.time / 3600)}h ${Math.floor(model.time % 3600 / 60)}m`; el('notice').textContent = model.notice; el('start').textContent = model.running ? '暂停' : model.finished ? '班次结束' : model.started ? '继续' : '开始班次'; if (scene.selectedStation) {
    const s = model.stations.find(s => s.id === scene.selectedStation)!;
    const w = model.workers.find(w => w.id === s.worker);
    const q = model.products.filter(p => p.station === s.id && p.state === 'queue').length;
    el('inspector').hidden = false;
    el('inspector').innerHTML = `<b>${names[s.stage]} · ${s.id}</b><p>${w ? (supportNames[w.role]||names[w.role as Stage])+' 员工 #' + w.id + ' / ' + (w.walking > 0 ? '行走中' : '已到岗') : '空工位'}<br>本站排队 ${q} 件 / 工区共享 ${model.queueFor(s.stage)} 件${s.stage==='VI'?'（待检 '+(model.queueFor('VI')-model.outQueue)+' / 待OUT '+model.outQueue+'）':''} · 本轮模拟 COF ${s.active.map(id=>model.products.find(p=>p.id===id)?.cof).filter(n=>n!==undefined).join('/')||'—'} · 已处理 ${s.completed} 件<br>${s.active.length ? '加工 ' + s.active.length + ' 件 / 剩余 ' + Math.ceil(s.remaining) + ' 秒' : '等待任务'}<br>岗位利用率 ${(100 * s.busy / Math.max(1, model.time)).toFixed(1)}%</p><p class="muted">点击员工后可调往任意空工位；移动期间不产生岗位产能。</p>${w?'<button id="withdraw">撤下此员工</button>':''}<button id="hideinspect">收起</button>`;
    if(w)el('withdraw').onclick=()=>{model.withdraw(w.id);scene.selected=undefined;scene.selectedWorker=undefined;lastUI=0;scene.onChange();};
    el('hideinspect').onclick = () => { scene.selectedStation = undefined; el('inspector').hidden = true; };
} if (model.finished && !reported) {
    reported = true;
    report();
} };
for (const role of Object.keys(names).filter(x=>x!=='MANUAL_PEEL') as Capability[]) {
    const card = document.createElement('button');
    card.className = 'card';
    card.dataset.role = role;card.dataset.family=roleFamily(role==='BD_SUPPORT'||role==='MULTI_SUPPORT'?'BD':role==='POL_SUPPORT'?'POL':role==='INSPECT_SUPPORT'?'VI':role);
    const key=roleAsset[role==='BD_SUPPORT'||role==='MULTI_SUPPORT'?'BD':role==='POL_SUPPORT'?'POL':role==='INSPECT_SUPPORT'?'VI':role];
    card.innerHTML = `<img src="v05/roles/sprites/${key}.png"><span>${supportNames[role]||names[role as Stage]}<br><small>可重复部署</small></span>`;
    card.onclick = () => { scene.selected = role; scene.selectedWorker = undefined; document.querySelectorAll('.card').forEach(c => c.classList.remove('active')); card.classList.add('active'); model.notice = '已选 ' + (supportNames[role]||names[role as Stage]) + '：点击任意空工位'; };
    let start: {
        x: number;
        y: number;
    } | undefined;
    card.onpointerdown = e => { start = { x: e.clientX, y: e.clientY }; card.setPointerCapture(e.pointerId); scene.selected = role; scene.selectedWorker = undefined; };
    card.onpointerup = e => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10)
        scene.deployAt(e.clientX, e.clientY); start = undefined; };
    el('cards').appendChild(card);
}
el('start').onclick = () => { if (model.finished)
    return; model.started = true; model.running = !model.running; model.notice = model.running ? '班次运行中 · 设备无人时产品会排队' : '已暂停 · 可调整人员排布'; };
el('speed').onclick = () => { model.speed = model.speed === 1 ? 2 : model.speed === 2 ? 4 : 1; el('speed').textContent = '×' + model.speed; };
el('home').onclick = () => scene.resetView();
el('fullscreen').onclick = () => { if (document.fullscreenElement)
    void document.exitFullscreen();
else
    void document.documentElement.requestFullscreen(); };
let reported = false;
function reset(config: Partial<Config> = model.config) { model = new FactoryModel(config); scene.model = model; scene.people.clear(); scene.items.clear(); scene.views.clear(); scene.selected = undefined; scene.selectedWorker = undefined; scene.selectedStation = undefined; scene.zoomFactor = 1; scene.scene.restart(); el('inspector').hidden = true; el('speed').textContent = '×1'; reported = false; }
el('reset').onclick = () => reset();
const configDialog = el('config') as HTMLDialogElement;
const fields: [
    keyof Config,
    string,
    number,
    number,
    number
][] = [['manualPeelCapacityPerShift', '额外撕 POL 人员示例产能/10h（非现场值，留空待确认）', .01, Infinity, .01], ['averageCOF', '平均维修 COF / 片', .1, 20, .1], ['bdYield', 'BD 成功率（演示）', .01, 1, .01], ['polYield', 'POL 成功率（演示）', .01, 1, .01], ['blackRatio', '需黑胶型号比例（演示）', 0, 1, .05], ['cutRatio', '需切割型号比例（待确认）', 0, 1, .05], ['input', '计划投入 TV / 片', 0, Infinity, 1], ['plan', '目标完成 / 片', 0, Infinity, 1], ['secondsPerReal', '每现实秒模拟秒数', 1, 600, 1], ['mntBubble', 'MNT 脱 POL 数（固定）', 300, 300, 1]];
el('settings').onclick = () => { model.running = false; el('configform').innerHTML = fields.map(([key, title, min, max, step]) => `<label>${title}<input name="${key}" type="number" ${key==='mntBubble'?'readonly':''} min="${min}" ${Number.isFinite(max)?`max="${max}"`:``} step="${step}" ${key==='manualPeelCapacityPerShift'?'':'required'} value="${model.config[key]??''}"></label>`).join(''); configDialog.showModal(); };
el('apply').onclick = () => { const form = el('configform') as HTMLFormElement; if (!form.reportValidity())
    return; const config = { ...defaults }; for (const [key] of fields)
    {const value=(form.elements.namedItem(key) as HTMLInputElement).value;if(key==='manualPeelCapacityPerShift')config[key]=value===''?null:Number(value);else config[key]=Number(value);}for(const key of ['input','plan','mntBubble'] as const){if(!Number.isSafeInteger(config[key])||config[key]<0){const field=form.elements.namedItem(key) as HTMLInputElement;field.setCustomValidity('请输入非负安全整数（不超过 '+Number.MAX_SAFE_INTEGER+'）');field.reportValidity();field.oninput=()=>field.setCustomValidity('');return;}} reset(config); configDialog.close(); };
el('closeconfig').onclick = () => configDialog.close();
const resultDialog = el('report') as HTMLDialogElement;
function report() { model.running = false; const r = model.results(); el('reportbody').innerHTML = `<p class="result">${r.met ? '生产计划已达成' : '生产计划未达成'} · ${r.completed} / ${r.plan}</p><p>${model.finished ? '完整 10 小时班次' : '当前时刻快照（尚未结束班次）'} · 初始 TV ${r.initialTV} / 已完 ${r.initialCompleted} · 初始OUT ${r.initialOut} / 已完 ${r.initialOutCompleted} · 新增完成 ${r.newCompleted} · FA共享 ${r.sharedFA} · 峰值 WIP ${r.peakWIP} · FA 待派 ${r.pendingTV} · MNT 待脱泡 ${r.pendingMNT} · 人员 ${r.people} · 返修 ${r.returns}</p><p>手撕产能${model.config.manualPeelCapacityPerShift===null?'待确认':'使用示例，非现场值'} · 未利用工时比例 ${(r.redundancy * 100).toFixed(1)}%（含缺料与调动，不等于可裁减人数）</p><table><tr><th>员工</th><th>岗位资格</th><th>在岗期间利用率</th></tr>${r.utilization.map(w => `<tr><td>#${w.id}</td><td>${w.role}</td><td>${(w.utilization * 100).toFixed(1)}%</td></tr>`).join('')}</table><p class="muted">优先比较是否满足生产计划，再在相同参数下比较人数及未利用工时。切割需求将停在待确认区。产能、成功率及 COF 配置均为演练估算，不能直接作为正式排班承诺。</p>`; resultDialog.showModal(); }
el('results').onclick = report;
el('closereport').onclick = () => resultDialog.close();
const resize = () => { const rect = el('game').getBoundingClientRect(); game.scale.resize(rect.width, rect.height); game.scale.refresh(); };
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(() => requestAnimationFrame(resize)).observe(el('game'));
sampleRuntime(()=>({booted:game.isBooted,renderer:game.renderer?.type,canvas:{width:game.canvas?.width,height:game.canvas?.height,client:game.canvas?.getBoundingClientRect().toJSON()},scene:scene.sys?.settings.key,active:scene.sys?.isActive(),camera:scene.cameras?.main?{x:scene.cameras.main.scrollX,y:scene.cameras.main.scrollY,zoom:scene.cameras.main.zoom}:null,textures:game.textures?.getTextureKeys().length}));
choice.canvas.addEventListener('webglcontextlost',()=>{recordRuntime('phase','WebGL上下文丢失');model.running=false;runtimeError('WebGL上下文丢失，已暂停并保留当前班次；等待浏览器恢复');});
choice.canvas.addEventListener('webglcontextrestored',()=>{recordRuntime('phase','WebGL上下文已恢复，班次仍暂停');const status=el('boot-status');status.textContent='图形上下文已恢复，班次已保留并保持暂停，可点击继续。';setTimeout(()=>status.hidden=true,5000);});
setTimeout(()=>{if(!scene.viewReady)runtimeError('车间初始化未完成，请打开诊断查看加载失败资源及场景状态');},15000);
requestAnimationFrame(resize);
if (new URLSearchParams(location.search).has('qa'))
    Object.assign(window, { factoryGame: game, getFactoryModel: () => model });

setupReportImport(()=>model,()=>{scene.items.forEach(o=>o.destroy());scene.items.clear();lastUI=0;scene.onChange();});
