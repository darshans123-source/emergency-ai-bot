import {
  SpecializedAgent,
  SpecializedAgentId,
  MultiAgentConsensusMessage,
  Incident,
  SpecializedAgentChatMessage,
  SpecializedAgentChatResponse,
  AgentStatusType,
  AgentPerformanceMetric,
  GridEfficiencySummary,
  AICommandResponse
} from '../types';
import { dbService } from '../db';
import { GoogleGenAI } from '@google/genai';
import { runIncidentAnalysisAgent } from './analysisAgent';
import { runPriorityAssessmentAgent } from './priorityAgent';
import { runResourceCoordinationAgent } from './resourceCoordinationAgent';

interface AgentExecutionLog {
  actionId: string;
  timestamp: string;
  details: string;
  durationMs: number;
  status: 'COMPLETED' | 'FAILED';
}

const actionLogs: Record<SpecializedAgentId, AgentExecutionLog[]> = {
  POLICE_TACTICAL: [],
  HOSPITAL_EMS: [],
  WATER_HYDRO: [],
  CURRENT_KEB: []
};

export const AGENT_SUGGESTED_PROMPTS: Record<SpecializedAgentId, string[]> = {
  POLICE_TACTICAL: [
    'Analyze this security incident.',
    'Suggest public safety precautions.',
    'Review this incident report.'
  ],
  HOSPITAL_EMS: [
    'Summarize this medical emergency.',
    'Identify missing casualty information.',
    'Suggest medical coordination steps.'
  ],
  WATER_HYDRO: [
    'Analyze this water infrastructure incident.',
    'Identify possible water supply risks.',
    'Suggest inspection priorities.'
  ],
  CURRENT_KEB: [
    'Analyze this electrical infrastructure incident.',
    'Identify reported electrical hazards.',
    'Suggest coordination steps.'
  ]
};

function getAgentConnectionStatus(): AgentStatusType {
  // Specialized agent modules are integrated with the server; check if external LLM or local domain engine is active
  return 'Online';
}

export function getSpecializedAgentsList(specificIncident?: Incident | null): SpecializedAgent[] {
  const allIncidents = dbService.getIncidents();
  const activeIncidents = allIncidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  );

  const connectionStatus = getAgentConnectionStatus();

  // 1. Police Tactical Agent
  const policeIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'ROAD_ACCIDENT' || i.category === 'PUBLIC_SAFETY') ||
    activeIncidents[0] ||
    null;

  const policeLastLog = actionLogs.POLICE_TACTICAL[0];

  const policeAgent: SpecializedAgent = {
    id: 'POLICE_TACTICAL',
    name: 'Police Tactical Agent',
    code: 'POL-TAC-01',
    sector: 'Security & Law Enforcement',
    roleDescription: 'Coordinates perimeter security, public safety precautions, and traffic control.',
    description: 'Coordinates perimeter security, public safety precautions, and traffic control.',
    status: connectionStatus,
    currentTask: policeLastLog
      ? policeLastLog.details
      : policeIncident
      ? `Monitoring ${policeIncident.id}: ${policeIncident.title}`
      : 'No Active Task',
    assignedIncidentId: policeIncident ? policeIncident.id : null,
    assignedIncidentTitle: policeIncident ? policeIncident.title : null,
    lastUpdated: policeLastLog ? policeLastLog.timestamp : policeIncident?.updatedAt || null,
    liveAssessment: policeIncident
      ? `Incident ${policeIncident.id} (${policeIncident.title}) at ${policeIncident.location.address}. Ready for security and public safety analysis.`
      : 'No active security incident selected. Ready for incident analysis or public safety inquiries.',
    suggestedPrompts: AGENT_SUGGESTED_PROMPTS.POLICE_TACTICAL,
    actions: [
      {
        id: 'POLICE_LOCKDOWN_500M',
        label: 'Enact Perimeter Cordon',
        description: 'Deploy barricades and secure the surrounding perimeter.',
        category: 'CORDON',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'POLICE_TRAFFIC_DIVERSION',
        label: 'Reroute Traffic Arteries',
        description: 'Clear emergency transit corridor around the incident.',
        category: 'CORDON',
        riskLevel: 'LOW',
        status: 'READY'
      }
    ],
    consensusDialogue: []
  };

  // 2. Hospital & EMS Agent
  const emsIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'MEDICAL_EMERGENCY' || i.casualtiesCount > 0) ||
    activeIncidents[0] ||
    null;

  const emsLastLog = actionLogs.HOSPITAL_EMS[0];

  const emsAgent: SpecializedAgent = {
    id: 'HOSPITAL_EMS',
    name: 'Hospital & EMS Agent',
    code: 'EMS-MED-02',
    sector: 'Emergency Medical Services & Healthcare',
    roleDescription: 'Coordinates medical triage, casualty assessment, and ambulance dispatch.',
    description: 'Coordinates medical triage, casualty assessment, and ambulance dispatch.',
    status: connectionStatus,
    currentTask: emsLastLog
      ? emsLastLog.details
      : emsIncident
      ? `Monitoring ${emsIncident.id}: ${emsIncident.title}`
      : 'No Active Task',
    assignedIncidentId: emsIncident ? emsIncident.id : null,
    assignedIncidentTitle: emsIncident ? emsIncident.title : null,
    lastUpdated: emsLastLog ? emsLastLog.timestamp : emsIncident?.updatedAt || null,
    liveAssessment: emsIncident
      ? `Incident ${emsIncident.id} reports ${emsIncident.casualtiesCount} casualties at ${emsIncident.location.address}. Ready for medical triage evaluation.`
      : 'No active medical emergency selected. Ready for casualty triage and EMS coordination inquiries.',
    suggestedPrompts: AGENT_SUGGESTED_PROMPTS.HOSPITAL_EMS,
    actions: [
      {
        id: 'EMS_RESERVE_TRAUMA_BAYS',
        label: 'Reserve Trauma Bays',
        description: 'Coordinate trauma intake capacity at nearest medical center.',
        category: 'TRIAGE',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'EMS_DYNAMIC_AMBULANCE_BALANCE',
        label: 'Coordinate Ambulance Dispatch',
        description: 'Align paramedic units with reported casualty needs.',
        category: 'DISPATCH',
        riskLevel: 'LOW',
        status: 'READY'
      }
    ],
    consensusDialogue: []
  };

  // 3. Water Supply & Hydro Agent
  const hydroIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'FIRE_INCIDENT' || i.category === 'FLOOD') ||
    activeIncidents[0] ||
    null;

  const hydroLastLog = actionLogs.WATER_HYDRO[0];

  const hydroAgent: SpecializedAgent = {
    id: 'WATER_HYDRO',
    name: 'Water Supply & Hydro Agent',
    code: 'HYD-WTR-03',
    sector: 'Water Infrastructure & Hydrology',
    roleDescription: 'Assesses water infrastructure incidents, supply risks, hydrant pressure, and drainage.',
    description: 'Assesses water infrastructure incidents, supply risks, hydrant pressure, and drainage.',
    status: connectionStatus,
    currentTask: hydroLastLog
      ? hydroLastLog.details
      : hydroIncident
      ? `Monitoring ${hydroIncident.id}: ${hydroIncident.title}`
      : 'No Active Task',
    assignedIncidentId: hydroIncident ? hydroIncident.id : null,
    assignedIncidentTitle: hydroIncident ? hydroIncident.title : null,
    lastUpdated: hydroLastLog ? hydroLastLog.timestamp : hydroIncident?.updatedAt || null,
    liveAssessment: hydroIncident
      ? `Monitoring water infrastructure context for ${hydroIncident.id} at ${hydroIncident.location.address}.`
      : 'No active water or fire incident selected. Ready for water supply risk and inspection analysis.',
    suggestedPrompts: AGENT_SUGGESTED_PROMPTS.WATER_HYDRO,
    actions: [
      {
        id: 'HYDRO_SURGE_PRESSURE',
        label: 'Boost Hydrant Pressure',
        description: 'Support fire suppression flow near incident location.',
        category: 'SURGE',
        riskLevel: 'MEDIUM',
        status: 'READY'
      },
      {
        id: 'HYDRO_ISOLATE_MAIN',
        label: 'Isolate Water Main Valve',
        description: 'Isolate damaged water main section to prevent flooding or contamination.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'MEDIUM',
        status: 'READY'
      }
    ],
    consensusDialogue: []
  };

  // 4. Power Grid / KEB Agent
  const kebIncident =
    specificIncident ||
    activeIncidents.find(
      (i) =>
        i.category === 'FIRE_INCIDENT' ||
        i.description.toLowerCase().includes('electrical') ||
        i.description.toLowerCase().includes('wire') ||
        i.description.toLowerCase().includes('power')
    ) ||
    activeIncidents[0] ||
    null;

  const kebLastLog = actionLogs.CURRENT_KEB[0];

  const kebAgent: SpecializedAgent = {
    id: 'CURRENT_KEB',
    name: 'Power Grid / KEB Agent',
    code: 'KEB-PWR-04',
    sector: 'Electricity Infrastructure & Grid Safety',
    roleDescription: 'Evaluates electrical hazards, feeder line de-energization, and utility coordination.',
    description: 'Evaluates electrical hazards, feeder line de-energization, and utility coordination.',
    status: connectionStatus,
    currentTask: kebLastLog
      ? kebLastLog.details
      : kebIncident
      ? `Monitoring ${kebIncident.id}: ${kebIncident.title}`
      : 'No Active Task',
    assignedIncidentId: kebIncident ? kebIncident.id : null,
    assignedIncidentTitle: kebIncident ? kebIncident.title : null,
    lastUpdated: kebLastLog ? kebLastLog.timestamp : kebIncident?.updatedAt || null,
    liveAssessment: kebIncident
      ? `Evaluating electrical infrastructure safety for ${kebIncident.id} at ${kebIncident.location.address}.`
      : 'No active electrical incident selected. Ready for electrical hazard identification and coordination.',
    suggestedPrompts: AGENT_SUGGESTED_PROMPTS.CURRENT_KEB,
    actions: [
      {
        id: 'KEB_DE_ENERGIZE_FEEDER',
        label: 'De-energize Incident Feeder',
        description: 'Isolate local electrical feeder line to protect responders.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'HIGH',
        status: 'READY'
      },
      {
        id: 'KEB_PRIORITY_HOSPITAL_FEEDER',
        label: 'Verify Priority Medical Power',
        description: 'Confirm backup feeder stability for emergency facilities.',
        category: 'TELEMETRY',
        riskLevel: 'LOW',
        status: 'READY'
      }
    ],
    consensusDialogue: []
  };

  return [policeAgent, emsAgent, hydroAgent, kebAgent];
}

export function executeSpecializedAgentAction(
  agentId: SpecializedAgentId,
  actionId: string,
  incidentId?: string,
  operatorName: string = 'Command Center Operator'
): { success: boolean; message: string; updatedAgent: SpecializedAgent } {
  const startTime = Date.now();
  const agents = getSpecializedAgentsList();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    throw new Error(`Specialized Agent ${agentId} not recognized`);
  }

  const action = agent.actions.find((a) => a.id === actionId);
  if (!action) {
    throw new Error(`Action ${actionId} not found on agent ${agentId}`);
  }

  const nowIso = new Date().toISOString();
  const logMsg = `Directive "${action.label}" executed by ${operatorName}${incidentId ? ` for ${incidentId}` : ''}`;
  const durationMs = Math.max(1, Date.now() - startTime);

  actionLogs[agentId].unshift({
    actionId,
    timestamp: nowIso,
    details: `${action.label}${incidentId ? ` (${incidentId})` : ''}`,
    durationMs,
    status: 'COMPLETED'
  });

  dbService.logAudit({
    userId: 'USR-OPERATOR-01',
    userEmail: 'operator@emergency.gov',
    userRole: 'operator',
    action: 'AGENT_DIRECTIVE_EXECUTED',
    entityType: 'AGENT',
    entityId: `${agentId}:${actionId}`,
    details: logMsg
  });

  const updatedList = getSpecializedAgentsList();
  const updatedAgent = updatedList.find((a) => a.id === agentId) || agent;

  return {
    success: true,
    message: logMsg,
    updatedAgent
  };
}

function getAgentSystemInstruction(agentId: SpecializedAgentId, incidentContextText: string): string {
  const baseRules = `CRITICAL RULES:
- Respond ONLY from your specialized domain perspective.
- Never fabricate incident counts, confidence percentages, latency metrics, or unverified facts.
- Base your response strictly on the user's message and the provided incident context.
- Keep your response structured, practical, and concise with clear headings or bullet points where helpful.

${incidentContextText}`;

  switch (agentId) {
    case 'POLICE_TACTICAL':
      return `You are the Police Tactical Agent (POL-TAC-01) in the AEGISAI GRID Command Center.
Your domain is strictly Law Enforcement, Public Safety, Perimeter Control, Crowd Protection, Traffic Diversion, and Security Incident Review.
Do NOT act as a medical doctor, water engineer, or electrical utility engineer. Focus on:
1. Security threat & scene safety assessment
2. Perimeter cordon & access corridor control for emergency responders
3. Public safety precautions & evacuation/traffic management
4. Missing law-enforcement/witness details to verify

${baseRules}`;

    case 'HOSPITAL_EMS':
      return `You are the Hospital & EMS Agent (EMS-MED-02) in the AEGISAI GRID Command Center.
Your domain is strictly Emergency Medical Services (EMS), Casualty Triage, Trauma Coordination, Ambulance Dispatch, and Missing Medical Information Identification.
Do NOT act as a police tactical commander, water utility engineer, or power grid operator. Focus on:
1. Medical emergency summary & casualty severity assessment
2. Missing casualty/patient information (e.g., exact headcount, mechanism of injury, airway/breathing status, entrapment)
3. Ambulance staging & hospital receiving coordination steps
4. Responder medical safety precautions

${baseRules}`;

    case 'WATER_HYDRO':
      return `You are the Water Supply & Hydro Agent (HYD-WTR-03) in the AEGISAI GRID Command Center.
Your domain is strictly Municipal Water Infrastructure, Fire Hydrant Pressure Support, Water Main Isolation, Contamination Prevention, and Flood/Drainage Risk Management.
Do NOT act as a police officer, paramedic, or electrical grid operator. Focus on:
1. Water infrastructure & hydrological impact analysis
2. Potential water supply, pressure loss, or contamination risks
3. Hydrant pressure support (if fire is involved) or valve isolation/drainage priorities (if flood/leak is involved)
4. Field inspection priorities for hydro crews

${baseRules}`;

    case 'CURRENT_KEB':
      return `You are the Power Grid / KEB Agent (KEB-PWR-04) in the AEGISAI GRID Command Center.
Your domain is strictly Electrical Infrastructure, High-Voltage Grid Safety, Downed Wire/Transformer Hazards, Feeder De-energization, and Priority Backup Power Coordination.
Do NOT act as a police officer, paramedic, or water utility operator. Focus on:
1. Electrical infrastructure & grid hazard analysis
2. Identification of reported or potential electrical hazards (downed lines, energized water, transformer faults, arc risks)
3. Feeder line de-energization & lockout/tagout coordination steps to protect first responders
4. Critical facility power continuity (hospitals, pumps, shelters)

${baseRules}`;
  }
}

async function generateDomainSpecificFallback(
  agentId: SpecializedAgentId,
  userMessage: string,
  incident: Incident | null
): Promise<string> {
  const analysis = incident ? await runIncidentAnalysisAgent(incident) : null;
  const priority = incident && analysis ? runPriorityAssessmentAgent(incident, analysis) : null;
  const resources = dbService.getResources();
  const coordination = incident ? runResourceCoordinationAgent(incident, resources) : null;

  const msgLower = userMessage.toLowerCase();
  const combinedText = `${userMessage} ${incident ? `${incident.title} ${incident.description} ${incident.location.address}` : ''}`.toLowerCase();

  if (agentId === 'POLICE_TACTICAL') {
    const policeUnits = resources.filter((r) => r.type === 'POLICE_PATROL');
    const availablePolice = policeUnits.filter((r) => r.status === 'AVAILABLE');

    const lines: string[] = [
      `### Police Tactical Agent Assessment`
    ];

    if (incident) {
      lines.push(
        `**Incident Context:** ${incident.id} — ${incident.title} (${incident.category}, Priority: ${priority?.recommendedPriority || incident.priority})`,
        `**Location:** ${incident.location.address} (${incident.location.verified ? 'Coordinates Verified' : 'Coordinates Unverified'})`
      );
    } else {
      lines.push(`**Context:** General Security & Public Safety Evaluation (No active incident attached)`);
    }

    if (msgLower.includes('precaution') || msgLower.includes('safety')) {
      lines.push(
        `\n**Recommended Public Safety Precautions:**`,
        `- Establish an immediate safety perimeter around the affected area to restrict unauthorized civilian entry.`,
        `- Keep emergency ingress and egress lanes unobstructed for incoming response vehicles.`,
        `- Advise nearby residents and bystanders to remain clear of potential secondary hazards (${combinedText.includes('fire') || combinedText.includes('smoke') ? 'smoke plume and suppression zone' : combinedText.includes('wire') || combinedText.includes('power') ? 'downed utility lines' : 'active incident roadway'}).`,
        `- Coordinate with local traffic control to divert non-essential vehicles away from ${incident ? incident.location.address : 'the reported sector'}.`
      );
    } else if (msgLower.includes('review') || msgLower.includes('report')) {
      lines.push(
        `\n**Incident Report Security Review:**`,
        `- **Verified Facts:** ${analysis ? analysis.extractedFacts.join('; ') : 'Reviewing user-submitted statement: "' + userMessage + '"'}`,
        `- **Information Gaps to Confirm:** ${analysis ? analysis.missingInformation.join('; ') : 'Exact cross-street boundaries, number of involved vehicles/individuals, and whether road access is blocked.'}`,
        `- **Patrol Availability:** ${availablePolice.length} of ${policeUnits.length} registered police patrol units currently marked AVAILABLE.`
      );
    } else {
      lines.push(
        `\n**Security & Tactical Analysis:**`,
        `- **Scene Control:** ${incident ? `Incident ${incident.id} requires perimeter control at ${incident.location.address}.` : 'Evaluate scene boundaries and secure access corridors before secondary units arrive.'}`,
        `- **Identified Risks:** ${analysis ? analysis.extractedFacts.join('; ') : 'Potential roadway obstruction, bystander crowding, or unverified perimeter access.'}`,
        `- **Recommended Police Actions:**`,
        `  1. Dispatch nearest patrol unit (${availablePolice[0]?.name || 'Patrol Unit'}) to verify scene coordinates and establish outer cordon.`,
        `  2. Secure dedicated emergency transit lane for EMS and utility crews.`,
        `  3. Confirm witness statements and log any road closures with Command Center.`
      );
    }

    return lines.join('\n');
  }

  if (agentId === 'HOSPITAL_EMS') {
    const ambulances = resources.filter((r) => r.type === 'AMBULANCE');
    const availableAmbulances = ambulances.filter((r) => r.status === 'AVAILABLE');

    const lines: string[] = [
      `### Hospital & EMS Agent Assessment`
    ];

    if (incident) {
      lines.push(
        `**Medical Context:** ${incident.id} — ${incident.title}`,
        `**Reported Casualties:** ${incident.casualtiesCount} | **Location:** ${incident.location.address}`
      );
    } else {
      lines.push(`**Context:** Emergency Medical Triage & Coordination Inquiry`);
    }

    if (msgLower.includes('missing') || msgLower.includes('casualty')) {
      lines.push(
        `\n**Missing Casualty & Triage Information to Verify:**`,
        `- Exact number of injured individuals requiring immediate Advanced Life Support (ALS) vs. Basic Life Support (BLS).`,
        `- Patient consciousness, airway/breathing status, and presence of severe hemorrhage or burns.`,
        `- Whether any individuals are physically trapped or require extrication before medical transport.`,
        `- Safe ambulance staging point at ${incident ? incident.location.address : 'the incident scene'}.`
      );
    } else if (msgLower.includes('coordinat') || msgLower.includes('step')) {
      lines.push(
        `\n**Medical Coordination Steps:**`,
        `1. **Triage Staging:** Establish a primary triage collection point upwind and uphill of any active hazard at ${incident ? incident.location.address : 'the scene'}.`,
        `2. **Ambulance Allocation:** ${availableAmbulances.length} of ${ambulances.length} registered ambulance units are currently AVAILABLE (${availableAmbulances.map((a) => a.name).join(', ') || 'No units currently marked available'}).`,
        `3. **Hospital Notification:** Alert receiving trauma center of ${incident ? `${incident.casualtiesCount} reported casualties` : 'potential incoming patients'} and confirm trauma bay readiness.`,
        `4. **Responder Safety:** Confirm scene is cleared of electrical or structural hazards prior to paramedic entry.`
      );
    } else {
      lines.push(
        `\n**Medical Emergency Summary:**`,
        `- **Situation Overview:** ${incident ? `${incident.description} (${incident.casualtiesCount} casualties reported).` : `Evaluating submitted medical query: "${userMessage}".`}`,
        `- **Triage Assessment:** ${priority ? `${priority.recommendedPriority} priority — ${priority.explanation}` : 'Requires verification of patient count, injury mechanism, and vital status.'}`,
        `- **EMS Resource Readiness:** ${availableAmbulances.length} ambulance unit(s) available for dispatch.`
      );
    }

    return lines.join('\n');
  }

  if (agentId === 'WATER_HYDRO') {
    const isFire = combinedText.includes('fire') || combinedText.includes('flame') || combinedText.includes('smoke') || incident?.category === 'FIRE_INCIDENT';
    const isFlood = combinedText.includes('flood') || combinedText.includes('water') || combinedText.includes('leak') || combinedText.includes('pipe') || incident?.category === 'FLOOD';

    const lines: string[] = [
      `### Water Supply & Hydro Agent Assessment`
    ];

    if (incident) {
      lines.push(
        `**Infrastructure Context:** ${incident.id} — ${incident.title} at ${incident.location.address}`
      );
    } else {
      lines.push(`**Context:** Water Infrastructure & Hydrology Evaluation`);
    }

    if (msgLower.includes('risk') || msgLower.includes('supply')) {
      lines.push(
        `\n**Identified Water Supply & Hydrological Risks:**`,
        isFire
          ? `- High demand on local municipal fire hydrants during active suppression may reduce static main pressure in adjacent blocks.`
          : isFlood
          ? `- Risk of subterranean water main washout, stormwater drainage overflow, and potential backflow contamination into potable lines.`
          : `- Potential damage to underground water distribution mains or surface hydrants near the incident zone.`,
        `- Risk of firefighting or hazardous runoff entering municipal storm drains without containment.`,
        `- Need to verify shutoff valve accessibility around ${incident ? incident.location.address : 'the affected sector'}.`
      );
    } else if (msgLower.includes('inspection') || msgLower.includes('priorit')) {
      lines.push(
        `\n**Water Infrastructure Inspection Priorities:**`,
        `1. **Primary Hydrant & Valve Check:** Verify operational pressure and accessibility of fire hydrants and isolation valves nearest ${incident ? incident.location.address : 'the incident location'}.`,
        `2. **Main Integrity Inspection:** Check for pressure drops or surface seepage indicating a ruptured distribution line.`,
        `3. **Drainage & Runoff Control:** Inspect storm drain inlets and sluice channels to prevent roadway flooding or contaminant runoff.`,
        `4. **Potable Water Protection:** Confirm backflow preventers are active on nearby commercial and municipal feeds.`
      );
    } else {
      lines.push(
        `\n**Water & Hydro Infrastructure Analysis:**`,
        `- **Operational Focus:** ${
          isFire
            ? 'Active fire suppression support — prioritize municipal hydrant flow and booster station pressure.'
            : isFlood
            ? 'Inundation and main integrity control — prioritize valve isolation and stormwater drainage routing.'
            : 'Monitor local water main telemetry and hydrant readiness near the incident perimeter.'
        }`,
        `- **Recommended Hydro Actions:**`,
        `  1. Verify hydrant static pressure and flow capacity for responding fire apparatus.`,
        `  2. Locate nearest main isolation valves in case emergency shutoff is required.`,
        `  3. Coordinate with Police Tactical Agent to keep utility access covers clear of parked vehicles.`
      );
    }

    return lines.join('\n');
  }

  // CURRENT_KEB (Power Grid / KEB Agent)
  const hasElectricalKeyword =
    combinedText.includes('electric') ||
    combinedText.includes('power') ||
    combinedText.includes('wire') ||
    combinedText.includes('transformer') ||
    combinedText.includes('shock') ||
    combinedText.includes('outage') ||
    combinedText.includes('spark') ||
    incident?.category === 'FIRE_INCIDENT';

  const lines: string[] = [
    `### Power Grid / KEB Agent Assessment`
  ];

  if (incident) {
    lines.push(
      `**Grid Context:** ${incident.id} — ${incident.title} at ${incident.location.address}`
    );
  } else {
    lines.push(`**Context:** Electrical Infrastructure & Grid Safety Evaluation`);
  }

  if (msgLower.includes('hazard')) {
    lines.push(
      `\n**Reported & Potential Electrical Hazards:**`,
      hasElectricalKeyword
        ? `- Potential energized downed conductors, damaged transformer equipment, or compromised building service drops near ${incident ? incident.location.address : 'the scene'}.`
        : `- No explicit downed-wire report confirmed yet; however, Collisions, fires, or flooding near utility poles/substations carry secondary electrocution risks.`,
      `- Step-potential and touch-potential hazards if water or firefighting foam contacts energized equipment.`,
      `- Risk of unexpected automatic recloser activation on faulted distribution feeders if not locked out.`
    );
  } else if (msgLower.includes('coordinat') || msgLower.includes('step')) {
    lines.push(
      `\n**Electrical Grid Coordination Steps:**`,
      `1. **Responder Safety Lockout:** Verify whether local feeder de-energization is required before Fire/EMS personnel enter hazard zones.`,
      `2. **Substation & Feeder Isolation:** Isolate faulted distribution segments while maintaining power to surrounding traffic signals and critical facilities.`,
      `3. **Priority Medical Feeds:** Confirm uninterrupted power supply to regional hospitals and water booster stations.`,
      `4. **Utility Crew Dispatch:** Stage insulated high-voltage line crew to ground and clear any damaged conductors.`
    );
  } else {
    lines.push(
      `\n**Electrical Infrastructure Incident Analysis:**`,
      `- **Hazard Assessment:** ${
        hasElectricalKeyword
          ? 'Elevated electrical hazard profile detected. Treat all downed lines and damaged electrical enclosures as energized.'
          : 'Standard grid monitoring active. Verify clearance from overhead lines and pad-mounted transformers at the scene.'
      }`,
      `- **Recommended KEB / Grid Actions:**`,
      `  1. Identify the distribution feeder serving ${incident ? incident.location.address : 'the reported location'} and prepare remote breaker lockout if requested by on-scene command.`,
      `  2. Coordinate with Water & Hydro Agent to ensure water streams are not directed at energized high-voltage equipment.`,
      `  3. Maintain priority power routing for emergency medical and communications infrastructure.`
    );
  }

  return lines.join('\n');
}

export async function chatWithSpecializedAgent(
  agentId: SpecializedAgentId,
  message: string,
  history: SpecializedAgentChatMessage[] = [],
  incidentId?: string | null
): Promise<SpecializedAgentChatResponse> {
  const startTime = Date.now();
  const validIds: SpecializedAgentId[] = ['POLICE_TACTICAL', 'HOSPITAL_EMS', 'WATER_HYDRO', 'CURRENT_KEB'];
  if (!validIds.includes(agentId)) {
    throw new Error(`Invalid agentId: ${agentId}`);
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw new Error('Message cannot be empty.');
  }

  // Load target incident context if specified or if an active incident exists
  const allIncidents = dbService.getIncidents();
  const activeIncidents = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const incident: Incident | null = incidentId
    ? dbService.getIncidentById(incidentId) || null
    : activeIncidents[0] || null;

  const resources = dbService.getResources();
  const analysis = incident ? await runIncidentAnalysisAgent(incident) : null;
  const priority = incident && analysis ? runPriorityAssessmentAgent(incident, analysis) : null;

  const incidentContextBlock = incident
    ? `ACTIVE INCIDENT CONTEXT FROM SYSTEM DATABASE:
- Incident ID: ${incident.id}
- Title: ${incident.title}
- Category: ${incident.category}
- Priority: ${priority?.recommendedPriority || incident.priority}
- Status: ${incident.status}
- Description: ${incident.description}
- Reported Casualties: ${incident.casualtiesCount}
- Location: ${incident.location.address} (Coordinates: ${
        incident.location.latitude !== null && incident.location.longitude !== null
          ? `${incident.location.latitude}, ${incident.location.longitude}`
          : 'Not provided'
      }, Verified: ${incident.location.verified})
- Extracted Facts: ${analysis ? analysis.extractedFacts.join('; ') : 'None'}
- Missing Information: ${analysis ? analysis.missingInformation.join('; ') : 'None'}
- Registered Fleet Summary: ${resources.length} total units (${resources.filter((r) => r.status === 'AVAILABLE').length} available)`
    : `INCIDENT CONTEXT:
- No active incident is currently selected in the database (${allIncidents.length} total incidents on record).
- Registered Fleet Summary: ${resources.length} total units (${resources.filter((r) => r.status === 'AVAILABLE').length} available).
- Answer based on the incident details or question provided in the user's message.`;

  const systemInstruction = getAgentSystemInstruction(agentId, incidentContextBlock);

  const recentHistoryText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Operator' : 'Agent'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `${
    recentHistoryText ? `CONVERSATION HISTORY:\n${recentHistoryText}\n\n` : ''
  }OPERATOR MESSAGE:\n${trimmedMessage}`;

  let replyText = '';
  let providerStatus: AgentStatusType = 'Online';
  let providerNotice: string | null = null;

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  // 1. Try Gemini API if configured
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction
        }
      });

      if (response.text && response.text.trim()) {
        replyText = response.text.trim();
        providerStatus = 'Online';
      }
    } catch (err: any) {
      console.warn(`[SpecializedAgent:${agentId}] Gemini API error:`, err?.message || err);
      providerNotice = `Gemini API error (${err?.message || 'Service unavailable'}). Generated response using local domain module.`;
    }
  }

  // 2. Try OpenAI API if reply not yet generated and OPENAI_API_KEY is configured
  if (!replyText && openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            ...history.slice(-6).map((m) => ({
              role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
              content: m.content
            })),
            { role: 'user', content: trimmedMessage }
          ],
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          replyText = content.trim();
          providerStatus = 'Online';
          providerNotice = null;
        }
      } else {
        let errDetail = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) errDetail = errJson.error.message;
        } catch {
          // ignore
        }
        console.warn(`[SpecializedAgent:${agentId}] OpenAI API error: ${errDetail}`);
        providerNotice = `External AI provider error (${errDetail}). Showing response from built-in domain agent module.`;
      }
    } catch (err: any) {
      console.warn(`[SpecializedAgent:${agentId}] OpenAI network error:`, err?.message || err);
      providerNotice = `External AI provider unreachable. Showing response from built-in domain agent module.`;
    }
  }

  // 3. If neither external LLM returned a reply, use the agent's domain-specific engine
  if (!replyText) {
    if (!geminiKey && !openAiKey) {
      providerNotice = 'External AI API key not configured on server — response generated by built-in domain agent module.';
    }
    replyText = await generateDomainSpecificFallback(agentId, trimmedMessage, incident);
  }

  const nowIso = new Date().toISOString();
  const durationMs = Math.max(1, Date.now() - startTime);
  const shortTask = `Responded to: "${trimmedMessage.length > 48 ? trimmedMessage.slice(0, 48) + '...' : trimmedMessage}"`;

  actionLogs[agentId].unshift({
    actionId: 'AGENT_CHAT_RESPONSE',
    timestamp: nowIso,
    details: shortTask,
    durationMs,
    status: replyText ? 'COMPLETED' : 'FAILED'
  });

  const updatedAgents = getSpecializedAgentsList(incident);
  const updatedAgent = updatedAgents.find((a) => a.id === agentId) || updatedAgents[0];

  return {
    agentId,
    agentName: updatedAgent.name,
    reply: replyText,
    timestamp: nowIso,
    providerStatus,
    providerNotice,
    incidentContext: incident
      ? {
          id: incident.id,
          title: incident.title,
          category: incident.category,
          priority: incident.priority,
          address: incident.location.address
        }
      : null,
    updatedAgent
  };
}

export function getGridEfficiencySummary(): GridEfficiencySummary {
  const agentMeta: Array<{ id: SpecializedAgentId; name: string; shortName: string }> = [
    { id: 'POLICE_TACTICAL', name: 'Police Tactical Agent', shortName: 'Police Tactical' },
    { id: 'HOSPITAL_EMS', name: 'Hospital & EMS Agent', shortName: 'Hospital & EMS' },
    { id: 'WATER_HYDRO', name: 'Water Supply & Hydro Agent', shortName: 'Water & Hydro' },
    { id: 'CURRENT_KEB', name: 'Power Grid / KEB Agent', shortName: 'Power Grid / KEB' }
  ];

  const allRuns = dbService.getAgentRuns();
  const recentTimeline: GridEfficiencySummary['recentTimeline'] = [];

  const agents: AgentPerformanceMetric[] = agentMeta.map((meta) => {
    const logs = actionLogs[meta.id] || [];

    const runEventsForAgent = allRuns.flatMap((run) =>
      (run.events || []).filter((evt) => {
        if (meta.id === 'POLICE_TACTICAL') return evt.stepOrder === 1 || evt.stepOrder === 5 || evt.stepOrder === 7;
        if (meta.id === 'HOSPITAL_EMS') return evt.stepOrder === 2 || evt.stepOrder === 3;
        if (meta.id === 'WATER_HYDRO') return evt.stepOrder === 4 || evt.stepOrder === 7;
        if (meta.id === 'CURRENT_KEB') return evt.stepOrder === 6 || evt.stepOrder === 7;
        return false;
      })
    );

    const combinedEntries = [
      ...logs.map((l) => ({
        timestamp: l.timestamp,
        label: l.details,
        durationMs: l.durationMs,
        status: l.status
      })),
      ...runEventsForAgent.map((e) => ({
        timestamp: e.timestamp,
        label: e.outputSummary,
        durationMs: Math.max(1, e.durationMs || 1),
        status: (e.status === 'FAILED' ? 'FAILED' : 'COMPLETED') as 'COMPLETED' | 'FAILED'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const entry of combinedEntries.slice(0, 4)) {
      recentTimeline.push({
        timestamp: entry.timestamp,
        label: entry.label,
        agentName: meta.shortName,
        responseTimeMs: entry.durationMs,
        status: entry.status
      });
    }

    const totalTasks = combinedEntries.length;
    const completedTasks = combinedEntries.filter((e) => e.status === 'COMPLETED').length;
    const failedTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalDuration = combinedEntries.reduce((acc, e) => acc + e.durationMs, 0);
    const avgResponseTimeMs = totalTasks > 0 ? Math.round(totalDuration / totalTasks) : 0;
    const lastResponseTimeMs = combinedEntries.length > 0 ? combinedEntries[0].durationMs : null;

    return {
      agentId: meta.id,
      agentName: meta.name,
      shortName: meta.shortName,
      totalTasks,
      completedTasks,
      failedTasks,
      completionRate,
      avgResponseTimeMs,
      lastResponseTimeMs
    };
  });

  const totalTasks = agents.reduce((sum, a) => sum + a.totalTasks, 0);
  const completedTasks = agents.reduce((sum, a) => sum + a.completedTasks, 0);
  const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const agentsWithTasks = agents.filter((a) => a.totalTasks > 0);
  const overallAvgResponseTimeMs =
    agentsWithTasks.length > 0
      ? Math.round(
          agentsWithTasks.reduce((sum, a) => sum + a.avgResponseTimeMs * a.totalTasks, 0) /
            totalTasks
        )
      : 0;

  recentTimeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    totalTasks,
    completedTasks,
    overallCompletionRate,
    overallAvgResponseTimeMs,
    agents,
    recentTimeline: recentTimeline.slice(-12)
  };
}

export async function runGridReadinessBenchmark(incidentId?: string | null): Promise<GridEfficiencySummary> {
  const allIncidents = dbService.getIncidents();
  const activeIncidents = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const targetIncident = incidentId
    ? dbService.getIncidentById(incidentId) || null
    : activeIncidents[0] || null;

  const promptsByAgent: Record<SpecializedAgentId, string> = {
    POLICE_TACTICAL: 'Verify perimeter security readiness and emergency corridor status.',
    HOSPITAL_EMS: 'Verify trauma triage readiness and ambulance fleet availability.',
    WATER_HYDRO: 'Verify municipal hydrant pressure and main valve readiness.',
    CURRENT_KEB: 'Verify high-voltage feeder safety and priority medical power readiness.'
  };

  const agentIds: SpecializedAgentId[] = [
    'POLICE_TACTICAL',
    'HOSPITAL_EMS',
    'WATER_HYDRO',
    'CURRENT_KEB'
  ];

  for (const id of agentIds) {
    const t0 = Date.now();
    try {
      const reply = await generateDomainSpecificFallback(id, promptsByAgent[id], targetIncident);
      const elapsed = Math.max(1, Date.now() - t0);
      actionLogs[id].unshift({
        actionId: 'READINESS_DIAGNOSTIC',
        timestamp: new Date().toISOString(),
        details: targetIncident
          ? `Readiness check completed for ${targetIncident.id}`
          : 'Sector readiness diagnostic completed',
        durationMs: elapsed,
        status: reply ? 'COMPLETED' : 'FAILED'
      });
    } catch {
      const elapsed = Math.max(1, Date.now() - t0);
      actionLogs[id].unshift({
        actionId: 'READINESS_DIAGNOSTIC',
        timestamp: new Date().toISOString(),
        details: 'Sector readiness diagnostic failed',
        durationMs: elapsed,
        status: 'FAILED'
      });
    }
  }

  return getGridEfficiencySummary();
}

export async function routeOperatorCommand(
  commandText: string,
  incidentId?: string | null
): Promise<AICommandResponse> {
  const trimmed = commandText.trim();
  if (!trimmed) {
    throw new Error('Command cannot be empty.');
  }

  const lower = trimmed.toLowerCase();

  // Route command to the appropriate specialized agent
  let routedAgentId: SpecializedAgentId = 'POLICE_TACTICAL';
  if (
    lower.includes('hospital') ||
    lower.includes('medical') ||
    lower.includes('ambulance') ||
    lower.includes('ems') ||
    lower.includes('patient') ||
    lower.includes('casualt') ||
    lower.includes('injury') ||
    lower.includes('trauma')
  ) {
    routedAgentId = 'HOSPITAL_EMS';
  } else if (
    lower.includes('water') ||
    lower.includes('hydro') ||
    lower.includes('pipe') ||
    lower.includes('leak') ||
    lower.includes('hydrant') ||
    lower.includes('reservoir') ||
    lower.includes('flood') ||
    lower.includes('shortage')
  ) {
    routedAgentId = 'WATER_HYDRO';
  } else if (
    lower.includes('power') ||
    lower.includes('electric') ||
    lower.includes('keb') ||
    lower.includes('outage') ||
    lower.includes('grid') ||
    lower.includes('substation') ||
    lower.includes('feeder') ||
    lower.includes('wire') ||
    lower.includes('transformer')
  ) {
    routedAgentId = 'CURRENT_KEB';
  } else {
    routedAgentId = 'POLICE_TACTICAL';
  }

  const agentMetaMap: Record<SpecializedAgentId, { name: string; code: string }> = {
    POLICE_TACTICAL: { name: 'Police Tactical AI', code: 'AGENT 01' },
    HOSPITAL_EMS: { name: 'Hospital & EMS AI', code: 'AGENT 02' },
    WATER_HYDRO: { name: 'Water Supply & Hydro AI', code: 'AGENT 03' },
    CURRENT_KEB: { name: 'Power Grid / KEB AI', code: 'AGENT 04' }
  };

  const allIncidents = dbService.getIncidents();
  const allResources = dbService.getResources();

  // Filter relevant incidents
  let matchingIncidents = allIncidents.filter((inc) => {
    if (lower.includes('high-priority') || lower.includes('high priority') || lower.includes('critical')) {
      return inc.priority === 'CRITICAL' || inc.priority === 'HIGH';
    }
    if (routedAgentId === 'POLICE_TACTICAL') {
      return inc.category === 'PUBLIC_SAFETY' || inc.category === 'ROAD_ACCIDENT' || inc.status !== 'CLOSED';
    }
    if (routedAgentId === 'HOSPITAL_EMS') {
      return inc.category === 'MEDICAL_EMERGENCY' || inc.casualtiesCount > 0;
    }
    if (routedAgentId === 'WATER_HYDRO') {
      return (
        inc.category === 'FLOOD' ||
        inc.category === 'FIRE_INCIDENT' ||
        inc.description.toLowerCase().includes('water') ||
        inc.description.toLowerCase().includes('pipe')
      );
    }
    if (routedAgentId === 'CURRENT_KEB') {
      return (
        inc.category === 'FIRE_INCIDENT' ||
        inc.description.toLowerCase().includes('power') ||
        inc.description.toLowerCase().includes('electric') ||
        inc.description.toLowerCase().includes('outage')
      );
    }
    return true;
  });

  if (matchingIncidents.length === 0 && allIncidents.length > 0) {
    matchingIncidents = allIncidents.slice(0, 3);
  }

  // Filter relevant resources
  const matchingResources = allResources.filter((res) => {
    if (routedAgentId === 'POLICE_TACTICAL') return res.type === 'POLICE_PATROL';
    if (routedAgentId === 'HOSPITAL_EMS') return res.type === 'AMBULANCE' || res.type === 'RESCUE_TEAM';
    if (routedAgentId === 'WATER_HYDRO') return res.type === 'FIRE_UNIT' || res.type === 'RESCUE_TEAM';
    if (routedAgentId === 'CURRENT_KEB') return res.type === 'GENERAL_SUPPORT' || res.type === 'FIRE_UNIT';
    return true;
  });

  const targetIncId = incidentId || matchingIncidents[0]?.id || null;
  const chatResult = await chatWithSpecializedAgent(routedAgentId, trimmed, [], targetIncId);

  const suggestedActions: AICommandResponse['suggestedActions'] = [
    {
      label: `Open ${agentMetaMap[routedAgentId].name}`,
      route: `/agents/${routedAgentId}`,
      description: `Continue interactive session with ${agentMetaMap[routedAgentId].code}`
    }
  ];

  if (matchingIncidents.length > 0) {
    suggestedActions.push({
      label: `Inspect Incident ${matchingIncidents[0].id}`,
      route: `/incidents/${matchingIncidents[0].id}`,
      description: matchingIncidents[0].title
    });
  } else {
    suggestedActions.push({
      label: 'Report New Emergency',
      route: '/report',
      description: 'Log a verified incident with GPS coordinates'
    });
  }

  suggestedActions.push({
    label: 'Open Live Operations Map',
    route: '/map',
    description: 'View incident markers, facilities, and route corridors'
  });

  return {
    command: trimmed,
    routedAgentId,
    routedAgentName: agentMetaMap[routedAgentId].name,
    routedAgentCode: agentMetaMap[routedAgentId].code,
    summary: chatResult.reply,
    matchingIncidents: matchingIncidents.slice(0, 4),
    matchingResources: matchingResources.slice(0, 4),
    suggestedActions,
    providerStatus: chatResult.providerStatus,
    providerNotice: chatResult.providerNotice,
    timestamp: new Date().toISOString()
  };
}

export function generateSpecializedConsensus(incident: Incident): MultiAgentConsensusMessage[] {
  const now = Date.now();
  const msgTime = (offsetSec: number) => new Date(now + offsetSec * 1000).toISOString();

  const isFire = incident.category === 'FIRE_INCIDENT' || incident.title.toLowerCase().includes('fire');
  const isFlood = incident.category === 'FLOOD' || incident.title.toLowerCase().includes('water');

  return [
    {
      id: `CNS-01-${now}`,
      agentId: 'CURRENT_KEB',
      agentName: 'Power Grid / KEB Agent',
      code: 'KEB-PWR-04',
      timestamp: msgTime(0),
      phase: 'INGEST',
      status: 'ACTION_REQUIRED',
      message: `Evaluated electrical infrastructure near ${incident.location.address}. Ready for feeder isolation if needed for responder safety.`
    },
    {
      id: `CNS-02-${now}`,
      agentId: 'POLICE_TACTICAL',
      agentName: 'Police Tactical Agent',
      code: 'POL-TAC-01',
      timestamp: msgTime(1),
      phase: 'ASSESSMENT',
      status: 'INTERVENTION_EXECUTED',
      message: `Perimeter control and emergency access corridor assessment completed for ${incident.location.address}.`
    },
    {
      id: `CNS-03-${now}`,
      agentId: 'WATER_HYDRO',
      agentName: 'Water Supply & Hydro Agent',
      code: 'HYD-WTR-03',
      timestamp: msgTime(2),
      phase: 'CROSS_CHECK',
      status: 'INTERVENTION_EXECUTED',
      message: isFire
        ? `Hydrant supply priority noted for fire suppression at ${incident.location.address}.`
        : isFlood
        ? `Drainage and main isolation priorities noted for ${incident.location.address}.`
        : `Water infrastructure context reviewed for ${incident.location.address}.`
    },
    {
      id: `CNS-04-${now}`,
      agentId: 'HOSPITAL_EMS',
      agentName: 'Hospital & EMS Agent',
      code: 'EMS-MED-02',
      timestamp: msgTime(3),
      phase: 'ACTION',
      status: 'INTERVENTION_EXECUTED',
      message: `Casualty triage requirements (${incident.casualtiesCount} reported) and ambulance staging reviewed.`
    }
  ];
}
