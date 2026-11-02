// Local fallback data for pages that previously failed when the backend was unreachable.
// Converted from the existing demo datasets, with a subtle "Simulated data" label in the UI.
// Nothing here claims to be verified live information, a real dispatch, or real availability.
import { DemoIncident, DemoUnit, DEMO_HOSPITALS, DEMO_POLICE_STATIONS } from './demoData';
import { Incident, IncidentCategory, IncidentStatus, Resource, ResourceType, ResourceStatus, EmergencyFacility, FacilityType } from '../types';

function mapCategory(c: string): IncidentCategory {
  if (c === 'ROAD_ACCIDENT' || c === 'MEDICAL_EMERGENCY' || c === 'FIRE_INCIDENT' || c === 'FLOOD' || c === 'PUBLIC_SAFETY') return c as IncidentCategory;
  return 'OTHER';
}
function mapStatus(s: string): IncidentStatus {
  if (s === 'ACTIVE') return 'UNDER_REVIEW';
  if (s === 'DISPATCHED') return 'RESOURCES_DISPATCHED';
  return 'RESOLVED';
}
export function demoIncidentToIncident(d: DemoIncident): Incident {
  return {
    id: d.id, title: d.title, category: mapCategory(d.category), priority: d.priority, status: mapStatus(d.status),
    description: d.description, casualtiesCount: 0,
    location: { address: d.address, latitude: null, longitude: null, verified: false },
    createdAt: d.createdAt, updatedAt: d.createdAt, reportedBy: 'Simulated data', reporterContact: 'N/A', isDemo: true,
  } as Incident;
}
function mapUnitType(t: string): ResourceType {
  if (t === 'POLICE') return 'POLICE_PATROL';
  if (t === 'AMBULANCE') return 'AMBULANCE';
  return 'FIRE_UNIT';
}
function mapUnitStatus(s: string): ResourceStatus {
  if (s === 'AVAILABLE') return 'AVAILABLE';
  if (s === 'ON_DUTY') return 'ASSIGNED';
  return 'UNAVAILABLE';
}
export function demoUnitToResource(u: DemoUnit): Resource {
  return {
    id: u.id, name: u.name, type: mapUnitType(u.type), status: mapUnitStatus(u.status),
    latitude: 0, longitude: 0, address: u.station, capacity: 'Demo unit', operationalNotes: 'Simulated data — availability is not verified live.',
    assignedIncidentId: null, isDemo: true, lastVerifiedAt: '',
  } as Resource;
}
export function demoFacilities(): EmergencyFacility[] {
  // Only facility types the app supports are included (hospitals, police stations).
  // Fire stations from the demo data are shown as fire units in Resources, not as facilities.
  const list: EmergencyFacility[] = [];
  DEMO_HOSPITALS.forEach((h) => list.push({ id: h.id, name: h.name, type: 'HOSPITAL' as FacilityType, address: h.address, latitude: 0, longitude: 0, contactPhone: h.phone, operationalStatus: 'OPERATIONAL', agentDomain: 'HOSPITAL_EMS', details: 'Simulated data — availability is not verified live.', verified: false } as unknown as EmergencyFacility));
  DEMO_POLICE_STATIONS.forEach((s) => list.push({ id: s.id, name: s.name, type: 'POLICE_STATION' as FacilityType, address: s.address, latitude: 0, longitude: 0, contactPhone: s.phone, operationalStatus: 'OPERATIONAL', agentDomain: 'POLICE_TACTICAL', details: 'Simulated data — availability is not verified live.', verified: false } as unknown as EmergencyFacility));
  return list;
}
