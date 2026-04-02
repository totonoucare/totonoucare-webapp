"use client";

export default function HeroGuideBot({
  message = "今日はどんな日か、ひと目で見ていこう。",
  compact = false,
  bubbleSide = "left",
  showBubble = true,
}) {
  const widthClass = compact ? "w-[110px]" : "w-[150px]";
  const bubblePos = bubbleSide === "right" ? "right-0" : "left-0";

  return (
    <div className={["relative", widthClass].join(" ")}>
      {showBubble ? (
        <div
          className={[
            "absolute top-0 max-w-[158px] rounded-2xl border border-[var(--ring)] bg-white px-3 py-2 text-left text-[11px] font-bold leading-5 text-slate-600 shadow-sm",
            bubblePos,
            compact ? "translate-y-0" : "-translate-y-1",
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      <div
        className={[
          "relative ml-auto overflow-hidden rounded-[28px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_48%)]",
          compact ? "mt-10 h-[92px] w-[92px]" : "mt-14 h-[112px] w-[112px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="botBodyFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f5f7ef" />
              <stop offset="1" stopColor="#dde7d8" />
            </linearGradient>
          </defs>

          <path d="M24 102a36 36 0 0 1 72 0" fill="#d7e3d6" fillOpacity="0.55" />
          <path d="M22 34a24 24 0 0 1 19-14" fill="none" stroke="#6a9770" strokeOpacity="0.28" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 24a31 31 0 0 1 24-17" fill="none" stroke="#6a9770" strokeOpacity="0.18" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M81 34a24 24 0 0 1 21 18" fill="none" stroke="#6a9770" strokeOpacity="0.28" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M88 24a31 31 0 0 1 18 24" fill="none" stroke="#6a9770" strokeOpacity="0.18" strokeWidth="2.2" strokeLinecap="round" />

          <circle cx="60" cy="68" r="31" fill="url(#botBodyFill)" />
          <path d="M55 26c0-8 6-14 13-14s13 6 13 14" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
          <path d="M69 15c0-5.5 4.4-9.5 9.6-9.5" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
          <path d="M77 8l6 2-2 6" fill="none" stroke="#6a9770" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66 12c1-5.3 5.2-8.8 10.5-8.8" fill="none" stroke="#89ac8e" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
          <path d="M68 14c1.5-4.4 5-7 9.4-7" fill="none" stroke="#89ac8e" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 56c4.6-6.2 10.2-10.1 17.2-12.7" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M78 43c7 2.6 12.6 6.5 17.2 12.7" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="49" cy="64" r="4.2" fill="#49684d" />
          <circle cx="71" cy="64" r="4.2" fill="#49684d" />
          <path d="M49 81c6.5 5.6 15.5 5.6 22 0" fill="none" stroke="#49684d" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M48 92l-12 8" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
          <path d="M72 92l12 8" fill="none" stroke="#9ab59e" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
