import {inspectReportFormat,formatSummary,biffEncrypted} from './reportFormat';
﻿import * as XLSX from 'xlsx';
import {parseGrids,makePreview,normalize,SheetGrid} from './report';
import {ImportStage} from './reportStages';
self.onmessage=(event:MessageEvent<{buffer:ArrayBuffer;filename:string}>)=>{
 let stage:ImportStage='format',last=performance.now();const timings:Partial<Record<ImportStage,number>>={};
 const progress=(next:ImportStage,detail?:string)=>{const now=performance.now();timings[stage]=(timings[stage]||0)+now-last;last=now;stage=next;self.postMessage({progress:{stage,detail},timings});};
 try{
  const {buffer,filename,expectedBytes}=event.data as {buffer:ArrayBuffer;filename:string;expectedBytes?:number};
  progress('format');
  const inspected=inspectReportFormat(buffer,filename,bytes=>{const cfb=XLSX.CFB.read(bytes,{type:'buffer'}),names=cfb.FullPaths.map((n:string)=>n.split(/[\\/]/).pop()!.toLowerCase()),index=cfb.FileIndex.findIndex((f:{name:string})=>['workbook','book'].includes(f.name.toLowerCase()));return {workbook:index>=0,encryptedPackage:names.includes('encryptedpackage'),encryptionInfo:names.includes('encryptioninfo'),filePass:index>=0&&biffEncrypted(new Uint8Array(cfb.FileIndex[index].content))};},expectedBytes);
  self.postMessage({format:inspected.diagnostic});progress('format',formatSummary(inspected.diagnostic));
  if(inspected.diagnostic.transferMatches===false)throw Error('浏览器读取/传输长度与所选文件不一致，请重新选择副本');
  if(!inspected.diagnostic.readable)throw Error(formatSummary(inspected.diagnostic)+'。浏览器不尝试密码或解除保护；可选用Windows本地Excel只读提取工具生成JSON。');
  if(inspected.diagnostic.kind==='json'){progress('decode','JSON文本');let value;try{value=JSON.parse(inspected.text!);}catch{throw Error('JSON语法无效（未输出文件正文），请使用提取工具生成的原始JSON');}if(!Array.isArray(value.rows))throw Error('JSON需要{date,rows:[{name,today}]}格式');progress('map');const preview=makePreview(filename,'JSON中转',value.rows,[String(value.date||'')]);timings[stage]=(timings[stage]||0)+performance.now()-last;self.postMessage({preview,timings});return;}
  const textFormat=inspected.diagnostic.container==='text',payload=textFormat?inspected.text!:inspected.binary;
  const options={type:(textFormat?'string':'array') as 'string'|'array',dense:true,cellDates:true,cellFormula:false,cellHTML:false,cellStyles:false,cellNF:false,bookVBA:false};
  progress('workbook','只读目录，不解析所有工作表');
  const directory=XLSX.read(payload,textFormat?options:{...options,bookSheets:true,bookProps:false});
  progress('sheet',directory.SheetNames.join('、'));
  const preferred=directory.SheetNames.filter(name=>normalize(name)==='常规日报'),selected=preferred.length?preferred:directory.SheetNames;
  if(selected.length>64)throw Error('工作表候选超过64个且未唯一定位常规日报，请导出独立日报；表名：'+selected.slice(0,64).join('、'));
  progress('decode','仅解码：'+selected.join('、'));
  const wb=textFormat?directory:XLSX.read(payload,{...options,sheets:selected});
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
 }catch(e){timings[stage]=(timings[stage]||0)+performance.now()-last;self.postMessage({error:(['decode','workbook'].includes(stage)?'JavaScript解码器无法读取此文件（可能损坏、编码或格式不受支持）。未输出正文；可使用本地Excel只读提取工具转JSON。':e instanceof Error?e.message:'文件解析失败/内存不足'),stage,timings});}
};
