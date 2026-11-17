export const runtimeState:Record<string,unknown>={version:'V0.7.1',phase:'入口启动',browser:navigator.userAgent,renderer:'尚未创建',loaded:0,failed:[] as string[],lastError:'无'};
let panel:HTMLElement,output:HTMLElement;let sample:(()=>unknown)|undefined;
export function recordRuntime(key:string,value:unknown){runtimeState[key]=value;}
export function runtimeError(message:string){runtimeState.lastError=message;const status=document.getElementById('boot-status');if(status){status.hidden=false;status.textContent='车间异常：'+message+'。可按 Ctrl+Shift+D 查看诊断；请保留当前页面，班次数据未清空。';}}
export function diagnosticsInit(){
    panel=document.createElement('aside');panel.id='runtime-diagnostics';panel.hidden=!new URLSearchParams(location.search).has('diagnostics');
    panel.style.cssText='position:fixed;z-index:10000;inset:65px 15px auto auto;width:min(650px,94vw);max-height:75vh;overflow:auto;background:#fff8e8;color:#24434b;padding:16px;border:2px solid #a9803e;border-radius:12px;font:12px monospace;';
    const title=document.createElement('b');title.textContent='车间诊断（仅本机显示）';const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>panel.hidden=true;
    output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';panel.append(title,close,output);document.body.append(panel);
    const refresh=()=>{if(!panel.hidden)output.textContent=JSON.stringify({...runtimeState,game:sample?.()},null,2);};
    window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.code==='KeyD'){e.preventDefault();panel.hidden=!panel.hidden;refresh();}});
    window.addEventListener('error',e=>runtimeError(e.message||'脚本或资源初始化失败'));
    window.addEventListener('unhandledrejection',e=>runtimeError(String(e.reason?.message||e.reason)));
    setInterval(refresh,1000);refresh();Object.assign(window,{getFactoryDiagnostics:()=>({...runtimeState,game:sample?.()})});
}
export function sampleRuntime(get:()=>unknown){sample=get;}
export function runtimeReady(){runtimeState.phase='场景已创建';const status=document.getElementById('boot-status');if(status&&(runtimeState.failed as string[]).length===0)status.hidden=true;}
export function rendererChoice(forceCanvas=false){
    const canvas=document.createElement('canvas');let context:WebGLRenderingContext|null=null;let reason='';
    if(!forceCanvas)try{context=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'}) as WebGLRenderingContext|null;
        if(context?.isContextLost()){context=null;reason='WebGL上下文已丢失';}
        if(context&&context.getParameter(context.MAX_TEXTURE_SIZE)<2048){context.getExtension('WEBGL_lose_context')?.loseContext();context=null;reason='GPU贴图上限不足2048';}
    }catch(e){reason=(e as Error).message;}
    if(context){recordRuntime('renderer','WebGL');recordRuntime('maxTextureSize',context.getParameter(context.MAX_TEXTURE_SIZE));return {canvas,context,webgl:true};}
    // A canvas that has acquired WebGL cannot subsequently acquire a 2D context.
    const fallback=document.createElement('canvas'),two=fallback.getContext('2d');
    if(!two)throw Error('WebGL与Canvas 2D均不可用，请检查浏览器图形支持');
    recordRuntime('renderer','Canvas 2D');recordRuntime('fallbackReason',forceCanvas?'明确选择Canvas模式':reason||'WebGL不可用');return {canvas:fallback,context:two,webgl:false};
}
