import type {FormatDiagnostic} from './reportFormat';
﻿export type ImportStage='read'|'fingerprint'|'worker'|'format'|'workbook'|'sheet'|'decode'|'headers'|'extract'|'map';
export const stageNames:Record<ImportStage,string>={read:'浏览器读取文件',fingerprint:'计算本地文件指纹',worker:'启动本地解析Worker',format:'识别文件格式',workbook:'读取工作簿目录',sheet:'定位目标工作表',decode:'XLS/XLSX解码及目标表读取',headers:'解析多级合并表头',extract:'提取岗位今日实绩',map:'岗位映射及校验'};
export interface ImportProgress{stage:ImportStage;elapsed?:number;detail?:string;}
export interface ImportTrace{format?:FormatDiagnostic;file:string;size:number;stage:ImportStage;timings:Partial<Record<ImportStage,number>>;detail?:string;details?:Partial<Record<ImportStage,string>>;total:number;}
