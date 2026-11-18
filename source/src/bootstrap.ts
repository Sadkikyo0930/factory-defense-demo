import {diagnosticsInit,recordRuntime,runtimeError} from './runtime';
diagnosticsInit();
recordRuntime('phase','正在加载游戏模块');
const unsupported=[];if(typeof HTMLCanvasElement==='undefined')unsupported.push('Canvas');if(typeof Map==='undefined')unsupported.push('Map');
if(unsupported.length)runtimeError('浏览器缺少 '+unsupported.join('、')+'；目标为Chrome109或以上');
else (new URLSearchParams(location.search).has('legacy')?import('./main'):import('./v10/main')).catch(e=>runtimeError('游戏模块加载失败（请检查缓存/脚本路径）：'+String(e.message||e)));
