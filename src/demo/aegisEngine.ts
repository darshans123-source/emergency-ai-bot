// AegisAI local simulation engine — rule-based, no external AI, no API key.
// Data comes from src/data/aegisKnowledge.json (intents, keywords, synonyms,
// templates, actions). Nothing here claims a real dispatch, a verified
// hospital, live GPS or a response time: response_units is always [] and
// estimated_response_time is always null, by design.
import knowledge from '../data/aegisKnowledge.json';
import agentResponses from '../i18n/agentResponses.json';
import { AGENT_META, AgentSlug } from './demoAiEngine';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export interface StructuredResponse {
  agent: string;
  agentSlug: AgentSlug;
  detectedAgentSlug: AgentSlug;
  incident_id: string;
  category: string;
  priority: Priority;
  status: string;
  location: string;
  summary: string;
  risk_assessment: string;
  recommended_actions: string[];
  response_units: string[];
  estimated_response_time: null;
  voice_response: string;
  simulation: true;
  intent_id: string;
  timestamp: string;
  follow_up_question?: string;
  is_follow_up?: boolean;
  routing_note?: string;
}
export interface ConversationContext {
  lastIntentId?: string;
  lastAgentSlug?: AgentSlug;
  lastCategory?: string;
  lastLocation?: string;
  turnCount: number;
}
type Intent = {
  id: string; category: string; priority: Priority; keywords: string[]; synonyms: string[];
  summary_templates: string[]; risk_assessment: string; recommended_actions: string[];
  voice_template: string; follow_up: string;
};
const AGENTS = knowledge.agents as Record<AgentSlug, { name: string; sector: string; intents: Intent[] }>;
const CITIES: string[] = knowledge.cities as string[];
const ALIASES = knowledge.city_aliases as Record<string, string>;
const FOLLOW_UPS: string[] = knowledge.follow_up_phrases as string[];
const SEVERITY = knowledge.severity as { critical: string[]; high: string[] };

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\u0C80-\u0CFF\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function extractLocation(text: string): string | null {
  const t = norm(text);
  for (const city of CITIES) if (t.includes(city.toLowerCase())) return city;
  for (const [alias, city] of Object.entries(ALIASES)) if (t.includes(alias)) return city;
  return null;
}
function nextIncidentId(): string {
  try {
    const key = 'aegis_structured_seq';
    const cur = parseInt(localStorage.getItem(key) || '2000', 10) || 2000;
    const next = cur + 1;
    localStorage.setItem(key, String(next));
    return `DEMO-${next}`;
  } catch { return `DEMO-${2000 + Math.floor(Math.random() * 900)}`; }
}
function hash(text: string): number {
  let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0; return h;
}
function matches(text: string, phrase: string): boolean {
  // Short phrases (e.g. "fir") must match a whole word, otherwise "fir"
  // would match inside "fire" and misroute a fire report to police.
  if (phrase.length < 4) return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
  return text.includes(phrase);
}
function scoreIntent(text: string, intent: Intent): number {
  let score = 0;
  for (const kw of intent.keywords) if (matches(text, kw)) score += 3;
  for (const syn of intent.synonyms) if (matches(text, syn)) score += 2;
  // Word-level partial match for multi-word keywords: "phone stolen" etc.
  for (const kw of intent.keywords) {
    const words = kw.split(' ');
    if (words.length > 1 && words.every((w) => text.includes(w))) score += 1;
  }
  return score;
}
function bestIntent(text: string, agentSlug?: AgentSlug): { agentSlug: AgentSlug; intent: Intent; score: number } | null {
  let best: { agentSlug: AgentSlug; intent: Intent; score: number } | null = null;
  const slugs = (Object.keys(AGENTS) as AgentSlug[]);
  for (const slug of slugs) {
    for (const intent of AGENTS[slug].intents) {
      let score = scoreIntent(text, intent);
      if (agentSlug && slug === agentSlug) score += 1; // small tie-break for the open agent, not a veto
      if (score > 0 && (!best || score > best.score)) best = { agentSlug: slug, intent, score };
    }
  }
  return best;
}
function bumpPriority(base: Priority, text: string): Priority {
  if (SEVERITY.critical.some((w) => text.includes(w))) return 'CRITICAL';
  if (base === 'LOW' && SEVERITY.high.some((w) => text.includes(w))) return 'HIGH';
  return base;
}
export function detectAgent(text: string): AgentSlug {
  const best = bestIntent(norm(text));
  return best ? best.agentSlug : 'rakshak';
}
export function routeToAgentStructured(text: string, lang: ResponseLanguage = 'en'): { agent: AgentSlug; mitraText: string } {
  const best = bestIntent(norm(text));
  const agent = best ? best.agentSlug : 'rakshak';
  const meta = AGENT_META[agent];
  const category = best ? best.intent.category : 'General';
  if (lang !== 'en') {
    const tr = (agentResponses as any)[lang];
    const cat = tr?.categories[category] || category;
    const template = lang === 'kn'
      ? `ಇದನ್ನು ${cat} ವಿನಂತಿಯಾಗಿ ವರ್ಗೀಕರಿಸಿದ್ದೇನೆ. ಸಿಮ್ಯುಲೇಟೆಡ್ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ನಾನು ನಿಮ್ಮನ್ನು ${meta.name} ಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ. ಯಾವುದೇ ನಿಜವಾದ ಸೇವೆಯನ್ನು ಸಂಪರ್ಕಿಸಲಾಗಿಲ್ಲ.`
      : lang === 'hi'
      ? `इसे ${cat} अनुरोध के रूप में वर्गीकृत किया गया है। सिम्युलेटेड मूल्यांकन के लिए मैं आपको ${meta.name} से जोड़ रहा हूँ। किसी वास्तविक सेवा से संपर्क नहीं किया गया है।`
      : `దీనిని ${cat} అభ్యర్థనగా వర్గీకరించారు. సిమ్యులేటెడ్ అంచనా కోసం నేను మిమ్మల్ని ${meta.name} కు కనెక్ట్ చేస్తున్నాను. ఏ నిజమైన సేవను సంప్రదించలేదు.`;
    return { agent, mitraText: template };
  }
  return { agent, mitraText: `I have classified this as a ${category} request. I am connecting you to ${meta.name}, our ${meta.sector.toLowerCase()} assistant, for a simulated assessment. No real service has been contacted.` };
}

export type ResponseLanguage = 'en' | 'kn' | 'hi' | 'te';
export function generateStructuredResponse(
  chatAgent: AgentSlug,
  message: string,
  context: ConversationContext = { turnCount: 0 },
  lang: ResponseLanguage = 'en',
): { response: StructuredResponse; context: ConversationContext } {
  const text = norm(message);
  const location = extractLocation(text) || context.lastLocation || null;
  const isFollowUp = FOLLOW_UPS.includes(text) || (text.length < 12 && /^(yes|more|continue|next)/.test(text));

  let agentSlug: AgentSlug = chatAgent;
  let intent: Intent;
  let isFollow = false;

  if (isFollowUp && context.lastIntentId && context.lastAgentSlug) {
    const prev = AGENTS[context.lastAgentSlug].intents.find((i) => i.id === context.lastIntentId);
    if (prev) { intent = prev; agentSlug = context.lastAgentSlug; isFollow = true; }
  }
  if (!intent!) {
    const best = bestIntent(text, chatAgent);
    if (best) { intent = best.intent; agentSlug = best.agentSlug; }
    else {
      // General fallback for the open agent — never a fixed identical paragraph:
      // the template varies by turn and the follow-up asks for specifics.
      intent = AGENTS[chatAgent].intents[AGENTS[chatAgent].intents.length - 1];
      agentSlug = chatAgent;
    }
  }
  const priority = bumpPriority(intent.priority, text);
  const variant = hash(message + String(context.turnCount + 1)) % intent.summary_templates.length;
  let summary = intent.summary_templates[variant].replace('{loc}', location ? ` in ${location}` : '');
  if (isFollow) summary = `Continuing the previous assessment (${intent.category}): ${summary}`;
  const voice = intent.voice_template;
  const followUp = !location && intent.id !== 'fire_safety' && intent.id !== 'general_police'
    ? 'Which city or area is this in? For example, Raichur or Bengaluru — or say “location not known”.'
    : intent.follow_up;

  const response: StructuredResponse = {
    agent: AGENTS[agentSlug].name,
    agentSlug,
    detectedAgentSlug: agentSlug,
    incident_id: nextIncidentId(),
    category: intent.category,
    priority,
    status: 'Assessment Complete',
    location: location || 'Not provided',
    summary,
    risk_assessment: intent.risk_assessment,
    recommended_actions: intent.recommended_actions,
    response_units: [],
    estimated_response_time: null,
    voice_response: voice,
    simulation: true,
    intent_id: intent.id,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    follow_up_question: followUp,
    is_follow_up: isFollow,
    routing_note: agentSlug !== chatAgent
      ? `This looks like a ${intent.category} request, which ${AGENTS[agentSlug].name} normally handles. You can open that agent from the Agents hub for a focused assessment — the safety guidance above still applies.`
      : undefined,
  };
  if (lang !== 'en') {
    const tr = (agentResponses as any)[lang];
    if (tr) {
      const cat = tr.categories[intent.category] || intent.category;
      const locPart = location ? ` ${location}.` : '';
      // Summary: translated category + translated agent guidance (+ city name as given).
      response.summary = `${cat} — ${tr.guidance[agentSlug] || ''}${locPart}`.replace('  ', ' ');
      response.category = cat;
      response.status = lang === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ ಪೂರ್ಣಗೊಂಡಿದೆ' : lang === 'hi' ? 'मूल्यांकन पूर्ण' : 'అంచనా పూర్తయింది';
      response.risk_assessment = tr.risk;
      const specific = tr.specific_actions[intent.id];
      response.recommended_actions = specific || tr.actions[agentSlug] || intent.recommended_actions;
      response.voice_response = `${response.summary} ${tr.call112}`;
      response.follow_up_question = !location ? tr.location_question : tr.follow_up;
      if (response.routing_note) {
        response.routing_note = lang === 'kn' ? `ಇದು ${cat} ವಿನಂತಿಯಂತೆ ಕಾಣುತ್ತದೆ, ಇದನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ${AGENTS[agentSlug].name} ನಿರ್ವಹಿಸುತ್ತದೆ. ಕೇಂದ್ರಿತ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಏಜೆಂಟ್‌ಗಳ ಹಬ್‌ನಿಂದ ಆ ಏಜೆಂಟ್ ಅನ್ನು ತೆರೆಯಿರಿ — ಮೇಲಿನ ಸುರಕ್ಷತಾ ಮಾರ್ಗದರ್ಶನ ಇನ್ನೂ ಅನ್ವಯಿಸುತ್ತದೆ.`
          : lang === 'hi' ? `यह ${cat} अनुरोध जैसा लगता है, जिसे सामान्यतः ${AGENTS[agentSlug].name} संभालता है। केंद्रित मूल्यांकन के लिए एजेंट हब से उस एजेंट को खोलें — ऊपर दी गई सुरक्षा मार्गदर्शन अभी भी लागू है।`
          : `ఇది ${cat} అభ్యర్థనలా కనిపిస్తోంది, దీనిని సాధారణంగా ${AGENTS[agentSlug].name} నిర్వహిస్తుంది. కేంద్రీకృత అంచనా కోసం ఏజెంట్ హబ్ నుండి ఆ ఏజెంట్‌ను తెరవండి — పైన ఉన్న భద్రతా మార్గదర్శకత్వం ఇప్పటికీ వర్తిస్తుంది.`;
      }
    }
  }
  const nextContext: ConversationContext = {
    lastIntentId: intent.id, lastAgentSlug: agentSlug, lastCategory: intent.category,
    lastLocation: location || context.lastLocation, turnCount: context.turnCount + 1,
  };
  return { response, context: nextContext };
}
export function structuredToText(r: StructuredResponse): string {
  return `${r.agent} — Simulated assessment\n${r.summary}\n\nCategory: ${r.category} · Priority: ${r.priority} (simulated) · Incident: ${r.incident_id} · Location: ${r.location} · Status: ${r.status}\nRisk: ${r.risk_assessment}\nActions: ${r.recommended_actions.join(' · ')}\nNo unit has been dispatched. Estimated response time: not available in simulation. For real emergencies, call 112.`;
}
