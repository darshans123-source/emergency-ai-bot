import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-slate-950 border-b border-slate-800/80 text-slate-300 text-xs transition-all duration-200 z-30 select-none">
      {isCollapsed ? (
        <div className="px-4 py-1 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-slate-300 font-semibold tracking-wider">
              OPERATIONAL DECISION-SUPPORT MODE ACTIVE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 truncate hidden sm:inline">
              Real dispatch under authorized human control
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition py-0.5 px-2 rounded hover:bg-slate-900"
          >
            <span>Show Notice</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="px-4 py-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded bg-amber-950/80 border border-amber-600/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-300 leading-snug truncate">
              <strong className="text-amber-300 font-semibold uppercase tracking-wider font-mono mr-1.5">
                Decision Support Only:
              </strong>
              Assists authorized operators. Does not replace 911/112 public emergency dispatch. Real-world dispatch decisions remain strictly under human control.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-slate-400 font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">SECURE // ENCRYPTED</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition p-1 rounded hover:bg-slate-900"
              title="Collapse disclaimer bar"
            >
              <span className="hidden sm:inline text-[10px]">Minimize</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
