import {createHmac, timingSafeEqual} from 'node:crypto';

export type OriginVariant = {name:string;form:string;route:string;release:string;ingredients:{name:string;strength:string}[];token:string};
const normal = (s:string) => s.normalize('NFKC').trim().toLowerCase();
const text = (v:unknown, max=250):v is string => typeof v==='string' && !!v.trim() && v.length<=max;
function key() {
  const secret=process.env.OPENAI_API_KEY_1||process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY_2||process.env.OPENAI_API_KEY_3||process.env.OPENAI_API_KEY_4;
  if(!secret) throw Error('ORIGIN_SELECTION_UNAVAILABLE');
  return createHmac('sha256',secret).update('medicea-origin-variant-v1').digest();
}
export function validVariant(p:any):boolean {
  return !!p && text(p.name) && text(p.form) && text(p.route) && text(p.release) && Array.isArray(p.ingredients) && p.ingredients.length>0 && p.ingredients.length<=12 && p.ingredients.every((i:any)=>text(i?.name)&&text(i?.strength,100)&&/^\d+(?:\.\d+)?\s*[a-zµμ]/i.test(i.strength.trim())&&!/\b(?:or|to)\b|\d\s*[-–]\s*\d|\+/.test(i.strength));
}
export function signVariant(product:Omit<OriginVariant,'token'>,query:string,country:string,hint:string):OriginVariant {
  const payload=Buffer.from(JSON.stringify({product,query,country,hint,expires:Date.now()+15*60_000})).toString('base64url');
  return {...product,token:payload+'.'+createHmac('sha256',key()).update(payload).digest('base64url')};
}
export function readVariant(token:unknown,query:string,country:string,hint:string):OriginVariant|null {
  try {
    if(typeof token!=='string'||token.length>20000) return null;
    const parts=token.split('.'); if(parts.length!==2) return null;
    const expected=createHmac('sha256',key()).update(parts[0]).digest(), actual=Buffer.from(parts[1],'base64url');
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual)) return null;
    const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    if(!Number.isFinite(data.expires)||data.expires<=Date.now()||normal(data.query)!==normal(query)||normal(data.country)!==normal(country)||normal(data.hint)!==normal(hint)||!validVariant(data.product)) return null;
    return {...data.product,token};
  } catch { return null; }
}

export function variantChoices(reply:any,query:string,country:string,hint:string):OriginVariant[] {
  if(reply?.variants_complete!==true||!Array.isArray(reply.products)||reply.products.length>24||reply.products.some((p:any)=>!validVariant(p))) throw Error('UNRESOLVED_VARIANTS');
  const seen=new Set<string>();
  return reply.products.flatMap((p:any)=>{
    const product={name:p.name.trim(),form:p.form.trim(),route:p.route.trim(),release:p.release.trim(),ingredients:p.ingredients.map((i:any)=>({name:i.name.trim(),strength:i.strength.trim()}))};
    const identity=JSON.stringify([normal(product.name),normal(product.form),normal(product.route),normal(product.release),product.ingredients.map((i:any)=>normal(i.name)+':'+normal(i.strength)).sort()]);
    if(seen.has(identity)) return []; seen.add(identity);
    return [signVariant(product,query,country,hint)];
  });
}
