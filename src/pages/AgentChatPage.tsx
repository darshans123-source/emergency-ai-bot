import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Mic, MicOff, Play, Pause, Loader2, AlertTriangle, ArrowLeft, Volume2 } from 'lucide-react';
import { api } from '../services/api';
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
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
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
      if (audioRef.current) audioRef.current.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#172033]">Agent not found</h1>
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
    setAudioError(null);
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    if (mode === 'demo') {
      // Local demo engine — no API key, no external call. Typing delay simulates thinking.
      const demo = generateAgentResponse(resolvedSlug as AgentSlug, content);
      window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: demo.text, demoMeta: { category: demo.category, priority: demo.priority, actions: demo.actions, demoInfo: demo.demoInfo } }]);
        setIsSending(false);
      }, 700);
      return;
    }
    try {
      const res = await api.openaiChat({
        agent: agent.slug,
        message: content,
        history: messages.map((m) => ({ role: m.role, content: m.content }))
      });
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: res.reply }]);
    } catch (err: any) {
      setError(err?.message || 'Could not reach the AI agent. Please retry.');
    } finally {
      setIsSending(false);
    }
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

  const toggleSpeak = async (msg: ChatMsg) => {
    if (mode === 'demo') {
      if (playingId === msg.id) { stopSpeaking(); setPlayingId(null); return; }
      setPlayingId(msg.id);
      const ok = speakText(msg.content, detectSpeechLang(msg.content), () => setPlayingId(null));
      if (!ok) { setAudioError('Browser voice output is not supported in this browser.'); setPlayingId(null); }
      return;
    }
    if (playingId === msg.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setAudioError(null);
    setAudioLoadingId(msg.id);
    try {
      const blob = await api.speak(msg.content);
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setAudioError('Audio playback failed.');
        setPlayingId(null);
      };
      setPlayingId(msg.id);
      await audio.play();
    } catch (err: any) {
      setAudioError(err?.message || 'Speech playback failed.');
    } finally {
      setAudioLoadingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-12rem)] min-h-[480px]">
      <div className="rounded-t-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs sm:text-sm text-amber-900">
        <b>AI DEMO MODE</b> — Responses, incidents, locations and dispatch operations are simulated. No real service has been contacted. For real emergencies, call <b>112</b>.
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('demo')} className={`min-h-9 px-3 rounded-lg text-xs font-semibold border ${mode === 'demo' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white border-slate-300 text-[#172033]'}`}>Demo (local, no key)</button>
          <button type="button" onClick={() => setMode('live')} className={`min-h-9 px-3 rounded-lg text-xs font-semibold border ${mode === 'live' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white border-slate-300 text-[#172033]'}`}>Live AI (needs API key)</button>
          <button type="button" onClick={() => { stopSpeaking(); setMessages([]); try { localStorage.removeItem(`aegis_demo_chat_${resolvedSlug}`); } catch { /* ignore */ } }} className="min-h-9 px-3 rounded-lg text-xs font-semibold border bg-white border-slate-300 text-[#172033]">Clear demo chat</button>
        </div>
      </div>
      <div className={`bg-gradient-to-br ${agent.gradient} text-white p-5 sm:p-6 shrink-0`}>
        <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All Agents
        </button>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">{agent.icon}</span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">{agent.name}</h1>
            <p className="text-sm text-white/85">{agent.sector}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/85 leading-relaxed">{agent.description}</p>
        <p className="mt-2 text-xs text-white/70">
          Text chat is primary. Voice playback is optional and never auto-plays.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border-x border-slate-200 px-4 sm:px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[#172033] bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 leading-relaxed">{AGENT_META[resolvedSlug as AgentSlug]?.welcome || agent.description}</p>
            <p className="text-sm text-[#64748B]">Try one of these (demo):</p>
            {(AGENT_META[resolvedSlug as AgentSlug]?.questions || agent.prompts).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="block w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB] transition"
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
                m.role === 'user' ? 'bg-[#2563EB] text-white rounded-br-md' : 'bg-slate-100 text-[#172033] rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.role === 'agent' && m.demoMeta && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs"><span className="font-semibold">Category (demo):</span> {m.demoMeta.category} · <span className="font-semibold">Priority (simulated):</span> {m.demoMeta.priority} · <span className="font-semibold">Status:</span> Demo Assessment</p>
                  <p className="text-xs"><span className="font-semibold">Suggested actions:</span> {m.demoMeta.actions.join(' · ')}</p>
                  {m.demoMeta.demoInfo.map((d) => (<p key={d} className="text-xs text-[#64748B]">• {d}</p>))}
                </div>
              )}
              {m.role === 'agent' && mode === 'demo' && <VoiceControls text={m.content} />}
              {m.role === 'agent' && mode !== 'demo' && (
                <button
                  type="button"
                  onClick={() => toggleSpeak(m)}
                  disabled={audioLoadingId === m.id}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
                >
                  {audioLoadingId === m.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading audio…</>
                  ) : playingId === m.id ? (
                    <><Pause className="w-3.5 h-3.5" /> Pause</>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Play voice</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-[#64748B] flex items-center gap-2">
              <span className="demo-typing"><span /><span /><span /></span> {agent.name} is thinking… (demo)
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="bg-white border border-slate-200 rounded-b-2xl p-3 sm:p-4 shrink-0">
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
        {audioError && (
          <div role="alert" className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" /> {audioError}
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
            className="flex-1 min-w-0 min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={toggleListen}
            title={isListening ? 'Stop listening' : 'Voice input'}
            className={`shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition ${
              isListening ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="shrink-0 w-12 h-12 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="mt-2 text-[11px] text-[#64748B]">
          In Demo mode, answers are local simulations with no API key. In Live mode, chat uses the server AI endpoint and will show a clear error if no key is configured — it will not pretend to be a live AI. For emergencies, call 112.
        </p>
      </div>
    </div>
  );
};
