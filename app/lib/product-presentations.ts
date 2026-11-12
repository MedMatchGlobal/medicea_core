type Presentation={name:string;country:string;sources:string[];generic:boolean;supplier?:unknown;product_identifier?:unknown};
const norm=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const plain=(s:unknown,max:number):s is string=>typeof s==='string'&&!!s.trim()&&s.length<=max&&!/[<>\r\n]/.test(s);
export function supplierOf(p:Pick<Presentation,'supplier'>|null|undefined):string|undefined{
 return plain(p?.supplier,160)?p!.supplier.trim():undefined;
}
export function productIdentifierOf(p:Pick<Presentation,'product_identifier'>|null|undefined):{system:string;value:string}|undefined{
 const id=p?.product_identifier as any;
 if(!id||!plain(id.system,80)||!plain(id.value,100)||/\b(?:VMP|VMPP|VTM|ATC|BNF)\b/i.test(id.system))return undefined;
 return {system:id.system.trim(),value:id.value.trim()};
}
export function presentationQuery(p:Presentation,brandFor:(name:string)=>string){
 const brand=brandFor(p.name),supplier=supplierOf(p);
 // Still no desired strength, formulation or origin is sent to verification.
 return supplier?`${brand} (${supplier})`:brand;
}
export function catalogueSupplierAgrees(p:Presentation,supplier?:string){
 return !supplier||norm(supplierOf(p)||'')===norm(supplier);
}
export function deduplicatePresentations<T extends Presentation>(products:T[],compositionFor:(p:T)=>string,brandFor:(name:string)=>string):T[]{
 const brand=(p:T)=>norm(brandFor(p.name)).replace(/[^\p{L}\p{N}]/gu,'');
 const supplier=(p:T)=>norm(supplierOf(p)||'');
 const id=(p:T)=>{const value=productIdentifierOf(p);return value?norm(value.system)+'|'+norm(value.value):'';};
 // Numeric formatting is not a different presentation. The clinical acceptance
 // gate has already compared the ingredients, dose units, form and release.
 const composition=(p:T)=>compositionFor(p).replace(/\d+(?:\.\d+)?/g,n=>String(Number(n)));
 const out:T[]=[];
 for(const p of products){
  const index=out.findIndex(q=>norm(p.country)===norm(q.country)&&composition(p)===composition(q)&&
   ((id(p)&&id(p)===id(q)&&supplier(p)===supplier(q))||
    (brand(p)===brand(q)&&supplier(p)===supplier(q)&&(!id(p)||!id(q)||id(p)===id(q)))));
  if(index<0){out.push({...p,sources:[...p.sources]});continue;}
  const old=out[index];
  // Keep an actual branded name when the same identified product also appeared
  // under its generic name. Never copy supplier metadata onto an unrelated row.
  const preferred=old.generic&&!p.generic?p:old;
  out[index]={...preferred,supplier:supplierOf(preferred)||supplierOf(old)||supplierOf(p),product_identifier:productIdentifierOf(preferred)||productIdentifierOf(old)||productIdentifierOf(p),sources:[...new Set([...old.sources,...p.sources])]};
 }
 // A generic group is not an extra supplier product when concrete presentations
 // of that same group are already shown. Keep it when no such rows were found.
 return out.filter(p=>!(p.generic&&!supplierOf(p)&&!productIdentifierOf(p)&&out.some(q=>q!==p&&brand(q)===brand(p)&&composition(q)===composition(p)&&(supplierOf(q)||productIdentifierOf(q)))));
}
