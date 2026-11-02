import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { speakText, stopSpeaking, pauseSpeaking, resumeSpeaking, speechSupported, detectSpeechLang, getVoices, saveVoiceName, getSavedVoiceName, SpeechLang } from '../../demo/speech';
import { useLanguage } from '../../i18n/LanguageContext';

export const VoiceControls: React.FC<{ text: string; lang?: SpeechLang; accent?: string }> = ({ text, lang, accent }) => {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>(getSavedVoiceName() || '');
  useEffect(() => {
    const load = () => setVoices(getVoices());
    load();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);
  const [supported] = useState(speechSupported());
  const { t } = useLanguage();
  useEffect(() => () => stopSpeaking(), []);
  if (!supported) return <p className="mt-2 text-xs text-slate-300">{t('voice.not_supported')}</p>;
  const speak = () => {
    if (muted) return;
    setSpeaking(true);
    const ok = speakText(text, lang || detectSpeechLang(text), () => setSpeaking(false));
    if (!ok) setSpeaking(false);
  };
  const stop = () => { stopSpeaking(); setSpeaking(false); setPaused(false); };
  const pause = () => { pauseSpeaking(); setPaused(true); };
  const resume = () => { resumeSpeaking(); setPaused(false); };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {speaking && (
        <span className="flex items-end gap-0.5 h-4 mr-1" aria-label="Speaking">
          {[0, 1, 2, 3, 4].map((i) => (<span key={i} className="demo-wave-bar w-1 rounded-full bg-[#2563EB]" style={{ animationDelay: `${i * 0.12}s` }} />))}
        </span>
      )}
      <button type="button" onClick={speak} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:underline"><Play className="w-3.5 h-3.5" /> {t('voice.play')}</button>
      {speaking && !paused && (<button type="button" onClick={pause} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:underline"><Pause className="w-3.5 h-3.5" /> {t('voice.pause')}</button>)}
      {speaking && paused && (<button type="button" onClick={resume} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:underline"><Play className="w-3.5 h-3.5" /> {t('voice.resume')}</button>)}
      <button type="button" onClick={stop} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:underline"><Square className="w-3.5 h-3.5" /> {t('voice.stop')}</button>
      <button type="button" onClick={speak} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:underline"><RotateCcw className="w-3.5 h-3.5" /> {t('voice.replay')}</button>
      <button type="button" onClick={() => { const m = !muted; setMuted(m); if (m) stop(); }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:underline">
        {muted ? <><VolumeX className="w-3.5 h-3.5" /> Unmute</> : <><Volume2 className="w-3.5 h-3.5" /> Mute</>}
      </button>
      <span className="text-[11px] text-slate-300">{speaking ? (paused ? t('voice.paused') : t('voice.speaking')) : muted ? t('voice.mute') : 'Voice ready (browser speech, no API key)'}</span>
      {voices.length > 0 && (
        <label className="inline-flex items-center gap-1 text-[11px] text-slate-300">
          {t('voice.voice_label')}:
          <select
            aria-label="Voice selection"
            value={voiceName}
            onChange={(e) => { setVoiceName(e.target.value); saveVoiceName(e.target.value); }}
            className="max-w-[140px] bg-white/10 border border-white/20 rounded-lg px-1.5 py-1 text-[11px] text-white"
          >
            <option value="">Auto (English / Hindi / Kannada)</option>
            {voices.map((v) => (<option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} ({v.lang})</option>))}
          </select>
        </label>
      )}
    </div>
  );
};
