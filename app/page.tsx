/* 
===============================================================================
Fixed banner logic for "Generics" label + country, and removed banner from Leaflet
+ Added basic free-usage limits + Premium paywall
+ Local search branch for Pharmacy/Hospital/GP/Doctor → Google Maps
+ Geolocation wiring (Use device location)
+ Feature flag: NEXT_PUBLIC_ENABLE_USAGE_LIMITS
+ Brand replacer handles ™ → ® everywhere
+ (UPDATE) Single-button Maps: pin if GPS, otherwise address search
+ (UPDATE) Slogan uses small/lighter ® via <sup class="rmark">®</sup>
+ (UPDATE 25-Nov) Address flow now drops a **pin** for typed addresses (not a list)
+ (UPDATE 25-Nov) Added .brand1 / .brand2 classes so slogan word shows colored like logo
===============================================================================
*/

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, FileText, Pill, Stethoscope, PawPrint, Hospital, HeartPulse, UserRound, Cross, ShieldCheck } from 'lucide-react';
import countriesByRegion from '../data/countries';
import { LanguageProvider, useLanguage } from './LanguageProvider';
import LanguageButton from './components/LanguageButton';
import CountryPicker from './components/CountryPicker';
import SymptomTriage from './components/SymptomTriage';

import PremiumPaywall from './components/PremiumPaywall';
import enStrings from './i18n/en.json';
import { isRTL, loadStrings } from './i18n/i18n';
import { registerUsage } from './lib/subscriptionClient';
import { hasFreeQuota, incrementUsage } from './lib/usageTracker';

/** Feature flag: turn free-usage limits on/off from env */
const BETA_TESTING = process.env.NEXT_PUBLIC_BETA_TESTING === 'true';
const LIMITS_ON = !BETA_TESTING && process.env.NEXT_PUBLIC_ENABLE_USAGE_LIMITS === 'true';

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

/* NEW: open a Maps **pin** for any place/address string */
function mapsPlaceUrl(place: string) {
  return `https://www.google.com/maps/place/${encodeURIComponent(place)}`;
}

function parseCoords(s: string | null | undefined): { lat: number; lng: number } | null {
  const m = (s || '').match(/^\s*(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)\s*$/);
  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[3]) } : null;
}

/** Brand replacer for body content (not used for slogan) */
function stylizeBrand(html: string) {
  if (!html) return html;
  const logo = `<strong><span style="color:#1E73BE">medi</span><span style="color:#008080">céa</span>®</strong>`;
  let out = html;
  out = out.replace(/<strong>\s*medicéa[™®]?\s*<\/strong>/gi, 'medicéa®');
  out = out.replace(/<b>\s*medicéa[™®]?\s*<\/b>/gi, 'medicéa®');
  out = out.replace(/medicéa[™®]?/gi, logo);
  out = out.replace(/medicea[™®]?/gi, logo);
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
  const [screen, setScreen] = useState<'search' | 'tools' | 'care' | 'results'>('search');
  const [activeSection, setActiveSection] = useState<'search' | 'tools' | 'care'>('search');
  const [searched, setSearched] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  function revealWorkspace() {
    requestAnimationFrame(() => {
      const nav = document.getElementById('workspace-start');
      if (!nav) return;
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
      const rect = nav.getBoundingClientRect();
      // Switching visible tabs must not move the page. Reveal navigation only
      // when returning from results or a tool further down the page.
      if (rect.top < headerBottom || rect.bottom > window.innerHeight) {
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - headerBottom - 12), behavior: 'instant' });
      }
    });
  }
  function showScreen(next: 'search' | 'tools' | 'care' | 'results') {
    const returningFromResults = screen === 'results' && next !== 'results';
    setScreen(next);
    if (next === 'tools' || next === 'care') setActiveSection(next);
    if (returningFromResults) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    } else revealWorkspace();
  }
  function clearSearch() {
    resetFieldsForMode(mode);
    setOriginCode(''); setTargetCode(''); setSearched(false);
    showScreen('search');
  }
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

  /** Geolocation fetch when the user ticks "Use device location" */
  useEffect(() => {
    if (!useGeo) {
      setGeoStr('');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStr('near me');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoStr(`${latitude},${longitude}`); // Google Maps accepts "lat,long"
      },
      () => setGeoStr('near me'),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
    );
  }, [useGeo]);

  function resetFieldsForMode(m: Mode) {
    setMode(m);
    setScreen('search');
    setSearched(false);
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
    if (screen === 'results') requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    else revealWorkspace();
  }

  const plainText = useMemo(() => (typeof result === 'string' ? result : ''), [result]);

  const formattedHTML = useMemo(() => {
    if (!plainText) return '';
    return mode === 'condition' ? boldConditionHeadings(plainText) : plainText;
  }, [plainText, mode]);

  const handleSearch = async () => {
    if (mode === 'triage') return;

    /* ---------------- LOCAL SEARCH BRANCH: open Google Maps ---------------- */
    if (mode === 'pharmacy' || mode === 'hospital' || mode === 'gp' || mode === 'doctor') {
      const addr = useGeo ? geoStr : userAddress.trim();
      if (!addr) return;
      const coords = parseCoords(addr);
      const location = coords ? `${coords.lat},${coords.lng}` : addr;
      const careType = mode === 'pharmacy' ? 'pharmacies'
        : mode === 'hospital' ? 'hospitals'
        : mode === 'gp' ? 'general practitioners'
        : `${doctorSpec.trim() || 'medical'} doctors`;
      if (typeof window !== 'undefined') {
        window.open(mapsUrl(`${careType} near ${location}`), '_blank', 'noopener,noreferrer');
      }
      return; // prevent falling into AI path
    }
    /* ---------------------------------------------------------------------- */

    // PREMIUM-ONLY MODES: Pets, Generics, Triage (search button)
type PremiumMode = Extract<Mode, 'pets' | 'generic' | 'triage'>;
const isPremiumMode = (m: Mode): m is PremiumMode =>
  m === 'pets' || m === 'generic' || m === 'triage';

if (!BETA_TESTING && isPremiumMode(mode)) {
  const reason: PaywallReason = mode === 'pets' ? 'pets' : mode === 'generic' ? 'generics' : 'triage';
  setPaywallReason(reason);
  setPaywallVisible(true);
  return;
}

    // FREE-TIER LIMITS (client/local)
    if (LIMITS_ON) {
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
    }

    // SERVER-SIDE LIMITS
    if (LIMITS_ON && mode === 'international') {
      const { allowed } = await registerUsage('equivalentSearch');
      if (!allowed) {
        setPaywallReason('equivalentSearch');
        setPaywallVisible(true);
        return;
      }
    }

    if (LIMITS_ON && mode === 'leaflet') {
      const { allowed } = await registerUsage('leaflet');
      if (!allowed) {
        setPaywallReason('leaflet');
        setPaywallVisible(true);
        return;
      }
    }

    setSearchFailed(false);
    setSearched(true);
    showScreen('results');
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
      if (LIMITS_ON && mode === 'international') {
        incrementUsage('equivalentSearch');
      }

      if (LIMITS_ON && mode === 'leaflet') {
        incrementUsage('leaflet');
      }

      if (mode === 'leaflet') {
        const res = await fetch('/api/openai/leaflet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originCountry, drugName, drugDosage, lang }),
        });
        if (!res.ok) throw new Error('Medicine service unavailable');
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

        if (!res.ok) throw new Error('Medicine service unavailable');
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
      if (!leafletResp.ok) throw new Error('Medicine service unavailable');
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
      if (!res2.ok) throw new Error('Medicine service unavailable');
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
      setSearchFailed(true);
      setLeafletRaw('');
      setResult(F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.'));
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


  const input: React.CSSProperties = {};
  const select: React.CSSProperties = {};

  /* -------------------------- RENDER -------------------------- */

  return (
    <main key={lang} className={`medicea-shell flow-${screen}`} dir={isRTL(lang) ? 'rtl' : 'ltr'}>
      <header className="site-header">
        <a className="brand-link" href="/" aria-label="medicea home"><img src="/logo.png" alt="medicéa" /></a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#workspace-start" onClick={(event) => { event.preventDefault(); showScreen('tools'); }}>{F(ui, 'medicineTools', 'Medicine tools')}</a>
          <a href="#workspace-start" onClick={(event) => { event.preventDefault(); showScreen('care'); }}>{F(ui, 'findCare', 'Find care')}</a>
        </nav>
        <div className="language-control"><LanguageButton /></div>
      </header>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">{F(ui, 'travelCompanion', 'Your medicine companion')}</span>
          <h1>{F(ui, 'modernHeadline', 'Your medicine, wherever you are.')}</h1>
          <p>{F(ui, 'modernSubtitle', 'Explore medicine information and equivalents across countries.')}</p>
        </div>
      </section>
      <nav className="workspace-nav" id="workspace-start" aria-label={F(ui, 'medicineTools', 'Medicine tools')}>
        <button aria-pressed={activeSection === 'search'} onClick={() => { setActiveSection('search'); resetFieldsForMode('international'); }}><Search size={18}/>{F(ui, 'findMedicine', 'Find a medicine')}</button>
        <button aria-pressed={activeSection === 'tools'} onClick={() => showScreen('tools')}><Pill size={18}/>{F(ui, 'medicineTools', 'Medicine tools')}</button>
        <button aria-pressed={activeSection === 'care'} onClick={() => showScreen('care')}><Cross size={18}/>{F(ui, 'careNearby', 'Find care nearby')}</button>
      </nav>
      <div className="workspace-panels">
      <div className="workspace-grid">
      <section className="search-area" id="medicine-search" tabIndex={-1} aria-labelledby="search-title">
      <div className="section-heading"><span className="section-icon"><Search size={22} /></span><div>
        <h2 id="search-title">{mode === 'international' ? F(ui, 'findMedicine', 'Find a medicine') :
          mode === 'generic' ? F(ui, 'btnGen', 'Search Generic') :
          mode === 'leaflet' ? F(ui, 'btnLeaflet', 'Medicine Leaflet') :
          mode === 'condition' ? F(ui, 'btnCond', 'Search by Medical Condition') :
          mode === 'triage' ? F(ui, 'btnTriage', 'Symptoms Triage') :
          mode === 'pets' ? F(ui, 'btnPets', 'Meds 4 Pets') :
          mode === 'pharmacy' ? F(ui, 'btnPharmacy', 'Search Pharmacy') :
          mode === 'doctor' ? F(ui, 'btnDoctor', 'Search Doctor') :
          mode === 'hospital' ? F(ui, 'btnHospital', 'Search Hospital') : F(ui, 'btnGP', 'Search GP')}</h2>
        <p>{F(ui, 'searchIntro', 'Choose your details to get started.')}</p>
      </div></div>
      {searched && !loading && <button className="return-results" onClick={() => showScreen('results')}>{F(ui, 'viewResults', 'View results')} <ArrowRight size={16}/></button>}
      {/* FORM */}
      {mode !== 'triage' && (
        <div className="medicine-form">
          {/* Home country */}
          {mode !== 'condition' && mode !== 'pharmacy' && mode !== 'gp' && mode !== 'hospital' && mode !== 'doctor' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phHome', 'Please select your Home Country')}</div>
              <CountryPicker rememberHome label={F(ui, 'phHome', 'Home country')} value={originCode} onChange={setOriginCode} searchLabel={F(ui, 'searchCountry', 'Search countries')} regionLabel={F(ui, 'allRegions', 'All continents')} emptyLabel={F(ui, 'noCountries', 'No countries found')} />
            </div>
          )}

          {/* Target country */}
          {(mode === 'international' || mode === 'condition' || mode === 'pets') && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phTarget', 'Please select the Country to search')}</div>
              <CountryPicker label={F(ui, 'phTarget', 'Destination country')} value={targetCode} onChange={setTargetCode} searchLabel={F(ui, 'searchCountry', 'Search countries')} regionLabel={F(ui, 'allRegions', 'All continents')} emptyLabel={F(ui, 'noCountries', 'No countries found')} />
            </div>
          )}


          {/* Condition mode */}
          {mode === 'condition' && (
            <>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'condSelect', 'Select or type a condition')}</div>
                <select required aria-label={F(ui, 'condSelect', 'Select or type a condition')} onChange={(e) => setSelectedCondition(e.target.value)} value={selectedCondition} style={select}>
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
                  required aria-label={F(ui, 'phMed', 'Medicine name')} placeholder={F(ui, 'phMedPH', 'Please select/enter medicine name')}
                  value={selectedDrug}
                  onChange={(e) => setSelectedDrug(e.target.value)}
                  style={input}
                />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'phDose', 'Dosage (optional)')}</div>
                <input
                  type="text"
                  aria-label={F(ui, 'phDose', 'Dosage (optional)')} placeholder={F(ui, 'phDose', 'Dosage (optional)')}
                  value={selectedDosage}
                  onChange={(e) => setSelectedDosage(e.target.value)}
                  style={input}
                />
              </div>
            </>
          )}

          {/* Location flows */}
          {(mode === 'pharmacy' || mode === 'gp' || mode === 'hospital' || mode === 'doctor') && (
            <>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{F(ui, 'addressPrompt', 'Enter an address (or use device location')}</div>
                <input
                  type="text"
                  required={!useGeo} aria-label={F(ui, 'addressPrompt', 'Enter an address (or use device location)')} placeholder={F(ui, 'addressPH', 'Street, City, Country…')}
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

          <button type="button" className="clear-search" disabled={loading} onClick={clearSearch}>{F(ui, 'clearSearch', 'Clear search')}</button>
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
              (mode === 'pharmacy' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'gp' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'hospital' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'doctor' && !((useGeo ? geoStr : userAddress.trim()) && doctorSpec))
            }
            className={`pill pill--blue search-submit${loading ? ' pill--disabled' : ''}`}
            aria-busy={loading}
          >
            <Search size={19} aria-hidden="true" />
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
          <ArrowRight size={19} aria-hidden="true" />
          </button>
          <p className="search-note"><ShieldCheck size={17} />{F(ui, 'educationalNote', 'Medicine information is educational. Confirm suitability with a pharmacist.')}</p>
        </div>
      )}
      {mode === 'triage' && <SymptomTriage />}
      </section>
      <aside className="medicine-tools" id="medicine-tools">
        <h2>{F(ui, 'exploreTools', 'Explore medicine tools')}</h2>
        <div className="tool-grid">
          {([
            ['international', 'btnIntl', 'International Medicine Search', Search],
            ['leaflet', 'btnLeaflet', 'Medicine Leaflet', FileText],
            ['generic', 'btnGen', 'Search Generic', Pill],
            ['condition', 'btnCond', 'Search by Medical Condition', HeartPulse],
            ['pets', 'btnPets', 'Meds 4 Pets', PawPrint],
            ['triage', 'btnTriage', 'Symptoms Triage', Stethoscope],
          ] as const).map(([value, key, fallback, Icon]) => (
            <button type="button" key={value} className={`tool-card ${mode === value ? 'is-active' : ''}`}
              aria-pressed={mode === value} onClick={() => resetFieldsForMode(value)}>
              <span className="tool-icon"><Icon size={25} aria-hidden="true" /></span>
              <span className="tool-label">{F(ui, key, fallback)}</span><ArrowRight size={16} className="tool-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </aside>
      </div>
      <section className="care-section" id="find-care">
        <h2>{F(ui, 'careNearby', 'Find care nearby')}</h2>
        <p>{F(ui, 'careIntro', 'Locate healthcare services at your destination.')}</p>
        <div className="care-grid">
          {([
            ['pharmacy', 'btnPharmacy', 'Search Pharmacy', Cross],
            ['doctor', 'btnDoctor', 'Search Doctor', Stethoscope],
            ['hospital', 'btnHospital', 'Search Hospital', Hospital],
            ['gp', 'btnGP', 'Search GP', UserRound],
          ] as const).map(([value, key, fallback, Icon]) => (
            <button type="button" key={value} className={`care-card ${mode === value ? 'is-active' : ''}`}
              aria-pressed={mode === value} onClick={() => resetFieldsForMode(value)}>
              <span className="tool-icon"><Icon size={24} aria-hidden="true" /></span>
              <span>{F(ui, key, fallback)}</span><ArrowRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* RESULTS */}
      {mode !== 'triage' && searched && (
        <section id="search-results" className="results-view" tabIndex={-1} aria-label={F(ui, 'searchResults', 'Search results')}>
          <div className="results-heading">
            <div><h2>{F(ui, 'searchResults', 'Search results')}</h2><p role="status" aria-live="polite">{loading ? F(ui, 'searching', 'Searching…') : searchFailed ? F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.') : F(ui, 'searchComplete', 'Search complete')}</p></div>
            <div className="results-actions"><button disabled={loading} onClick={() => showScreen('search')}>{F(ui, 'editSearch', 'Edit search')}</button><button disabled={loading} onClick={clearSearch}>{F(ui, 'newSearch', 'New search')}</button></div>
          </div>
          {/* Leaflet content */}
          {(mode === 'leaflet' || mode === 'international' || mode === 'generic' || mode === 'pets') && leafletRaw && (
            <div className="leaflet-block">
              <h2 className="medicine-section-title">{F(ui, 'medicineDetails', 'Medicine details')} — {selectedDrug}</h2>
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
                    <h2 className="medicine-section-title">{header}</h2>
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
        </section>
      )}

      </div>
      {/* DISCLAIMER */}
      <div className="medical-disclaimer">
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
