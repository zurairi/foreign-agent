export const WINDOW_MS=3*60*60*1000;
export function recentItems<T extends {published_at:string|null}>(items:T[],asOf:string){
 const end=Date.parse(asOf);return items.filter(item=>{const date=item.published_at?Date.parse(item.published_at):NaN;return Number.isFinite(date)&&date>=end-WINDOW_MS&&date<=end;}).sort((a,b)=>Date.parse(b.published_at!)-Date.parse(a.published_at!));
}
