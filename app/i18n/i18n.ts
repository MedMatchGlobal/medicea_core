/* app/i18n/i18n.ts (revised)
   - Keeps loadStrings/isRTL.
   - Replaces hard import of CONDITIONS_BY_LANG with a dynamic loader that reads your per-language files from app/data/i18n/conditions/<lang>.ts if present.
   - Falls back to app/i18n/<lang>.json { conditions, conditionGroups } or to a tiny English set.
*/

import en from './en.json';

export type LangCode =
  | 'en' | 'af' | 'ar' | 'cs' | 'da' | 'de' | 'el' | 'es' | 'fi' | 'fr'
  | 'he' | 'hi' | 'hu' | 'it' | 'ja' | 'ko' | 'nl' | 'no' | 'pl' | 'pt'
  | 'ro' | 'ru' | 'sv' | 'tr' | 'zh';

export function isRTL(lang: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes((lang || '').toLowerCase());
}

function mergeUI<T extends object>(cur: Partial<T> | undefined, base: T): T {
  const out: any = { ...(base as any), ...(cur as any) };
  return out as T;
}

export async function loadStrings(lang: LangCode) {
  const code = (lang || 'en').toLowerCase() as LangCode;
  if (code === 'en') return en;
  try {
    const mod = await import(`./${code}.json`);
    return mergeUI(mod.default ?? mod, en);
  } catch {
    return en;
  }
}

// ---------- Conditions loader ----------

type ConditionKey = string;
type ConditionGroups =
  | Array<{ id: string; label: string; items: ConditionKey[] }>
  | Record<string, { label: string; items: ConditionKey[] }>;

function normalizeGroups(groups?: ConditionGroups) {
  if (!groups) return undefined;
  if (Array.isArray(groups)) return groups;
  return Object.entries(groups).map(([id, g]) => ({ id, ...g }));
}

/** Load condition labels + optional groups for a language. */
export async function loadConditions(
  lang: LangCode
): Promise<{ map: Record<string, string>; groups?: Array<{ id: string; label: string; items: string[] }> }> {
  const code = (lang || 'en').toLowerCase();

  // 1) Dedicated folder you created: app/data/i18n/conditions/<lang>.ts
  try {
    const mod = await import(`../../data/i18n/conditions/${code}.ts`);
    const bundle = (mod.default || mod) as { labels: Record<string, string>; groups?: ConditionGroups };
    return { map: bundle.labels || {}, groups: normalizeGroups(bundle.groups) };
  } catch {
    // continue to fallback
  }

  // 2) Fallback: app/i18n/<lang>.json can also carry { conditions, conditionGroups }
  try {
    const json = await import(`./${code}.json`);
    const labels = (json as any).conditions || {};
    const groups = normalizeGroups((json as any).conditionGroups);
    return { map: labels, groups };
  } catch {
    // continue to final fallback
  }

  // 3) Minimal safe fallback so UI never breaks
  return {
    map: {
      migraine: 'Migraine',
      hypertension: 'Hypertension',
      type2diabetes: 'Type 2 Diabetes',
      asthma: 'Asthma',
    },
    groups: [
      { id: 'neuro', label: 'Neurology', items: ['migraine'] },
      { id: 'cardio', label: 'Cardiology', items: ['hypertension'] },
      { id: 'endocrine', label: 'Endocrinology', items: ['type2diabetes'] },
      { id: 'resp', label: 'Respiratory', items: ['asthma'] },
    ],
  };
}
