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
  MultiAgentConsensusMessage
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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

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
