"use client";

import HeroGuideBot from "./HeroGuideBot";

export default function HeroDashboardArt() {
  return (
    <div className="relative h-[106px] w-[102px] shrink-0 overflow-hidden rounded-[24px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_55%)] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.22)]">
      <svg viewBox="0 0 102 106" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="102" height="106" rx="24" fill="#eef4eb" />
        <circle cx="42" cy="60" r="28" fill="none" stroke="#7ea284" strokeOpacity="0.2" strokeWidth="2.4" />
        <circle cx="42" cy="60" r="18" fill="none" stroke="#7ea284" strokeOpacity="0.34" strokeWidth="2.4" />
        <path d="M42 60L65 42" stroke="#6a9770" strokeWidth="3.3" strokeLinecap="round" />
        <circle cx="42" cy="60" r="4" fill="#6a9770" />
        <circle cx="65" cy="42" r="3.6" fill="#d9a54a" fillOpacity="0.88" />
        <path d="M24 79c8-9 18-14 30-14 11 0 18 2 27 2" fill="none" stroke="#6a9770" strokeOpacity="0.62" strokeWidth="3.2" strokeLinecap="round" />
      </svg>

      <div className="absolute right-[-4px] bottom-[-6px] scale-[0.76] origin-bottom-right">
        <HeroGuideBot compact showBubble={false} />
      </div>
    </div>
  );
}
