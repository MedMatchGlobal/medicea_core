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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import DOMPurify from 'dompurify';
import SavedSearches from './components/SavedSearches';
import {SAVED_SEARCH_KEY, readSavedSearches, addSavedSearch, isSavedMode, type SavedSearch} from './lib/saved-searches';
import {savedSearchCopy} from './i18n/saved-searches';
import type {VeterinarySection} from './lib/veterinary-sections';
import { ArrowRight, Search, FileText, Pill, Stethoscope, Hospital, HeartPulse, UserRound, Cross, ShieldCheck } from 'lucide-react';
import countriesByRegion from '../data/countries';
import { useLanguage } from './LanguageProvider';
import LanguageButton from './components/LanguageButton';
import TravelHeader from './components/TravelHeader';
import CoastalBanner from './components/CoastalBanner';
import CountryPicker from './components/CountryPicker';
import ConditionPicker from './components/ConditionPicker';
import VeterinaryCare from './components/VeterinaryCare';
import PharmacyTripPanel from './components/PharmacyTripPanel';
import {pharmacyReminder, pharmacyHistoryEntry, isPharmacyTripEntry, type PharmacyTrip} from './lib/pharmacy-trip';
import PetMedicineInformation from './components/PetMedicineInformation';
import {veterinaryIngredients, type VeterinaryIngredient} from './lib/veterinary-details';
import {officialMedicineLeafletSearch} from './lib/veterinary-details';
import {petGenericsLabel} from './i18n/pet-generics';
import {leafletActions} from './i18n/leaflet-actions';
import MedicineSources from './components/MedicineSources';
import {matchingFeedback} from './i18n/matching-feedback';
import {MatchingSearchError,matchingFailure} from './lib/matching-failure';
import {leafletSections} from './lib/leaflet-sections';
import {readStructuredLeaflet} from './lib/leaflet-contract';
import StructuredLeafletSections from './components/StructuredLeafletSections';
import {connectedCopy} from './i18n/travel-connected';
import {isMedicineName,isEmptyMatchText} from './lib/match-display';
import {emptyMatchCopy} from './i18n/empty-match';
import {originChoiceCopy} from './i18n/origin-choice';
type OriginVariant={name:string;form:string;ingredients:VeterinaryIngredient[];sources:string[];token:string};
import { conditionAdditions } from '../data/condition-additions';
import { searchFeedback } from './i18n/search-feedback';
import { careSearchQuery } from './lib/care-search';
import SymptomTriage from './components/SymptomTriage';
import {useMembershipPreview} from './components/MembershipAccess';
import MembershipFooter from './components/MembershipFooter';
import {useMembershipCopy} from './i18n/membership';
import {membershipFetch,checkMembershipAccess,MembershipAccessError,SAVE_DRAFT_EVENT,storeSearchDraft,takeSearchDraft,rememberSearchReturn} from './lib/membership-client';

import PremiumPaywall from './components/PremiumPaywall';
import enStrings from './i18n/en.json';
import { isRTL, loadStrings, SUPPORTED_LANGS } from './i18n/i18n';
import { registerUsage } from './lib/subscriptionClient';
import { hasFreeQuota, incrementUsage } from './lib/usageTracker';

/** Feature flag: turn free-usage limits on/off from env */
const BETA_TESTING = process.env.NEXT_PUBLIC_BETA_TESTING === 'true';
const LIMITS_ON = !BETA_TESTING && process.env.NEXT_PUBLIC_ENABLE_USAGE_LIMITS === 'true';

/* -------------------------- WRAPPER -------------------------- */

export function MedicineWorkspace({ petMode = false,sourceOriginMode=false,travelDemo=false }: { petMode?: boolean;sourceOriginMode?:boolean;travelDemo?:boolean }) {
  return <Home petMode={petMode} sourceOriginMode={sourceOriginMode} travelDemo={travelDemo}/>;
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

function renderLeafletPretty(leafletText: string, t: UIStrings,omitComposition=false,lang='en') {
  if (!leafletText) return null;
  const structured=readStructuredLeaflet(leafletText);
  if(structured)return <div style={styles.leafletCard}><StructuredLeafletSections sections={structured} lang={lang} headings={t.leafletHeadings} notice={connectedCopy(lang).unverified}/></div>;

  const cleaned = leafletText;

  const blocks = leafletSections(cleaned);
  if (!blocks.length) return <div style={styles.leafletCard}>{bulletifyBlock(cleaned)}</div>;

  return (
    <div style={styles.leafletCard}>
      {blocks.filter(block=>!omitComposition||!['Active Ingredients','Strength','Formulation'].includes(block.key)).map(({ key, text }) => {
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
  if (lines.length && !isMedicineName(lines[0].replace(/^(?:\d+[.)]|[-•*])\s*/, ''))) return [];
  const items: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(?:\d+[.)]|[-•*])\s*(.+)$/);
    items.push(m ? m[1].trim() : l);
  }
  const seen = new Set<string>();
  const out: Array<{ medicine_name: string }> = [];
  for (let name of items) {
    name = name.replace(/\s*[;,.]$/, '').trim();
    if (!isMedicineName(name) || seen.has(name)) continue;
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
  const logo = `<strong><span class="brand1">medi</span><span class="brand2">céa</span>®</strong>`;
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

function Home({ petMode = false,sourceOriginMode=false,travelDemo=false }: { petMode?: boolean;sourceOriginMode?:boolean;travelDemo?:boolean }) {
  const membershipEnabled=useMembershipPreview();
  const {copy:membershipCopy}=useMembershipCopy();
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

  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const pendingSavedSearch = useRef<SavedSearch | null>(null);

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

        Object.assign(flat, conditionAdditions(lang).labels);
        groupsArr = [...(groupsArr || []), {id: 'additional', label: '', items: Object.keys(conditionAdditions(lang).labels)}];
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
    | 'pet-generic'
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
  const [mode, setMode] = useState<Mode>(petMode ? 'pets' : 'international');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkingAccess,setCheckingAccess]=useState(false);
  const [screen, setScreen] = useState<'search' | 'tools' | 'care' | 'results'>('search');
  const [activeSection, setActiveSection] = useState<'search' | 'tools' | 'care'>('search');
  const [searched, setSearched] = useState(false);
  const searchVersion = useRef(0);
  const [searchFailed, setSearchFailed] = useState(false);
  const [pharmacyTrip, setPharmacyTrip] = useState<PharmacyTrip | null>(null);
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
  const pharmacyTripRef = useRef<PharmacyTrip | null>(null);
  const pharmacyOpenRef = useRef(false);

  useLayoutEffect(() => {
    if(new URLSearchParams(window.location.search).get('resume')==='1'&&restorePendingSearch())return;
    if (pendingSavedSearch.current) {
      const saved = pendingSavedSearch.current;
      if ((saved.mode === 'pets' || saved.mode === 'pet-generic') === petMode) {pendingSavedSearch.current = null; applySavedSearch(saved);}
      return;
    }
    if (isPharmacyTripEntry(window.history.state, pharmacyTripRef.current)) return;
    resetFieldsForMode(petMode ? 'pets' : 'international');
    if (petMode) {setActiveSection('search'); return;}
    const navigation = new URLSearchParams(window.location.search);
    if (navigation.get('service') === 'pharmacy') {
      resetFieldsForMode('pharmacy'); setActiveSection('care'); setUserAddress(navigation.get('location') || ''); return;
    }
    const section = navigation.get('section');
    if (section === 'tools' || section === 'care') {
      setScreen(section); setActiveSection(section);
    }
  }, [petMode]);

  function restoreMedicineResults() {
    pharmacyOpenRef.current = false; setPharmacyOpen(false);
    const scrollY = pharmacyTripRef.current?.scrollY ?? 0;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({top:scrollY,behavior:'instant'})));
  }
  function backFromPharmacy() {
    if (isPharmacyTripEntry(window.history.state, pharmacyTripRef.current)) window.history.back();
    else restoreMedicineResults();
  }
  function abandonPharmacyTrip() {
    const trip = pharmacyTripRef.current;
    if (trip && isPharmacyTripEntry(window.history.state, trip)) {
      const {mediceaPharmacyTrip, ...state} = window.history.state;
      window.history.replaceState(state, '', trip.returnUrl);
    }
    pharmacyTripRef.current = null; pharmacyOpenRef.current = false;
    setPharmacyTrip(null); setPharmacyOpen(false);
  }
  function openPharmacyTrip(country: string) {
    const trip: PharmacyTrip = {id:crypto.randomUUID(), country,
      medicines:pharmacyReminder(selectedDrug,matches),
      returnUrl:window.location.pathname + window.location.search + window.location.hash,
      scrollY:window.scrollY};
    pharmacyTripRef.current = trip; pharmacyOpenRef.current = true;
    setPharmacyTrip(trip); setPharmacyOpen(true);
    const destination = new URL(window.location.href);
    destination.searchParams.set('service','pharmacy'); destination.searchParams.set('location',country);
    destination.hash = '';
    window.history.pushState(pharmacyHistoryEntry(window.history.state,trip.id), '', destination);
    requestAnimationFrame(() => window.scrollTo({top:0,behavior:'instant'}));
  }
  useEffect(() => {
    const onHistory = (event: PopStateEvent) => {
      if (isPharmacyTripEntry(event.state, pharmacyTripRef.current)) {
        pharmacyOpenRef.current = true; setPharmacyOpen(true);
        requestAnimationFrame(() => window.scrollTo({top:0,behavior:'instant'}));
      } else if (pharmacyOpenRef.current) restoreMedicineResults();
    };
    window.addEventListener('popstate',onHistory);
    return () => window.removeEventListener('popstate',onHistory);
  }, []);

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
    if (pharmacyOpenRef.current) abandonPharmacyTrip();
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
  const [originLeafletVisible, setOriginLeafletVisible] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [originSources,setOriginSources]=useState<string[]>([]);
  const [originIngredients,setOriginIngredients]=useState<VeterinaryIngredient[]>([]);
  const [noExactMatch,setNoExactMatch]=useState(false);
  const [originVariants,setOriginVariants]=useState<OriginVariant[]>([]);
  const [originProductName,setOriginProductName]=useState('');
  const [petOriginIngredients, setPetOriginIngredients] = useState<VeterinaryIngredient[]>([]);
  const [searchAccess,setSearchAccess]=useState<string|undefined>();
  const [leafletLoading, setLeafletLoading] = useState<Record<string, boolean>>({});
  const [leaflets, setLeaflets] = useState<Record<string, string>>({});
  const [viewLeaflet, setViewLeaflet] = useState<Record<string, boolean>>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [restoredSearch, setRestoredSearch] = useState<SavedSearch | null>(null);
  const completedSearchContext = useRef<{lang:string;mode:Mode;originCode:string;targetCode:string;selectedDrug:string;selectedDosage:string} | null>(null);
  const [petInformation, setPetInformation] = useState<Record<string,VeterinarySection[]>>({});
  useEffect(() => {
    try {setSavedSearches(readSavedSearches(localStorage.getItem(SAVED_SEARCH_KEY)));} catch {}
    const sync=(event:StorageEvent)=>{if(event.key===SAVED_SEARCH_KEY || event.key===null) setSavedSearches(readSavedSearches(event.newValue));};
    window.addEventListener('storage',sync);return ()=>window.removeEventListener('storage',sync);
  }, []);
  function saveCurrentSearch() {
    if (!isSavedMode(mode) || loading || searchFailed || !searched) return;
    try {
      const existing=readSavedSearches(localStorage.getItem(SAVED_SEARCH_KEY));
      const context=completedSearchContext.current;
      if (!context || !isSavedMode(context.mode)) return;
      const next=addSavedSearch(existing,{...context,id:crypto.randomUUID(),savedAt:new Date().toISOString(),mode:context.mode,
        result,leafletRaw,matches,originSources,originIngredients,noExactMatch,originProductName,petOriginIngredients,leaflets,petInformation,searchAccess});
      localStorage.setItem(SAVED_SEARCH_KEY,JSON.stringify(next));setSavedSearches(next);
      setSaveMessage(`${savedSearchCopy(lang).save} ✓ · ${savedSearchCopy(lang).notice}`);
    } catch {setSaveMessage(savedSearchCopy(lang).error);}
  }
  function removeSavedSearch(id:string) {
    try {const next=readSavedSearches(localStorage.getItem(SAVED_SEARCH_KEY)).filter(s=>s.id!==id);
      localStorage.setItem(SAVED_SEARCH_KEY,JSON.stringify(next));setSavedSearches(next);setSaveMessage('');
    } catch {setSaveMessage(savedSearchCopy(lang).error);}
  }
  function applySavedSearch(saved:SavedSearch) {
    resetFieldsForMode(saved.mode);
    completedSearchContext.current=saved;
    setOriginCode(saved.originCode);setTargetCode(saved.targetCode);setSelectedDrug(saved.selectedDrug);setSelectedDosage(saved.selectedDosage);
    setResult(DOMPurify.sanitize(saved.result));setLeafletRaw(saved.leafletRaw);setMatches(saved.matches);
    setOriginSources(saved.originSources||[]);
    setOriginIngredients(saved.originIngredients||[]);setNoExactMatch(saved.noExactMatch===true);setOriginProductName(saved.originProductName||'');setOriginVariants([]);
    setPetOriginIngredients(saved.petOriginIngredients);setLeaflets(saved.leaflets);setPetInformation(saved.petInformation);
    setSearchAccess(saved.searchAccess);
    setSearchFailed(false);setSearched(true);setScreen('results');setActiveSection(saved.mode==='generic'||saved.mode==='leaflet'?'tools':'search');
    setRestoredSearch(saved);setSaveMessage('');
    if (SUPPORTED_LANGS.includes(saved.lang as any)) setLang(saved.lang as typeof lang);
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
  }
  function openSavedSearch(saved:SavedSearch) {
    abandonPharmacyTrip();
    const isPet=saved.mode==='pets'||saved.mode==='pet-generic';
    if (isPet !== petMode) {pendingSavedSearch.current=saved;router.push(isPet?'/pets':'/');}
    else {window.history.replaceState(window.history.state,'',isPet?'/pets':'/');applySavedSearch(saved);}
  }
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

  const [doctorSpec, setDoctorSpec] = useState('');
  useEffect(() => {
    setDoctorSpec((prev) => (specList.includes(prev) ? prev : ''));
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
    setSearchAccess(undefined);
    abandonPharmacyTrip();
    searchVersion.current += 1;
    setLoading(false);
    setMode(m);
    setRestoredSearch(null);setSaveMessage('');setPetInformation({});completedSearchContext.current=null;
    setScreen('search');
    setSearched(false);
    setResult('');
    setSelectedDrug('');
    setSelectedDosage('');
    setSelectedCondition('');
    setConditionDetails('');
    setUserNotes('');
    setMatches([]);setOriginSources([]);setOriginIngredients([]);setNoExactMatch(false);setOriginVariants([]);setOriginProductName('');
    setPetOriginIngredients([]);
    setLeafletRaw('');
    setOriginLeafletVisible(true);
    setLeaflets({});
    setLeafletLoading({});
    setViewLeaflet({});
    setUserAddress('');
    setDoctorSpec('');
    setUseGeo(false);
    if (screen === 'results') requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    else revealWorkspace();
  }

  const plainText = useMemo(() => (typeof result === 'string' ? result : ''), [result]);

  const formattedHTML = useMemo(() => {
    if (!plainText) return '';
    return mode === 'condition' ? boldConditionHeadings(plainText) : plainText;
  }, [plainText, mode]);

  function restorePendingSearch() {
    const draft=takeSearchDraft('medicea.pending-search');
    if(!draft||!['international','generic','leaflet','condition','pets','pet-generic','triage'].includes(draft.mode)||
      (draft.mode==='pets'||draft.mode==='pet-generic')!==petMode)return false;
    resetFieldsForMode(draft.mode);
    const text=(value:unknown,max=10000)=>typeof value==='string'?value.slice(0,max):'';
    setOriginCode(text(draft.originCode,100));setTargetCode(text(draft.targetCode,100));
    setSelectedDrug(text(draft.selectedDrug,300));setSelectedDosage(text(draft.selectedDosage,300));
    setSelectedCondition(text(draft.selectedCondition,300));setConditionDetails(text(draft.conditionDetails));setUserNotes(text(draft.userNotes));
    if(SUPPORTED_LANGS.includes(draft.lang))setLang(draft.lang);
    setActiveSection(draft.mode==='generic'||draft.mode==='leaflet'||draft.mode==='condition'||draft.mode==='triage'?'tools':'search');
    if(draft.searched&&isSavedMode(draft.mode)) {
      // Reuse the explicit saved-result validator before restoring generated content.
      const [saved]=readSavedSearches(JSON.stringify([{...draft,id:'pending',savedAt:new Date().toISOString()}]));
      if(saved)applySavedSearch(saved);
    }
    window.history.replaceState(window.history.state,'',petMode?'/pets':'/');
    return true;
  }
  useEffect(()=>{
    if(!membershipEnabled)return;
    const save=()=>storeSearchDraft('medicea.pending-search',{mode,lang,originCode,targetCode,selectedDrug,selectedDosage,selectedCondition,conditionDetails,userNotes,
      searched:searched&&!loading&&!searchFailed&&!originVariants.length,result,leafletRaw,matches,originSources,originIngredients,noExactMatch,originProductName,petOriginIngredients,leaflets,petInformation,searchAccess});
    window.addEventListener(SAVE_DRAFT_EVENT,save);return()=>window.removeEventListener(SAVE_DRAFT_EVENT,save);
  },[membershipEnabled,mode,lang,originCode,targetCode,selectedDrug,selectedDosage,selectedCondition,conditionDetails,userNotes,searched,loading,searchFailed,result,leafletRaw,matches,originSources,originIngredients,noExactMatch,originProductName,originVariants,petOriginIngredients,leaflets,petInformation,searchAccess]);

  const handleSearch = async (selection?:OriginVariant) => {
    if(loading||checkingAccess)return;
    const version = searchVersion.current;
    if (mode === 'triage') return;

    /* ---------------- LOCAL SEARCH BRANCH: open Google Maps ---------------- */
    if (mode === 'pharmacy' || mode === 'hospital' || mode === 'gp' || mode === 'doctor') {
      const addr = useGeo ? geoStr : userAddress.trim();
      if (!addr) return;
      const coords = parseCoords(addr);
      const location = coords ? `${coords.lat},${coords.lng}` : addr;
      if (typeof window !== 'undefined') {
        window.open(mapsUrl(careSearchQuery(mode, location, doctorSpec)), '_blank', 'noopener,noreferrer');
      }
      return; // prevent falling into AI path
    }
    /* ---------------------------------------------------------------------- */
    setCheckingAccess(true);
    try {await checkMembershipAccess(membershipEnabled);}catch{return;}finally{setCheckingAccess(false);}

    // PREMIUM-ONLY MODES: Pets, Generics, Triage (search button)
type PremiumMode = Extract<Mode, 'pets' | 'pet-generic' | 'generic' | 'triage'>;
const isPremiumMode = (m: Mode): m is PremiumMode =>
  m === 'pets' || m === 'pet-generic' || m === 'generic' || m === 'triage';

if (!membershipEnabled && !BETA_TESTING && isPremiumMode(mode)) {
  const reason: PaywallReason = (mode === 'pets' || mode === 'pet-generic') ? 'pets' : mode === 'generic' ? 'generics' : 'triage';
  setPaywallReason(reason);
  setPaywallVisible(true);
  return;
}

    // FREE-TIER LIMITS (client/local)
    if (!membershipEnabled && LIMITS_ON) {
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
    if (!membershipEnabled && LIMITS_ON && mode === 'international') {
      const { allowed } = await registerUsage('equivalentSearch');
      if (!allowed) {
        setPaywallReason('equivalentSearch');
        setPaywallVisible(true);
        return;
      }
    }

    if (!membershipEnabled && LIMITS_ON && mode === 'leaflet') {
      const { allowed } = await registerUsage('leaflet');
      if (!allowed) {
        setPaywallReason('leaflet');
        setPaywallVisible(true);
        return;
      }
    }

    if (version !== searchVersion.current) return;
    setSearchFailed(false);
    setOriginVariants([]);setOriginProductName(selection?.name||'');
    setRestoredSearch(null);setSaveMessage('');setPetInformation({});
    completedSearchContext.current={lang,mode,originCode,targetCode,selectedDrug,selectedDosage};
    setSearched(true);
    showScreen('results');
    setLoading(true);
    setResult(F(ui, 'searching', 'Searching…'));
    setMatches([]);setOriginSources([]);setOriginIngredients([]);setNoExactMatch(false);
    setPetOriginIngredients([]);
    setSearchAccess(undefined);
    setLeafletRaw('');
    setOriginLeafletVisible(true);
    setLeaflets({});
    setLeafletLoading({});
    setViewLeaflet({});

    const originCountry = originCode || '';
    const targetCountry = targetCode || '';
    const drugName = selectedDrug || '';
    const drugDosage = selectedDosage || '';
    let originInformation:Promise<void>|undefined;
    const loadOriginInformation=(name:string,token?:string)=>(async()=>{
      const response=await fetch('/api/openai/leaflet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({originCountry,drugName:name,drugDosage,lang,...(token?{originSelection:token,originQueryName:drugName}:{})})});
      if(!response.ok)return;const payload=await response.json();if(version!==searchVersion.current)return;setLeafletRaw(pickText(payload));
    })().catch(()=>{});

    try {
      // Count usage locally only after all checks passed
      if (!membershipEnabled && LIMITS_ON && mode === 'international') {
        incrementUsage('equivalentSearch');
      }

      if (!membershipEnabled && LIMITS_ON && mode === 'leaflet') {
        incrementUsage('leaflet');
      }

      if (mode === 'leaflet') {
        const res = await membershipFetch('/api/openai/leaflet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originCountry, drugName, drugDosage, lang }),
        });
        if (!res.ok) throw new Error('Medicine service unavailable');
        const payload = await res.json();
      if (version !== searchVersion.current) return;
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

        const res = await membershipFetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            mode,
            originCountry,
            targetCountry,
            selectedDrug,
            selectedDosage,
            selectedCondition: selectedCondition.trim(),
            conditionDetails,
            userNotes,
            lang,
          }),
        });

        if (!res.ok) throw new Error('Medicine service unavailable');
        const txt = pickText(await res.json());
      if (version !== searchVersion.current) return;
        const cleaned = stripMarkdownBasic(cleanArtifacts(txt));
        setResult(cleaned || F(ui, 'noResult', 'No results.'));
        setLoading(false);
        return;
      }

      if (!membershipEnabled && mode !== 'pets' && mode !== 'pet-generic' && (!sourceOriginMode||selection)) {
        originInformation=loadOriginInformation(selection?.name||drugName,selection?.token);
      }

      const endpoint =
        mode === 'international'
          ? '/api/openai/equivalent-search'
          : mode === 'generic'
          ? '/api/openai/generics'
          : mode === 'pet-generic'
          ? '/api/openai/pet-generics'
          : '/api/openai/pets';

      const res2 = await membershipFetch(membershipEnabled?'/api/membership/search':endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCountry, targetCountry, drugName, drugDosage, lang, ...(selection?{originSelection:selection.token}:{}), ...(membershipEnabled?{mode}:{}) }),
      });
      if (!res2.ok) {
        const failure=await res2.json().catch(()=>({}));
        if(version!==searchVersion.current)return;
        if(failure.originProfile&&['international','generic'].includes(mode)){
          setOriginIngredients(veterinaryIngredients(failure.originProfile));
          setOriginProductName(failure.originProfile.medicine_name||selection?.name||'');
          setOriginSources(failure.equivalentResults?.origin_sources||[]);
          if(!membershipEnabled&&!originInformation&&failure.originProfile.selection_token)originInformation=loadOriginInformation(failure.originProfile.medicine_name,failure.originProfile.selection_token);
        }
        if(res2.status===409&&failure.error==='CHOOSE_ORIGIN_VARIANT'&&Array.isArray(failure.variants)&&failure.variants.length){
          await originInformation;if(version!==searchVersion.current)return;
          setOriginVariants(failure.variants);setLeafletRaw('');setResult('');setLoading(false);return;
        }
        throw matchingFailure(res2.status,failure.error);
      }
      const payload2 = await res2.json();
      if (version !== searchVersion.current) return;
      setSearchAccess(payload2.searchAccess);
      setOriginSources(payload2.equivalentResults?.origin_sources||[]);
      setOriginProductName(payload2.originProfile?.medicine_name||selection?.name||'');
      if(!membershipEnabled&&!originInformation&&payload2.originProfile?.selection_token)originInformation=loadOriginInformation(payload2.originProfile.medicine_name,payload2.originProfile.selection_token);
      if(mode==='international'||mode==='generic')setOriginIngredients(veterinaryIngredients(payload2.originProfile));
      if(membershipEnabled&&payload2.originLeaflet)setLeafletRaw(pickText(payload2.originLeaflet));
      if (mode === 'pets' || mode === 'pet-generic') setPetOriginIngredients(veterinaryIngredients(payload2.originProfile));

      if (['source_cited_full_composition','model_generated_full_composition'].includes(payload2?.equivalentResults?.verification)&&Array.isArray(payload2.matches)) {
        const usable=payload2.matches.filter((m:any)=>isMedicineName(m?.medicine_name));
        if(payload2.matches.length&&!usable.length)throw matchingFailure(503,'UNUSABLE_RESULT');
        setMatches(usable);setNoExactMatch(!usable.length);setResult('');
      } else if (Array.isArray(payload2?.matches) && payload2.matches.length) {
        const usable=payload2.matches.filter((m:any)=>isMedicineName(m?.medicine_name??m?.Medicine_name));
        if(!usable.length)throw matchingFailure(503,'UNUSABLE_RESULT');setMatches(usable);setResult('');
      } else if (payload2?.equivalentResults?.raw_text) {
        const parsed = parseMatchesFromRawText(payload2.equivalentResults.raw_text);
        setMatches(parsed);
        if(!parsed.length){if(isEmptyMatchText(payload2.equivalentResults.raw_text)){setNoExactMatch(true);setResult('');}else throw matchingFailure(503,'UNUSABLE_RESULT');}
      } else {
        const raw = pickText(payload2) || '';
        setResult(raw || F(ui, 'noResult', 'No results.'));
      }

      await originInformation;
      if (version !== searchVersion.current) return;
      setLoading(false);
    } catch (error) {
      await originInformation;
      if (version !== searchVersion.current) return;
      if(error instanceof MembershipAccessError){setSearched(false);setScreen('search');setLoading(false);return;}
      setSearchFailed(true);
    setOriginLeafletVisible(true);
      setResult(error instanceof MatchingSearchError ? matchingFeedback(lang)[error.kind] : F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.'));
      setLoading(false);
    }
  };

  async function handleFetchLeafletForMatch(medicineName: string) {
    const version = searchVersion.current;
    setLeafletLoading((p) => ({ ...p, [medicineName]: true }));
    try {
      const country =
        mode === 'international' || mode === 'pets' ? targetCode || originCode || '' : originCode || '';

      const res = await membershipFetch('/api/openai/leaflet', {
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
          searchAccess,
        }),
      });
      const data = await res.json();
      if (version !== searchVersion.current) return;
      setLeaflets((p) => ({ ...p, [medicineName]: pickText(data) }));
      setViewLeaflet((p) => ({ ...p, [medicineName]: true }));
    } catch (error) {
      if(error instanceof MembershipAccessError)return;
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
    <main key={lang} className={`medicea-shell flow-${screen}${travelDemo ? " travel-discovery-preview" : ""}${membershipEnabled ? " membership-preview" : ""}${petMode ? " pet-theme" : ""}${pharmacyOpen ? " pharmacy-trip-active" : ""}`} dir={isRTL(lang) ? 'rtl' : 'ltr'}>
      {travelDemo?<TravelHeader active={petMode?'pets':activeSection} onSection={petMode?undefined:section=>{if(section==='search'){setActiveSection('search');resetFieldsForMode('international');}else showScreen(section);}}/>:<header className="site-header">
        <Link className="brand-link" href="/" aria-label="medicea home"><img src="/logo.png" alt="medicéa" /></Link>
        {membershipEnabled&&<Link className="header-account" href="/membership" onClick={()=>rememberSearchReturn()}>{membershipCopy.account}</Link>}
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/" aria-current={!pharmacyOpen && !petMode && activeSection === 'search' ? 'page' : undefined} onClick={petMode ? undefined : (event) => {event.preventDefault(); setActiveSection('search'); resetFieldsForMode('international');}}>{F(ui, 'findMedicine', 'Find a medicine')}</Link>
          <Link href="/?section=tools" aria-current={!pharmacyOpen && !petMode && activeSection === 'tools' ? 'page' : undefined} onClick={petMode ? undefined : (event) => {event.preventDefault(); showScreen('tools');}}>{F(ui, 'medicineTools', 'Health tools')}</Link>
          <Link href="/?section=care" aria-current={pharmacyOpen || !petMode && activeSection === 'care' ? 'page' : undefined} onClick={petMode ? undefined : (event) => {event.preventDefault(); showScreen('care');}}>{F(ui, 'findCare', 'Find care')}</Link>
          <Link href="/pets" aria-current={petMode && !pharmacyOpen ? 'page' : undefined}>{F(ui, 'btnPets', 'Meds 4 Pets')}</Link>
        </nav>
        <div className="language-control"><LanguageButton /></div>
      </header>}
      {travelDemo?<CoastalBanner title={petMode?F(ui,'btnPets','Meds 4 Pets'):activeSection==='tools'?F(ui,'medicineTools','Health tools'):activeSection==='care'?F(ui,'findCare','Find care'):F(ui,'modernHeadline','Your medicine, wherever you are.')}/>:<section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">{F(ui, 'travelCompanion', 'Your medicine companion')}</span>
          <h1>{petMode ? F(ui, 'btnPets', 'Meds 4 Pets') : F(ui, 'modernHeadline', 'Your medicine, wherever you are.')}</h1>
          <p>{petMode ? searchFeedback(lang).petNotice : F(ui, 'modernSubtitle', 'Explore medicine information and equivalents across countries.')}</p>
        </div>
      </section>}
      <SavedSearches lang={lang} entries={savedSearches} modeLabel={saved=>saved.mode==='pets'?F(ui,'petEquivHeader','Equivalent pet medicines'):saved.mode==='pet-generic'?petGenericsLabel(lang):saved.mode==='generic'?F(ui,'genHeader','Generics'):saved.mode==='leaflet'?F(ui,'btnLeaflet','Medicine leaflet'):F(ui,'equivHeader','Equivalent medicines')} onOpen={openSavedSearch} onRemove={removeSavedSearch} />
      {saveMessage && <p className="saved-search-status" role="status">{saveMessage}</p>}
      <div id="workspace-start" />
      {petMode && <nav className="workspace-nav" aria-label={F(ui, 'btnPets', 'Meds 4 Pets')}>
        <button type="button" aria-pressed={mode === 'pets'} disabled={loading} onClick={() => resetFieldsForMode('pets')}>{F(ui, 'petEquivHeader', 'Equivalent pet medicines')}</button>
        <button type="button" aria-pressed={mode === 'pet-generic'} disabled={loading} onClick={() => resetFieldsForMode('pet-generic')}>{petGenericsLabel(lang)}</button>
      </nav>}
      {pharmacyTrip && <div hidden={!pharmacyOpen}>
        <PharmacyTripPanel key={pharmacyTrip.id} trip={pharmacyTrip} lang={lang} onBack={backFromPharmacy}
          onSave={saveCurrentSearch} saveLabel={savedSearchCopy(lang).save}
          title={F(ui, 'btnPharmacy', 'Search pharmacy')} addressLabel={F(ui, 'addressPrompt', 'Enter an address (or use device location)')}
          addressPlaceholder={F(ui, 'addressPH', 'Street, City, Country…')} useLocationLabel={F(ui, 'useDeviceLocation', 'Use device location')}
          openLabel={F(ui, 'openMaps', 'Open in Google Maps')} notice={searchFeedback(lang).careNotice} />
      </div>}
      <div className="workspace-panels">
      <div className="workspace-grid">
      <section className="search-area" id="medicine-search" tabIndex={-1} aria-labelledby="search-title">
      <div className="section-heading"><span className="section-icon"><Search size={22} /></span><div>
        <h2 id="search-title">{mode === 'international' ? F(ui, 'findMedicine', 'Find a medicine') :
          mode === 'generic' ? F(ui, 'btnGen', 'Search Generic') :
          mode === 'leaflet' ? F(ui, 'btnLeaflet', 'Medicine Leaflet') :
          mode === 'condition' ? F(ui, 'btnCond', 'Search by Medical Condition') :
          mode === 'triage' ? F(ui, 'btnTriage', 'Symptoms Triage') :
          mode === 'pet-generic' ? petGenericsLabel(lang) :
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
                <ConditionPicker label={F(ui, 'condSelect', 'Select or type a condition')}
                  value={selectedCondition} onChange={setSelectedCondition} hint={conditionAdditions(lang).hint}
                  groups={(conditionGroups ?? []).map(g => ({label: groupLabels[g.id] || g.label,
                    items: g.items.map(key => conditionMap[key] || key)}))} />
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
                    <option value="">{F(ui, 'btnDoctor', 'Search doctor')}</option>
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
            onClick={()=>handleSearch()}
            disabled={
              loading || checkingAccess ||
              (mode === 'international' && !(originCode && selectedDrug && targetCode)) ||
              (mode === 'generic' && !(originCode && selectedDrug)) ||
              (mode === 'leaflet' && !(originCode && selectedDrug)) ||
              (mode === 'condition' && !(selectedCondition.trim() && targetCode)) ||
              (mode === 'pets' && !(originCode && selectedDrug && targetCode)) ||
              (mode === 'pet-generic' && !(originCode && selectedDrug)) ||
              (mode === 'pharmacy' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'gp' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'hospital' && !(useGeo ? geoStr : userAddress.trim())) ||
              (mode === 'doctor' && !(useGeo ? geoStr : userAddress.trim()))
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
              : mode === 'pet-generic'
              ? petGenericsLabel(lang)
              : mode === 'pets'
              ? F(ui, 'searchPets', 'Search Pet Medicines')
              : F(ui, 'openMaps', 'Open in Google Maps')}
          <ArrowRight size={19} aria-hidden="true" />
          </button>
          <p className="search-note"><ShieldCheck size={17} />{(mode === 'pets' || mode === 'pet-generic') ? searchFeedback(lang).petNotice : ['doctor','hospital','gp','pharmacy'].includes(mode) ? searchFeedback(lang).careNotice : F(ui, 'educationalNote', 'Medicine information is educational. Confirm suitability with a pharmacist.')}</p>
        </div>
      )}
      {mode === 'triage' && <SymptomTriage />}
      </section>
      {!petMode && <aside className="medicine-tools" id="medicine-tools">
        <h2>{F(ui, 'exploreTools', 'Explore medicine tools')}</h2>
        <div className="tool-grid">
          {([
            ['leaflet', 'btnLeaflet', 'Medicine Leaflet', FileText],
            ['generic', 'btnGen', 'Search Generic', Pill],
            ['condition', 'btnCond', 'Search by Medical Condition', HeartPulse],
            ['triage', 'btnTriage', 'Symptoms Triage', Stethoscope],
          ] as const).map(([value, key, fallback, Icon]) => (
            <button type="button" key={value} className={`tool-card ${mode === value ? 'is-active' : ''}`}
              aria-pressed={mode === value} onClick={() => resetFieldsForMode(value)}>
              <span className="tool-icon"><Icon size={25} aria-hidden="true" /></span>
              <span className="tool-label">{F(ui, key, fallback)}</span><ArrowRight size={16} className="tool-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </aside>}
      </div>
      {petMode && screen === 'search' && <VeterinaryCare lang={lang}
        locationLabel={F(ui, 'addressPH', 'Street, City, Country…')}
        placeholder={F(ui, 'addressPH', 'Street, City, Country…')}
        openLabel={F(ui, 'openMaps', 'Open in Google Maps')}
        notice={searchFeedback(lang).careNotice} />}
      {!petMode && <section className="care-section" id="find-care">
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
      </section>}

      {/* RESULTS */}
      {mode !== 'triage' && searched && (
        <section id="search-results" className="results-view" tabIndex={-1} aria-label={F(ui, 'searchResults', 'Search results')}>
          <div className="results-heading">
            <div><h2>{F(ui, 'searchResults', 'Search results')}</h2><p role="status" aria-live="polite">{loading ? F(ui, 'searching', 'Searching…') : originVariants.length ? originChoiceCopy(lang).title : searchFailed ? (['international','generic','pets','pet-generic'].includes(mode)?matchingFeedback(lang).incomplete:F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.')) : F(ui, 'searchComplete', 'Search complete')}</p></div>
            <div className="results-actions">{isSavedMode(mode) && <button disabled={loading || searchFailed || !!originVariants.length} onClick={saveCurrentSearch}>{savedSearchCopy(lang).save}</button>}<button disabled={loading} onClick={() => showScreen('search')}>{F(ui, 'editSearch', 'Edit search')}</button><button disabled={loading} onClick={clearSearch}>{F(ui, 'newSearch', 'New search')}</button></div>
            {isSavedMode(mode) && <dl className="search-parameters">
              <div><dt>{F(ui,'phHome','Home country')}</dt><dd>{originCode || '—'}</dd></div>
              {(mode === 'international' || mode === 'pets') && <div><dt>{F(ui,'phTarget','Destination country')}</dt><dd>{targetCode || '—'}</dd></div>}
              <div><dt>{F(ui,'phMed','Medicine name')}</dt><dd>{selectedDrug || '—'}</dd></div>
              <div><dt>{F(ui,'phDose','Dosage (optional)')}</dt><dd>{selectedDosage || '—'}</dd></div>
            </dl>}
          </div>
          {restoredSearch && <p className="search-note">{savedSearchCopy(lang).historical} · {new Date(restoredSearch.savedAt).toLocaleString(lang)}</p>}
          {!loading&&originVariants.length>0&&<section className="origin-choice" aria-labelledby="origin-choice-title">
            <h3 id="origin-choice-title">{originChoiceCopy(lang).title}</h3><p>{originChoiceCopy(lang).body}</p>
            {originVariants.map((variant,index)=><article key={index}>
              <h4>{variant.name}</h4><ul>{variant.ingredients.map((ingredient,i)=><li key={i}>{ingredient.name}: <b>{ingredient.strength}</b></li>)}</ul>
              <MedicineSources sources={variant.sources}/><button className="pill pill--blue" onClick={()=>handleSearch(variant)}>{originChoiceCopy(lang).choose} — {variant.name}</button>
            </article>)}
          </section>}
          {!loading&&<MedicineSources sources={originSources}/>}
          {(mode === 'pets' || mode === 'pet-generic') && !loading && !searchFailed && <div className="leaflet-block">
            <h2 className="medicine-section-title">{F(ui, 'medicineDetails', 'Medicine details')} — {originProductName||selectedDrug}</h2>
            <PetMedicineInformation searchAccess={searchAccess} key={selectedDrug + originCode + lang + (restoredSearch?.id || "")} medicineName={selectedDrug} country={originCode} lang={lang}
              initiallyExpanded initialInformation={petInformation[selectedDrug + originCode + lang]}
              onInformation={sections=>setPetInformation(previous=>({...previous,[selectedDrug + originCode + lang]:sections}))}
              headings={(t as any).leafletHeadings || {}}
              ingredients={petOriginIngredients} ingredientLabel={(t as any).leafletHeadings?.['Active Ingredients'] || 'Active ingredients'}
              loadingLabel={F(ui, 'searching', 'Searching…')} errorLabel={F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.')} />
          </div>}
          {/* Leaflet content */}
          {(mode === 'leaflet' || mode === 'international' || mode === 'generic') && (leafletRaw||originIngredients.length>0) && (
            <div className="leaflet-block">
              <h2 className="medicine-section-title">{F(ui, 'medicineDetails', 'Medicine details')} — {originProductName||selectedDrug}</h2>
              {originIngredients.length>0&&(!originLeafletVisible||!readStructuredLeaflet(extractLeafletText(leafletRaw)))&&<div className="origin-composition"><strong>{(t.leafletHeadings as any)?.['Active Ingredients']||'Active ingredients'}</strong><ul>{originIngredients.map((ingredient,index)=><li key={index}>{ingredient.name}: <b>{ingredient.strength}</b></li>)}</ul></div>}
              {leafletRaw&&<div className="leaflet-actions">
                <button type="button" className="pill pill--blue pill-sm" aria-expanded={originLeafletVisible} onClick={() => setOriginLeafletVisible(!originLeafletVisible)}>{originLeafletVisible ? leafletActions(lang).hide : leafletActions(lang).view}</button>
                <a className="official-leaflet-link" href={officialMedicineLeafletSearch(selectedDrug, originCode)} target="_blank" rel="noopener noreferrer">{leafletActions(lang).official}</a>
              </div>}
              {leafletRaw&&originLeafletVisible && renderLeafletPretty(extractLeafletText(leafletRaw), t,originIngredients.length>0,lang)}
            </div>
          )}

          {/* >>> Banner ONLY for international/generic/pets (NOT leaflet) <<< */}
          {((mode === 'international' || mode === 'generic') && leafletRaw || (mode === 'pets' || mode === 'pet-generic') && !loading && !searchFailed) && (
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
                  (mode === 'generic' || mode === 'pet-generic')
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
                  mode === 'pet-generic' ? petGenericsLabel(lang) :
                  mode === 'generic'
                    ? F(ui, 'genHeader', 'Generics')
                    : mode === 'pets'
                    ? F(ui, 'petEquivHeader', 'Equivalent pet medicines')
                    : F(ui, 'equivHeader', 'Equivalent medicines');

                // Build default intro text with graceful country handling
                const baseName = bannerDrug || F(ui, 'thisMedicine', 'this medicine');
                let introDefault = '';

                if (mode === 'generic' || mode === 'pet-generic') {
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
                  (mode === 'generic' || mode === 'pet-generic') ? 'genIntro' : mode === 'pets' ? 'petEquivIntro' : 'equivIntro';

                return (
                  <>
                    <div className="equivalent-section-heading">
                      <h2 className="medicine-section-title">{header}</h2>
                      <Link className="official-leaflet-link" href={`/?section=care&service=pharmacy&location=${encodeURIComponent(countryCode)}`}
                        onClick={event => {if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); openPharmacyTrip(countryCode);}}>{F(ui, 'btnPharmacy', 'Search pharmacy')}</Link>
                    </div>
                    {!loading && !searchFailed && matches.length>0 && <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {F(ui, introKey, introDefault, {
                        drugName: baseName,
                        targetCountry: bannerCountry,
                      })}
                    </div>}
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
                if (mode === 'pets' || mode === 'pet-generic') return <div key={medname + lang + (restoredSearch?.id || "")}><PetMedicineInformation searchAccess={searchAccess}
                  initialInformation={petInformation[medname + (mode === 'pets' ? targetCode || originCode : originCode) + lang]}
                  onInformation={sections=>setPetInformation(previous=>({...previous,[medname + (mode === 'pets' ? targetCode || originCode : originCode) + lang]:sections}))}
                  headings={(t as any).leafletHeadings || {}}
                  medicineName={medname} country={mode === 'pets' ? targetCode || originCode : originCode} lang={lang}
                  ingredientLabel={(t as any).leafletHeadings?.['Active Ingredients'] || 'Active ingredients'}
                  loadingLabel={F(ui, 'searching', 'Searching…')} errorLabel={F(ui, 'medicineServiceError', 'Medicine information is temporarily unavailable. Please try again shortly.')} /><MedicineSources sources={m.sources}/></div>;
                const isLeafletLoading = !!leafletLoading[medname];
                const leafletText = leaflets[medname];
                const showLF = !!viewLeaflet[medname];
                return (
                  <div
                    key={idx}
                    className="medicine-result-card"
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: '12px 14px',
                      margin: '8px 0',
                    }}
                  >
                    <div className="medicine-result-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{medname}</div>
                      <div className="leaflet-actions">
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
                            ? leafletActions(lang).hide
                            : leafletActions(lang).view}
                        </button>
                        <a className="official-leaflet-link" href={officialMedicineLeafletSearch(medname, mode === 'international' ? targetCode || originCode : originCode)} target="_blank" rel="noopener noreferrer">{leafletActions(lang).official}</a>
                      </div>
                    </div>

                    <MedicineSources sources={m.sources}/>
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
                        {renderLeafletPretty(extractLeafletText(leafletText), t,false,lang)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Plain AI text (e.g., for condition mode) */}
          {!loading&&!searchFailed&&noExactMatch&&<div className="empty-match" role="status"><Search size={26} aria-hidden="true"/><div><h3>{emptyMatchCopy(lang).title}</h3><p>{emptyMatchCopy(lang).body}</p></div></div>}
          {!noExactMatch && !!plainText && (!Array.isArray(matches) || matches.length === 0) && (
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
          © {new Date().getFullYear()} <strong><span className="brand1">medi</span><span className="brand2">céa</span>®</strong> by GES Consultancy Ltd. {F(t as any, 'footerAllRights', 'All rights reserved.')}
        </div>
        <div>
          {!membershipEnabled&&<a href="/terms" style={{ color: '#0b74de' }}>
            {F((t as any).ui, 'termsLink', 'Terms & Conditions')}
          </a>}
          {membershipEnabled&&<MembershipFooter/>}
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
