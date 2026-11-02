import React from 'react';
import { useLanguage, LANGUAGES, Language } from '../../i18n/LanguageContext';

// Compact language selector for the top navigation bar. Responsive:
// flag + short native name fits mobile and desktop, and the full name
// is in the title / aria-label. Selection persists in localStorage
// (aegis_lang) via LanguageProvider. No API, no translation service.
export const LanguageSelector: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <label className="inline-flex items-center gap-1 shrink-0" title={t('nav.language')}>
      <span className="sr-only">{t('nav.language')}</span>
      <select
        aria-label={t('nav.language')}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="min-h-11 max-w-[118px] sm:max-w-none px-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#172033] focus:outline-none focus:border-[#2563EB] cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.code === 'en' ? 'EN' : l.native}
          </option>
        ))}
      </select>
    </label>
  );
};
