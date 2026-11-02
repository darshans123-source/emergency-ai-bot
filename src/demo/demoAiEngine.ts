// Local rule-based demo AI engine. No API key, no external call.
// Every response is a DEMO SIMULATION and must never claim a real service was contacted.
import { DEMO_CITIES, DEMO_HOSPITALS, DEMO_POLICE_STATIONS, DEMO_FIRE_STATIONS, DEMO_POLICE_UNITS, DEMO_AMBULANCE_UNITS, DEMO_FIRE_UNITS } from './demoData';

export type AgentSlug = 'rakshak' | 'jeevan' | 'agni' | 'sanrakshak';
export interface DemoAiResult {
  text: string; category: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  agent: AgentSlug; city: string; actions: string[]; demoInfo: string[]; status: string; responseTime: string;
}
export const AGENT_META: Record<AgentSlug, { name: string; sector: string; accent: string; welcome: string; questions: string[] }> = {
  rakshak: { name: 'Rakshak AI', sector: 'Police & Security Response', accent: 'blue',
    welcome: 'Namaste, I am Rakshak AI, your police demo assistant. Tell me about a theft, accident, suspicious activity or public-safety concern, and I will give a simulated demo assessment.',
    questions: ['Report a road accident near me.', 'What should I do after a theft?', 'Find the nearest police station in Bengaluru.', 'There is a suspicious person near a school.'] },
  jeevan: { name: 'Jeevan AI', sector: 'Medical & Healthcare Response', accent: 'red',
    welcome: 'Namaste, I am Jeevan AI, your medical demo assistant. Describe a medical concern and I will give a simulated severity assessment and safe first-aid guidance. This is not a diagnosis.',
    questions: ['Someone is injured — what first aid do I give?', 'Find the nearest hospital in Raichur.', 'How do I request an ambulance in a demo?', 'Someone has chest pain — what do I do?'] },
  agni: { name: 'Agni AI', sector: 'Fire & Rescue Response', accent: 'orange',
    welcome: 'Namaste, I am Agni AI, your fire and rescue demo assistant. Tell me about a fire or smoke, and I will give a simulated fire-risk assessment and evacuation guidance.',
    questions: ['There is a fire in a residential building.', 'There is smoke in my apartment block.', 'How do I evacuate safely during a fire?', 'Report a fire in Bengaluru.'] },
  sanrakshak: { name: 'Sanrakshak AI', sector: 'Disaster & Public Services', accent: 'cyan',
    welcome: 'Namaste, I am Sanrakshak AI, your disaster and public-services demo assistant. Tell me about flooding, water supply, power outage or road damage.',
    questions: ['My area is flooding — what should I do?', 'Report a water supply disruption in Hubballi.', 'Report a power outage in my area.', 'There is road damage near my house.'] },
};
function cityFrom(text: string): string {
  const t = text.toLowerCase();
  const found = DEMO_CITIES.find((c) => t.includes(c.toLowerCase())) || (t.includes('bangalore') ? 'Bengaluru' : null);
  return found || 'Bengaluru';
}
function has(text: string, words: string[]): boolean { return words.some((w) => text.includes(w)); }
export function classify(text: string): { category: string; priority: DemoAiResult['priority']; agent: AgentSlug } {
  const t = text.toLowerCase();
  const critical = has(t, ['trapped', 'unconscious', 'blast', 'explosion', 'critical', 'not breathing', 'heavy bleeding', 'chest pain', 'building', 'residential']);
  if (has(t, ['fire', 'flame', 'smoke', 'burn', 'blaze', 'gas leak'])) return { category: 'Fire', priority: critical || has(t, ['building', 'house', 'apartment']) ? 'CRITICAL' : 'HIGH', agent: 'agni' };
  if (has(t, ['ambulance', 'injured', 'injury', 'bleed', 'heart', 'chest pain', 'unconscious', 'accident']) && (has(t, ['injured', 'injury', 'bleed', 'heart', 'ambulance', 'unconscious', 'chest']) || t.includes('accident'))) {
    return { category: has(t, ['accident', 'crash', 'collision']) ? 'Road Accident / Medical' : 'Medical Emergency', priority: critical || has(t, ['heart', 'chest pain', 'unconscious', 'bleed']) ? 'CRITICAL' : 'HIGH', agent: 'jeevan' };
  }
  if (has(t, ['theft', 'robbery', 'steal', 'suspicious', 'police', 'crime', 'fight', 'attack', 'stolen'])) return { category: 'Public Safety', priority: has(t, ['robbery', 'attack', 'weapon']) ? 'CRITICAL' : 'HIGH', agent: 'rakshak' };
  if (has(t, ['accident', 'crash', 'collision', 'vehicle'])) return { category: 'Road Accident', priority: 'HIGH', agent: 'rakshak' };
  if (has(t, ['flood', 'waterlog', 'rain'])) return { category: 'Flood / Disaster', priority: has(t, ['trapped', 'rising']) ? 'CRITICAL' : 'HIGH', agent: 'sanrakshak' };
  if (has(t, ['water', 'pipeline', 'leak', 'supply'])) return { category: 'Water Supply', priority: 'MEDIUM', agent: 'sanrakshak' };
  if (has(t, ['power', 'electricity', 'outage', 'transformer', 'current', 'blackout'])) return { category: 'Power Disruption', priority: 'MEDIUM', agent: 'sanrakshak' };
  if (has(t, ['road', 'pothole', 'damage'])) return { category: 'Road Damage', priority: 'LOW', agent: 'sanrakshak' };
  if (has(t, ['hospital', 'doctor', 'fever', 'medical', 'health'])) return { category: 'Medical Emergency', priority: 'MEDIUM', agent: 'jeevan' };
  if (has(t, ['fire station', 'station'])) return { category: 'General', priority: 'LOW', agent: 'agni' };
  return { category: 'General', priority: 'MEDIUM', agent: 'rakshak' };
}
export function routeToAgent(text: string): { agent: AgentSlug; mitraText: string } {
  const c = classify(text);
  const name = AGENT_META[c.agent].name;
  const sector = AGENT_META[c.agent].sector;
  return { agent: c.agent, mitraText: `I have classified this as a ${c.category} request. I am connecting you to ${name}, our ${sector.toLowerCase()} assistant, for a simulated demo assessment. No real service has been contacted.` };
}
export function generateAgentResponse(agent: AgentSlug, message: string, lang: 'en' | 'hi' | 'kn' = 'en'): DemoAiResult {
  const c = classify(message);
  const city = cityFrom(message);
  const meta = AGENT_META[agent];
  const hospital = DEMO_HOSPITALS.find((h) => h.city === city) || DEMO_HOSPITALS[0];
  const police = DEMO_POLICE_STATIONS.find((s) => s.city === city) || DEMO_POLICE_STATIONS[0];
  const fire = DEMO_FIRE_STATIONS.find((s) => s.city === city) || DEMO_FIRE_STATIONS[0];
  const policeUnit = DEMO_POLICE_UNITS.find((u) => u.city === city && u.status === 'AVAILABLE') || DEMO_POLICE_UNITS[0];
  const ambUnit = DEMO_AMBULANCE_UNITS.find((u) => u.city === city && u.status === 'AVAILABLE') || DEMO_AMBULANCE_UNITS[0];
  const fireUnit = DEMO_FIRE_UNITS.find((u) => u.city === city && u.status === 'AVAILABLE') || DEMO_FIRE_UNITS[0];
  let body = ''; let actions: string[] = []; let demoInfo: string[] = [];
  if (agent === 'agni') {
    body = `Demo alert received. This report has been classified as a fire emergency (${c.category}, priority ${c.priority} in this simulation). Please move away from the affected area, do not use lifts, do not re-enter the building, and keep exits clear. In a real fire, call 112 immediately.`;
    actions = ['Leave the building calmly', 'Do not use lifts', 'Call 112 in a real emergency', 'Keep exits and roads clear (demo)'];
    demoInfo = [`Nearest demo fire station: ${fire.name}, ${fire.address}`, `Demo fire unit (simulated): ${fireUnit.name} — ${fireUnit.status}`, `City in demo: ${city}`];
  } else if (agent === 'jeevan') {
    body = `Demo assessment received. This has been classified as ${c.category} with ${c.priority} priority in this simulation. Keep the person still and safe, apply gentle pressure with a clean cloth if there is bleeding, and do not move a seriously injured person unless there is immediate danger. This is general first-aid information only, not a diagnosis. In a real emergency, call 112 immediately.`;
    actions = ['Keep the person safe and still', 'Apply pressure for bleeding with a clean cloth', 'Do not give food or drink to an unconscious person', 'Call 112 in a real emergency'];
    demoInfo = [`Nearest demo hospital: ${hospital.name}, ${hospital.address}`, `Demo ambulance unit (simulated): ${ambUnit.name} — ${ambUnit.status}`, `City in demo: ${city}`];
  } else if (agent === 'rakshak') {
    body = `Demo assessment received. This has been classified as ${c.category} with ${c.priority} priority in this simulation. Note down what you saw, the time, location and any vehicle or person details, and stay in a safe place. Do not confront a suspect. In a real crime or danger, call 112 immediately.`;
    actions = ['Stay in a safe place', 'Note time, location and details', 'Do not confront anyone', 'Call 112 in a real emergency'];
    demoInfo = [`Nearest demo police station: ${police.name}, ${police.address}`, `Demo patrol unit (simulated): ${policeUnit.name} — ${policeUnit.status}`, `City in demo: ${city}`];
  } else {
    body = `Demo assessment received. This has been classified as ${c.category} with ${c.priority} priority in this simulation. Move to higher ground if water is rising, avoid flooded roads and damaged power lines, and keep drinking water and a charged phone ready. In a real disaster or danger, call 112 immediately.`;
    actions = ['Avoid flooded roads and damaged lines', 'Move to higher ground if water rises', 'Keep water and a charged phone ready', 'Call 112 in a real emergency'];
    demoInfo = [`Demo infrastructure area: ${city}`, `Demo status: ${c.category} report logged in simulation only`, `No real department has been contacted`];
  }
  if (c.agent !== agent) {
    body += ` Note: this message looks like a ${c.category} request, which ${AGENT_META[c.agent].name} normally routes to ${AGENT_META[c.agent].name === meta.name ? meta.name : AGENT_META[c.agent].name}. You can open that agent from the Agents hub for a more focused demo.`;
  }
  const text = `${meta.name} — DEMO SIMULATION\n${body}\n\nCategory: ${c.category} · Priority: ${c.priority} (simulated) · Assigned Agent: ${meta.name} · Status: Demo Assessment · Suggested Action: ${actions[0]} · Response Time: Simulated.\nThis is a demo only. No ambulance, police or fire service has actually been dispatched.`;
  return { text, category: c.category, priority: c.priority, agent, city, actions, demoInfo, status: 'Demo Assessment', responseTime: 'Simulated' };
}
