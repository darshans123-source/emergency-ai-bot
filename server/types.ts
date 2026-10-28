export type UserRole = 'reporter' | 'operator' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organization: string;
  createdAt: string;
}

export type IncidentCategory =
  | 'ROAD_ACCIDENT'
  | 'MEDICAL_EMERGENCY'
  | 'FIRE_INCIDENT'
  | 'FLOOD'
  | 'NATURAL_DISASTER'
  | 'PUBLIC_SAFETY'
  | 'OTHER';

export type IncidentPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNASSESSED';

export type IncidentStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'RESOURCES_DISPATCHED'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CLOSED';

export interface IncidentLocation {
  address: string;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  priorityRecommendation?: {
    recommendedPriority: IncidentPriority;
    score: number;
    explanation: string;
    evidence: string[];
    missingInfo: string[];
    confidence: number;
  };
  location: IncidentLocation;
  casualtiesCount: number;
  reporterId?: string;
  reporterName?: string;
  reporterContact?: string;
  imageUrl?: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType =
  | 'AMBULANCE'
  | 'FIRE_UNIT'
  | 'POLICE_PATROL'
  | 'RESCUE_TEAM'
  | 'GENERAL_SUPPORT';

export type ResourceStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'UNAVAILABLE';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  latitude: number;
  longitude: number;
  address: string;
  capacity: string;
  operationalNotes: string;
  assignedIncidentId: string | null;
  isDemo: boolean;
  lastVerifiedAt: string;
}

export type AssignmentStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED';

export interface ResourceAssignment {
  id: string;
  incidentId: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  status: AssignmentStatus;
  distanceKm: number;
  estimatedDurationMins: number;
  matchScore: number;
  recommendationReason: string;
  rejectionReason?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  releasedAt?: string;
}

export type AgentWorkflowState =
  | 'RECEIVED'
  | 'VALIDATING'
  | 'ANALYZING'
  | 'ASSESSING_PRIORITY'
  | 'CHECKING_RESOURCES'
  | 'PLANNING_ROUTE'
  | 'PREPARING_NOTIFICATIONS'
  | 'AWAITING_OPERATOR_APPROVAL'
  | 'COMPLETED'
  | 'FAILED';

export interface AgentEvent {
  id: string;
  runId: string;
  incidentId: string;
  agentName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  stepOrder: number;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  timestamp: string;
  error?: string;
}

export interface AgentRun {
  id: string;
  incidentId: string;
  workflowState: AgentWorkflowState;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  errorMessage?: string;
  events: AgentEvent[];
  structuredOutput?: {
    analysis?: {
      normalizedCategory: IncidentCategory;
      extractedFacts: string[];
      knownUncertainties: string[];
      missingInformation: string[];
      resourceNeeds: string[];
      explanation: string;
    };
    priority?: {
      score: number;
      recommendedPriority: IncidentPriority;
      explanation: string;
      evidence: string[];
      missingInfo: string[];
      confidence: number;
    };
    candidateResources?: Array<{
      resourceId: string;
      resourceName: string;
      resourceType: ResourceType;
      distanceKm: number;
      estimatedMinutes: number;
      matchReason: string;
      conflictDetected: boolean;
      conflictDetails?: string;
    }>;
    routePlan?: {
      status: 'SUCCESS' | 'PREREQUISITE_FAILED' | 'UNREACHABLE';
      distanceKm?: number;
      estimatedMinutes?: number;
      steps?: string[];
      polyline?: [number, number][];
      message: string;
    };
    notificationsPrepared?: Array<{
      title: string;
      message: string;
      recipientRole: UserRole;
    }>;
    specializedConsensus?: MultiAgentConsensusMessage[];
    specializedAgents?: SpecializedAgent[];
  };
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  targetRole?: UserRole;
  title: string;
  message: string;
  incidentId?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalActive: number;
  awaitingReview: number;
  highOrCriticalPriority: number;
  availableUnits: number;
  assignedUnits: number;
  resolvedIncidents: number;
  priorityCounts: Record<IncidentPriority, number>;
  categoryCounts: Record<IncidentCategory, number>;
  statusCounts: Record<IncidentStatus, number>;
}

export type SpecializedAgentId =
  | 'POLICE_TACTICAL'
  | 'HOSPITAL_EMS'
  | 'WATER_HYDRO'
  | 'CURRENT_KEB';

export interface SpecializedAgentMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  status: 'nominal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export interface SpecializedAgentAction {
  id: string;
  label: string;
  description: string;
  category: 'CORDON' | 'DISPATCH' | 'TELEMETRY' | 'SAFETY_LOCKOUT' | 'SURGE' | 'TRIAGE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'READY' | 'TRIGGERED' | 'EXECUTING' | 'COMPLETED';
}

export type AgentStatusType = 'Online' | 'Offline' | 'Busy' | 'Error' | 'Not Configured' | 'Status Unavailable';

export interface SpecializedAgent {
  id: SpecializedAgentId;
  name: string;
  code: string;
  sector: string;
  roleDescription: string;
  description: string;
  status: AgentStatusType;
  currentTask: string | null;
  assignedIncidentId?: string | null;
  assignedIncidentTitle?: string | null;
  lastUpdated?: string | null;
  liveAssessment: string;
  actions: SpecializedAgentAction[];
  suggestedPrompts?: string[];
  consensusDialogue?: string[];
}

export interface SpecializedAgentChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  incidentId?: string | null;
}

export interface UserLocationContext {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface SpecializedAgentChatResponse {
  agentId: SpecializedAgentId;
  agentName: string;
  reply: string;
  language?: 'en' | 'hi' | 'kn';
  timestamp: string;
  providerStatus: AgentStatusType;
  providerNotice?: string | null;
  userLocation?: UserLocationContext | null;
  nearbyFacilities?: Array<{
    id: string;
    name: string;
    type: string;
    address: string;
    contactPhone?: string;
    distanceKm: number;
  }>;
  incidentContext?: {
    id: string;
    title: string;
    category: string;
    priority: string;
    address: string;
  } | null;
  incidentDraft?: {
    isIncidentReport: boolean;
    readyToSubmit: boolean;
    category: IncidentCategory;
    title: string;
    description: string;
    address: string;
    casualtiesCount: number;
    priority: IncidentPriority;
    summaryText: string;
    missingFields: string[];
  } | null;
  createdIncidentId?: string | null;
  updatedAgent: SpecializedAgent;
}

export interface MultiAgentConsensusMessage {
  id: string;
  agentId: SpecializedAgentId;
  agentName: string;
  code: string;
  timestamp: string;
  message: string;
  phase: 'INGEST' | 'ASSESSMENT' | 'CROSS_CHECK' | 'ACTION' | 'RESOLVED';
  status: 'INFO' | 'ACTION_REQUIRED' | 'INTERVENTION_EXECUTED' | 'CONSENSUS_REACHED';
}

export interface AgentPerformanceMetric {
  agentId: SpecializedAgentId;
  agentName: string;
  shortName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  completionRate: number;
  avgResponseTimeMs: number;
  lastResponseTimeMs: number | null;
}

export interface GridEfficiencySummary {
  totalTasks: number;
  completedTasks: number;
  overallCompletionRate: number;
  overallAvgResponseTimeMs: number;
  agents: AgentPerformanceMetric[];
  recentTimeline: Array<{
    timestamp: string;
    label: string;
    agentName: string;
    responseTimeMs: number;
    status: 'COMPLETED' | 'FAILED';
  }>;
}

export interface AICommandResponse {
  command: string;
  routedAgentId: SpecializedAgentId;
  routedAgentName: string;
  routedAgentCode: string;
  summary: string;
  matchingIncidents: Incident[];
  matchingResources: Resource[];
  suggestedActions: Array<{
    label: string;
    route: string;
    description: string;
  }>;
  providerStatus: AgentStatusType;
  providerNotice?: string | null;
  timestamp: string;
}

export type FacilityType =
  | 'POLICE_STATION'
  | 'HOSPITAL'
  | 'WATER_FACILITY'
  | 'POWER_SUBSTATION';

export interface EmergencyFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  operationalStatus: 'OPERATIONAL' | 'STANDBY' | 'BUSY';
  agentDomain: SpecializedAgentId;
  details: string;
  verified: true;
}




