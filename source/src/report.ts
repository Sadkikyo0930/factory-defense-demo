export const reportKeys=['FA','REMOVE','BD','UV','POL_TOTAL','FILM','PI','VI','OUT','BLACK','TAPE'] as const;
export type ReportKey=typeof reportKeys[number];
export const reportLabels:Record<ReportKey,string>={FA:'FA分析岗（共享）',REMOVE:'TV祛除',BD:'TV BD',UV:'TV UV',POL_TOTAL:'TV POL',FILM:'TV覆膜',PI:'TV PI',VI:'TV VI',OUT:'TV OUT',BLACK:'黑胶（共享来源，当前TV）',TAPE:'贴胶（默认0）'};
export interface ReportPreview{filename:string;sheet:string;dates:string[];rows:{key:ReportKey;originalNames:string[];values:unknown[];value:number|null;problem:string}[];warnings:string[];ignored:string[];}
export interface WipSnapshot{fingerprint:string;filename:string;date:string;sheet:string;rawNames:Record<string,string[]>;counts:Record<ReportKey,number>;peelRatio:number;}
export const normalize=(v:unknown)=>String(v??'').normalize('NFKC').replace(/[\s\u200b_-]/g,'').toUpperCase();
export function mapReportName(v:unknown,group?:'TV'|'MNT'):ReportKey|undefined{if(group==='MNT')return undefined;const n=normalize(v),aliases:Record<string,ReportKey>={FA分析岗:'FA',FA分析:'FA',TV祛除:'REMOVE',TV去除:'REMOVE',TVBD:'BD',TVUV:'UV',TVPOL:'POL_TOTAL',TV覆膜:'FILM',TV贴膜:'FILM',TV修膜:'FILM',TVPI:'PI',TVVI:'VI',TVOUT:'OUT',黑胶:'BLACK',TV黑胶:'BLACK',贴胶:'TAPE',TV贴胶:'TAPE'};return aliases[n]||(group==='TV'?aliases['TV'+n]:undefined);}
export function count(v:unknown):number|null{if(typeof v==='string'){if(!/^\d+(?:,\d{3})*$/.test(v.trim())&&!/^\d+$/.test(v.trim()))return null;v=Number(v.replace(/,/g,''));}return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;}
export function splitPOL(total:number,ratio:number){if(count(total)===null||!Number.isFinite(ratio)||ratio<0||ratio>1)throw Error('POL总量或比例非法');const peel=Math.round(total*ratio);return {peel,pol:total-peel};}
export function validateSnapshot(s:WipSnapshot){if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||new Date(s.date).toISOString().slice(0,10)!==s.date)throw Error('请选择有效日报日期');for(const key of reportKeys)if(count(s.counts[key])===null)throw Error(reportLabels[key]+' 必须为非负安全整数');splitPOL(s.counts.POL_TOTAL,s.peelRatio);let total=0;for(const v of Object.values(s.counts)){total+=v;if(!Number.isSafeInteger(total))throw Error('初始WIP合计超出安全整数范围');}return total;}
export function makePreview(filename:string,sheet:string,data:{name:unknown;today:unknown;group?:'TV'|'MNT'}[],dates:string[],extra:string[]=[]):ReportPreview{const groups=new Map<ReportKey,{names:string[];values:unknown[]}>(),ignored:string[]=[],warnings=[...extra];for(const row of data){const n=String(row.name??'').trim();if(!n)continue;const key=mapReportName(n,row.group);if(!key){if(row.today!==undefined&&row.today!==null&&row.today!==''){ignored.push(n+'：'+String(row.today));}continue;}const g=groups.get(key)||{names:[],values:[]};g.names.push(n);g.values.push(row.today);groups.set(key,g);}
const rows=reportKeys.map(key=>{const g=groups.get(key);if(!g)return {key,originalNames:[],values:[],value:0,problem:key==='TAPE'?'无独立字段，默认0':'未找到岗位，暂填0，请核对'};const parsed=g.values.map(count),unique=[...new Set(parsed.filter(v=>v!==null))];let problem=parsed.includes(null)?'存在空白或非法值，须手动确认':unique.length>1?'白夜班/重复岗位数值不一致，禁止相加，请确认':g.values.length>1?'重复快照已去重，不相加':'';return {key,originalNames:[...new Set(g.names)],values:g.values,value:parsed.includes(null)||unique.length!==1?null:unique[0],problem};});const uniqueDates=[...new Set(dates)];if(uniqueDates.length!==1)warnings.push(uniqueDates.length?'日期不一致，请选择正确日期并确认':'未识别日报日期，请手动填写');if(ignored.length)warnings.push('未导入的其他/未映射岗位已列出，请核对（MNT不计入TV初始WIP）');return {filename,sheet,dates:uniqueDates,rows,warnings,ignored};}
export interface SheetGrid{name:string;cells:unknown[][];merges:{s:{r:number;c:number};e:{r:number;c:number}}[];}
type CellRange=SheetGrid['merges'][number];
interface HeaderCell {r:number;c:number;value:unknown;key:string;range:CellRange;}
interface PreparedSheet {name:string;rows:unknown[][];nodes:HeaderCell[];roles:HeaderCell[];explicit:Set<string>;width:number;}
interface ExcelRow {name:unknown;today:unknown;group?:'TV'|'MNT';}
const roleHeaders=new Set(['岗位','岗位明细','岗位名称','工序','工序名称','站点','站点名称']);
const shift=(v:unknown)=>['白班','夜班'].includes(normalize(v))?normalize(v):undefined;
const mode=(v:unknown):'TV'|'MNT'|undefined=>{
    const n=normalize(v);
    if(['TV','TV维修','TV维修区','TV工区','TV区域'].includes(n))return 'TV';
    if(['MNT','MNT维修','MNT维修区','MNT工区','MNT区域'].includes(n))return 'MNT';
    return undefined;
};
const column=(c:number):string=>{let text='';for(c++;c;c=Math.floor((c-1)/26))text=String.fromCharCode(65+(c-1)%26)+text;return text;};
const address=(n:HeaderCell)=>`${column(n.c)}${n.r+1}`;
const covers=(outer:HeaderCell,inner:HeaderCell)=>outer.range.s.c<=inner.range.s.c&&outer.range.e.c>=inner.range.e.c;
function prepareSheet(sheet:SheetGrid):PreparedSheet{
    const rows=sheet.cells.map(row=>[...(row||[])]),ranges=new Map<string,CellRange>(),covered=new Set<string>();
    let width=rows.reduce((max,row)=>Math.max(max,row.length),0);
    for(const range of sheet.merges){
        const {s,e}=range;
        if(![s.r,s.c,e.r,e.c].every(n=>Number.isSafeInteger(n)&&n>=0)||e.r<s.r||e.c<s.c||(e.r+1)*(e.c+1)>200000)
            throw Error(`工作表「${sheet.name}」合并区域非法或过大`);
        const value=rows[s.r]?.[s.c];ranges.set(`${s.r}:${s.c}`,range);width=Math.max(width,e.c+1);
        for(let r=s.r;r<=e.r;r++){rows[r]??=[];for(let c=s.c;c<=e.c;c++){
            const id=`${r}:${c}`;if(covered.has(id))throw Error(`工作表「${sheet.name}」合并区域重叠：${column(c)}${r+1}`);
            covered.add(id);rows[r][c]=value;
        }}
    }
    if(rows.length*width>200000)throw Error(`工作表「${sheet.name}」超过20万单元格`);
    const nodes:HeaderCell[]=[];
    for(let r=0;r<rows.length;r++)for(let c=0;c<(rows[r]?.length||0);c++){
        const id=`${r}:${c}`,range=ranges.get(id);
        if(covered.has(id)&&!range)continue;
        const value=rows[r][c];if(value===null||value===undefined||value==='')continue;
        nodes.push({r,c,value,key:normalize(value),range:range||{s:{r,c},e:{r,c}}});
    }
    return {name:sheet.name,rows,nodes,roles:nodes.filter(n=>roleHeaders.has(n.key)),explicit:new Set(nodes.map(n=>`${n.r}:${n.c}`)),width};
}
// Carry only explicit TV/MNT grouping and adjacent day/night pairs, never totals.
function dataRows(sheet:PreparedSheet,nameCol:number,todayCol:number,start:number,end:number):ExcelRow[]{
    const result:ExcelRow[]=[];let group:'TV'|'MNT'|undefined,previous:{name:unknown;shift?:string;row:number;group?:'TV'|'MNT'}|undefined;
    for(let r=start;r<end;r++){
        const row=sheet.rows[r]||[];
        if(row.every(v=>v===undefined||v===null||v==='')){group=undefined;previous=undefined;continue;}
        const labels=row.slice(0,nameCol).filter(v=>typeof v==='string'&&normalize(v)&&!shift(v));
        const explicit=labels.map(mode).filter((m):m is 'TV'|'MNT'=>!!m);
        if(explicit.length)group=explicit.includes('MNT')?'MNT':'TV';
        else if(labels.length)group=undefined;
        const currentShift=row.slice(0,todayCol).map(shift).find(Boolean);
        let name=row[nameCol];
        if((name===undefined||name===null||name==='')&&currentShift&&previous?.shift&&currentShift!==previous.shift&&previous.row===r-1&&(!group||group===previous.group)){
            name=previous.name;group=group||previous.group;
        }
        if(name!==undefined&&name!==null&&String(name).trim()){
            result.push({name,today:row[todayCol],group});
            previous=sheet.explicit.has(`${r}:${nameCol}`)?{name,shift:currentShift,row:r,group}:undefined;
        }else previous=undefined;
    }
    return result;
}
/** Strictly discover the WIP leaf by merged column ownership, not row offsets. */
export function parseGrids(filename:string,sheets:SheetGrid[]):ReportPreview{
    const prepared=sheets.map(prepareSheet);
    const candidates:{sheet:PreparedSheet;today:HeaderCell;nameCol:number;start:number;end:number;data:ExcelRow[]}[]=[];
    const diagnostics:string[]=[];
    for(const sheet of prepared){
        const {nodes,roles}=sheet,todays=nodes.filter(n=>n.key==='今日实绩');
        const headers=nodes.filter(n=>/岗位|工序|站点|情况|实绩|出勤|人员|WIP|班次|明细|目标|BAL/.test(n.key));
        diagnostics.push(`工作表「${sheet.name}」：${sheet.rows.length}行 × ${sheet.width}列`,
            '识别表头：'+(headers.slice(-80).map(n=>`${address(n)}「${String(n.value).replace(/\s+/g,' ')}」${n.range.e.c>n.c?'['+column(n.c)+':'+column(n.range.e.c)+']':''}`).join('；')||'无可识别表头'));
        if(todays.length>200||roles.length>200)throw Error('表头候选过多，无法安全识别\n'+diagnostics.join('\n'));
        const details:string[]=[];
        for(const today of todays){
            const groups=nodes.filter(n=>n.key==='WIP情况'&&n.range.e.r<today.r&&covers(n,today)).sort((a,b)=>b.r-a.r);
            const parent=groups[0];
            if(!parent){details.push(`${address(today)}（${column(today.c)}列）：没有覆盖此列的 WIP情况 父级，拒绝使用`);continue;}
            const barrier=nodes.find(n=>n.r>parent.range.e.r&&n.r<today.r&&covers(n,today)&&/出勤|人员|人力|产能|产出|良率|效率/.test(n.key));
            if(barrier){details.push(`${address(today)}：被 ${address(barrier)}「${String(barrier.value)}」覆盖，非WIP今日实绩`);continue;}
            if(nodes.some(n=>n.r>parent.range.e.r&&n.r<today.r&&n.c<today.c&&mapReportName(n.value))){
                details.push(`${address(today)}：与WIP父级之间已出现岗位数据，拒绝跨表段关联`);continue;
            }
            const leftRoles=roles.filter(n=>n.range.e.c<today.c&&
                (n.r<=today.range.e.r||!sheet.rows.slice(today.range.e.r+1,n.r).some(row=>row?.slice(0,today.c).some(v=>mapReportName(v)))));
            if(!leftRoles.length){details.push(`${address(today)}：WIP父级 ${address(parent)}，缺少 岗位/岗位明细 表头`);continue;}
            const distance=(n:HeaderCell)=>Math.max(0,n.r-today.range.e.r,today.r-n.range.e.r);
            const nearest=Math.min(...leftRoles.map(distance));
            const roleBand=leftRoles.filter(n=>distance(n)===nearest);
            const start=Math.max(today.range.e.r,...roleBand.map(n=>n.range.e.r))+1;
            const nextHeaders=nodes.filter(n=>n.r>=start&&(roleHeaders.has(n.key)||n.key==='WIP情况'));
            const end=nextHeaders.reduce((end,n)=>Math.min(end,n.r),sheet.rows.length);
            const columns=[] as {c:number;data:ExcelRow[];distinct:number;count:number;inHeader:boolean}[];
            for(let c=0;c<today.c;c++){
                const data=dataRows(sheet,c,today.c,start,end),keys=data.map(row=>mapReportName(row.name,row.group)).filter(Boolean);
                if(keys.length)columns.push({c,data,distinct:new Set(keys).size,count:keys.length,inHeader:roleBand.some(n=>n.c<=c&&n.range.e.c>=c)});
            }
            columns.sort((a,b)=>b.distinct-a.distinct||b.count-a.count||Number(b.inHeader)-Number(a.inHeader));
            const best=columns[0],ties=best?columns.filter(n=>n.distinct===best.distinct&&n.count===best.count&&n.inHeader===best.inHeader):[];
            details.push(`${address(today)}（${column(today.c)}列），父级 ${address(parent)}「WIP情况」；岗位候选：${columns.map(n=>`${column(n.c)}列(${n.distinct}个已映射岗位)`).join('、')||'无'}；${!best?'未找到TV/共享岗位':ties.length>1?'岗位列不唯一，拒绝猜测':'可用'}`);
            if(!best||ties.length!==1)continue;
            candidates.push({sheet,today,nameCol:best.c,start,end,data:best.data});
        }
        diagnostics.push('今日实绩候选列：'+(details.join('\n')||'无'));
    }
    const preferred=candidates.filter(c=>normalize(c.sheet.name)==='常规日报'),selected=preferred.length?preferred:candidates;
    if(selected.length!==1)throw Error((selected.length?'发现多个WIP今日实绩区域，无法安全确定，请导出单一报表或用JSON中转':'未找到可唯一确认的“岗位/岗位明细 → WIP情况 → 今日实绩”；不使用目标/昨日实绩/BAL替代')+'\n'+diagnostics.join('\n'));
    const {sheet,today,nameCol,start,data}=selected[0],dates:string[]=[];
    for(const row of sheet.rows.slice(0,start))for(const cell of row||[]){
        if(cell instanceof Date&&!isNaN(cell.getTime()))dates.push(`${cell.getFullYear()}-${String(cell.getMonth()+1).padStart(2,'0')}-${String(cell.getDate()).padStart(2,'0')}`);
        else for(const token of String(cell??'').normalize('NFKC').match(/20\d{2}[年/.-]\d{1,2}[月/.-]\d{1,2}日?/g)||[]){
            const m=/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})/.exec(token)!;dates.push(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
        }
    }
    return makePreview(filename,sheet.name,data,dates,[...(preferred.length?[]:['未使用常规日报：根据严格表头自动发现工作表']),`识别位置：岗位 ${column(nameCol)}列；WIP今日实绩 ${address(today)}；数据起始第${start+1}行`]);
}
