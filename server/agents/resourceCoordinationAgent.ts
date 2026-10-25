import { Incident, Resource, ResourceType } from '../types';
import { haversineDistance } from '../roadGraph';
import { dbService } from '../db';

export interface CandidateResourceRecommendation {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  currentStatus: string;
  distanceKm: number;
  estimatedMinutes: number;
  matchScore: number;
  matchReason: string;
  conflictDetected: boolean;
  conflictDetails?: string;
}

export interface ResourceCoordinationOutput {
  candidateResources: CandidateResourceRecommendation[];
  summary: string;
  conflictsIdentifiedCount: number;
  prerequisitesMet: boolean;
  missingPrerequisites?: string[];
}

export function runResourceCoordinationAgent(
  incident: Incident,
  allResources: Resource[]
): ResourceCoordinationOutput {
  const missingPrereqs: string[] = [];

  if (!incident.location.verified || incident.location.latitude === null || incident.location.longitude === null) {
    missingPrereqs.push('Verified incident GPS coordinates are missing for distance ranking.');
  }

  // Desired resource types based on category
  const targetTypes: ResourceType[] = [];
  switch (incident.category) {
    case 'ROAD_ACCIDENT':
      targetTypes.push('AMBULANCE', 'FIRE_UNIT', 'POLICE_PATROL');
      break;
    case 'MEDICAL_EMERGENCY':
      targetTypes.push('AMBULANCE');
      break;
    case 'FIRE_INCIDENT':
      targetTypes.push('FIRE_UNIT', 'AMBULANCE', 'RESCUE_TEAM');
      break;
    case 'FLOOD':
      targetTypes.push('RESCUE_TEAM', 'GENERAL_SUPPORT');
      break;
    case 'NATURAL_DISASTER':
      targetTypes.push('RESCUE_TEAM', 'FIRE_UNIT', 'AMBULANCE');
      break;
    case 'PUBLIC_SAFETY':
      targetTypes.push('POLICE_PATROL', 'GENERAL_SUPPORT');
      break;
    default:
      targetTypes.push('GENERAL_SUPPORT', 'POLICE_PATROL');
  }

  const incLat = incident.location.latitude ?? 37.7749;
  const incLng = incident.location.longitude ?? -122.4194;

  const candidates: CandidateResourceRecommendation[] = [];
  let conflictsCount = 0;

  for (const res of allResources) {
    const isTypeMatch = targetTypes.includes(res.type);
    if (!isTypeMatch) continue;

    // Calculate straight-line distance for baseline proximity
    const distKm = Number(haversineDistance(res.latitude, res.longitude, incLat, incLng).toFixed(2));
    const estMins = Number(Math.max(1, (distKm / 45) * 60).toFixed(1));

    let matchScore = 100 - Math.min(60, distKm * 10);
    if (res.status === 'AVAILABLE') {
      matchScore += 10;
    }

    // Check conflict
    const isConflict = res.status !== 'AVAILABLE' || (res.assignedIncidentId !== null && res.assignedIncidentId !== incident.id);
    let conflictDetails: string | undefined;

    if (isConflict) {
      conflictsCount++;
      matchScore -= 40;
      conflictDetails = `Unit is currently ${res.status}${res.assignedIncidentId ? ` on incident ${res.assignedIncidentId}` : ''}. Assignment requires re-allocation or release.`;
    }

    let matchReason = '';
    if (res.type === 'AMBULANCE') {
      matchReason = 'Emergency medical response and trauma transport capabilities.';
    } else if (res.type === 'FIRE_UNIT') {
      matchReason = 'Hydraulic extrication tools and active fire suppression pumping.';
    } else if (res.type === 'POLICE_PATROL') {
      matchReason = 'Scene perimeter safety, route clearance, and vehicular traffic control.';
    } else if (res.type === 'RESCUE_TEAM') {
      matchReason = 'Specialized structural breaching, high-angle rescue, or technical search.';
    } else {
      matchReason = 'General incident support and hazardous containment capabilities.';
    }

    candidates.push({
      resourceId: res.id,
      resourceName: res.name,
      resourceType: res.type,
      currentStatus: res.status,
      distanceKm: distKm,
      estimatedMinutes: estMins,
      matchScore: Math.max(10, Math.round(matchScore)),
      matchReason,
      conflictDetected: isConflict,
      conflictDetails
    });
  }

  // Sort by match score descending (available & closest first)
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    candidateResources: candidates,
    summary: `Identified ${candidates.length} candidate resource units across ${targetTypes.length} operational categories (${conflictsCount} busy/conflicted units noted).`,
    conflictsIdentifiedCount: conflictsCount,
    prerequisitesMet: missingPrereqs.length === 0,
    missingPrerequisites: missingPrereqs.length > 0 ? missingPrereqs : undefined
  };
}
