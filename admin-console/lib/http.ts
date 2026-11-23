import {ConsoleError} from './policy';
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});}
export function failure(error:unknown){return error instanceof ConsoleError?json({error:error.code},error.status):json({error:'CONSOLE_UNAVAILABLE'},503);}
