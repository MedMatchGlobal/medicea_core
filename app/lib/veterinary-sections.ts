export const VETERINARY_TOPICS = ['Active Ingredients','Strength','Formulation','Animal Species','Indications','Dosage','Contraindications','Warnings','Precautions','Side Effects','Interactions','Legal Classification','Storage','Manufacturer','Average Selling Price','Note'] as const;
export type VeterinarySection = {key: typeof VETERINARY_TOPICS[number]; bullets: string[]};
export function veterinarySections(input: unknown): VeterinarySection[] {
  const values = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return VETERINARY_TOPICS.map(key => ({key, bullets:Array.isArray(values[key])
    ? (values[key] as unknown[]).filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim())
    : []}));
}
