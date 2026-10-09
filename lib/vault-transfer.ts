import { Upload } from 'tus-js-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { VAULT_BUCKET } from './vault-files';
export function documentTransfer(client:SupabaseClient,file:File,intake:{user_id:string;object_path:string;mime_type:string},progress:(percentage:number)=>void,stopped:()=>boolean) {
 const base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
 if(base.hostname.endsWith('.supabase.co')) base.hostname=base.hostname.replace('.supabase.co','.storage.supabase.co');
 return new Upload(file,{
  endpoint:`${base.origin}/storage/v1/upload/resumable`,chunkSize:6*1024*1024,
  retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,
  storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,
  metadata:{bucketName:VAULT_BUCKET,objectName:intake.object_path,contentType:intake.mime_type,cacheControl:'0'},
  onBeforeRequest:async request=>{
   if(stopped()) throw Error('Cancelled');
   const {data:{session}}=await client.auth.getSession();
   if(!session || session.user.id!==intake.user_id) throw Error('Account changed');
   request.setHeader('Authorization',`Bearer ${session.access_token}`);
   request.setHeader('apikey',process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  },
  onProgress:(sent,total)=>progress(Math.floor(sent/total*100)),
 });
}
