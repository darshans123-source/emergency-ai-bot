import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Premium splash screen with a real city-at-night photograph.
 *
 * The photo is decorative only: if it fails to load, the deep-navy
 * gradient underneath keeps the screen looking premium (onError hides
 * the broken image instead of showing a broken-image icon).
 * There is no auto-redirect and no timer — the user chooses
 * Get Started / Login, or continues as a saved profile.
 */
const SPLASH_PHOTO =
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=80';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile } = useAuth();
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#101B33] text-white flex flex-col relative overflow-hidden">
      {/* Background photo + dark overlay for readability */}
      {!photoFailed && (
        <img
          src={SPLASH_PHOTO}
          alt=""
          aria-hidden="true"
          onError={() => setPhotoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-[#101B33]/75 sm:bg-[#101B33]/65" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#101B33] to-transparent" aria-hidden="true" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#2563EB] flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-[fadeIn_0.6s_ease-out]">
          <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight">AEGISAI</h1>
        <p className="mt-3 text-base sm:text-xl text-slate-200 font-medium">
          One Voice. Four Agents. One Mission.
        </p>
        <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-md leading-relaxed">
          A premium emergency response command centre — coordinate police, medical,
          fire and disaster response from one place.
        </p>

        <div className="mt-8 w-full max-w-xs space-y-3">
          {localProfile ? (
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full min-h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              Continue as {localProfile.name} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full min-h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full min-h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4" /> Login / Profile Setup
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Decision support only. For life-threatening emergencies, call 112 / 911 directly.
        </p>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
