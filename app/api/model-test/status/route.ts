import {modelTestConfiguration} from '@/app/lib/openaiClient';
export const dynamic='force-dynamic';
export function GET(){
 if(process.env.VERCEL_ENV==='production'||(!process.env.VERCEL_ENV&&process.env.NODE_ENV!=='development'))return Response.json({error:'NOT_FOUND'},{status:404});
 return Response.json(modelTestConfiguration(),{headers:{'Cache-Control':'no-store'}});
}
