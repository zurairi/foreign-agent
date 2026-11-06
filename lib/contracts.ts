export type Card = {source_item_ids:string[];headline:string;summary:string[];why_it_matters:string;priority_band:string;priority_reason:string;verification_flags:string[]};
export class UserError extends Error {}
const bands=['Important','Monitor','Good to know'];
export function validateAnalysis(value:unknown,run:{run_id:string;input_hash:string;items:{item_id:string;country:string}[]}):Card[]{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new UserError('Expected a JSON object');const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='cards,input_hash,run_id')throw new UserError('Expected run_id, input_hash and cards only');
 if(v.run_id!==run.run_id||v.input_hash!==run.input_hash)throw new UserError('Stale import: run or input fingerprint does not match the latest collection');
 if(!Array.isArray(v.cards)||v.cards.length>5)throw new UserError('Expected up to five cards');const ids=new Map(run.items.map(i=>[i.item_id,i]));const used=new Set<string>();
 for(const obj of v.cards){if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).sort().join(',')!=='headline,priority_band,priority_reason,source_item_ids,summary,verification_flags,why_it_matters')throw new UserError('Card fields do not match the expected format');const c=obj as Card;
 if(!Array.isArray(c.source_item_ids)||!c.source_item_ids.length||c.source_item_ids.some(id=>typeof id!=='string'||!ids.has(id))||new Set(c.source_item_ids).size!==c.source_item_ids.length)throw new UserError('Every card must reference unique, known source item IDs');
 if(c.source_item_ids.some(i=>used.has(i)))throw new UserError('A source item cannot appear in two cards');c.source_item_ids.forEach(i=>used.add(i));
 if(new Set(c.source_item_ids.map(i=>ids.get(i)!.country)).size!==1)throw new UserError('Cross-country grouping is not supported');
 for(const f of ['headline','why_it_matters','priority_reason'] as const)if(typeof c[f]!=='string'||!c[f].trim()||c[f].length>3000)throw new UserError(`${f} must contain 1–3000 characters`);
 if(!Array.isArray(c.summary)||c.summary.length<1||c.summary.length>3||c.summary.some(b=>typeof b!=='string'||!b.trim()||b.length>200))throw new UserError('Summary must contain 1–3 short bullet points, up to 200 characters each');
 if(!bands.includes(c.priority_band))throw new UserError('Unknown priority band');
 if(!Array.isArray(c.verification_flags)||c.verification_flags.length>15||c.verification_flags.some(f=>typeof f!=='string'||!f.trim()||f.length>1000))throw new UserError('Invalid verification flags');}
 return (v.cards as Card[]).sort((a,b)=>bands.indexOf(a.priority_band)-bands.indexOf(b.priority_band));
}

export function analysisFormat(itemIds:string[]){
 return {type:'json_schema',name:'editorial_shortlist',strict:true,schema:{type:'object',properties:{run_id:{type:'string'},input_hash:{type:'string'},cards:{type:'array',maxItems:5,items:{type:'object',properties:{source_item_ids:{type:'array',minItems:1,items:{type:'string',enum:itemIds}},headline:{type:'string',minLength:1,maxLength:180},summary:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:1,maxLength:200}},why_it_matters:{type:'string',minLength:1,maxLength:250},priority_band:{type:'string',enum:['Important','Monitor','Good to know']},priority_reason:{type:'string',minLength:1},verification_flags:{type:'array',items:{type:'string'}}},required:['source_item_ids','headline','summary','why_it_matters','priority_band','priority_reason','verification_flags'],additionalProperties:false}}},required:['run_id','input_hash','cards'],additionalProperties:false}};
}
