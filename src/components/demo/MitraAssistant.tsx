import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Mic, MicOff, Bot } from 'lucide-react';
import { AGENT_META } from '../../demo/demoAiEngine';
import { routeToAgentStructured } from '../../demo/aegisEngine';
import { speakText, stopSpeaking, startRecognition, recognitionSupported, detectSpeechLang } from '../../demo/speech';
import { VoiceControls } from './VoiceControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';

interface Msg { id: string; role: 'user' | 'mitra'; content: string; agent?: keyof typeof AGENT_META; source?: 'local' | 'freeai' | 'openrouter' | 'gemini' | 'error'; }
export const MitraAssistant: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([{ id: 'w', role: 'mitra', content: 'Namaste, I am Mitra AI, your central assistant. Tell me what happened — for example, "There is a fire near my location" or "Show me a medical emergency" — and I will route you to the right agent. Simulated data · For real emergencies, call 112.' }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [mitraSending, setMitraSending] = useState(false);

  const recRef = useRef<any>(null);
  if (!open) return null;
  const send = async (raw?: string, fromVoice = false) => {
    const content = (raw ?? input).trim();
    if (!content || mitraSending) return;
    setInput('');
    const { agent } = routeToAgentStructured(content, lang);
    // Mitra always routes locally first. When Free.ai is selected in
    // Settings, the answer itself comes from Free.ai via the backend
    // (the server holds the key); any failure falls back to the local
    // routing text so Mitra never goes silent.
    // The local routing above only picks which agent's instructions the
    // server uses — it never supplies the answer. The server uses OpenRouter
    // when its key is set, otherwise Gemini. On any failure an error message
    // is shown instead of a local reply, so a local answer is never
    // presented as AI.
    let replyText: string | null = null;
    let source: 'gemini' | 'openrouter' | 'error' = 'gemini';
    setMitraSending(true);
    try {
      const live = await api.aiChat({ agent, message: content }, 10000);
      replyText = live.reply;
      source = live.provider === 'openrouter' ? 'openrouter' : 'gemini';
    } catch (err: any) {
      source = 'error';
      replyText = `The AI assistant is unavailable (${err?.message || 'server error'}). No answer has been substituted — check the AI key in Settings.`;
    } finally {
      setMitraSending(false);
    }
    const reply: Msg = { id: `m-${Date.now()}`, role: 'mitra', content: replyText || '', agent, source };
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: 'user', content }, reply]);
    if (fromVoice && source !== 'error') speakText(replyText || '', detectSpeechLang(replyText || ''));
    if (fromVoice && source === 'error') speakText('The AI assistant is unavailable. Please try again.', detectSpeechLang(replyText || ''));
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
      <button type="button" aria-label="Close Mitra" className="absolute inset-0 bg-black/30" onClick={() => { stopSpeaking(); onClose(); }} />
      <div className="relative w-full max-w-lg bg-[#071329]/80 backdrop-blur-xl border border-white/15 rounded-[20px] shadow-xl flex flex-col max-h-[85dvh] overflow-hidden text-white">
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
                {m.role === 'mitra' && (m.source === 'gemini' || m.source === 'openrouter') && (<p className="mt-1.5 text-[11px] font-semibold text-cyan-300">Live {m.source === 'openrouter' ? 'OpenRouter' : 'Gemini'} reply · decision support only, call 112 for real emergencies</p>)}
                {m.role === 'mitra' && m.source === 'error' && (<p className="mt-1.5 text-[11px] font-semibold text-rose-300">AI error — no substitute answer given</p>)}
                {m.role === 'mitra' && <VoiceControls text={m.content} lang={lang} />}
                {m.role === 'mitra' && m.agent && (
                  <button type="button" onClick={() => { stopSpeaking(); onClose(); navigate(`/agents/${m.agent}`); }} className="mt-2 min-h-10 px-3 rounded-xl mitra-chrome btn-glow text-white text-xs font-semibold">Open {AGENT_META[m.agent].name} →</button>
                )}
              </div>
            </div>
          ))}
          {mitraSending && (
            <div className="flex justify-start">
              <div className="glass-liquid-input rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                <span className="demo-typing"><span /><span /><span /></span> Mitra is thinking…
              </div>
            </div>
          )}
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
