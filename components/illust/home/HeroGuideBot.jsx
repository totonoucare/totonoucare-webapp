"use client";

export default function HeroGuideBot({
  compact = false,
  message = "まずは体質チェックから！",
  showBubble = true,
  bubbleSide = "right",
  className = "",
}) {
  const size = compact ? 120 : 180;

  return (
    <div className={["relative inline-flex items-end", className].join(" ")}>
      <svg
        viewBox="0 0 120 130"
        width={size}
        height={size * 1.08}
        className="drop-shadow-[0_14px_22px_rgba(var(--accent-ink-rgb),0.12)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="botBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1faf4" />
          </linearGradient>
          <linearGradient id="botBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1faf4" />
            <stop offset="100%" stopColor="#9ecbc3" />
          </linearGradient>
          <radialGradient id="botCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#e5b85c" stopOpacity="0.22" />
          </radialGradient>
          <filter id="botSoftShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="var(--accent-ink)" floodOpacity="0.12" />
          </filter>
        </defs>

        <g filter="url(#botSoftShadow)">
          <path d="M26 70 C26 46 42 28 60 28 C78 28 94 46 94 70 V78 C94 97 80 112 60 112 C40 112 26 97 26 78 Z" fill="url(#botBody)" />
          <path d="M34 88 C42 105 51 114 60 114 C69 114 78 105 86 88 Z" fill="url(#botBase)" />
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.62" />
          <circle cx="60" cy="85" r="4" fill="url(#botCore)" />
          <path d="M60 28 L60 18" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#8bc2b8" />

          <circle cx="44" cy="50" r="4.5" fill="var(--accent-ink)" opacity="0.82" />
          <circle cx="76" cy="50" r="4.5" fill="var(--accent-ink)" opacity="0.82" />
          <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" opacity="0.82" />
        </g>
      </svg>

      {showBubble ? (
        <div
          className={[
            "absolute rounded-[18px] border border-[var(--ring)] bg-[var(--surface)] px-4 py-3 text-[13px] font-black leading-tight text-slate-700 shadow-[0_12px_28px_-16px_rgba(var(--accent-ink-rgb),0.24)]",
            compact ? "min-w-[190px]" : "min-w-[220px]",
            bubbleSide === "right"
              ? "left-[72px] bottom-[26px]"
              : "right-[72px] bottom-[26px]",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-[var(--ring)] bg-[var(--surface)]",
              bubbleSide === "right" ? "left-[-6px] border-b border-l" : "right-[-6px] border-r border-t",
            ].join(" ")}
          />
          {message}
        </div>
      ) : null}
    </div>
  );
}
