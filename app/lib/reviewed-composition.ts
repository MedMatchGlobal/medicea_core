// Product-specific label enrichment, reviewed 2026-11-12. This is NOT a general
// phosphate/hydrate alias and never converts amounts or removes ingredients.
// Italian abbreviated labels say "codeine phosphate"; these primary records
// identify the substance used by the specified Co-Efferalgan presentations.
// The UK Zapain rule below separately binds its BP label to the BP standard.
const filmEvidence='https://www.gazzettaufficiale.it/atto/parte_seconda/caricaDettaglioAtto/originario?atto.codiceRedazionale=TX22ADD12567&atto.dataPubblicazioneGazzetta=2022-11-24';
const effervescentEvidence=[
 'https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.codiceRedazionale=23A00893&atto.dataPubblicazioneGazzetta=2023-02-17&tipoSerie=serie_generale&tipoVigenza=originario',
 'https://cima.aemps.es/cima/dochtml/ft/60748/FichaTecnica_60748.html',
];
type LabelProfile={name:string;country:string;form:string;route:string;release?:string;complete:boolean;species:string[];sources:string[];product_identifier?:unknown;ingredients:{name:string;strength:string}[]};
const norm=(value:string)=>value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const amount=(value:string,mg:number)=>new RegExp('^'+mg+'(?:\\.0+)?\\s*mg(?:\\s*(?:per|/)\\s*(?:1\\s*)?tablet)?$','i').test(value.trim());
export function reviewedCompositionEvidence(p:LabelProfile):string[]{
 if(p.complete!==true||!Array.isArray(p.species)||p.species.length||!Array.isArray(p.sources)||!p.sources.length||norm(p.route)!=='oral'||!['immediate','immediate release','conventional release'].includes(norm(p.release||'').replace(/-/g,' ')))return [];
 if(!Array.isArray(p.ingredients)||p.ingredients.length!==2)return [];
 const paracetamol=p.ingredients.filter(i=>norm(i.name)==='paracetamol'&&amount(i.strength,500));
 const codeine=p.ingredients.filter(i=>norm(i.name)==='codeine phosphate'&&amount(i.strength,30));
 if(paracetamol.length!==1||codeine.length!==1)return [];
 const form=norm(p.form).replace(/-/g,' ');
 const hasSource=(known:string[])=>p.sources.some(source=>known.includes(source));
 const id=p.product_identifier as any;
 // The reviewed authorisation identifies the same registered presentation even
 // when research retrieved a different URL for its label. Never use an AIC from
 // another strength/form, or generalise this to other medicines or salts.
 const filmAic=id&&typeof id.system==='string'&&/^aic$/i.test(id.system.trim())&&typeof id.value==='string'&&id.value.trim()==='027989033';
 if(norm(p.country)==='united kingdom'&&/^zapain(?:\b|$)/i.test(p.name)&&form==='film coated tablet'&&hasSource(['https://www.medicines.org.uk/emc/product/431/smpc','https://www.medicines.org.uk/emc/product/431/pil','https://www.medicines.org.uk/emc/files/pil.431.pdf'])){
  // This exact product's SmPC declares Codeine Phosphate BP 30 mg. The BP
  // primary reference standard identifies that BP substance as the hemihydrate
  // (CAS 41444-62-6). No mass/unit/active-moiety conversion is performed.
  return ['https://www.medicines.org.uk/emc/product/431/smpc','https://www.pharmacopoeia.com/shop/products/1000016439?journey-type=CRS'];
 }
 if(norm(p.country)!=='italy'||!/^co[ -]?efferalgan(?:\b|$)/i.test(p.name))return [];
 // Generic "tablet" cannot establish which authorised presentation was found.
 // A brand name alone is insufficient: bind to the registered presentation's
 // document, rather than treating any page mentioning the brand as evidence.
 if(form==='film coated tablet'&&(filmAic||hasSource([filmEvidence,'https://www.farmasave.it/media/ricette/027989033.pdf'])))return [filmEvidence];
 if(form==='effervescent tablet'&&hasSource([...effervescentEvidence,'https://www.bbfarma.it/pdf/stampati/038123028.pdf']))return [...effervescentEvidence];
 return [];
}
export function reviewedComparisonProfile<T extends LabelProfile>(p:T):T{
 if(!reviewedCompositionEvidence(p).length)return p;
 return {...p,ingredients:p.ingredients.map(i=>norm(i.name)==='codeine phosphate'?{...i,name:'Codeine phosphate hemihydrate'}:{...i})};
}
