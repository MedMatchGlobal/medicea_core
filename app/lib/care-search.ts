export type CareMode = 'pharmacy' | 'hospital' | 'gp' | 'doctor' | 'laboratory' | 'imaging' | 'physiotherapy';

export function isCareMode(mode: string): mode is CareMode {
  return ['pharmacy','hospital','gp','doctor','laboratory','imaging','physiotherapy'].includes(mode);
}

/** Maps is a discovery service, not a verified provider directory. */
export function careSearchQuery(mode: CareMode, location: string, specialty = '') {
  const type = mode === 'pharmacy' ? 'pharmacies'
    : mode === 'hospital' ? 'human general hospitals'
    : mode === 'gp' ? 'general practitioners family doctors'
    : mode === 'laboratory' ? 'medical laboratories blood tests pathology patient collection centres'
    : mode === 'imaging' ? 'private diagnostic imaging radiology X-ray CT MRI ultrasound centres'
    : mode === 'physiotherapy' ? 'physiotherapists physical therapy clinics'
    : specialty.trim() ? `${specialty.trim()} medical doctors`
    : 'general medical doctors';
  return `${type} near ${location.trim()}`;
}
