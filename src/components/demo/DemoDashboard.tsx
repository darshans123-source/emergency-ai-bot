import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Plus, CheckCircle2, AlertCircle, Activity, Ambulance } from 'lucide-react';
import { loadDemoIncidents, saveDemoIncidents, loadDemoActivity, saveDemoActivity, demoStats, allDemoUnits, randomDemoIncident } from '../../demo/demoStore';
import { DemoIncident } from '../../demo/demoData';

export const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<DemoIncident[]>(() => loadDemoIncidents());
  const [activity, setActivity] = useState<string[]>(() => loadDemoActivity());
  const [simulating, setSimulating] = useState(false);
  const timer = useRef<any>(null);
  const units = allDemoUnits();
  const stats = demoStats(incidents, units);
  const pushActivity = (text: string) => { const next = [text, ...activity].slice(0, 20); setActivity(next); saveDemoActivity(next); };
  const update = (list: DemoIncident[]) => { setIncidents(list); saveDemoIncidents(list); };
  const resolve = (id: string) => { update(incidents.map((i) => (i.id === id ? { ...i, status: 'RESOLVED' as const } : i))); pushActivity(`Incident ${id} marked resolved in simulation.`); };
  const create = () => { const next = randomDemoIncident(2000 + incidents.length + 1); update([next, ...incidents]); pushActivity(`Incident ${next.id} created in simulation: ${next.title}.`); };
  useEffect(() => {
    if (!simulating) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(() => {
      setIncidents((prev) => {
        const next = randomDemoIncident(3000 + Math.floor(Math.random() * 9000));
        const list = [next, ...prev].slice(0, 40);
        saveDemoIncidents(list);
        return list;
      });
      setActivity((prev) => { const next = [`Simulation: new demo incident generated. Unit availability updated (simulated).`, ...prev].slice(0, 20); saveDemoActivity(next); return next; });
    }, 20000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [simulating]);
  const cats: Record<string, number> = {};
  incidents.forEach((i) => { cats[i.category] = (cats[i.category] || 0) + 1; });
  const prios: Record<string, number> = {};
  incidents.forEach((i) => { prios[i.priority] = (prios[i.priority] || 0) + 1; });
  return (
    <section aria-label="Demo dashboard" className="rounded-[20px] bg-white border border-amber-300 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#172033] flex items-center gap-2">Response Operations <span className="text-[11px] font-medium text-[#64748B]">Simulated data</span></h2>
          <p className="mt-1 text-xs text-[#64748B]">Simulated data — incidents, locations and dispatch operations are simulated. No real service has been contacted. For real emergencies, call <b>112</b>.</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button type="button" onClick={() => setSimulating((v) => !v)} className={`min-h-11 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 ${simulating ? 'bg-rose-600 text-white' : 'bg-[#2563EB] text-white'}`}>
            {simulating ? <><Square className="w-4 h-4" /> Stop Simulation</> : <><Play className="w-4 h-4" /> Start Simulation</>}
          </button>
          <button type="button" onClick={create} className="min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create demo incident</button>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#64748B]">{simulating ? 'Simulation running: a new demo incident appears about every 20 seconds, and unit availability is simulated.' : 'Simulation stopped. Demo changes are saved in this browser (localStorage) only.'}</p>
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: stats.total, icon: <AlertCircle className="w-4 h-4" /> },
          { label: 'Active Incidents', value: stats.active, icon: <Activity className="w-4 h-4" /> },
          { label: 'Resolved', value: stats.resolved, icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Available Response Units', value: `${stats.available} / ${stats.totalUnits}`, icon: <Ambulance className="w-4 h-4" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-[20px] bg-slate-50 border border-slate-200 p-4"><p className="text-xs text-[#64748B] flex items-center gap-1.5">{s.icon}{s.label}</p><p className="mt-1 text-2xl font-extrabold text-[#172033]">{s.value}</p></div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-[20px] border border-slate-200 p-4 min-w-0">
          <h3 className="font-bold text-[#172033] text-sm">Recent Incidents</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {incidents.slice(0, 6).map((inc) => (
              <li key={inc.id} className="py-2.5 flex items-center justify-between gap-3 min-w-0">
                <button type="button" onClick={() => navigate('/incidents')} className="text-left min-w-0">
                  <p className="text-sm font-semibold text-[#172033] truncate"><span className="font-mono text-xs text-[#2563EB] mr-2">{inc.id}</span>{inc.title}</p>
                  <p className="text-xs text-[#64748B] truncate">{inc.city} · {inc.address} · {inc.category} · {inc.priority} · {inc.status} (demo)</p>
                </button>
                {inc.status !== 'RESOLVED' && (<button type="button" onClick={() => resolve(inc.id)} className="shrink-0 min-h-9 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">Resolve (demo)</button>)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[20px] border border-slate-200 p-4 min-w-0">
          <h3 className="font-bold text-[#172033] text-sm">Category & priority (demo)</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(cats).map(([k, v]) => (<span key={k} className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">{k.replace(/_/g, ' ')} · <b>{v}</b></span>))}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(prios).map(([k, v]) => (<span key={k} className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">{k} · <b>{v}</b></span>))}</div>
          <h3 className="font-bold text-[#172033] text-sm mt-4">Response activity timeline (demo)</h3>
          <ul className="mt-2 space-y-1.5">{activity.slice(0, 5).map((a, i) => (<li key={i} className="text-xs text-[#64748B]">• {a}</li>))}</ul>
        </div>
      </div>
    </section>
  );
};
