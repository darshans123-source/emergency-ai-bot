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
import { useLanguage } from '../i18n/LanguageContext';
import { loadDemoIncidents, saveDemoIncidents, loadDemoActivity, saveDemoActivity, demoStats, allDemoUnits, randomDemoIncident } from '../demo/demoStore';
import { demoIncidentToIncident, demoUnitToResource } from '../demo/localFallback';
import { Skeleton } from '../components/common/UiBits';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile, user } = useAuth();
  const { t, agents } = useLanguage();

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
      slug: 'rakshak', icon: <Shield className="w-5 h-5" />, chip: 'chrome-icon text-white', accent: 'agent-glass-rakshak',
      name: 'RAKSHAK AI', role: agents.rakshak?.sector || 'Police & Security Response',
      desc: agents.rakshak?.description || 'Police incident assistance, station information and response recommendations.',
      status: 'Ready',
      task: 'Police assessment ready — open the agent to ask a question',
    },
    {
      slug: 'jeevan', icon: <HeartPulse className="w-5 h-5" />, chip: 'chrome-icon text-white', accent: 'agent-glass-jeevan',
      name: 'JEEVAN AI', role: agents.jeevan?.sector || 'Medical & Healthcare Response',
      desc: agents.jeevan?.description || 'Medical emergency guidance, nearby hospital information and emergency requests.',
      status: 'Ready',
      task: 'Medical assessment ready — open the agent to ask a question',
    },
    {
      slug: 'agni', icon: <Flame className="w-5 h-5" />, chip: 'chrome-icon text-white', accent: 'agent-glass-agni',
      name: 'AGNI AI', role: agents.agni?.sector || 'Fire & Rescue Response',
      desc: agents.agni?.description || 'Fire incident reporting, fire unit coordination and rescue support.',
      status: fireUnits.length > 0 ? `${fireAvailable} of ${fireUnits.length} units available` : 'No unit data',
      task: latestFire ? latestFire.title : 'No active fire incident in the current records',
    },
    {
      slug: 'sanrakshak', icon: <Droplets className="w-5 h-5" />, chip: 'chrome-icon text-white', accent: 'agent-glass-sanrakshak',
      name: 'SANRAKSHAK AI', role: agents.sanrakshak?.sector || 'Disaster & Public Services',
      desc: agents.sanrakshak?.description || 'Water, electricity, road and infrastructure issues and public safety reporting.',
      status: 'Ready',
      task: 'Disaster assessment ready — open the agent to ask a question',
    },
  ];
  const stats = [
    { label: t('dash.total_incidents'), value: totalIncidents !== null ? String(totalIncidents) : '—', icon: <AlertCircle className="w-4 h-4" />, chip: 'bg-blue-500/20 text-blue-300 border border-blue-400/30' },
    { label: t('dash.active_incidents'), value: summary ? String(summary.totalActive) : '—', icon: <Activity className="w-4 h-4" />, chip: 'bg-amber-500/20 text-amber-300 border border-amber-400/30' },
    { label: t('dash.resolved_incidents'), value: summary ? String(summary.resolvedIncidents) : '—', icon: <CheckCircle2 className="w-4 h-4" />, chip: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' },
    { label: t('dash.available_units'), value: summary ? String(summary.availableUnits) : '—', icon: <Ambulance className="w-4 h-4" />, chip: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 text-slate-100">
      {/* Compact welcome banner — white, no large gradient */}
      <section className="rounded-[24px] bg-gradient-to-br from-[#0B1E46] via-[#143A75] to-[#2563EB] border border-blue-900/20 shadow-lg shadow-blue-900/20 p-4 sm:p-6 flex flex-col overflow-hidden relative sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo-icon.svg" alt="AegisAI" className="w-10 h-10 rounded-xl shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">{t('dash.welcome_back')}, {displayName}</h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">One Voice. Four Agents. One Mission. — Decision support only, call 112 / 911 for life-threatening emergencies.</p>
            <p className="mt-1 text-xs text-blue-200">{t('dash.simulated_data')} · For real emergencies, call 112.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/report')} className="w-full sm:w-auto shrink-0 min-h-11 px-4 rounded-xl bg-[#E53935] hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
          <FilePlus2 className="w-4 h-4" /> {t('menu.report_emergency')}
        </button>
      </section>

      {/* AI Agents — single column on small screens, 2 on tablets, 4 on desktop */}
      <section aria-label="AI agents">
        <div className="flex items-center justify-between gap-3 mb-2.5 px-0.5">
          <h2 className="text-lg font-extrabold tracking-tight text-white">{t('dash.ai_agents')}</h2>
          <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:underline shrink-0 min-h-10">{t('dash.view_all')} <ArrowRight className="w-4 h-4" /></button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => (<Skeleton key={i} className="h-44" />))}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {agentCards.map((a) => (
              <article key={a.slug} className="agent-card-dark rounded-[24px] hover:-translate-y-0.5 p-5 flex flex-col min-w-0 h-full transition">
                <div className="flex items-center justify-between gap-2">
                  <span className={`w-10 h-10 rounded-xl ${a.chip} flex items-center justify-center shrink-0`}>{a.icon}</span>
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-white/10 border border-white/20 text-slate-200 text-center leading-tight">{a.status}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">{a.name}</h3>
                <p className="text-xs font-medium text-cyan-300">{a.role}</p>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{a.desc}</p>
                <p className="mt-2 mb-3 text-xs text-slate-300 leading-relaxed"><span className="font-semibold text-white">Task: </span>{a.task}</p>
                <button type="button" onClick={() => navigate(`/agents/${a.slug}`)} className="mt-auto min-h-11 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:brightness-110 text-white text-sm font-semibold transition">{t('dash.open_agent')}</button>
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
              <div key={s.label} className="rounded-[24px] bg-white border border-slate-200 shadow-sm p-5 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0"><p className="text-xs font-medium text-slate-500 leading-tight">{s.label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{s.value}</p></div>
                <span className={`w-9 h-9 rounded-xl ${s.chip} flex items-center justify-center shrink-0`}>{s.icon}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bento grid: overview + quick actions + recent + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Emergency Overview — spans 2 */}
        <section className="lg:col-span-2 rounded-[24px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-slate-900">{t('dash.emergency_overview')}</h2>
          <div className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold">{t('nav.local_ai_ready')}</span>
                <span className="text-slate-400 text-xs">· {t('dash.simulated_data')} · Updated {lastUpdated}</span>
              </p>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button type="button" onClick={() => setSimulating((v) => !v)} className={`min-h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${simulating ? 'bg-rose-600 text-white' : 'bg-[#2563EB] text-white'}`}>
                  {simulating ? <><Square className="w-3.5 h-3.5" /> {t('dash.stop_simulation')}</> : <><Play className="w-3.5 h-3.5" /> {t('dash.start_simulation')}</>}
                </button>
                <button type="button" onClick={() => { const next = randomDemoIncident(2000 + demoIncidents.length + 1); const list = [next, ...demoIncidents]; setDemoIncidents(list); saveDemoIncidents(list); }} className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {t('dash.create_incident')}</button>
                <button type="button" onClick={() => { setDemoIncidents(loadDemoIncidents()); setDemoActivity(loadDemoActivity()); }} className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> {t('dash.refresh')}</button>
              </div>
            </div>
            <p className="text-xs text-slate-500">{simulating ? 'Simulation running: a new incident appears about every 20 seconds (simulated).' : 'Simulation stopped. Changes are saved in this browser only.'}</p>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-slate-900">{summary.totalActive}</p><p className="text-[11px] text-slate-500">Active</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-slate-900">{summary.awaitingReview}</p><p className="text-[11px] text-slate-500">Awaiting review</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-slate-900">{summary.highOrCriticalPriority}</p><p className="text-[11px] text-slate-500">High / critical</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><p className="text-lg font-bold text-slate-900">{summary.availableUnits}</p><p className="text-[11px] text-slate-500">Units available</p></div>
              </div>
            )}
            {summary && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">By category</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(summary.categoryCounts).map(([cat, count]) => (
                    <button key={cat} type="button" onClick={() => navigate(`/incidents?category=${cat}`)} className="px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 transition">{cat.replace(/_/g, ' ')} · <b>{count}</b></button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-[24px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-slate-900">{t('dash.quick_actions')}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              { label: t('menu.report_emergency'), icon: <FilePlus2 className="w-4 h-4" />, to: '/report' },
              { label: t('dash.view_incidents'), icon: <AlertCircle className="w-4 h-4" />, to: '/incidents' },
              { label: t('menu.live_map'), icon: <MapPin className="w-4 h-4" />, to: '/map' },
              { label: 'Find Hospitals', icon: <Hospital className="w-4 h-4" />, to: '/map' },
              { label: t('menu.fleet_resources'), icon: <Ambulance className="w-4 h-4" />, to: '/resources' },
            ].map((cmd) => (
              <button key={cmd.label} type="button" onClick={() => navigate(cmd.to)} className="min-h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-600 transition flex items-center gap-2.5 text-left">
                <span className="text-blue-600 shrink-0">{cmd.icon}</span>{cmd.label}
              </button>
            ))}
          </div>
        </section>

        {/* Recent Incidents — spans 2 */}
        <section className="lg:col-span-2 rounded-[20px] bg-white border border-slate-200 shadow-sm overflow-hidden min-w-0">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">{t('dash.recent_incidents')}</h2>
            <button type="button" onClick={() => navigate('/incidents')} className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 shrink-0">{t('dash.view_all')} <ArrowRight className="w-4 h-4" /></button>
          </div>
          {isLoading ? (<div className="p-4 space-y-3">{[0, 1, 2].map((i) => (<Skeleton key={i} className="h-14" />))}</div>) : recent.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No incident records in the current data.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((inc) => (
                <li key={inc.id}>
                  <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-semibold text-blue-600">{inc.id}</span><PriorityBadge priority={inc.priority} size="sm" /><StatusBadge status={inc.status} size="sm" /></div>
                      <p className="mt-1 font-semibold text-slate-900 truncate">{inc.title}</p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /> {inc.location.address}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mission Activity */}
        <section className="rounded-[24px] bg-white border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-slate-900">{t('dash.recent_activity')}</h2>
          <p className="mt-1 text-xs text-slate-500">Response timeline (simulated data)</p>
          <ul className="mt-3 space-y-2">
            {demoActivity.slice(0, 6).map((a, i) => (
              <li key={i} className="text-sm text-slate-800">• <span className="text-slate-500">{a}</span></li>
            ))}
          </ul>
          <h3 className="font-bold text-slate-900 text-sm mt-4">Recent incidents</h3>
          <ul className="mt-2 space-y-2">
            {activityIncidents.slice(0, 5).map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 text-sm min-w-0">
                <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="text-left min-w-0">
                  <span className="font-mono text-xs font-semibold text-blue-600">{inc.id}</span>
                  <span className="ml-2 font-medium text-slate-900 truncate">{inc.title}</span>
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
