export const ACCESS_MODULES={medicine:'Medicine searches',health:'Health tools',pets:'Meds & pets'} as const;
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
  if(p.monthlyLimit!==null&&(!Number.isInteger(p.monthlyLimit)||p.monthlyLimit<1||p.monthlyLimit>100000))return null;
  if(p.expiresAt!==null&&(typeof p.expiresAt!=='string'||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=now||Date.parse(p.expiresAt)>now+3660*86400000))return null;
  permissions.push({module:p.module,monthlyLimit:p.monthlyLimit,expiresAt:p.expiresAt===null?null:new Date(p.expiresAt).toISOString()});
 }
 return {mode:'custom',permissions};
}
// Classify the actual server operation. A client-supplied module field is ignored.
export async function operationModule(req:Request,grantMode?:string):Promise<AccessModule>{
 const path=new URL(req.url).pathname;
 if(path==='/api/ai-search'||path==='/api/triage')return 'health';
 if(['/api/openai/pets','/api/openai/pet-generics','/api/openai/veterinary-information'].includes(path))return 'pets';
 if(path==='/api/membership/search'){
  const body=await req.clone().json().catch(()=>null);
  return ['pets','pet-generic'].includes(body?.mode)?'pets':'medicine';
 }
 return ['pets','pet-generic'].includes(grantMode||'')?'pets':'medicine';
}
