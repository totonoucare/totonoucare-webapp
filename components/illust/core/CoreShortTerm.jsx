"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        {/* 背景の柔らかなグラデーション */}
        <linearGradient id="bgGrad_st_meta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>
        
        {/* 火花/コアの発光 */}
        <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        
        {/* アクセル（スピード）のライングラデーション */}
        <linearGradient id="speedLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a9770" stopOpacity="0" />
          <stop offset="50%" stopColor="#6a9770" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
        </linearGradient>
        
        <filter id="glow_st" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="shadow_st" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4d6f55" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* 1. ベースの角丸背景（アイコンとしてのまとまりを出す） */}
      <rect x="8" y="8" width="104" height="104" rx="28" fill="url(#bgGrad_st_meta)" filter="url(#shadow_st)" />

      {/* 2. アクセルを表現する加速ライン（Burst） */}
      {/* 後ろに流れる風の残像 */}
      <path d="M 25 45 Q 60 40 95 45" fill="none" stroke="url(#speedLine)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 20 75 Q 60 80 100 75" fill="none" stroke="url(#speedLine)" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d="M 35 60 Q 60 60 85 60" fill="none" stroke="url(#speedLine)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      {/* 前へ突き進むシャープな矢印（アクセル優位） */}
      <path d="M 65 35 L 85 60 L 65 85" fill="none" stroke="#89ac8e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 75 45 L 90 60 L 75 75" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* 3. コア（余力小：小さくも鋭く発光するエネルギー） */}
      <g transform="translate(45, 60)">
        <circle cx="0" cy="0" r="16" fill="url(#sparkGlow)" opacity="0.7" filter="url(#glow_st)" />
        {/* スパークする星のようなコア */}
        <path d="M 0 -6 Q 0 0 6 0 Q 0 0 0 6 Q 0 0 -6 0 Q 0 0 0 -6 Z" fill="#d9a54a" opacity="0.9" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" opacity="0.8" />
      </g>
    </svg>
  );
}
