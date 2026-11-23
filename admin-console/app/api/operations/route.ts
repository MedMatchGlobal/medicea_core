import {ownerSession} from '../../../lib/auth';
import {sameOrigin} from '../../../lib/policy';
import {performOperation} from '../../../lib/operations';
import {failure,json} from '../../../lib/http';
export async function POST(req:Request){try{sameOrigin(req);const {user}=await ownerSession();return json(await performOperation(user.id,await req.json()));}catch(error){return failure(error);}}
