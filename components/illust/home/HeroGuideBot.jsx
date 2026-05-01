"use client";

export default function HeroGuideBot({
  message = "今日はどんな日か、ひと目で見ていこう。",
  compact = false,
  bubbleSide = "left",
  showBubble = true,
}) {
  const widthClass = compact ? "w-[110px]" : "w-[150px]";

  let bubbleStyles = "";
  let tailStyles = null;

  if (compact) {
    if (bubbleSide === "left-belly") {
      bubbleStyles = "right-[90px] bottom-[25px] w-[210px]";
      tailStyles = (
        <div className="absolute right-[-6px] top-[50%] h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-[color:var(--ring)] bg-white"></div>
      );
    } else if (bubbleSide === "right") {
      bubbleStyles = "left-[110px] top-[20px] w-max whitespace-nowrap";
      tailStyles = (
        <div className="absolute left-[-6px] top-[50%] h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[color:var(--ring)] bg-white"></div>
      );
    } else {
      bubbleStyles = "right-[90px] top-0 w-[160px]";
    }
  } else {
    bubbleStyles = "right-[130px] top-4 w-[180px]";
  }

  return (
    <div className={["relative", widthClass].join(" ")}>
      {showBubble ? (
        <div className={`absolute rounded-2xl border border-[color:var(--ring)] bg-white px-4 py-2.5 text-left text-[12px] font-bold leading-6 text-[#586372] shadow-[0_12px_24px_-12px_rgba(40,55,48,0.2)] z-20 transition-all ${bubbleStyles}`}>
          {tailStyles}
          <div className="relative z-10">{message}</div>
        </div>
      ) : null}

      <div className={["relative ml-auto", compact ? "mt-8 h-[92px] w-[92px]" : "mt-12 h-[112px] w-[112px]"].join(" ")}>
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eef7f2" />
            </linearGradient>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dcefe6" />
              <stop offset="100%" stopColor="#bfdacb" />
            </linearGradient>
            <linearGradient id="radarGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2aa3b" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#efbf56" stopOpacity="0.28" />
            </linearGradient>
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#355f52" floodOpacity="0.16" />
            </filter>
          </defs>

          <circle cx="60" cy="70" r="40" fill="#ffffff" fillOpacity="0.4" filter="blur(10px)" />
          <path d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" fill="url(#bodyGrad)" />
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.98" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.76" />
          <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />

          <path d="M60 28 L60 18" stroke="#6eab90" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#8fc7aa" />

          <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" />
          <circle cx="44" cy="50" r="4.5" fill="#4f7a64" />
          <circle cx="76" cy="50" r="4.5" fill="#4f7a64" />
          <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.46" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.46" />
          <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke="#4f7a64" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
