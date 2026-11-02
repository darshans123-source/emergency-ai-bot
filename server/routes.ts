import { Router, Response } from 'express';
import { dbService, hashPassword } from './db';
import { generateToken, AuthenticatedRequest, requireAuth, requireRole } from './auth';
import { orchestrator } from './agents/orchestrator';
import { calculateRoadRoute } from './roadGraph';
import {
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
  ResourceType,
  ResourceStatus,
  SpecializedAgentId,
  EmergencyFacility,
  FacilityType
} from './types';
import {
  getSpecializedAgentsList,
  executeSpecializedAgentAction,
  generateSpecializedConsensus,
  chatWithSpecializedAgent,
  getGridEfficiencySummary,
  runGridReadinessBenchmark,
  routeOperatorCommand
} from './agents/specializedAgents';
import { checkAIProviderStatus, SupportedLanguage, extractIncidentParameters } from './aiProviderAdapter';

export const apiRouter = Router();

// Helper for broadcasting real-time events
let broadcastFn: (type: string, data: any) => void = () => {};
export function setEventBroadcaster(fn: (type: string, data: any) => void) {
  broadcastFn = fn;
  orchestrator.setBroadcaster(fn);
}

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/auth/register', (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, organization } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Validation Error', message: 'Name, email, and password are required.' });
    return;
  }

  const existing = dbService.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Conflict', message: 'A user with this email address already exists.' });
    return;
  }

  // Security policy: Public registration is Reporter only unless created by an admin
  const assignedRole = (role === 'operator' || role === 'admin') ? (req.user?.role === 'admin' ? role : 'reporter') : 'reporter';

  const newUser = dbService.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role: assignedRole,
    organization: organization?.trim() || (assignedRole === 'reporter' ? 'Public Community' : 'Emergency Agency')
  });

  dbService.logAudit({
    userId: newUser.id,
    userEmail: newUser.email,
    userRole: newUser.role,
    action: 'USER_REGISTER',
    entityType: 'USER',
    entityId: newUser.id,
    details: `New user registration as ${newUser.role}`,
    ipAddress: req.ip
  });

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      organization: newUser.organization,
      createdAt: newUser.createdAt
    }
  });
});

apiRouter.post('/auth/login', (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
    return;
  }

  const user = dbService.getUserByEmail(email.trim().toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: 'Authentication Failed', message: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user);

  dbService.logAudit({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    details: `User logged in from ${req.ip || 'client'}`,
    ipAddress: req.ip
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt
    }
  });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organization: req.user.organization,
      createdAt: req.user.createdAt
    }
  });
});

apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    dbService.logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: req.user.id,
      details: 'User logged out',
      ipAddress: req.ip
    });
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// -------------------------------------------------------------
// INCIDENTS ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/incidents', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    category,
    description,
    address,
    latitude,
    longitude,
    locationVerified,
    casualtiesCount,
    reporterName,
    reporterContact,
    imageUrl,
    notes
  } = req.body;

  if (!title || !category || !description) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Title, category, and description are mandatory fields.'
    });
    return;
  }

  const validCategories: IncidentCategory[] = [
    'ROAD_ACCIDENT',
    'MEDICAL_EMERGENCY',
    'FIRE_INCIDENT',
    'FLOOD',
    'NATURAL_DISASTER',
    'PUBLIC_SAFETY',
    'OTHER'
  ];

  if (!validCategories.includes(category)) {
    res.status(400).json({
      error: 'Validation Error',
      message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    });
    return;
  }

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
  const isVerified = Boolean(locationVerified && hasCoords);

  const newIncident = dbService.createIncident({
    title: title.trim(),
    category,
    description: description.trim(),
    status: 'RECEIVED',
    priority: 'UNASSESSED',
    location: {
      address: address?.trim() || 'Address not specified',
      latitude: hasCoords ? latitude : null,
      longitude: hasCoords ? longitude : null,
      verified: isVerified,
      notes: isVerified ? 'Verified by coordinates input' : 'Unverified location coordinates'
    },
    casualtiesCount: typeof casualtiesCount === 'number' ? Math.max(0, casualtiesCount) : 0,
    reporterId: req.user?.id,
    reporterName: reporterName?.trim() || req.user?.name || 'Anonymous Reporter',
    reporterContact: reporterContact?.trim() || req.user?.email || 'N/A',
    imageUrl: imageUrl?.trim() || undefined,
    isDemo: false
  });

  dbService.logAudit({
    userId: req.user?.id || 'ANONYMOUS',
    userEmail: req.user?.email || 'public@reporter.io',
    userRole: req.user?.role || 'reporter',
    action: 'INCIDENT_CREATED',
    entityType: 'INCIDENT',
    entityId: newIncident.id,
    details: `Incident reported: "${newIncident.title}" [${newIncident.category}]`,
    ipAddress: req.ip
  });

  // Create operator notification
  dbService.addNotification({
    targetRole: 'operator',
    title: `New Incident Reported: ${newIncident.id}`,
    message: `${newIncident.title} (${newIncident.category}) logged at ${newIncident.location.address}. Priority assessment pending.`,
    incidentId: newIncident.id,
    priority: 'HIGH'
  });

  broadcastFn('INCIDENT_CREATED', newIncident);

  // Automatically trigger multi-agent pipeline in background
  orchestrator.runWorkflow(newIncident.id).catch(err => {
    console.error(`[Orchestrator] Auto workflow error for ${newIncident.id}:`, err);
  });

  res.status(201).json(newIncident);
});

apiRouter.get('/incidents', (req: AuthenticatedRequest, res: Response) => {
  const { category, priority, status, search, limit, offset, reporterOnly } = req.query;

  let reporterIdFilter: string | undefined = undefined;
  // If user is a reporter and asks for their own or reporterOnly is requested:
  if (req.user?.role === 'reporter' || reporterOnly === 'true') {
    reporterIdFilter = req.user?.id;
  }

  const allFiltered = dbService.getIncidents({
    category: category as string,
    priority: priority as string,
    status: status as string,
    search: search as string,
    reporterId: reporterIdFilter
  });

  const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
  const parsedOffset = offset ? parseInt(offset as string, 10) : 0;
  const paginated = allFiltered.slice(parsedOffset, parsedOffset + parsedLimit);

  res.json({
    total: allFiltered.length,
    limit: parsedLimit,
    offset: parsedOffset,
    incidents: paginated
  });
});

apiRouter.get('/incidents/:id', (req: AuthenticatedRequest, res: Response) => {
  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: `Incident ${req.params.id} does not exist.` });
    return;
  }

  // Permission check: if user is reporter, they can only view their own report if strict
  if (req.user?.role === 'reporter' && incident.reporterId && incident.reporterId !== req.user.id) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access policy restricts reporters from viewing confidential records of other reporters.'
    });
    return;
  }

  const assignments = dbService.getAssignments(incident.id);
  const notes = dbService.getNotes(incident.id);
  const agentRuns = dbService.getAgentRuns(incident.id);

  res.json({
    incident,
    assignments,
    notes,
    latestAgentRun: agentRuns[0] || null
  });
});

apiRouter.patch('/incidents/:id', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const { priority, status, assignedOperatorId, assignedOperatorName, location } = req.body;
  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Incident not found' });
    return;
  }

  const updates: any = {};
  if (priority) updates.priority = priority as IncidentPriority;
  if (status) updates.status = status as IncidentStatus;
  if (assignedOperatorId) updates.assignedOperatorId = assignedOperatorId;
  if (assignedOperatorName) updates.assignedOperatorName = assignedOperatorName;
  if (location) updates.location = { ...incident.location, ...location };

  const updated = dbService.updateIncident(incident.id, updates);

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'INCIDENT_UPDATE',
    entityType: 'INCIDENT',
    entityId: incident.id,
    details: `Updated fields: ${Object.keys(updates).join(', ')}. Status: ${updated?.status}, Priority: ${updated?.priority}`,
    ipAddress: req.ip
  });

  broadcastFn('INCIDENT_UPDATED', updated);
  res.json(updated);
});

apiRouter.get('/incidents/:id/notes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notes = dbService.getNotes(req.params.id);
  res.json(notes);
});

apiRouter.post('/incidents/:id/notes', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'Note content cannot be empty.' });
    return;
  }

  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Incident not found' });
    return;
  }

  const note = dbService.addNote({
    incidentId: incident.id,
    authorId: req.user!.id,
    authorName: req.user!.name,
    authorRole: req.user!.role,
    content: content.trim()
  });

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'NOTE_ADDED',
    entityType: 'INCIDENT',
    entityId: incident.id,
    details: `Operational note added by ${req.user!.name}`,
    ipAddress: req.ip
  });

  res.status(201).json(note);
});

// -------------------------------------------------------------
// AGENT WORKFLOW ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/incidents/:id/analyze', requireAuth, requireRole(['operator', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Incident not found' });
    return;
  }

  try {
    const run = await orchestrator.runWorkflow(incident.id);

    dbService.logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'AGENT_WORKFLOW_TRIGGER',
      entityType: 'AGENT_RUN',
      entityId: run.id,
      details: `Operator initiated multi-agent orchestration for incident ${incident.id}. Status: ${run.status}`,
      ipAddress: req.ip
    });

    res.json(run);
  } catch (err: any) {
    res.status(500).json({
      error: 'Orchestrator Execution Error',
      message: err?.message || 'Failed to complete agent workflow'
    });
  }
});

apiRouter.get('/incidents/:id/agent-runs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const runs = dbService.getAgentRuns(req.params.id);
  res.json(runs);
});

apiRouter.get('/agent-runs/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const run = dbService.getAgentRunById(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Not Found', message: 'Agent run not found' });
    return;
  }
  const events = dbService.getAgentEvents(run.id);
  res.json({ ...run, events });
});

apiRouter.post('/agent-runs/:id/retry', requireAuth, requireRole(['operator', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const previousRun = dbService.getAgentRunById(req.params.id);
  if (!previousRun) {
    res.status(404).json({ error: 'Not Found', message: 'Previous run not found' });
    return;
  }

  const incident = dbService.getIncidentById(previousRun.incidentId);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Associated incident not found' });
    return;
  }

  const newRun = await orchestrator.runWorkflow(incident.id);
  res.json(newRun);
});

// -------------------------------------------------------------
// SPECIALIZED MULTI-AGENT ENDPOINTS (POLICE, EMS, HYDRO, CURRENT/KEB)
// -------------------------------------------------------------

apiRouter.get('/agents/specialized', (req: AuthenticatedRequest, res: Response) => {
  const { incidentId } = req.query;
  const incident = incidentId ? dbService.getIncidentById(incidentId as string) : null;
  const list = getSpecializedAgentsList(incident);
  res.json(list);
});

apiRouter.post('/agents/specialized/action', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const { agentId, actionId, incidentId } = req.body;
  if (!agentId || !actionId) {
    res.status(400).json({ error: 'Validation Error', message: 'agentId and actionId are required.' });
    return;
  }

  try {
    const operatorName = req.user?.name || 'Operator';
    const result = executeSpecializedAgentAction(agentId as SpecializedAgentId, actionId, incidentId, operatorName);

    dbService.logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'SPECIALIZED_AGENT_ACTION',
      entityType: 'AGENT_ACTION',
      entityId: `${agentId}:${actionId}`,
      details: `${operatorName} triggered ${actionId} on ${agentId}${incidentId ? ` for incident ${incidentId}` : ''}`,
      ipAddress: req.ip
    });

    broadcastFn('SPECIALIZED_AGENT_ACTION', {
      agentId,
      actionId,
      incidentId,
      updatedAgent: result.updatedAgent,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Action Execution Error', message: err?.message || 'Failed to trigger agent action' });
  }
});

apiRouter.post('/agents/specialized/consensus', (req: AuthenticatedRequest, res: Response) => {
  const { incidentId } = req.body;
  const incident = incidentId ? dbService.getIncidentById(incidentId) : dbService.getIncidents()[0];
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'No incidents available for multi-agent consensus' });
    return;
  }

  const consensus = generateSpecializedConsensus(incident);
  res.json({ incidentId: incident.id, consensus });
});

apiRouter.post('/agents/specialized/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { agentId, message, history, incidentId, language, userLocation } = req.body || {};
  if (!agentId || !message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'agentId and a non-empty message are required.' });
    return;
  }

  try {
    const result = await chatWithSpecializedAgent(
      agentId as SpecializedAgentId,
      message,
      Array.isArray(history) ? history : [],
      incidentId || null,
      (language || 'en') as SupportedLanguage,
      userLocation || null
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Agent Chat Error',
      message: err?.message || 'Failed to generate agent response.'
    });
  }
});

// Dedicated Multilingual Voice AI Chat Endpoint (POST /api/ai/chat)
apiRouter.post('/ai/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { agentId = 'POLICE_TACTICAL', message, history, incidentId, language = 'en', userLocation } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'A non-empty message string is required.'
    });
    return;
  }

  const validIds: SpecializedAgentId[] = ['POLICE_TACTICAL', 'HOSPITAL_EMS', 'WATER_HYDRO', 'CURRENT_KEB'];
  const targetAgentId: SpecializedAgentId = validIds.includes(agentId) ? agentId : 'POLICE_TACTICAL';

  try {
    const result = await chatWithSpecializedAgent(
      targetAgentId,
      message.trim(),
      Array.isArray(history) ? history : [],
      incidentId || null,
      (language || 'en') as SupportedLanguage,
      userLocation || null
    );
    res.json(result);
  } catch (err: any) {
    console.error('[API /ai/chat Error]:', err);
    res.status(500).json({
      error: 'AI Chat Error',
      message: err?.message || 'Internal AI service error encountered. Please retry.'
    });
  }
});

// AI Provider Status Endpoint (GET /api/ai/status)
apiRouter.get('/ai/status', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await checkAIProviderStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      error: 'Status Check Error',
      message: err?.message || 'Could not verify AI provider status.'
    });
  }
});

// -------------------------------------------------------------
// AI ENDPOINTS (server-side only, Qwen/DashScope first, then OpenAI)
// -------------------------------------------------------------
// Keys are read only from server environment variables:
//   DASHSCOPE_API_KEY (Qwen, via the OpenAI-compatible endpoint
//   https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1,
//   model qwen3.8-flash by default, thinking enabled as in the
//   user-supplied DashScope example) or OPENAI_API_KEY.
// They are never sent to, or read from, the frontend, never put in
// a VITE_ variable, and never committed. When no key is set the
// endpoints return a clear 503 — never a fake success and never a
// response pretending to be an AI provider. TTS stays OpenAI-only
// (see /ai/tts) because DashScope's compatible-mode endpoint does
// not provide OpenAI's audio/speech API.

const OPENAI_AGENTS: Record<string, { name: string; system: string }> = {
  rakshak: {
    name: 'Rakshak AI',
    system:
      'You are Rakshak AI, a police and public safety assistant. Give calm, practical, lawful guidance for police incidents, accident reporting, public safety and response recommendations. Never claim a unit has been dispatched unless the incident context says so. For life-threatening emergencies, always advise calling 112 / 911 immediately.'
  },
  jeevan: {
    name: 'Jeevan AI',
    system:
      'You are Jeevan AI, a medical and ambulance assistance assistant. Give first-aid and medical emergency guidance, help the caller find nearby hospitals, and explain what information dispatch needs. This is decision support only, not a diagnosis. For life-threatening emergencies, always advise calling 112 / 911 immediately.'
  },
  agni: {
    name: 'Agni AI',
    system:
      'You are Agni AI, a fire and rescue operations assistant. Give fire safety, evacuation, fire incident reporting and rescue coordination guidance. Never claim a fire unit has been dispatched unless the incident context says so. For an active fire, always advise leaving the building, calling 112 / 911, and not re-entering.'
  },
  sanrakshak: {
    name: 'Sanrakshak AI',
    system:
      'You are Sanrakshak AI, a disaster management assistant for floods, natural disasters, water and power disruptions and mass safety. Give preparedness, evacuation, shelter and public safety guidance based on the incident context. For life-threatening situations, always advise calling 112 / 911 immediately.'
  }
};

type ChatProvider = { name: 'qwen' | 'openai'; key: string; baseUrl: string; model: string };

function getChatProvider(): ChatProvider | null {
  const dashKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (dashKey) {
    return {
      name: 'qwen',
      key: dashKey,
      baseUrl: process.env.DASHSCOPE_BASE_URL?.trim() || 'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1',
      model: process.env.DASHSCOPE_MODEL?.trim() || process.env.QWEN_MODEL?.trim() || 'qwen3.8-flash'
    };
  }
  const openKey = process.env.OPENAI_API_KEY?.trim();
  if (openKey) {
    return { name: 'openai', key: openKey, baseUrl: 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini' };
  }
  return null;
}

async function callOpenAIChat(
  system: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const provider = getChatProvider();
  if (!provider) {
    const err: any = new Error('AI is not configured on the server. Set DASHSCOPE_API_KEY or OPENAI_API_KEY in the server environment.');
    err.status = 503;
    throw err;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.3,
        ...(provider.name === 'qwen' ? { extra_body: { enable_thinking: true } } : {})
      })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err: any = new Error(`${provider.name} request failed (${response.status}). ${body.slice(0, 200)}`);
      err.status = 502;
      throw err;
    }
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || !content.trim()) throw new Error(`${provider.name} returned an empty response.`);
    return content.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

function openaiError(res: Response, err: any) {
  const status = err?.status || 502;
  res.status(status).json({
    error: status === 503 ? 'AI Not Configured' : 'AI Error',
    message: err?.message || 'AI request failed.'
  });
}

// Dedicated OpenAI chat for the four named agents (Rakshak / Jeevan / Agni / Sanrakshak)
apiRouter.post('/ai/openai', async (req: AuthenticatedRequest, res: Response) => {
  const { agent, message, history, incidentId } = req.body || {};
  const key = (typeof agent === 'string' ? agent.toLowerCase() : '') as keyof typeof OPENAI_AGENTS;
  const agentDef = OPENAI_AGENTS[key];
  if (!agentDef || !message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'A valid agent (rakshak, jeevan, agni, sanrakshak) and a non-empty message are required.' });
    return;
  }
  try {
    const incident = incidentId ? dbService.getIncidentById(incidentId) : null;
    const context = incident
      ? `Live incident context from the database (do not invent details beyond this): ${incident.id}, ${incident.title}, category ${incident.category}, priority ${incident.priority}, status ${incident.status}, location ${incident.location.address}, description: ${incident.description}.`
      : 'No specific incident is selected. Answer generally and ask for location/category if needed to help.';
    const reply = await callOpenAIChat(agentDef.system, [
      ...(Array.isArray(history) ? history.slice(-6).map((m: any) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: String(m.content || '').slice(0, 500) })) : []),
      { role: 'user' as const, content: `${context}\n\nUser message: ${message.trim()}` }
    ]);
    res.json({ agent: key, agentName: agentDef.name, reply, provider: getChatProvider()?.name || 'openai', timestamp: new Date().toISOString() });
  } catch (err: any) {
    openaiError(res, err);
  }
});

// Emergency report summarization / incident analysis / recommendations (OpenAI only)
apiRouter.post('/ai/summarize', async (req: AuthenticatedRequest, res: Response) => {
  const { incidentId, text, task } = req.body || {};
  const input = incidentId ? dbService.getIncidentById(incidentId) : null;
  const sourceText = input
    ? `${input.title}. Category: ${input.category}. Priority: ${input.priority}. Status: ${input.status}. Location: ${input.location.address}. Description: ${input.description}.`
    : typeof text === 'string' && text.trim()
      ? text.trim()
      : '';
  if (!sourceText) {
    res.status(400).json({ error: 'Validation Error', message: 'An incidentId or text to summarize is required.' });
    return;
  }
  const taskText =
    task === 'analysis'
      ? 'Analyse this emergency report: list the key facts, risks, missing information and what a dispatcher should verify next.'
      : task === 'recommendations'
        ? 'Give practical emergency response recommendations for this report: which response units and facilities are relevant, and what the caller should do now. Do not claim any unit has been dispatched.'
        : 'Summarize this emergency report in 3-5 short, clear sentences for a dispatcher.';
  try {
    const reply = await callOpenAIChat(
      'You are an emergency dispatch assistant. Be concise, factual and calm. Never invent locations, units, times or outcomes. State when information is missing.',
      [{ role: 'user', content: `${taskText}\n\nReport: ${sourceText.slice(0, 4000)}` }]
    );
    res.json({ task: task || 'summary', summary: reply, incidentId: input?.id || null, provider: getChatProvider()?.name || 'openai' });
  } catch (err: any) {
    openaiError(res, err);
  }
});

// Natural-language incident search: real DB search + optional OpenAI summary
apiRouter.post('/ai/search', async (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'A search query is required.' });
    return;
  }
  const q = query.trim().toLowerCase();
  const matches = dbService
    .getIncidents()
    .filter((inc) =>
      [inc.id, inc.title, inc.description, inc.location.address, inc.category, inc.priority, inc.status]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
    .slice(0, 20);
  let summary: string | null = null;
  let summaryNotice: string | null = null;
  if (matches.length > 0 && getChatProvider()) {
    try {
      summary = await callOpenAIChat(
        'You are an emergency dispatch assistant. Summarize search results factually, without inventing incidents.',
        [
          {
            role: 'user',
            content: `Summarize these ${matches.length} matching incidents in 2-3 sentences, noting the most urgent one first if any: ${matches
              .map((m) => `${m.id}: ${m.title} (${m.category}, ${m.priority}, ${m.status}, ${m.location.address})`)
              .join('; ')}`
          }
        ]
      );
    } catch {
      summaryNotice = 'AI summary unavailable: AI request failed. Matches below are from the live database.';
    }
  } else if (!getChatProvider()) {
    summaryNotice = 'AI summary unavailable: no AI key is configured on the server. Matches below are from the live database.';
  }
  res.json({ query: query.trim(), total: matches.length, incidents: matches, summary, summaryNotice });
});

// OpenAI text-to-speech (server-side only, returns audio/mpeg)
apiRouter.post('/ai/tts', async (req: AuthenticatedRequest, res: Response) => {
  const { text, voice } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'Text to speak is required.' });
    return;
  }
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    res.status(503).json({ error: 'OpenAI Not Configured', message: 'OpenAI is not configured on the server. Set OPENAI_API_KEY in the server environment.' });
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL?.trim() || 'tts-1',
        input: text.trim().slice(0, 4000),
        voice: typeof voice === 'string' && voice ? voice : 'alloy'
      })
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      res.status(502).json({ error: 'OpenAI Error', message: `OpenAI speech request failed (${response.status}).` });
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err: any) {
    openaiError(res, err);
  }
});

// Voice-based incident report creation (POST /api/ai/voice-report)
apiRouter.post('/ai/voice-report', async (req: AuthenticatedRequest, res: Response) => {
  let { title, category, description, address, casualtiesCount, priority, language = 'en', transcript, agentId, userLocation, latitude, longitude } = req.body || {};

  const effectiveText = (description || transcript || '').trim();
  if (!effectiveText) {
    res.status(400).json({ error: 'Validation Error', message: 'Description or speech transcript is required to file a report.' });
    return;
  }

  if (!category || !title || !address) {
    const extracted = extractIncidentParameters(effectiveText, agentId || 'POLICE_TACTICAL', language);
    if (extracted) {
      if (!category && extracted.category) category = extracted.category;
      if (!title && extracted.title) title = extracted.title;
      if (!address && extracted.address) address = extracted.address;
      if (!priority && extracted.priority) priority = extracted.priority;
    }
  }
  description = effectiveText;

  const validCategories: IncidentCategory[] = [
    'ROAD_ACCIDENT',
    'MEDICAL_EMERGENCY',
    'FIRE_INCIDENT',
    'FLOOD',
    'NATURAL_DISASTER',
    'PUBLIC_SAFETY',
    'OTHER'
  ];

  const cat: IncidentCategory = validCategories.includes(category) ? category : 'OTHER';
  const cleanTitle = title?.trim() || `${cat.replace(/_/g, ' ')} Reported via Voice`;
  const cleanAddress = userLocation?.address?.trim() || address?.trim() || 'Address Reported via Voice Assistant';

  const realLat = typeof userLocation?.latitude === 'number'
    ? userLocation.latitude
    : (typeof latitude === 'number' ? latitude : null);
  const realLng = typeof userLocation?.longitude === 'number'
    ? userLocation.longitude
    : (typeof longitude === 'number' ? longitude : null);

  try {
    const newIncident = dbService.createIncident({
      title: cleanTitle,
      category: cat,
      description: description.trim(),
      status: 'RECEIVED',
      priority: priority || 'UNASSESSED',
      location: {
        address: cleanAddress,
        latitude: realLat,
        longitude: realLng,
        verified: realLat !== null && realLng !== null,
        notes: `Voice Assistant intake in ${String(language).toUpperCase()}${userLocation?.accuracy ? ` (GPS accuracy: ±${userLocation.accuracy}m)` : ''}`
      },
      casualtiesCount: typeof casualtiesCount === 'number' ? Math.max(0, casualtiesCount) : 0,
      reporterId: req.user?.id,
      reporterName: req.user?.name || 'Voice Assistant User',
      reporterContact: req.user?.email || 'Voice Dispatch Intake',
      isDemo: false
    });

    dbService.logAudit({
      userId: req.user?.id || 'VOICE_USER',
      userEmail: req.user?.email || 'voice@reporter.io',
      userRole: req.user?.role || 'reporter',
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: newIncident.id,
      details: `Voice incident reported: "${newIncident.title}" [${newIncident.category}] in ${String(language).toUpperCase()}`,
      ipAddress: req.ip
    });

    dbService.addNotification({
      targetRole: 'operator',
      title: `Voice Emergency Report: ${newIncident.id}`,
      message: `${newIncident.title} logged at ${newIncident.location.address}. Reviewing queue.`,
      incidentId: newIncident.id,
      priority: 'HIGH'
    });

    broadcastFn('INCIDENT_CREATED', newIncident);

    orchestrator.runWorkflow(newIncident.id).catch((err) => {
      console.error(`[Orchestrator] Auto workflow error for voice report ${newIncident.id}:`, err);
    });

    res.status(201).json({
      success: true,
      incidentId: newIncident.id,
      incident: newIncident
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Submission Error',
      message: err?.message || 'Failed to submit voice report into database.'
    });
  }
});

apiRouter.get('/agents/specialized/metrics', (_req: AuthenticatedRequest, res: Response) => {
  const summary = getGridEfficiencySummary();
  res.json(summary);
});

apiRouter.post('/agents/specialized/benchmark', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { incidentId } = req.body || {};
    const summary = await runGridReadinessBenchmark(incidentId || null);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({
      error: 'Benchmark Error',
      message: err?.message || 'Failed to execute readiness benchmark.'
    });
  }
});

apiRouter.post('/agents/command', async (req: AuthenticatedRequest, res: Response) => {
  const { command, incidentId, userLocation, language } = req.body || {};
  if (!command || typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'A non-empty command is required.' });
    return;
  }

  try {
    const response = await routeOperatorCommand(
      command,
      incidentId || null,
      userLocation || null,
      (language || 'en') as SupportedLanguage
    );
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      error: 'Command Execution Error',
      message: err?.message || 'Failed to route and execute AI command.'
    });
  }
});


// -------------------------------------------------------------
// VERIFIED FACILITIES ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/facilities', (req: AuthenticatedRequest, res: Response) => {
  const { type, agentDomain } = req.query;
  const list = dbService.getFacilities({
    type: type as string,
    agentDomain: agentDomain as string
  });
  res.json(list);
});

// -------------------------------------------------------------
// RESOURCES ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/resources', (req: AuthenticatedRequest, res: Response) => {
  const { type, status } = req.query;
  const list = dbService.getResources(type as string, status as string);
  res.json(list);
});

apiRouter.get('/resources/:id', (req: AuthenticatedRequest, res: Response) => {
  const resource = dbService.getResourceById(req.params.id);
  if (!resource) {
    res.status(404).json({ error: 'Not Found', message: 'Resource not found' });
    return;
  }
  res.json(resource);
});

apiRouter.post('/resources', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { name, type, latitude, longitude, address, capacity, operationalNotes } = req.body;
  if (!name || !type || typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'Validation Error', message: 'Name, type, and valid latitude/longitude coordinates are required.' });
    return;
  }

  const resource = dbService.createResource({
    name: name.trim(),
    type: type as ResourceType,
    status: 'AVAILABLE',
    latitude,
    longitude,
    address: address?.trim() || 'Simulated Emergency Base',
    capacity: capacity?.trim() || 'Standard Response Crew',
    operationalNotes: operationalNotes?.trim() || 'Simulated resource ready for dispatch',
    assignedIncidentId: null,
    isDemo: true
  });

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'RESOURCE_CREATED',
    entityType: 'RESOURCE',
    entityId: resource.id,
    details: `Admin added resource unit ${resource.name} [${resource.type}]`,
    ipAddress: req.ip
  });

  res.status(201).json(resource);
});

apiRouter.patch('/resources/:id', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const resource = dbService.getResourceById(req.params.id);
  if (!resource) {
    res.status(404).json({ error: 'Not Found', message: 'Resource not found' });
    return;
  }

  const updated = dbService.updateResource(resource.id, req.body);
  broadcastFn('RESOURCE_UPDATED', updated);
  res.json(updated);
});

// -------------------------------------------------------------
// RESOURCE ASSIGNMENTS ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/incidents/:id/assignments', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const { resourceId, matchReason, distanceKm, estimatedDurationMins, matchScore } = req.body;
  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Incident not found' });
    return;
  }

  const resource = dbService.getResourceById(resourceId);
  if (!resource) {
    res.status(404).json({ error: 'Not Found', message: 'Resource not found' });
    return;
  }

  const result = dbService.requestAssignment({
    incidentId: incident.id,
    resourceId: resource.id,
    resourceName: resource.name,
    resourceType: resource.type,
    status: 'PENDING_APPROVAL',
    distanceKm: distanceKm || 2.5,
    estimatedDurationMins: estimatedDurationMins || 4.0,
    matchScore: matchScore || 85,
    recommendationReason: matchReason || 'Operator requested deployment'
  });

  if (!result.success) {
    res.status(409).json({ error: 'Assignment Conflict', message: result.error });
    return;
  }

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'ASSIGNMENT_REQUESTED',
    entityType: 'RESOURCE_ASSIGNMENT',
    entityId: result.assignment!.id,
    details: `Requested assignment of ${resource.name} to ${incident.id}`,
    ipAddress: req.ip
  });

  broadcastFn('ASSIGNMENT_UPDATED', result.assignment);
  res.status(201).json(result.assignment);
});

apiRouter.post('/assignments/:id/approve', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const result = dbService.approveAssignment(req.params.id, req.user!.name);
  if (!result.success) {
    res.status(409).json({ error: 'Approval Failed', message: result.error });
    return;
  }

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'ASSIGNMENT_APPROVED',
    entityType: 'RESOURCE_ASSIGNMENT',
    entityId: result.assignment!.id,
    details: `Operator ${req.user!.name} approved deployment of ${result.assignment!.resourceName} to ${result.assignment!.incidentId}`,
    ipAddress: req.ip
  });

  broadcastFn('ASSIGNMENT_UPDATED', result.assignment);
  res.json(result.assignment);
});

apiRouter.post('/assignments/:id/reject', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    res.status(400).json({ error: 'Validation Error', message: 'A rejection reason is strictly required by audit policy.' });
    return;
  }

  const result = dbService.rejectAssignment(req.params.id, reason.trim());
  if (!result.success) {
    res.status(400).json({ error: 'Rejection Failed', message: result.error });
    return;
  }

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'ASSIGNMENT_REJECTED',
    entityType: 'RESOURCE_ASSIGNMENT',
    entityId: result.assignment!.id,
    details: `Operator rejected assignment of ${result.assignment!.resourceName}. Reason: "${reason.trim()}"`,
    ipAddress: req.ip
  });

  broadcastFn('ASSIGNMENT_UPDATED', result.assignment);
  res.json(result.assignment);
});

apiRouter.post('/assignments/:id/release', requireAuth, requireRole(['operator', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const result = dbService.releaseAssignment(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: 'Release Failed', message: result.error });
    return;
  }

  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'ASSIGNMENT_RELEASED',
    entityType: 'RESOURCE_ASSIGNMENT',
    entityId: result.assignment!.id,
    details: `Released ${result.assignment!.resourceName} back to AVAILABLE inventory`,
    ipAddress: req.ip
  });

  broadcastFn('ASSIGNMENT_UPDATED', result.assignment);
  res.json(result.assignment);
});

// -------------------------------------------------------------
// ROUTING ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/routes/calculate', (req: AuthenticatedRequest, res: Response) => {
  const { startLat, startLng, destLat, destLng, isLocationVerified } = req.body;

  const routeResult = calculateRoadRoute(startLat, startLng, destLat, destLng, Boolean(isLocationVerified));
  res.json(routeResult);
});

apiRouter.get('/incidents/:id/routes', (req: AuthenticatedRequest, res: Response) => {
  const incident = dbService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Not Found', message: 'Incident not found' });
    return;
  }

  if (!incident.location.verified || incident.location.latitude === null || incident.location.longitude === null) {
    res.json({
      status: 'PREREQUISITE_FAILED',
      dataSource: 'Metro Graph Routing Engine v2.4 (Dijkstra)',
      limitations: ['Verified GPS coordinates required.'],
      message: 'Prerequisite failed: Incident location is unverified. Cannot calculate road route without confirmed coordinates.'
    });
    return;
  }

  const { resourceId } = req.query;
  let originLat = 37.7785;
  let originLng = -122.4115;
  let unitName = 'Fire HQ Central';

  if (resourceId) {
    const resUnit = dbService.getResourceById(resourceId as string);
    if (resUnit) {
      originLat = resUnit.latitude;
      originLng = resUnit.longitude;
      unitName = resUnit.name;
    }
  }

  const result = calculateRoadRoute(originLat, originLng, incident.location.latitude, incident.location.longitude, true);
  res.json({ ...result, unitName });
});

// -------------------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const list = dbService.getNotifications(req.user!.role, req.user!.id);
  res.json(list);
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbService.markNotificationRead(req.params.id);
  res.json({ success });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  dbService.markAllNotificationsRead(req.user!.role);
  res.json({ success: true });
});

// -------------------------------------------------------------
// DASHBOARD ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/dashboard/summary', (req: AuthenticatedRequest, res: Response) => {
  const summary = dbService.getDashboardSummary();
  res.json(summary);
});

apiRouter.get('/dashboard/activity', (req: AuthenticatedRequest, res: Response) => {
  const recentIncidents = dbService.getIncidents().slice(0, 5);
  const recentRuns = dbService.getAgentRuns().slice(0, 5);
  const recentAudits = dbService.getAuditLogs().slice(0, 6);
  res.json({
    recentIncidents,
    recentRuns,
    recentAudits
  });
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/admin/users', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const users = dbService.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    organization: u.organization,
    createdAt: u.createdAt
  }));
  res.json(users);
});

apiRouter.get('/admin/audit-logs', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const logs = dbService.getAuditLogs();
  res.json(logs);
});

apiRouter.post('/admin/reset-demo', requireAuth, requireRole(['admin', 'operator']), (req: AuthenticatedRequest, res: Response) => {
  dbService.resetDemoData();
  dbService.logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'DEMO_DATA_RESET',
    entityType: 'DATABASE',
    entityId: 'ALL',
    details: 'Reset system database to pristine demonstration dataset',
    ipAddress: req.ip
  });
  broadcastFn('DATA_RESET', { timestamp: new Date().toISOString() });
  res.json({ success: true, message: 'Demonstration dataset reset successfully.' });
});
