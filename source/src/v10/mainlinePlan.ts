import {normalizePlan,type PlanRecord,type Shift} from './plan';
import type {Mode} from './spec';
/** Display only actual normalized source plan quantities, never repair/NG forecasts. */
export function mainlinePlan(records:PlanRecord[],date:string,mode:Mode,shift:Shift){
 const totals=new Map<string,number>();
 for(const raw of records){const row=normalizePlan(raw);if(row.date!==date||!row.valid||row.bu!==mode)continue;const n=shift==='DAY'?row.day:row.night;const amount=(totals.get(row.model)??0)+n;if(!Number.isSafeInteger(amount))throw Error('排产数量超出范围');totals.set(row.model,amount);}
 return [...totals].map(([model,quantity])=>({model,quantity}));
}
