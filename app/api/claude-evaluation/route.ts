import {claudePreviewEnabled,withClaudeEvaluation} from '@/app/lib/claude-preview';
import {NextRequest} from 'next/server';
export const maxDuration=120;
export const dynamic='force-dynamic';
// No arbitrary prompts, URLs, records, headers or selection tokens are accepted.
// This page exercises the actual handlers with these public fixtures only.
const medicine={drugName:'Co-codamol 30/500 tablets',originCountry:'United Kingdom',targetCountry:'Italy',lang:'en'};
const fixtures:Record<string,{path:string;body:unknown}>={
 origin:{path:'equivalent-search',body:{...medicine,drugName:'Co-codamol'}},
 leaflet:{path:'leaflet',body:medicine},
 translatedLeaflet:{path:'leaflet',body:{...medicine,lang:'it'}},
 information:{path:'information',body:medicine},
 generics:{path:'generics',body:{drugName:'Panadol',originCountry:'United Kingdom',drugDosage:'500 mg',lang:'en'}},
 pets:{path:'pets',body:{drugName:'Metacam oral suspension for dogs',originCountry:'United Kingdom',targetCountry:'Italy',drugDosage:'1.5 mg/ml',lang:'en'}},
 petGenerics:{path:'pet-generics',body:{drugName:'Metacam oral suspension for dogs',originCountry:'United Kingdom',drugDosage:'1.5 mg/ml',lang:'en'}},
 veterinary:{path:'veterinary-information',body:{drugName:'Metacam oral suspension for dogs',originCountry:'United Kingdom',lang:'en'}},
 condition:{path:'condition',body:{selectedCondition:'Hay fever',originCountry:'United Kingdom',lang:'en'}},
 triage:{path:'triage',body:{messages:[{role:'system',content:'You are an educational symptom triage assistant. This is a fictional integration test, not a real patient. Do not diagnose or prescribe.'},{role:'user',content:'Fictional adult with a mild runny nose. Explain general next steps and when to seek help.'}]}},
 translation:{path:'translate',body:{text:'Public integration test: medicine information',target:'Italian'}},
 jsonTranslation:{path:'translate-json',body:{data:{label:'Medicine information'},lang:'it'}},
};
function redact(value:any):any{
 if(Array.isArray(value))return value.map(redact);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['token','selection_token','originSelection','searchAccess'].includes(key)).map(([key,v])=>[key,redact(v)]));
 return value;
}
export async function POST(req:Request){
 if(!claudePreviewEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 const body=await req.json().catch(()=>null),fixture=body&&Object.keys(body).length===1&&typeof body.fixture==='string'?fixtures[body.fixture]:null;
 if(!fixture)return Response.json({error:'INVALID_FIXTURE'},{status:400});
 const handlers={
  'equivalent-search':()=>import('@/app/api/openai/equivalent-search/route'),leaflet:()=>import('@/app/api/openai/leaflet/route'),information:()=>import('@/app/api/openai/route'),generics:()=>import('@/app/api/openai/generics/route'),pets:()=>import('@/app/api/openai/pets/route'),'pet-generics':()=>import('@/app/api/openai/pet-generics/route'),'veterinary-information':()=>import('@/app/api/openai/veterinary-information/route'),condition:()=>import('@/app/api/ai-search/route'),triage:()=>import('@/app/api/triage/route'),translate:()=>import('@/app/api/translate/route'),'translate-json':()=>import('@/app/api/translate-json/route'),
 };
 const start=Date.now();
 try{
  const {value,calls}=await withClaudeEvaluation(async()=>{
   const handler=await handlers[fixture.path as keyof typeof handlers]();
   const result=await handler.POST(new NextRequest(new URL('/api/fixture',req.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixture.body)}));
   const text=await result.text();let data;try{data=JSON.parse(text);}catch{data=text;}
   return {status:result.status,data:redact(data)};
  });
  return Response.json({fixture:body.fixture,ms:Date.now()-start,...value,calls},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'EVALUATION_FAILED',ms:Date.now()-start},{status:503});}
}
