import { UserError } from './contracts';
import type { Item } from './newsroom';
export type Coverage={status:'ready'|'checked'|'failed';checked_at:string;references:Item[];matches:{item_id:string;st_id:string}[];error?:string};
export function validateCoverage(value:unknown,items:{item_id:string}[],references:{item_id:string}[]):Coverage['matches']{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join(',')!=='matches'||!Array.isArray((value as {matches:unknown}).matches))throw new UserError('Invalid ST comparison response');
 const ids=new Set(items.map(i=>i.item_id)),refs=new Set(references.map(i=>i.item_id)),seen=new Set<string>();
 return (value as {matches:unknown[]}).matches.map(match=>{
  if(!match||typeof match!=='object'||Array.isArray(match))throw new UserError('Invalid ST match');
  const m=match as Record<string,unknown>;
  if(Object.keys(m).sort().join(',')!=='item_id,st_id'||typeof m.item_id!=='string'||typeof m.st_id!=='string'||!ids.has(m.item_id)||!refs.has(m.st_id))throw new UserError('Invalid ST match IDs');
  seen.add(m.item_id);return {item_id:m.item_id,st_id:m.st_id};
 }).filter((match,index,all)=>all.findIndex(m=>m.item_id===match.item_id)===index);
}
