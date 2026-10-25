import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardSummary, Incident, AuditLog, SpecializedAgent, SpecializedAgentId } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import {
  AlertCircle,
  CheckCircle,
  Truck,
  Flame,
  RefreshCw,
  FilePlus2,
  MapPin,
  ArrowRight,
  Shield,
  HeartPulse,
  Droplets,
  Zap,
  Clock,
  ExternalLink,
  X,
  Activity,
  Check
} from 'lucide-react';

const EXPECTED_AGENTS: Array<{
  id: SpecializedAgentId;
  name: string;
  defaultRole: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}> = [
  {
    id: 'POLICE_TACTICAL',
    name: 'Police Tactical Agent',
    defaultRole: 'Security and police coordination',
    icon: Shield,
    accentColor: 'blue'
  },
  {
    id: 'HOSPITAL_EMS',
    name: 'Hospital & EMS Agent',
    defaultRole: 'Medical emergency coordination',
    icon: HeartPulse,
    accentColor: 'rose'
  },
  {
    id: 'WATER_HYDRO',
    name: 'Water Supply & Hydro Agent',
    defaultRole: 'Water infrastructure coordination',
    icon: Droplets,
    accentColor: 'cyan'
  },
  {
    id: 'CURRENT_KEB',
    name: 'Power Grid / KEB Agent',
    defaultRole: 'Electricity infrastructure coordination',
    icon: Zap,
    accentColor: 'amber'
  }
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected agent for "View Details" modal
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgent | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sumData, actData, agentList] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getDashboardActivity(),
        api.getSpecializedAgents()
      ]);

      if (sumData.status === 'fulfilled') {
        setSummary(sumData.value);
      }
      if (actData.status === 'fulfilled') {
        setRecentIncidents(actData.value.recentIncidents || []);
        setRecentAudits(actData.value.recentAudits || []);
      }
      if (agentList.status === 'fulfilled') {
        setAgents(agentList.value || []);
        setAgentsLoaded(true);
      } else {
        setAgentsLoaded(false);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Unavailable';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleExecuteAction = async (agentId: string, actionId: string) => {
    try {
      setExecutingActionId(actionId);
      const res = await api.executeSpecializedAgentAction(agentId, actionId);
      setActionSuccessMsg(res.message || 'Action executed successfully.');
      loadData();
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(res.updatedAgent);
      }
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Action failed:', err);
      setActionSuccessMsg(`Failed to execute: ${err.message || 'Error'}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } finally {
      setExecutingActionId(null);
    }
  };

  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case 'Online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        );
      case 'Busy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Busy
          </span>
        );
      case 'Offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Error
          </span>
        );
      case 'Not Configured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Not Configured
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Status Unavailable
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading operations dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* SECTION A: Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous emergency dispatch & multi-agency response grid
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Report Emergency</span>
          </button>
        </div>
      </div>

      {/* SECTION B: Incident Summary (4 Cards) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Incident Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Active Incidents */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Active Incidents</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{summary?.totalActive ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Ongoing emergencies</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* 2. Critical Emergencies */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase">Critical</p>
              <p className="text-3xl font-bold text-rose-600 mt-1">{summary?.highOrCriticalPriority ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">High/Critical priority</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
          </div>

          {/* 3. Units Available */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase">Units Available</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{summary?.availableUnits ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Fleet ready for dispatch</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          {/* 4. Resolved Incidents */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Resolved</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{summary?.resolvedIncidents ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Closed incidents</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: AI Emergency Response Agents (4 Cards in 2-col desktop layout) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">AI Emergency Response Agents</h2>
            <p className="text-xs text-slate-500">Autonomous multi-agency coordination and tactical dispatch</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Open Multi-Agent Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {EXPECTED_AGENTS.map((spec) => {
            const agentData = agents.find((a) => a.id === spec.id);
            const status = agentsLoaded
              ? agentData?.status || 'Not Configured'
              : 'Status Unavailable';
            const Icon = spec.icon;

            return (
              <div
                key={spec.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon, Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{spec.name}</h3>
                        <p className="text-xs text-slate-500">{agentData?.roleDescription || spec.defaultRole}</p>
                      </div>
                    </div>
                    <div>{getAgentStatusBadge(status)}</div>
                  </div>

                  {/* Body Info */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Current Task:</span>
                      <span className="text-slate-800 text-right truncate">
                        {agentData?.currentTask || 'Standing by - Ready for emergency intake'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Assigned Incident:</span>
                      {agentData?.assignedIncidentId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/incidents/${agentData.assignedIncidentId}`)}
                          className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{agentData.assignedIncidentId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Last Updated:</span>
                      <span className="text-slate-500">
                        {agentData?.lastUpdated ? getRelativeTime(agentData.lastUpdated) : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Specialized Directives Ready</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (agentData) {
                        setSelectedAgent(agentData);
                      } else {
                        // Create basic structure for view
                        setSelectedAgent({
                          id: spec.id,
                          name: spec.name,
                          code: spec.id.replace('_', '-'),
                          sector: spec.defaultRole,
                          roleDescription: spec.defaultRole,
                          description: spec.defaultRole,
                          status: 'Not Configured',
                          currentTask: null,
                          liveAssessment: 'Agent is not currently registered or telemetry feed is offline.',
                          actions: []
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION D: Recent Incidents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Incidents</h2>
            <p className="text-xs text-slate-500">Latest emergencies reported into the system</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No incidents reported</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The emergency incident queue is currently empty. All sectors are nominal and monitored.
            </p>
            <button
              type="button"
              onClick={() => navigate('/report')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Report First Incident</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{inc.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">{inc.title}</td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={inc.category} />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={inc.priority} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{inc.location.address}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {getRelativeTime(inc.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION E: Recent System Activity (Real Audit Log) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
          <p className="text-xs text-slate-500">Verified system and operator audit events</p>
        </div>

        {recentAudits.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No recent activity recorded
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {recentAudits.map((audit) => (
              <div key={audit.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{audit.action}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{audit.entityType} {audit.entityId}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{audit.details}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      By {audit.userEmail} ({audit.userRole})
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap font-mono">
                  {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Details In-Dashboard Modal for Agents */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedAgent.name}</h3>
                  <p className="text-xs text-slate-500">{selectedAgent.roleDescription}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {actionSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Status and Task Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 font-medium block">Current Status</span>
                  <div className="mt-1">{getAgentStatusBadge(selectedAgent.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Assigned Incident</span>
                  <div className="mt-1 font-semibold text-slate-900">
                    {selectedAgent.assignedIncidentId ? (
                      <span className="text-blue-600">{selectedAgent.assignedIncidentId}</span>
                    ) : (
                      'None'
                    )}
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium block">Active Directive / Task</span>
                  <p className="mt-0.5 text-slate-800 font-medium">
                    {selectedAgent.currentTask || 'Agent is currently idle in standby status.'}
                  </p>
                </div>
              </div>

              {/* Assessment */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1.5">
                  Live Assessment & Tactical Log
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                  {selectedAgent.liveAssessment}
                </div>
              </div>

              {/* Available Actions */}
              {selectedAgent.actions && selectedAgent.actions.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                    Available Intervention Directives
                  </h4>
                  <div className="space-y-2">
                    {selectedAgent.actions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 hover:border-blue-300 transition"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{act.label}</p>
                          <p className="text-[11px] text-slate-500">{act.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={executingActionId === act.id}
                          onClick={() => handleExecuteAction(selectedAgent.id, act.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shrink-0 disabled:opacity-50"
                        >
                          {executingActionId === act.id ? 'Executing...' : 'Trigger'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedAgent(null);
                  navigate('/agents');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Full Agent Control Center</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
