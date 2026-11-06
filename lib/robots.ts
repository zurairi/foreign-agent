export function robotsAllows(raw:string,url:string,agent='foreignagenthackathon'){
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let current={agents:[] as string[],rules:[] as {allow:boolean;path:string}[]};
 for(const line of raw.split(/\r?\n/)){const match=line.replace(/#.*$/,'').trim().match(/^([\w-]+)\s*:\s*(.*)$/);if(!match)continue;const key=match[1].toLowerCase(),value=match[2].trim();
  if(key==='user-agent'){if(current.rules.length){groups.push(current);current={agents:[],rules:[]};}current.agents.push(value.toLowerCase());}
  else if((key==='allow'||key==='disallow')&&current.agents.length&&value)current.rules.push({allow:key==='allow',path:value});
 }groups.push(current);
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.includes(a)));
 const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const path=new URL(url).pathname+new URL(url).search;let best=-1,allowed=true;
 for(const rule of selected.flatMap(g=>g.rules)){const terminal=rule.path.endsWith('$');const pattern=(terminal?rule.path.slice(0,-1):rule.path).split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');if(!new RegExp('^'+pattern+(terminal?'$':'')).test(path))continue;const length=rule.path.replace(/[*$]/g,'').length;if(length>best||(length===best&&rule.allow)){best=length;allowed=rule.allow;}}
 return allowed;
}
