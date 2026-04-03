"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：アイテム・自然物のメタファー（流れ星 / スパーク）
  // 特定の症状に依存せず、「瞬発力（アクセル）はあるが、余力（コア）は小さい」ことを直感的に表現。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        {/* 背景のベース */}
        <linearGradient id="bg_st_meta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>

        {/* 流れ星のコア（余力小：小さく儚い輝き） */}
        <radialGradient id="cometGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        
        {/* 軌跡（アクセル：スピード感） */}
        <linearGradient id="tailFade" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#89ac8e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#89ac8e" stopOpacity="0" />
        </linearGradient>

        <filter id="glow_comet" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* 1. ベースの角丸背景 */}
      <rect width="120" height="120" rx="28" fill="url(#bg_st_meta)" />

      {/* 2. 流れ星の軌跡（アクセル優位のスピード感と推進力） */}
      {/* 彗星の尾を複数のラインで構成し、左下から右上へ突き進むエネルギーを表現 */}
      <path d="M 20 90 Q 45 75 65 55" fill="none" stroke="url(#tailFade)" strokeWidth="4" strokeLinecap="round" />
      <path d="M 30 100 Q 55 85 70 65" fill="none" stroke="url(#tailFade)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M 40 105 Q 60 95 75 75" fill="none" stroke="url(#tailFade)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* スピードを表す残像の破線 */}
      <path d="M 25 75 L 35 65 M 45 95 L 55 85" stroke="#a8c7ab" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* 3. コア（余力小：頭の先で小さくも激しく燃える光） */}
      <g transform="translate(75, 45)">
        <circle cx="0" cy="0" r="16" fill="url(#cometGlow)" filter="url(#glow_comet)" opacity="0.9" />
        <circle cx="0" cy="0" r="4.5" fill="#d9a54a" />
        
        {/* 瞬発力を示すスパーク（四方の小さな光） */}
        <path d="M 0 -10 L 0 -15 M 0 10 L 0 15 M -10 0 L -15 0 M 10 0 L 15 0" stroke="#d9a54a" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M -7 -7 L -10 -10 M 7 7 L 10 10 M -7 7 L -10 10 M 7 -7 L 10 -10" stroke="#e5b85c" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}
