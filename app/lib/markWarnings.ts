// app/lib/markWarnings.ts

export function normalizeBold(md: string): string {
  md = md.replace(/\*\*\s+([^*][^*]*?)\s+\*\*/g, '**$1**');
  md = md.replace(/\*\*\s*([^*][^*]*?)\s*\*\*\s*:/g, '**$1**:');
  md = md.replace(/`?\*\*([^*][^*]*?)\*\*`?/g, '**$1**');
  return md;
}

const warningLabels = [
  'Side effects',
  'Contraindications',
  'Contraindications and precautions',
  'Precautions',
  'Warnings',
  'Interactions',
  'Interactions with other medications',
  'Allergies',
  'Possible side effects'
];

function isWarningLabelLine(s: string): boolean {
  return warningLabels.some(label =>
    new RegExp(`^\s*\*\*${label}\*\*:`).test(s)
  );
}

const isBullet = (s: string) => /^\s*([-*•]|[0-9]{1,3}\.)\s+/.test(s);
const isHeading = (s: string) => /^\s*#{1,6}\s+/.test(s);
const isBlank = (s: string) => /^\s*$/.test(s);

const wrapRestOfLine = (s: string, open = '<warn>', close = '</warn>') => {
  const idx = s.indexOf(':');
  if (idx === -1) return s;
  return s.slice(0, idx + 1) + ' ' + open + s.slice(idx + 1).trimStart() + close;
};

export function markWarningBlocks(md: string): string {
  const lines = md.split(/\r?\n/);
  let out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];

    if (isWarningLabelLine(cur)) {
      out.push(wrapRestOfLine(cur));
      i++;

      let wrapped = 0;
      while (i < lines.length && wrapped < 2) {
        const next = lines[i];
        if (isBlank(next) || isBullet(next) || isHeading(next) || isWarningLabelLine(next)) {
          break;
        }
        out.push(`<warn>${next}</warn>`);
        wrapped++;
        i++;
      }
      continue;
    }

    out.push(cur);
    i++;
  }

  return out.join('\n');
}

export function processWarnings(md: string): string {
  return markWarningBlocks(normalizeBold(md));
}
