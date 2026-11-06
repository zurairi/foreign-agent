export const cleanText=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>{const code=Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/\s+/g,' ').trim();
export function publicationDate(value:string){const raw=cleanText(value);const explicit=/(?:Z|[+-]\d{2}:?\d{2})$|\bGMT\b|\bUTC\b/i.test(raw);const parsed=explicit?Date.parse(raw):NaN;return {published_at:Number.isFinite(parsed)?new Date(parsed).toISOString():null,published_at_text:raw||null};}
export function articleMetadata(raw:string){
 const meta:Record<string,string>={};
 for(const tag of raw.match(/<meta\b[^>]*>/gi)||[]){const attrs:Record<string,string>={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=match[2]??match[3];const key=attrs.property||attrs.name||attrs.itemprop;if(key&&attrs.content)meta[key.toLowerCase()]=attrs.content;}
 let article:Record<string,unknown>={};
 for(const match of raw.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const data=JSON.parse(match[1]);const queue=Array.isArray(data)?[...data]:[data];while(queue.length){const obj=queue.shift();if(!obj||typeof obj!=='object')continue;if(Array.isArray(obj['@graph']))queue.push(...obj['@graph']);if(/Article|NewsArticle|ReportageNewsArticle/.test(String(obj['@type']))){article=obj;break;}}}catch{}}
 const text=(v:unknown)=>typeof v==='string'?cleanText(v):'';
 const title=text(meta['og:title']||meta['twitter:title']||article.headline);
 const excerpt=text(meta['og:description']||meta.description||meta['twitter:description']||article.description).slice(0,700);
 const date=text(meta['article:published_time']||meta.datepublished||meta.pubdate||meta['date']||article.datePublished);
 return {title,excerpt,...publicationDate(date)};
}
export function sitemapLinks(raw:string,origin:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(raw))return [];
 return [...raw.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)].map(m=>cleanText(m[1].replace(/<!\[CDATA\[|\]\]>/g,''))).filter(value=>{try{return new URL(value).origin===origin&&new URL(value).protocol==='https:';}catch{return false;}}).slice(0,150);
}
