import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Mic, MicOff, Bot } from 'lucide-react';
import { AGENT_META } from '../../demo/demoAiEngine';
import { routeToAgentStructured } from '../../demo/aegisEngine';
import { speakText, stopSpeaking, startRecognition, recognitionSupported, detectSpeechLang } from '../../demo/speech';
import { VoiceControls } from './VoiceControls';
import { useLanguage } from '../../i18n/LanguageContext';

interface Msg { id: string; role: 'user' | 'mitra'; content: string; agent?: keyof typeof AGENT_META; }
export const MitraAssistant: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([{ id: 'w', role: 'mitra', content: 'Namaste, I am Mitra AI, your central assistant. Tell me what happened — for example, "There is a fire near my location" or "Show me a medical emergency" — and I will route you to the right agent. Simulated data · For real emergencies, call 112.' }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  if (!open) return null;
  const send = (raw?: string, fromVoice = false) => {
    const content = (raw ?? input).trim();
    if (!content) return;
    setInput('');
    const { agent, mitraText } = routeToAgentStructured(content, lang);
    const reply: Msg = { id: `m-${Date.now()}`, role: 'mitra', content: mitraText, agent };
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: 'user', content }, reply]);
    if (fromVoice) speakText(mitraText, detectSpeechLang(mitraText));
  };
  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    if (!recognitionSupported()) { setMessages((p) => [...p, { id: `e-${Date.now()}`, role: 'mitra', content: 'Voice input is not supported in this browser. Please type your message.' }]); return; }
    setListening(true);
    // Review first: transcript goes into the input box; the user presses Send to submit it.
    recRef.current = startRecognition(lang, (t) => { setInput(t); }, () => {}, () => setListening(false));
    if (!recRef.current) setListening(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6" role="dialog" aria-label="Mitra AI assistant">
      <button type="button" aria-label="Close Mitra" className="absolute inset-0 bg-black/40" onClick={() => { stopSpeaking(); onClose(); }} />
      <div className="relative w-full max-w-lg glass-liquid-strong rounded-[20px] shadow-xl flex flex-col max-h-[85dvh] overflow-hidden text-white">
        <div className="p-4 border-b border-white/15 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl chrome-icon flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></span>
            {listening && (<span className="aurora-wave" aria-hidden="true"><span /><span /><span /><span /><span /></span>)}
            <div className="min-w-0"><h2 className="font-bold">{t('mitra.title')}</h2><p className="text-xs text-slate-300">Routes to Rakshak / Jeevan / Agni / Sanrakshak · Simulated data · Call 112 for real emergencies</p></div>
          </div>
          <button type="button" onClick={() => { stopSpeaking(); onClose(); }} className="p-2 rounded-lg hover:bg-white/10 shrink-0" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'mitra-chrome text-white rounded-br-md' : 'glass-liquid-input text-white rounded-bl-md'}`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.role === 'mitra' && <VoiceControls text={m.content} lang={lang} />}
                {m.role === 'mitra' && m.agent && (
                  <button type="button" onClick={() => { stopSpeaking(); onClose(); navigate(`/agents/${m.agent}`); }} className="mt-2 min-h-10 px-3 rounded-xl mitra-chrome btn-glow text-white text-xs font-semibold">Open {AGENT_META[m.agent].name} →</button>
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['There is a fire near my location', 'Show me a medical emergency', 'Report a theft', 'My area is flooding'].map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="px-2.5 py-1.5 rounded-full glass-liquid-input text-xs font-medium text-white hover:border-cyan-300 hover:text-cyan-300">{q}</button>
            ))}
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-white/15 flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('mitra.placeholder')} className="flex-1 min-w-0 min-h-12 px-3.5 rounded-xl glass-liquid-input text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-300" />
          <button type="button" onClick={toggleMic} title="Voice input" className={`shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${listening ? 'bg-rose-500/25 border-rose-400/50 text-rose-300 mic-ring' : 'glass-liquid-input text-slate-200'}`}>{listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
          <button type="submit" disabled={!input.trim()} className="shrink-0 w-12 h-12 rounded-xl mitra-chrome btn-glow text-white disabled:opacity-50 flex items-center justify-center" aria-label="Send"><Send className="w-5 h-5" /></button>
        </form>
      </div>
    </div>
  );
};
