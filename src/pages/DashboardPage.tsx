import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  Incident,
  Resource,
  DashboardSummary,
  SpecializedAgent,
  SpecializedAgentId,
  SpecializedAgentChatMessage,
  AgentStatusType,
  GridEfficiencySummary,
  AICommandResponse
} from '../types';
import { AgentSceneBackdrop } from '../components/common/AgentSceneBackdrop';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  Shield,
  HeartPulse,
  Droplets,
  Zap,
  RefreshCw,
  FilePlus2,
  ArrowLeft,
  ArrowRight,
  Send,
  Trash2,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Activity,
  MapPin,
  Ambulance,
  Terminal,
  RotateCcw,
  Clock,
  Check
} from 'lucide-react';

interface AgentConfig {
  id: SpecializedAgentId;
  codeLabel: string;
  name: string;
  shortName: string;
  oneLineDescription: string;
  capabilities: string[];
  icon: React.ComponentType<{ className?: string }>;
  accentBadge: string;
  accentButton: string;
  chartColor: string;
  resourceTypes: string[];
  suggestedPrompts: string[];
}

const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'POLICE_TACTICAL',
    codeLabel: 'AGENT 01',
    name: 'Police Tactical AI',
    shortName: 'Police Tactical',
    oneLineDescription: 'Incident assessment, perimeter security, traffic coordination, and tactical dispatch.',
    capabilities: [
      'Incident assessment & priority classification',
      'Police response recommendations',
      'Perimeter security & traffic coordination',
      'Incident location & response status tracking'
    ],
    icon: Shield,
    accentBadge: 'text-blue-300 border-blue-400/40 bg-blue-950/60',
    accentButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    chartColor: '#2563EB',
    resourceTypes: ['POLICE_PATROL'],
    suggestedPrompts: [
      'Analyze this security incident.',
      'Suggest public safety precautions.',
      'Review this incident report.'
    ]
  },
  {
    id: 'HOSPITAL_EMS',
    codeLabel: 'AGENT 02',
    name: 'Hospital & EMS AI',
    shortName: 'Hospital & EMS',
    oneLineDescription: 'Emergency severity triage, ambulance dispatch recommendations, and hospital coordination.',
    capabilities: [
      'Emergency severity & casualty assessment',
      'Ambulance dispatch recommendations',
      'Hospital emergency trauma coordination',
      'Patient transport & staging status'
    ],
    icon: HeartPulse,
    accentBadge: 'text-rose-300 border-rose-400/40 bg-rose-950/60',
    accentButton: 'bg-rose-600 hover:bg-rose-700 text-white',
    chartColor: '#E11D48',
    resourceTypes: ['AMBULANCE', 'RESCUE_TEAM'],
    suggestedPrompts: [
      'Summarize this medical emergency.',
      'Identify missing casualty information.',
      'Suggest medical coordination steps.'
    ]
  },
  {
    id: 'WATER_HYDRO',
    codeLabel: 'AGENT 03',
    name: 'Water Supply & Hydro AI',
    shortName: 'Water & Hydro',
    oneLineDescription: 'Water supply disruption monitoring, pipeline assessment, and hydro crew coordination.',
    capabilities: [
      'Water supply disruption monitoring',
      'Pipeline & infrastructure incident assessment',
      'Water shortage, hydrant & leakage reports',
      'Repair team coordination recommendations'
    ],
    icon: Droplets,
    accentBadge: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60',
    accentButton: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    chartColor: '#0891B2',
    resourceTypes: ['FIRE_UNIT', 'RESCUE_TEAM'],
    suggestedPrompts: [
      'Analyze this water infrastructure incident.',
      'Identify possible water supply risks.',
      'Suggest inspection priorities.'
    ]
  },
  {
    id: 'CURRENT_KEB',
    codeLabel: 'AGENT 04',
    name: 'Power Grid / KEB AI',
    shortName: 'Power Grid / KEB',
    oneLineDescription: 'Power outage analysis, electrical hazard assessment, and substation feeder tracking.',
    capabilities: [
      'Power outage reporting & grid analysis',
      'Electrical hazard & downed line assessment',
      'Feeder & substation incident tracking',
      'Maintenance team coordination steps'
    ],
    icon: Zap,
    accentBadge: 'text-amber-300 border-amber-400/40 bg-amber-950/60',
    accentButton: 'bg-amber-600 hover:bg-amber-700 text-white',
    chartColor: '#D97706',
    resourceTypes: ['GENERAL_SUPPORT', 'FIRE_UNIT'],
    suggestedPrompts: [
      'Analyze this electrical infrastructure incident.',
      'Identify reported electrical hazards.',
      'Suggest coordination steps.'
    ]
  }
];

const QUICK_AI_COMMANDS = [
  'Show active police incidents.',
  'Find nearby hospitals.',
  'Report a water supply disruption.',
  'Check reported power outages.',
  'Summarize high-priority incidents.'
];

const CHAT_STORAGE_KEY = 'aegis_agent_conversations_v1';

function loadStoredConversations(): Record<SpecializedAgentId, SpecializedAgentChatMessage[]> {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        POLICE_TACTICAL: Array.isArray(parsed.POLICE_TACTICAL) ? parsed.POLICE_TACTICAL : [],
        HOSPITAL_EMS: Array.isArray(parsed.HOSPITAL_EMS) ? parsed.HOSPITAL_EMS : [],
        WATER_HYDRO: Array.isArray(parsed.WATER_HYDRO) ? parsed.WATER_HYDRO : [],
        CURRENT_KEB: Array.isArray(parsed.CURRENT_KEB) ? parsed.CURRENT_KEB : []
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    POLICE_TACTICAL: [],
    HOSPITAL_EMS: [],
    WATER_HYDRO: [],
    CURRENT_KEB: []
  };
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { agentId: routeAgentId } = useParams<{ agentId?: string }>();

  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [efficiency, setEfficiency] = useState<GridEfficiencySummary | null>(null);
  const [connectionState, setConnectionState] = useState<'Online' | 'Offline' | 'Status Unavailable'>('Status Unavailable');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Global AI Command System State
  const [commandInput, setCommandInput] = useState('');
  const [lastSubmittedCommand, setLastSubmittedCommand] = useState('');
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [commandResult, setCommandResult] = useState<AICommandResponse | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  // Active dedicated agent view state
  const [activeAgentId, setActiveAgentId] = useState<SpecializedAgentId | null>(null);

  // Separate conversation history per agent
  const [conversations, setConversations] = useState<Record<SpecializedAgentId, SpecializedAgentChatMessage[]>>(
    loadStoredConversations
  );
  const [inputText, setInputText] = useState('');
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);

  // Directive Execution State inside dedicated agent view
  const [executingDirectiveId, setExecutingDirectiveId] = useState<string | null>(null);
  const [directiveFeedback, setDirectiveFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync route param with activeAgentId
  useEffect(() => {
    if (routeAgentId) {
      const normalized = routeAgentId.toUpperCase() as SpecializedAgentId;
      const exists = AGENT_CONFIGS.some((c) => c.id === normalized);
      if (exists) {
        setActiveAgentId(normalized);
        setChatError(null);
        setDirectiveFeedback(null);
      } else {
        setActiveAgentId(null);
        navigate('/', { replace: true });
      }
    } else {
      setActiveAgentId(null);
    }
  }, [routeAgentId, navigate]);

  // Persist conversations in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // ignore storage errors
    }
  }, [conversations]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (activeAgentId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, activeAgentId, isSending]);

  const loadCommandCenterData = async (currentIncidentId?: string) => {
    try {
      const targetIncident = currentIncidentId !== undefined ? currentIncidentId : selectedIncidentId;
      const [incRes, agentList, metricsRes, sumRes, resList] = await Promise.allSettled([
        api.getIncidents({ limit: 50 }),
        api.getSpecializedAgents(targetIncident || undefined),
        api.getGridEfficiencyMetrics(),
        api.getDashboardSummary(),
        api.getResources()
      ]);

      if (incRes.status === 'fulfilled') {
        const list = incRes.value.incidents || [];
        setIncidents(list);
        if (!selectedIncidentId && list.length > 0) {
          setSelectedIncidentId(list[0].id);
        }
      }

      if (agentList.status === 'fulfilled') {
        setAgents(agentList.value || []);
        setConnectionState('Online');
      } else {
        setConnectionState('Offline');
      }

      if (metricsRes.status === 'fulfilled') {
        setEfficiency(metricsRes.value);
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }

      if (resList.status === 'fulfilled') {
        setResources(resList.value || []);
      }
    } catch {
      setConnectionState('Offline');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCommandCenterData();
  }, []);

  const handleOpenAgent = (id: SpecializedAgentId) => {
    setChatError(null);
    setProviderNotice(null);
    setInputText('');
    setLastFailedPrompt(null);
    navigate(`/agents/${id}`);
  };

  const handleBackToCommandCenter = () => {
    setChatError(null);
    setProviderNotice(null);
    loadCommandCenterData();
    navigate('/');
  };

  const handleIncidentChange = async (newIncidentId: string) => {
    setSelectedIncidentId(newIncidentId);
    try {
      const [updatedAgents, updatedMetrics] = await Promise.all([
        api.getSpecializedAgents(newIncidentId || undefined),
        api.getGridEfficiencyMetrics()
      ]);
      setAgents(updatedAgents);
      setEfficiency(updatedMetrics);
    } catch {
      // ignore
    }
  };

  const handleExecuteAICommand = async (presetCommand?: string) => {
    const cmd = (presetCommand !== undefined ? presetCommand : commandInput).trim();
    if (!cmd || isRunningCommand) return;

    if (presetCommand !== undefined) {
      setCommandInput(presetCommand);
    }
    setLastSubmittedCommand(cmd);
    setCommandError(null);
    setIsRunningCommand(true);

    try {
      const result = await api.executeAICommand(cmd, selectedIncidentId || null);
      setCommandResult(result);
      // Also append the exchange to that routed agent's conversation history so opening that agent preserves context
      const userEntry: SpecializedAgentChatMessage = {
        id: `CMD-U-${Date.now()}`,
        role: 'user',
        content: cmd,
        timestamp: new Date().toISOString(),
        incidentId: selectedIncidentId || null
      };
      const agentEntry: SpecializedAgentChatMessage = {
        id: `CMD-A-${Date.now() + 1}`,
        role: 'agent',
        content: result.summary,
        timestamp: result.timestamp,
        incidentId: selectedIncidentId || null
      };
      setConversations((prev) => ({
        ...prev,
        [result.routedAgentId]: [...(prev[result.routedAgentId] || []), userEntry, agentEntry]
      }));
      loadCommandCenterData();
    } catch (err: any) {
      setCommandError(err?.message || 'AI command routing service unavailable. Please retry.');
    } finally {
      setIsRunningCommand(false);
    }
  };

  const handleRunReadinessBenchmark = async () => {
    if (isBenchmarking) return;
    setIsBenchmarking(true);
    try {
      const updatedMetrics = await api.runGridBenchmark(selectedIncidentId || null);
      setEfficiency(updatedMetrics);
      const updatedAgents = await api.getSpecializedAgents(selectedIncidentId || undefined);
      setAgents(updatedAgents);
      setConnectionState('Online');
    } catch (err) {
      console.error('Failed to run grid benchmark:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleExecuteDirective = async (agentId: SpecializedAgentId, actionId: string) => {
    if (executingDirectiveId) return;
    setExecutingDirectiveId(actionId);
    setDirectiveFeedback(null);
    try {
      const res = await api.executeSpecializedAgentAction(
        agentId,
        actionId,
        selectedIncidentId || undefined
      );
      setDirectiveFeedback(res.message);
      setAgents((prev) => prev.map((a) => (a.id === agentId ? res.updatedAgent : a)));
      api.getGridEfficiencyMetrics().then(setEfficiency).catch(() => {});
    } catch (err: any) {
      setChatError(err?.message || 'Failed to execute tactical directive.');
    } finally {
      setExecutingDirectiveId(null);
    }
  };

  const handleSendMessage = async (promptOverride?: string) => {
    if (!activeAgentId || isSending) return;
    const textToSend = (promptOverride !== undefined ? promptOverride : inputText).trim();
    if (!textToSend) return;

    setChatError(null);
    setLastFailedPrompt(null);
    if (promptOverride === undefined) {
      setInputText('');
    }

    const userMsg: SpecializedAgentChatMessage = {
      id: `USR-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
      incidentId: selectedIncidentId || null
    };

    const currentHistory = conversations[activeAgentId] || [];
    const nextHistory = [...currentHistory, userMsg];

    setConversations((prev) => ({
      ...prev,
      [activeAgentId]: nextHistory
    }));

    setIsSending(true);

    try {
      const response = await api.chatWithSpecializedAgent({
        agentId: activeAgentId,
        message: textToSend,
        history: currentHistory,
        incidentId: selectedIncidentId || null
      });

      const agentMsg: SpecializedAgentChatMessage = {
        id: `AGT-${Date.now()}`,
        role: 'agent',
        content: response.reply,
        timestamp: response.timestamp || new Date().toISOString(),
        incidentId: response.incidentContext?.id || selectedIncidentId || null
      };

      setConversations((prev) => ({
        ...prev,
        [activeAgentId]: [...nextHistory, agentMsg]
      }));

      if (response.providerNotice) {
        setProviderNotice(response.providerNotice);
      } else {
        setProviderNotice(null);
      }

      if (response.updatedAgent) {
        setAgents((prev) =>
          prev.map((a) => (a.id === activeAgentId ? response.updatedAgent : a))
        );
      }

      api.getGridEfficiencyMetrics().then(setEfficiency).catch(() => {});
      setConnectionState('Online');
    } catch (err: any) {
      setLastFailedPrompt(textToSend);
      setChatError(
        err?.message || 'Unable to reach the AI agent service. Please check your connection and retry.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    if (!activeAgentId) return;
    setConversations((prev) => ({
      ...prev,
      [activeAgentId]: []
    }));
    setChatError(null);
    setLastFailedPrompt(null);
    setProviderNotice(null);
  };

  const renderStatusIndicator = (status: AgentStatusType | string, darkSurface = false) => {
    const textBase = darkSurface ? 'text-white' : 'text-slate-800';
    switch (status) {
      case 'Online':
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${darkSurface ? 'text-emerald-300' : 'text-emerald-700'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Online</span>
          </span>
        );
      case 'Offline':
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${darkSurface ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Offline</span>
          </span>
        );
      case 'Not Configured':
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${darkSurface ? 'text-amber-300' : 'text-amber-700'}`}>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Not Configured</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textBase}`}>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Status Unavailable</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading AegisAI Command Center...</p>
        </div>
      </div>
    );
  }

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;

  const chartData = AGENT_CONFIGS.map((cfg) => {
    const metric = efficiency?.agents.find((m) => m.agentId === cfg.id);
    return {
      agentId: cfg.id,
      name: cfg.shortName,
      avgResponseTimeMs: metric?.avgResponseTimeMs ?? 0,
      lastResponseTimeMs: metric?.lastResponseTimeMs ?? 0,
      completionRate: metric?.completionRate ?? 0,
      completedTasks: metric?.completedTasks ?? 0,
      totalTasks: metric?.totalTasks ?? 0,
      color: cfg.chartColor
    };
  });

  // ============================================================================
  // VIEW 2: DEDICATED INDEPENDENT AGENT INTERFACE (/agents/:agentId)
  // ============================================================================
  if (activeAgentId) {
    const config = AGENT_CONFIGS.find((c) => c.id === activeAgentId)!;
    const agentRecord = agents.find((a) => a.id === activeAgentId);
    const agentStatus: AgentStatusType =
      connectionState === 'Online'
        ? agentRecord?.status || 'Online'
        : connectionState === 'Offline'
        ? 'Offline'
        : 'Status Unavailable';
    const Icon = config.icon;
    const agentMessages = conversations[activeAgentId] || [];
    const domainResources = resources.filter((r) => config.resourceTypes.includes(r.type));

    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        {/* Large Contextual Background Hero Banner */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-lg min-h-[190px] flex flex-col justify-between">
          <AgentSceneBackdrop agentId={activeAgentId} variant="banner" />

          <div className="relative z-10 p-6 flex flex-col justify-between gap-6 h-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackToCommandCenter}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 border border-white/15 backdrop-blur-md transition whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Command Center</span>
              </button>

              <div className="flex items-center gap-3">
                {renderStatusIndicator(agentStatus, true)}
                <span className="text-slate-400" aria-hidden="true">·</span>
                <span className="text-xs font-mono text-slate-300 tabular-nums">
                  {agentRecord?.code || config.codeLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/85 border border-white/15 text-white backdrop-blur-md shrink-0">
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-wider text-blue-300">
                    <span>{config.codeLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{agentRecord?.sector || 'Autonomous Emergency Sector'}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                    {config.name}
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                    {config.oneLineDescription}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-white/15 backdrop-blur-md rounded-lg px-4 py-2.5 text-xs text-slate-200 max-w-sm">
                <span className="text-slate-400 block font-medium">Current Operational Task</span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {agentRecord?.currentTask || 'No Active Task'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Split Layout: Left 2 Cols Chat Interface, Right 1 Col Incident & Directives */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left 2 Columns: Dedicated Agent Chat Console */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[620px]">
            {/* Chat Header & Clear Button */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Dedicated {config.name} Command Channel</span>
              </div>

              <button
                type="button"
                onClick={handleClearChat}
                disabled={agentMessages.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat</span>
              </button>
            </div>

            {/* Quick Command Buttons */}
            <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-xs font-semibold text-slate-500 shrink-0">
                Quick Commands:
              </span>
              {config.suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Provider Notice or Error Banner with Retry */}
            {providerNotice && (
              <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{providerNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProviderNotice(null)}
                  className="text-amber-700 hover:underline text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {chatError && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{chatError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lastFailedPrompt && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage(lastFailedPrompt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 transition whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatError(null)}
                    className="text-rose-700 hover:underline text-xs font-semibold whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Chat Conversation History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
              {agentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{config.name} Ready</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter a command below, submit incident coordinates or observations, or click any Quick Command button above to receive domain-specific recommendations.
                  </p>
                </div>
              ) : (
                agentMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {isUser ? 'Operator' : config.name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-800 border border-slate-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-slate-600 mb-1 px-1">
                    {config.name}
                  </span>
                  <div className="bg-white text-slate-600 border border-slate-200 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Processing telemetry and generating domain assessment...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                placeholder={`Enter command or query for ${config.name}...`}
                className="flex-1 bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* Right 1 Column: Incident Context, Tactical Directives & Domain Resources */}
          <div className="space-y-5">
            {/* Active Incident Context Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Incident Context</h2>
                <button
                  type="button"
                  onClick={() => navigate('/report')}
                  className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
                >
                  + Report New
                </button>
              </div>

              {incidents.length > 0 ? (
                <div className="space-y-3">
                  <select
                    value={selectedIncidentId}
                    onChange={(e) => handleIncidentChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Incident Selected (General Inquiry)</option>
                    {incidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.id} — {inc.title} ({inc.priority})
                      </option>
                    ))}
                  </select>

                  {selectedIncident && (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-600">{selectedIncident.id}</span>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={selectedIncident.priority} size="sm" />
                          <StatusBadge status={selectedIncident.status} size="sm" />
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900">{selectedIncident.title}</p>
                      <p className="text-slate-600 line-clamp-3 leading-relaxed">
                        {selectedIncident.description}
                      </p>
                      <div className="pt-2 border-t border-slate-200/80 text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{selectedIncident.location.address}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono tabular-nums text-[11px]">
                          <span>Casualties: {selectedIncident.casualtiesCount}</span>
                          <span>{selectedIncident.location.verified ? 'GPS Verified' : 'Unverified GPS'}</span>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
                          className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Open Incident Workspace</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/map')}
                          className="text-slate-600 hover:text-slate-900 font-medium"
                        >
                          View on Map →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 space-y-2">
                  <p>No active incidents are currently logged in the database.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/report')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Report Emergency</span>
                  </button>
                </div>
              )}
            </div>

            {/* Domain Tactical Directives */}
            {agentRecord && agentRecord.actions && agentRecord.actions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                  Operator Directives
                </h2>

                {directiveFeedback && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{directiveFeedback}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {agentRecord.actions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{act.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={executingDirectiveId === act.id}
                        onClick={() => handleExecuteDirective(activeAgentId, act.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition whitespace-nowrap shrink-0 disabled:opacity-50"
                      >
                        {executingDirectiveId === act.id ? 'Running...' : 'Execute'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domain Fleet & Facility Resources */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">Sector Resources</h2>
                <button
                  type="button"
                  onClick={() => navigate('/resources')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  All Units →
                </button>
              </div>

              {domainResources.length === 0 ? (
                <p className="text-xs text-slate-500">No sector units registered.</p>
              ) : (
                <div className="space-y-2">
                  {domainResources.slice(0, 4).map((res) => (
                    <div
                      key={res.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 truncate">{res.name}</span>
                          {res.isDemo && (
                            <span className="text-[10px] font-mono text-slate-400">(Demo)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{res.address}</p>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-semibold shrink-0 ${
                          res.status === 'AVAILABLE' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: MAIN COMMAND CENTER DASHBOARD (/)
  // ============================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* SECTION 1: Command Center Header & Compact Emergency Overview */}
      <div className="bg-[#0f172a] text-white rounded-xl border border-slate-800 p-6 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                AegisAI Emergency Command Center
              </h1>
              {renderStatusIndicator(connectionState, true)}
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Autonomous multi-agent emergency coordination, real-time incident assessment, and municipal infrastructure dispatch.
            </p>
          </div>

          {/* Quick Access Navigation Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Map</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/incidents')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition whitespace-nowrap shrink-0"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Incidents</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition whitespace-nowrap shrink-0"
            >
              <Ambulance className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fleet & Resources</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                loadCommandCenterData();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/report')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Report Emergency</span>
            </button>
          </div>
        </div>

        {/* Compact Emergency Overview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/90 text-xs">
          <div>
            <span className="text-slate-400 block">Active Incidents</span>
            <span className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 block">
              {summary?.totalActive ?? incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">High / Critical Priority</span>
            <span className="text-xl font-bold text-red-400 font-mono tabular-nums mt-0.5 block">
              {summary?.highOrCriticalPriority ?? incidents.filter((i) => i.priority === 'CRITICAL' || i.priority === 'HIGH').length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Available Response Units</span>
            <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5 block">
              {summary?.availableUnits ?? resources.filter((r) => r.status === 'AVAILABLE').length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">AI Command Agents</span>
            <span className="text-xl font-bold text-blue-400 font-mono tabular-nums mt-0.5 block">
              {connectionState === 'Online'
                ? `${agents.filter((a) => a.status === 'Online').length} / 4 Online`
                : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI COMMAND SYSTEM (Natural Language Operator Router) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Command System</h2>
              <p className="text-xs text-slate-500">
                Enter an operational request to automatically route to Police, EMS, Water Hydro, or Power Grid AI
              </p>
            </div>
          </div>

          {incidents.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Context:</span>
              <select
                value={selectedIncidentId}
                onChange={(e) => handleIncidentChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Active Sectors</option>
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id}: {inc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteAICommand();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={isRunningCommand}
            placeholder='Try: "Show active police incidents." or "Check reported power outages."'
            className="flex-1 bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition"
          />
          <button
            type="submit"
            disabled={isRunningCommand || !commandInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isRunningCommand ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Routing Command...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Execute Command</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Operator Commands */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-slate-400 shrink-0">Quick Commands:</span>
          {QUICK_AI_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              disabled={isRunningCommand}
              onClick={() => handleExecuteAICommand(cmd)}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Command Error with Retry */}
        {commandError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{commandError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastSubmittedCommand && (
                <button
                  type="button"
                  onClick={() => handleExecuteAICommand(lastSubmittedCommand)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCommandError(null)}
                className="text-rose-700 hover:underline font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Command Execution Result Panel */}
        {commandResult && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600">
                  {commandResult.routedAgentCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-slate-900">{commandResult.routedAgentName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">Command: "{commandResult.command}"</span>
              </div>
              <button
                type="button"
                onClick={() => setCommandResult(null)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close Result
              </button>
            </div>

            {commandResult.providerNotice && (
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                {commandResult.providerNotice}
              </div>
            )}

            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
              {commandResult.summary}
            </div>

            {/* Suggested Next Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-600">Suggested Next Actions:</span>
                {commandResult.suggestedActions.map((act) => (
                  <button
                    key={act.route + act.label}
                    type="button"
                    onClick={() => navigate(act.route)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                  >
                    <span>{act.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: FOUR INDEPENDENT AI AGENT CARDS WITH REALISTIC BACKGROUNDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Autonomous Emergency Response Agents
            </h2>
            <p className="text-xs text-slate-500">
              Four independent domain AI units with dedicated command channels and live incident context
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {AGENT_CONFIGS.map((spec) => {
            const agentData = agents.find((a) => a.id === spec.id);
            const status: AgentStatusType =
              connectionState === 'Online'
                ? agentData?.status || 'Online'
                : connectionState === 'Offline'
                ? 'Offline'
                : 'Status Unavailable';
            const currentTask =
              agentData?.currentTask && agentData.currentTask.trim().length > 0
                ? agentData.currentTask
                : 'No Active Task';
            const Icon = spec.icon;

            return (
              <div
                key={spec.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Realistic Photographic/Architectural Header with Dark Scrim */}
                  <div className="relative h-40 overflow-hidden">
                    <AgentSceneBackdrop agentId={spec.id} variant="card" />

                    <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold tracking-wider text-blue-300">
                          {spec.codeLabel} — {agentData?.code || spec.id}
                        </span>
                        {renderStatusIndicator(status, true)}
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-900/85 border border-white/15 text-white backdrop-blur-md shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">
                            {spec.name}
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                            {spec.oneLineDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Domain Capabilities & Current Task Status */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      {spec.capabilities.map((cap) => (
                        <div key={cap} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-slate-400 font-medium block">Active Task & Status</span>
                        <span className="text-slate-800 font-semibold truncate block mt-0.5">
                          {currentTask}
                        </span>
                      </div>

                      {agentData?.assignedIncidentId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/incidents/${agentData.assignedIncidentId}`)}
                          className="text-blue-600 hover:underline font-mono font-semibold inline-flex items-center gap-1 shrink-0"
                        >
                          <span>{agentData.assignedIncidentId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick Prompt & Open Agent CTA */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 truncate">
                    {conversations[spec.id]?.length
                      ? `${conversations[spec.id].length} messages in session`
                      : 'Dedicated agent channel ready'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenAgent(spec.id)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${spec.accentButton}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Agent</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: RECENT INCIDENTS & AGENT TASK PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Emergency Incidents</h2>
                <p className="text-xs text-slate-500">
                  Verified incident reports, priority levels, and dispatch status
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/incidents')}
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>All Incidents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800">No Active Incidents Logged</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When emergencies are reported via the intake form, their priority assessments and coordinates appear here automatically.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/report')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Report Emergency</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Incident</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidents.slice(0, 6).map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                          {inc.id}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                            {inc.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {inc.location.address}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <CategoryBadge category={inc.category} />
                        </td>
                        <td className="py-3 px-4">
                          <PriorityBadge priority={inc.priority} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={inc.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="text-blue-600 font-semibold hover:underline">
                            Open →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Agent Activity & Task Progress Log (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Agent Task Activity</h2>
                <p className="text-xs text-slate-500">Live execution log across all four agents</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {!efficiency || efficiency.recentTimeline.length === 0 ? (
              <div className="py-8 text-center space-y-2.5 text-xs text-slate-500">
                <p>No agent tasks recorded in this session yet.</p>
                <p className="text-[11px] text-slate-400">
                  Execute an AI Command above, open an agent, or run a readiness check to log live task telemetry.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {efficiency.recentTimeline
                  .slice()
                  .reverse()
                  .map((item, idx) => (
                    <div key={`${item.timestamp}-${idx}`} className="py-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{item.agentName}</span>
                        <span className="font-mono tabular-nums text-[11px] text-emerald-700">
                          {item.responseTimeMs} ms
                        </span>
                      </div>
                      <p className="text-slate-600 truncate">{item.label}</p>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums block">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRunReadinessBenchmark}
            disabled={isBenchmarking}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
            <span>{isBenchmarking ? 'Running Readiness Diagnostic...' : 'Run 4-Agent Readiness Check'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 5: GRID EFFICIENCY & AGENT TELEMETRY (RECHARTS) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Grid Efficiency & Agent Telemetry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Measured response times and task completion rates from recorded agent executions
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
            <span>
              Completion: <strong className="text-slate-900">{efficiency?.overallCompletionRate ?? 0}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Mean Response:{' '}
              <strong className="text-slate-900">
                {efficiency && efficiency.totalTasks > 0 ? `${efficiency.overallAvgResponseTimeMs} ms` : '—'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Tasks: <strong className="text-slate-900">{efficiency?.totalTasks ?? 0}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Response Times */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">
                Agent Response Times (ms)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                Measured Execution Latency
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    unit=" ms"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => [`${value} ms`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="avgResponseTimeMs"
                    name="Avg Response (ms)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  >
                    {chartData.map((entry) => (
                      <Cell key={`cell-avg-${entry.agentId}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="lastResponseTimeMs"
                    name="Latest Response (ms)"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Completion Rate & Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">
                Task Completion Rate (%) & Completed Volume
              </h3>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                Completion % · Completed Tasks
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) =>
                      name === 'Completion Rate (%)' ? [`${value}%`, name] : [value, name]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="completionRate"
                    name="Completion Rate (%)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completedTasks"
                    name="Completed Tasks"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#2563EB' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
