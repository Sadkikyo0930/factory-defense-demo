import {WipSnapshot,validateSnapshot,splitPOL} from './report';
import {queueStage,holdingPoint,roundRobin,transportPoint} from './dispatching';
import {Capability,qualified,supportNames} from './capabilities';
export type Stage = 'FA' | 'MANUAL_PEEL' | 'REMOVE' | 'TAPE' | 'BD' | 'UV' | 'PEEL' | 'POL' | 'BUBBLE' | 'BLACK' | 'FILM' | 'PI' | 'VI';
export type Kind = 'BD' | 'POL' | 'FILM' | 'REVIEW';
export const names: Record<Stage, string> = { FA:'FA 分析',MANUAL_PEEL:'撕 POL 加人位',REMOVE: '祛除', TAPE: '贴胶', BD: 'BD', UV: 'UV', PEEL: '撕 POL', POL: '贴 POL', BUBBLE: '共享脱泡', BLACK: '黑胶', FILM: '贴膜', PI: 'PI', VI: 'VI / OUT' };
export const rates: Partial<Record<Stage, number>> = { REMOVE: 170, TAPE: 800, BD: 130, UV: 300, PEEL: 120, POL: 65, BLACK: 240, FILM: 120, PI: 400, VI: 300 };
export const specs: {
    stage: Stage;
    count: number;
    x: number;
    y: number;
    dx: number;
}[] = [{ stage: 'REMOVE', count: 3, x: 290, y: 255, dx: 125 }, { stage: 'TAPE', count: 1, x: 710, y: 255, dx: 0 }, { stage: 'BD', count: 2, x: 900, y: 255, dx: 135 }, { stage: 'UV', count: 1, x: 1190, y: 255, dx: 0 }, { stage: 'PEEL', count: 1, x: 290, y: 490, dx: 0 }, { stage: 'POL', count: 2, x: 460, y: 490, dx: 135 }, { stage: 'BUBBLE', count: 1, x: 795, y: 490, dx: 0 }, { stage: 'BLACK', count: 1, x: 1020, y: 490, dx: 0 }, { stage: 'FILM', count: 1, x: 350, y: 730, dx: 0 }, { stage: 'PI', count: 2, x: 660, y: 730, dx: 135 }];
export interface Config {
    faSecondsPerPiece:number;
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
export const defaults: Config = { faSecondsPerPiece:90,manualPeelCapacityPerShift:null,viCount: 4, averageCOF: 2, bdYield: .68, polYield: .8, blackRatio: .3, cutRatio: 0, input: 100, plan: 70, secondsPerReal: 60, mntBubble: 300 };
export interface Worker {
    id: number;
    role: Capability;
    station: string;
    walking: number;
    busy: number;
    deployedAt: number;withdrawn?:boolean;withdrawnAt?:number;
    staffedSeconds?:number;
}
export interface Station {
    operational:boolean;
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
    private lastAssigned:Partial<Record<Stage,string>>={};
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
    constructor(config: Partial<Config> = {}) { this.config = { ...defaults, ...config,viCount:4,mntBubble:300 };if(this.config.manualPeelCapacityPerShift!==null&&(!Number.isFinite(this.config.manualPeelCapacityPerShift)||this.config.manualPeelCapacityPerShift<=0))throw new Error('手撕产能须为正数或留空');if(!Number.isFinite(this.config.faSecondsPerPiece)||this.config.faSecondsPerPiece<=0)throw Error('FA分析秒数须为正数（演练值待现场确认）');for(const key of ['input','plan','mntBubble'] as const)if(!Number.isSafeInteger(this.config[key])||this.config[key]<0)throw new Error(key+' 必须为非负安全整数');this.pendingTV=this.config.input;this.pendingMNT=this.config.mntBubble; for (const spec of [...specs,{stage:'FA' as Stage,count:1,x:100,y:700,dx:0},{stage:'MANUAL_PEEL' as Stage,count:1,x:195,y:490,dx:0}, { stage: 'VI' as Stage, count: 4, x: 1050, y: 680, dx: 145 }])
        for (let i = 0; i < spec.count; i++)
            this.stations.push({ id: spec.stage + '-' + (i + 1), stage: spec.stage, x: spec.stage==='VI'?1045+(i%2)*155:spec.x+i*spec.dx, y:spec.stage==='VI'?660+Math.floor(i/2)*135:spec.y, operational:true, active: [], remaining: 0, total: 0, busy: 0, completed: 0, light: 'empty' }); }
    applyInitialWip(snapshot:WipSnapshot){
        if(this.started||this.time>0||this.materializedTV>0||this.done>0||this.initialCompleted>0)throw Error('仅班次开始前可替换初始WIP；当前演练未改变，请先结束或重置');
        validateSnapshot(snapshot);const c=snapshot.counts,pol=splitPOL(c.POL_TOTAL,snapshot.peelRatio);
        const total=Object.entries(c).filter(([k])=>k!=='FA').reduce((n,[,v])=>n+v,0);if(!Number.isSafeInteger(total+this.config.input))throw Error('初始TV WIP加计划投入超出安全整数范围');
        this.products=[];this.lastAssigned={};for(const s of this.stations){s.active=[];s.remaining=0;s.total=0;}
        this.initialPending={REMOVE:c.REMOVE,TAPE:c.TAPE,BD:c.BD,UV:c.UV,PEEL:pol.peel,POL:pol.pol,FILM:c.FILM,PI:c.PI,VI:c.VI,OUT:c.OUT,BLACK:c.BLACK};this.initialTV=total;this.initialCompleted=0;this.initialOut=c.OUT;this.initialOutCompleted=0;this.sharedFA=c.FA;this.lastImport=JSON.parse(JSON.stringify(snapshot));this.peakWIP=total;this.fillInitial();this.notice='初始TV WIP '+total+' 已替换导入；FA共享未分配 '+c.FA+'；不是新增IN';
    }
    fillInitial(){const keys=Object.keys(this.initialPending);let changed=true;while(this.products.length<96&&changed){changed=false;for(const stage of keys){if(this.products.length>=96)break;if(this.initialPending[stage]<=0)continue;
        // Keep a small head for every imported queue; an unstaffed large upstream
        // reservoir must not consume all detailed slots and starve VI / OUT.
        if(this.products.filter(p=>p.route[p.step]===(stage==='OUT'?'VI':stage)&&p.state!=='exit').length>=4)continue;
        this.initialPending[stage]--;changed=true;
        const kind:Kind=['REMOVE','TAPE','BD','UV'].includes(stage)?'BD':['PEEL','POL','BLACK'].includes(stage)?'POL':stage==='FILM'?'FILM':'REVIEW';let route=this.route(kind,stage==='BLACK'||this.random()<this.config.blackRatio);if(stage==='PI')route=['PI','VI'];if(stage==='VI'||stage==='OUT')route=['VI'];const step=stage==='OUT'?0:route.indexOf(stage as Stage);if(step<0)throw Error('初始WIP映射失败');
        const p:Product={id:++this.serial,kind,mode:'TV',route,step,origin:'initial',initialOut:stage==='OUT',state:'queue',travel:1,from:{x:110,y:540},to:{x:110,y:540},cof:this.nextCOF(),attempt:0,passed:false,outPhase:stage==='OUT',queueAt:0};p.to=holdingPoint(stage==='OUT'?'VI':stage as Stage);p.from={...p.to};this.products.push(p);
        }} }
    queueFor(stage:Stage){const key=queueStage(stage);return (this.initialPending[key]||0)+(key==='VI'?(this.initialPending.OUT||0):0)+(key==='FA'?this.pendingTV:0)+this.products.filter(p=>p.state==='queue'&&p.route[p.step]===key).length;}
    get outQueue(){return (this.initialPending.OUT||0)+this.products.filter(p=>p.state==='queue'&&p.route[p.step]==='VI'&&p.outPhase).length;}
    get faWaiting(){return this.pendingTV+this.products.filter(p=>p.state==='return'||(p.route[p.step]==='FA'&&p.state!=='work')).length;}
    stationReady(s:Station){const w=this.workers.find(w=>w.id===s.worker);return !!(s.operational&&w&&!w.withdrawn&&w.station===s.id&&w.walking===0&&(s.stage!=='MANUAL_PEEL'||this.config.manualPeelCapacityPerShift!==null));}
    private releaseInbound(s:Station){
        // Started work stays on the machine. A reservation still in transit returns to its shared bay.
        const keep:number[]=[];for(const id of s.active){const p=this.products.find(p=>p.id===id);if(p?.state==='moving'){p.from=transportPoint(p.from,p.to,p.travel);p.station=undefined;p.to=holdingPoint(p.route[p.step]);p.travel=0;}else if(p)keep.push(id);}
        s.active=keep;if(!keep.length){s.remaining=0;s.total=0;}s.light=keep.length?'paused':s.operational?'empty':'disabled';
    }
    setStationOperational(id:string,operational:boolean){const s=this.stations.find(s=>s.id===id);if(!s)return '工位不存在';s.operational=operational;if(!operational)this.releaseInbound(s);this.notice=id+(operational?' 已恢复可用':' 已停用，保留在制进度');return '';}
    withdraw(workerId:number){const w=this.workers.find(w=>w.id===workerId);if(!w||w.withdrawn)return '员工已在待命区';const s=this.stations.find(s=>s.id===w.station);if(s&&s.worker===w.id){s.worker=undefined;this.releaseInbound(s);}w.staffedSeconds=(w.staffedSeconds||0)+this.time-w.deployedAt;w.withdrawn=true;w.withdrawnAt=this.time;w.walking=0;w.station='';this.notice='员工 #'+w.id+' 已回待命区，原工位加工进度保留，可再次拖动部署';return '';}
    get standbyWorkers(){return this.workers.filter(w=>w.withdrawn);}
    get deployedWorkers(){return this.workers.filter(w=>!w.withdrawn);}
    random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
    get wip() { return this.input+this.initialTV-this.done-this.initialCompleted; }
    get queueCount(){return this.products.filter(p=>p.state==='queue').length;}
    nextCOF(){const base=Math.floor(this.config.averageCOF);return base+(this.random()<this.config.averageCOF-base?1:0);}
    assign(role: Capability, target: string, workerId?: number) { const s = this.stations.find(s => s.id === target); if (!s)
        return '工位不存在'; if (s.worker !== undefined)
        return '每个工位只能安排一人'; if (!qualified(role,s.stage))
        return '资格不符：需要 ' + names[s.stage]; let w = this.workers.find(w => w.id === workerId); if (workerId !== undefined && !w)
        return '员工不存在'; if (w) {
        if (w.role !== role)
            return '资格不符';
        if (w.walking > 0)
            return '员工正在调动';
        const old = this.stations.find(s => s.id === w!.station);
        if (old){old.worker = undefined;this.releaseInbound(old);}
        if(w.withdrawn){w.withdrawn=false;w.withdrawnAt=undefined;w.deployedAt=this.time;}
        w.station = s.id;
        w.walking = 20 + Math.abs((old?.x || 100) - s.x) / 4 + Math.abs((old?.y || 800) - s.y) / 4;
    }
    else {
        w = { id: this.workers.length + 1, role, station: s.id, walking: this.started ? 70 : 0, busy: 0, deployedAt: this.time };
        this.workers.push(w);
    } s.worker = w.id; this.notice = '员工 ' + w.id + ' → ' + names[s.stage]; return ''; }
    route(kind: Kind, black: boolean): Stage[] { return kind === 'BD' ? ['REMOVE', 'TAPE', 'BD', 'UV', 'PI', 'VI'] : kind === 'POL' ? ['PEEL', 'POL', 'BUBBLE', ...(black ? ['BLACK' as Stage] : []), 'PI', 'VI'] : kind === 'FILM' ? ['FILM', 'PI', 'VI'] : ['VI']; }
    spawn(mode: 'TV' | 'MNT' = 'TV') { if((mode==='TV'?this.pendingTV:this.pendingMNT)<=0||this.products.length>=96)return; const kind = (['BD', 'POL', 'FILM', 'REVIEW'] as Kind[])[(this.materializedTV) % 4]; const p: Product = { id: ++this.serial, kind, mode, route: mode === 'MNT' ? ['BUBBLE'] : ['FA',...this.route(kind, this.random() < this.config.blackRatio)], step: 0, state: 'moving', travel: 0, from: { x: 110, y: 540 }, to: { x: 110, y: 540 }, cof: this.nextCOF(), attempt: 0, passed: false, outPhase: false }; this.products.push(p); if (mode === 'TV')
        {this.pendingTV--;this.materializedTV++;}else this.pendingMNT--; this.dispatch(p, p.from); }
    dispatch(p:Product,from:{x:number;y:number}) {
        p.station=undefined;p.from={...from};p.travel=0;p.queueAt=this.time;
        const stage=p.route[p.step];
        if(!stage){p.state='exit';p.to={x:1340,y:730};return;}
        if(!this.stations.some(s=>queueStage(s.stage)===stage)){p.state='gate';return;}
        p.to=holdingPoint(stage);p.state='moving';
    }
    private allocate(){
        const stages=[...new Set(this.stations.map(s=>queueStage(s.stage)))];
        for(const stage of stages){
            const stations=this.stations.filter(s=>queueStage(s.stage)===stage);
            const queue=this.products.filter(p=>p.state==='queue'&&p.route[p.step]===stage).sort((a,b)=>(a.queueAt??0)-(b.queueAt??0)||a.id-b.id);
            for(const s of roundRobin(stations,this.lastAssigned[stage])){
                if(!queue.length)break;if(s.active.length||!this.stationReady(s))continue;
                const batch=queue.splice(0,s.stage==='BUBBLE'?8:1);
                s.active=batch.map(p=>p.id);s.total=s.remaining=batch[0].outPhase?120:this.duration(s,batch[0]);s.light='receiving';
                for(const p of batch){p.station=s.id;p.from={...p.to};p.to={x:s.x,y:s.y};p.travel=0;p.state='moving';}
                this.lastAssigned[stage]=s.id;
            }
        }
    }
    duration(s: Station, p: Product) { return s.stage==='FA'?this.config.faSecondsPerPiece:s.stage==='MANUAL_PEEL'?36000/(this.config.manualPeelCapacityPerShift||1):s.stage === 'BUBBLE' ? 600 : 36000 / (rates[s.stage] || 300) * (s.stage === 'TAPE' ? p.cof : 1); }
    tick(real: number) { if (!this.running || this.finished)
        return; let remaining = Math.min(real, 30) * this.config.secondsPerReal * this.speed; while (remaining > 0) {
        const boundary=Math.min(5,...this.stations.filter(s=>s.active.length&&s.remaining>0&&this.stationReady(s)&&s.active.every(id=>this.products.find(p=>p.id===id)?.state==='work')).map(s=>s.remaining),...this.workers.filter(w=>w.walking>0).map(w=>w.walking));
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
    step(d:number){
        if(!Number.isFinite(d)||d<=0)throw Error('生产步长须为正数');
        if(this.time===0){this.input=this.config.input;this.mntInput=this.config.mntBubble;this.peakWIP=this.input+this.initialTV;}
        const before=this.time;this.time+=d;
        const travelling=new Map(this.products.filter(p=>['moving','return','exit'].includes(p.state)).map(p=>[p.id,p.state]));
        // Only work present at the start of this interval earns production time.
        for(const s of this.stations){
            if(!s.active.length)continue;
            const active=s.active.map(id=>this.products.find(p=>p.id===id)!);
            if(!this.stationReady(s)||!active.every(p=>p?.state==='work'))continue;
            const used=Math.min(d,s.remaining);s.remaining-=used;s.busy+=used;this.workers.find(w=>w.id===s.worker)!.busy+=used;
            if(s.remaining>0)continue;
            for(const p of active){
                if(s.stage==='VI'&&!p.outPhase){
                    const success=p.kind==='BD'?this.config.bdYield:p.kind==='POL'?this.config.polYield:1;
                    if(this.random()>success){p.state='return';p.station=undefined;p.travel=0;p.from={x:s.x,y:s.y};p.to=holdingPoint('FA');p.attempt++;this.returns++;this.notice='返修 #'+p.id+' 正在返回 FA';continue;}
                    p.outPhase=true;this.dispatch(p,{x:s.x,y:s.y});continue;
                }
                if(s.stage==='BUBBLE'&&p.mode==='TV'&&this.random()<this.config.cutRatio){p.state='gate';p.station=undefined;this.notice='型号要求切割：数量未确认，已停在待确认区';continue;}
                s.completed++;p.step++;this.dispatch(p,{x:s.x,y:s.y});
            }
            s.active=[];s.remaining=0;
        }
        // Travel never consumes machine capacity. Unstaffed/disabled inbound reservations are cancelled atomically.
        for(const p of this.products){
            if(travelling.get(p.id)!==p.state)continue;
            if(p.state==='exit'){p.travel=Math.min(1,p.travel+d/30);if(p.travel===1){p.state='done';if(p.mode==='TV'){if(p.origin==='initial'){this.initialCompleted++;if(p.initialOut)this.initialOutCompleted++;}else this.done++;}else this.mntDone++;}}
            else if(p.state==='moving'){
                const station=p.station?this.stations.find(s=>s.id===p.station):undefined;
                if(station&&!this.stationReady(station)){this.releaseInbound(station);continue;}
                p.travel=Math.min(1,p.travel+d/45);if(p.travel===1){p.state=station?'work':'queue';}
            }else if(p.state==='return'){
                p.travel=Math.min(1,p.travel+d/120);if(p.travel===1){p.kind=(['BD','POL','FILM','REVIEW'] as Kind[])[Math.floor(this.random()*4)];p.route=['FA',...this.route(p.kind,this.random()<this.config.blackRatio)];p.cof=this.nextCOF();p.step=0;p.outPhase=false;p.state='queue';p.to=holdingPoint('FA');p.queueAt=this.time;}
            }
        }
        for(const w of this.workers)w.walking=Math.max(0,w.walking-d);
        this.products=this.products.filter(p=>p.state!=='done');this.fillInitial();
        // Bound the live object count; keep room for each independent WIP bay.
        if(this.products.length<96&&this.pendingTV>0&&this.products.filter(p=>p.route[p.step]==='FA').length<4&&Math.floor(this.time/90)>Math.floor(before/90))this.spawn();
        if(this.products.length<96&&this.pendingMNT>0&&this.products.filter(p=>p.mode==='MNT').length<8&&Math.floor(this.time/90)>Math.floor(before/90))this.spawn('MNT');
        this.allocate();
        for(const s of this.stations)s.light=!s.operational?'disabled':s.active.length?(!this.stationReady(s)?'paused':s.active.some(id=>this.products.find(p=>p.id===id)?.state==='moving')?'receiving':'busy'):!this.stationReady(s)?'empty':'idle';
        this.peakWIP=Math.max(this.peakWIP,this.wip);
    }
    audit(){
        const errors:string[]=[],claimed=new Set<number>(),ids=new Set<number>(),staffed=new Set<number>();
        for(const s of this.stations){if(s.worker!==undefined){const w=this.workers.find(w=>w.id===s.worker);if(staffed.has(s.worker)||!w||w.withdrawn||w.station!==s.id)errors.push('人员归属不同步 '+s.id);staffed.add(s.worker);}for(const id of s.active){const p=this.products.find(p=>p.id===id);if(p&&p.route[p.step]!==queueStage(s.stage))errors.push('工序领取错误 '+id);if(p?.state==='moving'&&!this.stationReady(s))errors.push('向不可用工位派工 '+id);}}
        for(const w of this.workers)if(w.withdrawn?w.station!=='':!staffed.has(w.id))errors.push('员工位置不同步 '+w.id);
        if(this.pendingTV<0||this.pendingMNT<0||Object.values(this.initialPending).some(n=>n<0))errors.push('负数库存');
        for(const s of this.stations){if(s.active.length>(s.stage==='BUBBLE'?8:1))errors.push(s.id+':容量超限');for(const id of s.active){if(claimed.has(id))errors.push('重复领取 '+id);claimed.add(id);const p=this.products.find(p=>p.id===id);if(!p||p.station!==s.id||!['moving','work'].includes(p.state))errors.push('在制状态不同步 '+id);}}
        for(const p of this.products){if(ids.has(p.id))errors.push('重复产品 '+p.id);ids.add(p.id);if(p.state==='work'&&!claimed.has(p.id))errors.push('在制未登记 '+p.id);if(p.state==='queue'&&p.station)errors.push('公共队列绑定工位 '+p.id);}
        const initial=Object.values(this.initialPending).reduce((n,v)=>n+v,0)+this.products.filter(p=>p.origin==='initial').length+this.initialCompleted;
        const fresh=this.pendingTV+this.products.filter(p=>p.mode==='TV'&&p.origin!=='initial').length+this.done;
        const mnt=this.pendingMNT+this.products.filter(p=>p.mode==='MNT').length+this.mntDone;
        if(initial!==this.initialTV)errors.push('初始WIP不守恒');if(fresh!==this.config.input)errors.push('新增IN不守恒');if(mnt!==this.config.mntBubble)errors.push('共享MNT不守恒');
        return {errors,initial,fresh,mnt,sharedFA:this.sharedFA};
    }
    finish() { this.finished = true; this.running = false; this.notice = '10 小时班次结束'; }
    results() { const utilization = this.workers.map(w => ({ id: w.id, role: supportNames[w.role]||names[w.role as Stage], utilization: w.busy / Math.max(1, (w.staffedSeconds||0)+(w.withdrawn?0:this.time-w.deployedAt)) })); return { manualCapacityConfirmed:false,initialWipImport:this.lastImport?'confirmed':'none',initialTV:this.initialTV,initialCompleted:this.initialCompleted,initialOut:this.initialOut,initialOutCompleted:this.initialOutCompleted,sharedFA:this.sharedFA,plan: this.config.plan, completed: this.done+this.initialCompleted,newCompleted:this.done,met: this.done+this.initialCompleted >= this.config.plan, peakWIP: this.peakWIP, people: this.workers.filter(w=>!w.withdrawn||w.busy>0).length,deployedPeople:this.deployedWorkers.length, utilization, redundancy: utilization.length ? 1 - utilization.reduce((n, w) => n + w.utilization, 0) / utilization.length : 0, returns: this.returns, pendingTV:this.pendingTV,pendingMNT:this.pendingMNT,mntInput:this.mntInput,mntDone:this.mntDone,active:this.products.length,time: this.time }; }
}
