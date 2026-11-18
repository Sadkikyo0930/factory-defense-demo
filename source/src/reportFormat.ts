export type ReportFormatKind='xlsx-zip'|'xlsb-zip'|'zip-other'|'xls-ole'|'ole-other'|'xls-biff'|'encrypted-office'|'html'|'spreadsheet-xml'|'xml-other'|'json'|'unknown'|'empty';
export interface FormatDiagnostic{headerHex:string;kind:ReportFormatKind;bytes:number;expectedBytes?:number;transferMatches?:boolean;extension:string;encoding:string;prefixBytes:number;container:'ZIP'|'OLE'|'BIFF'|'text'|'unknown';markers:string[];readable:boolean;}
export interface OleMarkers{workbook:boolean;encryptedPackage:boolean;encryptionInfo:boolean;filePass:boolean;}
export interface InspectedReport{diagnostic:FormatDiagnostic;binary:ArrayBuffer;text?:string;}
const signature=(bytes:Uint8Array,offset:number,values:number[])=>values.every((v,i)=>bytes[offset+i]===v);
export function biffEncrypted(bytes:Uint8Array){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=0;while(offset+4<=Math.min(bytes.length,131072)){const id=v.getUint16(offset,true),length=v.getUint16(offset+2,true);if(id===0x002f)return true;if(id===0x000a||offset+4+length>bytes.length)break;offset+=4+length;}return false;}
function zipMarkers(bytes:Uint8Array):string[]{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===bytes.length){end=p;break;}
 if(end<0)return ['ZIP目录不完整'];const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true);if(count===65535||offset===0xffffffff)return ['ZIP64目录需Excel确认'];
 const markers=new Set<string>();let pos=offset;
 for(let i=0;i<count&&i<10000&&pos+46<=bytes.length;i++){
  if(v.getUint32(pos,true)!==0x02014b50)break;const flags=v.getUint16(pos+8,true),size=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
  if(flags&1)markers.add('加密ZIP条目');if(pos+46+size>bytes.length)break;
  const name=new TextDecoder('utf-8').decode(bytes.subarray(pos+46,pos+46+size)).replace(/\\/g,'/');
  if(name==='[Content_Types].xml')markers.add('Office内容类型');if(name==='xl/workbook.xml')markers.add('XML工作簿');if(name==='xl/workbook.bin')markers.add('二进制工作簿');pos+=46+size+extra+comment;
 }
 return [...markers];
}
export function inspectReportFormat(buffer:ArrayBuffer,filename:string,inspectOle?:(bytes:Uint8Array)=>OleMarkers,expectedBytes?:number):InspectedReport{
 const bytes=new Uint8Array(buffer),extension=(/\.([a-z0-9]+)$/i.exec(filename)?.[1]||'无扩展名').toLowerCase();
 // Fixed 16-byte original header only: never decode or log workbook body as diagnostics.
 const d:FormatDiagnostic={headerHex:Array.from(bytes.subarray(0,16),v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' '),kind:'unknown',bytes:bytes.length,extension,encoding:'binary/未确定',prefixBytes:0,container:'unknown',markers:[],readable:false};
 if(expectedBytes!==undefined){d.expectedBytes=expectedBytes;d.transferMatches=bytes.length===expectedBytes;}
 if(!bytes.length){d.kind='empty';return {diagnostic:d,binary:buffer};}
 // A BIFF BOF begins with 0x09 (also TAB). Recognize binary before trimming.
 const binaryAt=(i:number)=>signature(bytes,i,[0x50,0x4b,0x03,0x04])||signature(bytes,i,[0x50,0x4b,0x05,0x06])||signature(bytes,i,[0x50,0x4b,0x07,0x08])||signature(bytes,i,[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])||(bytes[i]===9&&[0,2,4,8].includes(bytes[i+1]));
 let offset=0;if(!binaryAt(0)){let candidate=signature(bytes,0,[0xef,0xbb,0xbf])?3:0;const bom=candidate;if(binaryAt(candidate))offset=candidate;else{while(candidate<64&&[9,10,13,32].includes(bytes[candidate]))candidate++;if(binaryAt(candidate))offset=candidate;else offset=bom&&binaryAt(bom)?bom:0;}}
 const binary=offset?buffer.slice(offset):buffer,b=new Uint8Array(binary);d.prefixBytes=offset;
 if(signature(b,0,[0x50,0x4b,0x03,0x04])||signature(b,0,[0x50,0x4b,0x05,0x06])||signature(b,0,[0x50,0x4b,0x07,0x08])){
  d.container='ZIP';d.markers=zipMarkers(b);d.kind=d.markers.includes('加密ZIP条目')?'encrypted-office':d.markers.includes('Office内容类型')&&d.markers.includes('XML工作簿')?'xlsx-zip':d.markers.includes('Office内容类型')&&d.markers.includes('二进制工作簿')?'xlsb-zip':'zip-other';d.readable=d.kind!=='encrypted-office';return {diagnostic:d,binary};
 }
 if(signature(b,0,[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])){
  d.container='OLE';try{const m=inspectOle?.(b);if(m){d.markers=[...(m.workbook?['Excel工作簿流']:[]),...(m.encryptedPackage?['EncryptedPackage']:[]),...(m.encryptionInfo?['EncryptionInfo']:[]),...(m.filePass?['BIFF FilePass']:[])];d.kind=m.encryptedPackage||m.encryptionInfo||m.filePass?'encrypted-office':m.workbook?'xls-ole':'ole-other';d.readable=d.kind==='xls-ole';}else{d.kind='ole-other';d.markers=['尚未检查OLE目录'];}}catch{d.kind='ole-other';d.markers=['OLE目录损坏或无法读取'];}return {diagnostic:d,binary};
 }
 if(b[0]===0x09&&[0x00,0x02,0x04,0x08].includes(b[1])&&b.length>=8){d.container='BIFF';d.kind=biffEncrypted(b)?'encrypted-office':'xls-biff';d.markers=d.kind==='encrypted-office'?['BIFF FilePass']:['原始BIFF记录'];d.readable=d.kind==='xls-biff';return {diagnostic:d,binary};}
 let encoding='utf-8';if(signature(bytes,0,[0xff,0xfe])||(bytes[1]===0&&bytes[3]===0&&[9,10,13,32,60].includes(bytes[0])))encoding='utf-16le';else if(signature(bytes,0,[0xfe,0xff])||(bytes[0]===0&&bytes[2]===0&&[9,10,13,32,60].includes(bytes[1])))encoding='utf-16be';
 let head='';try{head=new TextDecoder(encoding).decode(bytes.subarray(0,8192));}catch{return {diagnostic:d,binary};}
 if(encoding==='utf-8'){
  const match=/(?:charset\s*=\s*["']?\s*|encoding\s*=\s*["'])([a-z0-9_-]+)/i.exec(head),allowed=['utf-8','utf8','utf-16','utf-16le','utf-16be','gb2312','gbk','gb18030','windows-1252','big5'];
  if(match&&allowed.includes(match[1].toLowerCase()))encoding=match[1].toLowerCase();
 }
 d.encoding=encoding+((signature(bytes,0,[0xef,0xbb,0xbf])||signature(bytes,0,[0xff,0xfe])||signature(bytes,0,[0xfe,0xff]))?' / BOM':'');
 const probe=head.replace(/^\uFEFF/,'').replace(/^\s+/,'');
 if(/^[\[{]/.test(probe)){d.kind='json';d.container='text';d.readable=true;}
 else if(/<(?:(?:[a-z0-9_]+):)?Workbook\b/i.test(probe)&&/urn:schemas-microsoft-com:office:spreadsheet/i.test(probe)){d.kind='spreadsheet-xml';d.container='text';d.markers=['SpreadsheetML 2003'];d.readable=true;}

 else if(/<(?:!doctype\s+html\b|html\b|table\b)/i.test(probe)){d.kind='html';d.container='text';d.markers=['HTML表格/页面标记'];d.readable=true;} else if(/^<\??[a-z!]/i.test(probe)){d.kind='xml-other';d.container='text';d.markers=['未确认的XML结构'];}
 return {diagnostic:d,binary,text:d.container==='text'?new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/,'').replace(/^\s+/,''):undefined};
}
export const formatLabels:Record<ReportFormatKind,string>={'xlsx-zip':'标准XLSX ZIP','xlsb-zip':'XLSB ZIP','zip-other':'ZIP容器（工作簿待验证）','xls-ole':'XLS OLE','ole-other':'其他/损坏OLE','xls-biff':'原始BIFF XLS','encrypted-office':'加密Office/加密容器','html':'HTML兼容文件','spreadsheet-xml':'Excel XML 2003兼容文件','xml-other':'未识别的XML兼容文件','json':'JSON中转文件','unknown':'未知格式','empty':'空文件'};
export function formatSummary(d:FormatDiagnostic){return `格式：${formatLabels[d.kind]}；文件头 HEX（最多16字节）：${d.headerHex||'空'}${d.transferMatches===false?'；读取/传输长度不一致':''}`;}
