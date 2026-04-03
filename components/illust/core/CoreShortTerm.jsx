"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：洗練されたメディカルラインアート（特定症状への依存を排除）
  // 短期集中型：アクセル（前傾姿勢で先を急ぐ・推進力） × 余力小（胸のコアが小さい）
  // 特定の部位（頭や胃）を押さえることはせず、純粋に「体の使い方のペース」をシルエットで表現します。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="bgGrad_st_line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>

        <radialGradient id="accelAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6a9770" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="coreGlow_st_line" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. ベースの角丸背景 */}
      <rect width="120" height="120" rx="28" fill="url(#bgGrad_st_line)" />

      {/* 2. 状態を示すオーラ（アクセル優位） */}
      {/* 前進するエネルギー・瞬発力を示すオーラとスピードライン */}
      <circle cx="65" cy="55" r="32" fill="url(#accelAura)" />
      <path d="M 15 45 L 35 45 M 20 60 L 40 60 M 25 75 L 40 75" stroke="#89ac8e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* 3. 人物のアウトライン（特定の主訴を持たない、純粋な「体質」のポーズ） */}
      {/* 常に先へ先へと急いでしまう（前傾姿勢で腕を振って歩く）シルエット */}
      <g stroke="#4d6f55" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭部（少し前傾） */}
        <circle cx="68" cy="35" r="12" fill="#fdfefc" />
        
        {/* 胴体（前傾姿勢で進む背中のライン） */}
        <path d="M 62 46 C 52 65, 45 85, 45 105" />
        
        {/* 右腕（勢いよく前へ振る） */}
        <path d="M 60 50 C 72 65, 82 75, 88 90" />
        
        {/* 左腕（後ろへ振る） */}
        <path d="M 60 50 C 45 60, 35 70, 28 85" opacity="0.6" />
      </g>

      {/* 4. 体質コア（胸の奥にある「余力」のメタファー） */}
      <g transform="translate(54, 65)">
        {/* 余力小：小さく、儚い光 */}
        <circle cx="0" cy="0" r="14" fill="url(#coreGlow_st_line)" />
        <circle cx="0" cy="0" r="3.5" fill="#d9a54a" opacity="0.9" />
      </g>
    </svg>
  );
}
