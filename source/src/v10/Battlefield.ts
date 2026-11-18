import {CombatView} from './CombatView';
import Phaser from 'phaser';
import {BattleSession} from './session';
import {Step,Kind,towers,label,element,colors,assets,stageSlots} from './spec';
import {runtimeReady,recordRuntime,runtimeError} from '../runtime';
const positions:Record<string,[number,number]>={REMOVE:[75,145],TAPE:[210,145],BD:[345,145],UV:[75,290],PEEL:[210,290],POL:[345,290],BUBBLE:[75,435],BLACK:[210,435],FILM:[345,435],PI:[145,550],VI:[310,550]};
const kinds:Kind[]=['BD','POL','FILM','REVIEW'];
const names:Record<Kind,string>={BD:'BD 装甲怪',POL:'POL 薄膜怪',FILM:'覆膜怪',REVIEW:'过判幻影',UNKNOWN:'后段未分型'};
interface MonsterView {kind:Kind;body:Phaser.GameObjects.Container;}
export class Battlefield extends Phaser.Scene {
 readonly session:BattleSession; combat!:CombatView;
 onChange=()=>{};onFinish=()=>{};onError=(e:unknown)=>{};
 ready=false;selected:Step='REMOVE';startedAt=0;progress=0;fx!:Phaser.GameObjects.Graphics;
 units:Phaser.GameObjects.Sprite[]=[];monsters:MonsterView[]=[];armyLayer!:Phaser.GameObjects.Container;world!:Phaser.GameObjects.Container;
 constructor(session:BattleSession){super('v10-battlefield');this.session=session;}
 preload(){recordRuntime('phase','V1.0 2D资源加载');this.load.image('v10-hall','art/workshop.png');this.load.image('v10-monsters','v10/monsters-atlas.png');
  this.load.image('v10-bubble-operator','v10/bubble-operator.png');
  for(const key of new Set(Object.values(assets)))for(const state of ['idle','work'])this.load.spritesheet('v10-'+key+'-'+state,'v06/sheets/'+key+'_'+state+'.png',{frameWidth:160,frameHeight:220});
  this.load.on('loaderror',(f:Phaser.Loader.File)=>runtimeError('V1.0资源加载失败：'+f.key));
 }
 text(x:number,y:number,value:string,size=13,color='#d8edff'){return this.add.text(x,y,value,{fontFamily:'Microsoft YaHei, sans-serif',fontSize:size,color,align:'center',fontStyle:'bold'}).setOrigin(.5);}
 fitImage(x:number,y:number,key:string,w:number,h:number){const im=this.add.image(x,y,key);im.setScale(Math.min(w/im.width,h/im.height));return im;}
 create(){
  const texture=this.textures.get('v10-monsters'),source=texture.getSourceImage(),frameWidth=Math.floor(source.width/2),frameHeight=Math.floor(source.height/2);kinds.forEach((kind,i)=>texture.add(kind,0,(i%2)*frameWidth,Math.floor(i/2)*frameHeight,frameWidth,frameHeight));
  this.world=this.add.container();const bg=this.fitImage(580,310,'v10-hall',1450,900);bg.setScale(Math.max(1160/bg.width,620/bg.height));bg.setTint(0x4778b7);this.world.add(bg);
  const g=this.add.graphics();g.fillStyle(0x081a3a,.83).fillRect(-250,-150,1700,1000);g.fillGradientStyle(0x173653,0x102849,0x08172d,0x10274a,1).fillRect(0,420,1160,200);
  g.lineStyle(2,0x75b3b9,.42).lineBetween(429,54,429,583);
  for(let lane=0;lane<4;lane++){
   const y=112+lane*112;
   g.fillStyle(lane%2?0x245263:0x214655,.7).fillRoundedRect(459,y,664,94,13);
   for(let x=500;x<955;x+=102)g.fillStyle(0x8bb9b9,.23).fillTriangle(x-13,y+58,x+5,y+47,x+5,y+69);
  }
  this.world.add(g);
  this.world.add(this.text(204,29,'元素岗位阵地',23));
  this.world.add(this.text(790,62,'进攻路线',25));
  this.armyLayer=this.add.container();this.world.add(this.armyLayer);
  for(const key of new Set(Object.values(assets)))for(const state of ['idle','work'])if(!this.anims.exists('v10-'+key+'-'+state))this.anims.create({key:'v10-'+key+'-'+state,frames:this.anims.generateFrameNumbers('v10-'+key+'-'+state,{start:0,end:state==='idle'?3:5}),frameRate:state==='idle'?3:6,repeat:-1});
  this.fx=this.add.graphics();this.world.add(this.fx);this.combat=new CombatView(this,this.session);this.refresh();
  this.scale.on('resize',()=>this.resize());this.resize();this.ready=true;recordRuntime('phase','V1.0 战前布阵');runtimeReady();
 }
 resize(){this.combat?.resize();if(!this.world)return;const scale=Math.min(this.scale.width/1160,this.scale.height/620);this.world.setScale(scale).setPosition((this.scale.width-1160*scale)/2,(this.scale.height-620*scale)/2);}
 refresh(){if(!this.armyLayer||this.session.phase!=='setup')return;this.combat?.hide();this.world?.setVisible(true);this.armyLayer.removeAll(true);this.units=[];this.monsters=[];const formation=this.session.formation;
  for(const stage of towers){const [x,y]=positions[stage],color=colors[stage],head=this.text(x,y-67,label[stage]+' · '+element[stage],16);this.armyLayer.add(head);
   if(stage==='BUBBLE'){
    const deployed=this.session.bubbleOperatorDeployed;
    const pad=this.add.ellipse(x,y+26,66,24,0x322857,.8).setStrokeStyle(2,color,.8).setInteractive({useHandCursor:true});
    pad.on('pointerdown',()=>{
     try{
      if(!deployed&&this.selected!=='BUBBLE')throw Error('请先选择左侧的脱泡角色');
      this.session.setBubbleOperator(!deployed);
      this.refresh();
      this.onChange();
     }catch(error){this.onError(error);}
    });
    this.armyLayer.add(pad);
    if(deployed)this.armyLayer.add(this.fitImage(x,y+25,'v10-bubble-operator',70,87).setOrigin(.5,1));
    else this.armyLayer.add(this.text(x,y+26,'+',18,'#dec0ff'));
    continue;
   }
   const count=stageSlots(stage,this.session.scenario);for(let n=1;n<=count;n++){const offset=(n-(count+1)/2)*30,sx=x+offset,occupied=(formation[stage]||[]).includes(n),disabled=this.session.scenario.disabled.includes(stage+'-'+n);
    const pad=this.add.ellipse(sx,y+24,29,13,occupied?color:0x25435f,occupied?.65:.8).setStrokeStyle(1,disabled?0xe1747b:color,.65);this.armyLayer.add(pad);
    if(occupied){const key='v10-'+assets[stage]+'-idle',sprite=this.add.sprite(sx,y-12,key);sprite.setScale((count===1?87:count===2?73:62)/220);sprite.play(key);this.units.push(sprite);this.armyLayer.add(sprite);}
    else this.armyLayer.add(this.text(sx,y-10,'+',24,disabled?'#e1747b':'#5b92ba'));
    const slot=this.add.circle(sx,y+27,13,disabled?0x7c344e:occupied?color:0x142d4b).setStrokeStyle(1,color,.8).setInteractive({useHandCursor:true});slot.on('pointerdown',()=>{try{if(stage!==this.selected&&!occupied)throw Error('请选择对应岗位元素，再点击部署位');this.session.setSlot(stage,n,!occupied);this.refresh();this.onChange();}catch(e){this.onError(e);}});this.armyLayer.add([slot,this.text(sx,y+27,String(n),11,occupied?'#091b37':'#a2bad0')]);
   }
  }
  kinds.forEach((kind,i)=>this.makeMonster(kind,159+i*112));
 }
 makeMonster(kind:Kind,y:number){
  const body=this.add.container(1048,y);
  const aura=this.add.ellipse(0,24,91,14,0x061628,.62);
  const sprite=this.add.image(0,-9,'v10-monsters',kind);
  sprite.setScale(108/sprite.width);
  body.add([aura,sprite]);
  this.armyLayer.add([body,this.text(760,y,names[kind],22,'#c4e5ec')]);
  this.monsters.push({kind,body});
 }
 start(){this.startedAt=performance.now();this.progress=0;this.world.setVisible(false);this.combat.start();}
 update(){if(!this.ready||this.session.phase!=='battle')return;this.progress=Math.min(1,(performance.now()-this.startedAt)/5000);this.animateBattle(this.progress);if(this.progress>=1){this.session.finish();this.onFinish();}}
 animateBattle(progress:number){this.combat.render(Math.max(0,Math.min(5,progress*5)));this.onChange();}
}
