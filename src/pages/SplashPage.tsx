import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Premium splash screen.
 *
 * Shown only on initial load. There is no artificial waiting time: as soon
 * as the app has mounted and the local session state is known, it fades
 * out to the login screen (or straight to the command centre when a
 * remembered local profile session exists). A visible "Continue" button
 * is kept as a fallback so a slow first paint can never trap the user.
 */
export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      if (navigated) return;
      setNavigated(true);
      setLeaving(true);
      timer = setTimeout(() => {
        navigate(localProfile ? '/' : '/login', { replace: true });
      }, 450);
    };
    // Wait one frame so the brand actually paints, then go. No 6s timer.
    const raf = requestAnimationFrame(() => {
      timer = setTimeout(go, 250);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`min-h-[100dvh] bg-[#091426] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden transition-opacity duration-500 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle city-at-night skyline, pure CSS — no image download, no layout cost */}
      <div className="absolute inset-x-0 bottom-0 h-40 sm:h-52 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#101C35] via-[#101C35]/60 to-transparent" />
        <div className="absolute bottom-0 left-[4%] w-16 sm:w-24 h-24 sm:h-32 bg-[#101C35] rounded-t-sm" />
        <div className="absolute bottom-0 left-[18%] w-12 sm:w-16 h-16 sm:h-24 bg-[#101C35] rounded-t-sm" />
        <div className="absolute bottom-0 left-[30%] w-20 sm:w-28 h-28 sm:h-40 bg-[#101C35] rounded-t-sm" />
        <div className="absolute bottom-0 left-[52%] w-14 sm:w-20 h-20 sm:h-28 bg-[#101C35] rounded-t-sm" />
        <div className="absolute bottom-0 left-[66%] w-16 sm:w-24 h-24 sm:h-36 bg-[#101C35] rounded-t-sm" />
        <div className="absolute bottom-0 left-[84%] w-12 sm:w-16 h-16 sm:h-24 bg-[#101C35] rounded-t-sm" />
        <div className="absolute top-8 left-[12%] w-1 h-1 rounded-full bg-[#06B6D4]/80" />
        <div className="absolute top-14 left-[58%] w-1 h-1 rounded-full bg-white/70" />
        <div className="absolute top-6 left-[82%] w-1 h-1 rounded-full bg-[#06B6D4]/70" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#2563EB] flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight">AEGISAI</h1>
        <p className="mt-3 text-base sm:text-lg text-slate-300 font-medium">
          One Voice. Four Agents. One Mission.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Emergency response command centre — loading your workspace.
        </p>

        <div className="mt-8 w-48 h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-label="Loading">
          <div className="h-full w-2/3 rounded-full bg-[#06B6D4] animate-pulse" />
        </div>

        <button
          type="button"
          onClick={() => navigate(localProfile ? '/' : '/login', { replace: true })}
          className="mt-8 min-h-11 px-6 rounded-xl bg-white text-[#101C35] text-sm font-semibold hover:bg-slate-100 transition"
        >
          Continue
        </button>
        <p className="mt-4 text-xs text-slate-500">
          For life-threatening emergencies, always call 112 / 911 directly.
        </p>
      </div>
    </div>
  );
};
