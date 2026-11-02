// Realistic-looking but clearly fictional demo data for the AegisAI DEMO simulation.
// Nothing here is live, verified, or a real dispatch. All names are generic.
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
export const DEMO_INCIDENTS: DemoIncident[] = [
  { id: 'DEMO-1001', title: 'Fire in a residential building', category: 'FIRE_INCIDENT', priority: 'CRITICAL', status: 'ACTIVE', city: C[0], address: 'MG Road, Bengaluru', description: 'Simulated fire report in a residential building.', createdAt: '2026-11-02 09:12' },
  { id: 'DEMO-1002', title: 'Road accident on ring road', category: 'ROAD_ACCIDENT', priority: 'HIGH', status: 'DISPATCHED', city: C[1], address: 'Outer Ring Road, Hyderabad', description: 'Simulated two-vehicle collision, injuries reported in the demo.', createdAt: '2026-11-02 09:28' },
  { id: 'DEMO-1003', title: 'Person injured, needs first aid', category: 'MEDICAL_EMERGENCY', priority: 'CRITICAL', status: 'ACTIVE', city: C[2], address: 'Station Road, Raichur', description: 'Simulated medical emergency, first-aid guidance requested.', createdAt: '2026-11-02 09:41' },
  { id: 'DEMO-1004', title: 'Theft reported at a shop', category: 'PUBLIC_SAFETY', priority: 'MEDIUM', status: 'ACTIVE', city: C[0], address: 'Commercial Street, Bengaluru', description: 'Simulated theft report for police demo assessment.', createdAt: '2026-11-02 10:05' },
  { id: 'DEMO-1005', title: 'Waterlogging after heavy rain', category: 'FLOOD', priority: 'HIGH', status: 'DISPATCHED', city: C[3], address: 'Old City Road, Kalaburagi', description: 'Simulated flooding and waterlogging report.', createdAt: '2026-11-02 10:18' },
  { id: 'DEMO-1006', title: 'Power outage in a residential area', category: 'POWER_OUTAGE', priority: 'MEDIUM', status: 'ACTIVE', city: C[4], address: 'Gokul Road, Hubballi', description: 'Simulated electricity disruption report.', createdAt: '2026-11-02 10:33' },
  { id: 'DEMO-1007', title: 'Fire in a market shop', category: 'FIRE_INCIDENT', priority: 'HIGH', status: 'RESOLVED', city: C[5], address: 'Devaraja Market, Mysuru', description: 'Simulated market fire, resolved in the demo timeline.', createdAt: '2026-11-02 08:50' },
  { id: 'DEMO-1008', title: 'Chest pain reported', category: 'MEDICAL_EMERGENCY', priority: 'CRITICAL', status: 'ACTIVE', city: C[1], address: 'Banjara Hills, Hyderabad', description: 'Simulated chest-pain emergency, severity assessment demo.', createdAt: '2026-11-02 10:47' },
  { id: 'DEMO-1009', title: 'Suspicious person near a school', category: 'PUBLIC_SAFETY', priority: 'HIGH', status: 'DISPATCHED', city: C[0], address: 'Indiranagar, Bengaluru', description: 'Simulated public-safety report near a school.', createdAt: '2026-11-02 11:02' },
  { id: 'DEMO-1010', title: 'Road damage and potholes', category: 'ROAD_DAMAGE', priority: 'LOW', status: 'ACTIVE', city: C[2], address: 'Mantralayam Road, Raichur', description: 'Simulated road-damage infrastructure report.', createdAt: '2026-11-02 11:15' },
  { id: 'DEMO-1011', title: 'Water supply disruption', category: 'WATER_SUPPLY', priority: 'MEDIUM', status: 'ACTIVE', city: C[4], address: 'Vidyanagar, Hubballi', description: 'Simulated water-supply complaint.', createdAt: '2026-11-02 11:29' },
  { id: 'DEMO-1012', title: 'Minor fire in a warehouse', category: 'FIRE_INCIDENT', priority: 'MEDIUM', status: 'RESOLVED', city: C[3], address: 'Industrial Area, Kalaburagi', description: 'Simulated warehouse fire, resolved in demo.', createdAt: '2026-11-02 07:58' },
  { id: 'DEMO-1013', title: 'Bike accident, rider injured', category: 'ROAD_ACCIDENT', priority: 'HIGH', status: 'DISPATCHED', city: C[5], address: 'Sayyaji Rao Road, Mysuru', description: 'Simulated bike accident with injury.', createdAt: '2026-11-02 11:44' },
  { id: 'DEMO-1014', title: 'Fever and breathing difficulty', category: 'MEDICAL_EMERGENCY', priority: 'HIGH', status: 'ACTIVE', city: C[0], address: 'Whitefield, Bengaluru', description: 'Simulated medical guidance request.', createdAt: '2026-11-02 12:01' },
  { id: 'DEMO-1015', title: 'Robbery attempt at an ATM', category: 'PUBLIC_SAFETY', priority: 'CRITICAL', status: 'DISPATCHED', city: C[1], address: 'Jubilee Hills, Hyderabad', description: 'Simulated robbery-attempt report.', createdAt: '2026-11-02 12:12' },
  { id: 'DEMO-1016', title: 'Drain overflow in a street', category: 'FLOOD', priority: 'MEDIUM', status: 'ACTIVE', city: C[2], address: 'Gandhi Chowk, Raichur', description: 'Simulated drain-overflow report.', createdAt: '2026-11-02 12:26' },
  { id: 'DEMO-1017', title: 'Transformer failure, area dark', category: 'POWER_OUTAGE', priority: 'HIGH', status: 'DISPATCHED', city: C[5], address: 'Kuvempunagar, Mysuru', description: 'Simulated transformer-failure report.', createdAt: '2026-11-02 12:39' },
  { id: 'DEMO-1018', title: 'Smoke in an apartment block', category: 'FIRE_INCIDENT', priority: 'HIGH', status: 'ACTIVE', city: C[4], address: 'Keshwapur, Hubballi', description: 'Simulated smoke report, evacuation guidance demo.', createdAt: '2026-11-02 12:51' },
  { id: 'DEMO-1019', title: 'Elderly person fell at home', category: 'MEDICAL_EMERGENCY', priority: 'MEDIUM', status: 'RESOLVED', city: C[3], address: 'Sangameshwar Colony, Kalaburagi', description: 'Simulated fall report, resolved in demo.', createdAt: '2026-11-02 06:40' },
  { id: 'DEMO-1020', title: 'Fight reported near a bus stand', category: 'PUBLIC_SAFETY', priority: 'MEDIUM', status: 'ACTIVE', city: C[0], address: 'Majestic Bus Stand, Bengaluru', description: 'Simulated public-disturbance report.', createdAt: '2026-11-02 13:04' },
  { id: 'DEMO-1021', title: 'Water pipeline leak', category: 'WATER_SUPPLY', priority: 'MEDIUM', status: 'DISPATCHED', city: C[1], address: 'Secunderabad Road, Hyderabad', description: 'Simulated pipeline-leak report.', createdAt: '2026-11-02 13:17' },
  { id: 'DEMO-1022', title: 'Firecracker fire in a godown', category: 'FIRE_INCIDENT', priority: 'CRITICAL', status: 'ACTIVE', city: C[2], address: 'Market Yard, Raichur', description: 'Simulated godown fire report.', createdAt: '2026-11-02 13:30' },
  { id: 'DEMO-1023', title: 'Child with high fever', category: 'MEDICAL_EMERGENCY', priority: 'HIGH', status: 'ACTIVE', city: C[4], address: 'Deshpande Nagar, Hubballi', description: 'Simulated child medical guidance request.', createdAt: '2026-11-02 13:42' },
  { id: 'DEMO-1024', title: 'Street light failure, dark road', category: 'POWER_OUTAGE', priority: 'LOW', status: 'ACTIVE', city: C[5], address: 'Vijayanagar, Mysuru', description: 'Simulated street-light complaint.', createdAt: '2026-11-02 13:55' },
  { id: 'DEMO-1025', title: 'Heavy rain, low-lying area flooded', category: 'FLOOD', priority: 'HIGH', status: 'DISPATCHED', city: C[3], address: 'Gulbarga Fort Area, Kalaburagi', description: 'Simulated flood report.', createdAt: '2026-11-02 14:08' },
];
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
