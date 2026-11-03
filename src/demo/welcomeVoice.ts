// AI Welcome Voice on app launch — browser SpeechSynthesis only.
// No API keys, no external APIs, no paid services, no backend.
// Plays once per browser session, in the user's saved language
// (aegis_lang), and never interrupts Mitra/agent speech: if something
// is already speaking, the welcome waits instead of cancelling it.
import type { Language } from '../i18n/LanguageContext';
import { LANG_CODE, pickVoice, speechSupported } from './speech';

export const WELCOME_VOICE_KEY = 'aegis_welcome_voice';
export const WELCOME_PLAYED_KEY = 'aegis_welcome_played';
export const REPLAY_EVENT = 'aegis:replay-welcome';

export const WELCOME_GREETINGS: Record<Language, string> = {
  en: 'Welcome to AegisAI. Your intelligent emergency assistance system is ready. One Voice, Four Agents, One Mission. How can I assist you today?',
  kn: 'ಏಜಿಸ್‌ಎಐಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ತುರ್ತು ಸಹಾಯ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ. ಒಂದು ಧ್ವನಿ, ನಾಲ್ಕು ಏಜೆಂಟ್‌ಗಳು, ಒಂದು ಮಿಷನ್. ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  hi: 'एजिसएआई में आपका स्वागत है। आपकी बुद्धिमान आपातकालीन सहायता प्रणाली तैयार है। एक आवाज़, चार एजेंट, एक मिशन। आज मैं आपकी कैसे सहायता कर सकता हूँ?',
  te: 'ఏజిస్‌ఎఐకి స్వాగతం. మీ తెలివైన అత్యవసర సహాయ వ్యవస్థ సిద్ధంగా ఉంది. ఒక స్వరం, నాలుగు ఏజెంట్లు, ఒక మిషన్. ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?',
};

export function isWelcomeVoiceEnabled(): boolean {
  try {
    return localStorage.getItem(WELCOME_VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setWelcomeVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(WELCOME_VOICE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function hasWelcomePlayedThisSession(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_PLAYED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomePlayed(): void {
  try {
    sessionStorage.setItem(WELCOME_PLAYED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function speechSupportedCheck(): boolean {
  return speechSupported();
}

export function dispatchReplayWelcome(): void {
  try {
    window.dispatchEvent(new Event(REPLAY_EVENT));
  } catch {
    /* ignore */
  }
}

type PlayResult = 'started' | 'speaking' | 'unsupported' | 'error';

/**
 * Speak the welcome greeting once. Never cancels existing speech:
 * if Mitra or an agent is already speaking, this returns 'speaking'
 * and the caller can retry later. Marks the session as played only
 * when the utterance actually starts, so a blocked autoplay attempt
 * does not consume the greeting.
 */
export function playWelcomeVoice(lang: Language, onEnd?: () => void): PlayResult {
  if (!speechSupported()) return 'unsupported';
  try {
    if (window.speechSynthesis.speaking) return 'speaking';
    const utter = new SpeechSynthesisUtterance(WELCOME_GREETINGS[lang] || WELCOME_GREETINGS.en);
    utter.lang = LANG_CODE[lang] || 'en-IN';
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 0.95; // moderate, natural, friendly pace
    utter.pitch = 1;
    utter.volume = 1;
    utter.onstart = () => markWelcomePlayed();
    utter.onend = () => {
      if (onEnd) onEnd();
    };
    utter.onerror = () => {
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utter);
    return 'started';
  } catch {
    return 'error';
  }
}

/** Wait for browser voices to load (often empty on first load), then play. */
export function playWelcomeVoiceWhenReady(lang: Language, onEnd?: () => void): void {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    playWelcomeVoice(lang, onEnd);
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    playWelcomeVoice(lang, onEnd);
  };
  try {
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
  } catch {
    /* older browsers: fall through to timeout */
  }
  window.setTimeout(finish, 1500);
}
