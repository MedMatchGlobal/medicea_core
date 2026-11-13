import {auditResearch, compareProducts, overallVerdict, validateExtraction, normaliseUrl,
  type ApiResponseLike, type AuditOptions, type ComparePolicy, type Evidence, type Product,
  type Sourced, type ValidationIssue} from './medicea-grounding-kit';

/** Isolated evaluator. No network, model call, retry, persistence or production route. */
export type Outcome = 'confirmed_match' | 'possible_match' | 'insufficient_information' | 'not_equivalent';
export const outcomeLabels: Record<Outcome, string> = {
  confirmed_match: 'Ingredients, strengths, form, route and release match',
  possible_match: 'Possible Equivalent - Consult a GP or a Pharmacist',
  insufficient_information: 'Insufficient Information',
  not_equivalent: 'Not an equivalent',
};

/** Trusted inputs ONLY: populated by an independent source adapter or human review,
 * never by copying the extraction model's claims into this object. A quote alone
 * establishes provenance, not that the model interpreted a clinical fact correctly. */
export interface ReviewedDocument {
  url: string;
  text: string;
  productKey: string;
  country: string;
  review: {by: string; at: string};
  facts: Record<string, unknown>;
}
export interface GroundingContext {documents: ReviewedDocument[]}
export function productKey(p: Product): string {
  return JSON.stringify([p.country, p.registry.name, p.registry.id, p.name_as_written]);
}
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const code = (v: unknown) => object(v) && text(v.system) && text(v.code);
const sourced = (v: unknown, canonical: (v: unknown) => boolean) => object(v) && nullableText(v.raw) &&
  ['resolved', 'unresolved', 'ambiguous'].includes(v.status) && ids(v.evidence) &&
  (v.canonical === null || canonical(v.canonical));
const strength = (v: unknown) => object(v) && nullableText(v.raw) &&
  [v.value, v.per_value].every(n => n === null || (typeof n === 'number' && Number.isFinite(n) && n > 0)) &&
  nullableText(v.unit) && nullableText(v.per_unit) &&
  ['as_written','base_equivalent','unspecified'].includes(v.basis) &&
  ['resolved','ambiguous','unresolved'].includes(v.status) && ids(v.evidence);

/** TypeScript types disappear at runtime; model JSON must pass this before access. */
export function isProduct(v: unknown): v is Product {
  return object(v) && typeof v.country === 'string' && /^[A-Z]{2}$/.test(v.country) && text(v.name_as_written) &&
    object(v.registry) && [v.registry.name, v.registry.id, v.registry.holder].every(nullableText) &&
    sourced(v.authorisation, text) && sourced(v.legal_status, text) &&
    object(v.marketing) && text(v.marketing.status) && nullableText(v.marketing.as_of) && ids(v.marketing.evidence) &&
    nullableText(v.dose_form_as_written) && sourced(v.dose_form, code) &&
    object(v.attributes) && Object.values(v.attributes).every(s => sourced(s, text)) &&
    typeof v.ingredients_complete === 'boolean' && Array.isArray(v.ingredients) &&
    v.ingredients.every(i => object(i) && text(i.name_as_written) && sourced(i.moiety, code) && sourced(i.stated_form, code) && strength(i.strength)) &&
    Array.isArray(v.excipients_of_note) && v.excipients_of_note.every(i => object(i) && text(i.raw) && ids(i.evidence)) &&
    (v.excipients === undefined || (object(v.excipients) && ['complete','partial','unavailable'].includes(v.excipients.completeness) &&
      ids(v.excipients.evidence) && Array.isArray(v.excipients.items) && v.excipients.items.every(i => object(i) && text(i.name_as_written) && sourced(i.identity, code) && sourced(i.quantity, text))));
}
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v,i) => same(v,b[i]));
  if (object(a) && object(b)) {const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b,k) && same(a[k],b[k]));}
  return false;
};
const normText = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

export function validateGrounding(p: Product, evidence: Evidence[], context: GroundingContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [], key = productKey(p);
  const check = (path: string, value: unknown, evidenceIds: string[]) => {
    const supported = evidenceIds.some(id => {
      const e = evidence.find(e => e.id === id);
      if (!e || !text(e.supports_text) || e.supports_text.length > 150) return false;
      return context.documents.some(d => normaliseUrl(d.url) !== '' && normaliseUrl(d.url) === normaliseUrl(e.url) &&
        d.productKey === key && d.country === p.country && text(d.review.by) && Number.isFinite(Date.parse(d.review.at)) &&
        Date.parse(d.review.at) <= Date.now() && normText(d.text).includes(normText(e.supports_text!)) &&
        Object.hasOwn(d.facts,path) && same(d.facts[path],value));
    });
    if (!supported) issues.push({path, problem:'fact has not been independently verified against evidence for this exact product'});
  };
  const field = (path: string, s: Sourced<unknown>) => {if (s.status === 'resolved') check(path,s.canonical,s.evidence);};
  const allIds = [...new Set(evidence.map(e => e.id))];
  check('product_identity', {country:p.country, registry:p.registry, name_as_written:p.name_as_written},allIds);
  check('ingredients_complete',p.ingredients_complete,allIds);
  field('dose_form',p.dose_form);
  field('authorisation',p.authorisation); field('legal_status',p.legal_status);
  for (const [k,v] of Object.entries(p.attributes)) field(`attributes.${k}`,v);
  p.ingredients.forEach((i,n) => {
    field(`ingredients[${n}].moiety`,i.moiety); field(`ingredients[${n}].stated_form`,i.stated_form);
    if (i.strength.status === 'resolved') {
      const {value,unit,per_value,per_unit,basis} = i.strength;
      check(`ingredients[${n}].strength`,{value,unit,per_value,per_unit,basis},i.strength.evidence);
    }
  });
  check('marketing',p.marketing,p.marketing.evidence);
  p.excipients_of_note.forEach((i,n) => check(`excipients_of_note[${n}]`,i.raw,i.evidence));
  if (p.excipients && p.excipients.completeness !== 'unavailable') {
    check('excipients.completeness',p.excipients.completeness,p.excipients.evidence);
    p.excipients.items.forEach((i,n) => {
      check(`excipients[${n}].name_as_written`,i.name_as_written,p.excipients!.evidence);
      field(`excipients[${n}].identity`,i.identity); field(`excipients[${n}].quantity`,i.quantity);
    });
  }
  return issues;
}

/** Only reviewed IDs compare across languages; raw names never become silent aliases. */
export function compareFullExcipients(a: Product, b: Product) {
  const left = a.excipients, right = b.excipients;
  const key = (i: NonNullable<Product['excipients']>['items'][number]) =>
    i.identity.status === 'resolved' && i.identity.canonical ? JSON.stringify([i.identity.canonical.system,i.identity.canonical.code]) : null;
  const complete = left?.completeness === 'complete' && right?.completeness === 'complete';
  const known = (left?.items ?? []).every(i => key(i)) && (right?.items ?? []).every(i => key(i));
  const sourceOnly = (left?.items ?? []).filter(i => key(i) && !(right?.items ?? []).some(j => key(j) === key(i))).map(i => i.name_as_written);
  const candidateOnly = (right?.items ?? []).filter(i => key(i) && !(left?.items ?? []).some(j => key(j) === key(i))).map(i => i.name_as_written);
  const amountDifferences = (left?.items ?? []).filter(i => key(i) && (right?.items ?? []).some(j => key(j) === key(i) && i.quantity.status === 'resolved' && j.quantity.status === 'resolved' && i.quantity.canonical !== j.quantity.canonical)).map(i => i.name_as_written);
  return {completeness:complete && known ? 'complete' : 'incomplete', sourceOnly, candidateOnly, amountDifferences,
    quantitiesFullyCompared:!!complete && known && !sourceOnly.length && !candidateOnly.length && (left?.items ?? []).every(i => i.quantity.status === 'resolved') && (right?.items ?? []).every(i => i.quantity.status === 'resolved'),
    absenceEstablished:!!complete && known};
}

export function evaluateGroundedProducts(input: {
  source: unknown; candidate: unknown; evidence: Evidence[];
  responses: ApiResponseLike[]; auditOptions: AuditOptions; policy: ComparePolicy;
  context: GroundingContext; vocab?: Record<string, readonly string[]>;
}) {
  const audit = auditResearch(input.responses,input.auditOptions);
  const validEvidence = Array.isArray(input.evidence) && input.evidence.every(e => object(e) && text(e.id) && text(e.url) && text(e.source_type)) && new Set(input.evidence.map(e => e.id)).size === input.evidence.length;
  const valid = isProduct(input.source) && isProduct(input.candidate) && validEvidence;
  if (!valid) return {outcome:'insufficient_information' as Outcome, label:outcomeLabels.insufficient_information, confirmed:false, audit, fields:[], issues:[{path:'input',problem:'invalid product or evidence structure'}], excipients:null};
  const a = input.source as Product, b = input.candidate as Product;
  const fields = compareProducts(a,b,input.policy);
  const issues = [a,b].flatMap((p,n) => [...validateExtraction(p,input.evidence,audit.retrievedUrls,input.vocab),...validateGrounding(p,input.evidence,input.context)].map(i => ({...i,path:`${n === 0 ? 'source' : 'candidate'}.${i.path}`})));
  const verdict = overallVerdict(fields);
  // Missing evidence cannot establish either a confirmed match or a confirmed mismatch.
  const policyReady = Object.values(input.policy.attributes).includes('gate') && (input.policy.required_attributes ?? Object.keys(input.policy.attributes).filter(k => input.policy.attributes[k] === 'gate')).length > 0;
  const trusted = audit.ok && !issues.length && policyReady;
  const outcome: Outcome = !a.ingredients.length || !b.ingredients.length ? 'insufficient_information' :
    !trusted ? 'possible_match' : verdict === 'not_equivalent' ? 'not_equivalent' : verdict === 'unresolved' ? 'possible_match' : 'confirmed_match';
  return {outcome,label:outcomeLabels[outcome],confirmed:outcome === 'confirmed_match',audit,fields,issues,
    excipients:issues.some(i => i.path.includes('excipients')) ? null : compareFullExcipients(a,b)};
}
