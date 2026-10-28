import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  ShieldAlert,
  ArrowRight,
  Activity,
  Flame,
  Radio,
  Waves,
  Cpu,
  MapPin,
  Box,
  FilePlus2,
  Ambulance,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';

// Specialized AI agents definition for telemetry display
interface AgentInfo {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  status: 'ONLINE' | 'STANDBY' | 'SYNCED';
  accentColor: string;
  badgeBg: string;
  icon: React.ElementType;
  description: string;
}

const AGENTS: AgentInfo[] = [
  {
    id: 'medical',
    name: 'Dr. Mercer',
    roleTitle: 'Chief Medical Triage AI',
    department: 'EMS & Trauma Assessment',
    status: 'ONLINE',
    accentColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    badgeBg: 'bg-emerald-500',
    icon: Activity,
    description: 'Autonomous ESI Level 1-5 triage, vital stability index & ER triage bed routing.'
  },
  {
    id: 'fire',
    name: 'Chief Torres',
    roleTitle: 'Fire & Hazard Commander AI',
    department: 'Hazardous Materials & Fire Ops',
    status: 'ONLINE',
    accentColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    badgeBg: 'bg-amber-500',
    icon: Flame,
    description: 'Flashover risk assessment, HAZMAT plume modeling & structural safety boundaries.'
  },
  {
    id: 'police',
    name: 'Cmdr. Briggs',
    roleTitle: 'Tactical Law Enforcement AI',
    department: 'Perimeter & Force Protection',
    status: 'ONLINE',
    accentColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    badgeBg: 'bg-blue-500',
    icon: Radio,
    description: 'High-speed containment zones, crowd egress vectors & threat suppression.'
  },
  {
    id: 'disaster',
    name: 'Coord. Vance',
    roleTitle: 'Disaster Logistics Coordinator AI',
    department: 'Relief & Civil Defense Grid',
    status: 'ONLINE',
    accentColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    badgeBg: 'bg-purple-500',
    icon: Waves,
    description: 'Multi-hazard flood dynamics, supply chain corridors & mass evacuation routing.'
  }
];

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, quickDemoLogin } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>((user?.role as UserRole) || 'operator');
  const [countdown, setCountdown] = useState<number>(6);
  const [isAutoLaunchPaused, setIsAutoLaunchPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'telemetry'>('agents');

  // Play subtle tactical audio feedback on launch or action
  const playTacticalSound = (freq = 880, type: OscillatorType = 'sine', duration = 0.12) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext blocked or not allowed until interaction
    }
  };

  // Launch the main command center
  const handleLaunch = async (destination = '/') => {
    setIsLaunching(true);
    playTacticalSound(600, 'triangle', 0.25);
    sessionStorage.setItem('aegis_splash_dismissed', 'true');

    if (quickDemoLogin && selectedRole !== user?.role) {
      try {
        await quickDemoLogin(selectedRole);
      } catch {
        // fallback
      }
    }

    setTimeout(() => {
      navigate(destination);
    }, 450);
  };

  // Auto-launch countdown effect
  useEffect(() => {
    if (isAutoLaunchPaused || isLaunching) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLaunch('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoLaunchPaused, isLaunching, selectedRole]);

  return (
    <div className="relative min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* Background Ambience: High-Tech Cyber Grid & Glowing Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing atmospheric gradients */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-indigo-600/15 rounded-full blur-[150px]" />

        {/* Tactical Matrix Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        {/* Subtle Horizontal Scanning Line Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.03] to-transparent h-48 w-full animate-bounce pointer-events-none opacity-40" />
      </div>

      {/* Top Bar: System Status & Controls */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0f1d] rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-cyan-400 stroke-[2.2]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#050811] animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest uppercase text-white">AegisAI</span>
              <span className="px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono rounded">
                v4.8
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">AUTONOMOUS EMERGENCY GRID</p>
          </div>
        </div>

        {/* Live System Ready Indicator & Sound Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">ALL DISPATCH NETWORKS NOMINAL</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
            title={soundEnabled ? 'Mute tactical audio cues' : 'Enable tactical audio cues'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Hero & Mission Command Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Mission Overview & Launch Portal */}
          <div className="lg:col-span-7 space-y-6">
            {/* Holographic Mission Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>SYNCHRONIZED MULTI-AGENT EMERGENCY RESPONSE</span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                One Voice.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                  Four Agents.
                </span>{' '}
                <br className="hidden sm:block" />
                Faster Emergency Response.
              </h1>
              <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                Welcome to AegisAI Command Center. When seconds count, our specialized AI agents triage calls,
                detect hazards, coordinate law enforcement containment, and mobilize disaster logistics simultaneously.
              </p>
            </div>

            {/* Quick Profile Selection */}
            <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Select Command Profile:
                </span>
                <span className="text-[11px] text-cyan-400/80 font-mono">Instant Access • No Password Needed</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Operator Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('operator');
                    playTacticalSound(520, 'sine', 0.1);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedRole === 'operator'
                      ? 'bg-cyan-500/15 border-cyan-400/80 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {selectedRole === 'operator' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <p className="text-xs font-bold text-white font-mono">Operator</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Triage & Dispatch</p>
                </button>

                {/* Admin Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    playTacticalSound(660, 'sine', 0.1);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedRole === 'admin'
                      ? 'bg-purple-500/15 border-purple-400/80 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    {selectedRole === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-xs font-bold text-white font-mono">Commander</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tactical 3D & Audit</p>
                </button>

                {/* Citizen Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('reporter');
                    playTacticalSound(440, 'sine', 0.1);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedRole === 'reporter'
                      ? 'bg-emerald-500/15 border-emerald-400/80 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {selectedRole === 'reporter' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-xs font-bold text-white font-mono">Field Citizen</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Report Incident</p>
                </button>
              </div>

              {/* Primary Launch Action Bar */}
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLaunch('/')}
                  disabled={isLaunching}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-sm font-mono tracking-wider uppercase shadow-xl shadow-cyan-500/25 transition-all duration-200 flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-50 cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLaunching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>INITIALIZING CONSOLE...</span>
                      </>
                    ) : (
                      <>
                        <span>ENTER COMMAND CENTER</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Auto-launch Countdown Indicator */}
                <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between sm:justify-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-slate-300">
                      Auto-launching in <strong className="text-cyan-400 text-sm">{countdown}s</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoLaunchPaused(!isAutoLaunchPaused);
                      playTacticalSound(400, 'sine', 0.08);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white transition"
                    title={isAutoLaunchPaused ? 'Resume countdown' : 'Pause countdown'}
                  >
                    {isAutoLaunchPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Tactical Navigation Shortcuts */}
            <div className="pt-2">
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2.5">
                Quick Jump to Specialized Operations:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLaunch('/map')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Geospatial Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunch('/tactical-3d')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-xs text-slate-300 hover:text-purple-300 flex items-center gap-1.5 transition"
                >
                  <Box className="w-3.5 h-3.5 text-purple-400" />
                  <span>3D Tactical Twin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunch('/report')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 transition"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Report Incident</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunch('/resources')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-xs text-slate-300 hover:text-blue-300 flex items-center gap-1.5 transition"
                >
                  <Ambulance className="w-3.5 h-3.5 text-blue-400" />
                  <span>Fleet & Resources</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic AI Dispatch Squad Matrix */}
          <div className="lg:col-span-5">
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-5 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
                    Specialized AI Dispatch Matrix
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('agents')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      activeTab === 'agents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                    }`}
                  >
                    Agents
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('telemetry')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      activeTab === 'telemetry' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                    }`}
                  >
                    Telemetry
                  </button>
                </div>
              </div>

              {/* Tab: Agents List */}
              {activeTab === 'agents' && (
                <div className="mt-4 space-y-3">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    return (
                      <div
                        key={agent.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition group flex items-start gap-3"
                      >
                        <div className={`p-2 rounded-lg shrink-0 border ${agent.accentColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">
                              {agent.name}
                            </h4>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {agent.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-cyan-400/90 font-mono font-medium truncate">{agent.roleTitle}</p>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: System Telemetry */}
              {activeTab === 'telemetry' && (
                <div className="mt-4 space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>ORBITAL SATELLITE COMMS</span>
                      <span className="text-emerald-400 font-semibold">99.98% SYNC</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[99.98%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>MULTI-AGENT CONSENSUS ENGINE</span>
                      <span className="text-cyan-400 font-semibold">OPTIMAL (1.2s)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full w-[94%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>TACTICAL 3D DIGITAL TWIN</span>
                      <span className="text-purple-400 font-semibold">3-ZONE REAL-TIME</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-400 h-full w-[88%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>MULTILINGUAL VOICE AI (MITRA)</span>
                      <span className="text-amber-400 font-semibold">EN / HI / KN</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full w-[100%]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Mission Pulse Readout */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Real-time Triage Dispatch Active</span>
                </span>
                <span className="text-slate-400">DECISION SUPPORT ONLY</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Tactical Status Strip */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="text-slate-300">AEGIS-OS DISPATCH GRID</span>
          <span>•</span>
          <span>ENTERPRISE GRADE EMERGENCY ORCHESTRATION</span>
        </div>
        <div className="text-center sm:text-right text-slate-400">
          FOR LIFE-THREATENING EMERGENCIES ALWAYS CALL 911 / 112 DIRECTLY
        </div>
      </footer>
    </div>
  );
};
