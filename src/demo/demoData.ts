// Realistic-looking but clearly fictional demo data for the AegisAI DEMO simulation.
// The 25 incident records live in src/data/demoIncidents.json and are imported here,
// so the JSON file is the canonical record set, not a dead copy.
// Nothing here is live, verified, or a real dispatch. All names are generic.
import demoIncidentsJson from '../data/demoIncidents.json';

export type DemoUnitType = 'POLICE' | 'AMBULANCE' | 'FIRE';
export interface DemoIncident {
  id: string; title: string; category: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'DISPATCHED' | 'RESOLVED'; city: string; address: string; description: string; createdAt: string;
}
export interface DemoUnit { id: string; type: DemoUnitType; name: string; station: string; city: string; status: 'AVAILABLE' | 'ON_DUTY' | 'OFFLINE'; }
export interface DemoFacility { id: string; name: string; city: string; address: string; phone: string; extra: string; }
export interface DemoInfraReport { id: string; type: string; city: string; address: string; status: string; description: string; }

export const DEMO_CITIES = ['Bengaluru', 'Hyderabad', 'Raichur', 'Kalaburagi', 'Hubballi', 'Mysuru'];
const C = DEMO_CITIES;
export const DEMO_INCIDENTS: DemoIncident[] = (demoIncidentsJson.incidents as any[]).map((i) => ({
  id: i.id, title: i.title, category: i.category, priority: i.priority, status: i.status,
  city: i.city, address: i.address, description: i.description, createdAt: i.createdAt,
}));
function units(type: DemoUnitType, cityList: string[]): DemoUnit[] {
  return cityList.map((city, i) => ({
    id: `${type.slice(0, 3)}-${String(i + 1).padStart(2, '0')}`, type,
    name: type === 'POLICE' ? `Patrol Unit ${city.slice(0, 3).toUpperCase()}-${i + 1}` : type === 'AMBULANCE' ? `Ambulance ${city.slice(0, 3).toUpperCase()}-${i + 1}` : `Fire Tender ${city.slice(0, 3).toUpperCase()}-${i + 1}`,
    station: type === 'POLICE' ? `Central Police Station, ${city}` : type === 'AMBULANCE' ? `City Ambulance Base, ${city}` : `Central Fire Station, ${city}`,
    city, status: i % 4 === 3 ? 'ON_DUTY' : 'AVAILABLE',
  }));
}
export const DEMO_POLICE_UNITS = units('POLICE', [...C, ...C.slice(0, 4)]);
export const DEMO_AMBULANCE_UNITS = units('AMBULANCE', [...C, ...C.slice(0, 4)]);
export const DEMO_FIRE_UNITS = units('FIRE', [...C, ...C.slice(0, 4)]);
export const DEMO_HOSPITALS: DemoFacility[] = DEMO_CITIES.flatMap((city, ci) => {
  const list: DemoFacility[] = [
    { id: `H-${ci * 3 + 1}`, name: `City General Hospital, ${city}`, city, address: `Main Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Emergency ward (demo)' },
    { id: `H-${ci * 3 + 2}`, name: `District Care Hospital, ${city}`, city, address: `Hospital Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Trauma care (demo)' },
  ];
  if (ci < 3) list.push({ id: `H-${ci * 3 + 3}`, name: `Community Health Centre, ${city}`, city, address: `Health Centre Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'General care (demo)' });
  return list;
});
export const DEMO_POLICE_STATIONS: DemoFacility[] = DEMO_CITIES.flatMap((city, ci) => [
  { id: `PS-${ci * 2 + 1}`, name: `Central Police Station, ${city}`, city, address: `Station Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Demo station' },
  { id: `PS-${ci * 2 + 2}`, name: `Traffic Police Station, ${city}`, city, address: `Main Circle, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Demo station' },
]).slice(0, 10);
export const DEMO_FIRE_STATIONS: DemoFacility[] = DEMO_CITIES.flatMap((city, ci) => [
  { id: `FS-${ci * 2 + 1}`, name: `Central Fire Station, ${city}`, city, address: `Fire Station Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Demo station' },
  { id: `FS-${ci * 2 + 2}`, name: `Rescue Fire Station, ${city}`, city, address: `Rescue Road, ${city}`, phone: 'Demo only — call 112 for real help', extra: 'Demo station' },
]).slice(0, 10);
export const DEMO_INFRA_REPORTS: DemoInfraReport[] = [
  { id: 'INF-01', type: 'Water supply', city: 'Bengaluru', address: 'Koramangala', status: 'Open', description: 'Simulated water-supply complaint.' },
  { id: 'INF-02', type: 'Power outage', city: 'Raichur', address: 'Gandhi Nagar', status: 'In progress (demo)', description: 'Simulated power-outage complaint.' },
  { id: 'INF-03', type: 'Road damage', city: 'Hubballi', address: 'Gokul Road', status: 'Open', description: 'Simulated pothole / road-damage report.' },
  { id: 'INF-04', type: 'Drain overflow', city: 'Kalaburagi', address: 'Old City', status: 'Open', description: 'Simulated drain-overflow report.' },
  { id: 'INF-05', type: 'Street light', city: 'Mysuru', address: 'Vijayanagar', status: 'Open', description: 'Simulated street-light failure.' },
  { id: 'INF-06', type: 'Water leak', city: 'Hyderabad', address: 'Secunderabad Road', status: 'In progress (demo)', description: 'Simulated pipeline leak.' },
  { id: 'INF-07', type: 'Flood', city: 'Bengaluru', address: 'Low-lying area, Whitefield', status: 'Open', description: 'Simulated waterlogging report.' },
  { id: 'INF-08', type: 'Power outage', city: 'Mysuru', address: 'Kuvempunagar', status: 'Open', description: 'Simulated transformer complaint.' },
  { id: 'INF-09', type: 'Road damage', city: 'Raichur', address: 'Mantralayam Road', status: 'Open', description: 'Simulated road-damage report.' },
  { id: 'INF-10', type: 'Water supply', city: 'Hubballi', address: 'Vidyanagar', status: 'Resolved (demo)', description: 'Simulated water-supply complaint, resolved in demo.' },
];
