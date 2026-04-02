"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["inline-flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden rounded-[18px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_42%)]",
          compact ? "h-11 w-11" : "h-14 w-14",
        ].join(" ")}
      >
        <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="radarMarkBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3f7ef" />
              <stop offset="1" stopColor="#dce9dc" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="56" height="56" rx="18" fill="url(#radarMarkBg)" />
          <circle cx="27" cy="30" r="17" fill="none" stroke="#87a78b" strokeOpacity="0.22" strokeWidth="2.2" />
          <circle cx="27" cy="30" r="11" fill="none" stroke="#87a78b" strokeOpacity="0.34" strokeWidth="2.2" />
          <circle cx="27" cy="30" r="5" fill="none" stroke="#4d6f55" strokeOpacity="0.75" strokeWidth="2.4" />
          <circle cx="27" cy="30" r="2.8" fill="#4d6f55" />
          <path d="M27 30L40 20" stroke="#4d6f55" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M13 19a15 15 0 0 1 9 5" fill="none" stroke="#7ea284" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 12a22 22 0 0 1 12 7" fill="none" stroke="#7ea284" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <path d="M38 37c3 0 5.3 2.4 5.3 5.3 0 2.7-2 5-4.6 5.3" fill="none" stroke="#7ea284" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M38.5 34.5c5.2 0 9.5 4.2 9.5 9.4 0 4.5-3.1 8.3-7.2 9.2" fill="none" stroke="#7ea284" strokeOpacity="0.36" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="min-w-0">
        <div
          className={[
            "font-black tracking-tight text-slate-900",
            compact ? "text-lg" : "text-[26px] leading-none",
          ].join(" ")}
        >
          未病レーダー
        </div>
        <div
          className={[
            "font-bold text-slate-500",
            compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs",
          ].join(" ")}
        >
          体質と気象の変化を重ねて見る、あなた専用の体調予報
        </div>
      </div>
    </div>
  );
}
