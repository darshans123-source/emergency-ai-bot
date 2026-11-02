import React, { useEffect, useState, useCallback } from 'react';
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
  Wifi,
  WifiOff
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  DashboardSummary,
  Incident,
  Resource,
  SpecializedAgent,
  SpecializedAgentId
} from '../types';
import { StatCard, Skeleton, ErrorState } from '../components/common/UiBits';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile, user } = useAuth();
  const { isConnected, wsStatus, retryConnection } = useNotifications();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [activityIncidents, setActivityIncidents] = useState<Incident[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, agentRes, incRes, resRes, healthRes, actRes] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getSpecializedAgents(),
        api.getIncidents({ limit: 8 }),
        api.getResources(),
        api.getHealth(),
        api.getDashboardActivity()
      ]);
      if (healthRes.status === 'fulfilled') {
        setBackendHealth('online');
        setBackendError(null);
      } else {
        setBackendHealth('offline');
        setBackendError(healthRes.reason?.message || 'Backend health check failed.');
      }
      if (actRes.status === 'fulfilled') setActivityIncidents(actRes.value.recentIncidents || []);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (agentRes.status === 'fulfilled') setAgents(agentRes.value || []);
      if (incRes.status === 'fulfilled') setIncidents(incRes.value.incidents || []);
      if (resRes.status === 'fulfilled') setResources(resRes.value || []);
      const failed = [sumRes, agentRes, incRes, resRes].filter((r) => r.status === 'rejected');
      if (failed.length === 4) {
        setError('The command centre could not reach the backend. Check your connection and retry.');
      } else if (failed.length > 0) {
        setError('Some sections could not be refreshed. The data below is from the sections that did load.');
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err?.message || 'Could not load the command centre.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = localProfile?.name || user?.name || 'Commander';
  const agentById = (id: SpecializedAgentId) => agents.find((a) => a.id === id);
  const fireUnits = resources.filter((r) => r.type === 'FIRE_UNIT');
  const fireAvailable = fireUnits.filter((r) => r.status === 'AVAILABLE').length;
  const latestFire = incidents.find((i) => i.category === 'FIRE_INCIDENT');
  const recent = incidents.slice(0, 5);

  const totalIncidents =
    summary ? summary.totalActive + summary.resolvedIncidents : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero — blue-purple gradient welcome card with animated background */}
      <section className="relative rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] animate-glass-fade-up">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/15 blur-3xl animate-glass-float" />
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-cyan-400/25 blur-3xl animate-glass-float-slow" />
          <div className="absolute top-8 right-1/3 w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md rotate-12 hidden sm:block" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Emergency Operations Overview</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100 max-w-2xl">
              Monitor emergency operations and coordinate response activities from one place.
            </p>
            <p className="mt-3 text-xs text-blue-200">
              One Voice. Four Agents. One Mission. · Decision support only — always call 112 / 911 for
              life-threatening emergencies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="shrink-0 min-h-12 px-5 rounded-xl bg-[#EF4444] hover:bg-red-600 hover:-translate-y-0.5 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/30"
          >
            <FilePlus2 className="w-4 h-4" />
            Report Emergency
          </button>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Stats — only from the live summary, never invented */}
      <section aria-label="Operations statistics">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Incidents"
              value={totalIncidents !== null ? String(totalIncidents) : '—'}
              icon={<AlertCircle className="w-5 h-5" />}
              accent="bg-blue-50 text-blue-700"
              note="Active + resolved, from the live summary"
            />
            <StatCard
              label="Active Incidents"
              value={summary ? String(summary.totalActive) : '—'}
              icon={<Activity className="w-5 h-5" />}
              accent="bg-amber-50 text-amber-700"
              note="Awaiting review included in the live count"
            />
            <StatCard
              label="Resolved Incidents"
              value={summary ? String(summary.resolvedIncidents) : '—'}
              icon={<CheckCircle2 className="w-5 h-5" />}
              accent="bg-emerald-50 text-emerald-700"
              note="From the live summary"
            />
            <StatCard
              label="Available Response Units"
              value={summary ? String(summary.availableUnits) : '—'}
              icon={<Ambulance className="w-5 h-5" />}
              accent="bg-cyan-50 text-cyan-700"
              note="Units reported available by the backend"
            />
          </div>
        )}
      </section>

      {/* Connectivity — shown separately, and only "Connected" on a real live link */}
      <section className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-glass-fade-up">
        <div className="flex items-center gap-3 min-w-0">
          {isConnected ? (
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </span>
          ) : (
            <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#172033]">
              {isConnected
                ? 'System connectivity: Connected'
                : wsStatus === 'unavailable'
                  ? 'System connectivity: Live link unavailable'
                  : 'System connectivity: Reconnecting…'}
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">
              {lastUpdated ? `Operations data last refreshed at ${lastUpdated}. ` : ''}
              The live link badge reflects the actual WebSocket state — it is never shown as
              Connected unless the service confirms it.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={load}
            className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh data
          </button>
          {!isConnected && wsStatus === 'unavailable' && (
            <button
              type="button"
              onClick={retryConnection}
              className="min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700"
            >
              Retry live link
            </button>
          )}
        </div>
      </section>

      {/* Backend health — separate from the WebSocket live link */}
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#172033]">
              Backend API: {backendHealth === 'checking' ? 'Checking…' : backendHealth === 'online' ? 'Online' : 'Unavailable'}
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">
              {backendHealth === 'offline'
                ? `The live API did not answer the health check${backendError ? `: ${backendError}` : ''}. This is a deployment/backend issue, not an empty dashboard — check the Vercel function logs for the /api function.`
                : 'Checked against /api/health. Live incident data below comes from the same backend.'}
            </p>
          </div>
          {backendHealth === 'offline' && (
            <button type="button" onClick={load} className="min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold shrink-0">
              Retry Backend
            </button>
          )}
        </div>
      </section>

      {/* Emergency category distribution — real summary counts only */}
      {summary && (
        <section className="glass rounded-2xl p-5">
          <h2 className="font-bold text-[#172033]">Emergency Category Distribution</h2>
          <p className="text-sm text-[#64748B] mt-1">Counts from the live dashboard summary, by incident category.</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {Object.entries(summary.categoryCounts).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => navigate(`/incidents?category=${cat}`)}
                className="glass glass-card-hover rounded-xl p-3 text-left transition"
              >
                <p className="text-2xl font-extrabold text-[#172033]">{count}</p>
                <p className="text-[11px] font-medium text-[#64748B] break-words mt-0.5">{cat.replace(/_/g, ' ')}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Live incident activity — real recent incidents from /dashboard/activity */}
      {activityIncidents.length > 0 && (
        <section className="glass rounded-2xl p-5">
          <h2 className="font-bold text-[#172033]">Live Incident Activity</h2>
          <ul className="mt-3 space-y-2">
            {activityIncidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 text-sm">
                <button type="button" onClick={() => navigate(`/incidents/${inc.id}`)} className="text-left min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#2563EB]">{inc.id}</span>
                  <span className="ml-2 font-medium text-[#172033] truncate">{inc.title}</span>
                </button>
                <StatusBadge status={inc.status} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI Response Agents */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">AI Response Agents</h2>
            <p className="text-sm text-[#64748B]">Status and current task come from the live agent service.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline shrink-0"
          >
            View all agents <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Police */}
            <article className="glass glass-card-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('POLICE_TACTICAL')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Rakshak AI — Police Response</h3>
              <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                Police incident assistance, police station information, incident reporting and response
                recommendations.
              </p>
              <p className="mt-3 text-xs text-[#64748B]">
                <span className="font-semibold text-[#172033]">Active task: </span>
                {agentById('POLICE_TACTICAL')?.currentTask ||
                  agentById('POLICE_TACTICAL')?.assignedIncidentTitle ||
                  'No active task reported'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/agents/rakshak')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
            </article>

            {/* Medical */}
            <article className="glass glass-card-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('HOSPITAL_EMS')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Jeevan AI — Medical Response</h3>
              <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                Medical emergency guidance, nearby hospital information and emergency request assistance.
              </p>
              <p className="mt-3 text-xs text-[#64748B]">
                <span className="font-semibold text-[#172033]">Active task: </span>
                {agentById('HOSPITAL_EMS')?.currentTask ||
                  agentById('HOSPITAL_EMS')?.assignedIncidentTitle ||
                  'No active task reported'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/agents/jeevan')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
            </article>

            {/* Fire & Rescue — coordinated through real fire units + fire incidents.
                There is no separate Fire specialised-agent in the backend, so this
                card deliberately does not claim an agent "Online" status. */}
            <article className="glass glass-card-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {fireUnits.length > 0 ? `${fireAvailable} of ${fireUnits.length} units available` : 'No unit data'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Agni AI — Fire & Rescue</h3>
              <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                Fire incident reporting, fire unit coordination and rescue support — via live fire units
                and fire incidents.
              </p>
              <p className="mt-3 text-xs text-[#64748B]">
                <span className="font-semibold text-[#172033]">Active task: </span>
                {latestFire ? latestFire.title : 'No active fire incident in live records'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/agents/agni')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
            </article>

            {/* Civil & Public Services */}
            <article className="glass glass-card-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('WATER_HYDRO')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Sanrakshak AI — Disaster & Public Services</h3>
              <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                Water supply disruptions, electricity complaints, road and infrastructure issues and
                public safety reporting.
              </p>
              <p className="mt-3 text-xs text-[#64748B]">
                <span className="font-semibold text-[#172033]">Active task: </span>
                {agentById('WATER_HYDRO')?.currentTask ||
                  agentById('WATER_HYDRO')?.assignedIncidentTitle ||
                  'No active task reported'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/agents/sanrakshak')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
              <button
                type="button"
                onClick={() => navigate('/agents/sanrakshak')}
                className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline text-left"
              >
                Also: Power agent (Shakti AI) →
              </button>
            </article>
          </div>
        )}
      </section>

      {/* Quick Commands */}
      <section>
        <h2 className="text-lg font-bold text-[#172033] mb-4">Quick Commands</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'View Active Incidents', icon: <AlertCircle className="w-4 h-4" />, to: '/incidents?status=RESOURCES_DISPATCHED' },
            { label: 'Find Nearby Hospitals', icon: <Hospital className="w-4 h-4" />, to: '/map' },
            { label: 'Report Emergency', icon: <FilePlus2 className="w-4 h-4" />, to: '/report' },
            { label: 'View Live Map', icon: <MapPin className="w-4 h-4" />, to: '/map' },
            { label: 'View Response Units', icon: <Ambulance className="w-4 h-4" />, to: '/resources' }
          ].map((cmd) => (
            <button
              key={cmd.label}
              type="button"
              onClick={() => navigate(cmd.to)}
              className="glass glass-card-hover min-h-14 px-4 rounded-xl text-sm font-semibold text-[#172033] hover:text-[#2563EB] transition flex items-center gap-2.5 text-left"
            >
              <span className="text-[#2563EB] shrink-0">{cmd.icon}</span>
              {cmd.label}
            </button>
          ))}
        </div>
      </section>

      {/* Recent incidents — real records only */}
      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#172033]">Recent Incidents</h2>
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="p-5 text-sm text-[#64748B]">
            No incident records were returned by the backend. This is not a placeholder — check the
            connection and retry.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((inc) => (
              <li key={inc.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#2563EB]">{inc.id}</span>
                      <PriorityBadge priority={inc.priority} size="sm" />
                      <StatusBadge status={inc.status} size="sm" />
                    </div>
                    <p className="mt-1 font-semibold text-[#172033] truncate">{inc.title}</p>
                    <p className="text-xs text-[#64748B] truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /> {inc.location.address}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
