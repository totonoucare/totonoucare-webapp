"use client";

export default function HeroGuideBot({
  message = "今日はどんな日か、ひと目で見ていこう。",
  compact = false,
  bubbleSide = "left",
  showBubble = true,
  showTail = false, // ★新規追加：尻尾を表示するかどうかのフラグ
}) {
  const widthClass = compact ? "w-[110px]" : "w-[150px]";
  
  let bubbleClasses = [
    "absolute rounded-2xl border border-[var(--ring)] bg-white px-4 py-2.5 text-left text-[12px] font-bold leading-6 text-slate-600 shadow-md z-20 transition-all",
  ];

  // ★新規追加：指し口（尻尾）のCSS。右側に吹き出しが出る場合のみ、左側に尻尾をつける
  if (showTail && bubbleSide === "right") {
    bubbleClasses.push(
      "before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-[5px] before:w-[10px] before:h-[10px] before:bg-white before:border-b before:border-l before:border-[var(--ring)] before:rotate-45 before:rounded-[2px]"
    );
  }

  if (compact) {
    if (bubbleSide === "left-belly") {
      // ログイン後（影響なし）
      bubbleClasses.push("right-[95px] bottom-[40px] w-[200px]");
    } else if (bubbleSide === "right") {
      // ★修正：LP用。w-maxとwhitespace-nowrapで絶対に1行にする。Y位置も顔に合わせて微調整。
      bubbleClasses.push("left-[90px] top-[15px] w-max whitespace-nowrap");
    } else {
      bubbleClasses.push("right-[90px] top-0 w-[160px]");
    }
  } else {
    bubbleClasses.push("right-[130px] top-4 w-[180px]");
  }

  return (
    <div className={["relative", widthClass].join(" ")}>
      {showBubble ? (
        <div className={bubbleClasses.join(" ")}>
          {message}
        </div>
      ) : null}

      <div className={["relative ml-auto", compact ? "mt-8 h-[92px] w-[92px]" : "mt-12 h-[112px] w-[112px]"].join(" ")}>
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
          <circle cx="60" cy="70" r="40" fill="white" fillOpacity="0.3" filter="blur(10px)" />
          <path d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" fill="url(#bodyGrad)" />
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />
          <path d="M60 28 L60 18" stroke="#89ac8e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#a8c7ab" />
          <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" />
          <circle cx="44" cy="50" r="4.5" fill="#4d6f55" />
          <circle cx="76" cy="50" r="4.5" fill="#4d6f55" />
          <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke="#4d6f55" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
