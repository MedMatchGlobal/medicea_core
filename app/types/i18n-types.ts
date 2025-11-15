// app/types/i18n-types.ts

// Keep this union exactly in sync with the languages you support in the UI.
export type SupportedLang =
  | 'en' | 'it' | 'fr' | 'de' | 'es' | 'pt' | 'nl' | 'af' | 'ru' | 'pl' | 'tr'
  | 'el' | 'sv' | 'no' | 'da' | 'fi' | 'cs' | 'hu' | 'ro' | 'he' | 'ar'
  | 'zh' | 'hi' | 'ja' | 'ko';

// Handy list if you ever need to iterate.
export const ALL_LANGS: SupportedLang[] = [
  'en','it','fr','de','es','pt','nl','af','ru','pl','tr',
  'el','sv','no','da','fi','cs','hu','ro','he','ar',
  'zh','hi','ja','ko',
];
