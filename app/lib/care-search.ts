export type CareMode = 'pharmacy' | 'hospital' | 'gp' | 'doctor' | 'laboratory' | 'imaging' | 'physiotherapy';

export function isCareMode(mode: string): mode is CareMode {
  return ['pharmacy','hospital','gp','doctor','laboratory','imaging','physiotherapy'].includes(mode);
}

/** Maps is a discovery service, not a verified provider directory. */
export function careSearchTerm(mode: CareMode, specialty = '') {
  const type = mode === 'pharmacy' ? 'pharmacies'
    : mode === 'hospital' ? 'human general hospitals'
    : mode === 'gp' ? 'general practitioners family doctors'
    : mode === 'laboratory' ? 'medical laboratories blood tests pathology patient collection centres'
    : mode === 'imaging' ? 'private diagnostic imaging radiology X-ray CT MRI ultrasound centres'
    : mode === 'physiotherapy' ? 'physiotherapists physical therapy clinics'
    : specialty.trim() ? `${specialty.trim()} medical doctors`
    : 'general medical doctors';
  return type;
}

export function careSearchQuery(mode: CareMode, location: string, specialty = '') {
  return `${careSearchTerm(mode,specialty)} near ${location.trim()}`;
}

export function careCoordinates(location:string):{latitude:number;longitude:number}|null {
  const m=location.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if(!m)return null;
  const latitude=Number(m[1]),longitude=Number(m[2]);
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
}

/** Coordinate searches set the map viewport explicitly instead of asking the
 * free-text parser to interpret "near lat,lng" against a previous map region.
 * Address searches retain the cross-platform Maps URL query format. */
export function careSearchUrl(mode:CareMode,location:string,specialty=''):string|null {
  const where=location.trim();if(!where||/^near me$/i.test(where))return null;
  const coords=careCoordinates(where);
  if(coords)return `https://www.google.com/maps/search/${encodeURIComponent(careSearchTerm(mode,specialty))}/@${coords.latitude},${coords.longitude},14z`;
  // A malformed numeric coordinate pair must not turn into an address search.
  if(/^[\s\d.,+\-]+$/.test(where)&&where.includes(','))return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(careSearchQuery(mode,where,specialty))}`;
}
