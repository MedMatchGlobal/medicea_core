export function medicineSources(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 const urls=value.slice(0,10).flatMap(item=>{try{if(typeof item!=='string'||item.length>2048)return [];const url=new URL(item);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?[url.href]:[];}catch{return [];}});
 return [...new Set(urls)];
}
