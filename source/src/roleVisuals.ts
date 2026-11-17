import Phaser from 'phaser';
import {Stage} from './model';
export type RoleFamily='bd'|'pol'|'qc';
export function roleFamily(role:Stage):RoleFamily{return ['PI','VI'].includes(role)?'qc':['MANUAL_PEEL','PEEL','POL','BUBBLE','BLACK','FILM'].includes(role)?'pol':'bd';}
export const roleStyle={bd:{color:0x2154a5,light:0xb5d7ff,texture:'worker-bd',label:'维修'},pol:{color:0xe99a23,light:0xffe2a3,texture:'worker-pol',label:'贴附'},qc:{color:0x128d88,light:0xa6f0de,texture:'worker-qc',label:'检测'}};
/** Small readable tool silhouettes, drawn as native vector UI marks; no new character art. */
export function toolIcon(scene:Phaser.Scene,family:RoleFamily,x:number,y:number){const g=scene.add.graphics({x,y});const style=roleStyle[family];g.fillStyle(style.color);if(family==='bd'){g.fillRoundedRect(-3,-9,6,19,2);g.fillCircle(0,-7,6);g.fillStyle(style.light);g.fillTriangle(-4,-12,4,-12,0,-5);g.fillCircle(0,7,1.5);}else if(family==='pol'){g.fillStyle(0xfff0c7);g.fillRoundedRect(-8,-9,14,14,2);g.lineStyle(2,style.color);g.strokeRoundedRect(-8,-9,14,14,2);g.fillStyle(style.color);g.fillRoundedRect(-4,3,14,5,1);g.fillRoundedRect(0,6,5,5,1);}else{g.lineStyle(3,style.color);g.strokeCircle(-2,-3,6);g.lineBetween(3,2,9,9);g.lineStyle(2,0x288b73);g.lineBetween(-5,-3,-2,0);g.lineBetween(-2,0,2,-5);}return g;}

export const roleAsset:Record<Stage,string>={MANUAL_PEEL:'peel_pol',REMOVE:'remove',TAPE:'acf',BD:'bd',UV:'uv',PEEL:'peel_pol',POL:'attach_pol',BUBBLE:'peel_pol',BLACK:'black_glue',FILM:'film',PI:'pi',VI:'vi'};
export const equipmentAsset:Record<Stage,string>={MANUAL_PEEL:'pol_manual_peel',REMOVE:'remove',TAPE:'acf_tape',BD:'bd_bond',UV:'uv',PEEL:'pol_peel',POL:'pol_laminate',BUBBLE:'debubble',BLACK:'black_glue',FILM:'film_repair',PI:'inspection_pi',VI:'inspection_vi'};
