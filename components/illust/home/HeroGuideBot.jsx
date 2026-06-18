"use client";

function getGuideBotFace(signal = 0) {
  const darkGreen = "#3a5c4b";
  const blushColor = "#d69e9e";

  let eyes = (
    <>
      <circle cx="44" cy="50" r="4.5" fill={darkGreen} />
      <circle cx="76" cy="50" r="4.5" fill={darkGreen} />
    </>
  );

  let mouth = (
    <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke={darkGreen} strokeWidth="2.3" strokeLinecap="round" />
  );

  let accessory = null;

  if (signal === 1) {
    mouth = <path d="M54 59 C 58 58, 62 58, 66 59" fill="none" stroke={darkGreen} strokeWidth="2.3" strokeLinecap="round" />;
  } else if (signal === 2) {
    eyes = (
      <>
        <path d="M40 51 Q 44 48 48 51" fill="none" stroke={darkGreen} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 51 Q 76 48 80 51" fill="none" stroke={darkGreen} strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
    mouth = <path d="M54 60 C 58 57, 62 57, 66 60" fill="none" stroke={darkGreen} strokeWidth="2.3" strokeLinecap="round" />;
    accessory = <path d="M 85 40 Q 88 45 85 48 Q 82 45 85 40 Z" fill="#90b1e0" opacity="0.8" />;
  }

  return { eyes, mouth, accessory, blushColor };
}

function GuideBotSvg({ signal = 0, className = "h-full w-full" }) {
  const { eyes, mouth, accessory, blushColor } = getGuideBotFace(Number(signal));

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
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
          <stop offset="0%" stopColor="#C99A35" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#efbf56" stopOpacity="0.28" />
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#24564C" floodOpacity="0.28" />
        </filter>
      </defs>

      <circle cx="60" cy="70" r="40" fill="#ffffff" fillOpacity="0.4" filter="blur(10px)" />
      <path
        d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z"
        fill="url(#bodyGrad)"
        stroke="#a1c4b2"
        strokeWidth="1"
        filter="url(#softShadow)"
      />

      <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.98" />
      <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.76" />
      <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />

      <path d="M60 28 L60 18" stroke="#6eab90" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#8fc7aa" />

      <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" stroke="#d9e8df" strokeWidth="1" />

      <ellipse cx="36" cy="56" rx="5" ry="3" fill={blushColor} opacity="0.65" />
      <ellipse cx="84" cy="56" rx="5" ry="3" fill={blushColor} opacity="0.65" />

      {eyes}
      {mouth}
      {accessory}
    </svg>
  );
}

export function GuideBotAvatar({ signal = 0, className = "h-12 w-12" }) {
  return <GuideBotSvg signal={signal} className={className} />;
}

export default function HeroGuideBot({
  message = "今日はどんな日か、ひと目で見ていこう。",
  compact = false,
  bubbleSide = "left",
  showBubble = true,
  signal = 0, // ★ 0:安定, 1:注意, 2:警戒
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

  const { eyes, mouth, accessory, blushColor } = getGuideBotFace(Number(signal));

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
              <stop offset="0%" stopColor="#C99A35" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#efbf56" stopOpacity="0.28" />
            </linearGradient>
            {/* ★ shadowOpacity を 0.16 -> 0.28 に上げて輪郭をはっきりさせる */}
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#24564C" floodOpacity="0.28" />
            </filter>
          </defs>

          <circle cx="60" cy="70" r="40" fill="#ffffff" fillOpacity="0.4" filter="blur(10px)" />
          
          {/* ★ 体にもごく薄い枠線をつけて背景に溶けないように + softShadowを追加 */}
          <path 
            d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" 
            fill="url(#bodyGrad)" 
            stroke="#a1c4b2" 
            strokeWidth="1" 
            filter="url(#softShadow)" 
          />
          
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.98" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.76" />
          <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />

          <path d="M60 28 L60 18" stroke="#6eab90" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#8fc7aa" />

          {/* 頭部 */}
          <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" stroke="#d9e8df" strokeWidth="1" />
          
          {/* ほっぺた（不透明度を 0.46 -> 0.65 にして血色良く） */}
          <ellipse cx="36" cy="56" rx="5" ry="3" fill={blushColor} opacity="0.65" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill={blushColor} opacity="0.65" />
          
          {/* 動的な表情パーツ */}
          {eyes}
          {mouth}
          {accessory}

        </svg>
      </div>
    </div>
  );
}

