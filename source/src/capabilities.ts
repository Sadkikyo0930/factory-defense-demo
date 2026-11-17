import type {Stage} from './model';
export type Capability=Stage|'BD_SUPPORT'|'POL_SUPPORT'|'INSPECT_SUPPORT'|'MULTI_SUPPORT';
// Demonstration permissions only. These are not a certified employee skill matrix.
export const supportSkills:Record<string,Stage[]>={BD_SUPPORT:['REMOVE','TAPE','BD','UV'],POL_SUPPORT:['PEEL','MANUAL_PEEL','POL','BUBBLE','BLACK','FILM'],INSPECT_SUPPORT:['PI','VI'],MULTI_SUPPORT:['REMOVE','TAPE','BD','UV','PEEL','MANUAL_PEEL','POL','BUBBLE','BLACK','FILM','PI','VI']};
export const supportNames:Record<string,string>={BD_SUPPORT:'BD 支援',POL_SUPPORT:'POL 支援',INSPECT_SUPPORT:'检测支援',MULTI_SUPPORT:'多能支援'};
// User-selected free support policy: artwork indicates original role, not a qualification lock.
export const qualified=(_capability:Capability,_stage:Stage)=>true;
