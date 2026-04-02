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
          "relative ml-auto overflow-hidden rounded-[28px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_48%)]",
          compact ? "mt-10 h-[92px] w-[92px]" : "mt-14 h-[112px] w-[112px]",
        ].join(" ")}
      >
        {/* ▼▼ 新しい「未病レーダー公式ボット」のSVG ▼▼ */}
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="botBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#f3f7ef" />
            </linearGradient>
          </defs>

          {/* 背景のレーダーエフェクト（気象感知） */}
          <circle cx="60" cy="70" r="40" fill="none" stroke="#7ea284" strokeOpacity="0.15" strokeWidth="2.5" />
          <circle cx="60" cy="70" r="26" fill="none" stroke="#7ea284" strokeOpacity="0.25" strokeWidth="2.5" />

          {/* 体（丸みを帯びたフォルム） */}
          <path d="M30 115 C 30 90, 42 82, 60 82 C 78 82, 90 90, 90 115" fill="url(#botBase)" stroke="#6a9770" strokeWidth="3.5" />

          {/* 胸のミニレーダー（未病レーダーのアイデンティティ） */}
          <circle cx="60" cy="98" r="7" fill="none" stroke="#6a9770" strokeWidth="2" opacity="0.5" />
          <path d="M60 98 L65 93" stroke="#6a9770" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <circle cx="60" cy="98" r="2.5" fill="#d9a54a" opacity="0.8" />

          {/* 耳（気象センサー） */}
          <path d="M25 56 A 7 7 0 0 0 32 46 L 32 66 A 7 7 0 0 0 25 56 Z" fill="#a8c7ab" stroke="#6a9770" strokeWidth="3" strokeLinejoin="round" />
          <path d="M95 56 A 7 7 0 0 1 88 46 L 88 66 A 7 7 0 0 1 95 56 Z" fill="#a8c7ab" stroke="#6a9770" strokeWidth="3" strokeLinejoin="round" />

          {/* 顔の輪郭（LINEボットの四角ベースを踏襲しつつ角丸に） */}
          <rect x="32" y="36" width="56" height="42" rx="14" fill="url(#botBase)" stroke="#6a9770" strokeWidth="3.5" />

          {/* 頭の葉っぱアンテナ（気象と東洋医学の象徴） */}
          {/* 茎 */}
          <path d="M60 36 L60 22" stroke="#6a9770" strokeWidth="3.5" strokeLinecap="round" />
          {/* 葉っぱ */}
          <path d="M60 22 C 48 16, 52 4, 60 4 C 68 4, 72 16, 60 22 Z" fill="#a8c7ab" stroke="#6a9770" strokeWidth="3" strokeLinejoin="round" />

          {/* アンテナの受信電波（ピピピッ） */}
          <path d="M72 15 A 8 8 0 0 1 76 24" fill="none" stroke="#d9a54a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M78 11 A 14 14 0 0 1 84 27" fill="none" stroke="#d9a54a" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

          {/* 目（ととのうケアの特徴的な黄色） */}
          <circle cx="47" cy="53" r="4.5" fill="#e5b85c" />
          <circle cx="73" cy="53" r="4.5" fill="#e5b85c" />

          {/* ほっぺ */}
          <circle cx="41" cy="59" r="3.5" fill="#e2b4b4" opacity="0.6" />
          <circle cx="79" cy="59" r="3.5" fill="#e2b4b4" opacity="0.6" />

          {/* 口（優しい笑顔） */}
          <path d="M53 62 Q 60 69 67 62" fill="none" stroke="#4d6f55" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* ▲▲ ここまで ▲▲ */}
      </div>
    </div>
  );
}
