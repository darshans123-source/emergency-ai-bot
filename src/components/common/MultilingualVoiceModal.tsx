import React, { useState, useEffect, useRef } from 'react';
import { SpecializedAgentId, SpecializedAgentChatMessage, IncidentCategory, IncidentPriority } from '../../types';
import { useVoiceAssistant, VoiceLanguage, LANGUAGE_OPTIONS } from '../../hooks/useVoiceAssistant';
import { AgentSceneBackdrop } from './AgentSceneBackdrop';
import { LanguageSelector } from './LanguageSelector';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { api } from '../../services/api';
import { locationService, UserLocationDetails } from '../../services/locationService';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  HeartPulse,
  Droplets,
  Zap,
  Info,
  ExternalLink,
  Sparkles,
  FileText,
  MapPin,
  Navigation
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentInfo {
  id: SpecializedAgentId;
  name: string;
  code: string;
  shortRole: string;
  accentColor: string;
  accentBg: string;
  borderAccent: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  promptExamples: Record<VoiceLanguage, string>;
}

const AGENT_LIST: AgentInfo[] = [
  {
    id: 'POLICE_TACTICAL',
    name: 'Rakshak AI 🚔',
    code: 'AGENT 01',
    shortRole: 'Police & Public Safety — accidents, security, traffic & law enforcement',
    accentColor: '#3b82f6',
    accentBg: 'bg-blue-600',
    borderAccent: 'border-blue-500',
    icon: Shield,
    promptExamples: {
      en: 'There is a road accident at Market Street. Send assistance.',
      hi: 'सड़क पर दो गाड़ियों की टक्कर हो गई है, सहायता चाहिए।',
      kn: 'ಮಾರ್ಕೆಟ್ ರಸ್ತೆಯಲ್ಲಿ ಅಪಘಾತವಾಗಿದೆ, ತಕ್ಷಣ ಸಹಾಯ ಕಳುಹಿಸಿ.'
    }
  },
  {
    id: 'HOSPITAL_EMS',
    name: 'Jeevan AI 🏥',
    code: 'AGENT 02',
    shortRole: 'Hospital & EMS — emergency medical requests, nearby hospital location & triage',
    accentColor: '#f43f5e',
    accentBg: 'bg-rose-600',
    borderAccent: 'border-rose-500',
    icon: HeartPulse,
    promptExamples: {
      en: 'Find the nearest hospital. A person has collapsed.',
      hi: 'मेरे पास अस्पताल कहाँ है? एक व्यक्ति बेहोश है।',
      kn: 'ನನ್ನ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ? ಒಬ್ಬ ವ್ಯಕ್ತಿ ಪ್ರಜ್ಞಾಹೀನನಾಗಿದ್ದಾನೆ.'
    }
  },
  {
    id: 'WATER_HYDRO',
    name: 'JalRakshak AI 💧',
    code: 'AGENT 03',
    shortRole: 'Water Supply & Hydro — water shortages, pipeline leaks & hydro repairs',
    accentColor: '#06b6d4',
    accentBg: 'bg-cyan-600',
    borderAccent: 'border-cyan-500',
    icon: Droplets,
    promptExamples: {
      en: 'A municipal water main has burst and is flooding the road.',
      hi: 'मुख्य पाइपलाइन फट गई है और सड़क पर पानी भर रहा है।',
      kn: 'ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನೀರು ಬರುತ್ತಿಲ್ಲ ಮತ್ತು ಪೈಪ್ ಸೋರಿಕೆಯಾಗಿದೆ.'
    }
  },
  {
    id: 'CURRENT_KEB',
    name: 'Shakti AI ⚡',
    code: 'AGENT 04',
    shortRole: 'Power Grid & Electricity — power outages, electrical hazards & KEB complaints',
    accentColor: '#f59e0b',
    accentBg: 'bg-amber-600',
    borderAccent: 'border-amber-500',
    icon: Zap,
    promptExamples: {
      en: 'There is a power outage in our area and a broken wire.',
      hi: 'हमारे इलाके में बिजली नहीं है और तार टूटा हुआ है।',
      kn: 'ನಮ್ಮ ಏರಿಯಾದಲ್ಲಿ ಕರೆಂಟ್ ಇಲ್ಲ ಮತ್ತು ತಂತಿ ಬಿದ್ದಿದೆ.'
    }
  }
];

const STORAGE_KEY_PREFIX = 'aegis_voice_conversations_v2';

function loadStoredAgentHistory(agentId: SpecializedAgentId): SpecializedAgentChatMessage[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}_${agentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage error
  }
  return [];
}

function saveAgentHistory(agentId: SpecializedAgentId, history: SpecializedAgentChatMessage[]) {
  try {
    sessionStorage.setItem(`${STORAGE_KEY_PREFIX}_${agentId}`, JSON.stringify(history.slice(-30)));
  } catch {
    // ignore storage error
  }
}

interface IncidentDraftData {
  title: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  description: string;
  address: string;
  casualtiesCount: number;
  summaryText: string;
  readyToSubmit: boolean;
}

interface MultilingualVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAgentId?: SpecializedAgentId;
  initialIncidentId?: string | null;
}

export const MultilingualVoiceModal: React.FC<MultilingualVoiceModalProps> = ({
  isOpen,
  onClose,
  initialAgentId = 'POLICE_TACTICAL',
  initialIncidentId = null
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<SpecializedAgentId>(initialAgentId);
  const [conversations, setConversations] = useState<Record<SpecializedAgentId, SpecializedAgentChatMessage[]>>({
    POLICE_TACTICAL: loadStoredAgentHistory('POLICE_TACTICAL'),
    HOSPITAL_EMS: loadStoredAgentHistory('HOSPITAL_EMS'),
    WATER_HYDRO: loadStoredAgentHistory('WATER_HYDRO'),
    CURRENT_KEB: loadStoredAgentHistory('CURRENT_KEB')
  });

  const [textInput, setTextInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [lastIncidentDraft, setLastIncidentDraft] = useState<IncidentDraftData | null>(null);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocationDetails | null>(() =>
    locationService.getConfirmedLocation()
  );
  const [isAcquiringGPS, setIsAcquiringGPS] = useState(false);

  const handleAcquireGPS = async () => {
    try {
      setIsAcquiringGPS(true);
      setSpeechError(null);
      const coords = await locationService.getCurrentPosition();
      const addr = await locationService.reverseGeocode(coords.latitude, coords.longitude);
      const loc: UserLocationDetails = {
        coordinates: coords,
        address: addr || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        timestamp: Date.now(),
        verified: true,
        source: 'GPS_LIVE'
      };
      locationService.setConfirmedLocation(loc);
      setUserLocation(loc);
    } catch (err: any) {
      setSpeechError(err?.message || 'Could not access device GPS.');
    } finally {
      setIsAcquiringGPS(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAgent = AGENT_LIST.find((a) => a.id === selectedAgentId) || AGENT_LIST[0];

  // Voice Assistant Hook
  const {
    language,
    setLanguage,
    currentLanguageOption,
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    speechError,
    setSpeechError,
    isRecognitionSupported,
    isSpeaking,
    speakText,
    stopSpeaking,
    replayLastResponse,
    autoSpeakEnabled,
    setAutoSpeakEnabled,
    hasVoiceForLang,
    voiceNotice
  } = useVoiceAssistant({
    initialLanguage: 'en',
    autoSpeak: true,
    onSpeechRecognized: (finalText, lang) => {
      handleSendMessage(finalText, lang);
    }
  });

  // Sync initial agent when prop changes
  useEffect(() => {
    if (initialAgentId) {
      setSelectedAgentId(initialAgentId);
    }
  }, [initialAgentId]);

  // Scroll messages to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, selectedAgentId, isProcessingAI, interimTranscript]);

  // Stop voice when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen, stopListening, stopSpeaking]);

  const currentHistory = conversations[selectedAgentId] || [];

  // Core handler: process user message and send to AI agent with intelligent routing and GPS
  const handleSendMessage = async (rawMessage: string, msgLang: VoiceLanguage = language) => {
    const text = rawMessage.trim();
    if (!text || isProcessingAI) return;

    setTextInput('');
    setSpeechError(null);
    setSubmissionError(null);
    setIsProcessingAI(true);

    // Automatic Agent Routing based on keywords
    const lower = text.toLowerCase();
    let targetAgentId = selectedAgentId;
    if (
      /(?:ಆಸ್ಪತ್ರೆ|ವೈದ್ಯ|ಆಂಬ್ಯುಲೆನ್ಸ್|ಚಿಕಿತ್ಸೆ|ಅಸ್ಪತ್ರೆ|hospital|doctor|ambulance|medical|injury|casualt|अस्पताल|एम्बुलेंस|चिकित्सा)/i.test(lower)
    ) {
      targetAgentId = 'HOSPITAL_EMS';
    } else if (
      /(?:ನೀರು|ನೀರಿನ|ಪೈಪ್|ಸೋರಿಕೆ|ಪ್ರವಾಹ|water|hydro|pipeline|leak|flood|shortage|पानी|जल|पाइप|बाढ़)/i.test(lower)
    ) {
      targetAgentId = 'WATER_HYDRO';
    } else if (
      /(?:ವಿದ್ಯುತ್|ಕರೆಂಟ್|ಬೆಳಕಿಲ್ಲ|ತಂತಿ|ಕಂಬ|ವಿದ್ಯುತ್ ಕಡಿತ|power outage|blackout|electricity|outage|keb|bescom|बिजली|करंट|पावर)/i.test(lower)
    ) {
      targetAgentId = 'CURRENT_KEB';
    } else if (
      /(?:ಪೊಲೀಸ್|ಕಳ್ಳತನ|ದರೋಡೆ|ಅಪಘಾತ|police|accident|robbery|theft|crime|safety|पुलिस|दुर्घटना|चोरी)/i.test(lower)
    ) {
      targetAgentId = 'POLICE_TACTICAL';
    }

    if (targetAgentId !== selectedAgentId) {
      setSelectedAgentId(targetAgentId);
    }

    const userMsgId = `USER-${Date.now()}`;
    const userMsg: SpecializedAgentChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const targetHistory = conversations[targetAgentId] || [];
    const updatedHistory = [...targetHistory, userMsg];
    const newConvs = { ...conversations, [targetAgentId]: updatedHistory };
    setConversations(newConvs);
    saveAgentHistory(targetAgentId, updatedHistory);

    const confirmedLoc = userLocation || locationService.getConfirmedLocation();
    const locCtx = confirmedLoc
      ? {
          latitude: confirmedLoc.coordinates.latitude,
          longitude: confirmedLoc.coordinates.longitude,
          address: confirmedLoc.address,
          accuracy: confirmedLoc.coordinates.accuracy
        }
      : null;

    try {
      const response = await api.chatWithSpecializedAgent({
        agentId: targetAgentId,
        message: text,
        history: updatedHistory,
        incidentId: initialIncidentId,
        language: msgLang,
        userLocation: locCtx
      });

      const agentReply = response.reply;
      const agentMsg: SpecializedAgentChatMessage = {
        id: `AGENT-${Date.now()}`,
        role: 'agent',
        content: agentReply,
        timestamp: response.timestamp || new Date().toISOString()
      };

      const finalHistory = [...updatedHistory, agentMsg];
      setConversations({ ...conversations, [targetAgentId]: finalHistory });
      saveAgentHistory(targetAgentId, finalHistory);

      // Handle incident draft if detected
      if (response.incidentDraft) {
        setLastIncidentDraft({
          title: response.incidentDraft.title,
          category: response.incidentDraft.category,
          priority: response.incidentDraft.priority,
          description: response.incidentDraft.description,
          address: response.incidentDraft.address,
          casualtiesCount: response.incidentDraft.casualtiesCount,
          summaryText: response.incidentDraft.summaryText,
          readyToSubmit: response.incidentDraft.readyToSubmit
        });
      }

      // Handle direct backend incident creation
      if (response.createdIncidentId) {
        setCreatedIncidentId(response.createdIncidentId);
        setLastIncidentDraft(null);
      }

      // Voice output: Speak response aloud if auto-speak is enabled
      if (autoSpeakEnabled) {
        speakText(agentReply, response.language || msgLang);
      }
    } catch (err: any) {
      console.error('[Voice Assistant Chat Error]:', err);
      const fallbackError =
        msgLang === 'hi'
          ? 'क्षमा करें, AI एजेंट से जुड़ने में समस्या हुई। कृपया दोबारा प्रयास करें।'
          : msgLang === 'kn'
          ? 'ಕ್ಷಮಿಸಿ, ಎಐ ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.'
          : 'Encountered a connection error with the AI agent. Please retry.';

      const errorMsg: SpecializedAgentChatMessage = {
        id: `ERR-${Date.now()}`,
        role: 'agent',
        content: fallbackError,
        timestamp: new Date().toISOString()
      };
      setConversations({ ...conversations, [targetAgentId]: [...updatedHistory, errorMsg] });
      setSpeechError(err?.message || 'Failed to communicate with AI agent.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Submit the drafted incident via voice / button
  const handleConfirmDraftSubmit = async () => {
    if (!lastIncidentDraft) return;

    setIsSubmittingDraft(true);
    setSubmissionError(null);

    const confirmedLoc = userLocation || locationService.getConfirmedLocation();

    try {
      const res = await api.submitVoiceReport({
        title: lastIncidentDraft.title,
        category: lastIncidentDraft.category,
        description: lastIncidentDraft.description,
        address: lastIncidentDraft.address || confirmedLoc?.address,
        casualtiesCount: lastIncidentDraft.casualtiesCount,
        priority: lastIncidentDraft.priority,
        language,
        userLocation: confirmedLoc
          ? {
              latitude: confirmedLoc.coordinates.latitude,
              longitude: confirmedLoc.coordinates.longitude,
              address: confirmedLoc.address,
              accuracy: confirmedLoc.coordinates.accuracy
            }
          : null,
        latitude: confirmedLoc?.coordinates.latitude,
        longitude: confirmedLoc?.coordinates.longitude
      });

      setCreatedIncidentId(res.incidentId);
      setLastIncidentDraft(null);

      // Confirmation message
      let confirmVoiceText = '';
      if (language === 'hi') {
        confirmVoiceText = `आपकी आपातकालीन रिपोर्ट सफलतापूर्वक दर्ज हो गई है। इंसिडेंट आईडी: ${res.incidentId}।`;
      } else if (language === 'kn') {
        confirmVoiceText = `ನಿಮ್ಮ ತುರ್ತು ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಕೆಯಾಗಿದೆ. ಇನ್ಸಿಡೆಂಟ್ ಐಡಿ: ${res.incidentId}.`;
      } else {
        confirmVoiceText = `Your emergency report has been successfully submitted to dispatch. Verified Incident ID is ${res.incidentId}.`;
      }

      const confirmMsg: SpecializedAgentChatMessage = {
        id: `CONFIRM-${Date.now()}`,
        role: 'agent',
        content: confirmVoiceText,
        timestamp: new Date().toISOString()
      };

      const updatedHistory = [...(conversations[selectedAgentId] || []), confirmMsg];
      setConversations({ ...conversations, [selectedAgentId]: updatedHistory });
      saveAgentHistory(selectedAgentId, updatedHistory);

      if (autoSpeakEnabled) {
        speakText(confirmVoiceText, language);
      }
    } catch (err: any) {
      console.error('[Submit Draft Error]:', err);
      const failText =
        language === 'hi'
          ? 'बैकएंड अनुपलब्ध होने के कारण रिपोर्ट सबमिट नहीं हो सकी। आपकी रिपोर्ट नहीं भेजी गई है।'
          : language === 'kn'
          ? 'ಬ್ಯಾಕೆಂಡ್ ದೋಷದಿಂದಾಗಿ ವರದಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ವರದಿ ಸಲ್ಲಿಕೆಯಾಗಿಲ್ಲ.'
          : 'Could not submit report because the dispatch backend is unavailable. The report was NOT submitted.';

      setSubmissionError(failText);
      if (autoSpeakEnabled) {
        speakText(failText, language);
      }
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mitra AI Multilingual Emergency Voice Assistant"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col bg-[#091122] rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Agent Scene Backdrop Visuals */}
        <div className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
          <AgentSceneBackdrop agentId={selectedAgentId} variant="banner" />
        </div>

        {/* Header Bar - MITRA AI Branding */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/40"
            >
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 font-bold">
                  VOICE AI
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  MITRA AI
                </h2>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">•</span>
                <span className="text-xs text-blue-300 font-medium hidden sm:inline">
                  {activeAgent.name}
                </span>
              </div>
              <p className="text-xs text-slate-300">Speak Naturally. Get Help Quickly.</p>
            </div>
          </div>

          {/* Right Controls: Live GPS Status, Language Selector & Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {userLocation ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40"
                title={`GPS Accuracy: ±${userLocation.coordinates.accuracy}m | ${userLocation.address}`}
              >
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="max-w-[130px] truncate">{userLocation.address.split(',')[0]}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAcquireGPS}
                disabled={isAcquiringGPS}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-300 bg-blue-950/60 border border-blue-500/40 hover:bg-blue-900/60 transition cursor-pointer"
                title="Share current device GPS location with AI"
              >
                {isAcquiringGPS ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                ) : (
                  <Navigation className="w-3 h-3 text-blue-400" />
                )}
                <span>{isAcquiringGPS ? 'Locating...' : 'Enable GPS'}</span>
              </button>
            )}

            <LanguageSelector
              currentLanguage={language}
              onSelectLanguage={(l) => {
                setLanguage(l);
                stopSpeaking();
              }}
              size="sm"
            />

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Mitra AI"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agent Selector Tabs */}
        <div className="relative z-10 flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-slate-950/70 border-b border-slate-800/80 overflow-x-auto scrollbar-none">
          {AGENT_LIST.map((ag) => {
            const isSelected = selectedAgentId === ag.id;
            return (
              <button
                key={ag.id}
                type="button"
                onClick={() => {
                  setSelectedAgentId(ag.id);
                  setLastIncidentDraft(null);
                  stopSpeaking();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <ag.icon className="w-3.5 h-3.5" style={{ color: ag.accentColor }} />
                <span>{ag.name}</span>
              </button>
            );
          })}
        </div>

        {/* Voice Limitation & Status Banners */}
        {voiceNotice && (
          <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-amber-950/60 border-b border-amber-800/60 text-amber-300 text-xs">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{voiceNotice}</span>
          </div>
        )}

        {speechError && (
          <div className="relative z-10 flex items-center justify-between gap-2 px-4 py-2 bg-rose-950/80 border-b border-rose-800/60 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{speechError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-rose-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {createdIncidentId && (
          <div className="relative z-10 flex items-center justify-between gap-2 px-4 py-2.5 bg-emerald-950/80 border-b border-emerald-800/70 text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Report successfully submitted to backend dispatch! Incident ID:{' '}
                <strong className="font-mono text-emerald-100">{createdIncidentId}</strong>
              </span>
            </div>
            <Link
              to={`/incidents/${createdIncidentId}`}
              className="flex items-center gap-1 font-semibold text-emerald-200 underline hover:text-white"
            >
              <span>View Incident</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Conversation Dialogue Area */}
        <div className="relative z-10 flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {currentHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${activeAgent.accentColor}20`, borderColor: activeAgent.accentColor }}
              >
                <activeAgent.icon className="w-8 h-8" style={{ color: activeAgent.accentColor }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Speak naturally in {currentLanguageOption.name} ({currentLanguageOption.nativeName})
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Press the microphone button below to start voice reporting or consultation. No typing required.
                </p>
              </div>

              {/* Suggested Voice Prompt for Active Language */}
              <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Example voice input ({currentLanguageOption.nativeName}):
                </span>
                <p className="text-xs text-blue-300 font-medium mt-1 italic">
                  "{activeAgent.promptExamples[language]}"
                </p>
                <button
                  type="button"
                  onClick={() => handleSendMessage(activeAgent.promptExamples[language], language)}
                  className="mt-2 text-[11px] text-slate-300 hover:text-white flex items-center gap-1 underline"
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Try this voice prompt now</span>
                </button>
              </div>
            </div>
          ) : (
            currentHistory.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                    <span>{isUser ? 'You (Voice / Text)' : activeAgent.name}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900/95 text-slate-100 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Speaker Replay Button for Agent Message */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => speakText(msg.content, language)}
                          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                          title="Replay spoken response"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Replay Audio</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Live Recognized Transcription (Interim) */}
          {interimTranscript && (
            <div className="flex flex-col items-end space-y-1 animate-pulse">
              <span className="text-[11px] text-slate-400">Listening to voice input...</span>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm italic bg-blue-900/40 border border-blue-500/50 text-blue-200 rounded-tr-none">
                "{interimTranscript}"
              </div>
            </div>
          )}

          {/* AI Thinking Indicator */}
          {isProcessingAI && (
            <div className="flex items-center gap-3 p-3 bg-slate-900/80 border border-blue-500/30 rounded-xl text-blue-300 text-xs w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>{activeAgent.name} is thinking & analyzing emergency request...</span>
            </div>
          )}

          {/* Structured Incident Draft Card */}
          {lastIncidentDraft && (
            <div className="p-4 bg-slate-900/95 border-2 border-amber-500/60 rounded-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Voice Incident Draft Ready For Confirmation</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {lastIncidentDraft.priority}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Emergency Type:</span>
                  <p className="font-semibold text-white">{lastIncidentDraft.title}</p>
                </div>
                <div>
                  <span className="text-slate-400">Location:</span>
                  <p className="font-semibold text-white">{lastIncidentDraft.address}</p>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Description:</span>
                <p className="italic mt-0.5">"{lastIncidentDraft.description}"</p>
              </div>

              {submissionError && (
                <p className="text-xs text-rose-400 font-medium">{submissionError}</p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLastIncidentDraft(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDraftSubmit}
                  disabled={isSubmittingDraft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isSubmittingDraft ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting to Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Submit to Dispatch Queue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Equalizer Bar (Active when listening or speaking) */}
        {(isListening || isSpeaking) && (
          <div className="relative z-10 px-6 py-1 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono text-slate-300">
                {isListening ? `Listening (${currentLanguageOption.name})...` : 'Agent Speaking...'}
              </span>
            </div>
            <SoundWaveVisualizer
              isActive={isListening || isSpeaking}
              color={isListening ? '#ef4444' : activeAgent.accentColor}
            />
          </div>
        )}

        {/* Bottom Control Console */}
        <div className="relative z-10 p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex flex-col gap-3">
          {/* Main Voice Controls: Large Mic Button */}
          <div className="flex items-center justify-between gap-4">
            {/* Audio Output Controls (Mute / Auto-Speak) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  autoSpeakEnabled
                    ? 'text-blue-300 bg-blue-950/60 border-blue-800'
                    : 'text-slate-500 bg-slate-900 border-slate-800'
                }`}
                title="Toggle Voice Output"
              >
                {autoSpeakEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Voice {autoSpeakEnabled ? 'On' : 'Muted'}</span>
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="px-2 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-950/60 border border-rose-800 hover:bg-rose-900/60"
                  title="Stop speaking"
                >
                  Stop Voice
                </button>
              )}
            </div>

            {/* Central Large Microphone Button */}
            <div className="flex items-center justify-center">
              {isListening ? (
                <button
                  type="button"
                  onClick={stopListening}
                  className="group relative flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-xl shadow-red-600/40 hover:from-red-500 hover:to-rose-500 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-red-500/30"
                  title="Stop voice listening"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                  <MicOff className="w-5 h-5" />
                  <span>Stop Listening</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startListening}
                  disabled={!isRecognitionSupported}
                  className="group relative flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/40 hover:from-blue-500 hover:to-indigo-500 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-blue-500/20 disabled:opacity-50"
                  title="Tap to speak your emergency report"
                >
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Tap to Speak ({currentLanguageOption.nativeName})</span>
                </button>
              )}
            </div>

            {/* Replay Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => replayLastResponse(selectedAgentId)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Replay last response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Replay</span>
              </button>
            </div>
          </div>

          {/* Fallback Text Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(textInput, language);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Or type in ${currentLanguageOption.name} (${currentLanguageOption.nativeName})...`}
              disabled={isProcessingAI}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessingAI}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
