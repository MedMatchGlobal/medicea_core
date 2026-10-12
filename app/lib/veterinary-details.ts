export type VeterinaryIngredient = {name: string; strength: string};
export function veterinaryIngredients(profile: unknown): VeterinaryIngredient[] {
  if (!profile || typeof profile !== 'object') return [];
  const items = (profile as {active_ingredients?: unknown}).active_ingredients;
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && typeof item.name === 'string' && item.name.trim())
    .map(item => ({name:item.name.trim(), strength:typeof item.strength === 'string' ? item.strength.trim() : ''}));
}
export function officialMedicineLeafletSearch(medicineName: string, country: string, veterinary = false) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${medicineName} ${country} official ${veterinary ? 'veterinary ' : ''}package leaflet manufacturer regulator`)}`;
}
export function officialVeterinaryLeafletSearch(medicineName: string, country: string) {
  return officialMedicineLeafletSearch(medicineName, country, true);
}
