import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Home, LogIn } from 'lucide-react';
import { AuroraBackground } from '../components/layout/AuroraBackground';

// Custom 404 page (previously, unknown URLs silently redirected to Home,
// so a mistyped link looked like a broken app). Standalone — no app
// shell — with clear routes back, and the real emergency number as a
// tap-to-call link. Simulated data is never claimed as live here.
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#071329] text-white flex items-center justify-center px-4 py-12">
      <AuroraBackground absolute />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">404</h1>
        <h2 className="mt-2 text-xl font-bold">Page not found</h2>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          This page does not exist or the link is out of date. Use the buttons below to get back
          to AegisAI. This is a demo platform — for a real emergency, call{' '}
          <a href="tel:112" className="font-semibold text-cyan-300 underline underline-offset-2">
            112
          </a>{' '}
          directly.
        </p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full min-h-12 px-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:brightness-110 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" /> Go to Command Centre <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full min-h-12 px-6 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4" /> Login / Profile Setup
          </button>
          <a
            href="tel:112"
            className="w-full min-h-12 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            Call 112 (real emergency)
          </a>
        </div>
        <p className="mt-8 text-xs text-slate-400">© {year} AegisAI · Designed &amp; Developed by Darshan</p>
      </div>
    </div>
  );
};
