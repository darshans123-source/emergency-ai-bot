import React, { createContext, useContext, useEffect, useState } from 'react';
import translations from './translations.json';

export type Language = 'en' | 'kn' | 'hi' | 'te';
export const LANGUAGES: { code: Language; label: string; flag: string; native: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'kn', label: 'Kannada', flag: '🇮🇳', native: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', flag: '🇮🇳', native: 'తెలుగు' },
];
type AgentData = { sector: string; description: string; prompts: string[] };
type LangData = { ui: Record<string, string>; agents: Record<string, AgentData> };
const DATA = translations as Record<Language, LangData>;
const KEY = 'aegis_lang';

interface LangCtx {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  agents: Record<string, AgentData>;
}
const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, t: (k) => DATA.en.ui[k] || k, agents: DATA.en.agents });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'kn' || saved === 'hi' || saved === 'te' || saved === 'en') return saved;
    } catch { /* ignore */ }
    return 'en';
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
    try { document.documentElement.lang = lang; } catch { /* ignore */ }
  }, [lang]);
  const setLang = (l: Language) => setLangState(l);
  const t = (key: string) => DATA[lang]?.ui[key] || DATA.en.ui[key] || key;
  return <Ctx.Provider value={{ lang, setLang, t, agents: DATA[lang]?.agents || DATA.en.agents }}>{children}</Ctx.Provider>;
}
export function useLanguage() { return useContext(Ctx); }
