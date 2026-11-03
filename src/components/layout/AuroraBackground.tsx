import React from 'react';

// Animated Aurora background — real-time, continuous fluid motion, no
// static image, GIF or video. Palette: deep navy #071329, midnight blue
// #102B65, electric blue #176BFF, cyan #19D5E8, violet #7048FF.
//
// Layers (all pointer-events: none, behind all content, z-0):
//  1. Aurora Flow — two large, slow northern-lights waves.
//  2. Animated Mesh Gradient — four blurred gradient blobs that drift,
//     expand and merge (transform + opacity only, GPU-friendly).
//  3. Liquid Glass reflection — one faint diagonal light streak.
//  4. Floating Particles — 12 very small, slow dots (desktop only;
//     hidden on phones for performance).
//
// Every animation is `alternate` (ping-pong), so it reverses smoothly
// instead of jumping back to its start — motion never suddenly restarts.
// Cards, buttons, text and navigation are never animated by this component.
// Under prefers-reduced-motion every layer is static (see index.css).
const PARTICLES = [
  { left: '8%', top: '18%', size: 3, delay: '0s', duration: '26s' },
  { left: '22%', top: '62%', size: 2, delay: '4s', duration: '32s' },
  { left: '38%', top: '28%', size: 3, delay: '9s', duration: '24s' },
  { left: '55%', top: '72%', size: 2, delay: '2s', duration: '30s' },
  { left: '68%', top: '15%', size: 3, delay: '7s', duration: '28s' },
  { left: '82%', top: '48%', size: 2, delay: '12s', duration: '34s' },
  { left: '92%', top: '78%', size: 3, delay: '5s', duration: '26s' },
  { left: '15%', top: '85%', size: 2, delay: '11s', duration: '30s' },
  { left: '47%', top: '8%', size: 2, delay: '3s', duration: '36s' },
  { left: '74%', top: '88%', size: 2, delay: '8s', duration: '28s' },
  { left: '30%', top: '45%', size: 2, delay: '14s', duration: '32s' },
  { left: '60%', top: '35%', size: 3, delay: '6s', duration: '24s' },
];

export const AuroraBackground: React.FC<{ absolute?: boolean }> = ({ absolute = false }) => {
  return (
    <div className={`aurora-flow${absolute ? ' aurora-flow-absolute' : ''}`} aria-hidden="true">
      <div className="aurora-base" />
      <div className="aurora-flow-wave aurora-flow-wave-1" />
      <div className="aurora-flow-wave aurora-flow-wave-2" />
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-glass-streak" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="aurora-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};
