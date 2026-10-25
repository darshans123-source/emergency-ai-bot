export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  streetName: string;
  distanceKm: number;
  speedLimitKph: number;
  lanes: number;
  roadType: 'freeway' | 'arterial' | 'collector' | 'emergency_access';
}

export interface RouteStep {
  instruction: string;
  distanceKm: number;
  estimatedMinutes: number;
  streetName: string;
}

export interface RouteCalculationResult {
  status: 'SUCCESS' | 'PREREQUISITE_FAILED' | 'UNREACHABLE';
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  steps?: RouteStep[];
  polyline?: [number, number][];
  dataSource: string;
  limitations: string[];
  message: string;
}

// Metropolitan Road Network Graph (Simulated Metropolitan Emergency District)
export const METRO_NODES: Record<string, RoadNode> = {
  'N-01': { id: 'N-01', name: 'Metro General Hospital / Medical Blvd', lat: 37.7749, lng: -122.4194 },
  'N-02': { id: 'N-02', name: 'Downtown Central Station / Market & 4th', lat: 37.7858, lng: -122.4065 },
  'N-03': { id: 'N-03', name: 'Fire Station #1 / Mission & 7th', lat: 37.7785, lng: -122.4115 },
  'N-04': { id: 'N-04', name: 'Highway 101 Northbound Interchange', lat: 37.7690, lng: -122.4075 },
  'N-05': { id: 'N-05', name: 'Westside Transit Hub / Van Ness Ave', lat: 37.7812, lng: -122.4215 },
  'N-06': { id: 'N-06', name: 'East Industrial Corridor / 3rd & 16th', lat: 37.7650, lng: -122.3910 },
  'N-07': { id: 'N-07', name: 'Embarcadero Waterfront / Pier 14', lat: 37.7935, lng: -122.3925 },
  'N-08': { id: 'N-08', name: 'South Police Precinct / Bryant & 6th', lat: 37.7755, lng: -122.4040 },
  'N-09': { id: 'N-09', name: 'Bay Bridge Approach & Harrison', lat: 37.7880, lng: -122.3960 },
  'N-10': { id: 'N-10', name: 'Civic Center Command Plaza / Polk St', lat: 37.7795, lng: -122.4180 },
  'N-11': { id: 'N-11', name: 'North Riverfront Park & Marina', lat: 37.8020, lng: -122.4250 },
  'N-12': { id: 'N-12', name: 'Mission District Residential Gate / 18th & Valencia', lat: 37.7618, lng: -122.4215 }
};

export const METRO_EDGES: RoadEdge[] = [
  // Medical Blvd to Civic Center
  { from: 'N-01', to: 'N-10', streetName: 'Medical Blvd / Grove St', distanceKm: 0.6, speedLimitKph: 45, lanes: 2, roadType: 'arterial' },
  { from: 'N-10', to: 'N-01', streetName: 'Medical Blvd / Grove St', distanceKm: 0.6, speedLimitKph: 45, lanes: 2, roadType: 'arterial' },

  // Civic Center to Westside
  { from: 'N-10', to: 'N-05', streetName: 'Van Ness Avenue', distanceKm: 0.5, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },
  { from: 'N-05', to: 'N-10', streetName: 'Van Ness Avenue', distanceKm: 0.5, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },

  // Civic Center to Fire Station #1
  { from: 'N-10', to: 'N-03', streetName: 'Market Street', distanceKm: 0.8, speedLimitKph: 40, lanes: 2, roadType: 'emergency_access' },
  { from: 'N-03', to: 'N-10', streetName: 'Market Street', distanceKm: 0.8, speedLimitKph: 40, lanes: 2, roadType: 'emergency_access' },

  // Fire Station #1 to Downtown Central Station
  { from: 'N-03', to: 'N-02', streetName: 'Market & 5th St', distanceKm: 0.9, speedLimitKph: 40, lanes: 2, roadType: 'arterial' },
  { from: 'N-02', to: 'N-03', streetName: 'Market & 5th St', distanceKm: 0.9, speedLimitKph: 40, lanes: 2, roadType: 'arterial' },

  // Fire Station #1 to South Police Precinct
  { from: 'N-03', to: 'N-08', streetName: '7th St to Bryant St', distanceKm: 0.7, speedLimitKph: 45, lanes: 2, roadType: 'arterial' },
  { from: 'N-08', to: 'N-03', streetName: '7th St to Bryant St', distanceKm: 0.7, speedLimitKph: 45, lanes: 2, roadType: 'arterial' },

  // South Police Precinct to Highway 101 Interchange
  { from: 'N-08', to: 'N-04', streetName: 'Bryant Expressway', distanceKm: 1.1, speedLimitKph: 60, lanes: 3, roadType: 'arterial' },
  { from: 'N-04', to: 'N-08', streetName: 'Bryant Expressway', distanceKm: 1.1, speedLimitKph: 60, lanes: 3, roadType: 'arterial' },

  // Highway 101 Interchange to East Industrial Corridor
  { from: 'N-04', to: 'N-06', streetName: 'Highway 101 / Cesar Chavez Connect', distanceKm: 1.6, speedLimitKph: 80, lanes: 4, roadType: 'freeway' },
  { from: 'N-06', to: 'N-04', streetName: 'Highway 101 / Cesar Chavez Connect', distanceKm: 1.6, speedLimitKph: 80, lanes: 4, roadType: 'freeway' },

  // Highway 101 to Mission Residential Gate
  { from: 'N-04', to: 'N-12', streetName: 'South Van Ness Blvd', distanceKm: 1.4, speedLimitKph: 50, lanes: 2, roadType: 'collector' },
  { from: 'N-12', to: 'N-04', streetName: 'South Van Ness Blvd', distanceKm: 1.4, speedLimitKph: 50, lanes: 2, roadType: 'collector' },

  // Medical Blvd to Mission Residential Gate
  { from: 'N-01', to: 'N-12', streetName: 'Valencia Corridor', distanceKm: 1.5, speedLimitKph: 45, lanes: 2, roadType: 'collector' },
  { from: 'N-12', to: 'N-01', streetName: 'Valencia Corridor', distanceKm: 1.5, speedLimitKph: 45, lanes: 2, roadType: 'collector' },

  // Downtown Central Station to Bay Bridge Approach
  { from: 'N-02', to: 'N-09', streetName: '1st Street Corridor', distanceKm: 0.9, speedLimitKph: 45, lanes: 3, roadType: 'arterial' },
  { from: 'N-09', to: 'N-02', streetName: '1st Street Corridor', distanceKm: 0.9, speedLimitKph: 45, lanes: 3, roadType: 'arterial' },

  // Bay Bridge Approach to Embarcadero Waterfront
  { from: 'N-09', to: 'N-07', streetName: 'Embarcadero South', distanceKm: 0.7, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },
  { from: 'N-07', to: 'N-09', streetName: 'Embarcadero South', distanceKm: 0.7, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },

  // East Industrial Corridor to Embarcadero Waterfront
  { from: 'N-06', to: 'N-07', streetName: '3rd Street Waterfront Arterial', distanceKm: 3.2, speedLimitKph: 55, lanes: 3, roadType: 'arterial' },
  { from: 'N-07', to: 'N-06', streetName: '3rd Street Waterfront Arterial', distanceKm: 3.2, speedLimitKph: 55, lanes: 3, roadType: 'arterial' },

  // Westside to North Riverfront Park
  { from: 'N-05', to: 'N-11', streetName: 'Lombard / Marina Blvd', distanceKm: 2.3, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },
  { from: 'N-11', to: 'N-05', streetName: 'Lombard / Marina Blvd', distanceKm: 2.3, speedLimitKph: 50, lanes: 3, roadType: 'arterial' },

  // Downtown to Embarcadero
  { from: 'N-02', to: 'N-07', streetName: 'Market Street to Ferry Plaza', distanceKm: 1.4, speedLimitKph: 40, lanes: 2, roadType: 'arterial' },
  { from: 'N-07', to: 'N-02', streetName: 'Market Street to Ferry Plaza', distanceKm: 1.4, speedLimitKph: 40, lanes: 2, roadType: 'arterial' }
];

// Haversine distance in kilometers
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest node in graph to arbitrary coordinates
export function findNearestNode(lat: number, lng: number): RoadNode {
  let nearest: RoadNode = METRO_NODES['N-01'];
  let minDistance = Infinity;

  for (const node of Object.values(METRO_NODES)) {
    const dist = haversineDistance(lat, lng, node.lat, node.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  }
  return nearest;
}

// Dijkstra Algorithm with travel-time weights
export function calculateRoadRoute(
  startLat: number | null | undefined,
  startLng: number | null | undefined,
  destLat: number | null | undefined,
  destLng: number | null | undefined,
  isLocationVerified: boolean
): RouteCalculationResult {
  // Prerequisite validation
  if (
    startLat === null ||
    startLat === undefined ||
    startLng === null ||
    startLng === undefined ||
    destLat === null ||
    destLat === undefined ||
    destLng === null ||
    destLng === undefined ||
    !isLocationVerified
  ) {
    return {
      status: 'PREREQUISITE_FAILED',
      dataSource: 'Metro Graph Routing Engine v2.4 (Dijkstra)',
      limitations: [
        'Requires verified origin and destination coordinates',
        'Cannot calculate road routes on unverified or approximate location',
        'Human operator must verify location before route execution'
      ],
      message: 'Location unverified or missing coordinates. Prerequisite failed: routing requires verified incident location.'
    };
  }

  const startNode = findNearestNode(startLat, startLng);
  const destNode = findNearestNode(destLat, destLng);

  // Adjacency graph
  const adj: Record<string, Array<{ to: string; edge: RoadEdge }>> = {};
  for (const node of Object.values(METRO_NODES)) {
    adj[node.id] = [];
  }
  for (const edge of METRO_EDGES) {
    adj[edge.from]?.push({ to: edge.to, edge });
  }

  // Dijkstra data structures
  const distances: Record<string, number> = {};
  const previousEdge: Record<string, RoadEdge | null> = {};
  const previousNode: Record<string, string | null> = {};
  const visited = new Set<string>();

  for (const nodeId of Object.keys(METRO_NODES)) {
    distances[nodeId] = Infinity;
    previousEdge[nodeId] = null;
    previousNode[nodeId] = null;
  }
  distances[startNode.id] = 0;

  while (visited.size < Object.keys(METRO_NODES).length) {
    let currNodeId: string | null = null;
    let minD = Infinity;

    for (const [nodeId, dist] of Object.entries(distances)) {
      if (!visited.has(nodeId) && dist < minD) {
        minD = dist;
        currNodeId = nodeId;
      }
    }

    if (!currNodeId || minD === Infinity) break;
    if (currNodeId === destNode.id) break;

    visited.add(currNodeId);

    const neighbors = adj[currNodeId] || [];
    for (const { to, edge } of neighbors) {
      if (visited.has(to)) continue;
      // Edge weight = travel time in minutes: (distanceKm / speedLimitKph) * 60
      const travelTimeMinutes = (edge.distanceKm / edge.speedLimitKph) * 60;
      const newDist = distances[currNodeId] + travelTimeMinutes;

      if (newDist < distances[to]) {
        distances[to] = newDist;
        previousEdge[to] = edge;
        previousNode[to] = currNodeId;
      }
    }
  }

  // Reconstruct path
  if (distances[destNode.id] === Infinity && startNode.id !== destNode.id) {
    return {
      status: 'UNREACHABLE',
      dataSource: 'Metro Graph Routing Engine v2.4 (Dijkstra)',
      limitations: ['No connected road corridor found between selected nodes'],
      message: 'Destination cannot be reached through the active emergency road network graph.'
    };
  }

  const pathEdges: RoadEdge[] = [];
  let curr: string | null = destNode.id;
  while (curr && curr !== startNode.id) {
    const edge = previousEdge[curr];
    if (!edge) break;
    pathEdges.unshift(edge);
    curr = previousNode[curr];
  }

  // Build polyline
  const polyline: [number, number][] = [];
  polyline.push([startLat, startLng]);
  polyline.push([startNode.lat, startNode.lng]);

  let totalDistanceKm = haversineDistance(startLat, startLng, startNode.lat, startNode.lng);
  let totalTimeMins = (totalDistanceKm / 40) * 60;

  const steps: RouteStep[] = [];
  if (totalDistanceKm > 0.05) {
    steps.push({
      instruction: `Depart origin toward ${startNode.name}`,
      distanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedMinutes: Number(totalTimeMins.toFixed(1)),
      streetName: 'Local Access Road'
    });
  }

  for (const edge of pathEdges) {
    const fromNode = METRO_NODES[edge.from];
    const toNode = METRO_NODES[edge.to];
    polyline.push([toNode.lat, toNode.lng]);

    totalDistanceKm += edge.distanceKm;
    const legMinutes = (edge.distanceKm / edge.speedLimitKph) * 60;
    totalTimeMins += legMinutes;

    steps.push({
      instruction: `Proceed along ${edge.streetName} toward ${toNode.name} (${edge.roadType})`,
      distanceKm: edge.distanceKm,
      estimatedMinutes: Number(legMinutes.toFixed(1)),
      streetName: edge.streetName
    });
  }

  const finalLeg = haversineDistance(destNode.lat, destNode.lng, destLat, destLng);
  if (finalLeg > 0.05) {
    totalDistanceKm += finalLeg;
    const finalMinutes = (finalLeg / 35) * 60;
    totalTimeMins += finalMinutes;
    polyline.push([destLat, destLng]);
    steps.push({
      instruction: `Arrive at emergency site destination (${destLat.toFixed(4)}, ${destLng.toFixed(4)})`,
      distanceKm: Number(finalLeg.toFixed(2)),
      estimatedMinutes: Number(finalMinutes.toFixed(1)),
      streetName: 'Incident Approach Access'
    });
  } else {
    polyline.push([destLat, destLng]);
  }

  return {
    status: 'SUCCESS',
    distanceKm: Number(totalDistanceKm.toFixed(2)),
    estimatedDurationMinutes: Number(Math.max(1, totalTimeMins).toFixed(1)),
    steps,
    polyline,
    dataSource: 'Metro Graph Routing Engine v2.4 (OpenStreetMap-aligned graph)',
    limitations: [
      'Simulated emergency network graph based on designated arterial corridors',
      'Does not account for unmonitored flash road closures without operator override',
      'Operator must confirm safe road access on arrival'
    ],
    message: `Calculated ${totalDistanceKm.toFixed(2)} km route via ${steps.length} network segments with estimated ETA of ${Math.round(totalTimeMins)} minutes.`
  };
}
