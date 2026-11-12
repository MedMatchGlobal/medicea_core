// Declared ingredients only; this is not a bioequivalence or suitability check.
export type ExcipientItem={name:string;amount?:string};
export type ExcipientEvidence={productName:string;status:'complete'|'partial'|'unknown';items:ExcipientItem[];sources:string[];documentDate?:string};
export type ExcipientComparison={version:1;checkedAt:string;status:'listed_match'|'different'|'incomplete';origin:ExcipientEvidence;candidate:ExcipientEvidence;originOnly:string[];candidateOnly:string[];amountDifferences:string[];amounts:'match'|'different'|'unknown'};
type Product={name:string;sources?:unknown;excipientEvidence?:unknown};
const key=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const text=(v:unknown,max=180):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max&&!/[<>\r\n]/.test(v);
const amountKey=(s:string)=>key(s).replace(/\d+(?:\.\d+)?/g,n=>String(Number(n))).replace(/\bper\b/g,'/').replace(/\s+/g,'');
function https(v:unknown):string|null {
 try{if(!text(v,2048))return null;const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}
}
function date(v:unknown):string|undefined {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return;
 const parsed=Date.parse(v+'T00:00:00Z');
 return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===v&&v<=new Date().toISOString().slice(0,10)?v:undefined;
}
export function excipientEvidenceFor(p:Product):ExcipientEvidence {
 const unknown:ExcipientEvidence={productName:p.name,status:'unknown',items:[],sources:[]},raw=p.excipientEvidence as any;
 if(!raw||!text(raw.productName,250)||key(raw.productName)!==key(p.name)||!['complete','partial'].includes(raw.status))return unknown;
 const allowed=new Set(Array.isArray(p.sources)?p.sources.map(https).filter(Boolean):[]);
 if(!Array.isArray(raw.sources)||!raw.sources.length||raw.sources.length>12)return unknown;
 const sources=raw.sources.map(https);
 if(sources.some((s:string|null)=>!s||!allowed.has(s)))return unknown;
 if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>100)return unknown;
 let partial=false;const items:ExcipientItem[]=[];
 for(const item of raw.items){
  if(!item||!text(item.name)){partial=true;continue;}
  const row:ExcipientItem={name:item.name.trim()};
  if(item.amount!=null){if(text(item.amount,100)&&/^\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|mmol|%)(?:\s*(?:per|\/)\s*(?:\d+(?:\.\d+)?\s*)?(?:tablet|capsule|sachet|dose|ml|g))?$/i.test(item.amount.trim()))row.amount=item.amount.trim();else partial=true;}
  const existing=items.find(i=>key(i.name)===key(row.name));
  if(existing){if(amountKey(existing.amount||'')!==amountKey(row.amount||''))partial=true;continue;}
  items.push(row);
 }
 if(!items.length)return unknown;
 const documentDate=date(raw.documentDate);
 return {productName:p.name,status:partial?'partial':raw.status,items,sources:[...new Set(sources)] as string[],...(documentDate?{documentDate}:{})};
}
export function compareExcipients(origin:Product,candidate:Product,checkedAt=new Date().toISOString()):ExcipientComparison {
 const a=excipientEvidenceFor(origin),b=excipientEvidenceFor(candidate);
 const left=new Map(a.items.map(i=>[key(i.name),i])),right=new Map(b.items.map(i=>[key(i.name),i]));
 const originOnly=a.items.filter(i=>!right.has(key(i.name))).map(i=>i.name),candidateOnly=b.items.filter(i=>!left.has(key(i.name))).map(i=>i.name);
 const amountDifferences=a.items.filter(i=>i.amount&&right.get(key(i.name))?.amount&&amountKey(i.amount)!==amountKey(right.get(key(i.name))!.amount!)).map(i=>i.name);
 const complete=a.status==='complete'&&b.status==='complete',sameNames=!originOnly.length&&!candidateOnly.length;
 const amounts=amountDifferences.length?'different':complete&&sameNames&&a.items.every(i=>i.amount&&right.get(key(i.name))?.amount)?'match':'unknown';
 return {version:1,checkedAt,status:!complete?'incomplete':sameNames&&!amountDifferences.length?'listed_match':'different',origin:a,candidate:b,originOnly,candidateOnly,amountDifferences,amounts};
}
export function rankExcipientComparisons<T extends {excipientComparison:ExcipientComparison}>(rows:T[]):T[] {
 const rank={listed_match:0,different:1,incomplete:2};
 return [...rows].sort((a,b)=>rank[a.excipientComparison.status]-rank[b.excipientComparison.status]||
  [b.excipientComparison.origin,b.excipientComparison.candidate].filter(e=>e.status==='complete').length-[a.excipientComparison.origin,a.excipientComparison.candidate].filter(e=>e.status==='complete').length||
  (b.excipientComparison.candidate.documentDate||'').localeCompare(a.excipientComparison.candidate.documentDate||''));
}
// A duplicate must not hide conflicting excipient declarations.
export function mergeExcipientEvidence(preferred:Product,other:Product):ExcipientEvidence {
 const a=excipientEvidenceFor(preferred),b=excipientEvidenceFor(other);
 if(a.status==='unknown')return {...b,productName:preferred.name};
 if(b.status==='unknown')return a;
 const fingerprint=(e:ExcipientEvidence)=>e.items.map(i=>key(i.name)+'|'+amountKey(i.amount||'')).sort().join(';');
 const same=fingerprint(a)===fingerprint(b),items=same?a.items:[...a.items,...b.items.filter(i=>!a.items.some(j=>key(i.name)===key(j.name)))];
 return {...a,status:same&&a.status==='complete'&&b.status==='complete'?'complete':'partial',items,sources:[...new Set([...a.sources,...b.sources])],documentDate:[a.documentDate,b.documentDate].filter(Boolean).sort().at(-1)};
}
// Restore bounded evidence, recomputing conclusions instead of trusting flags.
export function restoreExcipientComparison(value:unknown):ExcipientComparison|undefined {
 const v=value as any;
 if(v?.version!==1||!text(v.checkedAt,40)||!Number.isFinite(Date.parse(v.checkedAt))||Date.parse(v.checkedAt)>Date.now())return;
 const product=(e:any):Product=>({name:text(e?.productName,250)?e.productName:'Unknown product',sources:e?.sources,excipientEvidence:e});
 return compareExcipients(product(v.origin),product(v.candidate),v.checkedAt);
}
