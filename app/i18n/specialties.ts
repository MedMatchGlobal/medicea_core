// app/i18n/specialties.ts
export type SpecialtyId =
  | 'gp' | 'im' | 'peds' | 'obgyn' | 'cards' | 'cards-int' | 'cards-ep'
  | 'derm' | 'endo' | 'gi' | 'heme' | 'neph' | 'neuro' | 'nsurg'
  | 'onc-med' | 'onc-rad' | 'onc-surg' | 'oph' | 'ortho' | 'ent'
  | 'psych' | 'pulm' | 'rheum' | 'uro' | 'id' | 'allergy' | 'ger' | 'pall'
  | 'sports' | 'plast' | 'vasc' | 'em' | 'anes' | 'path' | 'rad-diag' | 'rad-ir';

export const SPECIALTIES: Array<{ id: SpecialtyId; en: string }> = [
  { id: 'gp',        en: 'General Practitioner (Family Medicine)' },
  { id: 'im',        en: 'Internal Medicine' },
  { id: 'peds',      en: 'Pediatrics' },
  { id: 'obgyn',     en: 'Obstetrics & Gynecology' },
  { id: 'cards',     en: 'Cardiology' },
  { id: 'cards-int', en: 'Cardiology – Interventional' },
  { id: 'cards-ep',  en: 'Cardiology – Electrophysiology' },
  { id: 'derm',      en: 'Dermatology' },
  { id: 'endo',      en: 'Endocrinology' },
  { id: 'gi',        en: 'Gastroenterology' },
  { id: 'heme',      en: 'Hematology' },
  { id: 'neph',      en: 'Nephrology' },
  { id: 'neuro',     en: 'Neurology' },
  { id: 'nsurg',     en: 'Neurosurgery' },
  { id: 'onc-med',   en: 'Oncology – Medical' },
  { id: 'onc-rad',   en: 'Oncology – Radiation' },
  { id: 'onc-surg',  en: 'Oncology – Surgical' },
  { id: 'oph',       en: 'Ophthalmology' },
  { id: 'ortho',     en: 'Orthopedic Surgery' },
  { id: 'ent',       en: 'Otolaryngology (ENT)' },
  { id: 'psych',     en: 'Psychiatry' },
  { id: 'pulm',      en: 'Pulmonology' },
  { id: 'rheum',     en: 'Rheumatology' },
  { id: 'uro',       en: 'Urology' },
  { id: 'id',        en: 'Infectious Diseases' },
  { id: 'allergy',   en: 'Allergy & Immunology' },
  { id: 'ger',       en: 'Geriatrics' },
  { id: 'pall',      en: 'Palliative Care' },
  { id: 'sports',    en: 'Sports Medicine' },
  { id: 'plast',     en: 'Plastic Surgery' },
  { id: 'vasc',      en: 'Vascular Surgery' },
  { id: 'em',        en: 'Emergency Medicine' },
  { id: 'anes',      en: 'Anesthesiology' },
  { id: 'path',      en: 'Pathology' },
  { id: 'rad-diag',  en: 'Radiology – Diagnostic' },
  { id: 'rad-ir',    en: 'Radiology – Interventional' },
];

export function specialtyLabel(t: any, id: SpecialtyId): string {
  // first try localized label in JSON => specialties[id]
  const local = t?.specialties?.[id];
  if (typeof local === 'string' && local.trim()) return local;
  // fallback to English canonical
  const f = SPECIALTIES.find(s => s.id === id);
  return f ? f.en : id;
}
