import {env} from 'cloudflare:workers';
import {ownerCanWrite} from '../../lib/access';
import {getState,scheduledCheck,setScheduleStatus} from '../../lib/newsroom';
export const dynamic='force-dynamic';
const tools=[
 {name:'run_scheduled_check',description:'Refresh Foreign Agent news, mark stories matched to current ST Asia coverage with their reference links, and save up to five concise bullet summaries. Owner-only. Idempotent for each daily Singapore slot (09:00, 12:00, 15:00, 18:00); manual Run check stays independent.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'get_monitoring_status',description:'Read latest saved collection and analysis status for verification.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'set_schedule_status',description:'Record whether the linked four-times-daily schedule is enabled. Use only after creating, enabling or pausing the actual cloud schedule.',inputSchema:{type:'object',properties:{enabled:{type:'boolean'}},required:['enabled'],additionalProperties:false}}
];
export async function POST(request:Request){
 let rpc:{id?:unknown;method?:string;params?:{name?:string;arguments?:Record<string,unknown>}};
 try{const text=await request.text();if(text.length>50000)throw new Error();rpc=JSON.parse(text);}catch{return Response.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid request'}},{status:400});}
 const reply=(result:unknown)=>Response.json({jsonrpc:'2.0',id:rpc.id??null,result},{headers:{'Cache-Control':'no-store'}});
 if(rpc.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(rpc.method==='initialize')return reply({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'foreign-agent',version:'2.0.0'}});
 if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
 if(rpc.method==='tools/list')return reply({tools});
 if(rpc.method!=='tools/call')return Response.json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32601,message:'Method not found'}});
 if(!ownerCanWrite(request.headers.get('oai-authenticated-user-email'),(env as unknown as {OWNER_EMAIL?:string}).OWNER_EMAIL))return reply({isError:true,content:[{type:'text',text:'Only the Site owner can use monitoring tools.'}]});
 try{
  let result:unknown;
  const args=rpc.params?.arguments||{};
  if(rpc.params?.name==='run_scheduled_check'){if(Object.keys(args).length)throw new Error('No arguments expected');result=await scheduledCheck();}
  else if(rpc.params?.name==='get_monitoring_status'){const state=await getState();result={run_id:state.latest_run?.run_id,item_count:state.latest_run?.items.length,window_start:state.latest_run?.window_start,window_end:state.latest_run?.window_end,ended_at:state.latest_run?.ended_at,st_status:state.latest_run?.st_coverage?.status,st_matched:state.latest_run?.st_coverage?.matches.length,analysis_error:state.latest_run?.analysis_error||null,analysis_run_id:state.analysis?.run_id,saved_for_latest_run:state.analysis?.run_id===state.latest_run?.run_id,cards:state.analysis?.run_id===state.latest_run?.run_id?state.analysis.cards.length:0,schedule:state.schedule_status};}
  else if(rpc.params?.name==='set_schedule_status'){if(typeof args.enabled!=='boolean'||Object.keys(args).length!==1)throw new Error('Expected enabled boolean');result=await setScheduleStatus(args.enabled);}
  else throw new Error('Unknown tool');
  return reply({content:[{type:'text',text:JSON.stringify(result)}]});
 }catch(e){return reply({isError:true,content:[{type:'text',text:e instanceof Error?e.message:'Check failed; previous results retained.'}]});}
}
