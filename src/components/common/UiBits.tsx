import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} aria-hidden="true" />
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-700 flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-semibold">Could not load this section</p>
      <p className="mt-0.5 text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  note?: string;
}> = ({ label, value, icon, accent, note }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-[#64748B]">{label}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>{icon}</div>
    </div>
    <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#172033]">{value}</p>
    {note && <p className="mt-1 text-xs text-[#64748B]">{note}</p>}
  </div>
);
