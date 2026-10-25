import { Router, Response } from 'express';
import { dbService, hashPassword } from './db';
import { generateToken, AuthenticatedRequest, requireAuth, requireRole } from './auth';
import { orchestrator } from './agents/orchestrator';
import { calculateRoadRoute } from './roadGraph';
import { IncidentCategory, IncidentPriority, IncidentStatus, ResourceType, ResourceStatus, SpecializedAgentId } from './types';
import { getSpecializedAgentsList, executeSpecializedAgentAction, generateSpecializedConsensus } from './agents/specializedAgents';

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
