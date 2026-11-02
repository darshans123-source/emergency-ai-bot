import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
          className="w-full min-h-12 pl-3.5 pr-12 rounded-xl glass-input text-[#172033] placeholder-slate-400 tracking-[0.5em] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-200 transition"
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#7C3AED] flex items-center justify-center px-4 py-8">
      {/* Floating glass shapes + soft light effects (decorative only) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-500/30 blur-3xl animate-glass-float" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-purple-500/30 blur-3xl animate-glass-float-slow" />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-cyan-400/25 blur-3xl animate-glass-float" />
        <div className="absolute top-16 left-[12%] w-24 h-24 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md rotate-12 animate-glass-float-slow hidden sm:block" />
        <div className="absolute bottom-20 right-[10%] w-32 h-32 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md -rotate-6 animate-glass-float hidden sm:block" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-glass-fade-up">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo-icon.svg"
            alt="AegisAI logo"
            className="w-16 h-16 rounded-3xl shadow-2xl shadow-blue-900/40 object-cover"
          />
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">AEGISAI</h1>
          <p className="mt-1 text-sm text-blue-100">One Voice. Four Agents. One Mission.</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
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
                className="w-full min-h-12 px-3.5 rounded-xl glass-input text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-200 transition"
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
              className="w-full min-h-12 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-purple-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25"
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
                    className="glass glass-card-hover min-h-11 px-3.5 rounded-xl text-sm font-medium text-[#172033] inline-flex items-center gap-2"
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

          <div className="mt-6 rounded-xl bg-amber-50/80 backdrop-blur-md border border-amber-200/70 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
            <strong>Prototype login only.</strong> Your PIN is stored only as a salted
            hash in this browser — never in plain text — but browser-only
            authentication is not secure against device access or browser
            storage inspection. Do not use it to protect real emergency or
            administrative operations.
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-blue-100">
          For life-threatening emergencies, always call 112 / 911 directly.
        </p>
      </div>
    </div>
  );
};
