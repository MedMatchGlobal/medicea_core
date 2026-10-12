export type PharmacyTrip = {id:string; country:string; medicines:string[]; returnUrl:string; scrollY:number};
export function pharmacyReminder(original: string, matches: unknown[]): string[] {
  const names = matches.map(item => item && typeof item === 'object'
    ? (item as {medicine_name?:unknown; Medicine_name?:unknown}).medicine_name ?? (item as {Medicine_name?:unknown}).Medicine_name
    : null);
  return [...new Set([original,...names].filter((name): name is string => typeof name === 'string' && !!name.trim()).map(name => name.trim()))];
}
export function pharmacyHistoryEntry(existing: unknown, id: string) {
  return {...(existing && typeof existing === 'object' ? existing : {}),mediceaPharmacyTrip:id};
}
export function isPharmacyTripEntry(state: unknown, trip: PharmacyTrip | null) {
  return !!trip && !!state && typeof state === 'object' && (state as {mediceaPharmacyTrip?:unknown}).mediceaPharmacyTrip === trip.id;
}
