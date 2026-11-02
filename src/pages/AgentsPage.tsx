import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, HeartPulse, Flame, CloudLightning, ArrowRight, Bot } from 'lucide-react';
import { Skeleton } from '../components/common/UiBits';

export interface AgentCardDef {
  slug: string;
  name: string;
  sector: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  gradient: string;
  prompts: string[];
}

export const AGENT_CARDS: AgentCardDef[] = [
  {
    slug: 'rakshak',
    name: 'Rakshak AI',
    sector: 'Police & Public Safety',
    description: 'Police incident assistance, police station information, incident reporting and response recommendations.',
    icon: <Shield className="w-6 h-6" />,
    accent: 'text-blue-300',
    gradient: 'from-blue-600 to-blue-800',
    prompts: ['Report a road accident near me.', 'What should I do after a theft?', 'Find the nearest police station.']
  },
  {
    slug: 'jeevan',
    name: 'Jeevan AI',
    sector: 'Medical & Ambulance Assistance',
    description: 'Medical emergency guidance, nearby hospital information and emergency request assistance.',
    icon: <HeartPulse className="w-6 h-6" />,
    accent: 'text-rose-300',
    gradient: 'from-rose-600 to-rose-800',
    prompts: ['Someone is injured — what first aid do I give?', 'Find the nearest hospital.', 'How do I request an ambulance?']
  },
  {
    slug: 'agni',
    name: 'Agni AI',
    sector: 'Fire & Rescue Operations',
    description: 'Fire incident reporting, fire safety and evacuation guidance, and rescue coordination support.',
    icon: <Flame className="w-6 h-6" />,
    accent: 'text-orange-300',
    gradient: 'from-red-600 to-orange-700',
    prompts: ['There is a fire in my building — what do I do?', 'Report a fire incident.', 'How do I evacuate safely during a fire?']
  },
  {
    slug: 'sanrakshak',
    name: 'Sanrakshak AI',
    sector: 'Disaster Management',
    description: 'Flood, natural disaster, water and power disruption guidance, shelter and public safety support.',
    icon: <CloudLightning className="w-6 h-6" />,
    accent: 'text-cyan-300',
    gradient: 'from-cyan-600 to-teal-700',
    prompts: ['My area is flooding — what should I do?', 'Report a water supply disruption.', 'Report a power outage in my area.']
  }
];

export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  // Local engine status — no backend call, so no API error can appear here.
  const aiStatus = { provider: 'Local engine', model: 'Local rule-based engine', isExternalConfigured: true, status: 'Ready' };
  const [loading] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-white">
      <div className="glass-liquid-strong rounded-2xl p-6 sm:p-8 text-white shadow-sm animate-aurora-float">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Bot className="w-7 h-7 text-cyan-300" /> <span className="chrome-text">AI Agents</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
          Four dedicated agents for police, medical, fire and disaster response. Each opens its own
          chat with text and voice, using the local engine. For real emergencies, call 112.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          AI provider: Local engine (no API key required)
        </div>
        <p className="mt-2 text-xs text-slate-400">Simulated data · For real emergencies, call 112.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)
          : AGENT_CARDS.map((agent) => (
              <article key={agent.slug} className="glass-liquid glass-liquid-hover rounded-2xl overflow-hidden flex flex-col">
                <div className={`h-24 bg-gradient-to-br ${agent.gradient} flex items-end p-4`}>
                  <span className="w-12 h-12 rounded-2xl chrome-icon text-white flex items-center justify-center">
                    {agent.icon}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold text-white">{agent.name}</h2>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/10 border border-white/20 text-slate-200 shrink-0">Ready</span>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${agent.accent}`}>{agent.sector}</p>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed flex-1">{agent.description}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/${agent.slug}`)}
                    className="mt-4 min-h-11 rounded-xl mitra-chrome btn-glow text-white text-sm font-semibold transition inline-flex items-center justify-center gap-1.5"
                  >
                    Open Agent <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
      </div>


      <p className="text-xs text-slate-300">
        The older specialised-agent hub (police, hospital, water, power) is still available at{' '}
        <button type="button" onClick={() => navigate('/agents/legacy/POLICE_TACTICAL')} className="font-semibold text-cyan-300 hover:underline">
          Legacy agent hub
        </button>
        . Nothing was deleted.
      </p>
    </div>
  );
};
