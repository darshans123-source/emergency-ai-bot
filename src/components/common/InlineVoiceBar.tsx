import React, { useState } from 'react';
import { SpecializedAgentId } from '../../types';
import { useVoiceAssistant, VoiceLanguage } from '../../hooks/useVoiceAssistant';
import { LanguageSelector } from './LanguageSelector';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface InlineVoiceBarProps {
  agentId: SpecializedAgentId;
  agentName: string;
  accentColor?: string;
  onSendSpeech: (transcript: string, language: VoiceLanguage) => Promise<void> | void;
  isProcessing?: boolean;
  className?: string;
  onOpenFullModal?: () => void;
  // Controlled voice props from parent
  language?: VoiceLanguage;
  onLanguageChange?: (lang: VoiceLanguage) => void;
  isSpeaking?: boolean;
  speakingAgentId?: SpecializedAgentId | null;
  onStopSpeaking?: () => void;
  onReplay?: () => void;
  autoSpeakEnabled?: boolean;
  onToggleAutoSpeak?: (enabled: boolean) => void;
  voiceNotice?: string | null;
}

export const InlineVoiceBar: React.FC<InlineVoiceBarProps> = ({
  agentId,
  agentName,
  accentColor = '#3b82f6',
  onSendSpeech,
  isProcessing = false,
  className = '',
  onOpenFullModal,
  language: parentLanguage,
  onLanguageChange: parentOnLanguageChange,
  isSpeaking: parentIsSpeaking,
  speakingAgentId: parentSpeakingAgentId,
  onStopSpeaking: parentOnStopSpeaking,
  onReplay: parentOnReplay,
  autoSpeakEnabled: parentAutoSpeakEnabled,
  onToggleAutoSpeak: parentOnToggleAutoSpeak,
  voiceNotice: parentVoiceNotice
}) => {
  const voiceAssistant = useVoiceAssistant({
    initialLanguage: parentLanguage || 'en',
    autoSpeak: true,
    onSpeechRecognized: (text, lang) => {
      onSendSpeech(text, lang);
    }
  });

  const language = parentLanguage ?? voiceAssistant.language;
  const setLanguage = parentOnLanguageChange ?? voiceAssistant.setLanguage;
  const isSpeaking = parentIsSpeaking !== undefined ? parentIsSpeaking : voiceAssistant.isSpeaking;
  const speakingAgentId = parentSpeakingAgentId !== undefined ? parentSpeakingAgentId : voiceAssistant.speakingAgentId;
  const stopSpeaking = parentOnStopSpeaking ?? voiceAssistant.stopSpeaking;
  const replayLastResponse = parentOnReplay ? parentOnReplay : () => voiceAssistant.replayLastResponse(agentId);
  const autoSpeakEnabled = parentAutoSpeakEnabled !== undefined ? parentAutoSpeakEnabled : voiceAssistant.autoSpeakEnabled;
  const setAutoSpeakEnabled = parentOnToggleAutoSpeak ?? voiceAssistant.setAutoSpeakEnabled;
  const voiceNotice = parentVoiceNotice !== undefined ? parentVoiceNotice : voiceAssistant.voiceNotice;

  const {
    currentLanguageOption,
    isListening,
    startListening,
    stopListening,
    interimTranscript,
    speechError,
    isRecognitionSupported
  } = voiceAssistant;

  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-700/80 p-3 sm:p-4 shadow-xl select-none ${className}`}
    >
      {/* Top row: Language Selector & Mode Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <LanguageSelector
            currentLanguage={language}
            onSelectLanguage={(l) => {
              setLanguage(l);
              stopSpeaking();
            }}
            size="sm"
          />
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-[11px] text-blue-300 font-medium">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Mitra AI Voice Assistant
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mitra AI Console</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              autoSpeakEnabled
                ? 'text-blue-300 bg-blue-950/50 border-blue-800'
                : 'text-slate-500 bg-slate-900 border-slate-800'
            }`}
            title="Toggle Voice Output"
          >
            {autoSpeakEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Voice Warning or Error */}
      {speechError && (
        <div className="mt-2 p-2 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Voice notice */}
      {voiceNotice && (
        <div className="mt-2 p-2 rounded-lg bg-amber-950/50 border border-amber-800/60 text-amber-300 text-xs">
          {voiceNotice}
        </div>
      )}

      {/* Middle: Sound Wave + Interim Transcript */}
      {(isListening || isSpeaking || isProcessing) && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {isProcessing ? (
              <span className="flex items-center gap-2 text-blue-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Thinking & Analyzing...</span>
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-2 text-red-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                <span>Listening in {currentLanguageOption.name}...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-emerald-400 font-medium">
                <Volume2 className="w-4 h-4" />
                <span>Agent Speaking...</span>
              </span>
            )}
            {interimTranscript && (
              <span className="text-slate-300 italic font-mono text-xs">"{interimTranscript}"</span>
            )}
          </div>

          <SoundWaveVisualizer
            isActive={isListening || isSpeaking || isProcessing}
            color={isListening ? '#ef4444' : accentColor}
            barCount={14}
          />
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400 hidden sm:inline">
          Speak in <strong className="text-slate-200">{currentLanguageOption.nativeName}</strong> without typing.
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Stop Speaking button available when voice output is active */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-600/30 cursor-pointer animate-pulse"
              title="Stop Voice Playback"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Speaking</span>
            </button>
          )}

          {isListening ? (
            <button
              type="button"
              onClick={stopListening}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 ring-2 ring-red-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop Listening</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startListening}
              disabled={!isRecognitionSupported || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>Speak ({currentLanguageOption.nativeName})</span>
            </button>
          )}

          <button
            type="button"
            onClick={replayLastResponse}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Replay Voice Response"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
