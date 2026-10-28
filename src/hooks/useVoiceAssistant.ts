import { useState, useEffect, useRef, useCallback } from 'react';
import { SpecializedAgentId } from '../types';

export type VoiceLanguage = 'en' | 'hi' | 'kn';

export interface LanguageOption {
  code: VoiceLanguage;
  name: string;
  nativeName: string;
  recognitionLang: string;
  speechSynthesisPrefix: string;
  examplePrompt: string;
  exampleResponse: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    recognitionLang: 'en-IN',
    speechSynthesisPrefix: 'en',
    examplePrompt: 'There is a power outage in my area.',
    exampleResponse: 'I can help you report the power outage. Please share your location.'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    recognitionLang: 'hi-IN',
    speechSynthesisPrefix: 'hi',
    examplePrompt: 'मेरे इलाके में आग लग गई है, जल्दी मदद भेजिए।',
    exampleResponse: 'मैं आपकी मदद करता हूँ। कृपया अपना स्थान बताएं।'
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    recognitionLang: 'kn-IN',
    speechSynthesisPrefix: 'kn',
    examplePrompt: 'ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನೀರು ಬರುತ್ತಿಲ್ಲ.',
    exampleResponse: 'ನಿಮ್ಮ ನೀರಿನ ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ತಿಳಿಸಿ.'
  }
];

export interface UseVoiceAssistantOptions {
  initialLanguage?: VoiceLanguage;
  onSpeechRecognized?: (text: string, language: VoiceLanguage) => void;
  autoSpeak?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const { initialLanguage = 'en', onSpeechRecognized, autoSpeak = true } = options;

  const [language, setLanguage] = useState<VoiceLanguage>(initialLanguage);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(true);
  const [isSynthesisSupported, setIsSynthesisSupported] = useState(true);

  // Speech Synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingAgentId, setSpeakingAgentId] = useState<SpecializedAgentId | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aegis_auto_speak');
      return stored !== null ? stored === 'true' : autoSpeak;
    }
    return autoSpeak;
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasVoiceForLang, setHasVoiceForLang] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenByAgentRef = useRef<Record<string, string>>({});
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingTimeoutRef = useRef<any>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Save autoSpeak preference to localStorage
  const handleSetAutoSpeak = useCallback((enabled: boolean) => {
    setAutoSpeakEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_auto_speak', String(enabled));
    }
  }, []);

  // Initialize SpeechSynthesis and handle asynchronous voice loading
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSynthesisSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      if (!synthRef.current) return;
      const available = synthRef.current.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();

    if ('onvoiceschanged' in synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    // Polling fallback for browsers where onvoiceschanged fires late
    const retryTimeout = setTimeout(loadVoices, 250);
    const retryTimeout2 = setTimeout(loadVoices, 1000);

    return () => {
      clearTimeout(retryTimeout);
      clearTimeout(retryTimeout2);
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = null;
      }
    };
  }, []);

  // Check voice availability for selected language
  useEffect(() => {
    const currentOpt = LANGUAGE_OPTIONS.find((l) => l.code === language);
    if (!currentOpt || voices.length === 0) return;

    const prefix = currentOpt.speechSynthesisPrefix.toLowerCase();
    const exactLang = currentOpt.recognitionLang.toLowerCase();

    const matching = voices.filter((v) => {
      const vLang = v.lang.toLowerCase();
      const vName = v.name.toLowerCase();
      if (vLang === exactLang) return true;
      if (vLang.startsWith(prefix)) return true;
      if (prefix === 'hi' && (vName.includes('hindi') || vName.includes('हिन्दी'))) return true;
      if (prefix === 'kn' && (vName.includes('kannada') || vName.includes('ಕನ್ನಡ'))) return true;
      return false;
    });

    if (matching.length > 0) {
      setHasVoiceForLang(true);
      setVoiceNotice(null);
    } else {
      setHasVoiceForLang(false);
      if (prefix !== 'en') {
        setVoiceNotice(
          `Language voice for ${currentOpt.nativeName} is not pre-installed in your browser/OS. The text response is displayed on screen.`
        );
      }
    }
  }, [language, voices]);

  // Check Web Speech API Recognition support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecognitionSupported(false);
      setSpeechError(
        'Browser speech recognition is not supported in this browser. Please use text input or Chrome/Edge.'
      );
    }
  }, []);

  // Stop current speech synthesis cleanly
  const stopSpeaking = useCallback(() => {
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {
        // ignore
      }
    }
    setIsSpeaking(false);
    setSpeakingAgentId(null);
    activeUtteranceRef.current = null;
  }, []);

  /**
   * Core Reusable Text-To-Speech Function
   * Robust implementation that avoids Chromium cancel lockup, preserves utterances from GC,
   * selects best language voices, and handles agent switching safely.
   */
  const speakResponse = useCallback(
    (textToSpeak: string, customLang?: VoiceLanguage, targetAgentId?: SpecializedAgentId) => {
      if (!synthRef.current || !textToSpeak) return;

      const trimmed = textToSpeak.trim();
      if (!trimmed) return;

      // Clean markdown tags or symbols for clear, natural emergency speech
      const cleanedText = trimmed
        .replace(/###|##|#|\*\*|\*|`|\[|\]|\(|\)/g, '')
        .replace(/- /g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleanedText) return;

      const targetLang = customLang || language;
      const targetOpt = LANGUAGE_OPTIONS.find((l) => l.code === targetLang) || LANGUAGE_OPTIONS[0];

      // Stop speech recognition while speaking to prevent feedback loops
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        setIsListening(false);
      }

      // Stop any pending speech timeout
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
        speakingTimeoutRef.current = null;
      }

      // Cancel previous speech if active
      try {
        synthRef.current.cancel();
      } catch {
        // ignore
      }

      lastSpokenTextRef.current = cleanedText;
      if (targetAgentId) {
        lastSpokenByAgentRef.current[targetAgentId] = cleanedText;
      }

      // Brief tick delay after cancel to prevent Chromium from immediately dropping the new utterance
      speakingTimeoutRef.current = setTimeout(() => {
        if (!synthRef.current) return;

        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = targetOpt.recognitionLang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Persist reference to avoid Chromium garbage collection bug
        activeUtteranceRef.current = utterance;
        (window as any).__aegis_active_utterance = utterance;

        // Find best matching voice for selected language
        const availableVoices = synthRef.current.getVoices();
        const prefix = targetOpt.speechSynthesisPrefix.toLowerCase();
        const exactLang = targetOpt.recognitionLang.toLowerCase();

        const matchingVoices = availableVoices.filter((v) => {
          const vLang = v.lang.toLowerCase();
          const vName = v.name.toLowerCase();
          if (vLang === exactLang) return true;
          if (vLang.startsWith(prefix)) return true;
          if (prefix === 'hi' && (vName.includes('hindi') || vName.includes('हिन्दी'))) return true;
          if (prefix === 'kn' && (vName.includes('kannada') || vName.includes('ಕನ್ನಡ'))) return true;
          return false;
        });

        if (matchingVoices.length > 0) {
          const preferred =
            matchingVoices.find((v) => v.lang.toLowerCase() === exactLang) ||
            matchingVoices.find((v) => !v.localService) ||
            matchingVoices[0];
          utterance.voice = preferred;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingAgentId(targetAgentId || null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingAgentId(null);
          activeUtteranceRef.current = null;
        };

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('[SpeechSynthesis] Utterance error:', e.error);
          }
          setIsSpeaking(false);
          setSpeakingAgentId(null);
          activeUtteranceRef.current = null;
        };

        synthRef.current.speak(utterance);
      }, 60);
    },
    [language, isListening]
  );

  // Alias for backward compatibility
  const speakText = useCallback(
    (textToSpeak: string, customLang?: VoiceLanguage) => {
      speakResponse(textToSpeak, customLang);
    },
    [speakResponse]
  );

  // Replay last response for an agent or globally
  const replayLastResponse = useCallback(
    (agentId?: SpecializedAgentId) => {
      const textToReplay =
        (agentId && lastSpokenByAgentRef.current[agentId]) || lastSpokenTextRef.current;
      if (textToReplay) {
        speakResponse(textToReplay, language, agentId);
      }
    },
    [language, speakResponse]
  );

  // Start Speech Recognition
  const startListening = useCallback(() => {
    setSpeechError(null);
    setTranscript('');
    setInterimTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        'Speech recognition is not available in your current browser. You can type your emergency report below.'
      );
      return;
    }

    // Stop speaking when user starts talking
    stopSpeaking();

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const currentOpt = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];
      const recognition = new SpeechRecognition();
      recognition.lang = currentOpt.recognitionLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript;
          } else {
            interimStr += item[0].transcript;
          }
        }

        if (interimStr) {
          setInterimTranscript(interimStr);
        }

        if (finalStr) {
          setTranscript(finalStr);
          setInterimTranscript('');
          if (onSpeechRecognized) {
            onSpeechRecognized(finalStr, language);
          }
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Microphone access denied. Please click the microphone icon in your browser address bar and choose "Allow".'
          );
        } else if (event.error === 'language-not-supported') {
          const langName = currentOpt.name;
          setSpeechError(
            `${langName} (${currentOpt.recognitionLang}) speech recognition is not supported by your current browser engine. Please type your message in ${langName} below.`
          );
        } else if (event.error === 'network') {
          setSpeechError(
            'Speech recognition network error. Please check your internet connection or use text input.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Tap the microphone and try speaking again.');
        } else if (event.error !== 'aborted') {
          setSpeechError(`Voice error: ${event.error}. Please retry or type your message.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[SpeechRecognition] Exception starting recognition:', err);
      setIsListening(false);
      setSpeechError(`Could not start microphone: ${err?.message || 'Access error'}`);
    }
  }, [language, onSpeechRecognized, stopSpeaking]);

  // Stop Speech Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  // Periodic heartbeat to prevent Chrome long-utterance freeze bug
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.resume();
      }
    }, 8000);
    return () => clearInterval(heartbeat);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    language,
    setLanguage,
    currentLanguageOption:
      LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0],
    languageOptions: LANGUAGE_OPTIONS,

    // Listening
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    speechError,
    setSpeechError,
    isRecognitionSupported,
    isSynthesisSupported,

    // Speaking
    isSpeaking,
    speakingAgentId,
    speakResponse,
    speakText,
    stopSpeaking,
    replayLastResponse,
    autoSpeakEnabled,
    setAutoSpeakEnabled: handleSetAutoSpeak,
    hasVoiceForLang,
    voiceNotice,
    voices
  };
}
