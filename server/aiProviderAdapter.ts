import { GoogleGenAI } from '@google/genai';
import { SpecializedAgentId, Incident, IncidentCategory, IncidentPriority } from './types';

export type SupportedLanguage = 'en' | 'hi' | 'kn';

export interface AIProviderStatus {
  provider: 'gemini' | 'openai' | 'built-in-domain';
  model: string;
  isExternalConfigured: boolean;
  status: 'Online' | 'Degraded' | 'Offline' | 'LocalFallback';
  message: string;
  supportedLanguages: Array<{ code: SupportedLanguage; name: string; nativeName: string; speechCode: string }>;
}

export interface IncidentDraft {
  isIncidentReport: boolean;
  readyToSubmit: boolean;
  category: IncidentCategory;
  title: string;
  description: string;
  address: string;
  casualtiesCount: number;
  priority: IncidentPriority;
  summaryText: string;
  missingFields: string[];
}

export interface AIChatResult {
  reply: string;
  language: SupportedLanguage;
  provider: string;
  model: string;
  providerStatus: 'Online' | 'LocalFallback';
  providerNotice: string | null;
  incidentDraft?: IncidentDraft | null;
}

const SUPPORTED_LANGUAGES: AIProviderStatus['supportedLanguages'] = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' }
];

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

/**
 * Detects if the text has Devanagari or Kannada characters to auto-adapt language if needed
 */
export function detectLanguage(text: string, preferred: SupportedLanguage = 'en'): SupportedLanguage {
  if (!text) return preferred;
  // Kannada Unicode range: 0C80–0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Devanagari (Hindi) Unicode range: 0900–097F
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return preferred;
}

/**
 * Validates AI provider status without exposing secrets
 */
export async function checkAIProviderStatus(): Promise<AIProviderStatus> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
    return {
      provider: 'gemini',
      model: configuredModel,
      isExternalConfigured: true,
      status: 'Online',
      message: `Gemini AI Engine active with model ${configuredModel}. Multilingual voice agents enabled.`,
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }

  if (openAiKey) {
    const configuredModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    return {
      provider: 'openai',
      model: configuredModel,
      isExternalConfigured: true,
      status: 'Online',
      message: `OpenAI Engine active with model ${configuredModel}. Multilingual voice agents enabled.`,
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }

  return {
    provider: 'built-in-domain',
    model: 'Aegis-Multilingual-Emergency-NLP-v2',
    isExternalConfigured: false,
    status: 'LocalFallback',
    message: 'Running built-in high-availability multilingual emergency agent engine (English, Hindi, Kannada). Configure GEMINI_API_KEY in server environment for cloud LLM reasoning.',
    supportedLanguages: SUPPORTED_LANGUAGES
  };
}

/**
 * Conversationally extracts emergency report parameters from user message
 */
export function extractIncidentParameters(
  userMessage: string,
  agentId: SpecializedAgentId,
  language: SupportedLanguage
): IncidentDraft | null {
  const text = userMessage.toLowerCase();

  // Keywords across languages
  const fireKeywords = ['आग', 'जल', 'धुआं', 'fire', 'flame', 'smoke', 'ಬೆಂಕಿ', 'ಹೊಗೆ'];
  const accidentKeywords = ['accident', 'crash', 'collision', 'टक्कर', 'दुर्घटना', 'गाड़ी', 'अपघात', 'ಅಪಘಾತ', 'ಡಿಕ್ಕಿ'];
  const medicalKeywords = ['ambulance', 'heart', 'bleed', 'injured', 'hospital', 'तबीयत', 'दर्द', 'अस्पताल', 'रक्त', 'एम्बुलेंस', 'ಗಾಯ', 'ಆಸ್ಪತ್ರೆ', 'ಆಂಬ್ಯುಲೆನ್ಸ್', 'ರಕ್ತಸ್ರಾವ'];
  const waterKeywords = ['water', 'pipe', 'leak', 'drain', 'flood', 'पानी', 'पाइप', 'लीक', 'बाढ़', 'ನೀರು', 'ಪೈಪ್', 'ಸೋರಿಕೆ', 'ನೆರೆ'];
  const powerKeywords = ['power', 'electricity', 'outage', 'blackout', 'wire', 'transformer', 'keb', 'current', 'बिजली', 'करंट', 'तार', 'विद्युत', 'ವಿದ್ಯುತ್', 'ಕರೆಂಟ್', 'ತಂತಿ', 'ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್', 'ವಿದ್ಯುತ್ ಇಲ್ಲ', 'ಕರೆಂಟ್ ಇಲ್ಲ', 'ಬೆಳಕಿಲ್ಲ', 'ಕಡಿತ'];
  const crimeKeywords = ['theft', 'suspicious', 'police', 'fight', 'robbery', 'चोरी', 'पुलिस', 'हमला', 'संदिग्ध', 'ಪೊಲೀಸ್', 'ಕಳ್ಳತನ', 'ಹಲ್ಲೆ'];

  let category: IncidentCategory = 'OTHER';
  let defaultTitleEn = 'Reported Emergency Incident';

  if (fireKeywords.some(k => text.includes(k))) {
    category = 'FIRE_INCIDENT';
    defaultTitleEn = 'Fire Incident';
  } else if (accidentKeywords.some(k => text.includes(k))) {
    category = 'ROAD_ACCIDENT';
    defaultTitleEn = 'Traffic Collision / Road Accident';
  } else if (medicalKeywords.some(k => text.includes(k))) {
    category = 'MEDICAL_EMERGENCY';
    defaultTitleEn = 'Medical Emergency / Ambulance Request';
  } else if (waterKeywords.some(k => text.includes(k))) {
    category = 'FLOOD';
    defaultTitleEn = 'Water Infrastructure / Leak Incident';
  } else if (powerKeywords.some(k => text.includes(k))) {
    category = 'FIRE_INCIDENT';
    defaultTitleEn = 'Electrical Hazard / Power Outage';
  } else if (crimeKeywords.some(k => text.includes(k))) {
    category = 'PUBLIC_SAFETY';
    defaultTitleEn = 'Public Safety / Police Assistance';
  } else {
    // If agent is specialized, default to its domain
    if (agentId === 'POLICE_TACTICAL') category = 'PUBLIC_SAFETY';
    else if (agentId === 'HOSPITAL_EMS') category = 'MEDICAL_EMERGENCY';
    else if (agentId === 'WATER_HYDRO') category = 'FLOOD';
    else if (agentId === 'CURRENT_KEB') category = 'FIRE_INCIDENT';
  }

  // Check if intent indicates incident reporting
  const isReportIntent =
    fireKeywords.some(k => text.includes(k)) ||
    accidentKeywords.some(k => text.includes(k)) ||
    medicalKeywords.some(k => text.includes(k)) ||
    waterKeywords.some(k => text.includes(k)) ||
    powerKeywords.some(k => text.includes(k)) ||
    crimeKeywords.some(k => text.includes(k)) ||
    text.includes('report') || text.includes('मदद') || text.includes('help') ||
    text.includes('सहायता') || text.includes('ಸಹಾಯ') || text.includes('ದಾಖಲಿಸು') ||
    text.includes('ಇಲ್ಲ') || text.includes('ಸಮಸ್ಯೆ');

  if (!isReportIntent && text.length < 15) {
    return null;
  }

  // Location heuristics: Look for location indicators across en, hi, kn
  let detectedLocation = '';
  const locationMatches = userMessage.match(/(?:at|near|in|on|around|स्थान|जगह|इलाके|में|ಬಳಿ|ಹತ್ತಿರ|ನಲ್ಲಿ|ದಲ್ಲಿ|ಪ್ರದೇಶದಲ್ಲಿ|ವಾರ್ಡ್)\s+([A-Za-z0-9\u0900-\u097F\u0C80-\u0CFF\s,.-]{3,40})/i);
  if (locationMatches && locationMatches[1]) {
    detectedLocation = locationMatches[1].trim();
  }

  // Priority / Severity detection
  let priority: IncidentPriority = 'HIGH';
  if (text.includes('die') || text.includes('trapped') || text.includes('blast') || text.includes('critical') || text.includes('मौत') || text.includes('गंभीर') || text.includes('ತುರ್ತು')) {
    priority = 'CRITICAL';
  } else if (text.includes('minor') || text.includes('छोटा') || text.includes('ಸಣ್ಣ')) {
    priority = 'LOW';
  }

  // Casualties detection
  let casualties = 0;
  const numMatch = userMessage.match(/(\d+)\s*(?:people|persons|injured|casualties|लोग|घायल|ಜನ|ಗಾಯ)/i);
  if (numMatch && numMatch[1]) {
    casualties = parseInt(numMatch[1], 10);
  }

  const missingFields: string[] = [];
  if (!detectedLocation) missingFields.push('location');

  const readyToSubmit = Boolean(detectedLocation && detectedLocation.length >= 3);

  let title = defaultTitleEn;
  if (language === 'hi') {
    if (category === 'FIRE_INCIDENT') title = 'आग लगने की आपातकालीन घटना';
    else if (category === 'ROAD_ACCIDENT') title = 'सड़क दुर्घटना / टक्कर';
    else if (category === 'MEDICAL_EMERGENCY') title = 'चिकित्सा आपातकाल / एम्बुलेंस सहायता';
    else if (category === 'FLOOD') title = 'पानी की आपूर्ति व पाइपलाइन समस्या';
    else if (category === 'PUBLIC_SAFETY') title = 'सार्वजनिक सुरक्षा / पुलिस सहायता';
  } else if (language === 'kn') {
    if (category === 'FIRE_INCIDENT') title = 'ಬೆಂಕಿ ಅವಘಡ ತುರ್ತು ವರದಿ';
    else if (category === 'ROAD_ACCIDENT') title = 'ರಸ್ತೆ ಅಪಘಾತ / ವಾಹನ ಡಿಕ್ಕಿ';
    else if (category === 'MEDICAL_EMERGENCY') title = 'ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿ / ಆಂಬ್ಯುಲೆನ್ಸ್ ವರದಿ';
    else if (category === 'FLOOD') title = 'ನೀರು ಸರಬರಾಜು ಮತ್ತು ಸೋರಿಕೆ ಸಮಸ್ಯೆ';
    else if (category === 'PUBLIC_SAFETY') title = 'ಸಾರ್ವಜನಿಕ ಭದ್ರತೆ / ಪೊಲೀಸ್ ನೆರವು';
  }

  let summaryText = '';
  if (language === 'hi') {
    summaryText = `प्रकार: ${title}, स्थान: ${detectedLocation || 'स्थान प्रतीक्षित'}, गंभीरता: ${priority}`;
  } else if (language === 'kn') {
    summaryText = `ಪ್ರಕಾರ: ${title}, ಸ್ಥಳ: ${detectedLocation || 'ಸ್ಥಳ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ'}, ಆದ್ಯತೆ: ${priority}`;
  } else {
    summaryText = `Type: ${title}, Location: ${detectedLocation || 'Pending Location'}, Priority: ${priority}`;
  }

  return {
    isIncidentReport: true,
    readyToSubmit,
    category,
    title,
    description: userMessage,
    address: detectedLocation || 'Reported via Voice Assistant',
    casualtiesCount: casualties,
    priority,
    summaryText,
    missingFields
  };
}
