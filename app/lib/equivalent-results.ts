// Model prose is never a medicine. Only explicit list entries are candidates.
export function parseEquivalentCandidates(raw: string): {medicine_name:string}[] {
  const rejected = /\b(sorry|cannot|can't|unable|no (?:matches|products|equivalents|results)|not (?:available|found)|consult|please|as an ai)\b/i;
  if (!raw) return [];
  const seen = new Set<string>();
  return raw.split(/\r?\n/).flatMap(line => {
    const entry = line.trim().match(/^(?:\d+[.)]|[-•*])\s+(.+)$/);
    const name = entry?.[1].replace(/\*\*/g, '').replace(/[;,.]+$/, '').trim();
    if (!name || rejected.test(name) || name.length > 240 || !/[a-zÀ-ž]/i.test(name) || seen.has(name)) return [];
    seen.add(name);
    return [{medicine_name:name}];
  });
}

/** Text screening only; this does not verify clinical interchangeability. */
export function filterCompositionCandidates(raw: string, pairs: {name:string;strength:string}[]): string {
  if (!pairs.length || !parseEquivalentCandidates(raw).length) return '';
  const escape = (value:string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return raw.split(/\r?\n/).filter(line => {
    if (!parseEquivalentCandidates(line).length) return false;
    return pairs.every(pair => {
      if (!pair.name.trim() || !pair.strength.trim()) return false;
      const strength = escape(pair.strength.trim()).replace(/\s+/g, '\\s*').replace(/(\d)([a-zµ])/gi, '$1\\s*$2');
      return new RegExp(`(?<![\\d.])${strength}(?![a-z\\dµ/])`, 'i').test(line) &&
        line.toLowerCase().includes(pair.name.toLowerCase());
    });
  }).join('\n');
}
