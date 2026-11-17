import * as XLSX from 'xlsx';
import {parseGrids,makePreview,normalize,SheetGrid} from './report';
import {ImportStage} from './reportStages';
self.onmessage=(event:MessageEvent<{buffer:ArrayBuffer;filename:string}>)=>{
 let stage:ImportStage='format',last=performance.now();const timings:Partial<Record<ImportStage,number>>={};
 const progress=(next:ImportStage,detail?:string)=>{const now=performance.now();timings[stage]=(timings[stage]||0)+now-last;last=now;stage=next;self.postMessage({progress:{stage,detail},timings});};
 try{
  const {buffer,filename}=event.data,magic=new Uint8Array(buffer,0,Math.min(8,buffer.byteLength));
  progress('format');
  const json=/\.json$/i.test(filename),xlsx=magic[0]===0x50&&magic[1]===0x4b,xls=magic[0]===0xd0&&magic[1]===0xcf;
  if(!json&&!xlsx&&!xls)throw Error('文件不是有效XLSX ZIP或XLS OLE格式（可能损坏、受密码保护或是HTML改名），请另存标准Excel或使用JSON');
  if(json){progress('decode','JSON文本');const value=JSON.parse(new TextDecoder().decode(buffer));if(!Array.isArray(value.rows))throw Error('JSON需要{date,rows:[{name,today}]}格式');progress('map');const preview=makePreview(filename,'JSON中转',value.rows,[String(value.date||'')]);timings[stage]=(timings[stage]||0)+performance.now()-last;self.postMessage({preview,timings});return;}
  progress('workbook','只读目录，不解析所有工作表');
  const directory=XLSX.read(buffer,{type:'array',bookSheets:true,bookProps:false});
  progress('sheet',directory.SheetNames.join('、'));
  const preferred=directory.SheetNames.filter(name=>normalize(name)==='常规日报'),selected=preferred.length?preferred:directory.SheetNames;
  if(selected.length>64)throw Error('工作表候选超过64个且未唯一定位常规日报，请导出独立日报；表名：'+selected.slice(0,64).join('、'));
  progress('decode','仅解码：'+selected.join('、'));
  const wb=XLSX.read(buffer,{type:'array',sheets:selected,dense:true,cellDates:true,cellFormula:false,cellHTML:false,cellStyles:false,cellNF:false,bookVBA:false});
  const grids:SheetGrid[]=selected.map(name=>{
   const ws=wb.Sheets[name];if(!ws)throw Error('无法读取工作表「'+name+'」');
   const data=(ws as unknown as {'!data'?:XLSX.CellObject[][]})['!data'];const cells:unknown[][]=[];let count=0;
   const accept=(r:number,c:number,cell:XLSX.CellObject)=>{if(!cell||cell.t==='z'||cell.v===undefined||cell.v===null||cell.v==='')return;if(++count>200000)throw Error('工作表「'+name+'」有效单元格超过20万，请导出精简日报');cells[r]??=[];cells[r][c]=cell.v;};
   if(data)for(const r of Object.keys(data))for(const c of Object.keys(data[Number(r)]||[]))accept(Number(r),Number(c),data[Number(r)][Number(c)]);
   else for(const key of Object.keys(ws))if(key[0]!=='!'){const pos=XLSX.utils.decode_cell(key);accept(pos.r,pos.c,ws[key] as XLSX.CellObject);}
   // Ignore formatting-only used ranges and blank merged areas, retaining absolute coordinates.
   return {name,cells,merges:(ws['!merges']||[]).filter(m=>cells[m.s.r]?.[m.s.c]!==undefined)};
  });
  const preview=parseGrids(filename,grids,s=>progress(s));timings[stage]=(timings[stage]||0)+performance.now()-last;self.postMessage({preview,timings});
 }catch(e){timings[stage]=(timings[stage]||0)+performance.now()-last;self.postMessage({error:(e instanceof Error?e.message:'文件解析失败/内存不足'),stage,timings});}
};
