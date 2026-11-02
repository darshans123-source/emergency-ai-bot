import React, { useEffect, useRef } from 'react';

// Aurora Mesh Gradient background — CSS only, no video, no libraries, no API keys.
// Palette: Deep Navy #07142E, Electric Blue #1649A8, Violet #6546D9, Cyan #16C5D8.
// Three large blurred orbs drift slowly (22–30s), a mesh layer cross-fades,
// and subtle light particles float upward. Mouse parallax is desktop-only
// (fine pointer, >=1024px, no reduced motion) and moves the orb layer by at
// most ~14px, so it never distracts or jumps. All animation is transform /
// opacity only, and everything is disabled under prefers-reduced-motion.
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53 + 7) % 100,
  top: (i * 37 + 13) % 100,
  size: 2 + ((i * 7) % 3),
  delay: (i * 1.7) % 18,
  duration: 18 + ((i * 3) % 12),
}));

export const AuroraBackground: React.FC<{ absolute?: boolean }> = ({ absolute = false }) => {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches || window.innerWidth < 1024) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 28;
      targetY = (e.clientY / window.innerHeight - 0.5) * 20;
      if (raf) return;
      raf = requestAnimationFrame(function tick() {
        raf = 0;
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
        }
        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          raf = requestAnimationFrame(tick);
        }
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={`aurora-flow${absolute ? ' aurora-flow-absolute' : ''}`} aria-hidden="true">
      <div ref={parallaxRef} className="aurora-parallax">
        <div className="aurora-blob aurora-blob-blue" />
        <div className="aurora-blob aurora-blob-cyan" />
        <div className="aurora-blob aurora-blob-violet" />
        <div className="aurora-mesh" />
      </div>
      <div className="aurora-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="aurora-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
      <div className="aurora-texture" />
    </div>
  );
};
