import type {Stage,Station} from './model';
export const queueStage=(stage:Stage):Stage=>stage==='MANUAL_PEEL'?'PEEL':stage;
// Shared material bays sit beside the existing aisles, never on an empty workstation.
const bays:Record<Stage,{x:number;y:number}>={FA:{x:92,y:600},REMOVE:{x:360,y:335},TAPE:{x:700,y:335},BD:{x:955,y:335},UV:{x:1200,y:335},PEEL:{x:265,y:570},MANUAL_PEEL:{x:265,y:570},POL:{x:530,y:570},BUBBLE:{x:800,y:570},BLACK:{x:1010,y:570},FILM:{x:350,y:815},PI:{x:730,y:815},VI:{x:1235,y:825}};
export const holdingPoint=(stage:Stage)=>({...bays[queueStage(stage)]});
export function transportPoint(from:{x:number;y:number},to:{x:number;y:number},t:number){
 const aisle=(y:number)=>y<330?300:y<570?535:775;
 const points=[from,{x:from.x,y:aisle(from.y)},{x:145,y:aisle(from.y)},{x:145,y:aisle(to.y)},{x:to.x,y:aisle(to.y)},to];
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));let distance=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,t));
 for(let i=0;i<lengths.length;i++){if(lengths[i]>0&&distance<=lengths[i]){const f=distance/lengths[i];return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}distance-=lengths[i];}return {...to};
}
export function roundRobin(stations:Station[],lastId?:string){
 const start=stations.findIndex(s=>s.id===lastId)+1;
 return stations.slice(start).concat(stations.slice(0,start));
}
