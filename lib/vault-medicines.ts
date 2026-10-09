export function medicineText(value: unknown, max: number, required = false): string | null {
  if (typeof value !== 'string') return required ? null : '';
  const text = value.trim();
  return (required && !text) || text.length > max || /[\x00-\x1f\x7f]/.test(text) ? null : text;
}
