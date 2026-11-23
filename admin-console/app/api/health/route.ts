import {assertEnabled,ConsoleError} from '../../../lib/policy';
import {stripe,testKeyConfigured} from '../../../lib/stripe';
import {failure,json} from '../../../lib/http';
// Operational status only, behind Vercel deployment protection. No account,
// customer, key, identifier, balance or financial mutation is exposed here.
export async function GET(){
 try{
  assertEnabled();
  if(!testKeyConfigured())return json({sandbox:true,stripe:'test_key_required'});
  const product=process.env.MEDICEA_CONSOLE_PRODUCT;
  if(!product||!/^prod_[A-Za-z0-9]+$/.test(product))return json({sandbox:true,stripe:'product_configuration_required'});
  try{
   const result=await stripe('/products/'+product);
   if(result.id!==product||result.livemode!==false)return json({sandbox:true,stripe:'sandbox_binding_failed'});
   return json({sandbox:true,stripe:'connected',financialAcceptance:'not_established_by_health_check'});
  }catch(error){return json({sandbox:true,stripe:error instanceof ConsoleError?error.code:'provider_unavailable'});}
 }catch(error){return failure(error);}
}
