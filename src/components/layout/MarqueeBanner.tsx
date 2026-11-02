import React from 'react';

// Premium scrolling marquee banner — fixed at the bottom of every page.
// CSS animation only, no external libraries. The track holds the message
// twice and scrolls left-to-right (translateX -50% -> 0), so the loop is
// seamless: at either end the visible text is identical. Hover pauses it.
// In the app shell it sits above the mobile bottom nav (bottom-14 on
// mobile, bottom-0 on desktop); on splash/login it sits at the very bottom.
// Main content clearance lives in AppLayout (pb-28 mobile, lg:pb-16).
const SEGMENT = (
  <>
    <span className="whitespace-nowrap">🚧 AI AGENTS ARE CURRENTLY UNDER DEVELOPMENT — We&apos;re working to make them smarter!</span>
    <span className="text-cyan-300 px-4" aria-hidden="true">|</span>
    <span className="whitespace-nowrap">✨ <span className="marquee-accent">Designed &amp; Developed by Darshan</span></span>
    <span className="text-cyan-300 px-4" aria-hidden="true">|</span>
  </>
);

export const MarqueeBanner: React.FC<{ aboveNav?: boolean }> = ({ aboveNav = false }) => {
  return (
    <div
      className={`marquee-banner fixed inset-x-0 z-30 ${aboveNav ? 'bottom-14 lg:bottom-0' : 'bottom-0'}`}
      role="note"
      aria-label="AI agents are currently under development. Designed and developed by Darshan."
    >
      <div className="marquee-accent-line" aria-hidden="true" />
      <div className="flex items-center gap-2.5 h-9 px-3 sm:px-4">
        <span className="marquee-dot shrink-0" aria-hidden="true" />
        <div className="marquee-viewport flex-1 min-w-0 overflow-hidden">
          <div className="marquee-track">
            <div className="marquee-segment">{SEGMENT}</div>
            <div className="marquee-segment" aria-hidden="true">{SEGMENT}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
