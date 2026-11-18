import Phaser from 'phaser';
import {Step,colors} from './spec';
type Point={x:number;y:number};
/** All transient art shares one Graphics object; no particle emitters or per-frame display objects. */
export class CombatEffects {
 constructor(readonly g:Phaser.GameObjects.Graphics){}
 clear(){this.g.clear();}
 projectile(stage:Step,from:Point,to:Point,p:number,time:number){
  const g=this.g,color=colors[stage],ease=Math.min(1,p/.53),x=Phaser.Math.Linear(from.x,to.x,ease),y=Phaser.Math.Linear(from.y,to.y,ease)-Math.sin(ease*Math.PI)*65;
  if(p>.73)return;const alpha=Math.min(1,p*12);g.fillStyle(color,alpha);g.lineStyle(3,color,alpha);
  if(stage==='REMOVE'){
   for(let i=0;i<3;i++){const xx=x-i*22,yy=y+Math.sin(time*9+i)*12;g.fillStyle(0x563925,.9).fillPoints([{x:xx-13,y:yy-7},{x:xx+4,y:yy-16},{x:xx+17,y:yy+2},{x:xx+5,y:yy+14},{x:xx-12,y:yy+9}],true);g.fillStyle(color).fillTriangle(xx-9,yy-6,xx+3,yy-11,xx+8,yy+4);g.fillStyle(0xc59265,.25).fillCircle(xx-23,yy+8,8-i);}
  }else if(stage==='TAPE'){
   for(let v=0;v<2;v++){g.lineStyle(5-v*2,color,.85-v*.2).beginPath();for(let i=0;i<9;i++){const xx=x-i*9,yy=y+Math.sin(i*.8+time*16+v*Math.PI)*15;if(i)g.lineTo(xx,yy);else g.moveTo(xx,yy);}g.strokePath();}for(let i=0;i<3;i++)g.fillStyle(0xafffc4).fillEllipse(x-i*24,y-18,15,7);
  }else if(stage==='BD'){
   g.fillStyle(0xffa134,.28).fillEllipse(x-34,y,92,25);g.fillStyle(0xffda6d).fillRoundedRect(x-18,y-11,40,22,8);g.fillStyle(0xfff7c4).fillTriangle(x+30,y,x+10,y-13,x+10,y+13);g.fillStyle(0xff8f36).fillTriangle(x-20,y,x-53,y-12,x-41,y+13);
  }else if(stage==='UV'){
   for(const [width,opacity] of [[22,.12],[10,.4],[3,.95]]){g.lineStyle(width,color,opacity).lineBetween(from.x,from.y,to.x,to.y);}g.lineStyle(2,0xffffff,.9).lineBetween(from.x,from.y,to.x,to.y);g.fillStyle(0xffffff,.75).fillCircle(to.x,to.y,13+Math.sin(time*28)*5);
  }else if(stage==='PEEL'){
   for(let i=0;i<4;i++){const xx=x-i*13,yy=y+Math.sin(time*14+i)*3;g.lineStyle(3,color,.85-i*.12).strokeEllipse(xx,yy,48-i*7,17+i*7);}g.lineStyle(2,0xf1ffff,.8).lineBetween(x-60,y+14,x+22,y-16);
  }else if(stage==='POL'){
   for(let i=0;i<3;i++){const xx=x-i*27,yy=y+(i-1)*13;g.fillStyle(color,.95).fillPoints([{x:xx+23,y:yy},{x:xx-6,y:yy-12},{x:xx-15,y:yy},{x:xx-6,y:yy+12}],true);g.lineStyle(2,0xe1f6ff,.9).lineBetween(xx-9,yy,xx+15,yy);}
  }else if(stage==='BUBBLE'){
   for(let branch=0;branch<2;branch++){g.lineStyle(branch?2:5,branch?0xffffff:color,.85).beginPath().moveTo(from.x,from.y);for(let i=1;i<11;i++){const t=i/10;g.lineTo(Phaser.Math.Linear(from.x,to.x,t),Phaser.Math.Linear(from.y,to.y,t)+(i===10?0:Math.sin(i*9+time*50)*19));}g.strokePath();}g.lineStyle(3,color,.55).strokeCircle(to.x,to.y,30+Math.sin(time*20)*8);
  }else if(stage==='BLACK'){
   g.fillStyle(color,.16).fillCircle(x,y,35);g.fillStyle(0x160c30,.95).fillCircle(x,y,22);g.lineStyle(4,color,.9).strokeCircle(x,y,23);for(let i=0;i<3;i++)g.fillStyle(0xfbb0f4).fillCircle(x+Math.cos(time*12+i*2)*31,y+Math.sin(time*12+i*2)*20,4);
  }else if(stage==='FILM'){
   g.lineStyle(13,color,.65).beginPath().arc(x,y,30,-1.1,1.1).strokePath();g.lineStyle(3,0xd7ffff,.9).beginPath().arc(x+5,y,29,-1.1,1.1).strokePath();for(let i=0;i<4;i++)g.fillStyle(color,.75-i*.12).fillEllipse(x-17-i*12,y+Math.sin(time*9+i)*16,10-i,6);
  }else if(stage==='PI'){
   g.lineStyle(3,color,.9).strokeRoundedRect(to.x-45,to.y-48,90,96,10);g.lineStyle(5,0xffefac,.9).lineBetween(to.x-40,to.y-40+((time*110)%80),to.x+40,to.y-40+((time*110)%80));for(let i=0;i<3;i++)g.lineStyle(2,color,.7).lineBetween(x-i*17,y-16,x-i*17+9,y+16);
  }else{
   g.fillStyle(0xff5c35,.32).fillEllipse(x-19,y,76,32);
   g.fillStyle(0xff6135,.94).fillCircle(x,y,18);
   g.fillStyle(0xffc14e,.94).fillCircle(x+5,y,12);
   g.fillStyle(0xfff1ae,.95).fillCircle(x+9,y-2,7);
   for(let i=0;i<4;i++)g.fillStyle(0xffa540,.8-i*.16).fillCircle(x-19-i*13,y+Math.sin(time*20+i)*11,7-i);
  }
 }
 burst(stage:Step,x:number,y:number,age:number,shield=false){const life=shield?.48:.28;if(age<0||age>life)return;const g=this.g,p=age/life,color=colors[stage],r=18+p*(shield?95:54);g.lineStyle(shield?5:3,color,(1-p)*.9).strokeCircle(x,y,r);if(shield)g.lineStyle(3,0xe7faff,(1-p)*.7).strokeEllipse(x,y,r*2.3,r*.8);g.fillStyle(color,(1-p)*(shield?.19:.3)).fillCircle(x,y,r*.65);if(age<.09)g.fillStyle(0xffffff,(1-age/.09)*.8).fillCircle(x,y,shield?35:23);
  for(let i=0;i<8;i++){const a=i*Math.PI/4+.2,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;g.fillStyle(i%2?0xffffff:color,(1-p)*.8);if(shield){g.fillTriangle(xx,yy-18,xx+12,yy+10,xx-11,yy+10);g.lineStyle(2,0xe6f7ff,(1-p)*.65).lineBetween(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,xx,yy);}else if(stage==='FILM'||stage==='BLACK')g.fillCircle(xx,yy,3+(1-p)*5);else g.fillTriangle(xx,yy-8,xx+6,yy+5,xx-5,yy+5);}
  if(stage==='TAPE'){for(let i=0;i<3;i++)g.lineStyle(3,color,1-p).strokeEllipse(x,y+i*10-10,65+p*20,20);}
  if(stage==='VI'){for(let i=0;i<4;i++)g.fillStyle(i%2?0xffe590:0xff5c40,1-p).fillTriangle(x-27+i*18,y+12,x-22+i*18,y-24-r*.3,x-10+i*18,y+10);}
 }
 crack(x:number,y:number,color:number,alpha:number){const g=this.g;g.lineStyle(3,0x09192c,alpha).beginPath().moveTo(x-18,y-42).lineTo(x+2,y-17).lineTo(x-9,y-4).lineTo(x+22,y+27).strokePath();g.lineStyle(1,color,alpha*.8).lineBetween(x+2,y-17,x+24,y-24);}
}
