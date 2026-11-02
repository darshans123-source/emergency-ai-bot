import { AuroraBackground } from '../components/layout/AuroraBackground';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarqueeBanner } from '../components/layout/MarqueeBanner';
import { AlertTriangle, UserPlus, LogIn, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Glassmorphism login — same auth logic as before (Name + 4-digit PIN,
 * salted hash in localStorage, Remember Me, saved profiles), only the
 * presentation changed: full-screen blue/navy/purple gradient, floating
 * glass shapes, centred frosted-glass card, show/hide PIN, glass saved
 * profile buttons. No API keys, no backend change.
 */
export const LocalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfiles, loginLocal, createLocal, refreshLocalProfiles } = useAuth();

  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginLocal(name, pin, rememberMe);
      } else {
        await createLocal(name, pin, confirmPin, rememberMe);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickSaved = (profileName: string) => {
    setName(profileName);
    setMode('login');
    setError(null);
  };

  const pinField = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    label: string,
    show: boolean,
    toggleShow: () => void,
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#172033] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="••••"
          className="w-full min-h-12 pl-3.5 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-[#172033] placeholder-slate-400 tracking-[0.5em] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-200 transition"
        />
        <button
          type="button"
          onClick={toggleShow}
          aria-label={show ? 'Hide PIN' : 'Show PIN'}
          title={show ? 'Hide PIN' : 'Show PIN'}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-10 min-h-10 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 flex items-center justify-center transition"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#F2F5FA] flex items-center justify-center px-4 py-8 pb-16">
      <AuroraBackground absolute />
      <div className="relative z-10 w-full max-w-md animate-glass-fade-up">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo-icon.svg"
            alt="AegisAI logo"
            className="w-16 h-16 rounded-3xl shadow-2xl shadow-blue-900/40 object-cover"
          />
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">AEGISAI</h1>
          <p className="mt-1 text-sm text-slate-500">One Voice. Four Agents. One Mission.</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-[#172033]">
            {mode === 'login' ? 'Welcome Back' : 'Create Profile'}
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Enter your details to access the emergency command centre.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#172033] mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                className="w-full min-h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            {pinField('pin', pin, setPin, '4-Digit PIN', showPin, () => setShowPin((v) => !v), mode === 'login' ? 'current-password' : 'new-password')}

            {mode === 'create' &&
              pinField('confirmPin', confirmPin, setConfirmPin, 'Confirm PIN', showConfirmPin, () => setShowConfirmPin((v) => !v), 'new-password')}

            <label className="flex items-center gap-2.5 text-sm text-[#172033] cursor-pointer min-h-10">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB]"
              />
              Remember Me
            </label>

            {error && (
              <div role="alert" className="glass-error flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-12 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isSubmitting ? 'Please wait…' : mode === 'login' ? 'LOGIN TO AEGISAI' : 'CREATE PROFILE'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#64748B]">
            {mode === 'login' ? (
              <>
                New user?{' '}
                <button type="button" onClick={() => { setMode('create'); setError(null); }} className="font-semibold text-[#2563EB] hover:underline">
                  Create Profile
                </button>
              </>
            ) : (
              <>
                Already have a profile?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(null); }} className="font-semibold text-[#2563EB] hover:underline">
                  Login
                </button>
              </>
            )}
          </div>

          {localProfiles.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">
                Saved profiles on this device
              </p>
              <div className="flex flex-wrap gap-2">
                {localProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickSaved(p.name)}
                    className="bg-white border border-slate-200 shadow-sm hover:border-blue-300 min-h-11 px-3.5 rounded-xl text-sm font-medium text-[#172033] inline-flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[#2563EB]" />
                    {p.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={refreshLocalProfiles}
                className="mt-3 text-xs text-[#64748B] hover:text-[#172033] min-h-8"
              >
                Refresh saved profiles
              </button>
            </div>
          )}

        </div>

        <p className="mt-4 text-center text-xs text-blue-100">
          For life-threatening emergencies, always call 112 / 911 directly.
        </p>
      </div>
      <MarqueeBanner />
    </div>
  );
};
