import React from 'react';
import { SpecializedAgentId } from '../../types';

interface AgentSceneBackdropProps {
  agentId: SpecializedAgentId;
  variant?: 'card' | 'banner';
  className?: string;
}

export const AgentSceneBackdrop: React.FC<AgentSceneBackdropProps> = ({
  agentId,
  variant = 'card',
  className = ''
}) => {
  const heightClass = variant === 'banner' ? 'h-full w-full' : 'h-full w-full';

  if (agentId === 'POLICE_TACTICAL') {
    return (
      <div className={`relative overflow-hidden bg-[#0a1122] select-none ${heightClass} ${className}`}>
        {/* Architectural Police Control Room & Dispatch Bay Illustration */}
        <svg
          viewBox="0 0 800 320"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-85"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="polBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#070d1d" />
              <stop offset="50%" stopColor="#0f2147" />
              <stop offset="100%" stopColor="#0a1631" />
            </linearGradient>
            <radialGradient id="polBlueGlow" cx="0.25" cy="0.3" r="0.55">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="polRedBeacon" cx="0.82" cy="0.28" r="0.35">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="320" fill="url(#polBg)" />
          <rect width="800" height="320" fill="url(#polBlueGlow)" />
          <rect width="800" height="320" fill="url(#polRedBeacon)" />

          {/* Perspective Command Floor Grid */}
          <g stroke="#1e3a8a" strokeWidth="1" opacity="0.35">
            <line x1="0" y1="220" x2="800" y2="220" />
            <line x1="0" y1="255" x2="800" y2="255" />
            <line x1="0" y1="290" x2="800" y2="290" />
            <line x1="120" y1="200" x2="20" y2="320" />
            <line x1="260" y1="200" x2="200" y2="320" />
            <line x1="400" y1="200" x2="400" y2="320" />
            <line x1="540" y1="200" x2="600" y2="320" />
            <line x1="680" y1="200" x2="780" y2="320" />
          </g>

          {/* Panoramic Surveillance Wall Monitors */}
          <g transform="translate(45, 28)">
            {/* Screen 1: City Sector Map */}
            <rect x="0" y="0" width="210" height="120" rx="6" fill="#09152b" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.55" />
            <path d="M 18 90 L 65 45 L 115 65 L 165 30 L 195 50" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.7" />
            <circle cx="65" cy="45" r="4" fill="#3b82f6" />
            <circle cx="165" cy="30" r="5" fill="#ef4444" />
            <circle cx="165" cy="30" r="12" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.6" />
            <rect x="14" y="12" width="64" height="8" rx="2" fill="#1d4ed8" opacity="0.6" />

            {/* Screen 2: Central Tactical Command Radar */}
            <rect x="228" y="0" width="245" height="120" rx="6" fill="#09152b" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.65" />
            <circle cx="350" cy="60" r="42" fill="none" stroke="#2563eb" strokeWidth="1.2" opacity="0.55" />
            <circle cx="350" cy="60" r="24" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.45" />
            <line x1="302" y1="60" x2="398" y2="60" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="350" y1="12" x2="350" y2="108" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="350" y1="60" x2="382" y2="34" stroke="#60a5fa" strokeWidth="2" />
            <circle cx="372" cy="42" r="3.5" fill="#38bdf8" />

            {/* Screen 3: Patrol Bay & Traffic Feed */}
            <rect x="490" y="0" width="215" height="120" rx="6" fill="#09152b" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.55" />
            {/* Patrol Cruiser Silhouette */}
            <path d="M 525 88 L 542 66 L 605 66 L 628 84 L 668 86 L 668 102 L 515 102 Z" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.2" opacity="0.85" />
            {/* Police Lightbar */}
            <rect x="564" y="59" width="16" height="5" rx="2" fill="#3b82f6" />
            <rect x="580" y="59" width="16" height="5" rx="2" fill="#ef4444" />
            <circle cx="545" cy="102" r="9" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="640" cy="102" r="9" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
          </g>

          {/* Operator Dispatch Console Desk Silhouette */}
          <path d="M 90 235 L 710 235 L 750 320 L 50 320 Z" fill="#060c1a" stroke="#1e3a8a" strokeWidth="1.2" opacity="0.85" />
        </svg>

        {/* Measured Contrast Scrim for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-900/55" />
      </div>
    );
  }

  if (agentId === 'HOSPITAL_EMS') {
    return (
      <div className={`relative overflow-hidden bg-[#0c1629] select-none ${heightClass} ${className}`}>
        {/* Modern Hospital Emergency Department & Ambulance Bay Illustration */}
        <svg
          viewBox="0 0 800 320"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-85"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="emsBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#091326" />
              <stop offset="55%" stopColor="#0f2542" />
              <stop offset="100%" stopColor="#1b1429" />
            </linearGradient>
            <radialGradient id="emsRedGlow" cx="0.78" cy="0.25" r="0.5">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="emsClinicalGlow" cx="0.25" cy="0.35" r="0.55">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="320" fill="url(#emsBg)" />
          <rect width="800" height="320" fill="url(#emsClinicalGlow)" />
          <rect width="800" height="320" fill="url(#emsRedGlow)" />

          {/* Hospital Trauma Reception Architecture & Canopy */}
          <g stroke="#334155" strokeWidth="1.2" opacity="0.55">
            <rect x="40" y="30" width="440" height="175" rx="6" fill="#0b172a" stroke="#38bdf8" strokeOpacity="0.4" />
            <line x1="185" y1="30" x2="185" y2="205" stroke="#1e293b" />
            <line x1="335" y1="30" x2="335" y2="205" stroke="#1e293b" />
          </g>

          {/* Vital Telemetry & ECG Waveform Monitor */}
          <path
            d="M 65 118 L 135 118 L 148 92 L 160 144 L 174 72 L 188 152 L 202 108 L 218 118 L 310 118"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 65 156 L 190 156 L 205 142 L 220 168 L 235 156 L 310 156"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            opacity="0.75"
          />

          {/* Emergency Medical Cross Emblem in Reception Canopy */}
          <g transform="translate(385, 68)">
            <circle cx="32" cy="32" r="28" fill="#e11d48" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="26" y="14" width="12" height="36" rx="2" fill="#f43f5e" />
            <rect x="14" y="26" width="36" height="12" rx="2" fill="#f43f5e" />
          </g>

          {/* Ambulance Unit in Emergency Bay */}
          <g transform="translate(505, 82)">
            <rect x="0" y="20" width="175" height="92" rx="6" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" strokeOpacity="0.65" />
            <path d="M 175 44 L 222 44 L 238 76 L 238 112 L 175 112 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.65" />
            {/* Emergency Stripe & Beacon */}
            <rect x="8" y="68" width="222" height="8" fill="#e11d48" opacity="0.85" />
            <rect x="150" y="12" width="22" height="7" rx="3" fill="#ef4444" />
            {/* Medical Cross on Ambulance */}
            <rect x="74" y="34" width="8" height="24" fill="#38bdf8" />
            <rect x="66" y="42" width="24" height="8" fill="#38bdf8" />
            <circle cx="48" cy="114" r="14" fill="#090d16" stroke="#94a3b8" strokeWidth="2.5" />
            <circle cx="202" cy="114" r="14" fill="#090d16" stroke="#94a3b8" strokeWidth="2.5" />
          </g>
        </svg>

        {/* Measured Contrast Scrim for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-900/55" />
      </div>
    );
  }

  if (agentId === 'WATER_HYDRO') {
    return (
      <div className={`relative overflow-hidden bg-[#071927] select-none ${heightClass} ${className}`}>
        {/* Municipal Water Treatment Facility, Reservoir & Pipelines Illustration */}
        <svg
          viewBox="0 0 800 320"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-85"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hydBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#04121f" />
              <stop offset="50%" stopColor="#082f49" />
              <stop offset="100%" stopColor="#062238" />
            </linearGradient>
            <radialGradient id="hydCyanGlow" cx="0.35" cy="0.35" r="0.6">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="320" fill="url(#hydBg)" />
          <rect width="800" height="320" fill="url(#hydCyanGlow)" />

          {/* Reservoir Elevation & Hydrological Waves */}
          <path
            d="M 0 195 Q 110 178 220 195 T 440 195 T 660 195 T 800 195 L 800 320 L 0 320 Z"
            fill="#0369a1"
            fillOpacity="0.28"
          />
          <path
            d="M 0 220 Q 130 205 260 220 T 520 220 T 800 220"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.8"
            opacity="0.55"
          />

          {/* Municipal Pressurized Pipeline Network & Valve Stations */}
          <g stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.7">
            <path d="M 45 78 L 285 78 L 325 118 L 575 118 L 615 78 L 755 78" strokeWidth="6" stroke="#0284c7" />
            <path d="M 45 78 L 285 78 L 325 118 L 575 118 L 615 78 L 755 78" strokeWidth="2" stroke="#67e8f9" strokeDasharray="8 6" />
            <circle cx="175" cy="78" r="14" fill="#082f49" stroke="#22d3ee" strokeWidth="2.5" />
            <circle cx="450" cy="118" r="16" fill="#082f49" stroke="#22d3ee" strokeWidth="2.5" />
            <circle cx="675" cy="78" r="14" fill="#082f49" stroke="#22d3ee" strokeWidth="2.5" />
          </g>

          {/* Hydrological Telemetry Gauges */}
          <g transform="translate(75, 132)">
            <rect x="0" y="0" width="160" height="68" rx="5" fill="#061826" stroke="#0ea5e9" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="16" y1="24" x2="110" y2="24" stroke="#22d3ee" strokeWidth="3" />
            <line x1="16" y1="42" x2="140" y2="42" stroke="#0284c7" strokeWidth="3" />
          </g>
        </svg>

        {/* Measured Contrast Scrim for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-900/55" />
      </div>
    );
  }

  // CURRENT_KEB (Power Grid / KEB Agent)
  return (
    <div className={`relative overflow-hidden bg-[#0c1324] select-none ${heightClass} ${className}`}>
      {/* Electrical Grid Control Room, Transmission Towers & Substation Illustration */}
      <svg
        viewBox="0 0 800 320"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-85"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="kebBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#090e1c" />
            <stop offset="55%" stopColor="#131c33" />
            <stop offset="100%" stopColor="#1f1916" />
          </linearGradient>
          <radialGradient id="kebAmberGlow" cx="0.72" cy="0.32" r="0.55">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="kebBlueGlow" cx="0.22" cy="0.3" r="0.5">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="320" fill="url(#kebBg)" />
        <rect width="800" height="320" fill="url(#kebBlueGlow)" />
        <rect width="800" height="320" fill="url(#kebAmberGlow)" />

        {/* High-Voltage Transmission Towers & Catenary Lines */}
        <g stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.65">
          {/* Tower 1 */}
          <path d="M 540 230 L 568 48 L 584 48 L 612 230" />
          <line x1="532" y1="84" x2="620" y2="84" />
          <line x1="524" y1="124" x2="628" y2="124" />
          <line x1="552" y1="84" x2="600" y2="124" />
          <line x1="600" y1="84" x2="552" y2="124" />

          {/* Tower 2 */}
          <path d="M 690 230 L 712 68 L 726 68 L 748 230" opacity="0.75" />
          <line x1="684" y1="98" x2="754" y2="98" opacity="0.75" />
          <line x1="678" y1="134" x2="760" y2="134" opacity="0.75" />

          {/* High-Voltage Transmission Lines */}
          <path d="M 320 96 Q 430 135 532 84" stroke="#fbbf24" strokeWidth="1.4" opacity="0.7" />
          <path d="M 620 84 Q 655 112 684 98" stroke="#fbbf24" strokeWidth="1.4" opacity="0.7" />
          <path d="M 320 132 Q 430 168 524 124" stroke="#38bdf8" strokeWidth="1.2" opacity="0.55" />
        </g>

        {/* Grid Substation Busbar Schematic Display */}
        <g transform="translate(48, 36)">
          <rect x="0" y="0" width="290" height="135" rx="6" fill="#091122" stroke="#f59e0b" strokeWidth="1.4" strokeOpacity="0.5" />
          <line x1="28" y1="42" x2="262" y2="42" stroke="#fbbf24" strokeWidth="2.5" />
          <line x1="75" y1="42" x2="75" y2="105" stroke="#fbbf24" strokeWidth="2" />
          <line x1="145" y1="42" x2="145" y2="105" stroke="#38bdf8" strokeWidth="2" />
          <line x1="215" y1="42" x2="215" y2="105" stroke="#fbbf24" strokeWidth="2" />
          <rect x="63" y="68" width="24" height="20" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.8" />
          <rect x="133" y="68" width="24" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="203" y="68" width="24" height="20" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.8" />
        </g>
      </svg>

      {/* Measured Contrast Scrim for Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-900/55" />
    </div>
  );
};
