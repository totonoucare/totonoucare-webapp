"use client";

export default function HeroGuideBot({ message = "今日はどんな日か、ひと目で見ていこう。", compact = false }) {
  return (
    <div className={["relative", compact ? "w-[112px]" : "w-[152px]"].join(" ")}>
      <div className={["absolute left-0 top-0 max-w-[150px] rounded-2xl border border-[var(--ring)] bg-white px-3 py-2 text-left text-[11px] font-bold leading-5 text-slate-600 shadow-sm", compact ? "translate-y-0" : "-translate-y-1"].join(" ")}>
        {message}
      </div>
      <div className={["ml-auto rounded-[28px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_48%)]", compact ? "mt-12 h-[88px] w-[88px]" : "mt-14 h-[108px] w-[108px]"].join(" ")}>
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="bot_body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#edf5ea" />
              <stop offset="1" stopColor="#dfeadf" />
            </linearGradient>
          </defs>
          <circle cx="66" cy="68" r="30" fill="url(#bot_body)" />
          <path d="M60 28c0-7 5-12 12-12s12 5 12 12" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
          <path d="M68 17c0-5 4-9 9-9" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
          <path d="M75 10l6 2-2 6" fill="none" stroke="#6a9770" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="55" cy="63" r="4" fill="#49684d" />
          <circle cx="77" cy="63" r="4" fill="#49684d" />
          <path d="M54 80c7 6 17 6 24 0" fill="none" stroke="#49684d" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 54c5-7 10-11 16-14" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M89 54c-5-7-10-11-16-14" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 92l-12 8" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M82 92l12 8" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 26a22 22 0 0 1 18-14" fill="none" stroke="#6a9770" strokeOpacity="0.42" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M17 18a31 31 0 0 1 23-17" fill="none" stroke="#6a9770" strokeOpacity="0.26" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
