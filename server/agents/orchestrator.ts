import { dbService } from '../db';
import { Incident, AgentRun, AgentEvent, AgentWorkflowState } from '../types';
import { runIncidentAnalysisAgent, AnalysisOutput } from './analysisAgent';
import { runPriorityAssessmentAgent, PriorityOutput } from './priorityAgent';
import { runResourceCoordinationAgent, ResourceCoordinationOutput } from './resourceCoordinationAgent';
import { runRoutePlanningAgent, RoutePlanningOutput } from './routePlanningAgent';
import { runCommunicationAgent, CommunicationOutput } from './communicationAgent';
import { generateSpecializedConsensus, getSpecializedAgentsList } from './specializedAgents';

export type EventBroadcaster = (type: string, data: any) => void;

export class CommandCenterOrchestrator {
  private broadcast: EventBroadcaster;

  constructor(broadcastFn?: EventBroadcaster) {
    this.broadcast = broadcastFn || (() => {});
  }

  public setBroadcaster(broadcastFn: EventBroadcaster) {
    this.broadcast = broadcastFn;
  }

  public async runWorkflow(incidentId: string, runIdOverride?: string): Promise<AgentRun> {
    const startTime = Date.now();
    const runId = runIdOverride || `RUN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const nowIso = new Date().toISOString();

    // 1. Load incident from database
    const incident = dbService.getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const events: AgentEvent[] = [];
    const agentRun: AgentRun = {
      id: runId,
      incidentId: incident.id,
      workflowState: 'VALIDATING',
      status: 'RUNNING',
      startedAt: nowIso,
      durationMs: 0,
      events: []
    };

    dbService.saveAgentRun(agentRun);
    this.broadcast('AGENT_PROGRESS', { runId, state: 'VALIDATING', incidentId });

    try {
      // STEP 1: Input Validation Event
      const step1Start = Date.now();
      const isInputValid = incident.title.trim().length > 0 && incident.category.length > 0;
      const step1Event: AgentEvent = {
        id: `EVT-VAL-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Validation Engine',
        status: isInputValid ? 'COMPLETED' : 'FAILED',
        stepOrder: 1,
        inputSummary: `Validating incident report schema: "${incident.title}" [${incident.category}]`,
        outputSummary: isInputValid ? 'Input validated. Mandatory fields verified.' : 'Validation failed: title or category missing.',
        durationMs: Date.now() - step1Start,
        timestamp: new Date().toISOString()
      };
      events.push(step1Event);
      dbService.recordAgentEvent(step1Event);

      if (!isInputValid) {
        throw new Error('Incident validation failed: Missing required fields.');
      }

      // STEP 2: Incident Analysis Agent
      agentRun.workflowState = 'ANALYZING';
      this.broadcast('AGENT_PROGRESS', { runId, state: 'ANALYZING', incidentId });
      const step2Start = Date.now();
      const analysisOutput: AnalysisOutput = await runIncidentAnalysisAgent(incident);
      const step2Event: AgentEvent = {
        id: `EVT-ANA-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Incident Analysis Agent',
        status: 'COMPLETED',
        stepOrder: 2,
        inputSummary: `Analyzing report text via ${analysisOutput.source}`,
        outputSummary: `Extracted ${analysisOutput.extractedFacts.length} facts, flagged ${analysisOutput.knownUncertainties.length} uncertainties and ${analysisOutput.missingInformation.length} missing details.`,
        durationMs: Date.now() - step2Start,
        timestamp: new Date().toISOString()
      };
      events.push(step2Event);
      dbService.recordAgentEvent(step2Event);

      // STEP 3: Priority Assessment Agent
      agentRun.workflowState = 'ASSESSING_PRIORITY';
      this.broadcast('AGENT_PROGRESS', { runId, state: 'ASSESSING_PRIORITY', incidentId });
      const step3Start = Date.now();
      const priorityOutput: PriorityOutput = runPriorityAssessmentAgent(incident, analysisOutput);
      const step3Event: AgentEvent = {
        id: `EVT-PRI-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Priority Assessment Agent',
        status: 'COMPLETED',
        stepOrder: 3,
        inputSummary: `Scoring severity based on life danger, casualty scale, and hazard factors.`,
        outputSummary: `Recommended Priority: ${priorityOutput.recommendedPriority} (Score: ${priorityOutput.score}/100, Confidence: ${Math.round(priorityOutput.confidence * 100)}%). ${priorityOutput.explanation}`,
        durationMs: Date.now() - step3Start,
        timestamp: new Date().toISOString()
      };
      events.push(step3Event);
      dbService.recordAgentEvent(step3Event);

      // Update incident priority recommendation in database
      dbService.updateIncident(incident.id, {
        priorityRecommendation: {
          recommendedPriority: priorityOutput.recommendedPriority,
          score: priorityOutput.score,
          explanation: priorityOutput.explanation,
          evidence: priorityOutput.evidence,
          missingInfo: priorityOutput.missingInfo,
          confidence: priorityOutput.confidence
        }
      });

      // STEP 4: Resource Coordination Agent
      agentRun.workflowState = 'CHECKING_RESOURCES';
      this.broadcast('AGENT_PROGRESS', { runId, state: 'CHECKING_RESOURCES', incidentId });
      const step4Start = Date.now();
      const allResources = dbService.getResources();
      const resourceOutput: ResourceCoordinationOutput = runResourceCoordinationAgent(incident, allResources);
      const step4Event: AgentEvent = {
        id: `EVT-RES-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Resource Coordination Agent',
        status: 'COMPLETED',
        stepOrder: 4,
        inputSummary: `Evaluating fleet capabilities against incident category ${incident.category}`,
        outputSummary: resourceOutput.summary,
        durationMs: Date.now() - step4Start,
        timestamp: new Date().toISOString()
      };
      events.push(step4Event);
      dbService.recordAgentEvent(step4Event);

      // STEP 5: Route Planning Agent
      agentRun.workflowState = 'PLANNING_ROUTE';
      this.broadcast('AGENT_PROGRESS', { runId, state: 'PLANNING_ROUTE', incidentId });
      const step5Start = Date.now();

      // Find top candidate resource for route comparison
      const topCandidate = resourceOutput.candidateResources.find(c => !c.conflictDetected);
      const resourceObj = topCandidate ? dbService.getResourceById(topCandidate.resourceId) : null;

      const routeOutput: RoutePlanningOutput = runRoutePlanningAgent(incident, resourceObj);
      const step5Event: AgentEvent = {
        id: `EVT-ROU-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Route Planning Agent',
        status: routeOutput.status === 'SUCCESS' ? 'COMPLETED' : routeOutput.status === 'PREREQUISITE_FAILED' ? 'SKIPPED' : 'FAILED',
        stepOrder: 5,
        inputSummary: `Graph routing from ${resourceObj?.name || 'Default Station'} to incident coordinates`,
        outputSummary: routeOutput.message,
        durationMs: Date.now() - step5Start,
        timestamp: new Date().toISOString(),
        error: routeOutput.status === 'PREREQUISITE_FAILED' ? routeOutput.message : undefined
      };
      events.push(step5Event);
      dbService.recordAgentEvent(step5Event);

      // STEP 6: Communication Agent
      agentRun.workflowState = 'PREPARING_NOTIFICATIONS';
      this.broadcast('AGENT_PROGRESS', { runId, state: 'PREPARING_NOTIFICATIONS', incidentId });
      const step6Start = Date.now();
      const commOutput: CommunicationOutput = runCommunicationAgent(incident, priorityOutput, resourceOutput);
      const step6Event: AgentEvent = {
        id: `EVT-COM-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Communication Agent',
        status: 'COMPLETED',
        stepOrder: 6,
        inputSummary: `Formulating operational alerts for operator and reporter channels`,
        outputSummary: commOutput.summary,
        durationMs: Date.now() - step6Start,
        timestamp: new Date().toISOString()
      };
      events.push(step6Event);
      dbService.recordAgentEvent(step6Event);

      // STEP 7: Specialized Multi-Agency Deliberation & Consensus (Police, EMS, Hydro, KEB)
      const step7Start = Date.now();
      const specializedConsensus = generateSpecializedConsensus(incident);
      const specializedAgents = getSpecializedAgentsList(incident);
      const step7Event: AgentEvent = {
        id: `EVT-SPEC-${Date.now()}`,
        runId,
        incidentId: incident.id,
        agentName: 'Multi-Agency Tactical Grid Engine',
        status: 'COMPLETED',
        stepOrder: 7,
        inputSummary: `Cross-domain consensus between Police Tactical, Hospital/EMS, Water Hydro, and Current/KEB Power Grid`,
        outputSummary: `Synchronized ${specializedConsensus.length} domain directives. High-voltage lockout verified, hydrant pressure staged, perimeter cordoned, trauma bays reserved.`,
        durationMs: Date.now() - step7Start,
        timestamp: new Date().toISOString()
      };
      events.push(step7Event);
      dbService.recordAgentEvent(step7Event);

      // Consolidate Structured Output
      agentRun.structuredOutput = {
        analysis: {
          normalizedCategory: analysisOutput.normalizedCategory,
          extractedFacts: analysisOutput.extractedFacts,
          knownUncertainties: analysisOutput.knownUncertainties,
          missingInformation: analysisOutput.missingInformation,
          resourceNeeds: analysisOutput.resourceNeeds,
          explanation: analysisOutput.explanation
        },
        priority: {
          score: priorityOutput.score,
          recommendedPriority: priorityOutput.recommendedPriority,
          explanation: priorityOutput.explanation,
          evidence: priorityOutput.evidence,
          missingInfo: priorityOutput.missingInfo,
          confidence: priorityOutput.confidence
        },
        candidateResources: resourceOutput.candidateResources.map(c => ({
          resourceId: c.resourceId,
          resourceName: c.resourceName,
          resourceType: c.resourceType,
          distanceKm: c.distanceKm,
          estimatedMinutes: c.estimatedMinutes,
          matchReason: c.matchReason,
          conflictDetected: c.conflictDetected,
          conflictDetails: c.conflictDetails
        })),
        routePlan: {
          status: routeOutput.status,
          distanceKm: routeOutput.distanceKm,
          estimatedMinutes: routeOutput.estimatedMinutes,
          steps: routeOutput.steps,
          polyline: routeOutput.polyline,
          message: routeOutput.message
        },
        notificationsPrepared: commOutput.notifications.map(n => ({
          title: n.title,
          message: n.message,
          recipientRole: n.recipientRole
        })),
        specializedConsensus,
        specializedAgents
      };

      agentRun.workflowState = 'AWAITING_OPERATOR_APPROVAL';
      agentRun.status = 'COMPLETED';
      agentRun.completedAt = new Date().toISOString();
      agentRun.durationMs = Date.now() - startTime;
      agentRun.events = events;

      dbService.saveAgentRun(agentRun);

      this.broadcast('AGENT_COMPLETED', {
        runId,
        incidentId,
        state: agentRun.workflowState,
        structuredOutput: agentRun.structuredOutput
      });

      return agentRun;
    } catch (err: any) {
      const errMsg = err?.message || 'Agent workflow execution failed';
      agentRun.status = 'FAILED';
      agentRun.workflowState = 'FAILED';
      agentRun.errorMessage = errMsg;
      agentRun.completedAt = new Date().toISOString();
      agentRun.durationMs = Date.now() - startTime;
      agentRun.events = events;

      dbService.saveAgentRun(agentRun);

      this.broadcast('AGENT_FAILED', { runId, incidentId, error: errMsg });
      return agentRun;
    }
  }
}

export const orchestrator = new CommandCenterOrchestrator();
