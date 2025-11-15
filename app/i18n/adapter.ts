// app/i18n/adapter.ts
export type LegacyUI = {
  btnIntl: string; btnCond: string; btnGen: string; btnLeaflet: string; btnTriage: string;
  btnPets: string; btnPharmacy: string; btnGP: string; btnHospital: string; btnDoctor: string;

  phHome: string; phMed: string; phDose: string; phTarget: string;

  condSelect: string; condContext: string; condContextPH: string; condAllergies: string; condAllergiesPH: string;

  addressPrompt: string; addressPH: string; useDeviceLocation: string; doctorSpec: string;

  searchIntl: string; searchCond: string; searchGen: string; searchLeaflet: string; searchPets: string; openMaps: string;

  searching: string; noResult: string; errorOccurred: string; pleaseEnterAddress: string; opening: string; debugRaw: string;
  loadingLeaflet: string; viewLeaflet: string; hideLeaflet: string;

  visitsLabel: string; termsLink: string; footerAllRights: string;

  translatingTemplate?: string;
};

// --- English defaults (safe fallbacks) ---
const defaults = {
  buttons: {
    internationalSearch: 'International Medicine Search',
    searchByCondition: 'Search by Condition',
    searchGeneric: 'Search Generic',
    medicineLeaflet: 'Medicine Leaflet',
    symptomsTriage: 'Symptoms Triage',
    medsForPets: 'Meds 4 Pets',
    searchPharmacy: 'Search Pharmacy',
    searchGP: 'Search GP',
    searchHospital: 'Search Hospital',
    searchDoctor: 'Search Doctor',
    viewLeaflet: 'View leaflet',
    hideLeaflet: 'Hide leaflet',
  },
  form: {
    homeCountry: 'Please select your Home Country',
    medicineName: 'Please select/enter medicine name',
    dosageOptional: 'Dosage (optional)',
    targetCountry: 'Please select the Country to search',
    condSelect: 'Please select a condition',
    condContext: 'Add context (optional)',
    condContextPH: 'Symptoms, duration, previous treatments…',
    condAllergies: 'Allergies / medical conditions',
    condAllergiesPH: 'e.g., penicillin allergy, pregnancy, CKD',
    addressPrompt: 'Enter an address or area',
    addressPlaceholder: 'City, postcode, or "near me"',
    useDeviceLocation: 'Use my device location',
    doctorSpecialty: 'Doctor specialty',
  },
  actions: {
    searchIntl: 'Search International Equivalents',
    searchCond: 'Educational overview',
    searchGen: 'Find generics',
    searchLeaflet: 'Fetch leaflet',
    searchPets: 'Search pet meds',
    openMaps: 'Open in Maps',
  },
  status: {
    searching: 'Searching…',
    noResult: 'No results found.',
    errorOccurred: 'An error occurred. Please try again.',
    pleaseEnterAddress: 'Please enter an address or enable device location.',
    opening: 'Opening',
    debugRaw: 'Raw AI output (debug)',
    loadingLeaflet: 'Loading leaflet…',
    translating: 'Translating…',
  },
  footer: {
    visitsLabel: 'Visits',
    termsLink: 'Terms & Conditions',
    allRights: 'All rights reserved.',
  },
};

// tiny deep merge for defaults → target
function merge<T>(base: T, over: any): T {
  if (typeof base !== 'object' || base === null) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(over || {})) {
    const bv = (base as any)[k];
    const ov = over[k];
    out[k] =
      typeof bv === 'object' && bv && typeof ov === 'object' && ov
        ? merge(bv, ov)
        : (ov ?? bv);
  }
  return out;
}

// Export this so page.tsx can guarantee non-empty strings
export function ensureDefaults(bundle: any) {
  return merge(defaults, bundle || {});
}

// Safe getter
const g = (obj: any, path: string[], fallback: string) => {
  let cur = obj;
  for (const p of path) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return fallback;
  }
  return typeof cur === 'string' ? cur : fallback;
};

export function toLegacyUI(t: any): LegacyUI {
  const safe = ensureDefaults(t); // ← guarantees all keys exist
  const b = safe.buttons, f = safe.form, a = safe.actions, s = safe.status, ft = safe.footer;

  return {
    btnIntl: b.internationalSearch,
    btnCond: b.searchByCondition,
    btnGen: b.searchGeneric,
    btnLeaflet: b.medicineLeaflet,
    btnTriage: b.symptomsTriage,
    btnPets: b.medsForPets,
    btnPharmacy: b.searchPharmacy,
    btnGP: b.searchGP,
    btnHospital: b.searchHospital,
    btnDoctor: b.searchDoctor,

    phHome: f.homeCountry,
    phMed: f.medicineName,
    phDose: f.dosageOptional,
    phTarget: f.targetCountry,

    condSelect: f.condSelect,
    condContext: f.condContext,
    condContextPH: f.condContextPH,
    condAllergies: f.condAllergies,
    condAllergiesPH: f.condAllergiesPH,

    addressPrompt: f.addressPrompt,
    addressPH: f.addressPlaceholder,
    useDeviceLocation: f.useDeviceLocation,
    doctorSpec: f.doctorSpecialty,

    searchIntl: a.searchIntl,
    searchCond: a.searchCond,
    searchGen: a.searchGen,
    searchLeaflet: a.searchLeaflet,
    searchPets: a.searchPets,
    openMaps: a.openMaps,

    searching: s.searching,
    noResult: s.noResult,
    errorOccurred: s.errorOccurred,
    pleaseEnterAddress: s.pleaseEnterAddress,
    opening: s.opening,
    debugRaw: s.debugRaw,
    loadingLeaflet: s.loadingLeaflet,
    viewLeaflet: b.viewLeaflet,
    hideLeaflet: b.hideLeaflet,

    visitsLabel: ft.visitsLabel,
    termsLink: ft.termsLink,
    footerAllRights: ft.allRights,

    translatingTemplate: typeof s.translating === 'string' ? s.translating : undefined,
  };
}
