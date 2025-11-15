// app/api/options/route.ts
import { NextResponse } from 'next/server';

function localeFor(lang: string) {
  switch (lang) {
    case 'it': return 'it-IT';
    case 'fr': return 'fr-FR';
    case 'de': return 'de-DE';
    case 'es': return 'es-ES';
    case 'pt': return 'pt-PT';
    default:   return 'en-US';
  }
}

export async function POST(req: Request) {
  const { type, lang } = await req.json().catch(() => ({ type: '', lang: 'en' }));

  if (type !== 'countries') {
    return NextResponse.json({ options: [] });
  }

  // Extend this list at will; these cover Europe + many global picks.
  const codes = [
    'IT','GB','US','FR','DE','ES','GR','PT','NL','BE','CH','AT','IE','SE','NO','DK','FI','PL','CZ','HU','RO','BG','HR','SI','SK',
    'EE','LV','LT','LU','MT','CY','IS','LI','TR','UA','RU',
    'CA','MX','BR','AR','CL','CO','PE','UY',
    'AU','NZ','JP','KR','CN','HK','SG','MY','TH','VN','PH','ID','IN','PK','BD','LK','NP',
    'AE','SA','QA','KW','OM','JO','IL','EG','MA','TN','ZA','NG','KE','GH','ET','TZ','UG',
    'AL','BA','ME','MK','RS','XK'
  ];

  // @ts-ignore
  const hasIntl = typeof Intl.DisplayNames !== 'undefined';
  // @ts-ignore
  const dn = hasIntl ? new Intl.DisplayNames([localeFor(lang || 'en')], { type: 'region' }) : null;

  const options = codes.map((code) => ({
    code,
    name: (dn?.of(code) as string) || code,
  }));

  return NextResponse.json({ options });
}
