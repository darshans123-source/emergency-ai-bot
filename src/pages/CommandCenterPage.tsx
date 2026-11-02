import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Ambulance,
  Shield,
  HeartPulse,
  Flame,
  Droplets,
  MapPin,
  FilePlus2,
  Activity,
  Hospital,
  RefreshCw,
  ArrowRight,
  Play,
  Square,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loadDemoIncidents, saveDemoIncidents, loadDemoActivity, saveDemoActivity, demoStats, allDemoUnits, randomDemoIncident } from '../demo/demoStore';
import { demoIncidentToIncident, demoUnitToResource } from '../demo/localFallback';
import { Skeleton } from '../components/common/UiBits';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile, user } = useAuth();

  const [demoIncidents, setDemoIncidents] = useState(() => loadDemoIncidents());
  const [demoActivity, setDemoActivity] = useState<string[]>(() => loadDemoActivity());
  const [isLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const simTimer = useRef<any>(null);
  useEffect(() => {
    if (!simulating) { if (simTimer.current) clearInterval(simTimer.current); return; }
    simTimer.current = setInterval(() => {
      setDemoIncidents((prev) => { const list = [randomDemoIncident(3000 + Math.floor(Math.random() * 9000)), ...prev].slice(0, 40); saveDemoIncidents(list); return list; });
      setDemoActivity((prev) => { const next = ['Simulation: new incident generated and unit availability updated (simulated).', ...prev].slice(0, 20); saveDemoActivity(next); return next; });
    }, 20000);
    return () => { if (simTimer.current) clearInterval(simTimer.current); };
  }, [simulating]);
  // Local data only: the previous version called six backend endpoints on
  // every load and showed API 500 / backend-unavailable errors when the
  // Vercel function was down. The Command Centre now renders from the
  // local datasets, so it loads without any backend call or error surface.
  const incidents = demoIncidents.map(demoIncidentToIncident);
  const demoUnits = allDemoUnits();
  const resources = demoUnits.map(demoUnitToResource);
  const demoStatsResult = demoStats(demoIncidents, demoUnits);
  const summary = {
    totalActive: demoStatsResult.active,
    resolvedIncidents: demoStatsResult.resolved,
    availableUnits: demoStatsResult.available,
    awaitingReview: demoIncidents.filter((i) => i.status === 'ACTIVE').length,
    highOrCriticalPriority: demoIncidents.filter((i) => i.priority === 'HIGH' || i.priority === 'CRITICAL').length,
    categoryCounts: demoIncidents.reduce<Record<string, number>>((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {}),
  };
  const activityIncidents = incidents.slice(0, 5);
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const displayName = localProfile?.name || user?.name || 'Commander';
  const fireUnits = resources.filter((r) => r.type === 'FIRE_UNIT');
  const fireAvailable = fireUnits.filter((r) => r.status === 'AVAILABLE').length;
  const latestFire = incidents.find((i) => i.category === 'FIRE_INCIDENT');
  const recent = incidents.slice(0, 5);

  const totalIncidents =
    summary ? summary.totalActive + summary.resolvedIncidents : null;

  const agentCards = [
    {
      slug: 'rakshak', icon: <Shield className="w-5 h-5" />, chip: 'bg-blue-50 text-blue-700', accent: 'border-t-blue-600',
      name: 'RAKSHAK AI', role: 'Police & Security Response',
      desc: 'Police incident assistance, station information and response recommendations.',
      status: 'Ready',
      task: 'Police assessment ready — open the agent to ask a question',
    },
    {
      slug: 'jeevan', icon: <HeartPulse className="w-5 h-5" />, chip: 'bg-rose-50 text-rose-700', accent: 'border-t-rose-600',
      name: 'JEEVAN AI', role: 'Medical & Healthcare Response',
      desc: 'Medical emergency guidance, nearby hospital information and emergency requests.',
      status: 'Ready',
      task: 'Medical assessment ready — open the agent to ask a question',
    },
    {
      slug: 'agni', icon: <Flame className="w-5 h-5" />, chip: 'bg-orange-50 text-orange-700', accent: 'border-t-orange-600',
      name: 'AGNI AI', role: 'Fire & Rescue Response',
      desc: 'Fire incident reporting, fire unit coordination and rescue support.',
      status: fireUnits.length > 0 ? `${fireAvailable} of ${fireUnits.length} units available` : 'No unit data',
      task: latestFire ? latestFire.title : 'No active fire incident in the current records',
    },
    {
      slug: 'sanrakshak', icon: <Droplets className="w-5 h-5" />, chip: 'bg-cyan-50 text-cyan-700', accent: 'border-t-cyan-600',
      name: 'SANRAKSHAK AI', role: 'Disaster & Public Services',
      desc: 'Water, electricity, road and infrastructure issues and public safety reporting.',
      status: 'Ready',
      task: 'Disaster assessment ready — open the agent to ask a question',
    },
  ];
  const stats = [
    { label: 'Total Incidents', value: totalIncidents !== null ? String(totalIncidents) : '—', icon: <AlertCircle className="w-4 h-4" />, chip: 'bg-blue-50 text-blue-700' },
    { label: 'Active Incidents', value: summary ? String(summary.totalActive) : '—', icon: <Activity className="w-4 h-4" />, chip: 'bg-amber-50 text-amber-700' },
    { label: 'Resolved Incidents', value: summary ? String(summary.resolvedIncidents) : '—', icon: <CheckCircle2 className="w-4 h-4" />, chip: 'bg-emerald-50 text-emerald-700' },
    { label: 'Available Response Units', value: summary ? String(summary.availableUnits) : '—', icon: <Ambulance className="w-4 h-4" />, chip: 'bg-cyan-50 text-cyan-700' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0">
      {/* Compact welcome banner — white, no large gradient */}
      <section className="rounded-[20px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo-icon.svg" alt="AegisAI" className="w-10 h-10 rounded-xl shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#172033] truncate">Welcome back, {displayName}</h1>
            <p className="text-xs sm:text-sm text-[#64748B] truncate">One Voice. Four Agents. One Mission. — Decision support only, call 112 / 911 for life-threatening emergencies.</p>
            <p className="mt-1 text-xs text-[#64748B]">Simulated data · For real emergencies, call 112.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/report')} className="shrink-0 min-h-11 px-4 rounded-xl bg-[#E53935] hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
          <FilePlus2 className="w-4 h-4" /> Report Emergency
        </button>
      </section>

      {/* AI Agents — immediately below welcome, 2 per row on mobile, 4 on desktop */}
      <section aria-label="AI agents">
        <div className="flex items-center justify-between gap-3 mb-2.5 px-0.5">
          <h2 className="text-base font-bold text-[#172033]">AI Response Agents</h2>
          <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline shrink-0">View all <ArrowRight className="w-4 h-4" /></button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => (<Skeleton key={i} className="h-44" />))}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {agentCards.map((a) => (
              <article key={a.slug} className={`rounded-[20px] bg-white border border-slate-200 border-t-4 ${a.accent} shadow-sm p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition min-w-0`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`w-10 h-10 rounded-xl ${a.chip} flex items-center justify-center shrink-0`}>{a.icon}</span>
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 truncate max-w-[55%]">{a.status}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#172033]">{a.name}</h3>
                <p className="text-xs font-medium text-[#2563EB]">{a.role}</p>
                <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed line-clamp-2">{a.desc}</p>
                <p className="mt-2 text-xs text-[#64748B] truncate"><span className="font-semibold text-[#172033]">Task: </span>{a.task}</p>
                <button type="button" onClick={() => navigate(`/agents/${a.slug}`)} className="mt-3 min-h-10 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition">Open Agent</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Compact stats */}
      <section aria-label="Operations statistics">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => (<Skeleton key={i} className="h-24" />))}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-[20px] bg-white border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0"><p className="text-xs font-medium text-[#64748B] truncate">{s.label}</p><p className="mt-1 text-2xl font-extrabold text-[#172033]">{s.value}</p></div>
                <span className={`w-9 h-9 rounded-xl ${s.chip} flex items-center justify-center shrink-0`}>{s.icon}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bento grid: overview + quick actions + recent + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Emergency Overview — spans 2 */}
        <section className="lg:col-span-2 rounded-[20px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-[#172033]">Emergency Overview</h2>
          <div className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#172033] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold">Local AI ready</span>
                <span className="text-[#64748B] text-xs">· Simulated data · Updated {lastUpdated}</span>
              </p>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button type="button" onClick={() => setSimulating((v) => !v)} className={`min-h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${simulating ? 'bg-rose-600 text-white' : 'bg-[#2563EB] text-white'}`}>
                  {simulating ? <><Square className="w-3.5 h-3.5" /> Stop Simulation</> : <><Play className="w-3.5 h-3.5" /> Start Simulation</>}
                </button>
                <button type="button" onClick={() => { const next = randomDemoIncident(2000 + demoIncidents.length + 1); const list = [next, ...demoIncidents]; setDemoIncidents(list); saveDemoIncidents(list); }} className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-[#172033] hover:bg-slate-50 inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Create incident</button>
                <button type="button" onClick={() => { setDemoIncidents(loadDemoIncidents()); setDemoActivity(loadDemoActivity()); }} className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-[#172033] hover:bg-slate-50 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              </div>
            </div>
            <p className="text-xs text-[#64748B]">{simulating ? 'Simulation running: a new incident appears about every 20 seconds (simulated).' : 'Simulation stopped. Changes are saved in this browser only.'}</p>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-[#172033]">{summary.totalActive}</p><p className="text-[11px] text-[#64748B]">Active</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-[#172033]">{summary.awaitingReview}</p><p className="text-[11px] text-[#64748B]">Awaiting review</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-[#172033]">{summary.highOrCriticalPriority}</p><p className="text-[11px] text-[#64748B]">High / critical</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-[#172033]">{summary.availableUnits}</p><p className="text-[11px] text-[#64748B]">Units available</p></div>
              </div>
            )}
            {summary && (
              <div>
                <p className="text-xs font-semibold text-[#64748B] mb-2">By category</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(summary.categoryCounts).map(([cat, count]) => (
                    <button key={cat} type="button" onClick={() => navigate(`/incidents?category=${cat}`)} className="px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB] transition">{cat.replace(/_/g, ' ')} · <b>{count}</b></button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-[20px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-[#172033]">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              { label: 'Report Emergency', icon: <FilePlus2 className="w-4 h-4" />, to: '/report' },
              { label: 'View Incidents', icon: <AlertCircle className="w-4 h-4" />, to: '/incidents' },
              { label: 'Live Map', icon: <MapPin className="w-4 h-4" />, to: '/map' },
              { label: 'Find Hospitals', icon: <Hospital className="w-4 h-4" />, to: '/map' },
              { label: 'Response Units', icon: <Ambulance className="w-4 h-4" />, to: '/resources' },
            ].map((cmd) => (
              <button key={cmd.label} type="button" onClick={() => navigate(cmd.to)} className="min-h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB] transition flex items-center gap-2.5 text-left">
                <span className="text-[#2563EB] shrink-0">{cmd.icon}</span>{cmd.label}
              </button>
            ))}
          </div>
        </section>

        {/* Recent Incidents — spans 2 */}
        <section className="lg:col-span-2 rounded-[20px] bg-white border border-slate-200 shadow-sm overflow-hidden min-w-0">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="font-bold text-[#172033]">Recent Incidents</h2>
            <button type="button" onClick={() => navigate('/incidents')} className="text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 shrink-0">View all <ArrowRight className="w-4 h-4" /></button>
          </div>
          {isLoading ? (<div className="p-4 space-y-3">{[0, 1, 2].map((i) => (<Skeleton key={i} className="h-14" />))}</div>) : recent.length === 0 ? (
            <p className="p-4 text-sm text-[#64748B]">No incident records in the current data.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((inc) => (
                <li key={inc.id}>
                  <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-semibold text-[#2563EB]">{inc.id}</span><PriorityBadge priority={inc.priority} size="sm" /><StatusBadge status={inc.status} size="sm" /></div>
                      <p className="mt-1 font-semibold text-[#172033] truncate">{inc.title}</p>
                      <p className="text-xs text-[#64748B] truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /> {inc.location.address}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mission Activity */}
        <section className="rounded-[20px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-[#172033]">Mission Activity</h2>
          <p className="mt-1 text-xs text-[#64748B]">Response timeline (simulated data)</p>
          <ul className="mt-3 space-y-2">
            {demoActivity.slice(0, 6).map((a, i) => (
              <li key={i} className="text-sm text-[#172033]">• <span className="text-[#64748B]">{a}</span></li>
            ))}
          </ul>
          <h3 className="font-bold text-[#172033] text-sm mt-4">Recent incidents</h3>
          <ul className="mt-2 space-y-2">
            {activityIncidents.slice(0, 5).map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 text-sm min-w-0">
                <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="text-left min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#2563EB]">{inc.id}</span>
                  <span className="ml-2 font-medium text-[#172033] truncate">{inc.title}</span>
                </button>
                <StatusBadge status={inc.status} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
