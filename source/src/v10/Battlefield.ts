import {CombatView} from './CombatView';
import Phaser from 'phaser';
import {BattleSession} from './session';
import {Step,Kind,towers,stages,label,element,colors,assets,equipment,stageSlots,route} from './spec';
import {canDamage} from './engine';
import {runtimeReady,recordRuntime,runtimeError} from '../runtime';
const positions:Record<string,[number,number]>={REMOVE:[75,145],TAPE:[210,145],BD:[345,145],UV:[75,290],PEEL:[210,290],POL:[345,290],BUBBLE:[75,435],BLACK:[210,435],FILM:[345,435],PI:[145,550],VI:[310,550]};
const kinds:Kind[]=['BD','POL','FILM','REVIEW'];
const names:Record<Kind,string>={BD:'BD 装甲怪',POL:'POL 薄膜怪',FILM:'覆膜怪',REVIEW:'过判幻影',UNKNOWN:'后段未分型'};
interface MonsterView {kind:Kind;x:number;body:Phaser.GameObjects.Container;bars:{stage:Step;bar:Phaser.GameObjects.Rectangle;value:Phaser.GameObjects.Text;max:number}[];count:Phaser.GameObjects.Text;}
export class Battlefield extends Phaser.Scene {
 readonly session:BattleSession; combat!:CombatView;
 onChange=()=>{};onFinish=()=>{};onError=(e:unknown)=>{};
 ready=false;selected:Step='REMOVE';startedAt=0;progress=0;fx!:Phaser.GameObjects.Graphics;
 units:Phaser.GameObjects.Sprite[]=[];monsters:MonsterView[]=[];armyLayer!:Phaser.GameObjects.Container;world!:Phaser.GameObjects.Container;
 constructor(session:BattleSession){super('v10-battlefield');this.session=session;}
 preload(){recordRuntime('phase','V1.0 2D资源加载');this.load.image('v10-hall','art/workshop.png');this.load.image('v10-monsters','v10/monsters-atlas.png');
  for(const key of new Set(Object.values(assets)))for(const state of ['idle','work'])this.load.spritesheet('v10-'+key+'-'+state,'v06/sheets/'+key+'_'+state+'.png',{frameWidth:160,frameHeight:220});
  for(const key of new Set(Object.values(equipment)))this.load.image('v10-eq-'+key,'v05/equipment/'+key+'.png');
  this.load.image('v10-panel','v05/products/panel_overjudge.png');
  this.load.on('loaderror',(f:Phaser.Loader.File)=>runtimeError('V1.0资源加载失败：'+f.key));
 }
 text(x:number,y:number,value:string,size=13,color='#d8edff'){return this.add.text(x,y,value,{fontFamily:'Microsoft YaHei, sans-serif',fontSize:size,color,align:'center',fontStyle:'bold'}).setOrigin(.5);}
 fitImage(x:number,y:number,key:string,w:number,h:number){const im=this.add.image(x,y,key);im.setScale(Math.min(w/im.width,h/im.height));return im;}
 create(){
  const texture=this.textures.get('v10-monsters'),source=texture.getSourceImage(),frameWidth=Math.floor(source.width/2),frameHeight=Math.floor(source.height/2);kinds.forEach((kind,i)=>texture.add(kind,0,(i%2)*frameWidth,Math.floor(i/2)*frameHeight,frameWidth,frameHeight));
  this.world=this.add.container();const bg=this.fitImage(580,310,'v10-hall',1450,900);bg.setScale(Math.max(1160/bg.width,620/bg.height));bg.setTint(0x4778b7);this.world.add(bg);
  const g=this.add.graphics();g.fillStyle(0x081a3a,.83).fillRect(-250,-150,1700,1000);g.fillGradientStyle(0x173653,0x102849,0x08172d,0x10274a,1).fillRect(0,420,1160,200);
  for(let x=-600;x<1900;x+=110){g.lineStyle(1,0x4480b0,.22).lineBetween(580+(x-580)*.52,265,x,650);}
  for(const y of [290,320,360,415,490,590])g.lineStyle(1,0x4388bc,.24).lineBetween(0,y,1160,y);
  g.lineStyle(2,0x73baff,.35).lineBetween(425,50,425,588);g.lineStyle(6,0x274b6c).lineBetween(455,500,1150,500);g.lineStyle(2,0xe0b95a,.7).lineBetween(455,496,1150,496);
  for(let x=475;x<1150;x+=90){g.lineStyle(2,0x68aed2,.35).lineBetween(x,500,x,525);g.fillStyle(0x86b5cd,.45).fillTriangle(x,465,x+18,458,x+18,472);}
  this.world.add(g);this.world.add(this.text(205,34,'元素岗位阵地',21));this.world.add(this.text(805,34,'维修军团  ·  从右侧进攻',21));
  this.world.add(this.text(805,535,'每层对应一道真实工序 · 动画不参与产能计算',13,'#91b4d4'));
  this.armyLayer=this.add.container();this.world.add(this.armyLayer);
  for(const key of new Set(Object.values(assets)))for(const state of ['idle','work'])if(!this.anims.exists('v10-'+key+'-'+state))this.anims.create({key:'v10-'+key+'-'+state,frames:this.anims.generateFrameNumbers('v10-'+key+'-'+state,{start:0,end:state==='idle'?3:5}),frameRate:state==='idle'?3:6,repeat:-1});
  this.fx=this.add.graphics();this.world.add(this.fx);this.combat=new CombatView(this,this.session);this.refresh();
  this.scale.on('resize',()=>this.resize());this.resize();this.ready=true;recordRuntime('phase','V1.0 战前布阵');runtimeReady();
 }
 resize(){this.combat?.resize();if(!this.world)return;const scale=Math.min(this.scale.width/1160,this.scale.height/620);this.world.setScale(scale).setPosition((this.scale.width-1160*scale)/2,(this.scale.height-620*scale)/2);}
 refresh(){if(!this.armyLayer||this.session.phase!=='setup')return;this.combat?.hide();this.world?.setVisible(true);this.armyLayer.removeAll(true);this.units=[];this.monsters=[];const formation=this.session.formation;
  for(const stage of towers){const [x,y]=positions[stage],color=colors[stage],head=this.text(x,y-67,label[stage]+' · '+element[stage],13);this.armyLayer.add(head);
   if(stage==='BUBBLE'){const shadow=this.add.ellipse(x,y+15,105,23,0x030a20,.65),im=this.fitImage(x,y-12,'v10-eq-debubble',94,94);this.armyLayer.add([shadow,im,this.text(x,y+42,'唯一机器 · 8片 / 10min',10,'#c1a8ef')]);continue;}
   const count=stageSlots(stage,this.session.scenario);for(let n=1;n<=count;n++){const offset=(n-(count+1)/2)*30,sx=x+offset,occupied=(formation[stage]||[]).includes(n),disabled=this.session.scenario.disabled.includes(stage+'-'+n);
    const pad=this.add.ellipse(sx,y+24,29,13,occupied?color:0x25435f,occupied?.65:.8).setStrokeStyle(1,disabled?0xe1747b:color,.65);this.armyLayer.add(pad);
    if(equipment[stage]){const im=this.fitImage(sx+8,y-8,'v10-eq-'+equipment[stage],count>2?34:48,55);im.setAlpha(occupied?.6:.25);this.armyLayer.add(im);}
    if(occupied){const key='v10-'+assets[stage]+'-idle',sprite=this.add.sprite(sx-5,y-13,key);sprite.setScale(62/220);sprite.play(key);this.units.push(sprite);this.armyLayer.add(sprite);}
    else this.armyLayer.add(this.text(sx,y-10,'+',24,disabled?'#e1747b':'#5b92ba'));
    const slot=this.add.circle(sx,y+27,9,disabled?0x7c344e:occupied?color:0x142d4b).setStrokeStyle(1,color,.8).setInteractive({useHandCursor:true});slot.on('pointerdown',()=>{try{if(stage!==this.selected&&!occupied)throw Error('请选择对应岗位元素，再点击部署位');this.session.setSlot(stage,n,!occupied);this.refresh();this.onChange();}catch(e){this.onError(e);}});this.armyLayer.add([slot,this.text(sx,y+27,String(n),9,occupied?'#091b37':'#a2bad0')]);
   }
   this.armyLayer.add(this.text(x,y+49,(formation[stage]?.length||0)+' / '+count+' 到岗',10,'#9cbbd6'));
  }
  kinds.forEach((kind,i)=>this.makeMonster(kind,550+i*175));
  const unknown=this.session.scenario.lots.filter(l=>l.kind==='UNKNOWN').reduce((n,l)=>n+l.count,0);this.armyLayer.add(this.text(805,580,'后段未分型 '+unknown+' 片 · 独立 PI / VI / OUT 记录，不猜测维修类型',12,'#9abbd5'));
 }
 makeMonster(kind:Kind,x:number){const lots=this.session.scenario.lots.filter(l=>l.kind===kind),count=lots.reduce((n,l)=>n+l.count,0),color=kind==='BD'?0x73baff:kind==='POL'?0xffcc67:kind==='FILM'?0x6ce6cd:0xc6a0ff;
  const shade=this.add.ellipse(x,422,140,28,0x02091b,.8),body=this.add.container(x,350);this.armyLayer.add(shade);
  const aura=this.add.ellipse(0,15,145,135,color,.08);const sprite=this.add.image(0,0,'v10-monsters',kind);sprite.setScale(175/sprite.width);body.add([aura,sprite]);body.setAlpha(count?1:.25);this.armyLayer.add(body);
  this.armyLayer.add(this.text(x,67,names[kind],17));const total=this.text(x,93,'× '+count,15,'#ebd69a');this.armyLayer.add(total);
  const allPaths=lots.map(route),steps=stages.filter(stage=>allPaths.some(path=>path.includes(stage))),bars:MonsterView['bars']=[];
  steps.forEach((stage,i)=>{const y=120+i*17,max=lots.reduce((n,l)=>n+(route(l).includes(stage)?l.count:0),0);this.armyLayer.add(this.add.rectangle(x,y,149,13,0x06172c).setStrokeStyle(1,0x547799,.7));const bar=this.add.rectangle(x-73,y,145,9,colors[stage]).setOrigin(0,.5);const txt=this.text(x,y,label[stage]+' '+max,9);this.armyLayer.add([bar,txt]);bars.push({stage,bar,value:txt,max});});
  const rate=(1-this.session.scenario.yield[kind])*100;this.armyLayer.add(this.text(x,455,'防御 '+rate.toFixed(0)+'% · 单轮一次判定',11,'#adc7df'));
  this.monsters.push({kind,x,body,bars,count:total});
 }
 start(){this.startedAt=performance.now();this.progress=0;this.world.setVisible(false);this.combat.start();}
 update(){if(!this.ready||this.session.phase!=='battle')return;this.progress=Math.min(1,(performance.now()-this.startedAt)/5000);this.animateBattle(this.progress);if(this.progress>=1){this.session.finish();this.onFinish();}}
 animateBattle(progress:number){this.combat.render(Math.max(0,Math.min(5,progress*5)));this.onChange();}
}