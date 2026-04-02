"use client";

import HeroGuideBot from "./HeroGuideBot";

export default function HeroDashboardArt() {
  return (
    <div className="relative h-[156px] w-[178px] overflow-hidden rounded-[24px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_52%)] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.26)]">
      <svg viewBox="0 0 178 156" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="178" height="156" rx="24" fill="#eef4eb" />
        <circle cx="72" cy="104" r="58" fill="none" stroke="#7ea284" strokeOpacity="0.2" strokeWidth="3" />
        <circle cx="72" cy="104" r="38" fill="none" stroke="#7ea284" strokeOpacity="0.3" strokeWidth="3" />
        <path d="M72 104L118 72" stroke="#6a9770" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 121c14-17 32-27 54-27 21 0 35 6 51 6" fill="none" stroke="#6a9770" strokeOpacity="0.72" strokeWidth="4" strokeLinecap="round" />
        <circle cx="72" cy="104" r="5.5" fill="#6a9770" />
        <circle cx="118" cy="72" r="5" fill="#d9a54a" fillOpacity="0.88" />
        <path d="M118 58a14 14 0 0 1 14 14" fill="none" stroke="#7ea284" strokeOpacity="0.4" strokeWidth="2.2" />
        <path d="M124 48a24 24 0 0 1 24 24" fill="none" stroke="#7ea284" strokeOpacity="0.22" strokeWidth="2.2" />
      </svg>

      <div className="absolute left-4 top-4 rounded-full border border-[var(--ring)] bg-white px-3 py-1 text-[10px] font-extrabold text-slate-600 shadow-sm">
        今日の見方
      </div>
      <div className="absolute left-4 bottom-4 rounded-full border border-[var(--ring)] bg-white px-3 py-1 text-[10px] font-extrabold text-slate-600 shadow-sm">
        体質 × 気象
      </div>
      <div className="absolute right-2 bottom-0 scale-[0.92] origin-bottom-right">
        <HeroGuideBot compact showBubble={false} />
      </div>
    </div>
  );
}
