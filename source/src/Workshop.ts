import {recordRuntime,runtimeState,runtimeError,runtimeReady} from './runtime';
import {queueStage,holdingPoint,transportPoint} from './dispatching';
import {Capability,supportNames} from './capabilities';
import Phaser from 'phaser';
import {roleFamily,roleStyle,toolIcon,roleAsset,equipmentAsset} from './roleVisuals';
import { FactoryModel, Stage, names, Product, Station } from './model';
export class Workshop extends Phaser.Scene {
    model: FactoryModel;
    views = new Map<string, {
        body: Phaser.GameObjects.Image;
        lamp: Phaser.GameObjects.Arc;
        status: Phaser.GameObjects.Text;
        bar: Phaser.GameObjects.Rectangle;
    }>();
    people = new Map<number, Phaser.GameObjects.Container>();
    items = new Map<number, Phaser.GameObjects.Container>();
    selected?: Capability;
    selectedWorker?: number;
    selectedStation?: string;
    baseZoom = 1;
    zoomFactor = 1;
    pan = false;
    targetZoomFactor=1;
    cameraTarget={x:710,y:450};
    viewReady=false;
    faLabel!:Phaser.GameObjects.Text;
    lastStatus=0;
    bays=new Map<Stage,Phaser.GameObjects.Text>();
    piles=new Map<Stage,Phaser.GameObjects.Image>();
    onChange: () => void = () => { };
    constructor(model: FactoryModel) { super('workshop'); this.model = model; }
    preload() { recordRuntime('phase','场景preload');recordRuntime('loaded',0);recordRuntime('failed',[]);const complete=()=>recordRuntime('loaded',Number(runtimeState.loaded)+1),failed=(file:Phaser.Loader.File)=>{(runtimeState.failed as string[]).push(file.key+' / '+String(file.url));runtimeError('资源加载失败：'+file.key);};this.load.on('filecomplete',complete);this.load.on('loaderror',failed);this.events.once('shutdown',()=>{this.load.off('filecomplete',complete);this.load.off('loaderror',failed);});for (const key of ['workshop'])
        this.load.image(key, 'art/' + key + '.png');this.preloadV05(); }
    preloadV05(){for(const role of new Set(Object.values(roleAsset)))for(const state of ['idle','walk','work'])this.load.spritesheet(role+'-'+state,'v06/sheets/'+role+'_'+state+'.png',{frameWidth:160,frameHeight:220});for(const key of new Set(Object.values(roleAsset)))this.load.image('role-'+key,'v05/roles/sprites/'+key+'.png');for(const key of new Set(Object.values(equipmentAsset)))if(key!=='inspection_vi'&&key!=='pol_manual_peel')this.load.image('eq-'+key,key==='pol_manual_peel'?'v06/pol_manual_peel.png':'v05/equipment/'+key+'.png');for(const key of ['bd','pol','film','overjudge','ok','ng'])this.load.image('product-'+key,'v05/products/panel_'+key+'.png');}
    text(x: number, y: number, t: string, size = 14, color = '#344b51') { return this.add.text(x, y, t, { fontFamily: 'Microsoft YaHei', fontSize: size, color }).setOrigin(.5); }
    image(x: number, y: number, key: string, w: number, h: number) { const v = this.add.image(x, y, key); v.setScale(Math.min(w / v.width, h / v.height)); return v; }
    create() {
        recordRuntime('phase','场景create');
        this.input.dragDistanceThreshold = 7;for(const role of new Set(Object.values(roleAsset)))for(const state of ['idle','walk','work']){const key=role+'-'+state;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(key,{start:0,end:state==='idle'?3:state==='walk'?7:5}),frameRate:state==='walk'?7:state==='work'?5:3,repeat:-1});}
        this.add.image(700, 450, 'workshop').setDisplaySize(1480, 1000).setDepth(-10);
        const g = this.add.graphics().setDepth(-5);
        // Physical aisles, roller tracks and markings are environment geometry, separate from process routes.
        for (const y of [300, 535, 775]) {
            g.lineStyle(44, 0x526d6d, .8);
            g.lineBetween(145, y, 1320, y);
            g.lineStyle(2, 0xf9db82);
            g.lineBetween(145, y - 24, 1320, y - 24);
            g.lineBetween(145, y + 24, 1320, y + 24);
            for (let x = 160; x < 1320; x += 17) {
                g.lineStyle(2, 0xb2c5bc, .5);
                g.lineBetween(x, y - 17, x, y + 17);
            }
            for (let x = 170; x < 1320; x += 100)
                this.text(x, y, '›', 24, '#ffebae').setDepth(-3);
        }
        g.lineStyle(32, 0x698e86, .75);
        g.lineBetween(145, 300, 145, 820);
        g.lineBetween(1320, 300, 1320, 820);
        g.lineStyle(18, 0xb17b81, .8);
        g.lineBetween(1320, 820, 105, 820);
        this.text(720, 820, '← 返修回流 / FA', 14, '#fff5d1');
        for (const [x, y, title] of [[430, 115, 'BD 精密维修'], [680, 355, 'POL 光学维修'], [350, 595, '贴膜修复'], [730, 595, 'PI 检查'], [1140, 555, 'VI / 出站']] as [
            number,
            number,
            string
        ][]) {
            this.add.rectangle(x, y, 230, 36, 0x294b55).setStrokeStyle(2, 0xd9b66a);
            this.text(x, y, title, 19, '#fff0c5');
        }
        this.text(730,875,'动画为过渡素材 · 员工可跨岗支援 · FA节拍为演练值',11);
        this.text(96, 465, 'FA', 30, '#23474d');
        this.text(100,500,'FA 总量待派',13);this.faLabel=this.text(86,540,'',12).setDepth(951).setBackgroundColor('#fff4d9dd').setPadding(4);
        this.text(1160,855,'VI 4 人工位 · OUT 兼顾',12);
        this.text(1340, 675, 'OUT', 24);
        this.text(1340, 705, 'VI 人员兼顾', 11);
        this.drawStations();this.bays.clear();for(const stage of new Set(this.model.stations.map(s=>queueStage(s.stage)))){const p=holdingPoint(stage);this.add.ellipse(p.x-18,p.y+10,82,23,0x57776e,.22).setDepth(p.y);this.bays.set(stage,this.text(stage==='VI'?1260:p.x-18,stage==='VI'?870:stage==='FA'?620:p.y-22,'',11).setDepth(952).setBackgroundColor('#fff2d9dd').setPadding(2));}recordRuntime('loaded',this.textures.getTextureKeys().length);runtimeReady();
        this.scale.on('resize', this.fit, this);this.events.once('shutdown',()=>{this.scale.off('resize',this.fit,this);this.viewReady=false;this.pan=false;});
        this.fit();
        this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
            // At most 3% per wheel event, rather than an instant 12-20% jump.
            this.targetZoomFactor=Phaser.Math.Clamp(this.targetZoomFactor-Math.sign(dy)*Math.min(Math.abs(dy),120)*.00025,.8,2.4);
        });
        this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.pan=p.rightButtonDown();});
        this.input.on('pointerup',()=>this.pan=false);
        this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.pan&&p.isDown){const c=this.cameras.main;this.cameraTarget.x=Phaser.Math.Clamp(this.cameraTarget.x-(p.x-p.prevPosition.x)*.4/c.zoom,300,1120);this.cameraTarget.y=Phaser.Math.Clamp(this.cameraTarget.y-(p.y-p.prevPosition.y)*.4/c.zoom,150,750);}});
        this.input.mouse?.disableContextMenu();
        this.input.on('drag', (_p: Phaser.Input.Pointer, o: Phaser.GameObjects.Container, x: number, y: number) => { o.setPosition(x, y); });
        this.input.on('dragend', (p: Phaser.Input.Pointer, o: Phaser.GameObjects.Container) => { const pos = this.cameras.main.getWorldPoint(p.x, p.y); const target = this.closest(pos.x, pos.y); const w = this.model.workers.find(w => w.id === o.getData('worker')); if (target && w) {
            const error = this.model.assign(w.role, target.id, w.id);
            this.model.notice = error || this.model.notice;
        } this.onChange(); });
    }
    fit() {
        const c=this.cameras.main;
        const center=this.viewReady?{x:c.midPoint.x,y:c.midPoint.y}:{x:710,y:450};
        this.baseZoom=Math.min(this.scale.width/1450,this.scale.height/920);
        if(!this.viewReady){this.zoomFactor=1;this.targetZoomFactor=1;}
        c.setZoom(this.baseZoom*this.zoomFactor);c.centerOn(center.x,center.y);
        this.cameraTarget=center;this.viewReady=true;
    }
    resetView(){this.cameraTarget={x:710,y:450};this.targetZoomFactor=1;}
    updateCamera(delta:number){
        const c=this.cameras.main;const dt=Math.min(delta,50)/1000;const k=1-Math.exp(-8*dt);
        this.zoomFactor=Phaser.Math.Linear(this.zoomFactor,this.targetZoomFactor,k);
        const x=Phaser.Math.Linear(c.midPoint.x,this.cameraTarget.x,k),y=Phaser.Math.Linear(c.midPoint.y,this.cameraTarget.y,k);
        c.setZoom(this.baseZoom*this.zoomFactor);c.centerOn(x,y);
    }
    closest(x: number, y: number) { return this.model.stations.find(s => Math.abs(s.x - x) < 65 && Math.abs(s.y - 30 - y) < 90); }
    deployAt(clientX: number, clientY: number) { const rect = this.game.canvas.getBoundingClientRect(), point = this.cameras.main.getWorldPoint((clientX - rect.left) * this.scale.width / rect.width, (clientY - rect.top) * this.scale.height / rect.height); const target = this.closest(point.x, point.y); if (target)
        this.choose(target);
    else
        this.model.notice = '请拖到设备或人工岗位上'; this.onChange(); }
    choose(s: Station) { if (this.selected) {
        const error = this.model.assign(this.selected, s.id, this.selectedWorker);
        this.model.notice = error || this.model.notice;
        if (!error)
            this.selectedWorker = undefined;
    } this.selectedStation = s.id; this.onChange(); }
    drawStations() { for (const s of this.model.stations) {
        const key=['FA','VI','MANUAL_PEEL'].includes(s.stage)?'role-'+roleAsset[s.stage]:'eq-'+equipmentAsset[s.stage];
        this.add.ellipse(s.x,s.y+7,108,23,0x274246,.25);
        const body=this.image(s.x,s.y-45,key,['FA','VI','MANUAL_PEEL'].includes(s.stage)?49:105,['FA','VI','MANUAL_PEEL'].includes(s.stage)?75:105).setDepth(s.y);
        if(['FA','VI','MANUAL_PEEL'].includes(s.stage))body.setAlpha(.22);
        // Actual process label covers the source machine's inconsistent printed panel.
        if(!['FA','VI','MANUAL_PEEL'].includes(s.stage)){this.add.rectangle(s.x,s.y-51,66,17,0x254d60).setDepth(s.y+1);this.text(s.x,s.y-51,names[s.stage],11,'#fff5ce').setDepth(s.y+2);}
        this.text(s.x, s.y - (s.stage==='VI'?85:111), s.stage==='FA'?'FA 分析·演练位':names[s.stage] + ' ' + s.id.split('-')[1], 13).setDepth(950).setBackgroundColor('#fff1d5cc').setPadding(3);
        const lamp = this.add.circle(s.x - 43, s.y - 84, 5, 0xea986e).setDepth(951);
        const status = this.text(s.x, s.y + 24, '＋ 部署', 11).setDepth(950).setBackgroundColor('#fff1d5cc').setPadding(2);
        const bar = this.add.rectangle(s.x - 40, s.y + 43, 0, 4, 0x4ec9a5).setOrigin(0, .5).setDepth(951);
        this.add.zone(s.x, s.y - 35, 116, 165).setDepth(s.y + 1).setInteractive().on('pointerdown', () => this.choose(s));
        this.views.set(s.id, { body, lamp, status, bar });
    } }
    path(from: {
        x: number;
        y: number;
    }, to: {
        x: number;
        y: number;
    }, t: number) { return transportPoint(from,to,t); }
    update(_time: number, delta: number) {
        this.updateCamera(delta);
        this.model.tick(Math.min(delta / 1000, .1));
        const m = this.model;this.faLabel.setText('TV待投/分析 '+m.faWaiting+'\nFA共享未分配 '+m.sharedFA+'\nMNT待脱泡 '+m.pendingMNT);
        const alive=new Set(m.products.map(p=>p.id));for(const [id,obj] of this.items)if(!alive.has(id)){obj.destroy();this.items.delete(id);}
        const queues=new Map<string,Product[]>();for(const p of m.products)if(p.state==='queue'){const key=p.route[p.step],q=queues.get(key)||[];q.push(p);queues.set(key,q);}
        if(_time-this.lastStatus>100){this.lastStatus=_time;for (const s of m.stations) {
            const v = this.views.get(s.id)!;
            const q=m.queueFor(s.stage);
            if (['FA','VI','MANUAL_PEEL'].includes(s.stage))
                v.body.setVisible(s.worker === undefined);
            v.lamp.setFillStyle(!s.operational ? 0xef5454 : s.light==='paused'?0xffad48:s.light === 'busy' ? 0x57d895 : q ? 0xff6651 : s.worker === undefined ? 0xf4c069 : 0x7fd2f0);
            const worker=m.workers.find(w=>w.id===s.worker);v.status.setText(!s.operational?'设备停用':s.active.length&&s.light==='paused'?'在制暂停 · 进度保留':worker?.walking?'人员赶往岗位':s.worker===undefined?'＋ 部署':s.light==='receiving'?'接料中':s.light==='busy'?'加工 '+Math.floor((1-s.remaining/s.total)*100)+'%':'待机');
            if(s.operational&&s.stage==='MANUAL_PEEL'&&m.config.manualPeelCapacityPerShift===null)v.status.setText('产能待设置');


            v.status.setColor(q > 2 ? '#b53825' : '#344b51');
            v.bar.width = s.active.length ? 80 * (1 - s.remaining / s.total) : 0;
            if (s.light === 'busy' && m.running)
                v.body.rotation = Math.sin(m.time * .1) * .012;
            else
                v.body.rotation = 0;
        }
        }
        for(const [stage,label] of this.bays){const q=m.queueFor(stage);label.setText(names[stage]+' 公共待料 '+q).setVisible(q>0).setColor(q>4?'#ad3627':'#344b51');let pile=this.piles.get(stage);if(!pile||!pile.scene){const bay=holdingPoint(stage);pile=this.image(bay.x,bay.y,'product-'+(['REMOVE','TAPE','BD','UV'].includes(stage)?'bd':['PEEL','POL','BUBBLE','BLACK'].includes(stage)?'pol':stage==='FILM'?'film':'overjudge'),38,26).setDepth(bay.y+6);this.piles.set(stage,pile);}pile.setVisible(q>4);}
        for(const [id,obj] of this.people){if(m.workers.find(w=>w.id===id)?.withdrawn){obj.destroy();this.people.delete(id);}}
        for (const w of m.deployedWorkers) {
            let obj = this.people.get(w.id);
            const s = m.stations.find(s => s.id === w.station)!;
            if (!obj) {
                obj = this.add.container(120, 800);
                const family=roleFamily(w.role as Stage),style=roleStyle[family];
                obj.setData('family',family);
                obj.add(this.add.ellipse(0,10,39,14,style.color,.9).setStrokeStyle(2,style.light));
                obj.add(this.add.ellipse(0,12,27,8,0x18333d,.2));
                const actor=this.add.sprite(0,-34,roleAsset[w.role as Stage]+'-idle',0).setScale(86/220);obj.add(actor);obj.setData('actor',actor);
                // Badge and hand-held silhouette remain legible at whole-workshop zoom.
                obj.add(this.add.circle(-18,-77,12,0xfff9df).setStrokeStyle(2,style.color));
                obj.add(toolIcon(this,family,-18,-77));
                const prop=toolIcon(this,family,family==='qc'?20:22,-24);obj.add(prop);obj.setData('prop',prop);
                obj.add(this.text(0,24,supportNames[w.role]||names[w.role as Stage],10,'#ffffff').setBackgroundColor('#'+style.color.toString(16).padStart(6,'0')).setPadding(3,1));
                obj.setSize(50, 90).setInteractive();
                obj.setData('worker', w.id);
                obj.setData('start', { x: 120, y: 800 });
                obj.setData('dest', '');
                obj.on('pointerdown', () => { this.selected = w.role; this.selectedWorker = w.id; this.selectedStation = w.station; this.model.notice = '已选员工 ' + w.id + '，点击任意空工位调动'; this.onChange(); });
                this.input.setDraggable(obj);
                this.people.set(w.id, obj);
            }
            if (obj.getData('dest') !== w.station) {
                obj.setData('start', { x: obj.x, y: obj.y });
                obj.setData('walkTotal', Math.max(1, w.walking));
                obj.setData('dest', w.station);
            }
            const target = { x: s.stage==='MANUAL_PEEL'?s.x:s.x + 48, y: s.y + 3 };
            const pos = w.walking > 0 ? this.path(obj.getData('start'), target, 1 - w.walking / obj.getData('walkTotal')) : target;
            if (!this.input.activePointer.isDown)
                obj.setPosition(pos.x, pos.y);
            obj.setDepth(pos.y + 10);
            const family=obj.getData('family') as 'bd'|'pol'|'qc';
            const actor=obj.getData('actor') as Phaser.GameObjects.Sprite;
            const prop=obj.getData('prop') as Phaser.GameObjects.Graphics;
            const busy=s.light==='busy'&&m.stationReady(s);
            // Real-time, low-amplitude motion: playback speed never shakes the characters faster.
            const phase=_time/1000;
            const angle=!m.running?0:w.walking>0?Math.sin(phase*6)*1.5:busy?Math.sin(phase*(family==='bd'?3:family==='pol'?2:1.3))*(family==='qc'?.7:1.5):0;
            const state=w.walking>0?'walk':busy?'work':'idle';const animKey=roleAsset[w.role as Stage]+'-'+state;if(actor.anims.currentAnim?.key!==animKey)actor.play(animKey);if(m.running)actor.anims.resume();else actor.anims.pause();obj.setData('motion',state);actor.setAngle(0);prop.setAngle(family==='pol'?angle*3:family==='qc'?-12+angle:angle*4);
            obj.setAngle(0);
        }
        for (const p of m.products) {
            let obj = this.items.get(p.id);
            if (!obj) {
                obj = this.add.container(110, 540);
                obj.add(this.image(0,0,'product-'+(p.kind==='REVIEW'?'overjudge':p.kind.toLowerCase()),42,29));
                this.items.set(p.id, obj);
            }
            const productImage=obj.list[0] as Phaser.GameObjects.Image;productImage.setTexture('product-'+(p.state==='return'?'ng':p.state==='exit'?'ok':p.kind==='REVIEW'?'overjudge':p.kind.toLowerCase()));
            obj.setVisible(p.state !== 'done');
            const queue=queues.get(p.route[p.step])||[];obj.setVisible(p.state!=='done'&&(p.state!=='queue'||queue.indexOf(p)<6));
            let pos = this.position(p,queues.get(p.route[p.step])||[]);
            obj.setPosition(pos.x, pos.y).setDepth(pos.y + 5);
            obj.setAlpha(p.state === 'work' ? .55 : 1);
        }
        this.onChange();
    }
    position(p: Product, queued:Product[]=[]) { if (p.state === 'moving')
        return this.path(p.from, p.to, p.travel); if (p.state === 'exit')
        return { x: Phaser.Math.Linear(p.from.x, 1340, p.travel), y: Phaser.Math.Linear(p.from.y, 730, p.travel) }; if (p.state === 'return') {
        const pts = [p.from, { x: 1320, y: p.from.y }, { x: 1320, y: 820 }, { x: 105, y: 820 }, { x: 105, y: 540 }];
        const lengths = pts.slice(1).map((v, i) => Phaser.Math.Distance.Between(v.x, v.y, pts[i].x, pts[i].y));
        let d = lengths.reduce((a, b) => a + b, 0) * p.travel;
        for (let i = 0; i < lengths.length; i++) {
            if (d <= lengths[i] && lengths[i] > 0)
                return { x: Phaser.Math.Linear(pts[i].x, pts[i + 1].x, d / lengths[i]), y: Phaser.Math.Linear(pts[i].y, pts[i + 1].y, d / lengths[i]) };
            d -= lengths[i];
        }
        return pts[4];
    } if(p.state==='queue'){const bay=holdingPoint(p.route[p.step]),i=Math.max(0,queued.indexOf(p));return {x:bay.x-(i%3)*21,y:bay.y+Math.floor(i/3)*16};} const s = this.model.stations.find(s => s.id === p.station); if (!s)
        return p.to; return { x: s.x, y: s.y - 12 }; }
}
