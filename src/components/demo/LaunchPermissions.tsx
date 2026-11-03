import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Mic, X } from 'lucide-react';
import {
  hasLaunchPermissionsRunThisSession,
  markLaunchPermissionsRun,
  requestLaunchPermissions,
  type LaunchPermissions as LaunchPerms,
} from '../../demo/launchPermissions';

// Runs on app open (mounted in App, inside LanguageProvider, outside
// Routes). Attempts location + mic once per session, in the background
// — the app never waits for it and never shows an error banner for a
// denial. If either permission is denied/blocked, a small dismissible
// pill offers a tap-to-retry (a real user gesture, which is what mobile
// browsers need to show the permission prompt again).
export const LaunchPermissions: React.FC = () => {
  const [result, setResult] = useState<LaunchPerms | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current || hasLaunchPermissionsRunThisSession()) return;
    ranRef.current = true;
    // Short delay so the splash/login UI paints first.
    const timer = window.setTimeout(async () => {
      markLaunchPermissionsRun();
      const res = await requestLaunchPermissions();
      setResult(res);
      if (res.location === 'denied' || res.mic === 'denied' || res.location === 'error' || res.mic === 'error') {
        setShowRetry(true);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await requestLaunchPermissions();
      setResult(res);
      if (res.location === 'granted' && res.mic === 'granted') setShowRetry(false);
    } finally {
      setRetrying(false);
    }
  };

  if (!showRetry) return null;
  const blocked: string[] = [];
  if (result?.location === 'denied' || result?.location === 'error') blocked.push('Location');
  if (result?.mic === 'denied' || result?.mic === 'error') blocked.push('Microphone');
  const label = blocked.length ? `${blocked.join(' & ')} blocked` : 'Permission needed';
  return (
    <div className="fixed left-4 z-50 bottom-[calc(110px+env(safe-area-inset-bottom))] lg:bottom-16 flex items-center gap-1 rounded-full bg-[#0B142B]/95 border border-white/20 text-white shadow-xl pl-3 pr-1 py-1 max-w-[46vw]">
      <MapPin className="w-4 h-4 shrink-0 text-cyan-300" />
      <Mic className="w-4 h-4 shrink-0 text-cyan-300 -ml-1" />
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="min-h-9 px-2 text-xs font-semibold hover:text-cyan-300 transition disabled:opacity-50 truncate"
        title="Tap to allow location and microphone again"
      >
        {retrying ? 'Checking…' : `${label} — tap to allow`}
      </button>
      <button
        type="button"
        aria-label="Dismiss permission prompt"
        onClick={() => setShowRetry(false)}
        className="p-2 rounded-full hover:bg-white/20 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
