import Phaser from 'phaser';
import {BattleSession} from './session';
import {Step,Kind,towers,label,element,colors,assets,equipment} from './spec';
import {projectBattle,squadState,Squad,hasOperator} from './presentation';
import {CombatEffects} from './CombatEffects';
const army:Record<string,[number,number]>={REMOVE:[100,210],TAPE:[275,210],BD:[450,210],UV:[100,410],PEEL:[275,410],POL:[450,410],BUBBLE:[100,610],BLACK:[275,610],FILM:[450,610],PI:[190,805],VI:[395,805]};
const names:Record<Kind,string>={BD:'BD 装甲怪',POL:'POL 薄膜怪',FILM:'覆膜怪',REVIEW:'过判幻影',UNKNOWN:'未分型待检'};
interface Actor {stage:Step;body:Phaser.GameObjects.Container;sprite?:Phaser.GameObjects.Sprite;baseScale:number;}
interface Enemy {squad:Squad;root:Phaser.GameObjects.Container;body:Phaser.GameObjects.Image;hp:Phaser.GameObjects.Rectangle;hpFrame:Phaser.GameObjects.Rectangle;name:Phaser.GameObjects.Text;stageLabel:Phaser.GameObjects.Text;shadow:Phaser.GameObjects.Ellipse;shield:Phaser.GameObjects.Ellipse;x:number;y:number;lastHit:number;}
interface Burst {stage:Step;x:number;y:number;at:number;shield:boolean;}
export class CombatView {
 root:Phaser.GameObjects.Container;actors=new Map<Step,Actor>();enemies:Enemy[]=[];fx:CombatEffects;gfx:Phaser.GameObjects.Graphics;
 active=false;time=0;private marks=new Set<string>();private bursts:Burst[]=[];private title:Phaser.GameObjects.Text;
 readonly telemetry={casts:[] as {stage:Step;squadId:string;resource:string;at:number}[],shields:[] as {stage:Step;squadId:string;at:number}[],outcomes:[] as {squadId:string;outcome:string;at:number}[],maxActiveEffects:0};
 constructor(readonly scene:Phaser.Scene,readonly session:BattleSession){this.root=scene.add.container().setVisible(false).setDepth(5);this.gfx=scene.add.graphics();this.fx=new CombatEffects(this.gfx);this.title=scene.add.text(800,52,'',{fontFamily:'Microsoft YaHei',fontSize:29,fontStyle:'bold',color:'#fff1c9',stroke:'#10213e',strokeThickness:5}).setOrigin(.5);this.root.add([this.gfx,this.title]);}
 private text(x:number,y:number,value:string,size=18,color='#e2efff'){return this.scene.add.text(x,y,value,{fontFamily:'Microsoft YaHei',fontSize:size,color,fontStyle:'bold',align:'center',stroke:'#0c1c37',strokeThickness:3}).setOrigin(.5);}
 hide(){this.active=false;this.root.setVisible(false);}
 resize(){const scale=Math.min(this.scene.scale.width/1600,this.scene.scale.height/900);this.root.setScale(scale).setPosition((this.scene.scale.width-1600*scale)/2,(this.scene.scale.height-900*scale)/2);}
 start(){this.root.removeAll(true);this.actors.clear();this.enemies=[];this.marks.clear();this.bursts=[];this.telemetry.casts=[];this.telemetry.shields=[];this.telemetry.outcomes=[];this.telemetry.maxActiveEffects=0;
  const s=this.scene,bg=s.add.image(800,450,'v10-hall');bg.setScale(Math.max(1600/bg.width,900/bg.height)).setTint(0x416ca1);this.root.add(bg);const floor=s.add.graphics();floor.fillStyle(0x091e39,.7).fillRect(-300,-200,2200,1400);floor.fillGradientStyle(0x1a3c57,0x18364e,0x10233c,0x11253c,.9).fillRect(0,180,1600,720);
  for(let x=-500;x<2100;x+=150)floor.lineStyle(2,0x517991,.2).lineBetween(800+(x-800)*.52,200,x,830);for(const y of [220,350,540,760])floor.lineStyle(2,0x587d94,.2).lineBetween(0,y,1600,y);
  floor.lineStyle(3,0x84b9bf,.5).lineBetween(550,85,550,780);for(let y=95;y<780;y+=45){floor.fillStyle(0xe9bd5f,.5).fillTriangle(536,y,548,y+9,536,y+18);}this.root.add(floor);
  for(const stage of towers){const [x,y]=army[stage],count=this.session.formation[stage]?.length||0,enabled=stage==='BUBBLE'?!this.session.scenario.disabled.includes('BUBBLE-1'):count>0;const group=s.add.container(x,y),pad=s.add.ellipse(0,70,112,28,0x07162a,.65).setStrokeStyle(2,colors[stage],enabled?.65:.15);group.add(pad);
   let sprite:Phaser.GameObjects.Sprite|undefined;let scale=1;
   if(stage==='BUBBLE'){const machine=s.add.image(0,-3,'v10-eq-debubble');machine.setScale(Math.min(145/machine.width,155/machine.height));group.add(machine);}
   else if(count&&assets[stage]){if(equipment[stage]){const machine=s.add.image(37,31,'v10-eq-'+equipment[stage]);machine.setScale(Math.min(65/machine.width,75/machine.height)).setAlpha(.45);group.add(machine);}sprite=s.add.sprite(-9,-7,'v10-'+assets[stage]+'-idle');scale=155/220;sprite.setScale(scale).play('v10-'+assets[stage]+'-idle');group.add(sprite);}
   else group.add(this.text(0,0,'待命',20,'#5a7b98'));
   group.add(this.text(0,-104,label[stage]+' · '+element[stage],18,enabled?'#dcecff':'#5f809a'));this.root.add(group);this.actors.set(stage,{stage,body:group,sprite,baseScale:scale});
  }
  for(const squad of projectBattle(this.session.scenario,this.session.result!.simulation)){if(squad.beats.some(beat=>!hasOperator(beat,this.session.scenario,this.session.formation)))throw Error('动画记录与岗位可用性不一致');const root=s.add.container(),frame=squad.kind==='UNKNOWN'?'REVIEW':squad.kind,body=s.add.image(0,0,'v10-monsters',frame);body.setScale(205/body.width);const shadow=s.add.ellipse(0,94,155,26,0x030d1d,.65),shield=s.add.ellipse(0,-3,193,196,0x8de9ff,.06).setStrokeStyle(2,0xb9ebff,.4),name=this.text(0,-153,names[squad.kind],20),stageLabel=this.text(0,-128,label[squad.initialStage],17),hpFrame=s.add.rectangle(0,-103,160,16,0x07152c,.94).setStrokeStyle(1,0x91b9cf,.8),hp=s.add.rectangle(-77,-103,154,10,colors[squad.initialStage]).setOrigin(0,.5);
   root.add([shadow,shield,body,name,stageLabel,hpFrame,hp]);this.root.add(root);this.enemies.push({squad,root,body,shadow,shield,name,stageLabel,hpFrame,hp,x:690+squad.column*235,y:250+squad.lane*270,lastHit:-Infinity});
  }
  this.gfx=s.add.graphics();this.fx=new CombatEffects(this.gfx);this.root.add(this.gfx);this.title=this.text(1020,51,'',30,'#ffe9a4').setVisible(false);this.root.add(this.title);this.root.setVisible(true);this.active=true;this.resize();this.render(0);
 }
 render(time:number){if(!this.active)return;this.time=time;this.fx.clear();this.title.setText(time<1?'维修军团来袭':time<3?'元素集中攻击':time<4.45?'击破防线！':'战斗结束');this.title.setAlpha(time>1&&time<3?.65:1);
  const stagePulse=new Map<Step,number>();let activeEffects=0;
  for(const enemy of this.enemies){const q=enemy.squad,state=squadState(q,time),age=time-q.spawn;
   enemy.root.setVisible(state.state!=='hidden');if(state.state==='hidden')continue;
   const t=Phaser.Math.Clamp(age/(q.arrival-q.spawn),0,1),advance=1-Math.pow(1-t,3),baseX=Phaser.Math.Linear(1680+q.column*30,enemy.x,advance),pressure=Math.min(80,Math.max(0,time-q.arrival)*28);enemy.root.setPosition(baseX-pressure,enemy.y);enemy.root.setAlpha(1).setScale(1);enemy.body.clearTint();enemy.body.y=Math.sin(age*(state.state==='advance'?20:7))*4;enemy.body.angle=state.state==='advance'?Math.sin(age*17)*5:0;
   enemy.shadow.setScale(1+.03*Math.sin(age*8),1);enemy.shield.setAlpha(state.state==='advance'?.6:.25);enemy.stageLabel.setText(label[state.stage]);enemy.stageLabel.setColor('#'+colors[state.stage].toString(16).padStart(6,'0'));enemy.hp.setFillStyle(colors[state.stage]);enemy.hp.width=154*state.hp;
   const beat=q.beats[state.beat];if(beat&&time>=beat.start&&time<=beat.end){const realStage=beat.stage,actor=this.actors.get(realStage==='OUT'?'VI':realStage);if(actor){const stage=realStage==='OUT'?'VI':realStage,p=(time-beat.start)/(beat.end-beat.start),key=q.id+':cast:'+state.beat;
     if(!this.marks.has(key)){this.marks.add(key);this.telemetry.casts.push({stage:realStage,squadId:q.id,resource:beat.resource,at:time});}stagePulse.set(stage,Math.max(stagePulse.get(stage)||0,Math.sin(Math.min(1,p/.5)*Math.PI)));
     this.fx.projectile(stage,{x:army[stage][0]+55,y:army[stage][1]-15},{x:enemy.root.x,y:enemy.root.y-12},p,time);activeEffects++;
     if(p>.42&&p<.78){enemy.body.setTint(0xffe4c1);enemy.body.x=Math.sin(time*88)*7;enemy.body.angle=Math.sin(time*63)*6;this.fx.crack(enemy.root.x,enemy.y,colors[stage],.65);}else enemy.body.x=0;
     const hitKey=q.id+':hit:'+state.beat;if(p>=.46&&!this.marks.has(hitKey)){this.marks.add(hitKey);enemy.lastHit=time;this.bursts.push({stage,x:enemy.root.x,y:enemy.y-10,at:time,shield:false});}if(time-enemy.lastHit<.055)enemy.body.setTintFill(0xfff6dd);
    }}
   for(let i=0;i<q.beats.length;i++){const b=q.beats[i],key=q.id+':shield:'+i;if(b.fraction===1&&time>=b.end&&!this.marks.has(key)){this.marks.add(key);this.telemetry.shields.push({stage:b.stage,squadId:q.id,at:time});this.bursts.push({stage:b.stage==='OUT'?'VI':b.stage,x:enemy.root.x,y:enemy.y-12,at:time,shield:true});}}
   if(state.state==='defeated'||state.state==='escape'||state.state==='waiting'&&time>=q.finish){const key=q.id+':outcome';if(!this.marks.has(key)){this.marks.add(key);this.telemetry.outcomes.push({squadId:q.id,outcome:q.outcome,at:time});}
    const p=Phaser.Math.Clamp((time-q.finish)/.65,0,1);if(q.outcome==='success'){enemy.stageLabel.setText('维修完成');enemy.hpFrame.setVisible(false);enemy.hp.setVisible(false);enemy.root.setAlpha(1-p).setScale(1-p*.65);enemy.body.angle=p*28;enemy.body.y-=p*35;if(p<.4)this.fx.burst('BD',enemy.root.x,enemy.y,.38*p,true);}
    else if(q.outcome==='failure'){enemy.stageLabel.setText('抵抗 · 待返修').setColor('#ffb49d');enemy.hp.setVisible(false);enemy.hpFrame.setVisible(false);enemy.shield.setAlpha(.8).setStrokeStyle(5,0xff9caa,.8);enemy.root.x+=p*310;enemy.root.setAlpha(1-p*.85);enemy.body.angle=-p*14;}
    else{enemy.stageLabel.setText(label[q.finalStage]+' · 等待');enemy.root.x+=p*65;enemy.body.setTint(0x9cafc4);enemy.shield.setAlpha(.2);}
   }
  }
  for(const actor of this.actors.values()){const pulse=stagePulse.get(actor.stage)||0;if(actor.sprite){actor.sprite.x=-9+pulse*13;actor.sprite.angle=-pulse*9;actor.sprite.setScale(actor.baseScale*(1+pulse*.065),actor.baseScale*(1-pulse*.035));const key='v10-'+assets[actor.stage]+'-'+(pulse>0?'work':'idle');if(actor.sprite.anims.currentAnim?.key!==key)actor.sprite.play(key);}if(pulse>.1){const [x,y]=army[actor.stage];this.gfx.fillStyle(colors[actor.stage],pulse*.26).fillCircle(x+55,y-15,12+pulse*16);}}
  this.bursts=this.bursts.filter(b=>time-b.at<(b.shield?.48:.28)).slice(-18);for(const burst of this.bursts)this.fx.burst(burst.stage,burst.x,burst.y,time-burst.at,burst.shield);this.telemetry.maxActiveEffects=Math.max(this.telemetry.maxActiveEffects,activeEffects+this.bursts.length);
 }
 get debug(){return {time:this.time,casts:this.telemetry.casts.length,shields:this.telemetry.shields.length,activeShields:this.bursts.filter(b=>b.shield).length,freshShield:this.bursts.some(b=>b.shield&&this.time-b.at<.12),outcomes:this.telemetry.outcomes.length,texts:this.enemies.filter(e=>e.root.visible&&e.root.alpha>.05).flatMap(e=>[e.name.text,e.stageLabel.text]),enemies:this.enemies.map(e=>({id:e.squad.id,lotId:e.squad.lotId,ordinal:e.squad.ordinal,initialStage:e.squad.initialStage,kind:e.squad.kind,x:e.root.x,y:e.root.y,visible:e.root.visible,alpha:e.root.alpha,hp:e.hp.width,stage:e.stageLabel.text,outcome:e.squad.outcome,state:squadState(e.squad,this.time).state})),maxActiveEffects:this.telemetry.maxActiveEffects};}
}
