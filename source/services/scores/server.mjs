import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {timingSafeEqual} from 'node:crypto';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const keys=['id','player','completedAt','bu','shift','date','scenarioId','configuration','fingerprint','ngVersion','synthetic','total','target','staff','out','deployed','opening','forecast','closing','seed','engine'];
const ng=['BD','POL','REVIEW','FILM'];
const name=/^[\p{L}\p{N} _.-]{1,24}$/u, tag=/^[\p{L}\p{N} :._-]{1,256}$/u;
export function validScore(o){
 if(!o||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))return false;
 if(typeof o.id!=='string'||!/^[0-9a-f]{32}$/.test(o.id)||typeof o.player!=='string'||!name.test(o.player)||o.player!==o.player.trim())return false;
 if(!['TV','MNT'].includes(o.bu)||!['DAY','NIGHT'].includes(o.shift)||typeof o.synthetic!=='boolean'||!/^\d{8}$/.test(o.date)||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(o.completedAt)||!Number.isFinite(Date.parse(o.completedAt)))return false;
 const counts=['deployed','opening','closing'],score=['target','staff','out','total'];
 return ['scenarioId','configuration','fingerprint','ngVersion','seed','engine'].every(k=>typeof o[k]==='string'&&tag.test(o[k]))&&
 counts.every(k=>Number.isSafeInteger(o[k])&&o[k]>=0)&&o.deployed<=40&&
 score.every(k=>typeof o[k]==='number'&&Number.isFinite(o[k])&&o[k]>=0&&o[k]<=100)&&
 Math.abs(o.total-Math.round((o.target+o.staff+o.out)*10)/10)<1e-8&&
 o.forecast&&typeof o.forecast==='object'&&Object.keys(o.forecast).length===4&&ng.every(k=>Number.isSafeInteger(o.forecast[k])&&o.forecast[k]>=0);
}
export function sqliteScores(file){
 const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS scores(id TEXT PRIMARY KEY, player TEXT NOT NULL, bu TEXT NOT NULL, shift TEXT NOT NULL, completed TEXT NOT NULL, payload TEXT NOT NULL);');
 const insert=db.prepare('INSERT OR IGNORE INTO scores VALUES (?,?,?,?,?,?)');
 return {
  save(o){const payload=JSON.stringify(Object.fromEntries(keys.map(k=>[k,k==='forecast'?Object.fromEntries(ng.map(n=>[n,o.forecast[n]])):o[k]])));
   if(insert.run(o.id,o.player,o.bu,o.shift,o.completedAt,payload).changes)return true;
   return db.prepare('SELECT payload FROM scores WHERE id=?').get(o.id).payload===payload;
  },
  query({player='',bu='',shift=''}){return db.prepare("SELECT payload FROM scores WHERE (?='' OR player=?) AND (?='' OR bu=?) AND (?='' OR shift=?) ORDER BY completed DESC,id DESC LIMIT 200").all(player,player,bu,bu,shift,shift).map(r=>JSON.parse(r.payload));},
  close(){db.close();}
 };
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
export function scoreServer({file,dist,password='', allowedHost='',origin=''}){
 const repo=sqliteScores(file),root=resolve(dist),credential=Buffer.from('Basic '+Buffer.from('factory:'+password).toString('base64'));
 const server=createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   const host=req.headers.host??'';
   const loopback=/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);
   if(!loopback&&(!password||!allowedHost||host!==allowedHost))return json(403,{error:'host not allowed'});
   if(password){const presented=Buffer.from(req.headers.authorization??'');if(presented.length!==credential.length||!timingSafeEqual(credential,presented)){res.setHeader('WWW-Authenticate','Basic realm="Factory practice"');return json(401,{error:'authorization required'});}}
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/scores'){
    if(req.method==='GET'){
     const player=url.searchParams.get('player')??'',bu=url.searchParams.get('bu')??'',shift=url.searchParams.get('shift')??'';
     if((player&&!name.test(player))||!['','TV','MNT'].includes(bu)||!['','DAY','NIGHT'].includes(shift))return json(400,{error:'invalid filter'});
     return json(200,{records:repo.query({player,bu,shift})});
    }
    if(req.method!=='POST')return json(405,{error:'invalid method'});
    if(req.headers.origin!==(origin||'http://'+host)||req.headers['content-type']!=='application/json')return json(403,{error:'origin or content type refused'});
    const parts=[];let length=0;for await(const part of req){length+=part.length;if(length>8192){json(413,{error:'payload too large'});return;}parts.push(part);}
    let record;try{record=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return json(400,{error:'invalid JSON'});}
    if(!validScore(record))return json(400,{error:'invalid score'});
    if(!repo.save(record))return json(409,{error:'challenge ID conflict'});
    return json(200,{saved:true});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'invalid method'});
   const filePath=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
   if(!filePath.startsWith(root+sep)||!existsSync(filePath)||!statSync(filePath).isFile())return json(404,{error:'not found'});
   res.setHeader('Content-Type',mime[extname(filePath)]??'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');
   if(req.method==='HEAD')return res.end();createReadStream(filePath).pipe(res);
  }catch{if(!res.headersSent)json(500,{error:'score service unavailable'});else res.end();}
 });
 server.on('close',()=>repo.close());
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const password=process.env.SCORE_PASSWORD??'',allowedHost=process.env.SCORE_HOST??'',origin=process.env.SCORE_ORIGIN??'';
 if(allowedHost&&(!password||!origin.startsWith('https://')))throw Error('A shared proxy host requires SCORE_PASSWORD and an HTTPS SCORE_ORIGIN.');
 scoreServer({file:process.env.SCORE_DB??'scores.local.sqlite',dist:'dist',password,allowedHost,origin}).listen(Number(process.env.SCORE_PORT??4195),'127.0.0.1',()=>console.log('Score demo available on loopback; use the configured SCORE_PORT (default 4195).'));
}
