import React from 'react';

interface SoundWaveVisualizerProps {
  isActive: boolean;
  color?: string;
  className?: string;
  barCount?: number;
}

export const SoundWaveVisualizer: React.FC<SoundWaveVisualizerProps> = ({
  isActive,
  color = '#38bdf8',
  className = '',
  barCount = 18
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={`flex items-center justify-center gap-1.5 h-12 px-4 py-2 select-none ${className}`}>
      {bars.map((idx) => {
        // Compute pseudo-random natural staggered delays and heights
        const delay = (idx * 0.08) % 0.8;
        const baseHeight = 8 + (Math.sin(idx * 0.6) + 1) * 6;
        const activeHeight = 16 + (Math.sin(idx * 0.8) + 1) * 16;

        return (
          <span
            key={idx}
            className="w-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: color,
              height: isActive ? `${activeHeight}px` : `${baseHeight}px`,
              opacity: isActive ? 0.95 : 0.35,
              animation: isActive ? `soundWavePulse 1.1s ease-in-out infinite alternate` : 'none',
              animationDelay: `${delay}s`
            }}
          />
        );
      })}

      <style>{`
        @keyframes soundWavePulse {
          0% {
            transform: scaleY(0.35);
            opacity: 0.45;
          }
          50% {
            transform: scaleY(1.3);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.7);
            opacity: 0.75;
          }
        }
      `}</style>
    </div>
  );
};
