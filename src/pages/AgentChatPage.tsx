import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Mic, MicOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { generateAgentResponse, AGENT_META, AgentSlug } from '../demo/demoAiEngine';
import { VoiceControls } from '../components/demo/VoiceControls';
import { speakText, stopSpeaking, detectSpeechLang } from '../demo/speech';
import { AGENT_CARDS } from './AgentsPage';

interface ChatMsg {
  id: string;
  role: 'user' | 'agent';
  content: string;
  demoMeta?: { category: string; priority: string; actions: string[]; demoInfo: string[] };
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
      <div className="max-w-3xl mx-auto glass-liquid-strong rounded-2xl shadow-sm p-6 text-white">
        <h1 className="text-xl font-bold text-white">Agent not found</h1>
        <p className="mt-2 text-sm text-[#64748B]">The agent “{slug}” does not exist. Choose an agent from the hub.</p>
        <button type="button" onClick={() => navigate('/agents')} className="mt-4 min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
          Back to Agents
        </button>
      </div>
    );
  }

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
    const demo = generateAgentResponse(resolvedSlug as AgentSlug, content);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: demo.text, demoMeta: { category: demo.category, priority: demo.priority, actions: demo.actions, demoInfo: demo.demoInfo } }]);
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
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInput(transcript);
      };
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setVoiceError('Microphone permission denied. Allow microphone access in your browser to use voice input.');
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
    setMessages([]);
    try { localStorage.removeItem(`aegis_demo_chat_${resolvedSlug}`); } catch { /* ignore */ }
  };
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-12rem)] min-h-[480px] text-white">
      <div className={`glass-liquid-strong rounded-t-2xl border-b-0 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-40`} aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2">
          <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white mb-0">
            <ArrowLeft className="w-3.5 h-3.5" /> All Agents
          </button>
          <button type="button" onClick={clearConversation} className="min-h-9 px-3 rounded-xl border border-white/25 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 shrink-0">Clear conversation</button>
        </div>
        <div className="relative flex items-center gap-3 mt-3">
          <span className="w-12 h-12 rounded-2xl chrome-icon flex items-center justify-center shrink-0">{agent.icon}</span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">{agent.name}</h1>
            <p className="text-sm text-white/85">{agent.sector}</p>
          </div>
        </div>
        <p className="relative mt-3 text-sm text-white/85 leading-relaxed">{agent.description}</p>
        <p className="relative mt-2 text-xs text-white/70">
          Text chat is primary. Voice playback is optional and never auto-plays.
          {isListening && (<span className="ml-2 inline-flex items-center gap-1 text-cyan-300 font-semibold"><span className="aurora-wave"><span /><span /><span /><span /><span /></span> Listening…</span>)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto glass-liquid rounded-none border-t-0 border-b-0 px-4 sm:px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white glass-liquid-input rounded-xl px-3.5 py-3 leading-relaxed">{AGENT_META[resolvedSlug as AgentSlug]?.welcome || agent.description}</p>
            <p className="text-sm text-slate-300">Try one of these:</p>
            {(AGENT_META[resolvedSlug as AgentSlug]?.questions || agent.prompts).map((p) => (
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
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.role === 'agent' && m.demoMeta && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs"><span className="font-semibold">Category:</span> {m.demoMeta.category} · <span className="font-semibold">Priority (simulated):</span> {m.demoMeta.priority} · <span className="font-semibold">Status:</span> Simulated assessment</p>
                  <p className="text-xs"><span className="font-semibold">Suggested actions:</span> {m.demoMeta.actions.join(' · ')}</p>
                  {m.demoMeta.demoInfo.map((d) => (<p key={d} className="text-xs text-slate-300">• {d}</p>))}
                </div>
              )}
              {m.role === 'agent' && <VoiceControls text={m.content} />}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="glass-liquid-input rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
              <span className="demo-typing"><span /><span /><span /></span> {agent.name} is thinking…
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
            placeholder={`Message ${agent.name}…`}
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
          Responses are generated by the local engine in this browser. Simulated data — for real emergencies, call 112.
        </p>
      </div>
    </div>
  );
};
