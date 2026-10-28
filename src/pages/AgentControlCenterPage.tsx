import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  AgentRun,
  Incident,
  SpecializedAgent,
  SpecializedAgentId,
  MultiAgentConsensusMessage
} from '../types';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Radio,
  Check,
  Shield,
  ShieldAlert,
  HeartPulse,
  Droplets,
  Zap,
  Sparkles,
  CheckCheck,
  Flame,
  ArrowRight,
  Send
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AgentControlCenterPage: React.FC = () => {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Specialized Agents State
  const [specializedAgents, setSpecializedAgents] = useState<SpecializedAgent[]>([]);
  const [activeTab, setActiveTab] = useState<'AGENTS' | 'CONSENSUS' | 'PIPELINE'>('AGENTS');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [consensusMessages, setConsensusMessages] = useState<MultiAgentConsensusMessage[]>([]);
  const [isRunningConsensus, setIsRunningConsensus] = useState(false);
  const [filterAgentId, setFilterAgentId] = useState<SpecializedAgentId | 'ALL'>('ALL');

  const loadData = async () => {
    try {
      const [incRes] = await Promise.all([
        api.getIncidents({ limit: 50 })
      ]);
      setIncidents(incRes.incidents);
      const incId = selectedIncidentId || (incRes.incidents.length > 0 ? incRes.incidents[0].id : '');
      if (incId && !selectedIncidentId) {
        setSelectedIncidentId(incId);
      }

      // Fetch specialized agents
      const agents = await api.getSpecializedAgents(incId);
      setSpecializedAgents(agents);

      // Fetch consensus dialogue
      if (incId) {
        const cRes = await api.getSpecializedConsensus(incId);
        setConsensusMessages(cRes.consensus);

        const runsData = await api.getAgentRuns(incId);
        setRuns(runsData);
        if (runsData.length > 0 && !selectedRun) {
          const details = await api.getAgentRunDetails(runsData[0].id);
          setSelectedRun(details);
        }
      }
    } catch (err) {
      console.error('Failed loading agent data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedIncidentId]);

  const handleSelectIncident = async (incId: string) => {
    setSelectedIncidentId(incId);
    try {
      const [agents, cRes, runsData] = await Promise.all([
        api.getSpecializedAgents(incId),
        api.getSpecializedConsensus(incId),
        api.getAgentRuns(incId)
      ]);
      setSpecializedAgents(agents);
      setConsensusMessages(cRes.consensus);
      setRuns(runsData);
      if (runsData.length > 0) {
        const details = await api.getAgentRunDetails(runsData[0].id);
        setSelectedRun(details);
      } else {
        setSelectedRun(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const details = await api.getAgentRunDetails(runId);
      setSelectedRun(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunWorkflow = async () => {
    if (!selectedIncidentId) return;
    setIsRunningWorkflow(true);
    try {
      const newRun = await api.runAnalysis(selectedIncidentId);
      const runsData = await api.getAgentRuns(selectedIncidentId);
      setRuns(runsData);
      const details = await api.getAgentRunDetails(newRun.id);
      setSelectedRun(details);

      // Refresh specialized agents and consensus
      const [agents, cRes] = await Promise.all([
        api.getSpecializedAgents(selectedIncidentId),
        api.getSpecializedConsensus(selectedIncidentId)
      ]);
      setSpecializedAgents(agents);
      setConsensusMessages(cRes.consensus);
    } catch (err: any) {
      alert(err.message || 'Workflow execution error');
    } finally {
      setIsRunningWorkflow(false);
    }
  };

  const handleExecuteAction = async (agentId: SpecializedAgentId, actionId: string) => {
    setExecutingActionId(`${agentId}:${actionId}`);
    try {
      const res = await api.executeSpecializedAgentAction(agentId, actionId, selectedIncidentId);
      setActionSuccessMessage(res.message);
      // Update local state
      setSpecializedAgents((prev) =>
        prev.map((a) => (a.id === agentId ? res.updatedAgent : a))
      );
      setTimeout(() => {
        setActionSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Action trigger failed');
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleRunConsensusSimulation = async () => {
    if (!selectedIncidentId) return;
    setIsRunningConsensus(true);
    try {
      const cRes = await api.getSpecializedConsensus(selectedIncidentId);
      setConsensusMessages(cRes.consensus);
      const agents = await api.getSpecializedAgents(selectedIncidentId);
      setSpecializedAgents(agents);
    } catch (err: any) {
      alert(err.message || 'Consensus generation failed');
    } finally {
      setIsRunningConsensus(false);
    }
  };

  const handleRetryRun = async (runId: string) => {
    setIsRunningWorkflow(true);
    try {
      const newRun = await api.retryAgentRun(runId);
      const runsData = await api.getAgentRuns(selectedIncidentId);
      setRuns(runsData);
      const details = await api.getAgentRunDetails(newRun.id);
      setSelectedRun(details);
    } catch (err: any) {
      alert(err.message || 'Workflow retry error');
    } finally {
      setIsRunningWorkflow(false);
    }
  };

  const handleCopyJson = () => {
    if (!selectedRun?.structuredOutput) return;
    navigator.clipboard.writeText(JSON.stringify(selectedRun.structuredOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Pipeline Stepper Node definitions
  const pipelineNodes = [
    { step: 1, name: 'Validation Engine', role: 'INTAKE VALIDATION', stateKey: 'VALIDATING', desc: 'Validates mandatory incident payload and GPS coordinates schema' },
    { step: 2, name: 'Incident Analysis Agent', role: 'FACTS & HAZARDS', stateKey: 'ANALYZING', desc: 'Extracts casualties, entrapped occupants, flammable materials, and flags gaps' },
    { step: 3, name: 'Priority Assessment Agent', role: 'SEVERITY SCORING', stateKey: 'ASSESSING_PRIORITY', desc: 'Computes multi-factor triage score (Life Danger, Casualty, Hazard Class)' },
    { step: 4, name: 'Resource Coordination Agent', role: 'FLEET MATCHING', stateKey: 'CHECKING_RESOURCES', desc: 'Evaluates unit availability, calculates distance, and identifies allocation conflicts' },
    { step: 5, name: 'Route Planning Agent', role: 'CORRIDOR ROUTING', stateKey: 'PLANNING_ROUTE', desc: 'Executes Dijkstra graph algorithm on metropolitan road network' },
    { step: 6, name: 'Communication Agent', role: 'DISPATCH NOTIFICATIONS', stateKey: 'PREPARING_NOTIFICATIONS', desc: 'Dispatches operational notifications to operator consoles and reporter feeds' },
    { step: 7, name: 'Multi-Agency Tactical Grid Engine', role: 'CROSS-DOMAIN CONSENSUS', stateKey: 'AWAITING_OPERATOR_APPROVAL', desc: 'Synchronizes Police, EMS, Water Hydro, and Current/KEB Power Grid protocols' }
  ];

  const getAgentTheme = (id: SpecializedAgentId) => {
    switch (id) {
      case 'POLICE_TACTICAL':
        return {
          border: 'border-cyan-500/40 hover:border-cyan-400',
          bg: 'bg-cyan-950/20',
          badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
          iconColor: 'text-cyan-400',
          accentBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]',
          Icon: ShieldAlert
        };
      case 'HOSPITAL_EMS':
        return {
          border: 'border-rose-500/40 hover:border-rose-400',
          bg: 'bg-rose-950/20',
          badgeBg: 'bg-rose-950 text-rose-300 border-rose-500/50',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
          iconColor: 'text-rose-400',
          accentBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]',
          Icon: HeartPulse
        };
      case 'WATER_HYDRO':
        return {
          border: 'border-teal-500/40 hover:border-teal-400',
          bg: 'bg-teal-950/20',
          badgeBg: 'bg-teal-950 text-teal-300 border-teal-500/50',
          glow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]',
          iconColor: 'text-teal-400',
          accentBtn: 'bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.4)]',
          Icon: Droplets
        };
      case 'CURRENT_KEB':
        return {
          border: 'border-amber-500/40 hover:border-amber-400',
          bg: 'bg-amber-950/20',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/50',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          iconColor: 'text-amber-400',
          accentBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]',
          Icon: Zap
        };
    }
  };

  const currentIncident = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Header */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <Cpu className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight font-mono">
                  MULTI-AGENT CENTER
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  4/4 SPECIALIZED AGENTS ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Police Tactical • Hospital & EMS • Water Supply & Hydro • Current / KEB Power Grid
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Incident Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Target Incident:</span>
            <select
              value={selectedIncidentId}
              onChange={(e) => handleSelectIncident(e.target.value)}
              className="text-xs bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id} className="bg-slate-950 text-slate-200">
                  {inc.id}: {inc.title.slice(0, 26)}...
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunWorkflow}
            disabled={isRunningWorkflow || !selectedIncidentId}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/40 transition disabled:opacity-50 whitespace-nowrap"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningWorkflow ? 'animate-spin' : ''}`} />
            <span>{isRunningWorkflow ? 'ORCHESTRATING...' : 'EXECUTE WORKFLOW'}</span>
          </button>
        </div>
      </div>

      {/* Action Success Toast Banner */}
      {actionSuccessMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 p-3.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-200">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <strong className="text-emerald-300">TACTICAL DIRECTIVE CONFIRMED:</strong>
            <span>{actionSuccessMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
            TELEMETRY LIVE
          </span>
        </div>
      )}

      {/* Navigation Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('AGENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'AGENTS'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>4 SPECIALIZED AGENTS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300">
              4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONSENSUS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'CONSENSUS'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>CROSS-DOMAIN CONSENSUS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
              SYNCHRONIZED
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeTab === 'PIPELINE'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>PIPELINE TRACE & LOGS</span>
          </button>
        </div>

        {activeTab === 'AGENTS' && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 text-[11px]">Filter:</span>
            {(['ALL', 'POLICE_TACTICAL', 'HOSPITAL_EMS', 'WATER_HYDRO', 'CURRENT_KEB'] as const).map((fid) => (
              <button
                key={fid}
                type="button"
                onClick={() => setFilterAgentId(fid)}
                className={`px-2 py-1 rounded text-[10px] transition ${
                  filterAgentId === fid
                    ? 'bg-slate-800 text-slate-100 border border-slate-600 font-bold'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900'
                }`}
              >
                {fid === 'ALL'
                  ? 'All 4 Agents'
                  : fid === 'POLICE_TACTICAL'
                  ? 'Rakshak AI'
                  : fid === 'HOSPITAL_EMS'
                  ? 'Jeevan AI'
                  : fid === 'WATER_HYDRO'
                  ? 'JalRakshak AI'
                  : 'Shakti AI'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: 4 SPECIALIZED AGENTS GRID                         */}
      {/* ======================================================== */}
      {activeTab === 'AGENTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {specializedAgents
              .filter((agent) => filterAgentId === 'ALL' || agent.id === filterAgentId)
              .map((agent) => {
                const theme = getAgentTheme(agent.id);
                const IconComponent = theme.Icon;
                return (
                  <div
                    key={agent.id}
                    className={`bg-slate-900/85 backdrop-blur-md rounded-xl border ${theme.border} ${theme.glow} p-5 space-y-4 transition flex flex-col justify-between`}
                  >
                    <div>
                      {/* Agent Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${theme.bg} border ${theme.border} flex items-center justify-center shrink-0`}>
                            <IconComponent className={`w-5 h-5 ${theme.iconColor}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-100 font-mono text-sm tracking-tight">
                                {agent.name}
                              </h3>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${theme.badgeBg}`}>
                                {agent.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-sans mt-0.5">{agent.sector}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {agent.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {agent.assignedIncidentId ? `Assigned: ${agent.assignedIncidentId}` : 'Standby Monitoring'}
                          </p>
                        </div>
                      </div>

                      {/* Active Task & Assignment */}
                      <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-semibold text-slate-300">Active Task</span>
                          <span className="text-slate-400">{agent.lastUpdated ? new Date(agent.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nominal'}</span>
                        </div>
                        <p className="text-slate-200 text-xs">
                          {agent.currentTask || 'Standing by - Ready for emergency dispatch.'}
                        </p>
                      </div>

                      {/* Live Autonomous Assessment Box */}
                      <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            Live Assessment & Log
                          </span>
                          <span className="text-slate-400 font-mono">
                            {currentIncident ? currentIncident.id : 'SECTOR GRID'}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {agent.liveAssessment}
                        </p>
                      </div>
                    </div>

                    {/* Triggerable Operational Directives / Actions */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
                        <span>Autonomous Directives ({agent.actions.length})</span>
                        <span className="text-[9px] text-blue-400 font-normal">OPERATOR AUTHORIZED</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {agent.actions.map((act) => {
                          const isExecuting = executingActionId === `${agent.id}:${act.id}`;
                          const isDone = act.status === 'COMPLETED';
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => handleExecuteAction(agent.id, act.id)}
                              disabled={isExecuting}
                              className={`p-2 rounded-lg border text-left font-mono text-[11px] transition flex flex-col justify-between ${
                                isDone
                                  ? 'bg-slate-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold truncate text-[11px]">{act.label}</span>
                                {isExecuting ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400 shrink-0 ml-1" />
                                ) : isDone ? (
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
                                ) : (
                                  <Send className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 line-clamp-1 font-sans">{act.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Quick Cross-Domain Synergy Indicator */}
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">
                Autonomous Cross-Domain Lockout Status:
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                ACTIVE COUPLING (POLICE + EMS + HYDRO + CURRENT/KEB)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('CONSENSUS')}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold underline-offset-4 hover:underline"
            >
              <span>View Multi-Agent Deliberation Protocol</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MULTI-AGENT DELIBERATION & CONSENSUS PROTOCOL     */}
      {/* ======================================================== */}
      {activeTab === 'CONSENSUS' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                    AUTONOMOUS MULTI-AGENT CONSENSUS PROTOCOL
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Real-time synchronization matrix ensuring zero operational contradictions between power grid de-energization, fire hydrant surge, police cordon, and trauma bed triage.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunConsensusSimulation}
                disabled={isRunningConsensus || !selectedIncidentId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningConsensus ? 'animate-spin' : ''}`} />
                <span>{isRunningConsensus ? 'CALCULATING CONSENSUS...' : 'RE-SYNC CONSENSUS'}</span>
              </button>
            </div>

            {/* Inter-Agent Agreement Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-amber-400 font-bold">CURRENT / KEB GRID</p>
                  <p className="text-[11px] text-slate-200 mt-0.5">Line De-energization</p>
                </div>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-cyan-400 font-bold">POLICE TACTICAL</p>
                  <p className="text-[11px] text-slate-200 mt-0.5">450m Perimeter Cordon</p>
                </div>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-teal-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-teal-400 font-bold">WATER & HYDRO GRID</p>
                  <p className="text-[11px] text-slate-200 mt-0.5">Hydrant Pressure 85 PSI</p>
                </div>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-rose-400 font-bold">HOSPITAL & EMS</p>
                  <p className="text-[11px] text-slate-200 mt-0.5">Trauma Bays Locked</p>
                </div>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Live Deliberation Stream */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Inter-Agent Consensus Transcript</span>
                <span className="text-[10px] text-slate-500 font-normal">({consensusMessages.length} exchanges)</span>
              </p>

              <div className="space-y-2.5">
                {consensusMessages.map((msg, idx) => {
                  const theme = getAgentTheme(msg.agentId);
                  const Icon = theme.Icon;
                  return (
                    <div
                      key={msg.id || idx}
                      className={`p-3.5 rounded-lg bg-slate-950 border ${theme.border} text-xs font-mono space-y-1.5 transition`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                          <span className="font-bold text-slate-200">{msg.agentName}</span>
                          <span className={`text-[10px] px-1 rounded border font-semibold ${theme.badgeBg}`}>
                            {msg.code}
                          </span>
                          <span className="text-[10px] text-blue-400 bg-blue-950 px-1.5 py-0.2 rounded border border-blue-600/40 font-bold">
                            PHASE: {msg.phase}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed pl-5">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SEQUENTIAL PIPELINE EXECUTION GRAPH & RAW TELEMETRY */}
      {/* ======================================================== */}
      {activeTab === 'PIPELINE' && (
        <div className="space-y-6">
          {/* Interactive 7-Node Stepper */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100 uppercase tracking-wider">
                  Autonomous Pipeline Execution Graph (7 Stages)
                </h3>
              </div>
              {selectedRun && (
                <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                  <span>ACTIVE RUN:</span>
                  <strong className="text-blue-400">{selectedRun.id}</strong>
                  <span>({selectedRun.durationMs}ms latency)</span>
                </div>
              )}
            </div>

            {/* Horizontal Node Stepper */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2.5">
              {pipelineNodes.map((node) => {
                const event = selectedRun?.events?.find(
                  (e) => e.agentName.toLowerCase().includes(node.name.toLowerCase()) || e.stepOrder === node.step
                );
                const isCompleted = selectedRun?.status === 'COMPLETED' || event?.status === 'COMPLETED';
                const isRunning = isRunningWorkflow && selectedRun?.workflowState === node.stateKey;

                return (
                  <div
                    key={node.step}
                    className={`p-3 rounded-lg border text-xs font-mono transition-all duration-200 flex flex-col justify-between ${
                      isRunning
                        ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-1 ring-blue-500/50'
                        : isCompleted
                        ? 'bg-slate-950 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="w-5 h-5 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300">
                          {node.step}
                        </span>
                        {event ? (
                          <span className="text-[10px] text-emerald-400 font-semibold px-1 bg-emerald-950 rounded border border-emerald-800/60">
                            {event.durationMs}ms
                          </span>
                        ) : isRunning ? (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                        ) : null}
                      </div>
                      <p className="font-bold text-slate-200 text-[11px] leading-tight">{node.name}</p>
                      <p className="text-[9px] text-blue-400 uppercase mt-0.5 tracking-wider">{node.role}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-sans">
                      {event ? event.outputSummary.slice(0, 52) + '...' : node.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Runs & Event Trace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Pipeline Runs ({runs.length})
                </h3>
                <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-600/40">
                  {selectedIncidentId}
                </span>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {runs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center font-mono">
                    No runs logged for this incident. Click "EXECUTE WORKFLOW" above.
                  </p>
                ) : (
                  runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRun(r.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                        selectedRun?.id === r.id
                          ? 'border-blue-500 bg-blue-950/40 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono mb-1">
                        <strong className="text-slate-100">{r.id}</strong>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : r.status === 'RUNNING'
                              ? 'bg-blue-950 text-blue-300 border border-blue-500/40 animate-pulse'
                              : 'bg-red-950 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>State: {r.workflowState}</span>
                        <span className="text-slate-500">{r.durationMs}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedRun ? (
                <>
                  <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                          Step Trace Log: {selectedRun.id}
                        </h3>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        Duration: <strong className="text-emerald-400">{selectedRun.durationMs}ms</strong>
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedRun.events && selectedRun.events.length > 0 ? (
                        selectedRun.events.map((evt, idx) => (
                          <div
                            key={evt.id || idx}
                            className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1 font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                                  {evt.stepOrder}
                                </span>
                                <span>{evt.agentName}</span>
                              </span>
                              <span className="text-[10px] text-emerald-400">{evt.durationMs}ms</span>
                            </div>
                            <p className="text-slate-400 pl-7 text-[11px] font-sans">{evt.inputSummary}</p>
                            <p className="text-slate-200 font-semibold pl-7 text-[11px] font-sans">{evt.outputSummary}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 font-mono">No event trace captured.</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
                      <Link
                        to={`/incidents/${selectedRun.incidentId}`}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <span>View Incident Workspace</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleRetryRun(selectedRun.id)}
                        disabled={isRunningWorkflow}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Safe Workflow Retry</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Structured JSON Drawer */}
                  <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-xl overflow-hidden">
                    <div
                      onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
                      className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold">STRUCTURED JSON TELEMETRY DRAWER</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyJson();
                          }}
                          className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono flex items-center gap-1 border border-slate-700"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        {isTelemetryOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isTelemetryOpen && (
                      <pre className="p-4 text-[11px] font-mono text-emerald-400 bg-slate-950 overflow-x-auto max-h-80 leading-relaxed">
                        {JSON.stringify(selectedRun.structuredOutput, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-slate-900/80 p-12 rounded-xl border border-slate-800 text-center text-xs text-slate-500 font-mono">
                  Select or execute a multi-agent run to view telemetry.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
