'use client';

import { useEffect } from 'react';
import { LanguageProvider, useLanguage } from '../LanguageProvider';
import { isRTL } from '../i18n/i18n';
import { termsBundles } from './terms-bundles';

function TermsInner() {
  const { lang } = useLanguage();
  const code = (lang || 'en').toLowerCase();
  const html = termsBundles[code] ?? termsBundles.en;

  // Apply RTL for Arabic/Hebrew, etc.
  useEffect(() => {
    document.documentElement.dir = isRTL(code) ? 'rtl' : 'ltr';
  }, [code]);

  return (
    <main>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}

export default function TermsPage() {
  // In case your global layout doesn't already wrap pages,
  // we wrap this route with the LanguageProvider locally.
  return (
    <LanguageProvider>
      <TermsInner />
    </LanguageProvider>
  );
}
