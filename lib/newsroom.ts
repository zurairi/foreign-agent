import { validateAnalysis, UserError, type Card } from './contracts';
export { UserError } from './contracts';
import { env } from 'cloudflare:workers';
import { PROMPT } from './analysis-prompt';

type Row = { body: string };
type Source = {country:string;source_name:string;url:string;website:string};
export type Item = {item_id:string;country:string;source_name:string;source_type:string;language:string;title:string;url:string;published_at:string|null;published_at_text?:string|null;publication_note?:string;fetched_at:string;excerpt:string;collection_mode:string;collection_warning?:string};

type SourceResult = Source & {status:string;item_count:number;collection_mode?:string;warning?:string|null;error?:string};
type Run = {run_id:string;started_at:string;ended_at:string;items:Item[];sources:SourceResult[];status:string;input_hash:string;analysis_mode:string;analysed_at:string|null;delivery_status:string;analysis_error?:string};
type Analysis = {run_id:string;input_hash:string;cards:Card[];analysed_at:string;analysis_mode:string;collection_mode:string};

export const SOURCES:Source[]=[{country:'Malaysia',source_name:'Malay Mail',url:'https://www.malaymail.com/feed/rss/malaysia',website:'https://www.malaymail.com/news/malaysia'},{country:'China',source_name:'Global Times',url:'https://www.globaltimes.cn/rss/outbrain.xml',website:'https://www.globaltimes.cn/'}];

const now=()=>new Date().toISOString();
const db=()=>{if(!env.DB)throw new UserError('Hosted storage is unavailable. Please try again later.');return env.DB;};
const decode=(s:string)=>s.replace(/&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos|nbsp|mdash|ndash|rsquo|lsquo|ldquo|rdquo|hellip);/gi,(m,n,x)=>{if(n||x){const cp=parseInt(n||x,x?16:10);return cp<=0x10ffff&&cp>0?String.fromCodePoint(cp):'';}return ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&mdash;':'—','&ndash;':'–','&rsquo;':'’','&lsquo;':'‘','&ldquo;':'“','&rdquo;':'”','&hellip;':'…'} as Record<string,string>)[m.toLowerCase()]||m;});
const clean=(s:string)=>decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const tag=(s:string,name:string)=>s.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const id=async(s:Source,url:string)=>(await hash(s.source_name+'\n'+url)).slice(0,24);
async function inputHash(items:Item[]){return hash(JSON.stringify(items.map(({fetched_at,...rest})=>rest).sort((a,b)=>a.item_id.localeCompare(b.item_id))));}
async function retrieve(url:string){
 const response=await fetch(url,{headers:{'User-Agent':'ForeignAgentHackathon/0.1 (small newsroom pilot)','Accept':'application/rss+xml,application/xml,text/xml,text/html'},signal:AbortSignal.timeout(12000),redirect:'follow'});
 if(!response.ok)throw new UserError(`HTTP ${response.status}`);
 if(!['www.globaltimes.cn','www.malaymail.com','globaltimes.cn','malaymail.com'].includes(new URL(response.url||url).hostname))throw new UserError('Unexpected source redirect');
 const reader=response.body?.getReader();if(!reader)throw new UserError('Empty response');
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new UserError('Source exceeds collection size limit');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
export async function parseFeed(raw:string,s:Source):Promise<Item[]>{
 if(/<!DOCTYPE|<!ENTITY/i.test(raw)||!/<rss[\s>]/i.test(raw))throw new UserError('Unsupported feed format');
 const entries=[...raw.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,20);const seen=new Set<string>();const items:Item[]=[];
 for(const entry of entries){const title=clean(tag(entry[1],'title'));const url=clean(tag(entry[1],'link'));if(!title||!/^https?:\/\//i.test(url)||seen.has(url))continue;seen.add(url);
 const rawDate=clean(tag(entry[1],'pubDate'));const time=/GMT|[+-]\d{4}|UTC/i.test(rawDate)?Date.parse(rawDate):NaN;
 items.push({item_id:await id(s,url),country:s.country,source_name:s.source_name,source_type:'News reports',language:'en',title,url,published_at:Number.isFinite(time)?new Date(time).toISOString():null,fetched_at:now(),excerpt:clean(tag(entry[1],'description')).slice(0,700),collection_mode:'Live RSS'});}
 if(!items.length)throw new UserError('No usable RSS items');return items;
}
async function scrape(s:Source){
 const origin=new URL(s.website).origin;const robots=await retrieve(origin+'/robots.txt');
 // Conservatively honour every published nonempty Disallow path.
 const disallow=[...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gmi)].map(m=>m[1]);
 const permitted=(url:string)=>!disallow.some(p=>new URL(url).pathname.startsWith(p.replace(/\*.*$/,'')));
 if(!permitted(s.website))throw new UserError('Website collection disallowed by crawler rules');
 const raw=await retrieve(s.website);const links:{url:string;title:string}[]=[];let active:{url:string;title:string}|null=null;
 await new HTMLRewriter().on(s.country==='China'?'a[class*="new_title"]':'a[href*="/news/malaysia/"]',{
  element(el){active={url:new URL(el.getAttribute('href')||'',origin).href,title:''};const link=active;el.onEndTag(()=>{if(link.title.trim())links.push(link);active=null;});},
  text(t){if(active)active.title+=t.text;}
 }).transform(new Response(raw)).text();
 const pattern=s.country==='China'?/^https:\/\/www\.globaltimes\.cn\/page\/\d{6}\/\d+\.shtml$/:/^https:\/\/www\.malaymail\.com\/news\/malaysia\/\d{4}\/\d{2}\/\d{2}\/[^?#]+$/;
 const seen=new Set<string>();const items:Item[]=[];
 for(const link of links){if(!pattern.test(link.url)||seen.has(link.url)||!permitted(link.url)||/editorial/i.test(link.title)||link.title.startsWith('GT Voice:'))continue;seen.add(link.url);
 let excerpt='',published='';let articleWarning='';
 try{const detail=await retrieve(link.url);await new HTMLRewriter().on('meta[name="twitter:description"],meta[name="description"]',{element(el){if(!excerpt)excerpt=el.getAttribute('content')||'';}}).on('span.pub_time',{text(t){published+=t.text;}}).transform(new Response(detail)).text();}
 catch{articleWarning='Article could not be retrieved; homepage headline only.';}
 items.push({item_id:await id(s,link.url),country:s.country,source_name:s.source_name,source_type:'News reports',language:'en',title:clean(link.title),url:link.url,published_at:null,published_at_text:clean(published).replace(/^Published:\s*/, '')||null,publication_note:'Publisher time shown verbatim; timezone not stated. No UTC timestamp inferred.',fetched_at:now(),excerpt:clean(excerpt).slice(0,700),collection_mode:'Public website',...(articleWarning?{collection_warning:articleWarning}:{})});
 if(items.length>=8)break;}
 if(!items.length)throw new UserError('No usable public website headlines');return items;
}
async function sourceItems(s:Source){
 let items:Item[];try{items=await parseFeed(await retrieve(s.url),s);}catch{return scrape(s);}
 const latest=Math.max(...items.map(i=>i.published_at?Date.parse(i.published_at):0));
 if(Date.now()-latest>172800000){try{return await scrape(s);}catch{items=items.map(i=>({...i,collection_warning:'RSS is old; public website fallback failed. Original dates retained.'}));}}
 return items;
}
export async function withLease<T>(work:()=>Promise<T>){
 const token=crypto.randomUUID();const locked=await db().prepare('INSERT INTO leases(key,token,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET token=excluded.token,expires=excluded.expires WHERE expires<? RETURNING key').bind('check',token,Date.now()+240000,Date.now()).first();
 if(!locked)throw new UserError('Another check or import is running. Please wait.');
 try{return await work();}finally{await db().prepare('DELETE FROM leases WHERE key=? AND token=?').bind('check',token).run();}
}
async function latestRun(){const row=await db().prepare('SELECT body FROM runs ORDER BY seq DESC LIMIT 1').first<Row>();return row?JSON.parse(row.body) as Run:null;}
async function setting(){const r=await db().prepare('SELECT body FROM settings WHERE key=?').bind('runtime').first<Row>();return r?JSON.parse(r.body) as {enabled:boolean;status:string}:{enabled:false,status:'Not configured – manual analysis available'};}
async function setSetting(enabled:boolean,status:string){await db().prepare('INSERT OR REPLACE INTO settings(key,body) VALUES (?,?)').bind('runtime',JSON.stringify({enabled,status})).run();}
function apiKey(){return (env as unknown as {OPENAI_API_KEY?:string}).OPENAI_API_KEY||'';}
export async function getState(){
 const rows=await db().prepare('SELECT body FROM runs ORDER BY seq DESC LIMIT 100').all<Row>();const runs=rows.results.map(r=>JSON.parse(r.body) as Run);const latest=runs[0]||null;
 const arow=await db().prepare('SELECT a.body FROM analyses a JOIN runs r ON a.run_id=r.run_id ORDER BY r.seq DESC LIMIT 1').first<Row>();const analysis=arow?JSON.parse(arow.body) as Analysis:null;
 const erow=analysis?await db().prepare('SELECT body FROM runs WHERE run_id=?').bind(analysis.run_id).first<Row>():null;const config=await setting();
 return {latest_run:latest,analysis,analysis_items:erow?(JSON.parse(erow.body) as Run).items:[],stale:!!(analysis&&latest&&(analysis.run_id!==latest.run_id||analysis.input_hash!==latest.input_hash)),last_successful_run:runs.find(r=>r.status==='success')?.ended_at||null,configured_sources:SOURCES,runtime_ai:apiKey()?config.status:'Not configured – manual analysis available',ai_enabled:!!apiKey()&&config.enabled,run_count:runs.length};
}
export async function exportInputs(runId?:string){const row=runId?await db().prepare('SELECT body FROM runs WHERE run_id=?').bind(runId).first<Row>():null;const run=runId?(row?JSON.parse(row.body) as Run:null):await latestRun();if(!run)throw new UserError('Collect news before exporting inputs');
 return {schema_version:1,run_id:run.run_id,input_hash:run.input_hash,items:run.items,analysis_prompt:PROMPT,expected_output:{run_id:run.run_id,input_hash:run.input_hash,cards:[{source_item_ids:['stored item_id'],headline:'...',summary:'...',why_it_matters:'...',priority_band:'Watch',priority_reason:'Impact; audience relevance; freshness; novelty.',verification_flags:['Check the primary source.']}]}};
}

export async function importAnalysis(value:unknown,mode='Manually imported analysis'){
 const run=await latestRun();if(!run)throw new UserError('Collect news before importing analysis');const cards=validateAnalysis(value,run);
 const analysis:Analysis={run_id:run.run_id,input_hash:run.input_hash,cards,analysed_at:now(),analysis_mode:mode,collection_mode:[...new Set(run.items.map(i=>i.collection_mode))].join(' + ')};
 run.analysis_mode=mode;run.analysed_at=analysis.analysed_at;
 await db().batch([db().prepare('INSERT OR REPLACE INTO analyses(run_id,body) VALUES (?,?)').bind(run.run_id,JSON.stringify(analysis)),db().prepare('UPDATE runs SET body=? WHERE run_id=?').bind(JSON.stringify(run),run.run_id)]);return analysis;
}
async function responseText(instructions:string,input:string,limit=3500){
 const key=apiKey();if(!/^sk-[A-Za-z0-9_-]+$/.test(key))throw new UserError('Runtime API key is not configured for this hosted Site. Collection and manual analysis remain available.');
 let response:Response;try{response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',instructions,input,max_output_tokens:limit,store:false}),signal:AbortSignal.timeout(45000)});}catch{throw new UserError('OpenAI could not be reached. Use manual analysis or retry later.');}
 if(!response.ok){let code='';try{code=(await response.json() as {error?:{code?:string}}).error?.code||'';}catch{}throw new UserError(code==='credit_balance_exhausted'?'No active API credits for this key’s organisation. Check API billing.':`OpenAI returned HTTP ${response.status}. No analysis saved.`);}
 const body=await response.json() as {status:string;output:{content?:{type:string;text?:string}[]}[]};if(body.status!=='completed')throw new UserError('OpenAI analysis was incomplete; no results saved.');return body.output.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('');
}
export async function testAI(){try{if((await responseText('Reply with exactly OK.','Connection test',16)).trim()!=='OK')throw new UserError('Unexpected connection-test response');await setSetting(true,'Connected · gpt-4.1-mini');return {connected:true};}catch(e){await setSetting(false,e instanceof UserError?e.message:'Connection failed');throw e;}}
export async function runCheck(){
 const run:Run={run_id:crypto.randomUUID(),started_at:now(),ended_at:'',items:[],sources:[],status:'failed',input_hash:'',analysis_mode:'Pending manual analysis',analysed_at:null,delivery_status:'Preview only – nothing sent'};
 for(const s of SOURCES){try{const items=await sourceItems(s);run.items.push(...items);const website=items.some(i=>i.collection_mode==='Public website');const old=items.some(i=>i.collection_warning);run.sources.push({...s,status:'success',item_count:items.length,collection_mode:website?'Public website':'Live RSS',warning:website?'Public website fallback used. Publisher times have no stated timezone.':old?'RSS is old and website fallback failed. Inspect original dates.':null});}catch(e){run.sources.push({...s,status:'failed',item_count:0,error:e instanceof UserError?e.message:'Network unavailable or source timed out'});}}
 run.status=run.sources.every(s=>s.status==='success')?'success':run.items.length?'partial':'failed';run.ended_at=now();run.input_hash=await inputHash(run.items);
 await db().batch([...run.items.map(i=>db().prepare('INSERT OR REPLACE INTO items(item_id,body) VALUES (?,?)').bind(i.item_id,JSON.stringify(i))),db().prepare('INSERT INTO runs(run_id,body) VALUES (?,?)').bind(run.run_id,JSON.stringify(run))]);
 const config=await setting();if(config.enabled&&apiKey()&&run.items.length){try{const exported=await exportInputs(run.run_id);const text=await responseText(PROMPT+'\nReturn only JSON matching: '+JSON.stringify(exported.expected_output),JSON.stringify({run_id:run.run_id,input_hash:run.input_hash,items:run.items}));let output;try{output=JSON.parse(text);}catch{throw new UserError('OpenAI returned invalid JSON; no analysis saved.');}await importAnalysis(output,'Runtime OpenAI · gpt-4.1-mini');}catch(e){run.analysis_error=e instanceof UserError?e.message:'Runtime analysis failed; manual import remains available';run.analysis_mode='Runtime analysis failed';await db().prepare('UPDATE runs SET body=? WHERE run_id=?').bind(JSON.stringify(run),run.run_id).run();}}
 return run;
}
