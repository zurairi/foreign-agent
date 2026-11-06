export const CHECK_HOURS=[9,12,15,18];
export function singaporeSlot(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const hour=Number(part('hour'));const slot=CHECK_HOURS.filter(h=>h<=hour).at(-1);
 if(slot===undefined)return null;
 return `${part('year')}-${part('month')}-${part('day')}T${String(slot).padStart(2,'0')}:00+08:00`;
}
