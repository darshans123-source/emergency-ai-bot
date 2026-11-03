import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Mic, MicOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { AGENT_META, AgentSlug } from '../demo/demoAiEngine';
import { generateStructuredResponse, structuredToText, ConversationContext, StructuredResponse } from '../demo/aegisEngine';
import { loadDemoIncidents, saveDemoIncidents } from '../demo/demoStore';
import { VoiceControls } from '../components/demo/VoiceControls';
import { speakText, stopSpeaking, detectSpeechLang } from '../demo/speech';
import { AGENT_CARDS } from './AgentsPage';
import { useLanguage } from '../i18n/LanguageContext';

interface ChatMsg {
  id: string;
  role: 'user' | 'agent';
  content: string;
  demoMeta?: { category: string; priority: string; actions: string[]; demoInfo: string[] };
  structured?: StructuredResponse;
  savedAsIncident?: boolean;
}

const LEGACY_MAP: Record<string, string> = {
  POLICE_TACTICAL: 'rakshak',
  HOSPITAL_EMS: 'jeevan',
  WATER_HYDRO: 'sanrakshak',
  CURRENT_KEB: 'sanrakshak'
};

export const AgentChatPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const resolvedSlug = LEGACY_MAP[(slug || '').toUpperCase()] || (slug || '').toLowerCase();
  const agent = AGENT_CARDS.find((a) => a.slug === resolvedSlug);
  const { t, lang, agents: agentTranslations } = useLanguage();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);
  // Demo chat history is stored in this browser only, per agent.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`aegis_demo_chat_${resolvedSlug}`);
      if (raw) { const v = JSON.parse(raw); if (Array.isArray(v)) setMessages(v); }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSlug]);
  useEffect(() => {
    try { localStorage.setItem(`aegis_demo_chat_${resolvedSlug}`, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-slate-900">
        <h1 className="text-xl font-bold text-slate-900">Agent not found</h1>
        <p className="mt-2 text-sm text-slate-500">The agent “{slug}” does not exist. Choose an agent from the hub.</p>
        <button type="button" onClick={() => navigate('/agents')} className="mt-4 min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
          Back to Agents
        </button>
      </div>
    );
  }

  const contextRef = useRef<ConversationContext>({ turnCount: 0 });
  const saveAsIncident = (m: ChatMsg) => {
    if (!m.structured) return;
    const r = m.structured;
    const list = loadDemoIncidents();
    if (list.some((i) => i.id === r.incident_id)) { setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, savedAsIncident: true } : x))); return; }
    const city = ['Bengaluru', 'Hyderabad', 'Raichur', 'Kalaburagi', 'Hubballi', 'Mysuru'].includes(r.location) ? r.location : 'Not specified';
    saveDemoIncidents([{ id: r.incident_id, title: r.category, category: r.category, priority: r.priority, status: 'ACTIVE', city, address: r.location, description: r.summary, createdAt: r.timestamp } as any, ...list]);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, savedAsIncident: true } : x)));
  };
  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;
    setError(null);
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    // Local engine only: no external AI endpoint is called, so no API-key
    // or backend error can appear here. The previous Live mode called
    // /ai/openai and showed "OpenAI not configured" when no key was set;
    // that option has been removed.
    const { response, context } = generateStructuredResponse(resolvedSlug as AgentSlug, content, contextRef.current, lang);
    contextRef.current = context;
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: structuredToText(response), structured: response }]);
      setIsSending(false);
    }, 700);
    return;
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    setVoiceError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Please type your message.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = ({ en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', te: 'te-IN' } as const)[lang] || 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInput(transcript);
      };
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setVoiceError(t('voice.mic_denied'));
        else if (event.error !== 'no-speech') setVoiceError(`Voice error: ${event.error}`);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceError('Could not start voice input.');
      setIsListening(false);
    }
  };

  const clearConversation = () => {
    contextRef.current = { turnCount: 0 };
    setMessages([]);
    try { localStorage.removeItem(`aegis_demo_chat_${resolvedSlug}`); } catch { /* ignore */ }
  };
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-12rem)] min-h-[420px] text-white bg-[#071329]/70 backdrop-blur-xl border border-white/15 rounded-[24px] overflow-hidden shadow-lg shadow-blue-900/20">
      <div className={`glass-liquid-strong rounded-t-2xl border-b-0 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-40`} aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2">
          <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white mb-0 min-h-11">
            <ArrowLeft className="w-3.5 h-3.5" /> {t('chat.all_agents')}
          </button>
          <button type="button" onClick={clearConversation} className="min-h-11 px-3 rounded-xl border border-white/25 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 shrink-0">{t('chat.clear_conversation')}</button>
        </div>
        <div className="relative flex items-center gap-3 mt-3">
          <span className="w-12 h-12 rounded-2xl chrome-icon flex items-center justify-center shrink-0">{agent.icon}</span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">{agent.name}</h1>
            <p className="text-sm text-white/85">{agentTranslations[agent.slug]?.sector || agent.sector}</p>
          </div>
        </div>
        <p className="relative mt-3 text-sm text-white/85 leading-relaxed">{agentTranslations[agent.slug]?.description || agent.description}</p>
        <p className="relative mt-2 text-xs text-white/70">
          {t('chat.voice_note')}
          {isListening && (<span className="ml-2 inline-flex items-center gap-1 text-cyan-300 font-semibold"><span className="aurora-wave"><span /><span /><span /><span /><span /></span> Listening…</span>)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto glass-liquid rounded-none border-t-0 border-b-0 px-4 sm:px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white glass-liquid-input rounded-xl px-3.5 py-3 leading-relaxed">{AGENT_META[resolvedSlug as AgentSlug]?.welcome || agent.description}</p>
            <p className="text-sm text-slate-300">{t('chat.try_one')}</p>
            {(agentTranslations[resolvedSlug]?.prompts || AGENT_META[resolvedSlug as AgentSlug]?.questions || agent.prompts).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="block w-full text-left px-3.5 py-2.5 rounded-xl glass-liquid-input text-sm text-white hover:border-cyan-300 hover:text-cyan-300 transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user' ? 'mitra-chrome text-white rounded-br-md shadow-lg shadow-blue-500/25' : 'glass-liquid-input text-white rounded-bl-md'
              }`}
            >
              {m.role === 'agent' && m.structured ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-white">{m.structured.agent}</span>
                    <span className="text-[11px] text-slate-300">{m.structured.incident_id} · {m.structured.timestamp}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white">{m.structured.category}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${m.structured.priority === 'CRITICAL' ? 'bg-rose-500/25 border-rose-400/50 text-rose-200' : m.structured.priority === 'HIGH' ? 'bg-amber-500/25 border-amber-400/50 text-amber-200' : m.structured.priority === 'MEDIUM' ? 'bg-blue-500/25 border-blue-400/50 text-blue-200' : 'bg-slate-500/25 border-slate-400/50 text-slate-200'}`}>{lang === 'en' ? m.structured.priority : t(`common.${m.structured.priority.toLowerCase()}`)}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">{m.structured.status}</span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-300">Simulated data</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-white">{m.structured.summary}</p>
                  <div className="rounded-xl bg-white/10 border border-white/15 p-2.5">
                    <p className="text-xs font-semibold text-white">{t('chat.risk_assessment')}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{m.structured.risk_assessment}</p>
                    <p className="text-xs text-slate-300 mt-1.5">{t('chat.location')}: {m.structured.location} · {t('chat.no_unit_dispatched')} · {t('chat.no_response_time')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">{t('chat.recommended_actions')}</p>
                    <ol className="space-y-1">
                      {m.structured.recommended_actions.map((a, i) => (<li key={i} className="text-xs text-slate-200 flex gap-2"><span className="font-bold text-cyan-300">{i + 1}.</span><span>{a}</span></li>))}
                    </ol>
                  </div>
                  {m.structured.routing_note && (
                    <div className="rounded-xl bg-cyan-500/15 border border-cyan-400/40 p-2.5">
                      <p className="text-xs text-cyan-100">{m.structured.routing_note}</p>
                      <button type="button" onClick={() => navigate(`/agents/${m.structured!.detectedAgentSlug}`)} className="mt-2 min-h-11 px-3 rounded-xl mitra-chrome text-xs font-semibold text-white">Open {m.structured.agent} →</button>
                    </div>
                  )}
                  {m.structured.follow_up_question && (<p className="text-xs text-slate-300">{t('chat.follow_up')}: {m.structured.follow_up_question}</p>)}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onClick={() => saveAsIncident(m)} disabled={m.savedAsIncident} className="min-h-11 px-3 rounded-xl border border-white/25 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50">{m.savedAsIncident ? t('chat.saved_to_incident_list') : t('chat.save_as_incident')}</button>
                  </div>
                  <VoiceControls text={m.structured.voice_response} lang={lang} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              )}
              {m.role === 'agent' && m.demoMeta && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs"><span className="font-semibold">Category:</span> {m.demoMeta.category} · <span className="font-semibold">Priority (simulated):</span> {m.demoMeta.priority} · <span className="font-semibold">Status:</span> Simulated assessment</p>
                  <p className="text-xs"><span className="font-semibold">Suggested actions:</span> {m.demoMeta.actions.join(' · ')}</p>
                  {m.demoMeta.demoInfo.map((d) => (<p key={d} className="text-xs text-slate-300">• {d}</p>))}
                </div>
              )}
              {m.role === 'agent' && !m.structured && <VoiceControls text={m.content} lang={lang} />}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="glass-liquid-input rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
              <span className="demo-typing"><span /><span /><span /></span> {agent.name} {t('chat.thinking')}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="glass-liquid-strong rounded-b-2xl p-3 sm:p-4 shrink-0">
        {error && (
          <div role="alert" className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button type="button" onClick={() => messages.length > 0 && send(messages[messages.length - 1].content)} className="ml-auto font-semibold underline shrink-0">
              Retry
            </button>
          </div>
        )}
        {voiceError && (
          <div role="alert" className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-sm text-amber-800">
            {voiceError}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.message_placeholder')}
            className="flex-1 min-w-0 min-h-12 px-3.5 rounded-xl glass-liquid-input text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300"
          />
          <button
            type="button"
            onClick={toggleListen}
            title={isListening ? 'Stop listening' : 'Voice input'}
            className={`shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition btn-glow ${
              isListening ? 'bg-rose-500/25 border-rose-400/50 text-rose-300 mic-ring' : 'glass-liquid-input text-slate-200 hover:text-white'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="shrink-0 w-12 h-12 rounded-xl mitra-chrome btn-glow text-white disabled:opacity-50 flex items-center justify-center transition"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          {t('chat.simulated_note')}
        </p>
      </div>
    </div>
  );
};
