import {fileURLToPath} from 'node:url';
export default {
 outputFileTracingRoot:fileURLToPath(new URL('.',import.meta.url)),
 poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[
  {key:'Cache-Control',value:'private, no-store'},
  {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"}
 ]}];}
};
