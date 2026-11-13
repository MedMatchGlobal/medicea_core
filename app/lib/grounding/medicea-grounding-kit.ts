/**
 * medicea grounding kit  (language-blind, drug-blind, vocabulary-free)
 *
 * This file contains NO drug names, NO chemistry terms (salts, hydrates …), NO dose-form words and NO
 * language-specific strings. Everything domain-specific arrives as DATA:
 *
 *   - Substances are identified by language-neutral IDs ({system, code}); the model looks them up.
 *       moiety      = the active part (what the drug "is")
 *       stated_form = the exact substance as the label states it (any salt/hydrate/ester/solvate/
 *                     complex/extract …, whatever the registry distinguishes)
 *     Same moiety + different stated_form ⇒ "needs review", never a rejection and never a silent match.
 *   - Dose form / route / release etc. are free-form ATTRIBUTES (name → value) taken from a standard
 *     terminology (e.g. EDQM Standard Terms characteristics: basic dose form, transformation, release
 *     characteristics, intended site, administration method). The code never knows the names;
 *     `ComparePolicy.attributes` says which ones gate, which are caveats, which need review.
 *   - Reviewed equivalences are DATA too (EquivalenceRule), each with evidence and a human reviewer.
 *
 * 1. auditResearch()      – proves, from the API response alone, that web research really happened
 * 2. Schema               – raw wording next to source-backed canonical identities
 * 3. validateExtraction() – every resolved value must cite evidence that was actually retrieved
 * 4. compareProducts()    – verdicts computed in code; missing information yields "unknown", never "mismatch"
 */

// ───────────────────────── 1. Research audit ─────────────────────────

type AnyBlock = { type: string; [k: string]: any };

export interface ApiResponseLike {
  content: AnyBlock[];
  stop_reason: string | null;
  usage?: { server_tool_use?: { web_search_requests?: number } };
}

export interface AuditOptions {
  minSearches: number; // minimum web_search calls that must have run
  minResultBearing: number; // minimum calls that returned ≥ 1 result
  allowedFinalStops?: string[]; // research turn: ["end_turn"]; forced client-tool turn: ["tool_use"]
  allowedHosts?: string[]; // per-country registry domains, from CONFIG not code (suffix match)
}

export interface AuditResult {
  ok: boolean;
  failures: string[];
  /** Advisory only. The memory canary is English-only, so it must never decide pass/fail. */
  warnings: string[];
  searches: number;
  resultBearing: number;
  billedSearches: number;
  searchErrors: string[];
  retrievedUrls: Set<string>;
  citedUrls: Set<string>;
}

export function normaliseUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    if (x.protocol !== "https:" || x.username || x.password || x.port) return "";
    return x.toString(); // Paths, queries and trailing slashes can be case-sensitive/significant.
  } catch {
    return "";
  }
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const FROM_MEMORY_EN = /(from|based on) my (own )?(knowledge|memory)|not (from )?a search|without (a )?(web )?search/i;

/** `responses` = every response in ONE logical turn (first call + any pause_turn continuations). */
export function auditResearch(responses: ApiResponseLike[], opts: AuditOptions): AuditResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const blocks = responses.flatMap((r) => r.content);

  const calls = blocks.filter((b) => b.type === "server_tool_use" && b.name === "web_search");
  const resultsById = new Map<string, AnyBlock>();
  for (const b of blocks) if (b.type === "web_search_tool_result") resultsById.set(b.tool_use_id, b);

  const searchErrors: string[] = [];
  const retrievedUrls = new Set<string>();
  let resultBearing = 0;

  for (const c of calls) {
    const r = resultsById.get(c.id);
    if (!r) {
      failures.push(`search ${c.id} has no matching result block (call incomplete)`);
      continue;
    }
    if (Array.isArray(r.content)) {
      const valid = r.content.filter((item: any) => item?.type === "web_search_result" && typeof item.url === "string" && normaliseUrl(item.url));
      if (valid.length > 0) resultBearing++;
      for (const item of valid) retrievedUrls.add(normaliseUrl(item.url));
      if (valid.length !== r.content.length) failures.push(`search ${c.id} contains invalid result entries`);
    } else if (r.content?.error_code) {
      searchErrors.push(String(r.content.error_code)); // HTTP 200 with an error object
      failures.push(`search ${c.id} failed: ${r.content.error_code}`);
    }
  }

  const citedUrls = new Set<string>();
  for (const b of blocks) {
    if (b.type !== "text") continue;
    for (const c of b.citations ?? []) if (c?.url) citedUrls.add(normaliseUrl(c.url));
    if (FROM_MEMORY_EN.test(String(b.text ?? ""))) warnings.push("text appears to say it answered from memory (English-only heuristic)");
  }

  const billed = responses.reduce((n, r) => n + (r.usage?.server_tool_use?.web_search_requests ?? 0), 0);

  if (calls.length < opts.minSearches) failures.push(`only ${calls.length} web_search calls (need ≥ ${opts.minSearches})`);
  if (resultBearing < opts.minResultBearing)
    failures.push(`only ${resultBearing} searches returned results (need ≥ ${opts.minResultBearing})`);
  if (billed !== calls.length) failures.push(`usage reports ${billed} searches but ${calls.length} calls are in the content`);

  const last = responses[responses.length - 1]?.stop_reason ?? null;
  const okStops = opts.allowedFinalStops ?? ["end_turn"];
  if (!last || !okStops.includes(last)) failures.push(`final stop_reason "${last}" not in [${okStops.join(", ")}]`);

  for (const u of citedUrls) if (!retrievedUrls.has(u)) failures.push(`cited URL was not retrieved: ${u}`);

  if (opts.allowedHosts?.length) {
    for (const u of retrievedUrls) {
      const h = hostOf(u);
      if (!opts.allowedHosts.some((a) => h === a || h.endsWith("." + a))) failures.push(`retrieved off-allowlist host: ${h}`);
    }
  }

  return { ok: failures.length === 0, failures, warnings, searches: calls.length, resultBearing, billedSearches: billed, searchErrors, retrievedUrls, citedUrls };
}

// ───────────────────────── 2. Schema ─────────────────────────

/** An identity in a shared code system (substance registry, dose-form terminology, unit-of-presentation list …). */
export interface CodeRef {
  system: string; // open: whatever terminology the identity comes from
  code: string;
  label?: string; // display only; never compared
}

/** resolved = stated by a retrieved source; ambiguous/unresolved = canonical MUST stay null (no guessing). */
export type Status = "resolved" | "ambiguous" | "unresolved";

export interface Evidence {
  id: string;
  url: string; // must be a URL returned by web_search_tool_result
  title?: string;
  source_type: string; // e.g. official_registry | regulator_label | pharmacopoeia | wholesaler | aggregator | other
  supports_text?: string; // ≤150 chars, from citations[].cited_text
}

/** Original wording ALWAYS in `raw` (any language/script). `canonical` is null unless evidence supports it. */
export interface Sourced<T = string> {
  raw: string | null;
  canonical: T | null;
  status: Status;
  evidence: string[];
  note?: string;
}

export interface Strength {
  raw: string | null;
  value: number | null;
  unit: string | null; // SI-style token (ng, mcg, mg, g, ml, l …) or an opaque unit (IU, mmol …)
  per_value: number | null;
  per_unit: string | null; // "ml" | "g" are normalised; anything else is an opaque count unit
  /** as_written = amount of the stated_form as labelled; base_equivalent = amount of the moiety. */
  basis: "as_written" | "base_equivalent" | "unspecified";
  status: Status;
  evidence: string[];
}

export interface Ingredient {
  name_as_written: string; // verbatim, any script; never inspected by code
  moiety: Sourced<CodeRef>; // the active part
  stated_form: Sourced<CodeRef>; // the exact substance as stated (salt/hydrate/ester/extract … whatever the registry separates)
  strength: Strength;
}

export interface Product {
  country: string; // ISO 3166-1 alpha-2
  name_as_written: string;
  language?: string; // BCP-47, informational
  registry: { name: string | null; id: string | null; holder: string | null };
  /** Open strings, shown with their raw wording; never compared (classification systems differ by country). */
  authorisation: Sourced<string>;
  legal_status: Sourced<string>;
  /** Listing/marketing status – deliberately separate from pharmacy stock. */
  marketing: { status: string; as_of: string | null; evidence: string[] };
  dose_form_as_written: string | null;
  dose_form: Sourced<CodeRef>;
  /** Characteristics of the dose form / route / release … as name → value. Names and values come from data. */
  attributes: Record<string, Sourced<string>>;
  ingredients: Ingredient[];
  /** true only if the source lists ALL actives; lets code treat an absent ingredient as a real mismatch. */
  ingredients_complete: boolean;
  excipients_of_note: { raw: string; evidence: string[] }[];
  /** Full list, including coating/shell ingredients. Warnings above are not a substitute. */
  excipients?: {
    completeness: "complete" | "partial" | "unavailable";
    items: { name_as_written: string; identity: Sourced<CodeRef>; quantity: Sourced<string> }[];
    evidence: string[];
  };
}

/** Human-reviewed equivalence, stored as data. Models may propose; only reviewers activate. */
export interface EquivalenceRule {
  id: string;
  applies_to: string; // "stated_form" or an attribute name
  treat_as_same: [string, string]; // canonical keys, e.g. "system:code" or a value
  scope: { jurisdictions?: string[]; note?: string };
  evidence_urls: string[];
  reviewed_by: string;
  reviewed_at: string;
}

/**
 * What a difference in an attribute means. This is CONFIG, not code, e.g. (EDQM-style):
 *   { administrable_basic_dose_form: "gate", release_characteristics: "gate", intended_site: "review" }
 *   gate   → a difference makes the candidate not equivalent
 *   caveat → a difference is reported but allowed
 *   review → a difference needs human review (also the default for attributes with no policy)
 */
export interface ComparePolicy {
  attributes: Record<string, "gate" | "caveat" | "review">;
  /** Required even when absent on BOTH products. Defaults to all gating attributes. */
  required_attributes?: string[];
  rules?: EquivalenceRule[];
}

// ───────────────────────── 3. Extraction validation ─────────────────────────

export interface ValidationIssue {
  path: string;
  problem: string;
}

/** `vocab` is optional DATA (attribute name → allowed values), e.g. loaded from a terminology snapshot. */
export function validateExtraction(
  product: Product,
  evidence: Evidence[],
  retrievedUrls: Set<string>,
  vocab: Record<string, readonly string[]> = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map(evidence.map((e) => [e.id, e]));

  const checkEvidence = (path: string, ids: string[]) => {
    for (const id of ids) {
      const e = byId.get(id);
      if (!e) issues.push({ path, problem: `unknown evidence id ${id}` });
      else if (!retrievedUrls.has(normaliseUrl(e.url))) issues.push({ path, problem: `evidence ${id} URL was never retrieved` });
    }
  };

  const checkSourced = (path: string, s: Sourced<any>, allowed?: readonly string[]) => {
    if (s.status === "resolved") {
      if (s.canonical === null) issues.push({ path, problem: "resolved but canonical is null" });
      if (s.evidence.length === 0) issues.push({ path, problem: "resolved without evidence" });
      if (allowed && typeof s.canonical === "string" && !allowed.includes(s.canonical))
        issues.push({ path, problem: `"${s.canonical}" is not in the supplied vocabulary` });
    } else if (s.canonical !== null) {
      issues.push({ path, problem: `status ${s.status} must not carry a canonical value (guessed mapping)` });
    }
    checkEvidence(path, s.evidence);
  };

  checkSourced("dose_form", product.dose_form);
  checkSourced("authorisation", product.authorisation);
  checkSourced("legal_status", product.legal_status);
  for (const [k, v] of Object.entries(product.attributes)) checkSourced(`attributes.${k}`, v, vocab[k]);

  product.ingredients.forEach((ing, i) => {
    const p = `ingredients[${i}]`;
    checkSourced(`${p}.moiety`, ing.moiety);
    checkSourced(`${p}.stated_form`, ing.stated_form);
    const st = ing.strength;
    if (st.status === "resolved") {
      if (st.value === null || !st.unit || st.per_value === null || !st.per_unit)
        issues.push({ path: `${p}.strength`, problem: "resolved strength missing value/unit/per" });
      if (st.basis === "unspecified") issues.push({ path: `${p}.strength`, problem: "resolved strength must state its dose basis" });
      if (st.evidence.length === 0) issues.push({ path: `${p}.strength`, problem: "resolved strength without evidence" });
    }
    for (const n of [st.value, st.per_value]) if (n !== null && (!Number.isFinite(n) || n <= 0))
      issues.push({ path: `${p}.strength`, problem: "strength and denominator must be finite positive numbers" });
    checkEvidence(`${p}.strength`, st.evidence);
  });
  checkEvidence("marketing", product.marketing.evidence);
  product.excipients_of_note.forEach((x, i) => checkEvidence(`excipients_of_note[${i}]`, x.evidence));
  if (product.excipients) {
    checkEvidence("excipients", product.excipients.evidence);
    product.excipients.items.forEach((x, i) => {
      checkSourced(`excipients[${i}].identity`, x.identity);
      checkSourced(`excipients[${i}].quantity`, x.quantity);
    });
  }
  return issues;
}

// ───────────────────────── 4. Comparison computed in code ─────────────────────────

export type Verdict = "match" | "match_with_caveat" | "mismatch" | "unknown";
export type Overall = "equivalent" | "equivalent_with_caveats" | "unresolved" | "not_equivalent";

export interface FieldComparison {
  field: string;
  verdict: Verdict;
  source: string | null; // raw text, for display only
  candidate: string | null;
  evidence: string[];
  caveat?: string;
  rule_id?: string;
}

const unresolved = (s: Status) => s !== "resolved";

/** Comparable key: plain value, or "system:code" for identities. */
function canonKey(c: unknown): string | null {
  if (c === null || c === undefined) return null;
  if (typeof c === "string") return c.trim() || null;
  if (typeof c === "object" && c && "system" in c && "code" in c) {
    const {system, code} = c as CodeRef;
    return typeof system === "string" && system.trim() && typeof code === "string" && code.trim() ? `${system.trim()}:${code.trim()}` : null;
  }
  return null;
}
const sysOf = (c: unknown): string | null => (typeof c === "object" && c && "system" in c ? String((c as CodeRef).system).trim().toLowerCase() : null);

/** Core comparison of two sourced values: match | mismatch | unknown. Never decides what a mismatch *means*. */
function cmpSourced(field: string, a: Sourced<any> | undefined, b: Sourced<any> | undefined): FieldComparison {
  const base = { field, source: a?.raw ?? null, candidate: b?.raw ?? null, evidence: [...(a?.evidence ?? []), ...(b?.evidence ?? [])] };
  if (!a || !b) return { ...base, verdict: "unknown", caveat: "missing on one side" };
  const ka = canonKey(a.canonical);
  const kb = canonKey(b.canonical);
  if (unresolved(a.status) || unresolved(b.status) || ka === null || kb === null)
    return { ...base, verdict: "unknown", caveat: "unresolved on at least one side" };
  if (sysOf(a.canonical) !== sysOf(b.canonical)) return { ...base, verdict: "unknown", caveat: "different code systems; needs a crosswalk" };
  return { ...base, verdict: ka === kb ? "match" : "mismatch" };
}

function ruleFor(rules: EquivalenceRule[] | undefined, appliesTo: string, a: Sourced<any>, b: Sourced<any>, countries: string[]): EquivalenceRule | undefined {
  const ka = canonKey(a.canonical);
  const kb = canonKey(b.canonical);
  if (!rules || ka === null || kb === null) return undefined;
  return rules.find((r) => {
    if (r.applies_to !== appliesTo) return false;
    if (!r.reviewed_by.trim() || !r.reviewed_at || !r.evidence_urls.length || r.evidence_urls.some(u => !normaliseUrl(u))) return false;
    const [x, y] = r.treat_as_same.map((s) => s.trim());
    if (!((x === ka && y === kb) || (x === kb && y === ka))) return false;
    const j = r.scope.jurisdictions;
    return !j || j.length === 0 || countries.some((c) => j.map((s) => s.toUpperCase()).includes(c.toUpperCase()));
  });
}

/** Apply what a mismatch means for this kind of field (policy or rule); everything else passes through. */
function interpret(r: FieldComparison, how: "gate" | "caveat" | "review", rule?: EquivalenceRule): FieldComparison {
  if (r.verdict !== "mismatch") return r;
  if (rule) return { ...r, verdict: "match_with_caveat", caveat: "equal only via a reviewed equivalence rule", rule_id: rule.id };
  if (how === "gate") return r;
  if (how === "caveat") return { ...r, verdict: "match_with_caveat", caveat: "values differ; policy allows this as a caveat" };
  return { ...r, verdict: "unknown", caveat: "values differ; needs review" };
}

// Units: normalise SI mass/volume so "0.5 g" equals "500 mg" without any per-language logic.
const MASS: Record<string, number> = { ng: 1e-6, mcg: 1e-3, ug: 1e-3, "µg": 1e-3, mg: 1, g: 1e3, kg: 1e6 };
const VOLUME: Record<string, number> = { ul: 1e-3, "µl": 1e-3, ml: 1, l: 1e3 };

function toBase(value: number, unit: string): { dim: string; v: number } {
  const u = unit.trim().toLowerCase();
  if (u in MASS) return { dim: "mass", v: value * MASS[u] };
  if (u in VOLUME) return { dim: "volume", v: value * VOLUME[u] };
  return { dim: `unit:${u}`, v: value }; // IU, mmol, mEq … comparable only with themselves
}

function normaliseStrength(s: Strength): { dim: string; amount: number } | null {
  if (s.value === null || !s.unit || s.per_value === null || !s.per_unit || !Number.isFinite(s.value) || !Number.isFinite(s.per_value) || s.value <= 0 || s.per_value <= 0) return null;
  const a = toBase(s.value, s.unit);
  const pu = s.per_unit.trim().toLowerCase();
  let perDim: string;
  let perV: number;
  if (pu in VOLUME || pu in MASS) {
    const denominator = toBase(s.per_value, pu);
    perDim = denominator.dim;
    perV = denominator.v;
  } else {
    perDim = pu;
    perV = s.per_value;
  }
  return { dim: `${a.dim}/${perDim}`, amount: a.v / perV };
}

function cmpStrength(field: string, a: Strength, b: Strength, formsComparable: boolean): FieldComparison {
  const base = { field, source: a.raw, candidate: b.raw, evidence: [...a.evidence, ...b.evidence] };
  const na = normaliseStrength(a);
  const nb = normaliseStrength(b);
  if (unresolved(a.status) || unresolved(b.status) || !na || !nb) return { ...base, verdict: "unknown", caveat: "strength unresolved on at least one side" };
  if (a.basis === "unspecified" || b.basis === "unspecified" || a.basis !== b.basis)
    return { ...base, verdict: "unknown", caveat: "dose basis differs or is unstated; needs a sourced conversion" };
  if (a.basis === "as_written" && !formsComparable)
    return { ...base, verdict: "unknown", caveat: "stated forms differ, so as-written amounts are not directly comparable" };
  if (na.dim !== nb.dim) return { ...base, verdict: "unknown", caveat: "strength dimensions differ" };
  const same = Math.abs(na.amount - nb.amount) <= 1e-9 * Math.max(1, Math.abs(na.amount), Math.abs(nb.amount));
  return { ...base, verdict: same ? "match" : "mismatch" };
}

export function compareProducts(source: Product, candidate: Product, policy: ComparePolicy): FieldComparison[] {
  const out: FieldComparison[] = [];
  const countries = [source.country, candidate.country];

  // Attributes: names come from data; policy says what a difference means.
  const attrResults = new Map<string, FieldComparison>();
  const required = policy.required_attributes ?? Object.keys(policy.attributes).filter(k => policy.attributes[k] === "gate");
  const keys = new Set([...required, ...Object.keys(source.attributes), ...Object.keys(candidate.attributes)]);
  for (const k of keys) {
    const a = source.attributes[k];
    const b = candidate.attributes[k];
    const raw = cmpSourced(`attr:${k}`, a, b);
    const rule = a && b ? ruleFor(policy.rules, k, a, b, countries) : undefined;
    const r = interpret(raw, policy.attributes[k] ?? "review", rule);
    attrResults.set(k, r);
    out.push(r);
  }

  // Dose-form term: a different term is fine (caveat) when every gating characteristic agrees.
  const df = cmpSourced("dose_form", source.dose_form, candidate.dose_form);
  if (df.verdict === "mismatch") {
    // A gating attribute absent on BOTH sides is simply not applicable to this kind of product; absent on one side shows up as "unknown".
    const gateKeys = Object.entries(policy.attributes).filter(([k, v]) => v === "gate").map(([k]) => k);
    const gatesAgree = gateKeys.length > 0 && gateKeys.every((k) => ["match", "match_with_caveat"].includes(attrResults.get(k)?.verdict ?? "unknown"));
    out.push(gatesAgree ? { ...df, verdict: "match_with_caveat", caveat: "dose-form term differs; gating characteristics agree" } : { ...df, verdict: "unknown", caveat: "dose-form term differs; cannot confirm gating characteristics agree" });
  } else out.push(df);

  // Ingredients: paired by moiety identity.
  const keyed = (p: Product) => p.ingredients.map((i) => ({ i, k: !unresolved(i.moiety.status) ? canonKey(i.moiety.canonical) : null }));
  const S = keyed(source);
  const C = keyed(candidate);
  if (!S.length || !C.length) out.push({field: "ingredients", verdict: "unknown", source: null, candidate: null, evidence: [], caveat: "active-ingredient list empty"});
  if (!source.ingredients_complete || !candidate.ingredients_complete)
    out.push({field: "ingredients_complete", verdict: "unknown", source: null, candidate: null, evidence: [], caveat: "complete active-ingredient lists not established"});
  for (const [side, list] of [["source", S], ["candidate", C]] as const) {
    const ids = list.map(x => x.k).filter(x => x !== null);
    if (new Set(ids).size !== ids.length) out.push({field: `ingredients:${side}`, verdict: "unknown", source: null, candidate: null, evidence: [], caveat: "duplicate active identities require review"});
  }
  // Different ID systems on the two sides ⇒ an apparently missing ingredient is not a trustworthy absence.
  const mixedSystems = new Set([...S, ...C].map((x) => sysOf(x.i.moiety.canonical)).filter(Boolean)).size > 1;
  const bothComplete = source.ingredients_complete && candidate.ingredients_complete && !mixedSystems;

  S.forEach((s, idx) => {
    if (s.k === null) {
      out.push({ field: `moiety:#${idx}`, verdict: "unknown", source: s.i.name_as_written, candidate: null, evidence: s.i.moiety.evidence, caveat: "moiety identity unresolved" });
      return;
    }
    const c = C.find((x) => x.k === s.k);
    if (!c) {
      const anyUnresolved = C.some((x) => x.k === null);
      out.push({ field: `moiety:${s.k}`, verdict: bothComplete && !anyUnresolved ? "mismatch" : "unknown", source: s.i.name_as_written, candidate: null, evidence: s.i.moiety.evidence, caveat: "ingredient not found on candidate" });
      return;
    }
    const rawForm = cmpSourced(`stated_form:${s.k}`, s.i.stated_form, c.i.stated_form);
    const rule = ruleFor(policy.rules, "stated_form", s.i.stated_form, c.i.stated_form, countries);
    // Same moiety but a different stated form is never an automatic match or rejection: review (or reviewed rule).
    const form = interpret(rawForm, "review", rule);
    out.push(form);
    const formsComparable = form.verdict === "match" || form.verdict === "match_with_caveat";
    out.push(cmpStrength(`strength:${s.k}`, s.i.strength, c.i.strength, formsComparable));
  });
  C.forEach((c) => {
    if (c.k === null) out.push({field: "moiety:candidate-unresolved", verdict: "unknown", source: null, candidate: c.i.name_as_written, evidence: c.i.moiety.evidence, caveat: "candidate active identity unresolved"});
    if (c.k !== null && !S.some((x) => x.k === c.k)) {
      const anyUnresolved = S.some((x) => x.k === null);
      out.push({ field: `moiety:${c.k}`, verdict: bothComplete && !anyUnresolved ? "mismatch" : "unknown", source: null, candidate: c.i.name_as_written, evidence: c.i.moiety.evidence, caveat: "extra ingredient on candidate" });
    }
  });
  return out;
}

/** Overall verdict is derived, so the model cannot "reject" a candidate on missing information. */
export function overallVerdict(fields: FieldComparison[]): Overall {
  if (fields.length === 0) return "unresolved";
  if (fields.some((f) => f.verdict === "mismatch")) return "not_equivalent";
  if (fields.some((f) => f.verdict === "unknown")) return "unresolved";
  if (fields.some((f) => f.verdict === "match_with_caveat")) return "equivalent_with_caveats";
  return "equivalent";
}
