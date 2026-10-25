import { Incident, Resource } from '../types';
import { calculateRoadRoute, RouteCalculationResult } from '../roadGraph';

export interface RoutePlanningOutput {
  status: 'SUCCESS' | 'PREREQUISITE_FAILED' | 'UNREACHABLE';
  distanceKm?: number;
  estimatedMinutes?: number;
  steps?: string[];
  polyline?: [number, number][];
  dataSource: string;
  limitations: string[];
  message: string;
}

export function runRoutePlanningAgent(
  incident: Incident,
  selectedResource?: Resource | null
): RoutePlanningOutput {
  // Prerequisite check: location must be verified and coordinates present
  if (
    !incident.location.verified ||
    incident.location.latitude === null ||
    incident.location.longitude === null
  ) {
    return {
      status: 'PREREQUISITE_FAILED',
      dataSource: 'Metro Graph Routing Engine v2.4 (Dijkstra)',
      limitations: [
        'Route planning halted: missing verified GPS coordinates.',
        'Deterministic road-graph algorithm strictly prohibits fabricating emergency routes without ground coordinates.',
        'Operator must verify coordinates on map before route can be dispatched.'
      ],
      message: 'Prerequisite check failed: Incident location is unverified. Cannot calculate road dispatch routes without confirmed coordinates.'
    };
  }

  // If no resource is chosen, route from default central emergency dispatch hub
  const originLat = selectedResource?.latitude ?? 37.7785; // Fire Station #1 default
  const originLng = selectedResource?.longitude ?? -122.4115;

  const result = calculateRoadRoute(
    originLat,
    originLng,
    incident.location.latitude,
    incident.location.longitude,
    incident.location.verified
  );

  const stepStrings = result.steps?.map(s => `${s.instruction} (${s.distanceKm} km, ~${s.estimatedMinutes} min)`) || [];

  return {
    status: result.status,
    distanceKm: result.distanceKm,
    estimatedMinutes: result.estimatedDurationMinutes,
    steps: stepStrings,
    polyline: result.polyline,
    dataSource: result.dataSource,
    limitations: result.limitations,
    message: result.message
  };
}
