import { SpecializedAgent, SpecializedAgentId, MultiAgentConsensusMessage, Incident } from '../types';
import { dbService } from '../db';

interface AgentExecutionLog {
  actionId: string;
  timestamp: string;
  details: string;
}

const actionLogs: Record<SpecializedAgentId, AgentExecutionLog[]> = {
  POLICE_TACTICAL: [],
  HOSPITAL_EMS: [],
  WATER_HYDRO: [],
  CURRENT_KEB: []
};

export function getSpecializedAgentsList(specificIncident?: Incident | null): SpecializedAgent[] {
  const allIncidents = dbService.getIncidents();
  const activeIncidents = allIncidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  );

  // If a specific incident was passed, prioritize that
  const targetIncident = specificIncident || (activeIncidents.length > 0 ? activeIncidents[0] : null);

  // 1. Police Tactical Agent
  const policeIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'ROAD_ACCIDENT' || i.category === 'PUBLIC_SAFETY') ||
    activeIncidents[0] ||
    null;

  const policeLogs = actionLogs.POLICE_TACTICAL;
  const policeLastLog = policeLogs[0];

  const policeAgent: SpecializedAgent = {
    id: 'POLICE_TACTICAL',
    name: 'Police Tactical Agent',
    code: 'POL-TAC-01',
    sector: 'Security & Law Enforcement',
    roleDescription: 'Security and police coordination.',
    description: 'Autonomous coordinator for perimeter security, traffic diversion, crowd safety, and tactical response.',
    status: policeIncident ? 'Busy' : 'Online',
    currentTask: policeLastLog
      ? `Completed directive: ${policeLastLog.details}`
      : policeIncident
      ? `Perimeter security and traffic management for ${policeIncident.id}`
      : 'Standby - monitoring sector security',
    assignedIncidentId: policeIncident ? policeIncident.id : null,
    assignedIncidentTitle: policeIncident ? policeIncident.title : null,
    lastUpdated: policeLastLog ? policeLastLog.timestamp : policeIncident?.updatedAt || new Date().toISOString(),
    liveAssessment: policeIncident
      ? `Securing perimeter for ${policeIncident.id} (${policeIncident.title}). Traffic diversion active around ${policeIncident.location.address}.`
      : 'Sector security nominal. Standing by for incident assignments.',
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
        id: 'POLICE_DEPLOY_SWAT',
        label: 'Deploy Tactical Unit',
        description: 'Dispatch tactical rapid-entry team to scene.',
        category: 'DISPATCH',
        riskLevel: 'HIGH',
        status: 'READY'
      },
      {
        id: 'POLICE_TRAFFIC_DIVERSION',
        label: 'Reroute Traffic Arteries',
        description: 'Automate intersection signal overrides for emergency transit corridor.',
        category: 'CORDON',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'POLICE_DRONE_SURVEILLANCE',
        label: 'Deploy Aerial Recon Drone',
        description: 'Launch aerial surveillance drone for tactical scene assessment.',
        category: 'TELEMETRY',
        riskLevel: 'LOW',
        status: 'READY'
      }
    ],
    consensusDialogue: [
      'POL-TAC-01: Automated perimeter standing by.',
      'POL-TAC-01: Emergency corridor routing prepared.'
    ]
  };

  // 2. Hospital & EMS Agent
  const emsIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'MEDICAL_EMERGENCY' || i.casualtiesCount > 0) ||
    activeIncidents[0] ||
    null;

  const emsLogs = actionLogs.HOSPITAL_EMS;
  const emsLastLog = emsLogs[0];

  const emsAgent: SpecializedAgent = {
    id: 'HOSPITAL_EMS',
    name: 'Hospital & EMS Agent',
    code: 'EMS-MED-02',
    sector: 'Emergency Medical Services & Healthcare',
    roleDescription: 'Medical emergency coordination.',
    description: 'Coordinates hospital bed availability, trauma triage, and rapid ambulance response.',
    status: emsIncident ? 'Busy' : 'Online',
    currentTask: emsLastLog
      ? `Completed directive: ${emsLastLog.details}`
      : emsIncident
      ? `Medical triage and hospital coordination for ${emsIncident.id}`
      : 'Standby - emergency medical capacity normal',
    assignedIncidentId: emsIncident ? emsIncident.id : null,
    assignedIncidentTitle: emsIncident ? emsIncident.title : null,
    lastUpdated: emsLastLog ? emsLastLog.timestamp : emsIncident?.updatedAt || new Date().toISOString(),
    liveAssessment: emsIncident
      ? `Triage staged for ${emsIncident.casualtiesCount} reported casualties at ${emsIncident.id}. Trauma bays standing by.`
      : 'Regional trauma centers nominal. Ambulance availability verified.',
    actions: [
      {
        id: 'EMS_BROADCAST_MASS_CASUALTY',
        label: 'Declare Mass Casualty Alert',
        description: 'Notify regional hospitals to activate surge trauma capacity.',
        category: 'TRIAGE',
        riskLevel: 'MEDIUM',
        status: 'READY'
      },
      {
        id: 'EMS_RESERVE_TRAUMA_BAYS',
        label: 'Reserve Trauma Resuscitation Bays',
        description: 'Lock available resuscitation bays at nearest medical center.',
        category: 'TRIAGE',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'EMS_DYNAMIC_AMBULANCE_BALANCE',
        label: 'Load-Balance Ambulance Fleet',
        description: 'Distribute patient transports evenly across regional hospitals.',
        category: 'DISPATCH',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'EMS_STAGE_MEDEVAC',
        label: 'Stage Air Ambulance',
        description: 'Prepare helicopter medical evacuation unit for critical transit.',
        category: 'DISPATCH',
        riskLevel: 'MEDIUM',
        status: 'READY'
      }
    ],
    consensusDialogue: [
      'EMS-MED-02: Hospital bed capacity verified.',
      'EMS-MED-02: Emergency ambulance telemetry synchronized.'
    ]
  };

  // 3. Water Supply & Hydro Agent
  const hydroIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'FIRE_INCIDENT' || i.category === 'FLOOD') ||
    activeIncidents[0] ||
    null;

  const hydroLogs = actionLogs.WATER_HYDRO;
  const hydroLastLog = hydroLogs[0];

  const hydroAgent: SpecializedAgent = {
    id: 'WATER_HYDRO',
    name: 'Water Supply & Hydro Agent',
    code: 'HYD-WTR-03',
    sector: 'Water Infrastructure & Hydrology',
    roleDescription: 'Water infrastructure coordination.',
    description: 'Manages municipal water distribution, fire hydrant pressure, main isolation, and stormwater control.',
    status: hydroIncident ? 'Busy' : 'Online',
    currentTask: hydroLastLog
      ? `Completed directive: ${hydroLastLog.details}`
      : hydroIncident
      ? `Water flow & hydrant pressure management for ${hydroIncident.id}`
      : 'Standby - water infrastructure nominal',
    assignedIncidentId: hydroIncident ? hydroIncident.id : null,
    assignedIncidentTitle: hydroIncident ? hydroIncident.title : null,
    lastUpdated: hydroLastLog ? hydroLastLog.timestamp : hydroIncident?.updatedAt || new Date().toISOString(),
    liveAssessment: hydroIncident
      ? hydroIncident.category === 'FIRE_INCIDENT'
        ? `Hydrant booster pump staged for fire suppression at ${hydroIncident.location.address}.`
        : `Monitoring stormwater channels and drainage flow near ${hydroIncident.location.address}.`
      : 'Municipal water distribution stable. Hydrant pressure nominal across all sectors.',
    actions: [
      {
        id: 'HYDRO_SURGE_PRESSURE',
        label: 'Surge Hydrant Pressure',
        description: 'Boost booster pump station to provide high-output fire suppression stream.',
        category: 'SURGE',
        riskLevel: 'MEDIUM',
        status: 'READY'
      },
      {
        id: 'HYDRO_ISOLATE_MAIN',
        label: 'Isolate Water Main Valve',
        description: 'Close telemetry valves around incident zone to prevent washouts or leaks.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'MEDIUM',
        status: 'READY'
      },
      {
        id: 'HYDRO_OPEN_SLUICE_GATES',
        label: 'Actuate Drainage Sluice Gates',
        description: 'Open municipal runoff channels to prevent roadway pooling.',
        category: 'SURGE',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'HYDRO_POTABLE_DEFENSE',
        label: 'Lockdown Reservoir Intake',
        description: 'Protect drinking water supply from hazardous chemical runoff.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'HIGH',
        status: 'READY'
      }
    ],
    consensusDialogue: [
      'HYD-WTR-03: Hydrant static pressure checked.',
      'HYD-WTR-03: Water main integrity confirmed.'
    ]
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

  const kebLogs = actionLogs.CURRENT_KEB;
  const kebLastLog = kebLogs[0];

  const kebAgent: SpecializedAgent = {
    id: 'CURRENT_KEB',
    name: 'Power Grid / KEB Agent',
    code: 'KEB-PWR-04',
    sector: 'Electricity Infrastructure & Grid Safety',
    roleDescription: 'Electricity infrastructure coordination.',
    description: 'Monitors high-voltage grid lines, executes rapid line de-energization, and guarantees priority hospital feeds.',
    status: kebIncident ? 'Busy' : 'Online',
    currentTask: kebLastLog
      ? `Completed directive: ${kebLastLog.details}`
      : kebIncident
      ? `Grid line safety and de-energization monitoring for ${kebIncident.id}`
      : 'Standby - electrical grid telemetry nominal',
    assignedIncidentId: kebIncident ? kebIncident.id : null,
    assignedIncidentTitle: kebIncident ? kebIncident.title : null,
    lastUpdated: kebLastLog ? kebLastLog.timestamp : kebIncident?.updatedAt || new Date().toISOString(),
    liveAssessment: kebIncident
      ? `Grid safety monitoring active for ${kebIncident.id}. Standing by to de-energize local circuits if hazards arise.`
      : 'Substation and distribution grid nominal. No electrical faults detected.',
    actions: [
      {
        id: 'KEB_DE_ENERGIZE_FEEDER',
        label: 'De-energize Incident Feeder Line',
        description: 'Trip local circuit breaker to remove electrocution hazards for rescue teams.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'HIGH',
        status: 'READY'
      },
      {
        id: 'KEB_PRIORITY_HOSPITAL_FEEDER',
        label: 'Secure Priority Hospital Power',
        description: 'Lock dedicated feeder line to ensure continuous power to medical centers.',
        category: 'TELEMETRY',
        riskLevel: 'LOW',
        status: 'READY'
      },
      {
        id: 'KEB_ISOLATE_SUBSTATION',
        label: 'Isolate Transformer',
        description: 'Remotely isolate faulted electrical transformer to prevent cascade outage.',
        category: 'SAFETY_LOCKOUT',
        riskLevel: 'HIGH',
        status: 'READY'
      },
      {
        id: 'KEB_DISPATCH_REPAIR_CREW',
        label: 'Dispatch High-Voltage Crew',
        description: 'Deploy utility repair specialists with insulated equipment to scene.',
        category: 'DISPATCH',
        riskLevel: 'MEDIUM',
        status: 'READY'
      }
    ],
    consensusDialogue: [
      'KEB-PWR-04: High-voltage telemetry verified.',
      'KEB-PWR-04: Circuit protection interlocks armed.'
    ]
  };

  return [policeAgent, emsAgent, hydroAgent, kebAgent];
}

export function executeSpecializedAgentAction(
  agentId: SpecializedAgentId,
  actionId: string,
  incidentId?: string,
  operatorName: string = 'Command Center Operator'
): { success: boolean; message: string; updatedAgent: SpecializedAgent } {
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

  actionLogs[agentId].unshift({
    actionId,
    timestamp: nowIso,
    details: action.label
  });

  // Log in system audit trail
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
  updatedAgent.currentTask = `Executed: ${action.label}`;
  updatedAgent.lastUpdated = nowIso;

  return {
    success: true,
    message: logMsg,
    updatedAgent
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
      message: `Verified electrical infrastructure near ${incident.location.address}. De-energization ready on command for responder safety.`
    },
    {
      id: `CNS-02-${now}`,
      agentId: 'POLICE_TACTICAL',
      agentName: 'Police Tactical Agent',
      code: 'POL-TAC-01',
      timestamp: msgTime(1),
      phase: 'ASSESSMENT',
      status: 'INTERVENTION_EXECUTED',
      message: `Perimeter corridor planned. Traffic diversion ready to clear access routes for emergency vehicles.`
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
        ? `Hydrant flow prepared for fire apparatus at scene.`
        : isFlood
        ? `Drainage channels and flood barrier telemetry ready for actuation.`
        : `Water main telemetry checked. Static pressure nominal.`
    },
    {
      id: `CNS-04-${now}`,
      agentId: 'HOSPITAL_EMS',
      agentName: 'Hospital & EMS Agent',
      code: 'EMS-MED-02',
      timestamp: msgTime(3),
      phase: 'ACTION',
      status: 'INTERVENTION_EXECUTED',
      message: `Hospital trauma capacity checked. Inbound ambulance tracking synchronized.`
    },
    {
      id: `CNS-05-${now}`,
      agentId: 'POLICE_TACTICAL',
      agentName: 'Police Tactical Agent',
      code: 'POL-TAC-01',
      timestamp: msgTime(4),
      phase: 'RESOLVED',
      status: 'CONSENSUS_REACHED',
      message: `Cross-domain consensus established between Police, EMS, Water Hydro, and Power Grid. Operational coordination verified.`
    }
  ];
}
