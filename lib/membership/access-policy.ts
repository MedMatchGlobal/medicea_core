export const ACCESS_MODULES={medicine:'Medicine searches',health:'Health tools',portal:'Patient portal'} as const;
export type AccessModule=keyof typeof ACCESS_MODULES;
export type ModulePermission={module:AccessModule;monthlyLimit:number|null;expiresAt:string|null};
export type AccessPolicy={mode:'full'|'custom';permissions:ModulePermission[]};
export function isAccessModule(value:unknown):value is AccessModule{return typeof value==='string'&&Object.hasOwn(ACCESS_MODULES,value);}
export function parseAccessPolicy(value:any,now=Date.now()):AccessPolicy|null{
 if(!value||value.mode==='full')return value?.mode==='full'?{mode:'full',permissions:[]}:null;
 if(value.mode!=='custom'||!Array.isArray(value.permissions)||!value.permissions.length||value.permissions.length>3)return null;
 const seen=new Set<string>(),permissions:ModulePermission[]=[];
 for(const p of value.permissions){
  if(!p||!isAccessModule(p.module)||seen.has(p.module))return null;seen.add(p.module);
  if(p.module==='portal'&&p.monthlyLimit!==null)return null;
  if(p.monthlyLimit!==null&&(!Number.isInteger(p.monthlyLimit)||p.monthlyLimit<1||p.monthlyLimit>100000))return null;
  if(p.expiresAt!==null&&(typeof p.expiresAt!=='string'||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=now||Date.parse(p.expiresAt)>now+3660*86400000))return null;
  permissions.push({module:p.module,monthlyLimit:p.monthlyLimit,expiresAt:p.expiresAt===null?null:new Date(p.expiresAt).toISOString()});
 }
 return {mode:'custom',permissions};
}
// Classify the actual server operation; human and veterinary features share one admin allowance.
// The clinical tools remain separate. Portal access never authorises AI generation.
export async function operationModule(req:Request,_grantMode?:string):Promise<'medicine'|'health'>{
 const path=new URL(req.url).pathname;
 return path==='/api/ai-search'||path==='/api/triage'?'health':'medicine';
}
