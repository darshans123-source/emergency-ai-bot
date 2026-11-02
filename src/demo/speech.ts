// Browser-native speech only. No external API, no API key.
export type SpeechLang = 'en' | 'hi' | 'kn' | 'te';
export const LANG_CODE: Record<SpeechLang, string> = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', te: 'te-IN' };
export function detectSpeechLang(text: string, fallback: SpeechLang = 'en'): SpeechLang {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return fallback;
}
export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}
export function getSavedVoiceName(): string | null {
  try { return localStorage.getItem('aegis_voice_name'); } catch { return null; }
}
export function saveVoiceName(name: string) { try { localStorage.setItem('aegis_voice_name', name); } catch { /* ignore */ } }
export function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const saved = getSavedVoiceName();
  if (saved) { const v = voices.find((x) => x.name === saved); if (v) return v; }
  const code = LANG_CODE[lang];
  return voices.find((v) => v.lang === code) || voices.find((v) => v.lang.startsWith(code.slice(0, 2))) || voices.find((v) => v.default) || voices[0];
}
export function pauseSpeaking() { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause(); }
export function resumeSpeaking() { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.resume(); }
export function isSpeakingPaused(): boolean { return typeof window !== 'undefined' && !!window.speechSynthesis && window.speechSynthesis.paused; }
export function speakText(text: string, lang: SpeechLang = 'en', onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_CODE[lang];
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 1; utter.pitch = 1;
    // Natural pauses: SpeechSynthesis already pauses at sentence breaks;
    // keep the full response as one utterance so Pause/Resume work cleanly.
    if (onEnd) utter.onend = onEnd;
    utter.onerror = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utter);
    return true;
  } catch { return false; }
}
export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}
export function recognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}
export function startRecognition(lang: SpeechLang, onResult: (text: string) => void, onError: (msg: string) => void, onEnd?: () => void): any | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { onError('Voice input is not supported in this browser. Please type your message.'); return null; }
  try {
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = LANG_CODE[lang];
    rec.onresult = (e: any) => { onResult(e.results[e.results.length - 1][0].transcript); };
    rec.onerror = (e: any) => { onError(e.error === 'not-allowed' ? 'Microphone permission denied. Allow microphone access to use voice input.' : `Voice error: ${e.error}`); };
    rec.onend = () => { if (onEnd) onEnd(); };
    rec.start();
    return rec;
  } catch { onError('Could not start voice input.'); return null; }
}
