import { cookies } from 'next/headers';
import english from './catalogs/en.json';

const languages = new Set(['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh']);
export async function healthServerText(text:string) {
  const preference=(await cookies()).get('medicea_lang')?.value || 'en';
  if(!languages.has(preference)||preference==='en')return text;
  try {
    const bundle=await import(`./catalogs/${preference}.json`);
    return (bundle.default as Record<string,string>)[text] ?? (english as Record<string,string>)[text] ?? text;
  } catch {return text;}
}
