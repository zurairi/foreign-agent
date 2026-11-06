import { UserError } from './contracts';
import type { Item } from './newsroom';
export type Source = {country:string;source_name:string;url:string;website:string;language:string;scrape?:boolean};
export const SOURCES:Source[] = [
{"country": "Malaysia", "source_name": "Malay Mail", "url": "https://www.malaymail.com/feed/rss/malaysia", "website": "https://www.malaymail.com/news/malaysia", "language": "en", "scrape": true},
{"country": "Malaysia", "source_name": "Sinar Harian", "url": "https://www.sinarharian.com.my/rssFeed/211/50", "website": "https://www.sinarharian.com.my/", "language": "ms", "scrape": true},
{"country": "Malaysia", "source_name": "Utusan", "url": "https://www.utusan.com.my/nasional/feed/", "website": "https://www.utusan.com.my/nasional/", "language": "ms", "scrape": true},
{"country": "Malaysia", "source_name": "Free Malaysia Today", "url": "https://www.freemalaysiatoday.com/feeds/rss/nation", "website": "https://www.freemalaysiatoday.com/", "language": "en", "scrape": true},
{"country": "Malaysia", "source_name": "Malaysiakini", "url": "https://www.malaysiakini.com/rss/en/news.rss", "website": "https://www.malaysiakini.com/", "language": "en", "scrape": true},
{"country": "Malaysia", "source_name": "Astro Awani", "url": "https://www.astroawani.com/rss/national/en/public", "website": "https://www.astroawani.com/", "language": "ms", "scrape": true},
{"country": "Malaysia", "source_name": "Bernama", "url": "https://www.bernama.com/en/rssfeed.php", "website": "https://www.bernama.com/", "language": "en", "scrape": true},
{"country": "Malaysia", "source_name": "Google News", "url": "https://news.google.com/rss/headlines/section/geo/Malaysia?hl=en-MY&gl=MY&ceid=MY:en", "website": "https://news.google.com/headlines/section/geo/Malaysia?hl=en-MY&gl=MY&ceid=MY:en", "language": "en", "scrape": true},
{"country": "China", "source_name": "China News Service", "url": "https://www.chinanews.com.cn/rss/china.xml", "website": "https://www.chinanews.com.cn/", "language": "zh", "scrape": true},
{"country": "China", "source_name": "Global Times", "url": "https://www.globaltimes.cn/rss/outbrain.xml", "website": "https://www.globaltimes.cn/", "language": "en", "scrape": true},
{"country": "China", "source_name": "Baidu News", "url": "https://rsshub.app/baidu/top", "website": "https://news.baidu.com/", "language": "zh", "scrape": true},
{"country": "China", "source_name": "Phoenix", "url": "https://news.ifeng.com/rss/index.xml", "website": "https://news.ifeng.com/", "language": "zh", "scrape": true},
{"country": "China", "source_name": "China Digital Times", "url": "https://chinadigitaltimes.net/feed/", "website": "https://chinadigitaltimes.net/", "language": "en", "scrape": true},
{"country": "China", "source_name": "NPC Observer", "url": "https://npcobserver.com/feed/", "website": "https://npcobserver.com/", "language": "en", "scrape": true}
];
const now=()=>new Date().toISOString();
const decode=(s:string)=>s.replace(/&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos|nbsp|mdash|ndash|rsquo|lsquo|ldquo|rdquo|hellip);/gi,(m,n,x)=>{if(n||x){const cp=parseInt(n||x,x?16:10);return cp<=0x10ffff&&cp>0?String.fromCodePoint(cp):'';}return ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&mdash;':'—','&ndash;':'–','&rsquo;':'’','&lsquo;':'‘','&ldquo;':'“','&rdquo;':'”','&hellip;':'…'} as Record<string,string>)[m.toLowerCase()]||m;});
const clean=(s:string)=>decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const tag=(s:string,name:string)=>s.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const id=async(s:Source,url:string)=>(await hash(s.source_name+'\n'+url)).slice(0,24);
export async function parseFeed(raw:string,s:Source,limit=8):Promise<Item[]>{
 if(/<!DOCTYPE|<!ENTITY/i.test(raw)||!/<rss[\s>]/i.test(raw))throw new UserError('Unsupported feed format');
 const entries=[...raw.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,limit);const seen=new Set<string>();const items:Item[]=[];
 for(const entry of entries){const title=clean(tag(entry[1],'title'));const url=clean(tag(entry[1],'link'));if(!title||!/^https?:\/\//i.test(url)||seen.has(url))continue;seen.add(url);
 const rawDate=clean(tag(entry[1],'pubDate')||tag(entry[1],'dc:date'));const time=/GMT|[+-]\d{4}|UTC|Z$|[+-]\d{2}:\d{2}$/i.test(rawDate)?Date.parse(rawDate):NaN;
 items.push({item_id:await id(s,url),country:s.country,source_name:s.source_name,source_type:'News reports',language:s.language,title,url,published_at:Number.isFinite(time)?new Date(time).toISOString():null,published_at_text:rawDate||null,fetched_at:now(),excerpt:clean(tag(entry[1],'description')).slice(0,700),collection_mode:'Live RSS'});}
 if(!items.length)throw new UserError('No usable RSS items');return items;
}
