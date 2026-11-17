import {WipSnapshot,validateSnapshot,splitPOL} from './report';
import {Capability,qualified,supportNames} from './capabilities';
export type Stage = 'MANUAL_PEEL' | 'REMOVE' | 'TAPE' | 'BD' | 'UV' | 'PEEL' | 'POL' | 'BUBBLE' | 'BLACK' | 'FILM' | 'PI' | 'VI';
export type Kind = 'BD' | 'POL' | 'FILM' | 'REVIEW';
export const names: Record<Stage, string> = { MANUAL_PEEL:'撕 POL 加人位',REMOVE: '祛除', TAPE: '贴胶', BD: 'BD', UV: 'UV', PEEL: '撕 POL', POL: '贴 POL', BUBBLE: '共享脱泡', BLACK: '黑胶', FILM: '贴膜', PI: 'PI', VI: 'VI / OUT' };
export const rates: Partial<Record<Stage, number>> = { REMOVE: 170, TAPE: 800, BD: 130, UV: 300, PEEL: 120, POL: 65, BLACK: 240, FILM: 120, PI: 400, VI: 300 };
export const specs: {
    stage: Stage;
    count: number;
    x: number;
    y: number;
    dx: number;
}[] = [{ stage: 'REMOVE', count: 3, x: 290, y: 255, dx: 125 }, { stage: 'TAPE', count: 1, x: 710, y: 255, dx: 0 }, { stage: 'BD', count: 2, x: 900, y: 255, dx: 135 }, { stage: 'UV', count: 1, x: 1190, y: 255, dx: 0 }, { stage: 'PEEL', count: 1, x: 290, y: 490, dx: 0 }, { stage: 'POL', count: 2, x: 460, y: 490, dx: 135 }, { stage: 'BUBBLE', count: 1, x: 795, y: 490, dx: 0 }, { stage: 'BLACK', count: 1, x: 1020, y: 490, dx: 0 }, { stage: 'FILM', count: 1, x: 350, y: 730, dx: 0 }, { stage: 'PI', count: 2, x: 660, y: 730, dx: 135 }];
export interface Config {
    viCount: number;
    manualPeelCapacityPerShift:number|null;
    initialWipByStation?:Partial<Record<Stage,number>>;
    averageCOF: number;
    bdYield: number;
    polYield: number;
    blackRatio: number;
    cutRatio: number;
    input: number;
    plan: number;
    secondsPerReal: number;
    mntBubble: number;
}
export const defaults: Config = { manualPeelCapacityPerShift:null,viCount: 4, averageCOF: 2, bdYield: .68, polYield: .8, blackRatio: .3, cutRatio: 0, input: 100, plan: 70, secondsPerReal: 60, mntBubble: 300 };
export interface Worker {
    id: number;
    role: Capability;
    station: string;
    walking: number;
    busy: number;
    deployedAt: number;withdrawn?:boolean;withdrawnAt?:number;
}
export interface Station {
    id: string;
    stage: Stage;
    x: number;
    y: number;
    worker?: number;
    active: number[];
    remaining: number;
    total: number;
    busy: number;
    completed: number;
    light: string;
}
export interface Product {
    id: number;
    kind: Kind;
    mode: 'TV' | 'MNT';
    route: Stage[];
    step: number;
    station?: string;
    state: 'moving' | 'queue' | 'work' | 'return' | 'done' | 'gate' | 'exit';
    travel: number;
    from: {
        x: number;
        y: number;
    };
    to: {
        x: number;
        y: number;
    };
    cof: number;
    attempt: number;
    passed: boolean;
    origin?:'initial'|'new';initialOut?:boolean;outPhase: boolean;queueAt?:number;
}
export class FactoryModel {
    config: Config;
    stations: Station[] = [];
    workers: Worker[] = [];
    products: Product[] = [];
    pendingTV=0;pendingMNT=0;mntInput=0;mntDone=0;materializedTV=0;serial=0;
    initialTV=0;initialCompleted=0;initialOut=0;initialOutCompleted=0;sharedFA=0;lastImport?:WipSnapshot;initialPending:Record<string,number>={};
    time = 0;
    started = false;
    running = false;
    speed = 1;
    input = 0;
    done = 0;
    returns = 0;
    peakWIP = 0;
    finished = false;
    seed = 314159;
    notice = '先安排人员，再开始 10 小时班次';
    constructor(config: Partial<Config> = {}) { this.config = { ...defaults, ...config,viCount:4,mntBubble:300 };if(this.config.manualPeelCapacityPerShift!==null&&(!Number.isFinite(this.config.manualPeelCapacityPerShift)||this.config.manualPeelCapacityPerShift<=0))throw new Error('手撕产能须为正数或留空');for(const key of ['input','plan','mntBubble'] as const)if(!Number.isSafeInteger(this.config[key])||this.config[key]<0)throw new Error(key+' 必须为非负安全整数');this.pendingTV=this.config.input;this.pendingMNT=this.config.mntBubble; for (const spec of [...specs,{stage:'MANUAL_PEEL' as Stage,count:1,x:195,y:490,dx:0}, { stage: 'VI' as Stage, count: 4, x: 1050, y: 680, dx: 145 }])
        for (let i = 0; i < spec.count; i++)
            this.stations.push({ id: spec.stage + '-' + (i + 1), stage: spec.stage, x: spec.stage==='VI'?1045+(i%2)*155:spec.x+i*spec.dx, y:spec.stage==='VI'?660+Math.floor(i/2)*135:spec.y, active: [], remaining: 0, total: 0, busy: 0, completed: 0, light: 'empty' }); }
    applyInitialWip(snapshot:WipSnapshot){
        if(this.started||this.time>0)throw Error('仅班次开始前可替换初始WIP；当前演练未改变，请先结束或重置');
        validateSnapshot(snapshot);const c=snapshot.counts,pol=splitPOL(c.POL_TOTAL,snapshot.peelRatio);
        const total=Object.entries(c).filter(([k])=>k!=='FA').reduce((n,[,v])=>n+v,0);if(!Number.isSafeInteger(total+this.config.input))throw Error('初始TV WIP加计划投入超出安全整数范围');
        this.products=[];for(const s of this.stations){s.active=[];s.remaining=0;s.total=0;}
        this.initialPending={REMOVE:c.REMOVE,TAPE:c.TAPE,BD:c.BD,UV:c.UV,PEEL:pol.peel,POL:pol.pol,FILM:c.FILM,PI:c.PI,VI:c.VI,OUT:c.OUT,BLACK:c.BLACK};this.initialTV=total;this.initialCompleted=0;this.initialOut=c.OUT;this.initialOutCompleted=0;this.sharedFA=c.FA;this.lastImport=JSON.parse(JSON.stringify(snapshot));this.peakWIP=total;this.fillInitial();this.notice='初始TV WIP '+total+' 已替换导入；FA共享未分配 '+c.FA+'；不是新增IN';
    }
    fillInitial(){const keys=Object.keys(this.initialPending);let changed=true;while(this.products.length<96&&changed){changed=false;for(const stage of keys){if(this.products.length>=96)break;if(this.initialPending[stage]<=0)continue;
        // Keep a small head for every imported queue; an unstaffed large upstream
        // reservoir must not consume all detailed slots and starve VI / OUT.
        if(this.products.filter(p=>p.route[p.step]===(stage==='OUT'?'VI':stage)&&p.state!=='exit').length>=4)continue;
        this.initialPending[stage]--;changed=true;
        const kind:Kind=['REMOVE','TAPE','BD','UV'].includes(stage)?'BD':['PEEL','POL','BLACK'].includes(stage)?'POL':stage==='FILM'?'FILM':'REVIEW';let route=this.route(kind,stage==='BLACK'||this.random()<this.config.blackRatio);if(stage==='PI')route=['PI','VI'];if(stage==='VI'||stage==='OUT')route=['VI'];const step=stage==='OUT'?0:route.indexOf(stage as Stage);if(step<0)throw Error('初始WIP映射失败');
        const p:Product={id:++this.serial,kind,mode:'TV',route,step,origin:'initial',initialOut:stage==='OUT',state:'queue',travel:1,from:{x:110,y:540},to:{x:110,y:540},cof:this.nextCOF(),attempt:0,passed:false,outPhase:stage==='OUT',queueAt:0};this.products.push(p);this.dispatch(p,p.from);p.state='queue';p.travel=1;
        }} }
    queueFor(stage:Stage){return (this.initialPending[stage==='MANUAL_PEEL'?'PEEL':stage]||0)+(stage==='VI'?(this.initialPending.OUT||0):0)+this.products.filter(p=>p.state==='queue'&&(['MANUAL_PEEL','PEEL'].includes(stage)?p.route[p.step]==='PEEL':p.route[p.step]===stage)).length;}
    get outQueue(){return (this.initialPending.OUT||0)+this.products.filter(p=>p.state==='queue'&&p.route[p.step]==='VI'&&p.outPhase).length;}
    withdraw(workerId:number){const w=this.workers.find(w=>w.id===workerId);if(!w||w.withdrawn)return '员工已撤下';const s=this.stations.find(s=>s.id===w.station);if(s&&s.worker===w.id)s.worker=undefined;w.withdrawn=true;w.withdrawnAt=this.time;w.walking=0;w.station='';this.notice='员工 #'+w.id+' 已撤下，其他排布与加工进度保留';return '';}
    get deployedWorkers(){return this.workers.filter(w=>!w.withdrawn);}
    random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
    get wip() { return this.input+this.initialTV-this.done-this.initialCompleted; }
    get queueCount(){return this.products.filter(p=>p.state==='queue').length;}
    nextCOF(){const base=Math.floor(this.config.averageCOF);return base+(this.random()<this.config.averageCOF-base?1:0);}
    assign(role: Capability, target: string, workerId?: number) { const s = this.stations.find(s => s.id === target); if (!s)
        return '工位不存在'; if (s.worker !== undefined)
        return '每个工位只能安排一人'; if (!qualified(role,s.stage))
        return '资格不符：需要 ' + names[s.stage]; let w = this.workers.find(w => w.id === workerId); if (workerId !== undefined && (!w||w.withdrawn))
        return '员工不存在'; if (w) {
        if (w.role !== role)
            return '资格不符';
        if (w.walking > 0)
            return '员工正在调动';
        const old = this.stations.find(s => s.id === w!.station);
        if (old)
            old.worker = undefined;
        w.station = s.id;
        w.walking = 20 + Math.abs((old?.x || 100) - s.x) / 4 + Math.abs((old?.y || 800) - s.y) / 4;
    }
    else {
        w = { id: this.workers.length + 1, role, station: s.id, walking: this.started ? 70 : 0, busy: 0, deployedAt: this.time };
        this.workers.push(w);
    } s.worker = w.id; this.notice = '员工 ' + w.id + ' → ' + names[s.stage]; return ''; }
    route(kind: Kind, black: boolean): Stage[] { return kind === 'BD' ? ['REMOVE', 'TAPE', 'BD', 'UV', 'PI', 'VI'] : kind === 'POL' ? ['PEEL', 'POL', 'BUBBLE', ...(black ? ['BLACK' as Stage] : []), 'PI', 'VI'] : kind === 'FILM' ? ['FILM', 'PI', 'VI'] : ['VI']; }
    spawn(mode: 'TV' | 'MNT' = 'TV') { const kind = (['BD', 'POL', 'FILM', 'REVIEW'] as Kind[])[(this.materializedTV) % 4]; const p: Product = { id: ++this.serial, kind, mode, route: mode === 'MNT' ? ['BUBBLE'] : this.route(kind, this.random() < this.config.blackRatio), step: 0, state: 'moving', travel: 0, from: { x: 110, y: 540 }, to: { x: 110, y: 540 }, cof: this.nextCOF(), attempt: 0, passed: false, outPhase: false }; this.products.push(p); if (mode === 'TV')
        {this.pendingTV--;this.materializedTV++;}else this.pendingMNT--; this.dispatch(p, p.from); }
    dispatch(p: Product, from: {
        x: number;
        y: number;
    }) { const stage = p.route[p.step]; if (!stage) {
        p.state = 'exit';
        p.travel = 0;
        p.from = { ...from };
        p.to = { x: 1340, y: 730 };
        return;
    } const options = this.stations.filter(s => s.stage === stage); if (!options.length) {
        p.state = 'gate';
        return;
    } const load = (s: Station) => this.products.filter(q => q.id !== p.id && q.station === s.id && q.state !== 'done').length; options.sort((a, b) => load(a) - load(b) || (a.worker === undefined ? 1 : 0) - (b.worker === undefined ? 1 : 0)); const s = options[0]; p.station = s.id; p.from = { ...from }; p.to = { x: s.x, y: s.y }; p.travel = 0; p.state = 'moving'; }
    duration(s: Station, p: Product) { return s.stage==='MANUAL_PEEL'?36000/(this.config.manualPeelCapacityPerShift||1):s.stage === 'BUBBLE' ? 600 : 36000 / (rates[s.stage] || 300) * (s.stage === 'TAPE' ? p.cof : 1); }
    tick(real: number) { if (!this.running || this.finished)
        return; let remaining = Math.min(real, 30) * this.config.secondsPerReal * this.speed; while (remaining > 0) {
        const boundary=Math.min(5,...this.stations.filter(s=>s.active.length&&s.remaining>0&&s.worker!==undefined&&!this.workers.find(w=>w.id===s.worker)?.walking).map(s=>s.remaining),...this.workers.filter(w=>w.walking>0).map(w=>w.walking));
        const d = Math.min(boundary, remaining, 36000 - this.time);
        if (d <= 0) {
            this.finish();
            break;
        }
        this.step(d);
        remaining -= d;
        if (this.time >= 36000)
            this.finish();
    } }
    step(d: number) {
        if(this.time===0){this.input=this.config.input;this.mntInput=this.config.mntBubble;this.peakWIP=this.input+this.initialTV;}
        const before = this.time;
        this.time += d;
        // Reservoir totals are exact safe integers; only a bounded active set is materialized.
        if(this.products.length<96&&this.pendingTV>0&&Math.floor(this.time/90)>Math.floor(before/90))this.spawn();
        if(this.products.length<96&&this.pendingMNT>0&&Math.floor(this.time/90)>Math.floor(before/90))this.spawn('MNT');
        for (const w of this.workers)
            w.walking = Math.max(0, w.walking - d);
        for (const p of this.products) {
            if (p.state === 'exit') {
                p.travel = Math.min(1, p.travel + d / 30);
                if (p.travel === 1) {
                    p.state = 'done';
                    if (p.mode === 'TV')
                        {if(p.origin==='initial'){this.initialCompleted++;if(p.initialOut)this.initialOutCompleted++;}else this.done++;}else this.mntDone++;
                }
            }
            else if (p.state === 'moving') {
                p.travel = Math.min(1, p.travel + d / 45);
                if (p.travel === 1){p.state='queue';p.queueAt=this.time;}
            }
            else if (p.state === 'return') {
                p.travel = Math.min(1, p.travel + d / 120);
                if (p.travel === 1) {
                    p.kind = (['BD', 'POL', 'FILM', 'REVIEW'] as Kind[])[Math.floor(this.random() * 4)];
                    p.route = this.route(p.kind, this.random() < this.config.blackRatio);
                    p.cof=this.nextCOF();
                    p.step = 0;
                    p.outPhase = false;
                    this.dispatch(p, { x: 110, y: 540 });
                }
            }
        }
        for (const s of this.stations) {
            const w = this.workers.find(w => w.id === s.worker);
            const available = w && w.walking === 0&&(s.stage!=='MANUAL_PEEL'||this.config.manualPeelCapacityPerShift!==null);
            if (s.active.length) {
                s.light = available ? 'busy' : 'paused';
                if (!available)
                    continue;
                s.remaining -= d;
                s.busy += d;
                w.busy += d;
                if (s.remaining > 0)
                    continue;
                for (const id of s.active) {
                    const p = this.products.find(p => p.id === id)!;
                    if (s.stage === 'VI' && !p.outPhase) {
                        const success = p.kind === 'BD' ? this.config.bdYield : p.kind === 'POL' ? this.config.polYield : 1;
                        if (this.random() > success) {
                            p.state = 'return';
                            p.travel = 0;
                            p.from = { x: s.x, y: s.y };
                            p.to = { x: 110, y: 540 };
                            p.attempt++;
                            this.returns++;
                            this.notice = '返修 #' + p.id + ' 正在返回 FA';
                            continue;
                        }
                        p.outPhase = true;
                        p.state = 'queue';
                        continue;
                    }
                    if (s.stage === 'BUBBLE' && p.mode === 'TV' && this.random() < this.config.cutRatio) {
                        p.state = 'gate';
                        this.notice = '型号要求切割：数量未确认，已停在待确认区';
                        continue;
                    }
                    s.completed++;
                    p.step++;
                    this.dispatch(p, { x: s.x, y: s.y });
                }
                s.active = [];
            }
            const queue = this.products.filter(p => p.state === 'queue'&&(['PEEL','MANUAL_PEEL'].includes(s.stage)?p.route[p.step]==='PEEL':p.station===s.id)).sort((a,b)=>(a.queueAt||0)-(b.queueAt||0)||a.id-b.id);
            s.light = !available ? 'empty' : queue.length ? 'waiting' : 'idle';
            if (available && !s.active.length && queue.length) {
                const batch = s.stage === 'BUBBLE' ? queue.slice(0, 8) : queue.slice(0, 1);
                s.active = batch.map(p => p.id);
                for (const p of batch){p.state='work';p.station=s.id;}
                s.total = s.remaining = batch[0].outPhase ? 120 : this.duration(s, batch[0]);
                s.light = 'busy';
            }
        }
        this.products=this.products.filter(p=>p.state!=='done');this.fillInitial();
        this.peakWIP = Math.max(this.peakWIP, this.wip);
    }
    finish() { this.finished = true; this.running = false; this.notice = '10 小时班次结束'; }
    results() { const utilization = this.workers.map(w => ({ id: w.id, role: supportNames[w.role]||names[w.role as Stage], utilization: w.busy / Math.max(1, (w.withdrawnAt??this.time) - w.deployedAt) })); return { manualCapacityConfirmed:false,initialWipImport:this.lastImport?'confirmed':'none',initialTV:this.initialTV,initialCompleted:this.initialCompleted,initialOut:this.initialOut,initialOutCompleted:this.initialOutCompleted,sharedFA:this.sharedFA,plan: this.config.plan, completed: this.done+this.initialCompleted,newCompleted:this.done,met: this.done+this.initialCompleted >= this.config.plan, peakWIP: this.peakWIP, people: this.workers.filter(w=>!w.withdrawn||w.busy>0).length,deployedPeople:this.deployedWorkers.length, utilization, redundancy: utilization.length ? 1 - utilization.reduce((n, w) => n + w.utilization, 0) / utilization.length : 0, returns: this.returns, pendingTV:this.pendingTV,pendingMNT:this.pendingMNT,mntInput:this.mntInput,mntDone:this.mntDone,active:this.products.length,time: this.time }; }
}
