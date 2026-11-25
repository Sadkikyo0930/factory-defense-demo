import Phaser from 'phaser';
import {BattleSession} from './session';
import {Step,Kind,visibleTowers,label,element,colors,assets,automaticBubble,stageLabel as displayStage} from './spec';
import {projectBattle,squadState,Squad,hasOperator} from './presentation';
import {CombatEffects} from './CombatEffects';
const army:Record<string,[number,number]>={REMOVE:[100,210],TAPE:[275,210],BD:[450,210],UV:[100,410],PEEL:[275,410],POL:[450,410],BUBBLE:[100,610],BLACK:[275,610],FILM:[450,610],PI:[190,805],VI:[395,805]};
const names:Record<Kind,string>={BD:'BD 装甲怪',POL:'POL 薄膜怪',FILM:'覆膜怪',REVIEW:'过判幻影',UNKNOWN:'未分型待检'};
interface Actor {stage:Step;body:Phaser.GameObjects.Container;sprites:Map<string,{sprite:Phaser.GameObjects.Sprite;x:number;scale:number}>;operator?:Phaser.GameObjects.Image;}
interface Enemy {squad:Squad;root:Phaser.GameObjects.Container;body:Phaser.GameObjects.Image;name:Phaser.GameObjects.Text;stageLabel:Phaser.GameObjects.Text;shadow:Phaser.GameObjects.Ellipse;shield:Phaser.GameObjects.Ellipse;x:number;y:number;lastHit:number;}
interface Burst {stage:Step;x:number;y:number;at:number;shield:boolean;}
export class CombatView {
 root:Phaser.GameObjects.Container;actors=new Map<Step,Actor>();enemies:Enemy[]=[];fx:CombatEffects;gfx:Phaser.GameObjects.Graphics;
 active=false;time=0;private marks=new Set<string>();private bursts:Burst[]=[];
 readonly telemetry={casts:[] as {stage:Step;squadId:string;resource:string;at:number}[],shields:[] as {stage:Step;squadId:string;at:number}[],outcomes:[] as {squadId:string;outcome:string;at:number}[],maxActiveEffects:0};
 constructor(readonly scene:Phaser.Scene,readonly session:BattleSession){this.root=scene.add.container().setVisible(false).setDepth(5);this.gfx=scene.add.graphics();this.fx=new CombatEffects(this.gfx);this.root.add(this.gfx);}
 private text(x:number,y:number,value:string,size=18,color='#e2efff'){return this.scene.add.text(x,y,value,{fontFamily:'Microsoft YaHei',fontSize:size,color,fontStyle:'bold',align:'center',stroke:'#0c1c37',strokeThickness:3}).setOrigin(.5);}
 hide(){this.active=false;this.root.setVisible(false);}
 resize(){const scale=Math.min(this.scene.scale.width/1600,this.scene.scale.height/900);this.root.setScale(scale).setPosition((this.scene.scale.width-1600*scale)/2,(this.scene.scale.height-900*scale)/2);}
 start(){this.root.removeAll(true);this.actors.clear();this.enemies=[];this.marks.clear();this.bursts=[];this.telemetry.casts=[];this.telemetry.shields=[];this.telemetry.outcomes=[];this.telemetry.maxActiveEffects=0;
  const s=this.scene,bg=s.add.image(800,450,'v10-hall');bg.setScale(Math.max(1600/bg.width,900/bg.height)).setTint(0x416ca1);this.root.add(bg);const floor=s.add.graphics();floor.fillStyle(0x091e39,.7).fillRect(-300,-200,2200,1400);floor.fillGradientStyle(0x1a3c57,0x18364e,0x10233c,0x11253c,.9).fillRect(0,180,1600,720);
  for (let lane=0;lane<4;lane++) {
   const center=207+lane*188;
   floor.fillStyle(lane%2 ? 0x1e4253 : 0x245361,.8).fillRoundedRect(570,center-109,1070,176,16);
   floor.lineStyle(2,0x84c8c7,.28).lineBetween(590,center+65,1600,center+65);
   for(let x=665;x<1590;x+=205)floor.fillStyle(0xa9d7cb,.18).fillTriangle(x-14,center+44,x+4,center+33,x+4,center+55);
  }
  floor.lineStyle(3,0xe0ba6d,.48).lineBetween(555,90,555,871);
  this.root.add(floor);
  const formation=this.session.formation;
  for (const stage of visibleTowers(this.session.scenario)) {
   const mntPositions:Partial<Record<Step,[number,number]>>={CUT:[440,406],OC_VI:[243,816],LCM_VI:[435,816]};
   const [x,y]=mntPositions[stage]??army[stage], color=colors[stage];
   const group=s.add.container(x,y);
   const sprites=new Map<string,{sprite:Phaser.GameObjects.Sprite;x:number;scale:number}>();
   const deployed=formation[stage]||[];
   let operator:Phaser.GameObjects.Image|undefined;
   if(stage==='BUBBLE'){
    group.add(s.add.ellipse(0,65,90,20,0x312566,.75).setStrokeStyle(2,color,.8));
    if(automaticBubble(this.session.scenario)||this.session.bubbleOperatorDeployed){
     operator=s.add.image(0,64,'v10-bubble-operator').setOrigin(.5,1);
     operator.setScale(Math.min(119/operator.width,153/operator.height));
     if(this.session.scenario.disabled.includes('BUBBLE-1'))operator.setAlpha(.45);
     group.add(operator);
    }
   }
   for(const [index,slot] of deployed.entries()){
    const offset=(index-(deployed.length-1)/2)* (deployed.length===4?40:46);
    const scale=(deployed.length===1?157:deployed.length===2?122:107)/220;
    const sprite=s.add.sprite(offset,64-110*scale,'v10-'+assets[stage]+'-idle').setScale(scale);
    sprite.play('v10-'+assets[stage]+'-idle');
    group.add(s.add.ellipse(offset,65,deployed.length===1?90:43,20,0x061628,.8).setStrokeStyle(2,color,.75));
    group.add(sprite);
    sprites.set(stage+'-'+slot,{sprite,x:offset,scale});
   }
   if(stage!=='BUBBLE'&&!deployed.length)group.add(s.add.ellipse(0,62,65,18,color,.09).setStrokeStyle(2,color,.24));
   group.add(this.text(0,-91,displayStage(stage,this.session.scenario)+' · '+element[stage],18,deployed.length||stage==='BUBBLE'?'#dcecff':'#81a0b3'));
   this.root.add(group);
   this.actors.set(stage,{stage,body:group,sprites,operator});
  }
  for(const squad of projectBattle(this.session.scenario,this.session.result!.simulation)){if(squad.beats.some(beat=>!hasOperator(beat,this.session.scenario,this.session.formation)))throw Error('动画记录与岗位可用性不一致');const root=s.add.container(),frame=squad.kind==='UNKNOWN'?'REVIEW':squad.kind,body=s.add.image(0,0,'v10-monsters',frame);body.setScale(137/body.width);const shadow=s.add.ellipse(0,55,104,19,0x030d1d,.65),shield=s.add.ellipse(0,-3,127,126,0x8de9ff,.06).setStrokeStyle(2,0xb9ebff,.4),name=this.text(0,-108,names[squad.kind],18),stageLabel=this.text(0,-87,displayStage(squad.initialStage,this.session.scenario),16);
   root.add([shadow,shield,body,name,stageLabel]);this.root.add(root);this.enemies.push({squad,root,body,shadow,shield,name,stageLabel,x:1680,y:207+squad.lane*188,lastHit:-Infinity});
  }
  this.gfx=s.add.graphics();this.fx=new CombatEffects(this.gfx);this.root.add(this.gfx);this.root.setVisible(true);this.active=true;this.resize();this.render(0);
 }
 render(time:number){if(!this.active)return;this.time=time;this.fx.clear();const stagePulse=new Map<string,number>();let activeEffects=0;
  for(const enemy of this.enemies){const q=enemy.squad,state=squadState(q,time),age=time-q.spawn;
   enemy.root.setVisible(state.state!=='hidden');if(state.state==='hidden')continue;
   const x=enemy.x-age*245;
   enemy.root.setPosition(Math.max(558,x),enemy.y);
   enemy.root.setAlpha(1).setScale(1);
   enemy.body.clearTint();
   enemy.body.x=0;
   enemy.body.y=Math.sin(age*22)*4;
   enemy.body.angle=Math.sin(age*17)*4;
   enemy.shadow.setScale(1+.03*Math.sin(age*8),1);enemy.shield.setAlpha(state.state==='advance'?.6:.25);enemy.stageLabel.setText(displayStage(state.stage,this.session.scenario));enemy.stageLabel.setColor('#'+colors[state.stage].toString(16).padStart(6,'0'));
   const beat=q.beats[state.beat];if(beat&&time>=beat.start&&time<=beat.end){const realStage=beat.stage,actor=this.actors.get(realStage==='OUT'?beat.resource.replace(/-\d+$/,'') as Step:realStage);if(actor){const stage=realStage==='OUT'?beat.resource.replace(/-\d+$/,'') as Step:realStage,p=(time-beat.start)/(beat.end-beat.start),key=q.id+':cast:'+state.beat;
     if(!this.marks.has(key)){this.marks.add(key);this.telemetry.casts.push({stage:realStage,squadId:q.id,resource:beat.resource,at:time});}stagePulse.set(beat.resource,Math.max(stagePulse.get(beat.resource)||0,Math.sin(Math.min(1,p/.5)*Math.PI)));
     this.fx.projectile(stage,{x:actor.body.x+(actor.sprites.get(beat.resource)?.x||0)+29,y:actor.body.y+4},{x:enemy.root.x,y:enemy.root.y-12},p,time);activeEffects++;
     if(p>.42&&p<.78){enemy.body.setTint(0xffe4c1);enemy.body.x=Math.sin(time*88)*7;enemy.body.angle=Math.sin(time*63)*6;this.fx.crack(enemy.root.x,enemy.y,colors[stage],.65);}else enemy.body.x=0;
     const hitKey=q.id+':hit:'+state.beat;if(p>=.46&&!this.marks.has(hitKey)){this.marks.add(hitKey);enemy.lastHit=time;this.bursts.push({stage,x:enemy.root.x,y:enemy.y-10,at:time,shield:false});}if(time-enemy.lastHit<.055)enemy.body.setTintFill(0xfff6dd);
    }}
   for(let i=0;i<q.beats.length;i++){const b=q.beats[i],key=q.id+':shield:'+i;if(b.fraction===1&&time>=b.end&&!this.marks.has(key)){this.marks.add(key);this.telemetry.shields.push({stage:b.stage,squadId:q.id,at:time});this.bursts.push({stage:b.stage==='OUT'?'VI':b.stage,x:enemy.root.x,y:enemy.y-12,at:time,shield:true});}}
   if(state.state==='defeated'||state.state==='escape'||state.state==='waiting'&&time>=q.finish){const key=q.id+':outcome';if(!this.marks.has(key)){this.marks.add(key);this.telemetry.outcomes.push({squadId:q.id,outcome:q.outcome,at:time});}
    const p=Phaser.Math.Clamp((time-q.finish)/.44,0,1);if(q.outcome==='success'){enemy.stageLabel.setText('维修完成');enemy.root.setAlpha(1-p).setScale(1-p*.65);enemy.body.angle=p*28;enemy.body.y-=p*35;if(p<.4)this.fx.burst('BD',enemy.root.x,enemy.y,.38*p,true);}
    else if(q.outcome==='failure'){enemy.stageLabel.setText('抵抗 · 待返修').setColor('#ffb49d');enemy.shield.setAlpha(.8).setStrokeStyle(5,0xff9caa,.8);enemy.root.x+=p*560;enemy.root.setAlpha(1-p*.85);enemy.body.angle=-p*14;}
    else{enemy.stageLabel.setText(displayStage(q.finalStage,this.session.scenario)+' · 仍在推进');enemy.root.x-=p*55;enemy.body.setTint(0x9cafc4);enemy.shield.setAlpha(.2);}
   }
  }
  for(const actor of this.actors.values()){
   for (const [resource,unit] of actor.sprites) {
    const pulse=stagePulse.get(resource)||0;
    unit.sprite.x=unit.x+pulse*9;
    unit.sprite.angle=-pulse*8;
    const key='v10-'+assets[actor.stage]+'-'+(pulse>0?'work':'idle');
    if(unit.sprite.anims.currentAnim?.key!==key)unit.sprite.play(key);
   }
   const lightning=stagePulse.get('BUBBLE-1')||0;
   if(actor.operator){
    actor.operator.x=lightning*9;
    actor.operator.setAngle(-lightning*7);
    if(lightning>.1){
     actor.operator.setTint(0xe8d0ff);
     this.gfx.fillStyle(colors.BUBBLE,lightning*.25).fillCircle(actor.body.x+29,actor.body.y+4,24);
    }else actor.operator.clearTint();
   }
  }
  this.bursts=this.bursts.filter(b=>time-b.at<(b.shield?.48:.28)).slice(-18);for(const burst of this.bursts)this.fx.burst(burst.stage,burst.x,burst.y,time-burst.at,burst.shield);this.telemetry.maxActiveEffects=Math.max(this.telemetry.maxActiveEffects,activeEffects+this.bursts.length);
 }
 get debug(){return {time:this.time,casts:this.telemetry.casts.length,shields:this.telemetry.shields.length,activeShields:this.bursts.filter(b=>b.shield).length,freshShield:this.bursts.some(b=>b.shield&&this.time-b.at<.12),outcomes:this.telemetry.outcomes.length,texts:this.enemies.filter(e=>e.root.visible&&e.root.alpha>.05).flatMap(e=>[e.name.text,e.stageLabel.text]),enemies:this.enemies.map(e=>({id:e.squad.id,lotId:e.squad.lotId,ordinal:e.squad.ordinal,initialStage:e.squad.initialStage,kind:e.squad.kind,x:e.root.x,y:e.root.y,visible:e.root.visible,alpha:e.root.alpha,hp:102*squadState(e.squad,this.time).hp,spawn:e.squad.spawn,lane:e.squad.lane,wave:e.squad.column,stage:e.stageLabel.text,outcome:e.squad.outcome,state:squadState(e.squad,this.time).state})),maxActiveEffects:this.telemetry.maxActiveEffects};}
}
