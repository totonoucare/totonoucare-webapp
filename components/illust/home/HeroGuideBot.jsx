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
            "absolute top-0 max-w-[158px] rounded-2xl border border-[var(--ring)] bg-white px-3 py-2 text-left text-[11px] font-bold leading-5 text-slate-600 shadow-sm z-10",
            bubblePos,
            compact ? "translate-y-0" : "-translate-y-1",
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      <div
        className={[
          "relative ml-auto overflow-hidden rounded-[28px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_48%)] shadow-inner",
          compact ? "mt-10 h-[92px] w-[92px]" : "mt-14 h-[112px] w-[112px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            {/* 立体感・高級感を出すためのグラデーション群 */}
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

            {/* アウトラインなしで境界を際立たせるための柔らかいドロップシャドウ */}
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#4d6f55" floodOpacity="0.12" />
            </filter>
            <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4d6f55" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* 背景の抽象的なレーダー波紋 */}
          <circle cx="60" cy="70" r="45" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" />
          <circle cx="60" cy="70" r="30" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />

          {/* ボディ部（アウトラインなし、グラデーションで立体感） */}
          <path d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" fill="url(#bodyGrad)" />

          {/* 胸のレーダー（同心円状の光の波紋） */}
          <circle cx="60" cy="85" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          <circle cx="60" cy="85" r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <circle cx="60" cy="85" r="3" fill="url(#radarGlow)" />

          {/* 頭の葉っぱ（アンテナ） */}
          <path d="M60 28 L60 18" stroke="#89ac8e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#a8c7ab" filter="url(#leafShadow)" />

          {/* 顔部（Squircleに近い角丸矩形、シャドウで浮かせる） */}
          <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad)" filter="url(#softShadow)" />

          {/* 目（シンプルで高級感のあるダークカラー） */}
          <circle cx="44" cy="50" r="4.5" fill="#4d6f55" />
          <circle cx="76" cy="50" r="4.5" fill="#4d6f55" />

          {/* ほほの赤み（ぼかしを効かせて優しく） */}
          <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
          <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />

          {/* 口（控えめな笑顔、線幅を細くして洗練さを出す） */}
          <path d="M54 58 C 58 61, 62 61, 66 58" fill="none" stroke="#4d6f55" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
