import type {BattleResult} from './engine';
export interface ScoreRecord {
 id:string; player:string; completedAt:string; bu:'TV'|'MNT'; shift:'DAY'|'NIGHT'; date:string;
 scenarioId:string; configuration:string; fingerprint:string; ngVersion:string; synthetic:boolean;
 total:number; target:number; staff:number; out:number; deployed:number; opening:number;
 forecast:{BD:number;POL:number;REVIEW:number;FILM:number}; closing:number; seed:string; engine:string;
}
export interface ScoreRepository {
 save(record:ScoreRecord):Promise<void>;
 query(filters:{player?:string;bu?:string;shift?:string}):Promise<ScoreRecord[]>;
}
export function playerName(raw:string){
 const name=raw.normalize('NFKC').trim().replace(/\s+/g,' ');
 if(!/^[\p{L}\p{N} _.-]{1,24}$/u.test(name))throw Error('姓名须为 1–24 个文字、字母或数字，可含空格、点、横线和下划线');
 return name;
}
export function challengeId(){
 return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
}
export function makeScore(result:BattleResult,player:string,id:string):ScoreRecord{
 const s=result.scenarioSnapshot,r=result.scoreBreakdown,raw=JSON.stringify(s);let hash=2166136261;
 for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);
 return {id,player:playerName(player),completedAt:new Date().toISOString(),bu:s.mode??'TV',shift:s.shift??'DAY',
 date:s.date??new Date().toISOString().slice(0,10).replace(/-/g,''),scenarioId:s.id,configuration:s.configurationVersion??'legacy-v10',
 fingerprint:(hash>>>0).toString(16).padStart(8,'0'),ngVersion:s.forecast?.version??'none',synthetic:s.synthetic,
 total:r.total,target:r.target,staff:r.staff,out:r.out,deployed:result.deployed,opening:result.simulation.opening,
 forecast:s.forecast?.amounts??{BD:0,POL:0,REVIEW:0,FILM:0},closing:result.simulation.closing,seed:s.seed,engine:'v10-bu-1'};
}
export function scoreRepository():ScoreRepository{
 async function request(query:string,record?:ScoreRecord){
  if(/\.github\.io$/i.test(location.hostname))throw Error('GitHub Pages 试玩没有私有成绩服务');
  const res=await fetch('/api/scores'+query,{credentials:'same-origin',cache:'no-store',...(record?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)}:{})});
  if(!res.ok||!res.headers.get('content-type')?.includes('application/json'))throw Error('共享成绩库不可用或未授权');
  return await res.json();
 }
 return {
  async save(record){const reply=await request('',record);if(reply.saved!==true)throw Error('共享成绩库未确认保存');},
  async query(filters){const query=new URLSearchParams();for(const [key,value] of Object.entries(filters))if(value)query.set(key,value);const reply=await request('?'+query.toString());if(!Array.isArray(reply.records))throw Error('共享成绩库返回异常');return reply.records;}
 };
}
