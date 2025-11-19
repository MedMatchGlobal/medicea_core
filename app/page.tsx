/* 
===============================================================================
Fixed banner logic for "Generics" label + country, and removed banner from Leaflet
+ Added basic free-usage limits + Premium paywall
===============================================================================
*/

'use client';

import { useEffect, useMemo, useState } from 'react';
import countriesByRegion from '../data/countries';
import { LanguageProvider, useLanguage } from './LanguageProvider';
import LanguageButton from './components/LanguageButton';
import SymptomTriage from './components/SymptomTriage';

import PremiumPaywall from './components/PremiumPaywall';
import enStrings from './i18n/en.json';
import { isRTL, loadStrings } from './i18n/i18n';
import { registerUsage } from './lib/subscriptionClient';
import { hasFreeQuota, incrementUsage } from './lib/usageTracker';

/* -------------------------- WRAPPER -------------------------- */

export default function PageWrapper() {
  return (
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
}

/* -------------------------- HELPERS -------------------------- */

type UIStrings = typeof enStrings;

/** Fill missing groups from English so we never deref undefined. */
function ensureDefaults(input: Partial<UIStrings> | undefined, fallback: UIStrings): UIStrings {
  const i = (input ?? {}) as any;
  const f = fallback as any;
  const out: any = { ...f, ...i };
  out.ui = { ...(f.ui ?? {}), ...(i.ui ?? {}) };
  out.leafletHeadings = { ...(f.leafletHeadings ?? {}), ...(i.leafletHeadings ?? {}) };
  return out as UIStrings;
}

/** Strict UI: use current language only if value is non-empty; otherwise use English. */
function safeUI(t: any) {
  const fallback = (enStrings as any).ui || (enStrings as any);
  const local = (t && (t.ui || t)) || {};
  return new Proxy(
    {},
    {
      get(_, prop) {
        const k = String(prop);
        const v = (local as any)[k];
        if (v !== undefined && String(v).trim() !== '') return v;
        const fv = (fallback as any)[k];
        return fv ?? '';
      },
    }
  ) as UIStrings['ui'];
}

/** Interpolate with {placeholders} and safe defaults */
function F(
  ui: any,
  key: string,
  def: string,
  vars?: Record<string, string | number | undefined | null>
) {
  const raw = ui?.[key];
  let text =
    typeof raw === 'string' && raw.trim().length > 0
      ? raw
      : def;

  if (vars && typeof text === 'string' && text) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''));
    }
  }
  return text;
}

function pickText(x: any): string {
  if (!x) return '';
  if (typeof x === 'string') return x;
  const candidates = [
    x.result,
    x.response,
    x.text,
    x.content,
    x.leaflet,
    x.leaflet_text,
    x.originNarrative,
    x?.choices?.[0]?.message?.content,
    x?.data?.choices?.[0]?.message?.content,
  ].filter(Boolean);
  if (typeof candidates[0] === 'string') return candidates[0] as string;
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return '';
  }
}

function stripFences(s: string) {
  if (!s) return s;
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}

function jsonUnescapeMaybe(s: string) {
  if (!s) return s;
  const looks = /\\n|\\t|\\"|\\\\/.test(s);
  if (!looks) return s;
  try {
    if (!(s.startsWith('"') && s.endsWith('"'))) return JSON.parse('"' + s.replace(/"/g, '\\"') + '"');
    return JSON.parse(s);
  } catch {
    return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  }
}

function cleanArtifacts(s: string) {
  if (!s) return s;
  let out = s.replace(/\r/g, '').trim();
  out = out.replace(/\*\*(\s*)/g, '$1');
  out = out.replace(/\\{2,}/g, '\\');
  out = out.replace(/\\\s*$/gm, '');
  out = out.replace(/^[“”"']\s*/gm, '').replace(/\s*[“”"']$/gm, '');
  out = out.replace(/^[\\]([-*•])\s+/gm, '$1 ');
  out = out.replace(/^(?:[-•*]|\d+\.)\s*$/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/[\]}]+$/g, '');
  return out.trim();
}

function stripMarkdownBasic(s: string) {
  if (!s) return s;
  let out = s;

  out = out.replace(/^#{1,6}\s*/gm, '');
  out = out.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
  out = out.replace(/`+/g, '');
  out = out.replace(/^[\-\*]\s+/gm, '• ');
  out = out.replace(/"/g, '');
  out = out.replace(/\n{3,}/g, '\n\n');

  // Make lines ending with ":" bold (headings)
  out = out.replace(/^(.+?):$/gm, '<strong>$1:</strong>');

  return out.trim();
}

function extractLeafletText(rawInput: string): string {
  if (!rawInput) return '';
  let raw = stripFences(rawInput).trim();

  const tryParse = (txt: string) => {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  };
  const pickFrom = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.leaflet_text === 'string') return obj.leaflet_text;
    if (obj.data && typeof obj.data.leaflet_text === 'string') return obj.data.leaflet_text;
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      if (v && typeof v === 'object') {
        const inner = pickFrom(v);
        if (inner) return inner;
      }
    }
    return null;
  };

  const j1 = tryParse(raw);
  if (j1) {
    const lf = pickFrom(j1);
    if (lf) return cleanArtifacts(jsonUnescapeMaybe(lf));
  }

  const un1 = jsonUnescapeMaybe(raw).trim();
  const j2 = tryParse(un1);
  if (j2) {
    const lf = pickFrom(j2);
    if (lf) return cleanArtifacts(jsonUnescapeMaybe(lf));
  }

  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a !== -1 && b > a) {
    const cand = raw.slice(a, b + 1);
    const j3 = tryParse(cand);
    if (j3) {
      const lf = pickFrom(j3);
      if (lf) return cleanArtifacts(jsonUnescapeMaybe(lf));
    }
  }

  const rx = /"leaflet_text"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/i;
  const m = raw.match(rx);
  if (m) {
    const captured = jsonUnescapeMaybe('"' + m[1] + '"');
    return cleanArtifacts(captured);
  }

  raw = raw.replace(/^_?hint"\s*:\s*null,?\s*$/gim, '').replace(/^"_?hint"\s*:\s*null,?\s*$/gim, '');

  return cleanArtifacts(jsonUnescapeMaybe(raw));
}

// Detect trivial connectors in many languages
function isTrivialConnector(s: string) {
  const w = (s || '').trim().toLowerCase().replace(/[.:;,\-–—]+$/g, '');
  const connectors = [
    'and', 'et', 'y', 'e', 'und', 'og', 'och', 'ja', 'i', 'a', 'és', 've',
    'و', 'и', 'και', 'এবং', 'અને', '및', '及', 'と', 'dan', 'veya', 'en', 'også',
  ];
  return connectors.includes(w);
}

function bulletifyBlock(text: string) {
  const rawLines = text.split('\n').map((s) => s.replace(/^[“”"']\s*/, '').trim());
  const normalized = rawLines.map((line) => line.replace(/^[\u2013\u2014\u2212]\s+/, '- '));

  const lines = normalized.filter((l) => {
    if (!l) return false;
    if (isTrivialConnector(l)) return false;
    const m = l.match(/^(-|•|\*|\d+\.)\s*(.*)$/);
    return m ? m[2].trim().length > 0 : true;
  });

  const isBullet = (r: string) => /^(-|•|\*|\d+\.)\s+/.test(r);
  const bulletLines = lines.filter(isBullet);

  if (bulletLines.length >= 1) {
    return (
      <ul style={styles.ul}>
        {bulletLines.map((r, i) => (
          <li key={i} style={styles.li}>
            {r.replace(/^(-|•|\*|\d+\.)\s+/, '').trim()}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.length === 0) return null;

  const joined = lines.join(' ').trim();
  const capitalized = joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : '';
  return <p style={styles.p}>{capitalized}</p>;
}

function renderLeafletPretty(leafletText: string, t: UIStrings) {
  if (!leafletText) return null;

  const cleaned = leafletText;

  const order = [
    'Manufacturer','Description','Overview','What it is','Active Ingredient','Active Ingredients','Mechanism of Action',
    'How it Works','Uses','Indications','Posology','Strength','Dosage','Interactions','Side Effects','Precautions',
    'Contraindications','Legal Classification','Storage','Average Selling Price','Note','Disclaimer',
  ];

  const lower = cleaned.toLowerCase();
  const marks: Array<{ key: string; idx: number }> = [];
  for (const key of order) {
    const i = lower.indexOf(key.toLowerCase());
    if (i >= 0) marks.push({ key, idx: i });
  }
  marks.sort((a, b) => a.idx - b.idx);

  if (!marks.length) {
    return <div style={styles.leafletCard}>{bulletifyBlock(cleaned)}</div>;
  }

  const blocks: Array<{ key: string; text: string }> = [];
  for (let i = 0; i < marks.length; i++) {
    const { key, idx } = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1].idx : cleaned.length;
    const slice = cleaned
      .slice(idx, end)
      .replace(new RegExp(`^${key}\\s*[:.-]*\\s*`, 'i'), '')
      .trim();
    if (slice) blocks.push({ key, text: slice });
  }

  return (
    <div style={styles.leafletCard}>
      {blocks.map(({ key, text }) => {
        const label = (t.leafletHeadings && (t.leafletHeadings as any)[key]) || key;
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={styles.h4}>{label}:</div>
            {bulletifyBlock(text)}
          </div>
        );
      })}
    </div>
  );
}

function parseMatchesFromRawText(rawText: string): Array<{ medicine_name: string }> {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(?:\d+[.)]|[-•*])\s*(.+)$/);
    items.push(m ? m[1].trim() : l);
  }
  const seen = new Set<string>();
  const out: Array<{ medicine_name: string }> = [];
  for (let name of items) {
    name = name.replace(/\s*[;,.]$/, '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ medicine_name: name });
  }
  return out;
}

function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function stylizeBrand(html: string) {
  if (!html) return html;
  const logo = `<strong><span style="color:#1E73BE">medi</span><span style="color:#008080">céa</span>™</strong>`;
  let out = html;
  out = out.replace(/<strong>\s*medicéa™\s*<\/strong>/gi, 'medicéa™');
  out = out.replace(/<b>\s*medicéa™\s*<\/b>/gi, 'medicéa™');
  out = out.replace(/medicéa™/g, logo);
  out = out.replace(/medicea™/gi, logo);
  return out;
}

function boldConditionHeadings(raw: string) {
  if (!raw) return '';
  let out = raw;
  out = out.replace(/^(\s*\d+\)\s+.*)$/gm, '<strong>$1</strong>');
  out = out.replace(/^(?!\s*[-•*]\s)(.+?:)\s*$/gm, '<strong>$1</strong>');
  out = out.replace(/\r?\n/g, '<br>');
  out = out.replace(/&lt;(\/?strong)&gt;/g, '<$1>');
  return out;
}

/* -------------------------- MAIN -------------------------- */

function Home() {
  // localized group labels for condition groups
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});

  // Hydration control for HTML-injected sections
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [t, setT] = useState<UIStrings>(enStrings as UIStrings);
  const [translating, setTranslating] = useState(false);

  // Conditions: translated map, options for datalist, and groups for browsing
  const [conditionMap, setConditionMap] = useState<Record<string, string>>({});
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const [conditionGroups, setConditionGroups] = useState<Array<{ id: string; label: string; items: string[] }> | undefined>(undefined);

  const { lang } = useLanguage();

  // Load translated conditions + groups
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const transMod = await import(`../data/i18n/conditions/${(lang || 'en').toLowerCase()}.ts`).catch(() => null);
        const translations = (transMod && (transMod as any).default) || {};

        const groupMod = await import('../data/conditions').catch(() => null);
        let groupsArr: Array<{ id: string; label: string; items: string[] }> | undefined;
        if (groupMod) {
          const g1 =
            (groupMod as any).CONDITION_GROUPS ||
            (groupMod as any).groups ||
            (groupMod as any).default ||
            (groupMod as any);
          if (Array.isArray(g1)) {
            groupsArr = g1.map((g) => ({
              id: g.id || g.label || 'group',
              label: String(g.label || g.id || ''),
              items: Array.isArray(g.items) ? g.items : [],
            }));
          } else if (g1 && typeof g1 === 'object') {
            groupsArr = Object.entries(g1).map(([id, g]: any) => ({
              id: id,
              label: String(g?.label || id),
              items: Array.isArray(g?.items) ? g.items : [],
            }));
          }
        }

        const flat: Record<string, string> = {};
        const isGroupedTranslations =
          !!translations &&
          typeof translations === 'object' &&
          !Array.isArray(translations) &&
          Object.values(translations).some((v: any) => v && typeof v === 'object' && !Array.isArray(v));

        if (isGroupedTranslations) {
          for (const [_group, obj] of Object.entries(translations as Record<string, Record<string, string>>)) {
            if (!obj || typeof obj !== 'object') continue;
            for (const [key, label] of Object.entries(obj)) {
              if (typeof label === 'string' && label.trim()) flat[key] = label.trim();
            }
          }
        } else {
          for (const [key, label] of Object.entries(translations as Record<string, string>)) {
            if (typeof label === 'string' && label.trim()) flat[key] = label.trim();
          }
        }

        const labels = Object.values(flat).filter(Boolean).sort((a, b) => a.localeCompare(b));

        if (!cancelled) {
          setConditionMap(flat);
          setConditionOptions(labels);

          if (groupsArr && groupsArr.length > 0) {
            const norm = groupsArr
              .map((g) => ({
                id: g.id,
                label: g.label,
                items: (g.items || []).filter((k) => !!flat[k]),
              }))
              .filter((g) => g.items.length > 0);

            setConditionGroups(norm.length ? norm : undefined);
          } else {
            setConditionGroups(undefined);
          }
        }
      } catch {
        if (!cancelled) {
          setConditionMap({});
          setConditionOptions([]);
          setConditionGroups(undefined);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Load localized labels for group headings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const get = async (code: string) => {
          try {
            const mod = await import(`../data/condition-groups/${code}.ts`);
            return (mod as any).default || {};
          } catch {
            return {};
          }
        };
        const code = (lang || 'en').toLowerCase();
        const cur = await get(code);
        const en = await get('en');
        const map = { ...en, ...cur };
        if (!cancelled) setGroupLabels(map);
      } catch {
        if (!cancelled) setGroupLabels({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const langLabel: Record<string, string> = {
    en: 'English', it: 'Italiano', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português',
    nl: 'Nederlands', af: 'Afrikaans', ru: 'Русский', pl: 'Polski', tr: 'Türkçe', el: 'Ελληνικά',
    sv: 'Svenska', no: 'Norsk', da: 'Dansk', fi: 'Suomi', cs: 'Čeština', hu: 'Magyar', ro: 'Română',
    he: 'עברית', ar: 'العربية', zh: '中文', hi: 'हिन्दी', ja: '日本語', ko: '한국어',
  };

  useEffect(() => {
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    setTranslating(true);
    (async () => {
      const strings = await loadStrings(lang as any);
      if (!cancelled) {
        setT(ensureDefaults(strings, enStrings as UIStrings));
        setTranslating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const ui = useMemo(() => safeUI(t), [t]);

  type Mode =
    | 'international'
    | 'condition'
    | 'generic'
    | 'leaflet'
    | 'pets'
    | 'pharmacy'
    | 'gp'
    | 'hospital'
    | 'doctor'
    | 'triage';

  type PaywallReason = 'equivalentSearch' | 'leaflet' | 'pets' | 'generics' | 'triage';

  const [originCode, setOriginCode] = useState('');
  const [targetCode, setTargetCode] = useState('');
  const [selectedDrug, setSelectedDrug] = useState('');
  const [selectedDosage, setSelectedDosage] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [mode, setMode] = useState<Mode>('international');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<number | null>(null);
  const [leafletRaw, setLeafletRaw] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [leafletLoading, setLeafletLoading] = useState<Record<string, boolean>>({});
  const [leaflets, setLeaflets] = useState<Record<string, string>>({});
  const [viewLeaflet, setViewLeaflet] = useState<Record<string, boolean>>({});
  const [userAddress, setUserAddress] = useState('');
  const [useGeo, setUseGeo] = useState(false);
  const [geoStr, setGeoStr] = useState('');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);

  const specList = useMemo(() => {
    const fromLang = Array.isArray((t as any)?.ui?.specialties) ? ((t as any).ui.specialties as string[]) : [];
    const fromEn = (enStrings as any)?.ui?.specialties as string[] | undefined;
    const list = fromLang.length ? fromLang : fromEn || [];
    return list.slice().sort((a, b) => a.localeCompare(b));
  }, [t]);

  const [doctorSpec, setDoctorSpec] = useState(specList[0] ?? '');
  useEffect(() => {
    setDoctorSpec((prev) => (specList.includes(prev) ? prev : specList[0] || ''));
  }, [specList]);

  useEffect(() => {
    fetch('https://counterapi.dev/api/hit/medicea.vercel.app/visits')
      .then((res) => res.json())
      .then((d) => setVisits(d.value))
      .catch(() => setVisits(null));
  }, []);

  function resetFieldsForMode(m: Mode) {
    setMode(m);
    setResult('');
    setSelectedDrug('');
    setSelectedDosage('');
    setSelectedCondition('');
    setConditionDetails('');
    setUserNotes('');
    setMatches([]);
    setLeafletRaw('');
    setLeaflets({});
    setLeafletLoading({});
    setViewLeaflet({});
    setUserAddress('');
    setUseGeo(false);
  }

  const plainText = useMemo(() => (typeof result === 'string' ? result : ''), [result]);

  const formattedHTML = useMemo(() => {
    if (!plainText) return '';
    return mode === 'condition' ? boldConditionHeadings(plainText) : plainText;
  }, [plainText, mode]);

  const handleSearch = async () => {
    if (mode === 'triage') return;

    // PREMIUM-ONLY MODES: Pets, Generics, Triage (search button)
    if (mode === 'pets' || mode === 'generic' || mode === 'triage') {
      const reason: PaywallReason =
        mode === 'pets' ? 'pets' : mode === 'generic' ? 'generics' : 'triage';
      setPaywallReason(reason);
      setPaywallVisible(true);
      return;
    }

    // FREE-TIER LIMITS: International equivalents & standalone leaflet (local, client-side)
    if (mode === 'international' && !hasFreeQuota('equivalentSearch')) {
      setPaywallReason('equivalentSearch');
      setPaywallVisible(true);
      return;
    }
    if (mode === 'leaflet' && !hasFreeQuota('leaflet')) {
      setPaywallReason('leaflet');
      setPaywallVisible(true);
      return;
    }

    // SERVER-SIDE LIMITS: enforce quotas in PlanetScale via subscription API
    if (mode === 'international') {
      const { allowed } = await registerUsage('EQUIVALENT_SEARCH');
      if (!allowed) {
        setPaywallReason('equivalentSearch');
        setPaywallVisible(true);
        return;
      }
    }

    if (mode === 'leaflet') {
      const { allowed } = await registerUsage('LEAFLET');
      if (!allowed) {
        setPaywallReason('leaflet');
        setPaywallVisible(true);
        return;
      }
    }

    setLoading(true);
    setResult(F(ui, 'searching', 'Searching…'));
    setMatches([]);
    setLeafletRaw('');
    setLeaflets({});
    setLeafletLoading({});
    setViewLeaflet({});

    const originCountry = originCode || '';
    const targetCountry = targetCode || '';
    const drugName = selectedDrug || '';
    const drugDosage = selectedDosage || '';

    try {
      // Count usage locally only after all checks passed
      if (mode === 'international') {
        incrementUsage('equivalentSearch');
      }

      if (mode === 'leaflet') {
        incrementUsage('leaflet');
        const res = await fetch('/api/openai/leaflet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originCountry, drugName, drugDosage, lang }),
        });
        const payload = await res.json();
        setLeafletRaw(pickText(payload));
        setResult('');
        setLoading(false);
        return;
      }

      if (mode === 'condition') {
        const country = targetCountry || originCountry;

        const query = `
You are a careful medical information assistant. Write in ${lang}. Audience: layperson.
**Do NOT diagnose. Do NOT give specific doses.** Use metric units. If something is unknown, say "Not available".

Condition: "${selectedCondition}"
Country focus: ${country || 'Not specified'}
User context (optional): ${conditionDetails || 'None'}
Allergies / other conditions (optional): ${userNotes || 'None'}

Return **clear, concise Markdown** with these sections and short bullet points where natural. Use localized headings if obvious in ${lang}:

1) Quick summary — 100 words max.
2) What it usually is & common causes — bullets.
3) What you can do now (self-care & lifestyle) — bullets; safe, generic, no dosing.
4) Medicines in ${country || "the user's country"} — split into **OTC vs Rx**; generic examples only; note if access requires a prescription or pharmacist consultation.
5) How to navigate the healthcare system in ${country || "the user's country"} — step-by-step (e.g., pharmacist → GP/primary care → specialist; how referrals/urgent care typically work). Include useful links on the healthcare system in ${country || "the user's country"}.
6) What to say to a pharmacist/doctor — 1–2 short example phrases the user can read out **in ${lang}**.
7) Red flags — bullet list of symptoms that require urgent care **now**.
8) Special populations — pregnancy, children, older adults, chronic conditions (concise bullets).
9) Trusted authorities to search — name national services/regulator (e.g., NHS, Ministry of Health, medicines regulator). **Names only; no links.**
10) Recommendations

Tone: calm, supportive, non-alarming. Be country-aware about access rules and pathways. Keep it compact.
`.trim();

        const res = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            mode,
            originCountry,
            targetCountry,
            selectedDrug,
            selectedDosage,
            lang,
          }),
        });

        const txt = pickText(await res.json());
        const cleaned = stripMarkdownBasic(cleanArtifacts(txt));
        setResult(cleaned || F(ui, 'noResult', 'No results.'));
        setLoading(false);
        return;
      }

      const leafletResp = await fetch('/api/openai/leaflet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCountry, drugName, drugDosage, lang }),
      });
      const leafletPayload = await leafletResp.json();
      setLeafletRaw(pickText(leafletPayload));

      const endpoint =
        mode === 'international'
          ? '/api/openai/equivalent-search'
          : mode === 'generic'
          ? '/api/openai/generics'
          : '/api/openai/pets';

      const res2 = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCountry, targetCountry, drugName, drugDosage, lang }),
      });
      const payload2 = await res2.json();

      if (Array.isArray(payload2?.matches) && payload2.matches.length) {
        setMatches(payload2.matches);
      } else if (payload2?.equivalentResults?.raw_text) {
        const parsed = parseMatchesFromRawText(payload2.equivalentResults.raw_text);
        setMatches(parsed);
        if (!parsed.length) setResult(pickText(payload2) || F(ui, 'noResult', 'No results.'));
      } else {
        const raw = pickText(payload2) || '';
        setResult(raw || F(ui, 'noResult', 'No results.'));
      }

      setLoading(false);
    } catch {
      setResult(F(ui, 'errorOccurred', 'An error occurred.'));
      setLoading(false);
    }
  };

  async function handleFetchLeafletForMatch(medicineName: string) {
    setLeafletLoading((p) => ({ ...p, [medicineName]: true }));
    try {
      const country =
        mode === 'international' || mode === 'pets' ? targetCode || originCode || '' : originCode || '';

      const res = await fetch('/api/openai/leaflet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCountry: country,
          targetCountry: country,
          country,
          drugName: medicineName,
          medicineName,
          drugDosage: selectedDosage || '',
          lang,
        }),
      });
      const data = await res.json();
      setLeaflets((p) => ({ ...p, [medicineName]: pickText(data) }));
      setViewLeaflet((p) => ({ ...p, [medicineName]: true }));
    } catch {
      setLeaflets((p) => ({ ...p, [medicineName]: F(ui, 'leafletFail', 'Failed to fetch leaflet.') }));
      setViewLeaflet((p) => ({ ...p, [medicineName]: true }));
    } finally {
      setLeafletLoading((p) => ({ ...p, [medicineName]: false }));
    }
  }

  /* -------------------------- UI styles -------------------------- */

  const container: React.CSSProperties = { maxWidth: 980, margin: '0 auto', padding: '2rem 1rem' };
  const panel: React.CSSProperties = { background: 'transparent', borderRadius: 12, border: 'transparent', padding: '1rem' };
  const input: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem',
    borderRadius: 10,
    border: 'transparent',
    boxSizing: 'border-box',
    display: 'block',
  };
  const select: React.CSSProperties = input;

  const BTN_WIDTH = 200;
  const BTN_HEIGHT = 40;

  const btn = (
    active: boolean,
    hue:
      | 'blue'
      | 'green'
      | 'red'
      | 'purple'
      | 'teal'
      | 'orange'
      | 'darkblue'
      | 'yellow'
      | 'pink'
      | 'amber'
      | 'darkgreen'
      | 'navy'
      | 'black'
  ): React.CSSProperties => {
    const pal: Record<string, [string, string, string, string]> = {
      blue: active
        ? ['#0b74de', '#69a6ff', '#fff', '#075bb0']
        : ['#e6f0ff', '#f7fbff', '#0b74de', '#bcd6ff'],
      green: active
        ? ['#0ea34a', '#5fd48b', '#fff', '#0b803a']
        : ['#e8f8ef', '#f6fffa', '#0e7c3a', '#b3e6c2'],
      red: active
        ? ['#c61a1a', '#ff7a1a', '#fff', '#9c1515']
        : ['#ffe9e9', '#fff7f7', '#b30000', '#ffcccc'],
      darkgreen: active
        ? ['#065f46', '#10b981', '#fff', '#044733']
        : ['#e6f7ef', '#f6fff9', '#064e3b', '#b2e2c0'],
      darkblue: active
        ? ['#003366', '#3366CC', '#fff', '#001f4d']
        : ['#e8eefc', '#f5f7ff', '#002855', '#bcd0f5'],
      yellow: active
        ? ['#facc15', '#fde68a', '#000', '#d6ad00']
        : ['#fffbe6', '#fffef7', '#92400e', '#f9e69b'],
    };

    const [c1, c2, txt] = pal[hue] || ['#ccc', '#eee', '#000', '#bbb'];

    return {
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      padding: '6px 10px',
      borderRadius: 10,
      border: 'none',
      cursor: 'pointer',
      background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
      color: txt,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      lineHeight: 1.15,
      fontWeight: 700,
      fontSize: '0.95rem',
      transition: 'background 0.15s ease, transform 0.1s ease',
    };
  };

  /* -------------------------- RENDER -------------------------- */

  const sloganHTML = stylizeBrand(typeof (ui as any)?.slogan === 'string' ? (ui as any).slogan : '');

  return (
    <main key={lang} style={container}>
      <style>{`
  .ai-plain{background:#f6f9ff;border:transparent;border-radius:14px;padding:16px 18px;overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";font-size:1.05rem;font-weight:450}
  .leaflet-block{margin-top:12px}
  @keyframes pulseDots{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}

  button:active{filter:brightness(0.85);transform:translateY(1px)}

  .pill { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 200px; height: 44px; padding: 0 18px; border-radius: 9999px; font-weight: 700; font-size: 0.95rem; line-height: 1.15; text-align: center; white-space: normal; word-break: break-word; user-select: none; cursor: pointer; border: 1px solid rgba(0,0,0,0.25); box-shadow: inset 0 -8px 16px rgba(0,0,0,0.28), inset 0 10px 22px rgba(255,255,255,0.45), 0 8px 18px rgba(0,0,0,0.22); }
  .pill::before { content: ""; position: absolute; top: 6%; left: 6%; right: 6%; height: 38%; border-radius: 9999px; background: linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.55) 60%, rgba(255,255,255,0.0) 100%); pointer-events: none; }
  .pill::after { content: ""; position: absolute; inset: 1px; border-radius: 9999px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 12px 24px rgba(255,255,255,0.12); pointer-events: none; }
  .pill.is-active{ transform: translateY(2px); filter: brightness(0.95); box-shadow: inset 0 -5px 12px rgba(0,0,0,0.32), inset 0 8px 18px rgba(255,255,255,0.40), 0 6px 14px rgba(0,0,0,0.20); }

  .pill--blue { color: #ffffff; background: linear-gradient(#bfe6ff 0%, #8fd2ff 40%, #55adff 60%, #1b7fe5 100%); }
  .pill--blue:active { background: linear-gradient(#a6dbff 0%, #4f99d5ff 40%, #165da0ff 60%, #053163ff 100%); filter: brightness(0.95); transform: translateY(1px); }
  .pill--blue.is-active{ background: linear-gradient(#9ed5ff 0%, #4f99d5ff 40%, #165da0ff 60%, #053163ff 100%); }

  .pill--green { color: #ffffff; background: linear-gradient(#c9f7b2 0%, #93ea7c 40%, #47c24f 60%, #1e9e3a 100%); }
  .pill--green:active { background: linear-gradient(#b7f09a 0%, #48c927ff 40%, #0d8a17ff 60%, #035717ff 100%); filter: brightness(0.95); transform: translateY(1px); }
  .pill--green.is-active{ background: linear-gradient(#baf19d 0%, #48c927ff 40%, #0d8a17ff 60%, #035717ff 100%)); }

  .pill--red { color: #ffffff; background: linear-gradient(#ffc1b8 0%, #ff8f85 40%, #e2554d 60%, #bb2222 100%); }
  .pill--red:active { background: linear-gradient(#ffb1a6 0%, #c95e54ff 40%, #921d17ff 60%, #670505ff 100%); filter: brightness(0.95); transform: translateY(1px); }
  .pill--red.is-active{ background: linear-gradient(#ffb0a6 0%, #c95e54ff 40%, #921d17ff 60%, #670505ff 100%); }

  .pill--yellow { color: #5a4a00; background: linear-gradient(#fff2a6 0%, #ffe067 40%, #ffca3a 60%, #f0b100 100%); }
  .pill--yellow:active { background: linear-gradient(#ffe88e 0%, #cab05bff 40%, #b48b23ff 60%, #6a4f04ff 100%); filter: brightness(0.95); transform: translateY(1px); }
  .pill--yellow.is-active{ background: linear-gradient(#ffe88e 0%, #cab05bff 40%, #b48b23ff 60%, #6a4f04ff 100%)); }

  .pill[disabled], .pill--disabled { opacity: 0.5; cursor: not-allowed; box-shadow: inset 0 -6px 12px rgba(0,0,0,0.20), inset 0 8px 18px rgba(255,255,255,0.35), 0 4px 10px rgba(0,0,0,0.12); }

  .pill-sm { width: auto; height: 36px; padding: 0 12px; font-size: 0.9rem; border-radius: 9999px; }

  .pill--blue.is-active { background: linear-gradient(#9ed5ff 0%, #4f99d5ff 40%, #165da0ff 60%, #053163ff 100%) !important; filter: brightness(0.96); transform: translateY(2px); }
  .pill--green.is-active { background: linear-gradient(#b7f09a 0%, #48c927ff 40%, #0d8a17ff 60%, #035717ff 100%) !important; filter: brightness(0.96); transform: translateY(2px); }
  .pill--red.is-active { background: linear-gradient(#ffb1a6 0%, #c95e54ff 40%, #921d17ff 60%, #670505ff 100%) !important; filter: brightness(0.96); transform: translateY(2px); }
  .pill--yellow.is-active { background: linear-gradient(#ffe88e 0%, #cab05bff 40%, #b48b23ff 60%, #6a4f04ff 100%) !important; color: #5a4a00; filter: brightness(0.96); transform: translateY(2px); }

  /* Pill container – desktop: flex; mobile: 2-column grid */
  .pill-group {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 12px 0 8px;
  }

  @media (max-width: 1024px) {
    .pill-group {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-width: 420px;
      margin: 12px auto 8px;
      gap: 6px;
    }
  }

  @media (max-width: 640px) {
    .pill-group {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-width: 360px;
      margin: 12px auto 8px;
      gap: 6px;
    }

    .pill {
      width: 100%;
      height: 40px;
      font-size: 0.85rem;
      padding: 0 10px;
    }
  }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" alt="medicéa" style={{ width: '100%', maxWidth: 650, height: 'auto', margin: '0 auto 20px' }} />

        {hydrated && (
          <p
            style={{
              fontFamily: "'Caveat','Patrick Hand','Shadows Into Light','Segoe UI',cursive",
              fontSize: '1.3rem',
              lineHeight: 1.45,
              color: '#333',
              margin: '0 0 12px',
            }}
            dangerouslySetInnerHTML={{ __html: sloganHTML }}
            suppressHydrationWarning
          />
        )}

        <LanguageButton />

        {/* Mode buttons */}
        {/* TOP BUTTON ROW (PILLS) */}
        <div className="pill-group-wrapper">
          <div className="pill-group">
            <button
              className={`pill pill--blue ${mode === 'international' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('international')}
            >
              {F(ui, 'btnIntl', 'International Medicine Search')}
            </button>

            <button
              className={`pill pill--blue ${mode === 'generic' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('generic')}
            >
              {F(ui, 'btnGen', 'Search Generic')}
            </button>

            <button
              className={`pill pill--blue ${mode === 'leaflet' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('leaflet')}
            >
              {F(ui, 'btnLeaflet', 'Medicine Leaflet')}
            </button>

            <button
              className={`pill pill--red ${mode === 'condition' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('condition')}
            >
              {F(ui, 'btnCond', 'Search by Medical Condition')}
            </button>

            <button
              className={`pill pill--green ${mode === 'pharmacy' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('pharmacy')}
            >
              {F(ui, 'btnPharmacy', 'Search Pharmacy')}
            </button>

            <button
              className={`pill pill--green ${mode === 'hospital' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('hospital')}
            >
              {F(ui, 'btnHospital', 'Search Hospital')}
            </button>

            <button
              className={`pill pill--green ${mode === 'gp' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('gp')}
            >
              {F(ui, 'btnGP', 'Search GP')}
            </button>

            <button
              className={`pill pill--green ${mode === 'doctor' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('doctor')}
            >
              {F(ui, 'btnDoctor', 'Search Doctor')}
            </button>

            <button
              className={`pill pill--red ${mode === 'triage' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('triage')}
            >
              {F(ui, 'btnTriage', 'Symptoms Triage')}
            </button>

            <button
              className={`pill pill--yellow ${mode === 'pets' ? 'is-active' : ''}`}
              onClick={() => resetFieldsForMode('pets')}
            >
              {F(ui, 'btnPets', 'Meds 4 Pets')}
            </button>
          </div>
        </div>

        {/* BANNER */}

      </div>

      {/* FORM */}
      {mode !== 'triage' && (
        <div style={{ ...panel, display: 'grid', gap: '10px', maxWidth: 640, margin: '0 auto' }}>
          {/* Home country */}
          {mode !== 'condition' && mode !== 'pharmacy' && mode !== 'gp' && mode !== 'hospital' && mode !== 'doctor' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phHome', 'Please select your Home Country')}</div>
              <select value={originCode} onChange={(e) => setOriginCode(e.target.value)} style={select}>
                <option value="" disabled>—</option>
                {Object.entries(countriesByRegion).map(([region, list]) => (
                  <optgroup key={region} label={region}>
                    {list.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Condition mode */}
          {mode === 'condition' && (
            <>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'condSelect', 'Select or type a condition')}</div>
                <select onChange={(e) => setSelectedCondition(e.target.value)} value={selectedCondition} style={select}>
                  <option value="" disabled>—</option>
                  {(conditionGroups ?? []).map((g) => (
                    <optgroup key={g.id} label={(groupLabels[g.id] || g.label)}>
                      {(g.items || []).map((key) => (
                        <option key={key} value={conditionMap[key] || key}>
                          {conditionMap[key] || key}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'condContext', 'Add helpful context (optional)')}</div>
                <textarea
                  placeholder={F(ui, 'condContextPH', 'Symptoms, duration, prior meds, past issues…')}
                  value={conditionDetails}
                  onChange={(e) => setConditionDetails(e.target.value)}
                  style={{ ...input, minHeight: 80 }}
                />
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'condAllergies', 'Allergies / Pathologies (optional)')}</div>
                <textarea
                  placeholder={F(ui, 'condAllergiesPH', 'e.g., penicillin allergy, kidney disease…')}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  style={{ ...input, minHeight: 60 }}
                />
              </div>
            </>
          )}

          {/* Drug + dose */}
          {mode !== 'condition' && mode !== 'pharmacy' && mode !== 'gp' && mode !== 'hospital' && mode !== 'doctor' && (
            <>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phMed', 'Please select/enter medicine name')}</div>
                <input
                  type="text"
                  placeholder={F(ui, 'phMedPH', 'Please select/enter medicine name')}
                  value={selectedDrug}
                  onChange={(e) => setSelectedDrug(e.target.value)}
                  style={input}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder={F(ui, 'phDose', 'Dosage (optional)')}
                  value={selectedDosage}
                  onChange={(e) => setSelectedDosage(e.target.value)}
                  style={input}
                />
              </div>
            </>
          )}

          {/* Target country */}
          {(mode === 'international' || mode === 'condition' || mode === 'pets') && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phTarget', 'Please select the Country to search')}</div>
              <select value={targetCode} onChange={(e) => setTargetCode(e.target.value)} style={select}>
                <option value="" disabled>—</option>
                {Object.entries(countriesByRegion).map(([region, list]) => (
                  <optgroup key={region} label={region}>
                    {list.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Location flows */}
          {(mode === 'pharmacy' || mode === 'gp' || mode === 'hospital' || mode === 'doctor') && (
            <>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'addressPrompt', 'Enter an address (or use device location)')}</div>
                <input
                  type="text"
                  placeholder={F(ui, 'addressPH', 'Street, City, Country…')}
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  style={input}
                />
              </div>

              {mode === 'doctor' && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'doctorSpec', 'Doctor specialty')}</div>
                  <select value={doctorSpec} onChange={(e) => setDoctorSpec(e.target.value)} style={select}>
                    {specList.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              )}

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', userSelect: 'none' }}>
                <input type="checkbox" checked={useGeo} onChange={(e) => setUseGeo(e.target.checked)} />
                {F(ui, 'useDeviceLocation', 'Use device location')}
              </label>
            </>
          )}

          {/* Submit */}
          <button
            onClick={handleSearch}
            disabled={
              loading ||
              (mode === 'international' && !(originCode && selectedDrug && targetCode)) ||
              (mode === 'generic' && !(originCode && selectedDrug)) ||
              (mode === 'leaflet' && !(originCode && selectedDrug)) ||
              (mode === 'condition' && !(selectedCondition && targetCode)) ||
              (mode === 'pets' && !(originCode && selectedDrug && targetCode)) ||
              (mode === 'pharmacy' && !(userAddress || useGeo)) ||
              (mode === 'gp' && !(userAddress || useGeo)) ||
              (mode === 'hospital' && !(userAddress || useGeo)) ||
              (mode === 'doctor' && !((userAddress || useGeo) && doctorSpec))
            }
            className={`pill pill--blue${loading ? ' pill--disabled' : ''}`}
            style={{ width: '100%' }}
          >
            {loading
              ? '…'
              : mode === 'international'
              ? F(ui, 'searchIntl', 'Search International Equivalents')
              : mode === 'condition'
              ? F(ui, 'searchCond', 'Search by Condition')
              : mode === 'generic'
              ? F(ui, 'searchGen', 'Search Generics')
              : mode === 'leaflet'
              ? F(ui, 'searchLeaflet', 'Search Leaflet')
              : mode === 'pets'
              ? F(ui, 'searchPets', 'Search Pet Medicines')
              : F(ui, 'openMaps', 'Open in Google Maps')}
          </button>
        </div>
      )}

      {/* RESULTS */}
      {mode !== 'triage' && (
        <div style={{ marginTop: 12 }}>
          {/* Leaflet content */}
          {(mode === 'leaflet' || mode === 'international' || mode === 'generic' || mode === 'pets') && leafletRaw && (
            <div className="leaflet-block">
              {renderLeafletPretty(extractLeafletText(leafletRaw), t)}
            </div>
          )}

          {/* >>> Banner ONLY for international/generic/pets (NOT leaflet) <<< */}
          {(mode === 'international' || mode === 'generic' || mode === 'pets') && leafletRaw && (
            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 8,
                fontSize: '1.50rem',
              }}
            >
              {(() => {
                const bannerDrug = (selectedDrug || '').trim();

                // Country choice depends on mode:
                // - generic  → originCode (home country)
                // - intl/pets → targetCode (fallback to origin)
                const countryCode =
                  mode === 'generic'
                    ? (originCode || '')
                    : (targetCode || originCode || '');

                // Human label for the country, if present
                const bannerCountry = (() => {
                  const c = (countryCode || '').trim();
                  if (!c) return '';
                  try {
                    return new Intl.DisplayNames([lang], { type: 'region' }).of(c) || c;
                  } catch {
                    return c;
                  }
                })();

                // Dynamic header + intro per mode
                const header =
                  mode === 'generic'
                    ? F(ui, 'genHeader', 'Generics')
                    : mode === 'pets'
                    ? F(ui, 'petEquivHeader', 'Equivalent pet medicines')
                    : F(ui, 'equivHeader', 'Equivalent medicines');

                // Build default intro text with graceful country handling
                const baseName = bannerDrug || F(ui, 'thisMedicine', 'this medicine');
                let introDefault = '';

                if (mode === 'generic') {
                  introDefault = bannerCountry
                    ? `Below is the list of generics for ${baseName} available in ${bannerCountry}.`
                    : `Below is the list of generics for ${baseName}.`;
                } else if (mode === 'pets') {
                  introDefault = bannerCountry
                    ? `Below is the list of equivalent pet medicines for ${baseName} available in ${bannerCountry}.`
                    : `Below is the list of equivalent pet medicines for ${baseName}.`;
                } else {
                  introDefault = bannerCountry
                    ? `Below is the list of equivalent medicines for ${baseName} available in ${bannerCountry}.`
                    : `Below is the list of equivalent medicines for ${baseName}.`;
                }

                const introKey =
                  mode === 'generic' ? 'genIntro' : mode === 'pets' ? 'petEquivIntro' : 'equivIntro';

                return (
                  <>
                    <strong style={{ color: '#8d052eff' }}>{header}</strong>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {F(ui, introKey, introDefault, {
                        drugName: baseName,
                        targetCountry: bannerCountry,
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Matches list */}
          {Array.isArray(matches) && matches.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {matches.map((m: any, idx: number) => {
                const medname = m?.medicine_name ?? m?.Medicine_name ?? `Medicine ${idx + 1}`;
                const isLeafletLoading = !!leafletLoading[medname];
                const leafletText = leaflets[medname];
                const showLF = !!viewLeaflet[medname];
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: '12px 14px',
                      margin: '8px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{medname}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (!leafletText) {
                              handleFetchLeafletForMatch(medname);
                            } else {
                              setViewLeaflet((p) => ({ ...p, [medname]: !p[medname] }));
                            }
                          }}
                          disabled={isLeafletLoading}
                          className={`pill pill--blue pill-sm${isLeafletLoading ? ' pill--disabled' : ''}`}
                        >
                          {isLeafletLoading
                            ? F(ui, 'loadingLeaflet', 'Loading leaflet…')
                            : showLF
                            ? F(ui, 'hideLeaflet', 'Hide leaflet')
                            : F(ui, 'viewLeaflet', 'View leaflet')}
                        </button>
                      </div>
                    </div>

                    {showLF && leafletText && (
                      <div
                        style={{
                          background: '#f6f9ff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          padding: '10px 12px',
                          marginTop: 10,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {renderLeafletPretty(extractLeafletText(leafletText), t)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Plain AI text (e.g., for condition mode) */}
          {!!plainText && (!Array.isArray(matches) || matches.length === 0) && (
            <div className="ai-plain" dangerouslySetInnerHTML={{ __html: formattedHTML }} />
          )}
        </div>
      )}

      {/* TRIAGE */}
      {mode === 'triage' && (
        <div style={{ marginTop: 16 }}>
          <SymptomTriage />
        </div>
      )}

      {/* DISCLAIMER */}
      <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2rem' }}>
        <p style={{ textAlign: 'justify' }}>
          <strong style={{ color: '#cc0000', textDecoration: 'underline' }}>{F(t as any, 'disclaimerTitle', 'DISCLAIMER')}</strong>
        </p>

        {hydrated && (
          <p
            style={{ textAlign: 'justify' }}
            dangerouslySetInnerHTML={{ __html: stylizeBrand(((t as any).disclaimerP1HTML || (enStrings as any).disclaimerP1HTML || '')) }}
            suppressHydrationWarning
          />
        )}
        {hydrated && (
          <p
            style={{ textAlign: 'justify' }}
            dangerouslySetInnerHTML={{ __html: stylizeBrand(((t as any).disclaimerP2HTML || (enStrings as any).disclaimerP2HTML || '')) }}
            suppressHydrationWarning
          />
        )}
        {hydrated && (
          <p
            style={{ textAlign: 'justify' }}
            dangerouslySetInnerHTML={{ __html: stylizeBrand(((t as any).disclaimerP3HTML || (enStrings as any).disclaimerP3HTML || '')) }}
            suppressHydrationWarning
          />
        )}
        {hydrated && (
          <p
            style={{ textAlign: 'justify' }}
            dangerouslySetInnerHTML={{ __html: stylizeBrand(((t as any).disclaimerP4HTML || (enStrings as any).disclaimerP4HTML || '')) }}
            suppressHydrationWarning
          />
        )}
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', margin: '20px 0', color: '#6b7280', fontSize: '0.85rem' }}>
        {hydrated && visits !== null && <div>{F(ui, 'visitsLabel', 'Visits')}: {visits.toLocaleString()}</div>}
        <div style={{ marginTop: 6 }}>
          © {new Date().getFullYear()} <strong><span style={{ color: '#1E73BE' }}>medi</span><span style={{ color: '#008080' }}>céa</span>®</strong> by GES Consultancy Ltd. {F(t as any, 'footerAllRights', 'All rights reserved.')}
        </div>
        <div>
          <a href="/terms" style={{ color: '#0b74de' }}>
            {F((t as any).ui, 'termsLink', 'Terms & Conditions')}
          </a>
        </div>
      </div>

      {/* PREMIUM PAYWALL */}
      <PremiumPaywall
        visible={paywallVisible}
        reason={paywallReason ?? undefined}
        onClose={() => setPaywallVisible(false)}
        onUpgrade={() => {
          setPaywallVisible(false);
          if (typeof window !== 'undefined') {
            // Replace this URL later with your real Google Play / Premium page
            window.open('https://medicea.global/premium', '_blank');
          }
        }}
      />

      {/* TRANSLATION OVERLAY */}
      {translating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '16px 20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              textAlign: 'center',
              minWidth: 280,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {F(ui, 'translatingTo', 'Translating to')} {langLabel[lang] || lang}…
            </div>
            <div style={{ opacity: 0.75 }}>{F(ui, 'pleaseWait', 'Please wait.')}</div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------- STYLES -------------------------- */

const styles: Record<string, React.CSSProperties> = {
  leafletCard: { background: '#f6f9ff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' },
  h4: { fontWeight: 700, marginBottom: 4 },
  p: { margin: '6px 0', lineHeight: 1.5 },
  ul: { margin: '6px 0 6px 16px', padding: 0 },
  li: { margin: '4px 0' },
};
