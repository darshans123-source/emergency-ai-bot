import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES, Language } from '../../i18n/LanguageContext';

// Glass language selector for the premium header (matches the reference:
// flag + short code + chevron inside a translucent pill). Responsive:
// flag + short native name fits mobile and desktop, and the full name
// is in the title / aria-label. Selection persists in localStorage
// (aegis_lang) via LanguageProvider. No API, no translation service.
export const LanguageSelector: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <label className="aegis-header-lang relative inline-flex items-center shrink-0" title={t('nav.language')}>
      <span className="sr-only">{t('nav.language')}</span>
      <select
        aria-label={t('nav.language')}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="min-h-9 sm:min-h-10 max-w-[76px] sm:max-w-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 rounded-xl text-[11px] sm:text-xs font-semibold focus:outline-none cursor-pointer transition-colors duration-200"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.code === 'en' ? 'EN' : l.native}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 sm:right-2 text-slate-300 pointer-events-none" aria-hidden="true" />
    </label>
  );
};
