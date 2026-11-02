import React from 'react';

// Calm background — deliberately quiet. The previous version had three
// large moving orbs, a mesh layer, floating particles and mouse parallax,
// which competed with the content. This version is a static dark
// navy-to-blue gradient with a single very slow, very faint aurora wash
// (90s, opacity 0.10–0.14, movement of only a few pixels). No particles,
// no parallax, no glow. It never covers content (pointer-events: none)
// and is fully static under prefers-reduced-motion.
export const AuroraBackground: React.FC<{ absolute?: boolean }> = ({ absolute = false }) => {
  return (
    <div className={`aurora-flow${absolute ? ' aurora-flow-absolute' : ''}`} aria-hidden="true">
      <div className="aurora-wash" />
      <div className="aurora-texture" />
    </div>
  );
};
