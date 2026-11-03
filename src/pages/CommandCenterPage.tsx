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
  Plus,
  Siren,
  Layers
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
  const recent = incidents.slice(0, 5);

  const totalIncidents =
    summary ? summary.totalActive + summary.resolvedIncidents : null;

  // Agent cards match the mobile reference: unique icon + accent colour,
  // category, description, Ready status and Open Agent button. The faint
  // photos in the reference are recreated as an accent glow + watermark
  // icon (real CSS), not as a screenshot or stock photo.
  const agentCards = [
    {
      slug: 'rakshak', icon: <Shield className="w-7 h-7" />, accentBg: 'from-[#2563EB] to-[#06B6D4]', accentGlow: 'rgba(37, 99, 235, 0.35)', accentBorder: 'rgba(56, 189, 248, 0.45)',
      name: 'RAKSHAK AI', role: 'Police & Public Safety',
      desc: 'Police incident assistance, station information and response recommendations.',
      status: 'Ready',
    },
    {
      slug: 'jeevan', icon: <HeartPulse className="w-7 h-7" />, accentBg: 'from-[#059669] to-[#22C55E]', accentGlow: 'rgba(34, 197, 94, 0.35)', accentBorder: 'rgba(52, 211, 153, 0.45)',
      name: 'JEEVAN AI', role: 'Medical & Ambulance Assistance',
      desc: 'Medical emergency guidance, nearby hospital information and assistance.',
      status: 'Ready',
    },
    {
      slug: 'agni', icon: <Flame className="w-7 h-7" />, accentBg: 'from-[#EA580C] to-[#EF4444]', accentGlow: 'rgba(249, 115, 22, 0.35)', accentBorder: 'rgba(251, 146, 60, 0.45)',
      name: 'AGNI AI', role: 'Fire & Rescue Operations',
      desc: 'Fire incident support, rescue guidance and safety recommendations.',
      status: 'Ready',
    },
    {
      slug: 'sanrakshak', icon: <Droplets className="w-7 h-7" />, accentBg: 'from-[#7C3AED] to-[#A855F7]', accentGlow: 'rgba(168, 85, 247, 0.35)', accentBorder: 'rgba(192, 132, 252, 0.45)',
      name: 'SANRAKSHAK AI', role: 'Disaster Management',
      desc: 'Natural disaster alerts, preparedness tips and relief information.',
      status: 'Ready',
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
      {/* Welcome card — matches the mobile reference: name + tagline left,
          glowing shield right, simulated-data pill, full-width red button. */}
      <section className="cc-welcome relative rounded-[24px] border border-cyan-400/30 shadow-lg shadow-blue-950/40 p-4 sm:p-6 overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl font-bold text-white leading-tight">{t('dash.welcome_back')},</p>
            <h1 className="chrome-text text-3xl sm:text-4xl font-black tracking-tight leading-tight uppercase">{displayName}</h1>
            <p className="mt-2 text-sm sm:text-base font-bold text-white leading-snug">One Voice. Four Agents. One Mission.</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">Decision support only, call <a href="tel:112" className="font-semibold text-cyan-300 underline underline-offset-2">112</a> / 911 for life-threatening emergencies.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-slate-200">
              <Shield className="w-3.5 h-3.5 text-cyan-300 shrink-0" /> {t('dash.simulated_data')} · For real emergencies, call 112.
            </p>
          </div>
          <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center" aria-hidden="true">
            <span className="cc-logo-ring" />
            <span className="cc-logo-ring cc-logo-ring-2" />
            <img src="/logo-icon.svg" alt="" className="cc-logo-float logo-glow w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover relative z-10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
        <button type="button" onClick={() => navigate('/report')} className="relative z-10 mt-4 w-full min-h-12 px-4 rounded-2xl bg-gradient-to-r from-[#FF5252] to-[#E53935] hover:brightness-110 active:scale-[0.99] text-white text-base font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/40">
          <Siren className="w-5 h-5" /> {t('menu.report_emergency')} <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* AI Agents — single column on small screens, 2 on tablets, 4 on desktop */}
      <section aria-label="AI agents">
        <div className="flex items-center justify-between gap-3 mb-2.5 px-0.5">
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2"><Layers className="w-5 h-5 text-cyan-300 shrink-0" />{t('dash.ai_agents')}</h2>
          <button type="button" onClick={() => navigate('/agents')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20 shrink-0 min-h-10 transition">{t('dash.view_all')} <ArrowRight className="w-4 h-4" /></button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => (<Skeleton key={i} className="h-44" />))}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {agentCards.map((a) => (
              <article key={a.slug} className="agent-card-dark cc-agent relative rounded-[24px] p-4 sm:p-5 flex gap-3 lg:flex-col min-w-0 h-full overflow-hidden transition hover:-translate-y-0.5" style={{ backgroundImage: `radial-gradient(120% 120% at 100% 0%, ${a.accentGlow}, transparent 60%)`, borderColor: a.accentBorder }}>
                <span className="absolute -right-2 -bottom-4 text-white/10 pointer-events-none [&>svg]:w-24 [&>svg]:h-24" aria-hidden="true">{a.icon}</span>
                <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.accentBg} text-white flex items-center justify-center shrink-0 shadow-lg`} style={{ boxShadow: `0 8px 24px ${a.accentGlow}` }}>{a.icon}</span>
                <div className="min-w-0 flex-1 relative z-10">
                  <h3 className="text-base font-extrabold tracking-tight text-white leading-tight">{a.name}</h3>
                  <p className="text-xs sm:text-sm font-bold text-cyan-300 leading-tight">{a.role}</p>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">{a.desc}</p>
                </div>
                <div className="flex flex-col items-end justify-between gap-2 shrink-0 relative z-10 lg:flex-row lg:items-center lg:justify-between lg:w-full">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{a.status}</span>
                  <button type="button" onClick={() => navigate(`/agents/${a.slug}`)} className="inline-flex items-center gap-1 px-4 min-h-10 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:brightness-110 active:scale-[0.98] text-white text-sm font-semibold transition shadow-lg shadow-blue-600/30">{t('dash.open_agent')} <ArrowRight className="w-4 h-4" /></button>
                </div>
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
              <div key={s.label} className="rounded-[24px] bg-[#0F1E41]/80 border border-white/15 shadow-sm p-5 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0"><p className="text-xs font-medium text-slate-400 leading-tight">{s.label}</p><p className="mt-1 text-2xl font-extrabold text-white">{s.value}</p></div>
                <span className={`w-9 h-9 rounded-xl ${s.chip} flex items-center justify-center shrink-0`}>{s.icon}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bento grid: overview + quick actions + recent + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Emergency Overview — spans 2 */}
        <section className="lg:col-span-2 rounded-[24px] bg-[#0F1E41]/80 border border-white/15 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-white">{t('dash.emergency_overview')}</h2>
          <div className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold">{t('nav.local_ai_ready')}</span>
                <span className="text-slate-400 text-xs">· {t('dash.simulated_data')} · Updated {lastUpdated}</span>
              </p>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button type="button" onClick={() => setSimulating((v) => !v)} className={`min-h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${simulating ? 'bg-rose-600 text-white' : 'bg-[#2563EB] text-white'}`}>
                  {simulating ? <><Square className="w-3.5 h-3.5" /> {t('dash.stop_simulation')}</> : <><Play className="w-3.5 h-3.5" /> {t('dash.start_simulation')}</>}
                </button>
                <button type="button" onClick={() => { const next = randomDemoIncident(2000 + demoIncidents.length + 1); const list = [next, ...demoIncidents]; setDemoIncidents(list); saveDemoIncidents(list); }} className="min-h-10 px-3 rounded-xl border border-white/20 bg-white/10 text-xs font-semibold text-slate-200 hover:bg-white/15 inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {t('dash.create_incident')}</button>
                <button type="button" onClick={() => { setDemoIncidents(loadDemoIncidents()); setDemoActivity(loadDemoActivity()); }} className="min-h-10 px-3 rounded-xl border border-white/20 bg-white/10 text-xs font-semibold text-slate-200 hover:bg-white/15 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> {t('dash.refresh')}</button>
              </div>
            </div>
            <p className="text-xs text-slate-400">{simulating ? 'Simulation running: a new incident appears about every 20 seconds (simulated).' : 'Simulation stopped. Changes are saved in this browser only.'}</p>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="text-lg font-bold text-white">{summary.totalActive}</p><p className="text-[11px] text-slate-400">Active</p></div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="text-lg font-bold text-white">{summary.awaitingReview}</p><p className="text-[11px] text-slate-400">Awaiting review</p></div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="text-lg font-bold text-white">{summary.highOrCriticalPriority}</p><p className="text-[11px] text-slate-400">High / critical</p></div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="text-lg font-bold text-white">{summary.availableUnits}</p><p className="text-[11px] text-slate-400">Units available</p></div>
              </div>
            )}
            {summary && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">By category</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(summary.categoryCounts).map(([cat, count]) => (
                    <button key={cat} type="button" onClick={() => navigate(`/incidents?category=${cat}`)} className="px-2.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-medium text-slate-300 hover:border-cyan-400 hover:text-cyan-300 transition">{cat.replace(/_/g, ' ')} · <b>{count}</b></button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-[24px] bg-[#0F1E41]/80 border border-white/15 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-white">{t('dash.quick_actions')}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              { label: t('menu.report_emergency'), icon: <FilePlus2 className="w-4 h-4" />, to: '/report' },
              { label: t('dash.view_incidents'), icon: <AlertCircle className="w-4 h-4" />, to: '/incidents' },
              { label: t('menu.live_map'), icon: <MapPin className="w-4 h-4" />, to: '/map' },
              { label: 'Find Hospitals', icon: <Hospital className="w-4 h-4" />, to: '/map' },
              { label: t('menu.fleet_resources'), icon: <Ambulance className="w-4 h-4" />, to: '/resources' },
            ].map((cmd) => (
              <button key={cmd.label} type="button" onClick={() => navigate(cmd.to)} className="min-h-11 px-3 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition flex items-center gap-2.5 text-left">
                <span className="text-cyan-300 shrink-0">{cmd.icon}</span>{cmd.label}
              </button>
            ))}
          </div>
        </section>

        {/* Recent Incidents — spans 2 */}
        <section className="lg:col-span-2 rounded-[20px] bg-[#0F1E41]/80 border border-white/15 shadow-sm overflow-hidden min-w-0">
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
            <h2 className="font-bold text-white">{t('dash.recent_incidents')}</h2>
            <button type="button" onClick={() => navigate('/incidents')} className="text-sm font-semibold text-cyan-300 hover:underline inline-flex items-center gap-1 shrink-0">{t('dash.view_all')} <ArrowRight className="w-4 h-4" /></button>
          </div>
          {isLoading ? (<div className="p-4 space-y-3">{[0, 1, 2].map((i) => (<Skeleton key={i} className="h-14" />))}</div>) : recent.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No incident records in the current data.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {recent.map((inc) => (
                <li key={inc.id}>
                  <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-semibold text-cyan-300">{inc.id}</span><PriorityBadge priority={inc.priority} size="sm" /><StatusBadge status={inc.status} size="sm" /></div>
                      <p className="mt-1 font-semibold text-white truncate">{inc.title}</p>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /> {inc.location.address}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mission Activity */}
        <section className="rounded-[24px] bg-[#0F1E41]/80 border border-white/15 shadow-sm p-4 sm:p-5 min-w-0">
          <h2 className="font-bold text-white">{t('dash.recent_activity')}</h2>
          <p className="mt-1 text-xs text-slate-400">Response timeline (simulated data)</p>
          <ul className="mt-3 space-y-2">
            {demoActivity.slice(0, 6).map((a, i) => (
              <li key={i} className="text-sm text-slate-300">• <span className="text-slate-400">{a}</span></li>
            ))}
          </ul>
          <h3 className="font-bold text-white text-sm mt-4">Recent incidents</h3>
          <ul className="mt-2 space-y-2">
            {activityIncidents.slice(0, 5).map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 text-sm min-w-0">
                <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="text-left min-w-0">
                  <span className="font-mono text-xs font-semibold text-cyan-300">{inc.id}</span>
                  <span className="ml-2 font-medium text-slate-200 truncate">{inc.title}</span>
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
