import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LocalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfiles, loginLocal, createLocal, refreshLocalProfiles } = useAuth();

  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#101C35] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#172033]">AEGISAI</h1>
          <p className="mt-1 text-sm text-[#64748B]">One Voice. Four Agents. One Mission.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#172033]">
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
                className="w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-[#172033] mb-1.5">
                4-Digit PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] placeholder-slate-400 tracking-[0.5em] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {mode === 'create' && (
              <div>
                <label htmlFor="confirmPin" className="block text-sm font-medium text-[#172033] mb-1.5">
                  Confirm PIN
                </label>
                <input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] placeholder-slate-400 tracking-[0.5em] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <label className="flex items-center gap-2.5 text-sm text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB]"
              />
              Remember Me
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-12 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
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
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">
                Saved profiles on this device
              </p>
              <div className="flex flex-wrap gap-2">
                {localProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickSaved(p.name)}
                    className="min-h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-sm font-medium text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB] transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={refreshLocalProfiles}
                className="mt-3 text-xs text-[#64748B] hover:text-[#172033]"
              >
                Refresh saved profiles
              </button>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
            <strong>Prototype login only.</strong> Your PIN is stored only as a salted
            hash in this browser — never in plain text — but browser-only
            authentication is not secure against device access or browser
            storage inspection. Do not use it to protect real emergency or
            administrative operations.
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#64748B]">
          For life-threatening emergencies, always call 112 / 911 directly.
        </p>
      </div>
    </div>
  );
};
