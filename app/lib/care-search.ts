export type CareMode = 'pharmacy' | 'hospital' | 'gp' | 'doctor';

/** Maps is a discovery service, not a verified provider directory. */
export function careSearchQuery(mode: CareMode, location: string, specialty = '') {
  const type = mode === 'pharmacy' ? 'pharmacies'
    : mode === 'hospital' ? 'human general hospitals'
    : mode === 'gp' ? 'general practitioners family doctors'
    : specialty.trim() ? `${specialty.trim()} medical doctors`
    : 'general medical doctors';
  return `${type} near ${location.trim()}`;
}
