import React from 'react';
import { VoiceLanguage, LANGUAGE_OPTIONS } from '../../hooks/useVoiceAssistant';
import { Globe, Check } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: VoiceLanguage;
  onSelectLanguage: (lang: VoiceLanguage) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-xs sm:text-sm px-3.5 py-1.5',
    lg: 'text-sm sm:text-base px-4 py-2'
  };

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span>Language / भाषा / ಭಾಷೆ:</span>
      </div>

      <div className="inline-flex rounded-lg bg-slate-900/90 border border-slate-700/70 p-1 shadow-inner gap-1">
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = currentLanguage === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => onSelectLanguage(opt.code)}
              className={`flex items-center gap-1.5 font-medium rounded-md transition-all duration-200 cursor-pointer ${
                sizeClasses[size]
              } ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25 ring-1 ring-blue-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title={`Switch voice agent language to ${opt.name} (${opt.nativeName})`}
            >
              <span>{opt.nativeName}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
