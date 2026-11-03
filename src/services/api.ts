import {
  Incident,
  Resource,
  ResourceAssignment,
  AgentRun,
  IncidentNote,
  Notification,
  AuditLog,
  DashboardSummary,
  User,
  RouteCalculationResult,
  SpecializedAgent,
  SpecializedAgentId,
  SpecializedAgentChatMessage,
  SpecializedAgentChatResponse,
  GridEfficiencySummary,
  AICommandResponse,
  MultiAgentConsensusMessage,
  EmergencyFacility,
  UserLocationContext
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('er_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * All API calls time out instead of hanging forever. A timeout used to leave
 * pages on "Loading..." with no way out; now callers get a real error they
 * can show with a Retry button. Default 15s; callers may pass a longer
 * timeout via options (not part of the fetch spec, so it is stripped here).
 */
async function request<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, signal: callerSignal, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const headers = { ...getAuthHeaders(), ...(rest.headers || {}) };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...rest, headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError' && !callerSignal?.aborted) {
      throw new Error('Request timed out. Check your connection and retry.');
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorMsg = errorJson.message;
      else if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      // no JSON
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (data: { name: string; email: string; password: string; organization?: string; role?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Incidents
  getIncidents: (params?: { category?: string; priority?: string; status?: string; search?: string; limit?: number; offset?: number; reporterOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.reporterOnly) query.set('reporterOnly', 'true');
    return request<{ total: number; limit: number; offset: number; incidents: Incident[] }>(`/incidents?${query.toString()}`);
  },

  getIncidentById: (id: string) =>
    request<{
      incident: Incident;
      assignments: ResourceAssignment[];
      notes: IncidentNote[];
      latestAgentRun: AgentRun | null;
    }>(`/incidents/${id}`),

  createIncident: (data: Partial<Incident> & { address?: string; latitude?: number | null; longitude?: number | null; locationVerified?: boolean }) =>
    request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateIncident: (id: string, updates: Partial<Incident>) =>
    request<Incident>(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  addNote: (incidentId: string, content: string) =>
    request<IncidentNote>(`/incidents/${incidentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),

  getNotes: (incidentId: string) => request<IncidentNote[]>(`/incidents/${incidentId}/notes`),

  // Agent Workflows
  runAnalysis: (incidentId: string) =>
    request<AgentRun>(`/incidents/${incidentId}/analyze`, { method: 'POST' }),

  getAgentRuns: (incidentId: string) =>
    request<AgentRun[]>(`/incidents/${incidentId}/agent-runs`),

  getAgentRunDetails: (runId: string) =>
    request<AgentRun>(`/agent-runs/${runId}`),

  retryAgentRun: (runId: string) =>
    request<AgentRun>(`/agent-runs/${runId}/retry`, { method: 'POST' }),

  // Specialized Agents (Police, EMS, Water Hydro, Current/KEB)
  getSpecializedAgents: (incidentId?: string) => {
    const query = incidentId ? `?incidentId=${encodeURIComponent(incidentId)}` : '';
    return request<SpecializedAgent[]>(`/agents/specialized${query}`);
  },

  executeSpecializedAgentAction: (agentId: string, actionId: string, incidentId?: string) =>
    request<{ success: boolean; message: string; updatedAgent: SpecializedAgent }>('/agents/specialized/action', {
      method: 'POST',
      body: JSON.stringify({ agentId, actionId, incidentId })
    }),

  getSpecializedConsensus: (incidentId: string) =>
    request<{ incidentId: string; consensus: MultiAgentConsensusMessage[] }>('/agents/specialized/consensus', {
      method: 'POST',
      body: JSON.stringify({ incidentId })
    }),

  chatWithSpecializedAgent: (
    data: {
      agentId: SpecializedAgentId;
      message: string;
      history?: SpecializedAgentChatMessage[];
      incidentId?: string | null;
      language?: 'en' | 'hi' | 'kn';
      userLocation?: UserLocationContext | null;
    },
    signal?: AbortSignal
  ) =>
    request<SpecializedAgentChatResponse>('/agents/specialized/chat', {
      method: 'POST',
      body: JSON.stringify(data),
      signal
    }),

  sendAIChat: (
    data: {
      agentId?: SpecializedAgentId;
      message: string;
      history?: SpecializedAgentChatMessage[];
      incidentId?: string | null;
      language?: 'en' | 'hi' | 'kn';
      userLocation?: UserLocationContext | null;
    },
    signal?: AbortSignal
  ) =>
    request<SpecializedAgentChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
      signal
    }),

  getAIStatus: () =>
    request<{
      provider: string;
      model: string;
      isExternalConfigured: boolean;
      status: string;
      message: string;
      supportedLanguages: Array<{ code: 'en' | 'hi' | 'kn'; name: string; nativeName: string; speechCode: string }>;
    }>('/ai/status'),

  submitVoiceReport: (data: {
    title?: string;
    category?: string;
    description: string;
    address?: string;
    casualtiesCount?: number;
    priority?: string;
    language?: 'en' | 'hi' | 'kn';
    userLocation?: UserLocationContext | null;
    latitude?: number;
    longitude?: number;
  }) =>
    request<{ success: boolean; incidentId: string; incident: Incident }>('/ai/voice-report', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getGridEfficiencyMetrics: () =>
    request<GridEfficiencySummary>('/agents/specialized/metrics'),

  runGridBenchmark: (incidentId?: string | null) =>
    request<GridEfficiencySummary>('/agents/specialized/benchmark', {
      method: 'POST',
      body: JSON.stringify({ incidentId: incidentId || null })
    }),

  executeAICommand: (
    command: string,
    incidentId?: string | null,
    userLocation?: UserLocationContext | null,
    language?: 'en' | 'hi' | 'kn'
  ) =>
    request<AICommandResponse>('/agents/command', {
      method: 'POST',
      body: JSON.stringify({
        command,
        incidentId: incidentId || null,
        userLocation: userLocation || null,
        language: language || 'en'
      })
    }),

  // Verified Facilities
  getFacilities: (params?: { type?: string; agentDomain?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.agentDomain) query.set('agentDomain', params.agentDomain);
    const qs = query.toString();
    return request<EmergencyFacility[]>(`/facilities${qs ? `?${qs}` : ''}`);
  },

  // Resources
  getResources: (params?: { type?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    return request<Resource[]>(`/resources?${query.toString()}`);
  },

  createResource: (data: Partial<Resource>) =>
    request<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateResource: (id: string, updates: Partial<Resource>) =>
    request<Resource>(`/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  requestAssignment: (incidentId: string, data: { resourceId: string; matchReason?: string; distanceKm?: number; estimatedDurationMins?: number; matchScore?: number }) =>
    request<ResourceAssignment>(`/incidents/${incidentId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  approveAssignment: (assignmentId: string) =>
    request<ResourceAssignment>(`/assignments/${assignmentId}/approve`, { method: 'POST' }),

  rejectAssignment: (assignmentId: string, reason: string) =>
    request<ResourceAssignment>(`/assignments/${assignmentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  releaseAssignment: (assignmentId: string) =>
    request<ResourceAssignment>(`/assignments/${assignmentId}/release`, { method: 'POST' }),

  // Routes
  calculateRoute: (data: { startLat: number; startLng: number; destLat: number; destLng: number; isLocationVerified: boolean }) =>
    request<RouteCalculationResult>('/routes/calculate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getIncidentRoute: (incidentId: string, resourceId?: string) => {
    const query = resourceId ? `?resourceId=${resourceId}` : '';
    return request<RouteCalculationResult>(`/incidents/${incidentId}/routes${query}`);
  },

  // Notifications
  getNotifications: () => request<Notification[]>('/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),

  // Health — lightweight, used to tell a real backend failure apart from a blank page
  getHealth: () => request<{ status: string; system?: string; timestamp?: string }>('/health'),

  // Gemini chat via the backend (server-side only — no key ever reaches
  // the frontend; Gemini is the single provider, GEMINI_API_KEY on the
  // server). Route path /ai/openai is kept under its historic name so
  // existing callers keep working; the backend behind it is Gemini-only.
  geminiChat: (data: { agent: string; message: string; history?: Array<{ role: 'user' | 'agent'; content: string }>; incidentId?: string | null }, timeoutMs?: number) =>
    request<{ agent: string; agentName: string; reply: string; provider: string; timestamp: string }>('/ai/openai', {
      method: 'POST',
      body: JSON.stringify(data),
      ...(timeoutMs ? { timeoutMs } : {})
    }),

  // Gemini connection test via the backend. An optional key passed here is
  // used for ONE test call only and is never stored, logged or returned by
  // the server. Without a key, the server environment key is tested.
  testGemini: (key?: string) =>
    request<{ ok: boolean; provider: string; model: string; configured: boolean; testedWithProvidedKey: boolean }>('/ai/test', {
      method: 'POST',
      body: JSON.stringify(key ? { key } : {})
    }),

  summarize: (data: { incidentId?: string; text?: string; task?: 'summary' | 'analysis' | 'recommendations' }) =>
    request<{ task: string; summary: string; incidentId: string | null; provider: string }>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  searchAI: (query: string) =>
    request<{ query: string; total: number; incidents: Incident[]; summary: string | null; summaryNotice: string | null }>('/ai/search', {
      method: 'POST',
      body: JSON.stringify({ query })
    }),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),

  getDashboardActivity: () =>
    request<{
      recentIncidents: Incident[];
      recentRuns: AgentRun[];
      recentAudits: AuditLog[];
    }>('/dashboard/activity'),

  // Administration
  getUsers: () => request<User[]>('/admin/users'),

  getAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),

  resetDemoData: () =>
    request<{ success: boolean; message: string }>('/admin/reset-demo', { method: 'POST' })
};
