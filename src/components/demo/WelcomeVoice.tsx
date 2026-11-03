import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  REPLAY_EVENT,
  hasWelcomePlayedThisSession,
  isWelcomeVoiceEnabled,
  playWelcomeVoiceWhenReady,
  speechSupportedCheck,
} from '../../demo/welcomeVoice';

// Welcome voice host: mounted once in App (inside LanguageProvider,
// outside Routes), so it runs on splash, login and every app page, but
// the session guard means it greets once per browser session, never on
// every page navigation (AppLayout stays mounted across routes anyway).
// It never cancels Mitra/agent speech: playWelcomeVoice returns
// 'speaking' instead of interrupting, and replay is user-initiated.
export const WelcomeVoice: React.FC = () => {
  const { lang } = useLanguage();
  const langRef = useRef(lang);
  langRef.current = lang;
  const [showTap, setShowTap] = useState(false);
  const attemptedRef = useRef(false);

  const attempt = useCallback((force = false) => {
    if (!force) {
      if (!isWelcomeVoiceEnabled()) return;
      if (hasWelcomePlayedThisSession()) return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // If something else is speaking (Mitra/agent), do not interrupt it.
    if (window.speechSynthesis.speaking) return;
    playWelcomeVoiceWhenReady(langRef.current, () => {
      /* greeting finished; nothing to do */
    });
    // Autoplay check: if speech never actually started (browser blocked
    // it before any user gesture), offer the tap fallback.
    window.setTimeout(() => {
      try {
        if (!hasWelcomePlayedThisSession() && !window.speechSynthesis.speaking && isWelcomeVoiceEnabled()) {
          setShowTap(true);
        }
      } catch {
        /* ignore */
      }
    }, 1500);
  }, []);

  useEffect(() => {
    // First attempt on app launch.
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      attempt();
    }
    // Browsers that block speech before a gesture: retry on the user's
    // first interaction, as the brief requires.
    const onGesture = () => attempt();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    // Replay button (Navbar + Settings) dispatches this event.
    const onReplay = () => {
      setShowTap(false);
      attempt(true);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener(REPLAY_EVENT, onReplay);
    };
  }, [attempt]);

  if (!showTap) return null;
  // Small floating fallback, clear of the bottom nav + footer marquee.
  return (
    <div className="fixed right-4 z-50 bottom-[calc(110px+env(safe-area-inset-bottom))] lg:bottom-16 flex items-center gap-1 rounded-full bg-[#2563EB] text-white shadow-xl shadow-blue-900/40 pl-4 pr-1 py-1">
      <button
        type="button"
        onClick={() => {
          setShowTap(false);
          attempt(true);
        }}
        className="flex items-center gap-2 min-h-9 text-sm font-semibold hover:text-blue-100 transition"
        aria-label="Tap to hear the AegisAI welcome greeting"
      >
        <Volume2 className="w-4 h-4" />
        Tap to hear welcome
      </button>
      <button
        type="button"
        aria-label="Dismiss welcome prompt"
        onClick={() => setShowTap(false)}
        className="ml-1 p-2 rounded-full hover:bg-white/20"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Re-exported helper for components that only need the support check.
export { speechSupportedCheck };
