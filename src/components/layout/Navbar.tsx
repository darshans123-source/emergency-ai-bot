import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Incident } from '../../types';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import {
  Bell,
  Search,
  X,
  ExternalLink,
  MapPin,
  Command,
  ArrowRight,
  Mic,
  MicOff,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Incident[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Voice Command Dispatcher
  const handleVoiceCommand = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const lower = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

    if (lower === 'go to map' || lower === 'open map' || lower === 'show map' || lower === 'map') {
      setVoiceFeedback('Navigating to Live Operations Map...');
      navigate('/map');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (lower === 'go to 3d' || lower === 'open 3d' || lower === 'tactical 3d' || lower === 'digital twin') {
      setVoiceFeedback('Navigating to 3D Tactical Twin...');
      navigate('/tactical-3d');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (lower === 'show critical' || lower === 'critical incidents' || lower === 'filter critical') {
      setVoiceFeedback('Filtering critical incidents...');
      navigate('/incidents?priority=CRITICAL');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (lower === 'open queue' || lower === 'go to incidents' || lower === 'show incidents' || lower === 'incidents') {
      setVoiceFeedback('Opening incidents queue...');
      navigate('/incidents');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (
      lower === 'agents' ||
      lower === 'open agents' ||
      lower === 'ai agents' ||
      lower === 'command center' ||
      lower === 'open command center'
    ) {
      setVoiceFeedback('Navigating to Command Center...');
      navigate('/');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (lower === 'resources' || lower === 'fleet' || lower === 'show resources') {
      setVoiceFeedback('Opening Fleet & Resources...');
      navigate('/resources');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    if (lower === 'report emergency' || lower === 'new incident' || lower === 'create incident') {
      setVoiceFeedback('Opening emergency report intake...');
      navigate('/report');
      setIsSearchOpen(false);
      setTimeout(() => setVoiceFeedback(null), 2500);
      return;
    }

    // Default search
    let cleanQuery = text;
    if (lower.startsWith('search for ')) cleanQuery = text.slice(11).trim();
    else if (lower.startsWith('search ')) cleanQuery = text.slice(7).trim();
    else if (lower.startsWith('find ')) cleanQuery = text.slice(5).trim();

    setSearchQuery(cleanQuery);
    setIsSearchOpen(true);
    setVoiceFeedback(`Search query: "${cleanQuery}"`);
    searchInputRef.current?.focus();
    setTimeout(() => setVoiceFeedback(null), 3000);
  }, [navigate]);

  // Speech Recognition Start/Stop
  const startListening = useCallback(() => {
    setVoiceError(null);
    setVoiceFeedback(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser.');
      setTimeout(() => setVoiceError(null), 3500);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);

        const isFinal = event.results[event.results.length - 1].isFinal;
        if (isFinal) {
          handleVoiceCommand(currentTranscript);
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied.');
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceError(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceError('Could not initialize microphone.');
      setIsListening(false);
      setTimeout(() => setVoiceError(null), 3500);
    }
  }, [handleVoiceCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        toggleListening();
      } else if (e.key === 'Escape' && isListening) {
        stopListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, stopListening, toggleListening]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await api.getIncidents({ search: searchQuery.trim(), limit: 6 });
        setSearchResults(res.incidents);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        navigate(`/incidents/${searchResults[selectedIndex].id}`);
        setIsSearchOpen(false);
        setSearchQuery('');
      } else if (searchQuery.trim()) {
        navigate(`/incidents?search=${encodeURIComponent(searchQuery.trim())}`);
        setIsSearchOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 gap-4">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>System Online</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Reconnecting...</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="relative flex-1 max-w-lg mx-auto" ref={searchContainerRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={isListening ? "Listening... speak command or search query" : "Search incidents by title, ID, category, or location..."}
            className={`w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white border rounded-lg pl-10 pr-24 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition ${
              isListening
                ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  searchInputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 rounded-md transition flex items-center justify-center ${
                isListening
                  ? 'bg-rose-100 text-rose-600 border border-rose-300'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
              title={isListening ? 'Stop voice recognition' : 'Voice search (Alt+V)'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {!searchQuery && (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white text-[11px] text-slate-500 font-mono rounded border border-slate-200 shadow-2xs">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            )}
          </div>
        </div>

        {/* Voice Feedback Tooltip */}
        {voiceFeedback && !isListening && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg z-50 flex items-center justify-between">
            <span>{voiceFeedback}</span>
            <button type="button" onClick={() => setVoiceFeedback(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Voice Error Tooltip */}
        {voiceError && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-rose-600 text-white rounded-lg px-3 py-2 text-xs shadow-lg z-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{voiceError}</span>
            </div>
            <button type="button" onClick={() => setVoiceError(null)} className="text-white/80 hover:text-white ml-2">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Global Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 text-xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Matching Incidents</span>
              <span>{isSearching ? 'Searching...' : `${searchResults.length} found`}</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-6 text-center text-slate-500">Searching records...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <p className="font-medium text-slate-700">No matching incidents</p>
                  <p className="text-xs text-slate-400 mt-1">Try searching by ID, street address, or category</p>
                </div>
              ) : (
                searchResults.map((inc, idx) => (
                  <div
                    key={inc.id}
                    onClick={() => {
                      navigate(`/incidents/${inc.id}`);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className={`p-3 transition cursor-pointer flex items-center justify-between gap-3 ${
                      selectedIndex === idx ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-blue-600">{inc.id}</span>
                        <PriorityBadge priority={inc.priority} size="sm" />
                        <StatusBadge status={inc.status} size="sm" />
                      </div>
                      <p className="text-slate-800 font-medium text-sm truncate">{inc.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{inc.location.address}</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 px-3">
              <span>Press Enter to select</span>
              <button
                type="button"
                onClick={() => {
                  navigate(`/incidents?search=${encodeURIComponent(searchQuery.trim())}`);
                  setIsSearchOpen(false);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View all in queue →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Notifications */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications Button */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="bg-rose-50 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        markAsRead(item.id);
                        if (item.incidentId) {
                          navigate(`/incidents/${item.incidentId}`);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-3 text-xs transition cursor-pointer hover:bg-slate-50 flex items-start gap-3 ${
                        !item.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="mt-1 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${item.isRead ? 'bg-slate-300' : 'bg-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.message}</p>
                        {item.incidentId && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <span>Open {item.incidentId}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
