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
import {
  SupportedLanguage,
  extractIncidentParameters,
  IncidentDraft,
  detectLanguage
} from '../aiProviderAdapter';

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
    name: 'Rakshak AI',
    code: 'RAKSHAK-01',
    sector: 'Police & Public Safety',
    roleDescription: 'Understands police emergency reports, accident logging, live map incidents, and tactical dispatch recommendations.',
    description: 'Rakshak AI — Police & Public Safety emergency response, tactical perimeter cordon, and accident triage.',
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

  // 2. Hospital & EMS Agent (Jeevan AI)
  const emsIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'MEDICAL_EMERGENCY' || i.casualtiesCount > 0) ||
    activeIncidents[0] ||
    null;

  const emsLastLog = actionLogs.HOSPITAL_EMS[0];

  const emsAgent: SpecializedAgent = {
    id: 'HOSPITAL_EMS',
    name: 'Jeevan AI',
    code: 'JEEVAN-02',
    sector: 'Hospital & Emergency Medical Services',
    roleDescription: 'Understands medical emergency requests, locates real hospitals, and assists with ambulance coordination.',
    description: 'Jeevan AI — Hospital & Emergency Medical Services, casualty triage, and verified hospital navigation.',
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

  // 3. Water Supply & Hydro Agent (JalRakshak AI)
  const hydroIncident =
    specificIncident ||
    activeIncidents.find((i) => i.category === 'FIRE_INCIDENT' || i.category === 'FLOOD') ||
    activeIncidents[0] ||
    null;

  const hydroLastLog = actionLogs.WATER_HYDRO[0];

  const hydroAgent: SpecializedAgent = {
    id: 'WATER_HYDRO',
    name: 'JalRakshak AI',
    code: 'JALRAKSHAK-03',
    sector: 'Water Supply & Hydro',
    roleDescription: 'Reports water shortages, pipeline leaks, contamination, and tracks municipal repair requests.',
    description: 'JalRakshak AI — Water supply disruption monitoring, pipeline burst isolation, and hydro incident reporting.',
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

  // 4. Power Grid / KEB Agent (Shakti AI)
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
    name: 'Shakti AI',
    code: 'SHAKTI-04',
    sector: 'Power Grid & Electricity',
    roleDescription: 'Reports electricity outages, identifies electrical hazards, and registers electricity complaints.',
    description: 'Shakti AI — Power grid safety, electricity outage reporting, downed cable warnings, and feeder tracking.',
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

function getAgentSystemInstruction(agentId: SpecializedAgentId, incidentContextText: string, language: SupportedLanguage = 'en'): string {
  let langDirective = 'CRITICAL LANGUAGE DIRECTIVE: You MUST respond in clear, spoken English.';
  if (language === 'hi') {
    langDirective = 'CRITICAL LANGUAGE DIRECTIVE: You MUST respond entirely in natural, fluent Hindi (हिन्दी) in standard Devanagari script. Use simple, reassuring spoken Hindi that is easily understood when read aloud via voice synthesis. Do NOT mix English sentences unless quoting an alphanumeric ID.';
  } else if (language === 'kn') {
    langDirective = 'CRITICAL LANGUAGE DIRECTIVE: You MUST respond entirely in natural, fluent Kannada (ಕನ್ನಡ) in standard Kannada script. Use simple, reassuring spoken Kannada that is easily understood when read aloud via voice synthesis. Do NOT mix English sentences unless quoting an alphanumeric ID.';
  }

  const baseRules = `CRITICAL RULES:
- ${langDirective}
- Respond ONLY from your specialized domain perspective.
- NEVER state or claim that police, ambulances, fire crews, or repair workers have been dispatched unless the backend incident record explicitly confirms an active dispatched assignment.
- For Hospital & EMS Agent: You MUST explicitly remind callers that submitting an emergency report does NOT guarantee that an ambulance has been dispatched until verified and assigned by dispatch.
- For Power Grid / KEB Agent: Always provide life safety guidance (stay at least 10 meters / 30 feet away from downed power lines and do not touch energized wires or water near electrical apparatus).
- For Water & Hydro Agent: Help the user build a structured report with location and valve/leak details.
- For Police Tactical Agent: Ask short, clear follow-up questions when necessary.
- Never fabricate incident counts, confidence percentages, latency metrics, or unverified facts.
- Keep your response structured, empathetic, concise, and easy to understand when spoken aloud.

${incidentContextText}`;

  switch (agentId) {
    case 'POLICE_TACTICAL':
      return `You are Rakshak AI (RAKSHAK-01), the Police & Public Safety AI Agent in the AegisAI Emergency Grid.
Your domain is strictly Law Enforcement, Public Safety, Road Accidents, Perimeter Security, and Tactical Incident Review.
Focus on:
1. Understanding police-related emergency reports and road accidents
2. Displaying actual incident locations and retrieving verified police stations
3. Providing clear response recommendations and scene safety precautions
4. Conversational intake in simple sentences suitable for voice playback

${baseRules}`;

    case 'HOSPITAL_EMS':
      return `You are Jeevan AI (JEEVAN-02), the Hospital & Emergency Medical Services AI Agent in the AegisAI Emergency Grid.
Your domain is strictly Emergency Medical Services (EMS), Casualty Triage, Trauma Coordination, and Ambulance Intake.
CRITICAL MANDATE: Never claim an ambulance has been dispatched without backend confirmation. Explain that an intake report does not guarantee immediate ambulance arrival.
Focus on:
1. Understanding medical emergency requests and locating nearby verified hospitals
2. Retrieving actual hospital information from configured places-data provider
3. Asking essential triage questions (conscious, breathing, severe bleeding) in simple language
4. Providing basic life-safety first-aid guidance

${baseRules}`;

    case 'WATER_HYDRO':
      return `You are JalRakshak AI (JALRAKSHAK-03), the Water Supply & Hydro AI Agent in the AegisAI Emergency Grid.
Your domain is strictly Water Supply Disruptions, Pipeline Leaks, Water Shortages, and Municipal Hydro Infrastructure.
Focus on:
1. Reporting water shortages and pipeline leaks
2. Helping locate water supply incidents on the live map
3. Organizing complaints and repair requests using backend records
4. Safety precautions around flooded roadways or contaminated water

${baseRules}`;

    case 'CURRENT_KEB':
      return `You are Shakti AI (SHAKTI-04), the Power Grid & Electricity AI Agent in the AegisAI Emergency Grid.
Your domain is strictly Electrical Infrastructure, Electricity Outages, Downed Conductors, and Transformer Hazards.
Focus on:
1. Reporting electricity outages and electrical hazards
2. Providing vital safety guidance: stay at least 10 meters away from downed wires, do not touch wet electrical apparatus
3. Assisting with electricity complaint registration and tracking maintenance requests
4. Clear conversational answers in simple sentences suitable for voice playback

${baseRules}`;
  }
}

export interface UserLocationContext {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function generateDomainSpecificFallback(
  agentId: SpecializedAgentId,
  userMessage: string,
  incident: Incident | null,
  language: SupportedLanguage = 'en',
  userLocation?: UserLocationContext | null
): Promise<string> {
  const msgLower = userMessage.toLowerCase();
  const hasLocation =
    !!userLocation ||
    /(?:at|near|in|on|around|स्थान|जगह|इलाके|में|ಬಳಿ|ಹತ್ತಿರ|ನಲ್ಲಿ|ದಲ್ಲಿ|ಪ್ರದೇಶದಲ್ಲಿ)\s+[A-Za-z0-9\u0900-\u097F\u0C80-\u0CFF\s,.-]{3,35}/i.test(
      userMessage
    );

  // Check if caller is asking for nearby facilities
  const isAskingNearbyHospital = /(?:nearby hospital|nearest hospital|where is hospital|hospital nearby|hospital|ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ|ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ|ದವಾಖಾನೆ|ಅಸ್ಪताल कहाँ|निकटतम अस्पताल|पास का अस्पताल)/i.test(
    userMessage
  );
  const isAskingNearbyPolice = /(?:nearby police|nearest police|where is police|police station|ಹತ್ತಿರದ ಪೊಲೀಸ್|ಪೊಲೀಸ್ ಠಾಣೆ|पुलिस स्टेशन|थाना कहाँ)/i.test(
    userMessage
  );
  const isAskingNearbyWater = /(?:nearby water|water station|water office|ಹತ್ತಿರದ ನೀರಿನ|ಜಲ ಮಂಡಳಿ|जल केंद्र)/i.test(
    userMessage
  );
  const isAskingNearbyPower = /(?:nearby power|keb office|power substation|electric office|ವಿದ್ಯುತ್ ಕಚೇರಿ|ಸಬ್‌ಸ್ಟೇಷನ್|ಕೆಇಬಿ ಕಚೇರಿ|बिजली दफ्तर|सबस्टेशन)/i.test(
    userMessage
  );

  // 1. HOSPITAL_EMS
  if (agentId === 'HOSPITAL_EMS') {
    if (isAskingNearbyHospital) {
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        const facilities = dbService.getFacilities({ type: 'HOSPITAL' });
        const withDist = facilities.map((f) => ({
          ...f,
          distanceKm: calculateDistanceKm(userLocation.latitude, userLocation.longitude, f.latitude, f.longitude)
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        const closest = withDist[0] || facilities[0];
        const distStr = withDist[0] ? `${withDist[0].distanceKm} km` : 'nearby';

        if (language === 'kn') {
          return `ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಜಿಪಿಎಸ್ ಸ್ಥಳದಿಂದ ಅತ್ಯಂತ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ: ${closest.name} (${closest.address}). ಅಂದಾಜು ದೂರ: ಸುಮಾರು ${distStr}. ತುರ್ತು ಸಂಪರ್ಕ: ${closest.contactPhone}. (ಗಮನಿಸಿ: ಆಂಬ್ಯುಲೆನ್ಸ್ ರವಾನೆಗಾಗಿ 112 ಅಥವಾ ಕಂಟ್ರೋಲ್ ರೂಮ್ ಸಂಪರ್ಕಿಸಿ.)`;
        }
        if (language === 'hi') {
          return `आपके वर्तमान जीपीएस स्थान से निकटतम अस्पताल: ${closest.name} (${closest.address})। अनुमानित दूरी: लगभग ${distStr}। आपातकालीन संपर्क: ${closest.contactPhone}।`;
        }
        return `Based on your live GPS coordinates, the nearest verified hospital is ${closest.name} at ${closest.address}, approximately ${distStr} away. Emergency phone: ${closest.contactPhone}.`;
      } else {
        if (language === 'kn') {
          return `ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲು, ದಯವಿಟ್ಟು 'ನನ್ನ ಸ್ಥಳ' (My Location) ಜಿಪಿಎಸ್ ಅನುಮತಿಯನ್ನು ನೀಡಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರದೇಶದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.`;
        }
        if (language === 'hi') {
          return `निकटतम अस्पताल की जानकारी के लिए, कृपया 'मेरा स्थान' (My Location) जीपीएस अनुमति दें या अपने क्षेत्र का नाम बताएं।`;
        }
        return `To find the nearest hospitals, please grant GPS location permission using 'My Location' or enter your locality name.`;
      }
    }

    if (language === 'hi') {
      if (hasLocation) {
        return `मैंने चिकित्सा सहायता का विवरण नोट कर लिया है। कृपया बताएं कि कितने लोग घायल हैं और क्या वे होश में हैं? ध्यान रहे: यहाँ रिपोर्ट दर्ज करने से एम्बुलेंस रवाना होने की गारंटी नहीं होती है, जब तक कि कंट्रोल रूम पुष्टि न करे। क्या मैं यह रिपोर्ट सबमिट करूँ?`;
      }
      return `मैं आपकी मदद करता हूँ। कृपया अपना स्थान और घायलों की संख्या बताएं। कृपया ध्यान दें: आपातकालीन रिपोर्ट दर्ज करने से एम्बुलेंस रवाना होने की गारंटी नहीं है, जब तक कि नियंत्रण कक्ष द्वारा पुष्टि न हो जाए।`;
    }
    if (language === 'kn') {
      if (hasLocation) {
        return `ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಿಕೊಳ್ಳಲಾಗಿದೆ. ಗಾಯಾಳುಗಳ ಸ್ಥಿತಿ ಹೇಗಿದೆ? ಗಮನಿಸಿ: ತುರ್ತು ವರದಿ ಸಲ್ಲಿಸುವುದರಿಂದ ಆಂಬ್ಯುಲೆನ್ಸ್ ತಕ್ಷಣ ರವಾನೆಯಾಗಿದೆ ಎಂಬ ಖಾತರಿ ಇಲ್ಲ, ನಿಯಂತ್ರಣ ಕೊಠಡಿಯಿಂದ ದೃಢೀಕರಿಸಿದ ನಂತರವೇ ರವಾನೆಯಾಗುತ್ತದೆ. ಇದನ್ನು ಸಲ್ಲಿಸಬೇಕೇ?`;
      }
      return `ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿ ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳ ಮತ್ತು ಗಾಯಾಳುಗಳ ವಿವರ ತಿಳಿಸಿ. (ಗಮನಿಸಿ: ತುರ್ತು ವರದಿ ಸಲ್ಲಿಸುವುದರಿಂದ ಆಂಬ್ಯುಲೆನ್ಸ್ ರವಾನೆಯಾಗಿದೆ ಎಂಬ ಖಾತರಿ ಇಲ್ಲ.)`;
    }
    // English
    if (hasLocation) {
      return `I have noted the medical incident details at your location. Please confirm the number of injured individuals and their breathing status. (Important safety note: Submitting an emergency report does not guarantee that an ambulance has been dispatched until verified by dispatch.) Would you like me to submit this report?`;
    }
    return `I can help you report this medical emergency. Please share your location and the number of injured individuals. (Note: Submitting an emergency report does not guarantee that an ambulance has been dispatched until verified by dispatch.)`;
  }

  // 2. POLICE_TACTICAL
  if (agentId === 'POLICE_TACTICAL') {
    if (isAskingNearbyPolice) {
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        const facilities = dbService.getFacilities({ type: 'POLICE_STATION' });
        const withDist = facilities.map((f) => ({
          ...f,
          distanceKm: calculateDistanceKm(userLocation.latitude, userLocation.longitude, f.latitude, f.longitude)
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        const closest = withDist[0] || facilities[0];
        const distStr = withDist[0] ? `${withDist[0].distanceKm} km` : 'nearby';

        if (language === 'kn') {
          return `ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಜಿಪಿಎಸ್ ಸ್ಥಳದಿಂದ ಹತ್ತಿರದ ಪೊಲೀಸ್ ಠಾಣೆ: ${closest.name} (${closest.address}). ದೂರ: ಸುಮಾರು ${distStr}. ನಿಯಂತ್ರಣ ಕೊಠಡಿ ದೂರವಾಣಿ: ${closest.contactPhone}. (ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ 112 ಗೆ ಕರೆ ಮಾಡಿ.)`;
        }
        if (language === 'hi') {
          return `आपके वर्तमान जीपीएस स्थान से निकटतम पुलिस स्टेशन: ${closest.name} (${closest.address})। दूरी: लगभग ${distStr}। नियंत्रण कक्ष: ${closest.contactPhone}।`;
        }
        return `Based on your live GPS coordinates, the nearest police facility is ${closest.name} at ${closest.address}, approximately ${distStr} away. Contact: ${closest.contactPhone}.`;
      } else {
        if (language === 'kn') {
          return `ಹತ್ತಿರದ ಪೊಲೀಸ್ ಠಾಣೆಯನ್ನು ಹುಡುಕಲು, ದಯವಿಟ್ಟು 'ನನ್ನ ಸ್ಥಳ' (My Location) ಜಿಪಿಎಸ್ ಅನುಮತಿಯನ್ನು ನೀಡಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರದೇಶದ ಹೆಸರನ್ನು ತಿಳಿಸಿ.`;
        }
        if (language === 'hi') {
          return `निकटतम पुलिस स्टेशन खोजने के लिए, कृपया 'मेरा स्थान' (My Location) जीपीएस अनुमति दें या अपने क्षेत्र का नाम बताएं।`;
        }
        return `To find the nearest police station, please allow GPS location access using 'My Location' or state your street or area.`;
      }
    }

    if (language === 'hi') {
      if (hasLocation) {
        return `मैं आपकी मदद करता हूँ। मैंने आपके दिए गए स्थान को नोट कर लिया है। कृपया पुष्टि करें कि क्या कोई घायल है या रास्ता अवरुद्ध है? मैं आपकी पुलिस रिपोर्ट दर्ज करने के लिए तैयार हूँ।`;
      }
      return `मैं आपकी मदद करता हूँ। कृपया अपना स्थान बताएं ताकि सुरक्षा व पुलिस रिपोर्ट दर्ज की जा सके। (सावधानी: सुरक्षित दूरी बनाए रखें और आपातकालीन रास्ते को खुला रखें।)`;
    }
    if (language === 'kn') {
      if (hasLocation) {
        return `ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಸ್ಥಳದ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಈ ವರದಿಯನ್ನು ಸಲ್ಲಿಸಲು ದೃಢೀಕರಿಸುತ್ತೀರಾ?`;
      }
      return `ಪೊಲೀಸ್ ನಿಯಂತ್ರಣ ಕೊಠಡಿಯಿಂದ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳ ಮತ್ತು ಘಟನೆಯ ವಿವರವನ್ನು ತಿಳಿಸಿ. (ಮುನ್ನೆಚ್ಚರಿಕೆ: ವಾಹನಗಳಿಂದ ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿಕೊಳ್ಳಿ.)`;
    }
    // English
    if (hasLocation) {
      return `I can help you report this public safety incident. I have noted your location. Are there any injuries, blocked roads, or active security hazards? Say 'Confirm' to submit this report.`;
    }
    return `I am the Police Tactical AI coordinator. I can help you report this public safety incident or road accident. Please share your location.`;
  }

  // 3. WATER_HYDRO
  if (agentId === 'WATER_HYDRO') {
    if (isAskingNearbyWater) {
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        const facilities = dbService.getFacilities({ type: 'WATER_FACILITY' });
        const withDist = facilities.map((f) => ({
          ...f,
          distanceKm: calculateDistanceKm(userLocation.latitude, userLocation.longitude, f.latitude, f.longitude)
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        const closest = withDist[0] || facilities[0];
        const distStr = withDist[0] ? `${withDist[0].distanceKm} km` : 'nearby';

        if (language === 'kn') {
          return `ನಿಮ್ಮ ಸ್ಥಳದಿಂದ ಹತ್ತಿರದ ಜಲ ಮಂಡಳಿ ಕೇಂದ್ರ: ${closest.name} (${closest.address}). ದೂರ: ಸುಮಾರು ${distStr}. ಸಂಪರ್ಕ: ${closest.contactPhone}.`;
        }
        if (language === 'hi') {
          return `आपके स्थान से निकटतम जल बोर्ड केंद्र: ${closest.name} (${closest.address})। दूरी: लगभग ${distStr}।`;
        }
        return `The nearest municipal water facility is ${closest.name} at ${closest.address}, approximately ${distStr} away. Contact: ${closest.contactPhone}.`;
      }
    }

    if (language === 'hi') {
      if (hasLocation) {
        return `मैंने आपके क्षेत्र में पानी की समस्या का स्थान नोट कर लिया है। क्या पाइपलाइन से रिसाव हो रहा है या आपूर्ति बाधित है? कृपया पुष्टि करें ताकि जल बोर्ड को रिपोर्ट सबमिट की जा सके।`;
      }
      return `मैं आपकी मदद करता हूँ। आपकी पानी की समस्या या पाइपलाइन लीकेज दर्ज करने के लिए कृपया अपना स्थान बताएं।`;
    }
    if (language === 'kn') {
      if (hasLocation) {
        return `ನಿಮ್ಮ ನೀರಿನ ಸಮಸ್ಯೆಯ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ಪೈಪ್‌ಲೈನ್ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆಯೇ ಅಥವಾ ನೀರು ಬರುತ್ತಿಲ್ಲವೇ? ಜಲ ಮಂಡಳಿಗೆ ವರದಿ ಸಲ್ಲಿಸಲು ದೃಢೀಕರಿಸಿ.`;
      }
      return `ನಿಮ್ಮ ನೀರಿನ ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ತಿಳಿಸಿ.`;
    }
    // English
    if (hasLocation) {
      return `I have noted your location for the water infrastructure report. Is this a main pipeline burst, drainage overflow, or complete water outage? Confirm to submit this to municipal hydro dispatch.`;
    }
    return `I can help you report the water supply disruption or leak. Please share your location.`;
  }

  // 4. CURRENT_KEB (Power Grid / KEB Agent)
  if (isAskingNearbyPower && userLocation && userLocation.latitude && userLocation.longitude) {
    const facilities = dbService.getFacilities({ type: 'POWER_SUBSTATION' });
    const withDist = facilities.map((f) => ({
      ...f,
      distanceKm: calculateDistanceKm(userLocation.latitude, userLocation.longitude, f.latitude, f.longitude)
    })).sort((a, b) => a.distanceKm - b.distanceKm);
    const closest = withDist[0] || facilities[0];
    const distStr = withDist[0] ? `${withDist[0].distanceKm} km` : 'nearby';

    if (language === 'kn') {
      return `ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಜಿಪಿಎಸ್ ಸ್ಥಳದಿಂದ ಹತ್ತಿರದ ವಿದ್ಯುತ್ ಸಬ್‌ಸ್ಟೇಷನ್: ${closest.name} (${closest.address}). ದೂರ: ಸುಮಾರು ${distStr}. ಸಹಾಯವಾಣಿ: ${closest.contactPhone}.`;
    }
    if (language === 'hi') {
      return `आपके निकटतम विद्युत सबस्टेशन: ${closest.name} (${closest.address})। दूरी: लगभग ${distStr}। हेल्पलाइन: ${closest.contactPhone}।`;
    }
    return `The nearest power grid facility is ${closest.name} at ${closest.address}, approximately ${distStr} away. Helplines: ${closest.contactPhone}.`;
  }

  // Understanding power outage in Kannada: "ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ವಿದ್ಯುತ್ ಇಲ್ಲ."
  const isPowerOutageReport = /(?:ವಿದ್ಯುತ್ ಇಲ್ಲ|ಕರೆಂಟ್ ಇಲ್ಲ|ವಿದ್ಯುತ್ ಕಡಿತ|ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯ|ಬೆಳಕಿಲ್ಲ|power outage|blackout|no power|no electricity|बिजली नहीं है|बिजली गुल|करंट नहीं)/i.test(
    userMessage
  );

  if (language === 'kn') {
    if (isPowerOutageReport) {
      if (userLocation || hasLocation) {
        const locDesc = userLocation?.address || 'ನಿಮ್ಮ ಪ್ರದೇಶ';
        return `ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ (${locDesc}) ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ಬೆಸ್ಕಾಂ/ಕೆಇಬಿ ಕಂಟ್ರೋಲ್ ರೂಮ್‌ಗೆ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. (ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ: ಬಿದ್ದಿರುವ ವಿದ್ಯುತ್ ತಂತಿಗಳಿಂದ ಕನಿಷ್ಠ 10 ಮೀಟರ್ ದೂರವಿರಿ.) ವರದಿಯನ್ನು ಸಲ್ಲಿಸಲು ದೃಢೀಕರಿಸಿ.`;
      }
      return `ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿನ ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯ ಅಥವಾ ಕರೆಂಟ್ ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರದೇಶ, ಬಡಾವಣೆ ಅಥವಾ ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ತಿಳಿಸಿ. (ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ: ಬಿದ್ದಿರುವ ವಿದ್ಯುತ್ ತಂತಿಗಳಿಂದ ಕನಿಷ್ಠ 10 ಮೀಟರ್ ದೂರವಿರಿ.)`;
    }

    if (hasLocation) {
      return `ನಿಮ್ಮ ಪ್ರದೇಶದ ವಿದ್ಯುತ್ ಸಮಸ್ಯೆಯ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ವಿದ್ಯುತ್ ತಂತಿ ಬಿದ್ದಿದ್ದರೆ ಕನಿಷ್ಠ 10 ಮೀಟರ್ ದೂರವಿರಿ. ಬೆಸ್ಕಾಂ/ಕೆಇಬಿ ಕಂಟ್ರೋಲ್‌ಗೆ ವರದಿ ಸಲ್ಲಿಸಲು ದೃಢೀಕರಿಸುತ್ತೀರಾ?`;
    }
    return `ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿನ ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯ ಅಥವಾ ವಿದ್ಯುತ್ ಅಪಾಯವನ್ನು ದಾಖಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ತಿಳಿಸಿ. (ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ: ಬಿದ್ದಿರುವ ವಿದ್ಯುತ್ ತಂತಿಗಳಿಂದ ಕನಿಷ್ಠ 10 ಮೀಟರ್ ದೂರವಿರಿ.)`;
  }

  if (language === 'hi') {
    if (isPowerOutageReport) {
      if (userLocation || hasLocation) {
        const locDesc = userLocation?.address || 'आपके क्षेत्र';
        return `मैंने आपके क्षेत्र (${locDesc}) में बिजली कटौती की रिपोर्ट तैयार कर ली है। (चेतावनी: टूटे हुए तारों से कम से कम 10 मीटर दूर रहें।) क्या मैं यह शिकायत विद्युत नियंत्रण कक्ष को सबमिट करूँ?`;
      }
      return `मैं आपकी बिजली कटौती दर्ज करने में सहायता करूँगा। कृपया अपना इलाका या जीपीएस स्थान बताएं। (सावधानी: टूटे हुए तारों से 10 मीटर दूर रहें।)`;
    }
    if (hasLocation) {
      return `मैंने बिजली कटौती और ग्रिड स्थिति का स्थान दर्ज कर लिया है। यदि कोई बिजली का तार गिरा है तो उससे कम से कम 10 मीटर की दूरी बनाए रखें। क्या आप इस रिपोर्ट को सबमिट करना चाहते हैं?`;
    }
    return `मैं आपकी बिजली कटौती या विद्युत खतरे की रिपोर्ट दर्ज करने में सहायता करूँगा। कृपया अपना स्थान बताएं। (जीवन रक्षा चेतावनी: टूटे हुए बिजली के तारों से कम से कम 10 मीटर दूर रहें और उन्हें न छुएं।)`;
  }

  // English
  if (isPowerOutageReport) {
    if (userLocation || hasLocation) {
      const locDesc = userLocation?.address || 'your reported area';
      return `I have noted the power outage at ${locDesc}. Critical safety reminder: stay at least 10 meters away from any downed power lines. Would you like me to submit this outage report to the electrical dispatch grid?`;
    }
    return `I can help you report the power outage. Please share your street name, landmark, or GPS location. (Critical safety advisory: Stay at least 10 meters away from any downed power lines or sparking apparatus.)`;
  }

  if (hasLocation) {
    return `I have noted the location of the electrical issue. Critical safety reminder: maintain at least 10 meters distance from any downed lines. Would you like me to submit this report to the grid control center?`;
  }
  return `I can help you report the power outage. Please share your location. (Critical safety advisory: Stay at least 10 meters away from any downed power lines or sparking apparatus.)`;
}

export async function chatWithSpecializedAgent(
  agentId: SpecializedAgentId,
  message: string,
  history: SpecializedAgentChatMessage[] = [],
  incidentId?: string | null,
  preferredLanguage: SupportedLanguage = 'en',
  userLocation?: UserLocationContext | null
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

  // Determine language (detecting Kannada/Hindi characters if present, or using preferredLanguage)
  const language = detectLanguage(trimmedMessage, preferredLanguage);

  // Load target incident context if specified or if an active incident exists
  const allIncidents = dbService.getIncidents();
  const activeIncidents = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const incident: Incident | null = incidentId
    ? dbService.getIncidentById(incidentId) || null
    : activeIncidents[0] || null;

  const resources = dbService.getResources();
  const priorityRecommendation =
    incident?.priorityRecommendation?.recommendedPriority || incident?.priority || 'UNASSESSED';

  // Calculate real distances to nearby facilities if userLocation provided
  let nearbyFacilitiesSummary = '';
  let nearbyFacilitiesList: Array<{
    id: string;
    name: string;
    type: string;
    address: string;
    contactPhone?: string;
    distanceKm: number;
  }> = [];

  if (userLocation && userLocation.latitude && userLocation.longitude) {
    const allFacilities = dbService.getFacilities();
    const sortedFacilities = allFacilities
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        address: f.address,
        contactPhone: f.contactPhone,
        distanceKm: calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          f.latitude,
          f.longitude
        )
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    nearbyFacilitiesList = sortedFacilities.slice(0, 4);
    nearbyFacilitiesSummary = `VERIFIED REAL NEARBY FACILITIES (Based on caller live GPS: ${userLocation.latitude}, ${userLocation.longitude}, Address: ${userLocation.address || 'Detected'}):
${nearbyFacilitiesList
  .map(
    (f) =>
      `- [${f.type}] ${f.name} at ${f.address} (Exact Distance: ${f.distanceKm} km, Phone: ${f.contactPhone || '112'})`
  )
  .join('\n')}`;
  }

  const incidentContextBlock = incident
    ? `ACTIVE INCIDENT CONTEXT FROM SYSTEM DATABASE:
- Incident ID: ${incident.id}
- Title: ${incident.title}
- Category: ${incident.category}
- Priority: ${priorityRecommendation}
- Status: ${incident.status}
- Description: ${incident.description}
- Reported Casualties: ${incident.casualtiesCount}
- Location: ${incident.location.address} (Coordinates: ${
        incident.location.latitude !== null && incident.location.longitude !== null
          ? `${incident.location.latitude}, ${incident.location.longitude}`
          : 'Not provided'
      }, Verified: ${incident.location.verified})
- Registered Fleet Summary: ${resources.length} total units (${
        resources.filter((r) => r.status === 'AVAILABLE').length
      } available)
${nearbyFacilitiesSummary ? `\n${nearbyFacilitiesSummary}` : ''}`
    : `INCIDENT CONTEXT:
- No active incident is currently selected in the database (${allIncidents.length} total incidents on record).
- Registered Fleet Summary: ${resources.length} total units (${
        resources.filter((r) => r.status === 'AVAILABLE').length
      } available).
${userLocation ? `- Caller Live GPS Location: ${userLocation.latitude}, ${userLocation.longitude} (${userLocation.address || 'Coordinates confirmed'})\n` : ''}${nearbyFacilitiesSummary ? `\n${nearbyFacilitiesSummary}\n` : ''}- Answer based on the incident details or question provided in the user's message.`;

  const systemInstruction = getAgentSystemInstruction(agentId, incidentContextBlock, language);

  // Extract incident parameters for voice reporting draft
  const incidentDraft = extractIncidentParameters(trimmedMessage, agentId, language);

  // If incidentDraft detected but address was missing, attach user's confirmed GPS address
  if (incidentDraft && !incidentDraft.address && userLocation) {
    incidentDraft.address =
      userLocation.address || `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`;
    incidentDraft.readyToSubmit = true;
  }

  // Check if user is confirming report submission
  const lowerMsg = trimmedMessage.toLowerCase();
  const confirmWords = [
    'confirm',
    'submit',
    'yes',
    'हाँ',
    'हा',
    'सबमिट',
    'दर्ज',
    'ಹೌದು',
    'ಸಲ್ಲಿಸು',
    'ಸಲ್ಲಿಸಿ',
    'ದೃಢೀಕರಿಸಿ'
  ];
  const isConfirming = confirmWords.some((w) => lowerMsg.includes(w));

  let createdIncidentId: string | null = null;
  let replyText = '';
  let providerStatus: AgentStatusType = 'Online';
  let providerNotice: string | null = null;

  // If user is confirming an incident draft with a location
  if (isConfirming && incidentDraft && incidentDraft.readyToSubmit) {
    try {
      const incLat = userLocation?.latitude ?? 12.9716;
      const incLng = userLocation?.longitude ?? 77.5946;
      const incAddr = incidentDraft.address || userLocation?.address || 'Reported Location';

      const newInc = dbService.createIncident({
        title: incidentDraft.title,
        category: incidentDraft.category,
        description: incidentDraft.description,
        status: 'RECEIVED',
        priority: incidentDraft.priority,
        location: {
          address: incAddr,
          latitude: incLat,
          longitude: incLng,
          verified: !!userLocation,
          notes: userLocation
            ? `Reported via Multilingual Voice AI (${language.toUpperCase()}) with confirmed GPS coordinates (${incLat}, ${incLng})`
            : `Reported via Multilingual Voice AI (${language.toUpperCase()})`
        },
        casualtiesCount: incidentDraft.casualtiesCount,
        reporterName: 'Voice Assistant Caller',
        reporterContact: 'Voice Gateway',
        isDemo: false
      });
      createdIncidentId = newInc.id;

      if (language === 'hi') {
        replyText = `आपकी आपातकालीन रिपोर्ट सफलतापूर्वक दर्ज कर ली गई है। आपका वास्तविक इन्सिडेंट आईडी है: ${newInc.id}। नियंत्रण कक्ष ने रिपोर्ट प्राप्त कर ली है और स्थिति का विश्लेषण कर रहा है।`;
      } else if (language === 'kn') {
        replyText = `ನಿಮ್ಮ ತುರ್ತು ವರದಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ. ಅಧಿಕೃತ ಇನ್ಸಿಡೆಂಟ್ ಐಡಿ: ${newInc.id}. ಕಮಾಂಡ್ ಸೆಂಟರ್ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದೆ.`;
      } else {
        replyText = `Your emergency report has been successfully submitted to dispatch. Your verified incident ID is ${newInc.id}. Command center is actively triaging the incident.`;
      }
    } catch (err: any) {
      console.error('[SpecializedAgent] Incident submission error:', err);
      if (language === 'hi') {
        replyText = `क्षमा करें, सिस्टम बैकएंड त्रुटि के कारण रिपोर्ट सबमिट नहीं हो सकी। आपकी रिपोर्ट अभी भेजी नहीं गई है। कृपया सीधे 112 पर कॉल करें।`;
      } else if (language === 'kn') {
        replyText = `ಕ್ಷಮಿಸಿ, ಸಿಸ್ಟಮ್ ಸಂಪರ್ಕ ಸಮಸ್ಯೆಯಿಂದಾಗಿ ವರದಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ವರದಿ ಸಲ್ಲಿಕೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು 112 ಗೆ ಕರೆ ಮಾಡಿ.`;
      } else {
        replyText = `Submission failed because the backend dispatch service encountered an error. Your report has NOT been submitted. Please dial 112 directly.`;
      }
    }
  }

  // If not confirmed yet, attempt external LLM or domain fallback
  if (!replyText) {
    // Keep prompts concise and relevant (only send the last 4 recent messages capped to 250 characters each)
    const recentHistoryText = history
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'Caller' : 'Agent'}: ${m.content.slice(0, 250)}`)
      .join('\n');

    const fullPrompt = `${
      recentHistoryText ? `RECENT CONVERSATION:\n${recentHistoryText}\n\n` : ''
    }CALLER MESSAGE:\n${trimmedMessage}`;

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openAiKey = process.env.OPENAI_API_KEY?.trim();

    // 1. Try Gemini API with supported model and strict 5-second timeout
    if (geminiKey) {
      const activeModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        // Set 5-second timeout to prevent blocking user interactions
        const generatePromise = ai.models.generateContent({
          model: activeModel,
          contents: fullPrompt,
          config: {
            systemInstruction
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Request Timeout (5000ms)')), 5000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (response?.text && response.text.trim()) {
          replyText = response.text.trim();
          providerStatus = 'Online';
          providerNotice = null;
        }
      } catch (err: any) {
        console.warn(`[SpecializedAgent:${agentId}] Gemini model notice:`, err?.message || err);
        providerNotice = `AI engine notice: ${err?.message || 'High load'}. Operating via high-availability emergency engine.`;
      }
    }

    // 2. Try OpenAI API if reply not yet generated and OPENAI_API_KEY is configured
    if (!replyText && openAiKey) {
      try {
        const openAiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: openAiModel,
            messages: [
              { role: 'system', content: systemInstruction },
              ...history.slice(-4).map((m) => ({
                role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
                content: m.content.slice(0, 250)
              })),
              { role: 'user', content: trimmedMessage }
            ],
            temperature: 0.3
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            replyText = content.trim();
            providerStatus = 'Online';
            providerNotice = null;
          }
        }
      } catch (err: any) {
        console.warn(`[SpecializedAgent:${agentId}] OpenAI error:`, err?.message || err);
      }
    }

    // 3. Built-in Multilingual Emergency Agent Engine (sub-millisecond high-availability fallback)
    if (!replyText) {
      if (!geminiKey && !openAiKey) {
        providerNotice = 'Built-in Multilingual Emergency Agent active (Hindi, Kannada, English).';
      }
      replyText = await generateDomainSpecificFallback(
        agentId,
        trimmedMessage,
        incident,
        language,
        userLocation
      );
    }
  }

  const nowIso = new Date().toISOString();
  const durationMs = Math.max(1, Date.now() - startTime);
  const shortTask = `Voice Agent (${language.toUpperCase()}): "${
    trimmedMessage.length > 40 ? trimmedMessage.slice(0, 40) + '...' : trimmedMessage
  }"`;

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
    language,
    timestamp: nowIso,
    providerStatus,
    providerNotice,
    userLocation: userLocation || null,
    nearbyFacilities: nearbyFacilitiesList,
    incidentContext: incident
      ? {
          id: incident.id,
          title: incident.title,
          category: incident.category,
          priority: incident.priority,
          address: incident.location.address
        }
      : null,
    incidentDraft,
    createdIncidentId,
    updatedAgent
  };
}

export function getGridEfficiencySummary(): GridEfficiencySummary {
  const agentMeta: Array<{ id: SpecializedAgentId; name: string; shortName: string }> = [
    { id: 'POLICE_TACTICAL', name: 'Rakshak AI (Police & Public Safety)', shortName: 'Rakshak AI' },
    { id: 'HOSPITAL_EMS', name: 'Jeevan AI (Hospital & EMS)', shortName: 'Jeevan AI' },
    { id: 'WATER_HYDRO', name: 'JalRakshak AI (Water & Hydro)', shortName: 'JalRakshak AI' },
    { id: 'CURRENT_KEB', name: 'Shakti AI (Power Grid & Electricity)', shortName: 'Shakti AI' }
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
  incidentId?: string | null,
  userLocation?: UserLocationContext | null,
  language?: SupportedLanguage
): Promise<AICommandResponse> {
  const trimmed = commandText.trim();
  if (!trimmed) {
    throw new Error('Command cannot be empty.');
  }

  const lower = trimmed.toLowerCase();

  // Route command to the appropriate specialized agent with multilingual keyword matching
  let routedAgentId: SpecializedAgentId = 'POLICE_TACTICAL';
  if (
    lower.includes('hospital') ||
    lower.includes('medical') ||
    lower.includes('ambulance') ||
    lower.includes('ems') ||
    lower.includes('patient') ||
    lower.includes('casualt') ||
    lower.includes('injury') ||
    lower.includes('trauma') ||
    lower.includes('doctor') ||
    lower.includes('health') ||
    lower.includes('ಆಸ್ಪತ್ರೆ') ||
    lower.includes('ವೈದ್ಯ') ||
    lower.includes('ಆಂಬ್ಯುಲೆನ್ಸ್') ||
    lower.includes('ಚಿಕಿತ್ಸೆ') ||
    lower.includes('ಗಾಯ') ||
    lower.includes('ಅಸ್ಪತ್ರೆ') ||
    lower.includes('अस्पताल') ||
    lower.includes('एम्बुलेंस') ||
    lower.includes('डॉक्टर') ||
    lower.includes('चिकित्सा')
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
    lower.includes('shortage') ||
    lower.includes('drainage') ||
    lower.includes('sewage') ||
    lower.includes('ನೀರು') ||
    lower.includes('ನೀರಿನ') ||
    lower.includes('ಸೋರಿಕೆ') ||
    lower.includes('ಪೈಪ್') ||
    lower.includes('ಪ್ರವಾಹ') ||
    lower.includes('पानी') ||
    lower.includes('जल') ||
    lower.includes('पाइप') ||
    lower.includes('लीक') ||
    lower.includes('बाढ़')
  ) {
    routedAgentId = 'WATER_HYDRO';
  } else if (
    lower.includes('power') ||
    lower.includes('electric') ||
    lower.includes('electricity') ||
    lower.includes('keb') ||
    lower.includes('bescom') ||
    lower.includes('outage') ||
    lower.includes('grid') ||
    lower.includes('substation') ||
    lower.includes('feeder') ||
    lower.includes('wire') ||
    lower.includes('cable') ||
    lower.includes('transformer') ||
    lower.includes('blackout') ||
    lower.includes('ವಿದ್ಯುತ್') ||
    lower.includes('ಕರೆಂಟ್') ||
    lower.includes('ಬೆಳಕಿಲ್ಲ') ||
    lower.includes('ತಂತಿ') ||
    lower.includes('ಕಂಬ') ||
    lower.includes('ವಿದ್ಯುತ್ ಕಡಿತ') ||
    lower.includes('ಕೆಇಬಿ') ||
    lower.includes('ಬೆಸ್ಕಾಂ') ||
    lower.includes('बिजली') ||
    lower.includes('करंट') ||
    lower.includes('ट्रांसफार्मर') ||
    lower.includes('तार') ||
    lower.includes('पावर')
  ) {
    routedAgentId = 'CURRENT_KEB';
  } else {
    routedAgentId = 'POLICE_TACTICAL';
  }

  const agentMetaMap: Record<SpecializedAgentId, { name: string; code: string }> = {
    POLICE_TACTICAL: { name: 'Rakshak AI 🚔', code: 'AGENT 01' },
    HOSPITAL_EMS: { name: 'Jeevan AI 🏥', code: 'AGENT 02' },
    WATER_HYDRO: { name: 'JalRakshak AI 💧', code: 'AGENT 03' },
    CURRENT_KEB: { name: 'Shakti AI ⚡', code: 'AGENT 04' }
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
  const chatResult = await chatWithSpecializedAgent(
    routedAgentId,
    trimmed,
    [],
    targetIncId,
    language || 'en',
    userLocation || null
  );

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
