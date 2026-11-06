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

export function verifiedCoverage(value:unknown,pairs:{item_id:string;st_id:string;candidate:string;reference:string}[]):Coverage['matches']{
 if(!value||typeof value!=='object'||!Array.isArray((value as {checks?:unknown}).checks))throw new UserError('Invalid ST verification response');
 const checks=(value as {checks:{pair_index:number;same_event:boolean;candidate_quote:string;st_quote:string}[]}).checks;
 const seen=new Set<number>();const result:Coverage['matches']=[];
 for(const check of checks){if(!Number.isInteger(check.pair_index)||!pairs[check.pair_index]||seen.has(check.pair_index)||typeof check.same_event!=='boolean')throw new UserError('Invalid ST verification IDs');seen.add(check.pair_index);
  const pair=pairs[check.pair_index];
  if(check.same_event&&typeof check.candidate_quote==='string'&&typeof check.st_quote==='string'&&check.candidate_quote.trim().length>=4&&check.st_quote.trim().length>=4&&pair.candidate.includes(check.candidate_quote)&&pair.reference.includes(check.st_quote))result.push({item_id:pair.item_id,st_id:pair.st_id});
 }
 if(seen.size!==pairs.length)throw new UserError('Incomplete ST verification');return result;
}
