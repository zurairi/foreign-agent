import { getChatGPTUser } from '../../chatgpt-auth';
import { getState, exportInputs, importAnalysis, runCheck, testAI, UserError, withLease } from '../../../lib/newsroom';
export const dynamic = 'force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 if(!await getChatGPTUser())return json({error:'Sign in with ChatGPT to use this private dashboard.'},401);
 try{const path=new URL(request.url).pathname;if(path==='/api/state')return json(await getState());if(path==='/api/export')return json(await exportInputs());return json({error:'Not found'},404);}
 catch(e){return json({error:e instanceof UserError?e.message:'Hosted storage unavailable. Please retry later.'},e instanceof UserError?400:500);}
}
export async function POST(request:Request){
 if(!await getChatGPTUser())return json({error:'Sign in with ChatGPT to use this private dashboard.'},401);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Same-origin request required'},403);
 try{const path=new URL(request.url).pathname;if(path==='/api/collect')return json(await withLease(runCheck));if(path==='/api/ai/test')return json(await withLease(testAI));if(path==='/api/import'){const text=await request.text();if(text.length>1_000_000)throw new UserError('Import exceeds size limit');let value;try{value=JSON.parse(text);}catch{throw new UserError('Invalid JSON. Choose the analysed-results JSON file.');}return json(await withLease(()=>importAnalysis(value)));}return json({error:'Not found'},404);}
 catch(e){return json({error:e instanceof UserError?e.message:'Request failed. Previous results were retained; please retry.'},e instanceof UserError?400:500);}
}
