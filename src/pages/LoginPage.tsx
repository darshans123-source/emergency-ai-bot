import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Radio, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Database, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('operator@emergency.gov');
  const [password, setPassword] = useState('OperatorPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSelectDemo = async (role: 'operator' | 'admin' | 'reporter') => {
    setIsSubmitting(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient tactical glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/25 rounded-2xl blur-lg animate-pulse" />
            <svg
              viewBox="0 0 48 48"
              className="w-14 h-14 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="loginShieldGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <radialGradient id="loginCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="60%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0369a1" />
                </radialGradient>
              </defs>
              <path
                d="M24 3L42 12V24C42 34.5 34.2 41.5 24 45C13.8 41.5 6 34.5 6 24V12L24 3Z"
                fill="#090d16"
                stroke="url(#loginShieldGrad)"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path
                d="M24 7.5L38 14.5V23.5C38 31.8 31.8 37.5 24 40.5C16.2 37.5 10 31.8 10 23.5V14.5L24 7.5Z"
                stroke="#0e7490"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.65"
              />
              <line x1="24" y1="12" x2="24" y2="20" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
              <line x1="16" y1="28" x2="20" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
              <line x1="32" y1="28" x2="28" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
              <circle cx="24" cy="24" r="7.5" stroke="#22d3ee" strokeWidth="1.4" opacity="0.5" className="animate-ping" style={{ transformOrigin: 'center' }} />
              <circle cx="24" cy="24" r="5.5" fill="url(#loginCoreGlow)" />
              <circle cx="24" cy="24" r="2.2" fill="#ffffff" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono tracking-wider uppercase mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Tactical Command Authentication
          </div>

          <h2 className="text-2xl font-black tracking-wider uppercase font-mono text-white flex items-center justify-center gap-2">
            <span>AegisAI</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">v4.8</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-mono tracking-wide font-medium">
            One Voice. Four Agents. Faster Emergency Response.
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
              <Database className="w-2.5 h-2.5" />
              <span>FIRESTORE PERSISTENCE ON</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/70 border border-blue-500/40 text-blue-300">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>FIREBASE AUTH READY</span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Google Sign-in */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs tracking-wide rounded-xl shadow-md transition flex items-center justify-center gap-3 border border-slate-300 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google Auth...' : 'Continue with Google Account'}</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                <span className="bg-slate-900 px-2 text-slate-500">Or use tactical credentials</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Operator Identity / Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition font-mono"
                placeholder="operator@emergency.gov"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Access Key / Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 pr-10 transition font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs tracking-wider uppercase font-mono rounded-xl shadow-lg shadow-cyan-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Command Center'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono text-center">
              Quick Role Simulation
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemo('operator')}
                disabled={isSubmitting || isGoogleLoading}
                className="p-2.5 border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 rounded-xl text-left transition group shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-[9px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition">→</span>
                </div>
                <p className="text-xs font-bold text-white font-mono">Operator</p>
                <p className="text-[10px] text-cyan-300/80">Triage & Dispatch</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('admin')}
                disabled={isSubmitting || isGoogleLoading}
                className="p-2.5 border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 rounded-xl text-left transition group shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[9px] font-mono text-purple-400 group-hover:translate-x-0.5 transition">→</span>
                </div>
                <p className="text-xs font-bold text-white font-mono">Admin</p>
                <p className="text-[10px] text-purple-300/80">Full Audit Access</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('reporter')}
                disabled={isSubmitting || isGoogleLoading}
                className="p-2.5 border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 rounded-xl text-left transition group shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-mono text-emerald-400 group-hover:translate-x-0.5 transition">→</span>
                </div>
                <p className="text-xs font-bold text-white font-mono">Citizen</p>
                <p className="text-[10px] text-emerald-300/80">Field Intake</p>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            Need public reporter account?{' '}
            <Link to="/register" className="text-cyan-400 font-semibold hover:underline">
              Register as Citizen
            </Link>
          </div>
        </div>

        {/* Tactical Footer Disclaimer */}
        <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800/80 text-center text-[10px] text-slate-400 font-mono">
          DECISION SUPPORT SYSTEM • IN CRITICAL EMERGENCIES CALL 911 / 112
        </div>
      </div>
    </div>
  );
};
