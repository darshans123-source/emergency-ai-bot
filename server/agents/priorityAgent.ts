import { Incident, IncidentPriority } from '../types';
import { AnalysisOutput } from './analysisAgent';

export interface PriorityOutput {
  recommendedPriority: IncidentPriority;
  score: number;
  explanation: string;
  evidence: string[];
  missingInfo: string[];
  confidence: number;
  scoringBreakdown: {
    lifeDangerPoints: number;
    casualtyScalePoints: number;
    hazardSeverityPoints: number;
    uncertaintyAdjustmentPoints: number;
  };
  disclaimer: string;
}

export function runPriorityAssessmentAgent(
  incident: Incident,
  analysis: AnalysisOutput
): PriorityOutput {
  const desc = (incident.description + ' ' + incident.title).toLowerCase();

  // If incident lacks basic description or content, mark unassessed
  if (desc.trim().length < 15 && incident.casualtiesCount === 0) {
    return {
      recommendedPriority: 'UNASSESSED',
      score: 0,
      explanation: 'Insufficient information provided to assess emergency severity score.',
      evidence: ['Minimal report description logged'],
      missingInfo: ['Detailed incident nature', 'Casualty estimates', 'Immediate hazards'],
      confidence: 0.1,
      scoringBreakdown: {
        lifeDangerPoints: 0,
        casualtyScalePoints: 0,
        hazardSeverityPoints: 0,
        uncertaintyAdjustmentPoints: 0
      },
      disclaimer: 'DECISION SUPPORT ONLY. Authorized human operator triage review required.'
    };
  }

  let lifeDangerPoints = 0;
  let casualtyScalePoints = 0;
  let hazardSeverityPoints = 0;
  let uncertaintyPoints = 10;
  const evidence: string[] = [];
  const missingInfo = [...analysis.missingInformation];

  // 1. Life Danger (Max 40)
  if (
    desc.includes('cardiac') ||
    desc.includes('unresponsive') ||
    desc.includes('not breathing') ||
    desc.includes('cpr')
  ) {
    lifeDangerPoints += 38;
    evidence.push('Life threat: Active cardiac arrest or unresponsiveness flagged (+38)');
  } else if (desc.includes('trapped') || desc.includes('pinned') || desc.includes('extricat')) {
    lifeDangerPoints += 34;
    evidence.push('Life threat: Trapped occupant requiring physical rescue (+34)');
  } else if (desc.includes('severe bleeding') || desc.includes('head trauma') || desc.includes('burn')) {
    lifeDangerPoints += 25;
    evidence.push('Life threat: Severe physiological trauma (+25)');
  } else if (desc.includes('injured') || desc.includes('casualty') || incident.casualtiesCount > 0) {
    lifeDangerPoints += 15;
    evidence.push('Life threat: Injury confirmed by caller (+15)');
  }

  if (desc.includes('fuel leak') || desc.includes('explosion') || desc.includes('flammable')) {
    lifeDangerPoints = Math.min(40, lifeDangerPoints + 15);
    evidence.push('Life threat: Explosive or active fuel propagation hazard (+15)');
  }

  // 2. Casualty Scale (Max 25)
  if (incident.casualtiesCount >= 4) {
    casualtyScalePoints = 25;
    evidence.push(`Mass casualty factor: ${incident.casualtiesCount} people affected (+25)`);
  } else if (incident.casualtiesCount >= 2) {
    casualtyScalePoints = 18;
    evidence.push(`Multiple casualties: ${incident.casualtiesCount} people affected (+18)`);
  } else if (incident.casualtiesCount === 1) {
    casualtyScalePoints = 10;
    evidence.push(`Single casualty reported (+10)`);
  }

  // 3. Hazard Severity (Max 20)
  switch (incident.category) {
    case 'ROAD_ACCIDENT':
      hazardSeverityPoints = desc.includes('overturn') || desc.includes('multi-vehicle') ? 18 : 12;
      break;
    case 'FIRE_INCIDENT':
      hazardSeverityPoints = desc.includes('structure') || desc.includes('warehouse') || desc.includes('heavy smoke') ? 20 : 14;
      break;
    case 'FLOOD':
      hazardSeverityPoints = desc.includes('surge') || desc.includes('deep') ? 18 : 12;
      break;
    case 'NATURAL_DISASTER':
      hazardSeverityPoints = 19;
      break;
    case 'MEDICAL_EMERGENCY':
      hazardSeverityPoints = 16;
      break;
    case 'PUBLIC_SAFETY':
      hazardSeverityPoints = desc.includes('chemical') || desc.includes('spill') ? 14 : 8;
      break;
    default:
      hazardSeverityPoints = 8;
  }
  evidence.push(`Hazard class weight for ${incident.category} (+${hazardSeverityPoints})`);

  // 4. Uncertainty & Location verification check (Max 15)
  if (incident.location.verified) {
    uncertaintyPoints = 15;
  } else {
    uncertaintyPoints = 5;
    missingInfo.push('Precise location coordinates unverified');
  }

  const rawScore = lifeDangerPoints + casualtyScalePoints + hazardSeverityPoints + uncertaintyPoints;
  const score = Math.min(100, Math.max(5, rawScore));

  let recommendedPriority: IncidentPriority = 'LOW';
  if (score >= 80) {
    recommendedPriority = 'CRITICAL';
  } else if (score >= 60) {
    recommendedPriority = 'HIGH';
  } else if (score >= 35) {
    recommendedPriority = 'MEDIUM';
  } else {
    recommendedPriority = 'LOW';
  }

  const confidence = incident.location.verified && incident.casualtiesCount > 0 ? 0.94 : 0.76;

  const explanation =
    recommendedPriority === 'CRITICAL'
      ? `Assessed as CRITICAL (Score: ${score}/100) due to acute danger to human life, active trapped victims, or expanding hazardous threats.`
      : recommendedPriority === 'HIGH'
      ? `Assessed as HIGH (Score: ${score}/100) requiring urgent multi-unit response before environmental or structural degradation occurs.`
      : recommendedPriority === 'MEDIUM'
      ? `Assessed as MEDIUM (Score: ${score}/100) with moderate operational complexity and no immediate catastrophic threat reported.`
      : `Assessed as LOW (Score: ${score}/100) representing manageable property or traffic impact with low life safety risk.`;

  return {
    recommendedPriority,
    score,
    explanation,
    evidence,
    missingInfo,
    confidence,
    scoringBreakdown: {
      lifeDangerPoints,
      casualtyScalePoints,
      hazardSeverityPoints,
      uncertaintyAdjustmentPoints: uncertaintyPoints
    },
    disclaimer: 'DECISION SUPPORT ONLY. Not a clinically validated or certified emergency triage instrument. Authorized operator review required.'
  };
}
