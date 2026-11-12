export type LeafletProfile={ingredients?:{name:string;strength:string}[];form?:string;route?:string;release?:string};
export type LeafletSection={key:string;text:string};
export type ReadableLeaflet={sections:LeafletSection[];notes:LeafletSection[];sources:{label:string;url:string}[];profile:LeafletProfile|null;price:string};
const headings=['Active Ingredients','Active Ingredient','Average Selling Price','Typical Selling Price','Mechanism of Action','Legal Classification','How it Works','Side Effects','Contraindications','Precautions','Interactions','Manufacturer','Formulation','Pack Size','Description','Overview','What it is','Indications','Posology','Strength','Dosage','Warnings','Summary','Uses','Storage','Sources','References','Note','Notes','Disclaimer'];
const canonical=(s:string)=>/^active ingredients?$/i.test(s)?'Active Ingredients':/^(?:average|typical) selling price$/i.test(s)?'Typical selling price':/^(?:notes?|disclaimer)$/i.test(s)?'Note':/^(?:sources|references)$/i.test(s)?'Sources':headings.find(h=>h.toLowerCase()===s.toLowerCase())||s;
const safeUrl=(s:string)=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}};
function trimUrl(s:string){
 let value=s.replace(/[.,;:!?]+$/,'');
 while(value.endsWith(')')&&(value.match(/\)/g)||[]).length>(value.match(/\(/g)||[]).length)value=value.slice(0,-1);
 return value;
}
// Match only complete headings at the start of a line. Never split a word in
// a sentence, URL, or the plural "Active Ingredients" at "Active Ingredient".
export function parseReadableLeaflet(input:string,profile?:LeafletProfile):ReadableLeaflet {
 const sources:{label:string;url:string}[]=[];
 function reference(raw:string,label?:string){const url=safeUrl(trimUrl(raw));if(url&&!sources.some(s=>s.url===url))sources.push({label:label?.trim()&&!/^https?:\/\//i.test(label)?label.trim():new URL(url).hostname.replace(/^www\./,''),url});}
 let text=input.replace(/\r\n?/g,'\n');
 text=text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s]+)\)/g,(_,label,url)=>{reference(url,label);return /^https?:\/\//i.test(label)?'':label;});
 text=text.replace(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,(_,url,label)=>{reference(url,label.replace(/<[^>]*>/g,''));return /^https?:\/\//i.test(label)?'':label;});
 text=text.replace(/https?:\/\/[^\s<>"']+/g,url=>{reference(url);const value=trimUrl(url);return url.slice(value.length).replace(/[)\],;.]+/g,'');});
 text=text.replace(/<\/?(?:strong|b|p|div|br|h[1-6])\b[^>]*>/gi,tag=>/^<\/?(?:p|div|br|h)/i.test(tag)?'\n':'').replace(/<[^>]*>/g,'');
 text=text.replace(/\*\*|__/g,'').replace(/\(\s*(?:sources?\s*:\s*)?[;,\s]*\)/gi,'').replace(/[ \t]+\n/g,'\n');
 const pattern=new RegExp('^\\s*(?:#{1,6}\\s*)?('+headings.join('|')+')\\s*(?::\\s*(.*)|[.\\-]?\\s*)$','i');
 const blocks:LeafletSection[]=[];let current:LeafletSection={key:'Summary',text:''};
 function finish(){current.text=current.text.trim();if(current.text)blocks.push(current);}
 for(const line of text.split('\n')){const match=line.match(pattern);if(match){finish();current={key:canonical(match[1]),text:match[2]||''};}else current.text+=(current.text?'\n':'')+line;}
 finish();
 const notes=blocks.filter(b=>['Note','Sources'].includes(b.key));
 const sections=blocks.filter(b=>!['Note','Sources','Typical selling price'].includes(b.key));
 const priceBlock=blocks.find(b=>b.key==='Typical selling price');
 // Only display a price already supplied as a compact monetary/pack statement.
 // Never derive a strength or price from a source URL or stray numbers in notes.
 const priceLines=(priceBlock?.text||'').split('\n').map(s=>s.replace(/^\s*[-*•]\s*/,'').trim()).filter(Boolean);
 const price=priceLines.find(s=>s.length<=220&&/(?:[£€$¥₹]|\b(?:GBP|EUR|USD|CHF|CAD|AUD|INR|JPY)\b)\s*\d|\d\s*(?:GBP|EUR|USD|CHF|CAD|AUD|INR|JPY)\b/i.test(s)&&/\b(?:pack|tablets?|capsules?|sachets?|bottle|ml|doses?|patches?)\b/i.test(s)&&!/(?:reimburse|wholesale|tariff|not available|not established|unavailable|different variants|several variants)/i.test(s))||'Price unavailable';
 if(priceBlock&&priceBlock.text!==price)notes.push({key:'Price details',text:priceBlock.text});
 const validProfile=profile&&Array.isArray(profile.ingredients)&&profile.ingredients.length>0&&profile.ingredients.every(i=>typeof i?.name==='string'&&!!i.name.trim()&&typeof i?.strength==='string'&&!!i.strength.trim())?profile:null;
 if(validProfile){
  for(let i=sections.length-1;i>=0;i--)if(['Active Ingredients','Strength','Formulation'].includes(sections[i].key))notes.unshift({key:'Additional product details',text:sections.splice(i,1)[0].text});
 }
 return {sections,notes,sources,profile:validProfile,price};
}
