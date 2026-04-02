"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["inline-flex items-center gap-3", className].join(" ")}>
      <div className={["relative shrink-0 rounded-[18px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_45%)]", compact ? "h-11 w-11" : "h-14 w-14"].join(" ")}>
        <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="radar_title_grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6a9770" stopOpacity="0.22" />
              <stop offset="1" stopColor="#6a9770" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="28" r="26" fill="url(#radar_title_grad)" />
          <path d="M28 28m-14 0a14 14 0 1 1 28 0" fill="none" stroke="#6a9770" strokeOpacity="0.28" strokeWidth="2.2" />
          <path d="M28 28m-9 0a9 9 0 1 1 18 0" fill="none" stroke="#6a9770" strokeOpacity="0.42" strokeWidth="2.2" />
          <path d="M28 28m-4.5 0a4.5 4.5 0 1 1 9 0" fill="none" stroke="#49684d" strokeOpacity="0.75" strokeWidth="2.4" />
          <circle cx="28" cy="28" r="2.8" fill="#49684d" />
          <path d="M28 28L39 19" stroke="#49684d" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M20 12c2.8 1.6 5.1 4 6.5 6.8" stroke="#7ea284" strokeWidth="2" strokeLinecap="round" />
          <path d="M35 9c-1.4 3.4-3.8 6.2-6.9 8.3" stroke="#7ea284" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="min-w-0">
        <div className={["font-black tracking-tight text-slate-900", compact ? "text-lg" : "text-[26px] leading-none"].join(" ")}>
          未病レーダー
        </div>
        <div className={["font-bold text-slate-500", compact ? "text-[11px] mt-0.5" : "text-xs mt-1"].join(" ")}>
          体質と気象の変化を重ねて見る、あなた専用の体調予報
        </div>
      </div>
    </div>
  );
}
