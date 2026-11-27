import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {claudePreviewEnabled} from '@/app/lib/claude-preview';
import {refreshAiConfig} from '@/app/lib/ai-config';
import {verifyOriginSelection} from '@/app/lib/sonnet-research-matches';
export const maxDuration=90;
// Second tier of origin identification: verify the one presentation the patient chose.
export async function POST(req:Request) {
  if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV!=='development') return Response.json({error:'NOT_FOUND'},{status:404});
  try {
    if(new URL(req.url).origin!==req.headers.get('origin')) return Response.json({error:'INVALID_ORIGIN'},{status:403});
    if(membershipPreviewEnabled()&&!await membershipUser()) return Response.json({error:'SIGN_IN_REQUIRED',membershipAccess:true},{status:401});
    const {drugName,originCountry,originSelection}=await req.json();
    await refreshAiConfig();
    if(!claudePreviewEnabled()) return Response.json({error:'NOT_FOUND'},{status:404});
    return await verifyOriginSelection({drugName,originCountry,originSelection});
  } catch {return Response.json({error:'ORIGIN_VERIFICATION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
