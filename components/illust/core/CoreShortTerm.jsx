"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：陽（アクセル）× 小（余力）。キャラクターは息切れして走っている、疲労目、汗。
  // お腹のコアを小さく（儚い光）にし、背後には上へ広がる鋭いオーラ。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="headGrad_st_f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8f0ea" />
        </linearGradient>
        <linearGradient id="bodyGrad_st_f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f0ea" />
          <stop offset="100%" stopColor="#cce0d2" />
        </linearGradient>
        <radialGradient id="coreGlow_st_f" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="glowBlur_st_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="auraBlur_st_f" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* 1. 最背面: 淡い背景オーラ（陽） */}
      <rect width="120" height="120" fill="#fdfefc" />
      <circle cx="60" cy="40" r="45" fill="#eef4eb" opacity="0.6" filter="url(#auraBlur_st_f)" />

      {/* 2. 背景グラフィック: アクセル（上向きの鋭い波紋） */}
      <path d="M 10 100 Q 60 0 110 100" fill="none" stroke="#6a9770" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" />
      <path d="M 25 105 Q 60 20 95 105" fill="none" stroke="#6a9770" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 110 Q 60 40 80 110" fill="none" stroke="#6a9770" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />

      {/* 3. キャラクター: 必死に走っているポーズ、疲労目、汗 */}
      {/* 頭部（少し前のめり） */}
      <rect x="24" y="28" width="72" height="52" rx="22" fill="url(#headGrad_st_f)" stroke="#d3e2d6" strokeWidth="1" transform="rotate(-5 60 54)" />
      {/* アンテナ */}
      <path d="M60 28 L60 18" stroke="#89ac8e" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-5 60 54)" />
      <path d="M60 18 C52 10, 57 4, 65 4 C72 4, 70 14, 60 18 Z" fill="#a8c7ab" stroke="#d3e2d6" strokeWidth="0.5" transform="rotate(-5 60 54)" />
      {/* 目: 疲労目 (半開き、少し必死) */}
      <ellipse cx="40" cy="50" rx="4.5" ry="3" fill="#4d6f55" />
      <ellipse cx="76" cy="50" rx="4.5" ry="3" fill="#4d6f55" />
      {/* ほほの赤み */}
      <ellipse cx="36" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
      <ellipse cx="84" cy="56" rx="5" ry="3" fill="#e2b4b4" opacity="0.4" />
      {/* 口: 必死な笑顔（少し歪んでいる） */}
      <path d="M 54 60 Q 58 64, 62 60" fill="none" stroke="#4d6f55" strokeWidth="2.2" strokeLinecap="round" />
      {/* 汗ドロップ */}
      <path d="M 30 40 Q 32 44, 30 46" fill="none" stroke="#4d6f55" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M 32 42 Q 34 46, 32 48" fill="none" stroke="#4d6f55" strokeWidth="1" strokeLinecap="round" opacity="0.6" />

      {/* ボディ: 走っているポーズ、前のめり */}
      <path d="M34 65 L86 65 C86 90, 80 115, 60 115 C40 115, 34 90, 34 65 Z" fill="url(#bodyGrad_st_f)" stroke="#d3e2d6" strokeWidth="1" transform="rotate(-10 60 90)" />
      {/* 走る足のライン（抽象的） */}
      <path d="M 45 105 L 40 115 M 75 105 L 80 115" fill="none" stroke="#89ac8e" strokeWidth="3" strokeLinecap="round" />

      {/* 胸のコア: 余力小 (最小。儚い光) */}
      <circle cx="60" cy="90" r="18" fill="url(#coreGlow_st_f)" opacity="0.6" filter="url(#glowBlur_st_f)" />
      <circle cx="60" cy="90" r="4" fill="#d9a54a" opacity="0.9" />
    </svg>
  );
}
