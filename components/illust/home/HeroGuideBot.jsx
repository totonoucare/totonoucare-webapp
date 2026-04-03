"use client";

export default function HeroGuideBot({
  message = "今日はどんな日か、ひと目で見ていこう。",
  compact = false,
  bubbleSide = "left",
  showBubble = true,
}) {
  const widthClass = compact ? "w-[110px]" : "w-[150px]";
  
  let bubbleClasses = [
    "absolute rounded-2xl border border-[var(--ring)] bg-white px-3 py-2 text-left text-[11px] font-bold leading-5 text-slate-600 shadow-sm z-20",
  ];

  if (compact) {
    if (bubbleSide === "right") {
      bubbleClasses.push("left-[90px] top-0 max-w-[158px]");
    } else if (bubbleSide === "left-belly") {
      // ★修正：横幅を少し広げ（w-[180px]）、セリフが美しく改行されるように調整
      bubbleClasses.push("right-[75px] bottom-[30px] w-[180px]");
    } else {
      bubbleClasses.push("right-[80px] top-0 max-w-[158px]");
    }
  } else {
    if (bubbleSide === "right") {
      bubbleClasses.push("left-[120px] top-4 max-w-[158px]");
    } else {
      bubbleClasses.push("right-[120px] top-4 max-w-[158px]");
    }
  }

  return (
    <div className={["relative", widthClass].join(" ")}>
      {showBubble ? (
        <div className={bubbleClasses.join(" ")}>
          {message}
        </div>
      ) : null}

      {/* キャラクターSVG（透明＆ワクなし） */}
      <div
        className={[
          "relative ml-auto",
          compact ? "mt-8 h-[92px] w-[92px]" : "mt-12 h-[112px] w-[112px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e8f0ea" />
            </linearGradient>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8f0ea" />
              <stop offset="100%" stopColor="#cce0d2" />
            </linearGradient>
            <linearGradient id="radarGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d9a54a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e5b85c" stopOpacity="0.2" />
            </linearGradient>
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#4d6f55" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* 背後の光 */}
          <circle cx="60" cy="70" r="40" fill="white" fillOpacity="0.3" filter="blur(10px)" />

          {/* ボディ */}
          <path d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" fill="url(#bodyGrad)" />
          
          {/* 胸のレーダー */}
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />

          {/* 頭の葉っぱアンテナ */}
          <path d="M60 28 L60 18" stroke="#89ac8e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#a8c7ab" />

          {/* 顔の輪郭 */}
          <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" />

          {/* 目 */}
          <circle cx="44" cy="50" r="4.5" fill="#4d6f55" />
          <circle cx="76" cy="50" r="4.5" fill="#4d6f55" />

          {/* ほほの赤み */}
          <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />

          {/* 口 */}
          <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke="#4d6f55" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
