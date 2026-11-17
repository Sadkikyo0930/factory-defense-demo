import {ReportPreview} from './report';
import {ImportStage,ImportTrace,stageNames} from './reportStages';
export function parseLocalReport(file:File,signal:AbortSignal,onProgress:(trace:ImportTrace)=>void,timeoutMs=15000):Promise<{preview:ReportPreview;fingerprint:string;trace:ImportTrace}>{
 return new Promise((resolve,reject)=>{
  const start=performance.now();let phaseStart=start,worker:Worker|undefined,reader:FileReader|undefined,ended=false,fingerprint='';
  const trace:ImportTrace={file:file.name,size:file.size,stage:'read',timings:{},details:{},total:0};
  const update=()=>{trace.total=performance.now()-start;onProgress({...trace,timings:{...trace.timings,[trace.stage]:(trace.timings[trace.stage]||0)+performance.now()-phaseStart}});};
  const phase=(stage:ImportStage,detail?:string)=>{trace.timings[trace.stage]=(trace.timings[trace.stage]||0)+performance.now()-phaseStart;phaseStart=performance.now();trace.stage=stage;trace.detail=detail;if(detail)trace.details![stage]=detail;update();};
  const cleanup=()=>{clearTimeout(deadline);clearInterval(heartbeat);worker?.terminate();if(reader?.readyState===FileReader.LOADING)reader.abort();signal.removeEventListener('abort',abort);};
  const fail=(error:Error)=>{if(ended)return;ended=true;trace.total=performance.now()-start;trace.timings[trace.stage]=(trace.timings[trace.stage]||0)+performance.now()-phaseStart;onProgress({...trace});cleanup();reject(error);};
  const abort=()=>fail(new DOMException('已取消导入，当前游戏未修改','AbortError'));
  const deadline=setTimeout(()=>fail(Error(`文件已进入「${stageNames[trace.stage]}」阶段时超时（总预算15秒）。当前游戏未修改；可取消后重选精简日报/JSON。${trace.detail?'阶段详情：'+trace.detail:''}`)),timeoutMs);
  const heartbeat=setInterval(update,500);signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}update();
  (async()=>{try{
   if(file.size>20*1024*1024)throw Error('文件超过20MB，请导出精简日报或用JSON中转');
   const buffer=await new Promise<ArrayBuffer>((yes,no)=>{reader=new FileReader();reader.onload=()=>yes(reader!.result as ArrayBuffer);reader.onerror=()=>no(Error('无法读取文件副本：'+(reader?.error?.message||'文件访问失败')));reader.onabort=()=>no(new DOMException('已取消','AbortError'));reader.readAsArrayBuffer(file);});if(ended)return;
   phase('fingerprint');if(globalThis.crypto?.subtle)fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');else fingerprint='metadata:'+file.name+':'+file.size+':'+file.lastModified;
   if(ended)return;phase('worker');if(typeof Worker==='undefined')throw Error('浏览器不支持Worker，请用手动WIP设置或换用Chrome109及以上');
   worker=new Worker(new URL('./report.worker.ts',import.meta.url));
   worker.onerror=()=>fail(Error('解析Worker启动/运行失败，可能是资源路径、内存不足、损坏文件或浏览器限制；最近阶段：'+stageNames[trace.stage]));
   worker.onmessage=event=>{if(ended)return;const message=event.data;if(message.format){trace.format=message.format;update();return;}if(message.progress){phase(message.progress.stage,message.progress.detail);if(message.timings)Object.assign(trace.timings,message.timings);return;}
    if(message.timings)Object.assign(trace.timings,message.timings);
    if(message.error){fail(Error(stageNames[message.stage as ImportStage]+'失败：'+message.error));return;}
    if(!message.preview){fail(Error('解析器返回了无效结果'));return;}ended=true;trace.total=performance.now()-start;onProgress({...trace});cleanup();resolve({preview:message.preview,fingerprint,trace});
   };
   worker.postMessage({buffer,filename:file.name,expectedBytes:file.size},[buffer]);
  }catch(e){fail(e instanceof Error?e:Error(String(e)));}})();
 });
}
