export const stages=['REMOVE','TAPE','BD','UV','PEEL','POL','BUBBLE','CUT','BLACK','FILM','PI','VI','OC_VI','LCM_VI','OUT'] as const;
export type Step=typeof stages[number];
export type Kind='BD'|'POL'|'FILM'|'REVIEW'|'UNKNOWN';
export type Mode='TV'|'MNT';
export const towers=stages.filter(s=>s!=='OUT'&&s!=='CUT'&&s!=='OC_VI'&&s!=='LCM_VI');
export const label:Record<Step,string>={REMOVE:'祛除',TAPE:'贴胶',BD:'BD',UV:'UV',PEEL:'机器撕 POL',POL:'贴 POL',BUBBLE:'共享脱泡',CUT:'切割',BLACK:'黑胶',FILM:'贴膜',PI:'PI',VI:'VI / OUT',OC_VI:'OC VI / OUT',LCM_VI:'LCM VI / OUT',OUT:'OUT'};
export const element:Record<Step,string>={REMOVE:'土',TAPE:'木',BD:'金',UV:'光',PEEL:'风',POL:'冰',BUBBLE:'雷',CUT:'磁',BLACK:'暗',FILM:'水',PI:'电',VI:'火',OC_VI:'火',LCM_VI:'火',OUT:'火'};
export const colors:Record<Step,number>={REMOVE:0xe8b070,TAPE:0x60e595,BD:0xffcc55,UV:0xc58cff,PEEL:0x7ce3e9,POL:0x6abaff,BUBBLE:0xb888ff,CUT:0xb2b4fa,BLACK:0xe076d4,FILM:0x5dd9f6,PI:0xffe26c,VI:0xff8059,OC_VI:0xff8059,LCM_VI:0xeba95a,OUT:0xff8059};
export const assets:Partial<Record<Step,string>>={REMOVE:'remove',TAPE:'acf',BD:'bd',UV:'uv',PEEL:'peel_pol',POL:'attach_pol',BLACK:'black_glue',FILM:'film',PI:'pi',VI:'vi',OC_VI:'vi',LCM_VI:'vi',CUT:'peel_pol'};
export const equipment:Partial<Record<Step,string>>={REMOVE:'remove',TAPE:'acf_tape',BD:'bd_bond',UV:'uv',PEEL:'pol_peel',POL:'pol_laminate',BUBBLE:'debubble',BLACK:'black_glue',FILM:'film_repair',PI:'inspection_pi'};
export const slots:Record<Step,number>={REMOVE:3,TAPE:1,BD:2,UV:1,PEEL:1,POL:2,BUBBLE:1,CUT:0,BLACK:1,FILM:1,PI:2,VI:4,OC_VI:0,LCM_VI:0,OUT:0};
export interface Lot {id:string;kind:Kind;mode:Mode;stage:Step;count:number;source:'opening'|'external'|'forecast';at:number;cof:number;black?:boolean;cut?:boolean;mntPanel?:'OC'|'LCM';}
export interface Scenario {schemaVersion:1;mode?:Mode;shift?:'DAY'|'NIGHT';date?:string;configurationVersion?:string;productionBlock?:string;forecast?:{plan:number;version:string;amounts:Record<'BD'|'POL'|'REVIEW'|'FILM',number>};id:string;name:string;synthetic:boolean;seed:string;duration:number;budget:number;lots:Lot[];targets:Partial<Record<Step,number>>;confirmedTargetsOnly?:boolean;importance?:Partial<Record<Step,number>>;yield:Record<Kind,number>;weights:{target:number;staff:number;out:number};sourceNote:string;rawFA:number;inConfirmed:boolean;conditionalPOLConfirmed?:boolean;cutTVConfirmed:boolean;cutMNTConfirmed:boolean;disabled:string[];minimum:Partial<Record<Step,number>>;}
export type Formation=Partial<Record<Step,number[]>>;
export function route(lot:Pick<Lot,'kind'|'stage'|'black'|'cut'|'mode'|'mntPanel'>):Step[]{
 const vi:Step=lot.mode==='MNT'&&lot.mntPanel?(lot.mntPanel==='OC'?'OC_VI':'LCM_VI'):'VI';
 const full:Step[]=lot.kind==='BD'?['REMOVE','TAPE','BD','UV','PI','VI','OUT']:lot.kind==='POL'?['PEEL','POL','BUBBLE',...(lot.cut?['CUT' as Step]:[]),...(lot.black?['BLACK' as Step]:[]),'PI','VI','OUT']:lot.kind==='FILM'?['FILM',...(lot.black?['BLACK' as Step]:[]),'PI','VI','OUT']:lot.kind==='REVIEW'?['VI','OUT']:['PI','VI','OUT'];
 if(vi!=='VI')full[full.indexOf('VI')]=vi;
 const start=full.indexOf(lot.stage);if(start<0)throw Error('期初阶段与维修类型不相容：'+lot.stage);return full.slice(start);
}
export function capacity(stage:Step,lot:Lot):number {if(stage==='OUT')return 300;const tv:Partial<Record<Step,number>>={REMOVE:170,TAPE:800,BD:130,UV:300,PEEL:120,POL:65,BLACK:240,FILM:120,PI:400,VI:300};const mnt:Partial<Record<Step,number>>={BD:115,PEEL:200,POL:80,FILM:200,PI:300,VI:lot.mntPanel==='OC'?400:300,OC_VI:400,LCM_VI:300,CUT:260,REMOVE:150,TAPE:700,UV:260,BLACK:200};return (lot.mode==='MNT'?mnt[stage]:tv[stage])??0;}
export function serviceTime(stage:Step,lot:Lot){if(stage==='BUBBLE')return 600;if(stage==='OUT')return 120;const rate=capacity(stage,lot);if(!rate)throw Error('工序产能未确认：'+stage);return 36000/rate*(stage==='TAPE'?lot.cof:1);}
export const mntDemoSlots:Record<Step,number>={REMOVE:2,TAPE:1,BD:2,UV:1,PEEL:1,POL:1,BUBBLE:1,CUT:1,BLACK:1,FILM:3,PI:3,VI:0,OC_VI:4,LCM_VI:2,OUT:0};
export const automaticBubble=(s:Scenario)=>s.mode==='MNT';
export const stageLabel=(stage:Step,s:Scenario)=>automaticBubble(s)?(stage==='BUBBLE'?'共享脱 POL':stage==='PEEL'?'撕POL':label[stage]):label[stage];
export const visibleTowers=(s:Scenario)=>s.mode==='MNT'?stages.filter(stage=>stageSlots(stage,s)>0):towers;
export function stageSlots(stage:Step,s:Scenario){if(s.mode==='MNT')return stage==='CUT'&&!s.cutMNTConfirmed?0:mntDemoSlots[stage];return stage==='CUT'?(s.cutMNTConfirmed?1:0):slots[stage];}
export function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value));}
/** Explicit scenario estimate for unknown POL model mix; never inferred from WIP. */
export function configurePOL(s:Scenario,ratio:number,cutRatio?:number){if(!Number.isFinite(ratio)||ratio<0||ratio>1)throw Error('POL黑胶比例须在0～100%');
 if(s.mode==='MNT'){
  if(cutRatio===undefined||!Number.isFinite(cutRatio)||cutRatio<0||cutRatio>1)throw Error('切割比例须在0～100%');
  const grouped=new Map<string,Lot>();
  const rest=s.lots.filter(l=>{
   if(l.kind!=='POL'||!['PEEL','POL','BUBBLE'].includes(l.stage))return true;
   const id=l.id.replace(/:mnt-route-[01][01]$/,'');const old=grouped.get(id);
   if(old)old.count+=l.count;else grouped.set(id,{...l,id});return false;
  });
  let cumulative=0,cutDone=0,blackDone=0;
  for(const lot of grouped.values()){
   cumulative+=lot.count;
   const nextCut=Math.round(cumulative*cutRatio),nextBlack=Math.round(cumulative*ratio);
   const cut=nextCut-cutDone,black=nextBlack-blackDone,both=Math.min(cut,black);
   cutDone=nextCut;blackDone=nextBlack;
   for(const [count,c,b] of [[both,true,true],[cut-both,true,false],[black-both,false,true],[lot.count-Math.max(cut,black),false,false]] as const)
    if(count)rest.push({...lot,id:lot.id+':mnt-route-'+Number(c)+Number(b),count,cut:c,black:b});
  }
  s.lots=rest;return;
 }
 const grouped=new Map<string,Lot>();
 const rest=s.lots.filter(l=>{if(l.source==='forecast'||l.kind!=='POL'||!['PEEL','POL','BUBBLE'].includes(l.stage))return true;const id=l.id.replace(/:pol-(black|plain)$/,'');const old=grouped.get(id);if(old)old.count+=l.count;else grouped.set(id,{...l,id});return false;});
 let cumulative=0,allocated=0;for(const lot of grouped.values()){cumulative+=lot.count;const black=Math.round(cumulative*ratio)-allocated;allocated+=black;if(black)rest.push({...lot,id:lot.id+':pol-black',count:black,black:true});if(lot.count-black)rest.push({...lot,id:lot.id+':pol-plain',count:lot.count-black,black:false});}s.lots=rest;
}
export function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
export function validate(s:Scenario,f:Formation){
 if(s.inConfirmed!==true)throw Error('新增 IN 口径未确认：不得把上游流入重复计为独立新投入');
 if(!Number.isSafeInteger(s.rawFA)||s.rawFA<0)throw Error('FA共享原始值不合法');
 if(typeof s.seed!=='string'||!s.seed.length||s.seed.length>256)throw Error('情景种子不合法');
 if(!Number.isFinite(s.duration)||s.duration<=0||s.duration>36000)throw Error('班次必须在 10 小时内');
 if(!Number.isSafeInteger(s.budget)||s.budget<0||s.budget>40)throw Error('人员预算须为 0～40');
 if(s.lots.length>500)throw Error('来源批次数超过500，请先汇总');
 const ids=new Set<string>();let total=0;
 for(const l of s.lots){if(!l.id||ids.has(l.id))throw Error('物料来源ID重复');ids.add(l.id);if(!Number.isSafeInteger(l.count)||l.count<0||!Number.isFinite(l.at)||l.at<0||l.at>s.duration||!Number.isFinite(l.cof)||l.cof<=0||l.cof>20)throw Error('物料数量/到料时间/COF不合法');if(s.mode==='MNT'&&(!l.mntPanel||l.mode!=='MNT'))throw Error('MNT 批次须明确指定 OC / LCM');if(l.source==='opening'&&l.at!==0)throw Error('期初批次必须在零时刻');if(!['TV','MNT'].includes(l.mode)||!['BD','POL','FILM','REVIEW','UNKNOWN'].includes(l.kind)||!stages.includes(l.stage))throw Error('物料类型不合法');const r=route(l);if(r.includes('CUT')&&l.count){if(l.mode==='TV')throw Error('TV切割设备及产能未确认，不能模拟自动通过');if(!s.cutMNTConfirmed)throw Error('MNT切割规则尚未确认');}total+=l.count;if(!Number.isSafeInteger(total))throw Error('物料合计超出安全整数');}
 for(const l of s.lots)if(!['opening','external','forecast'].includes(l.source))throw Error('物料来源必须是期初或明确独立新增IN');
 for(const key of ['BD','POL','FILM','REVIEW','UNKNOWN'] as const){const n=s.yield[key];if(!Number.isFinite(n)||n<0||n>1)throw Error('成功率须完整且在0～1之间');}
 for(const n of Object.values(s.targets))if(!Number.isSafeInteger(n)||n!<0)throw Error('目标WIP须为非负整数');
 for(const n of Object.values(s.importance||{}))if(!Number.isFinite(n)||n!<=0)throw Error('岗位重要性须为正数');
 for(const key of ['target','staff','out'] as const){const n=s.weights[key];if(!Number.isFinite(n)||n<0)throw Error('权重不合法');}if(Math.abs(Object.values(s.weights).reduce((a,b)=>a+b,0)-100)>1e-7)throw Error('评分权重合计须为100');
 for(const key of Object.keys(f)){if(!stages.includes(key as Step))throw Error('未知工位');}
 let staff=0;
 for(const stage of stages){const assigned=f[stage]||[];if((stage==='BUBBLE'||stage==='OUT')&&assigned.length)throw Error('脱泡为唯一自动机器，OUT由VI兼顾，不新增员工');if(new Set(assigned).size!==assigned.length||assigned.some(n=>!Number.isInteger(n)||n<1||n>stageSlots(stage,s)))throw Error(label[stage]+'部署位不合法');staff+=assigned.length;}
 if(staff>s.budget)throw Error('超过本情景人员预算');
 return total;
}
export function demoScenario():Scenario {
 const lot=(id:string,kind:Kind,stage:Step,count:number,source:'opening'|'external'|'forecast'='opening',at=0,mode:Mode='TV'):Lot=>({id,kind,stage,count,source,at,mode,cof:2,black:kind==='POL'});
 return {schemaVersion:1,id:'synthetic-tv-10h-v1',name:'TV 元素防线 · SYNTHETIC 演练',synthetic:true,seed:'factory-v10-fixed',duration:36000,budget:20,lots:[lot('o-remove','BD','REMOVE',10),lot('o-bd','BD','BD',20),lot('o-pol','POL','POL',15),lot('o-film','FILM','FILM',12),lot('o-pi','UNKNOWN','PI',8),lot('o-vi','UNKNOWN','VI',9),lot('o-out','UNKNOWN','OUT',4),lot('in-bd','BD','REMOVE',30,'external',1800),lot('in-pol','POL','PEEL',18,'external',3600),lot('in-film','FILM','FILM',12,'external',7200),lot('in-review','REVIEW','VI',16,'external',10800)],targets:{REMOVE:0,TAPE:0,BD:0,UV:0,PEEL:0,POL:0,BUBBLE:0,BLACK:0,FILM:0,PI:0,VI:0,OUT:0},yield:{BD:.68,POL:.8,FILM:1,REVIEW:1,UNKNOWN:1},weights:{target:60,staff:25,out:15},sourceNote:'合成到料序列；覆膜/过判100%仅演练；后段未分型不反推维修成功率。混批测试允许MNT进入唯一脱泡机；未确认的MNT后段设备不借用TV工位，保留在MNT后段等待。',rawFA:61,inConfirmed:true,cutTVConfirmed:false,cutMNTConfirmed:false,disabled:[],minimum:{}};
}
