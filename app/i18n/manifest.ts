// app/i18n/manifest.ts
// Central place to sync-load hard-coded JSON bundles.
// Add/import more languages as you translate them.

import af from './af.json';
import ar from './ar.json';
import cs from './cs.json';
import da from './da.json';
import de from './de.json';
import el from './el.json';
import en from './en.json';
import es from './es.json';
import fi from './fi.json';
import fr from './fr.json';
import he from './he.json';
import hi from './hi.json';
import hu from './hu.json';
import it from './it.json';
import ja from './ja.json';
import ko from './ko.json';
import nl from './nl.json';
import no from './no.json';
import pl from './pl.json';
import pt from './pt.json';
import ro from './ro.json';
import ru from './ru.json';
import sv from './sv.json';
import tr from './tr.json';
import zh from './zh.json';

export type LangCode =
  | 'en' | 'it' | 'fr' | 'de' | 'es' | 'pt' | 'nl' | 'af' | 'ru' | 'pl' | 'tr'
  | 'el' | 'sv' | 'no' | 'da' | 'fi' | 'cs' | 'hu' | 'ro' | 'he' | 'ar'
  | 'zh' | 'hi' | 'ja' | 'ko';

export const bundles: Record<LangCode, any> = {
  en, it, fr, de, es, pt, nl, af, ru, pl, tr,
  el, sv, no, da, fi, cs, hu, ro, he, ar,
  zh, hi, ja, ko,
};
