/* data/i18n/conditions/index.ts */
export type ConditionsMap = Record<string, string>;

// Each language file exports:  export const conditions: ConditionsMap = { ... }
import * as afMod from './af';
import * as arMod from './ar';
import * as csMod from './cs';
import * as daMod from './da';
import * as deMod from './de';
import * as elMod from './el';
import * as enMod from './en';
import * as esMod from './es';
import * as fiMod from './fi';
import * as frMod from './fr';
import * as heMod from './he';
import * as hiMod from './hi';
import * as huMod from './hu';
import * as itMod from './it';
import * as jaMod from './ja';
import * as koMod from './ko';
import * as nlMod from './nl';
import * as noMod from './no';
import * as plMod from './pl';
import * as ptMod from './pt';
import * as roMod from './ro';
import * as ruMod from './ru';
import * as svMod from './sv';
import * as trMod from './tr';
import * as zhMod from './zh';

function pick(mod: any): ConditionsMap {
  // tolerate both:  export const conditions = {...}  OR  export default {...}
  if (mod?.default && typeof mod.default === 'object') return mod.default as ConditionsMap;
  if (mod?.conditions && typeof mod.conditions === 'object') return mod.conditions as ConditionsMap;
  return mod?.byName && typeof mod.byName === 'object' ? (mod.byName as ConditionsMap) : {};
}

export const CONDITIONS_BY_LANG: Record<string, ConditionsMap> = {
  en: pick(enMod),
  af: pick(afMod),
  ar: pick(arMod),
  cs: pick(csMod),
  da: pick(daMod),
  de: pick(deMod),
  el: pick(elMod),
  es: pick(esMod),
  fi: pick(fiMod),
  fr: pick(frMod),
  he: pick(heMod),
  hi: pick(hiMod),
  hu: pick(huMod),
  it: pick(itMod),
  ja: pick(jaMod),
  ko: pick(koMod),
  nl: pick(nlMod),
  no: pick(noMod),
  pl: pick(plMod),
  pt: pick(ptMod),
  ro: pick(roMod),
  ru: pick(ruMod),
  sv: pick(svMod),
  tr: pick(trMod),
  zh: pick(zhMod),
};
