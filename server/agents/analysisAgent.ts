import { Incident, IncidentCategory } from '../types';
import { GoogleGenAI } from '@google/genai';

export interface AnalysisOutput {
  normalizedCategory: IncidentCategory;
  extractedFacts: string[];
  knownUncertainties: string[];
  missingInformation: string[];
  resourceNeeds: string[];
  explanation: string;
  source: 'OPENAI' | 'GEMINI_AI' | 'RULE_BASED_ENGINE';
}

export async function runIncidentAnalysisAgent(incident: Incident): Promise<AnalysisOutput> {
  const prompt = `You are the Incident Analysis Agent for an emergency command center.
Analyze this emergency report strictly based on provided text. Never fabricate facts.

INCIDENT DETAILS:
Title: ${incident.title}
Category: ${incident.category}
Description: ${incident.description}
Casualties reported: ${incident.casualtiesCount}
Location: ${incident.location.address} (Verified: ${incident.location.verified})

Return a valid JSON object matching this schema:
{
  "normalizedCategory": "ROAD_ACCIDENT" | "MEDICAL_EMERGENCY" | "FIRE_INCIDENT" | "FLOOD" | "NATURAL_DISASTER" | "PUBLIC_SAFETY" | "OTHER",
  "extractedFacts": ["fact 1", "fact 2"],
  "knownUncertainties": ["uncertainty 1"],
  "missingInformation": ["missing detail 1"],
  "resourceNeeds": ["resource type 1"],
  "explanation": "concise objective summary of situation"
}`;

  // 1. If OPENAI_API_KEY is available, attempt structured extraction via OpenAI
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an emergency command center triage AI. Respond strictly in valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.extractedFacts && parsed.normalizedCategory) {
            return {
              normalizedCategory: parsed.normalizedCategory,
              extractedFacts: Array.isArray(parsed.extractedFacts) ? parsed.extractedFacts : [],
              knownUncertainties: Array.isArray(parsed.knownUncertainties) ? parsed.knownUncertainties : [],
              missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
              resourceNeeds: Array.isArray(parsed.resourceNeeds) ? parsed.resourceNeeds : [],
              explanation: parsed.explanation || 'Extracted structured facts using OpenAI.',
              source: 'OPENAI'
            };
          }
        }
      } else {
        console.warn(`[AnalysisAgent] OpenAI request returned status ${response.status}`);
      }
    } catch (err) {
      console.warn('[AnalysisAgent] OpenAI extraction failed or timed out, checking fallbacks:', err);
    }
  }

  // 2. If GEMINI_API_KEY is available, attempt structured extraction via Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.extractedFacts && parsed.normalizedCategory) {
          return {
            normalizedCategory: parsed.normalizedCategory,
            extractedFacts: Array.isArray(parsed.extractedFacts) ? parsed.extractedFacts : [],
            knownUncertainties: Array.isArray(parsed.knownUncertainties) ? parsed.knownUncertainties : [],
            missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
            resourceNeeds: Array.isArray(parsed.resourceNeeds) ? parsed.resourceNeeds : [],
            explanation: parsed.explanation || 'Extracted structured facts using Gemini AI.',
            source: 'GEMINI_AI'
          };
        }
      }
    } catch (err) {
      console.warn('[AnalysisAgent] Gemini extraction failed or timed out, using rule-based engine:', err);
    }
  }

  // 3. Deterministic Rule-Based Fallback Engine
  const desc = (incident.description + ' ' + incident.title).toLowerCase();
  const facts: string[] = [];
  const uncertainties: string[] = [];
  const missingInfo: string[] = [];
  const resourceNeeds: string[] = [];

  // Casualties
  if (incident.casualtiesCount > 0) {
    facts.push(`${incident.casualtiesCount} potential casualties reported by caller.`);
    resourceNeeds.push('Paramedic / Ambulance (Advanced Life Support)');
  } else if (desc.includes('injured') || desc.includes('casualty') || desc.includes('bleed') || desc.includes('hurt')) {
    uncertainties.push('Injury mentioned in description, but exact casualty count is unquantified.');
    resourceNeeds.push('Emergency Medical Service triage unit');
  }

  // Trapped persons
  if (desc.includes('trapped') || desc.includes('pinned') || desc.includes('extricat') || desc.includes('stuck')) {
    facts.push('Report indicates occupant/individual trapped requiring physical extrication.');
    resourceNeeds.push('Heavy Rescue / Hydraulic Extrication Unit');
  }

  // Fire / HazMat
  if (desc.includes('fire') || desc.includes('flame') || desc.includes('smoke') || desc.includes('burn')) {
    facts.push('Active thermal/combustion hazard identified.');
    resourceNeeds.push('Fire Engine / Pumper Suppression Company');
  }

  if (desc.includes('fuel') || desc.includes('leak') || desc.includes('chemical') || desc.includes('spill') || desc.includes('gas')) {
    facts.push('Flammable or hazardous material release reported on scene.');
    resourceNeeds.push('HazMat Spill Containment and Neutralization Unit');
  }

  // Water / Flood
  if (desc.includes('flood') || desc.includes('water') || desc.includes('submerged') || desc.includes('tide') || desc.includes('drown')) {
    facts.push('Rapid water level inundation or marine rescue scenario.');
    resourceNeeds.push('Water Rescue Craft & Inundation Evacuation Team');
  }

  // Traffic / Public Safety
  if (desc.includes('traffic') || desc.includes('lane') || desc.includes('crowd') || desc.includes('perimeter') || desc.includes('collision')) {
    facts.push('Roadway blockage or crowd perimeter requiring traffic control.');
    resourceNeeds.push('Police Patrol Unit for Traffic and Scene Perimeter Security');
  }

  // Location Verification Check
  if (!incident.location.verified || !incident.location.latitude || !incident.location.longitude) {
    missingInfo.push('Precise GPS coordinates unconfirmed. Location requires operator confirmation.');
    uncertainties.push('Exact entrance gate, floor, or cross-street corridor is unverified.');
  }

  if (incident.casualtiesCount === 0 && !desc.includes('no injuries')) {
    missingInfo.push('Verification of triage status of involved civilians.');
  }

  if (resourceNeeds.length === 0) {
    resourceNeeds.push('General Emergency Response Assessment Unit');
  }

  if (facts.length === 0) {
    facts.push(`Original reporter statement logged: "${incident.title}"`);
  }

  return {
    normalizedCategory: incident.category,
    extractedFacts: facts,
    knownUncertainties: uncertainties.length > 0 ? uncertainties : ['Environmental visibility and building structural stability unconfirmed.'],
    missingInformation: missingInfo.length > 0 ? missingInfo : ['On-scene command post radio contact frequency.'],
    resourceNeeds,
    explanation: `Identified ${facts.length} verified facts, ${resourceNeeds.length} potential response requirements, and flagged ${missingInfo.length} informational gaps.`,
    source: 'RULE_BASED_ENGINE'
  };
}
