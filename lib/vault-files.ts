export const VAULT_BUCKET = 'medicea-vault-beta';
export const MAX_FILE_BYTES = 50_000_000;
export function documentType(bytes: Uint8Array): { mime: string; extension: string } | null {
  if ([37,80,68,70,45].every((v,i) => bytes[i] === v)) return { mime: 'application/pdf', extension: 'pdf' };
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return { mime: 'image/png', extension: 'png' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  return null;
}
export function documentTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  return title.length > 0 && title.length <= 120 && !/[\x00-\x1f\x7f]/.test(title) ? title : null;
}
export const validDocumentId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
