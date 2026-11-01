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

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, agentRes, incRes, resRes] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getSpecializedAgents(),
        api.getIncidents({ limit: 8 }),
        api.getResources()
      ]);
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
      {/* Hero */}
      <section className="bg-[#101C35] rounded-2xl p-6 sm:p-8 text-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
              Monitor emergency operations and coordinate response activities from one place.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              One Voice. Four Agents. One Mission. · Decision support only — always call 112 / 911 for
              life-threatening emergencies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="shrink-0 min-h-12 px-5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
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
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('POLICE_TACTICAL')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Police Response Agent</h3>
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
                onClick={() => navigate('/agents/POLICE_TACTICAL')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
            </article>

            {/* Medical */}
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('HOSPITAL_EMS')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Medical Response Agent</h3>
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
                onClick={() => navigate('/agents/HOSPITAL_EMS')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
            </article>

            {/* Fire & Rescue — coordinated through real fire units + fire incidents.
                There is no separate Fire specialised-agent in the backend, so this
                card deliberately does not claim an agent "Online" status. */}
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {fireUnits.length > 0 ? `${fireAvailable} of ${fireUnits.length} units available` : 'No unit data'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Fire &amp; Rescue Agent</h3>
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
                onClick={() => navigate('/incidents?category=FIRE_INCIDENT')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Fire Response
              </button>
            </article>

            {/* Civil & Public Services */}
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {agentById('WATER_HYDRO')?.status || 'Status Unavailable'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-[#172033]">Civil &amp; Public Services Agent</h3>
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
                onClick={() => navigate('/agents/WATER_HYDRO')}
                className="mt-4 min-h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Open Agent
              </button>
              <button
                type="button"
                onClick={() => navigate('/agents/CURRENT_KEB')}
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
              className="min-h-14 px-4 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB] transition flex items-center gap-2.5 text-left"
            >
              <span className="text-[#2563EB] shrink-0">{cmd.icon}</span>
              {cmd.label}
            </button>
          ))}
        </div>
      </section>

      {/* Recent incidents — real records only */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
