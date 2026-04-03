"use client";

export default function FigureShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：陽（アクセル）× 小（余力）。人物モチーフ（顔なし、性別不詳）。
  // ポーズは全力疾走（mid-action）。前傾姿勢でスピード感を出しつつ、少し疲労感（余力小）をシルエットに。
  // 胸のコアは小さく、儚い光。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        {/* 洗練されたプレミアムSaaS感のあるグラデーション */}
        <linearGradient id="figureGrad_st_f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>
        <radialGradient id="coreGlow_st_f" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="coreBlur_st_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="auraBlur_st_f" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* 1. 最背面: 淡い背景（静） */}
      <rect width="120" height="120" fill="#fdfefc" />
      
      {/* 2. 背景グラフィック: 奥行きを出す（非常に薄いオーラ） */}
      <circle cx="60" cy="80" r="45" fill="#eef4eb" opacity="0.6" filter="url(#auraBlur_st_f)" />

      {/* 3. 人物モチーフ: 全力疾走、前傾姿勢 (顔なし、性別不詳) */}
      {/* 動きと疲労感を伝えるシルエット */}
      <path d="M 40 40 C 35 45, 30 55, 30 65 S 35 85, 45 90 C 55 95, 65 95, 75 90 S 90 70, 90 60 S 85 45, 80 40 Z" fill="url(#figureGrad_st_f)" stroke="#d3e2d6" strokeWidth="1" />
      {/* 動きを補完するライン（汗ドロップや疲労の曲線） */}
      <path d="M 35 55 Q 38 60, 35 65" fill="none" stroke="#6a9770" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
      <path d="M 42 62 Q 45 67, 42 72" fill="none" stroke="#6a9770" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />

      {/* 4. 胸のコア: 余力小 (最小。小さく儚く輝くコア) */}
      <circle cx="60" cy="65" r="18" fill="url(#coreGlow_st_f)" opacity="0.6" filter="url(#coreBlur_st_f)" />
      <circle cx="60" cy="65" r="4" fill="#d9a54a" opacity="0.9" />
    </svg>
  );
}
