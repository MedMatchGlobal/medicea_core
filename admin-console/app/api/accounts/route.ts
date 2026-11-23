import {ownerSession} from '../../../lib/auth';
import {account,accounts} from '../../../lib/accounts';
import {failure,json} from '../../../lib/http';
export async function GET(req:Request){try{
 const {user}=await ownerSession();const params=new URL(req.url).searchParams,member=params.get('member');
 return json(member?await account(user.id,member,params.get('afterCharge')||undefined):await accounts(user.id,params.get('q')||'',params.get('after')||undefined));
}catch(error){return failure(error);}}
