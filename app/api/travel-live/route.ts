import {NextResponse} from 'next/server';
import {travelPreviewEnabled,DEMO_COUNTRIES,countryName} from '../../lib/travel-demo';
import {connectedTravelEnabled} from '../../lib/travel-connected';
import {travelTestConfigured,travelTestSession,correctTravelTestCode,issueTravelTestSession,TRAVEL_TEST_COOKIE} from '../../lib/travel-test-session';
import {getOpenAIKeyCount,modelUpgradeEnabled} from '../../lib/openaiClient';
import {issueOriginSelection,readOriginSelection,type OriginProduct} from '../../lib/origin-lookup';
import {originalTravelOrigin,originalTravelCompare,originalTravelInformation} from '../../lib/travel-original-search';
export const dynamic='force-dynamic';
export const maxDuration=120;
const headers={'Cache-Control':'no-store'};
function missing(){return [...(!connectedTravelEnabled()?['MEDICEA_TRAVEL_CONNECTED']:[]),...(!travelTestConfigured()?['MEDICEA_TRAVEL_TEST_ACCESS_CODE (24+ characters)']:[]),...(!modelUpgradeEnabled()?['MEDICEA_OPENAI_UPGRADE']:[]),...(!getOpenAIKeyCount()?['OPENAI_API_KEY']:[])];}
let loginWindow=0,loginAttempts=0,requestWindow=0,requestCount=0;
const sessionCounts=new Map<string,number>();
let evaluationWindow=0,evaluationCount=0;
function evaluationLimit(){const window=Math.floor(Date.now()/3600000);if(window!==evaluationWindow){evaluationWindow=window;evaluationCount=0;}return ++evaluationCount<=18;}
function limit(login:boolean,request:Request){const now=Math.floor(Date.now()/(login?600000:3600000));if(login){if(now!==loginWindow){loginWindow=now;loginAttempts=0;}return ++loginAttempts<=12;}if(now!==requestWindow){requestWindow=now;requestCount=0;sessionCounts.clear();}const key=request.headers.get('cookie')?.split(';').find(v=>v.trim().startsWith(TRAVEL_TEST_COOKIE+'='))||'';const count=(sessionCounts.get(key)||0)+1;sessionCounts.set(key,count);return ++requestCount<=80&&count<=40;}
function cookie(value:string,maxAge:number){return `${TRAVEL_TEST_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api/travel-live; Max-Age=${maxAge}${process.env.VERCEL_ENV?'; Secure':''}`;}
export async function GET(request:Request){
 if(!travelPreviewEnabled())return new NextResponse(null,{status:404});
 const setup=missing();return NextResponse.json({ready:!setup.length,missing:setup,authenticated:!setup.length&&travelTestSession(request),mode:'public-medicine-test'},{headers});
}
function product(p:OriginProduct,query:string,dosage:string){return {name:p.name,query,dosage,form:p.form,route:p.route,ingredients:p.ingredients,sources:p.sources,...(p.lookup?{lookup:p.lookup}:{}),token:issueOriginSelection(p,query)};}
export async function POST(request:Request){
 if(!travelPreviewEnabled())return new NextResponse(null,{status:404});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'INVALID_ORIGIN'},{status:403,headers});
 let body:any;try{if(Number(request.headers.get('content-length')||0)>32000)throw Error('size');const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,text='';const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32000)throw Error('size');text+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}body=JSON.parse(text+decoder.decode());}catch{return NextResponse.json({error:'INVALID_INPUT'},{status:400,headers});}
 if(body?.action==='signout')return NextResponse.json({ok:true},{headers:{...headers,'Set-Cookie':cookie('',0)}});
 if(missing().length)return NextResponse.json({error:'TEST_SETUP_REQUIRED'},{status:503,headers});
 if(body?.action==='unlock'){
  if(!limit(true,request))return NextResponse.json({error:'TEST_LIMIT'},{status:429,headers});
  if(!correctTravelTestCode(body.code))return NextResponse.json({error:'TEST_ACCESS_REQUIRED'},{status:401,headers});
  return NextResponse.json({ok:true},{headers:{...headers,'Set-Cookie':cookie(issueTravelTestSession(),8*3600)}});
 }
 if(!travelTestSession(request))return NextResponse.json({error:'TEST_ACCESS_REQUIRED'},{status:401,headers});
 if(body?.action==='evaluate'){
  if(!['production','experimental'].includes(body.arm)||!['it30-gb','uk8-it'].includes(body.caseId)||Object.keys(body).some(k=>!['action','arm','caseId'].includes(k)))return NextResponse.json({error:'INVALID_INPUT'},{status:400,headers});
  if(!limit(false,request)||!evaluationLimit())return NextResponse.json({error:'TEST_LIMIT'},{status:429,headers});
  try{const {evaluateTravelCase}=await import('../../lib/travel-evaluation');return NextResponse.json(await evaluateTravelCase(body.caseId,body.arm),{headers});}catch{return NextResponse.json({error:'EVALUATION_UNAVAILABLE'},{status:503,headers});}
 }
 const {action,query,origin,destination,lang,dosage='',token}=body||{};
 if(!['origin','compare','information'].includes(action)||Object.keys(body).some(k=>!['action','query','origin','destination','lang','dosage','token'].includes(k))||typeof query!=='string'||!query.trim()||query.length>250||!DEMO_COUNTRIES.includes(origin)||action==='compare'&&!DEMO_COUNTRIES.includes(destination)||typeof lang!=='string'||!/^[a-z]{2}$/.test(lang)||typeof dosage!=='string'||dosage.length>100||token!==undefined&&(typeof token!=='string'||token.length>24000))return NextResponse.json({error:'INVALID_INPUT'},{status:400,headers});
 if(!limit(false,request))return NextResponse.json({error:'TEST_LIMIT'},{status:429,headers});
 const originCountry=countryName(origin,'en');
 try{
  if(action==='origin'){
   const products=await originalTravelOrigin(query,originCountry,dosage);
   return NextResponse.json({products:products.map(p=>product(p,query,dosage))},{headers});
  }
  if(action==='information'){
   const selected=readOriginSelection(token,query,originCountry,dosage);if(!selected)return NextResponse.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422,headers});
   const response=await originalTravelInformation(query,originCountry,dosage,lang,token);
   if(!response.ok)return NextResponse.json({error:'INFORMATION_UNAVAILABLE'},{status:response.status,headers});
   const data=await response.json();return NextResponse.json({information:data.leaflet?.leaflet_text||data.leaflet_text||''},{headers});
  }
  return await originalTravelCompare(query,originCountry,countryName(destination,'en'),dosage,token);

 }catch{return NextResponse.json({error:'SEARCH_UNAVAILABLE'},{status:503,headers});}
}
