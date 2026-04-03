"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：陽（アクセル）× 小（余力）。
  // モダンなSaaS風の顔なし人物ラインアートで「全力疾走」を表現。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="coreGlow_st" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="glowBlur_st" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* 優しい背景の円（カード内での収まりを良くする） */}
      <circle cx="60" cy="60" r="48" fill="#fdfefc" />
      <circle cx="60" cy="60" r="42" fill="#eef4eb" opacity="0.6" />

      {/* アクセル（スピード感）を表現する後ろの風のライン */}
      <path d="M 15 45 L 35 45 M 10 70 L 30 70 M 20 85 L 45 85" stroke="#d3e2d6" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {/* 人物モチーフ（関節を重ね合わせたモダンなラインアート） */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        
        {/* 奥のレイヤー (右腕、左脚) - 透明度を下げて奥行きを出す */}
        <g stroke="#89ac8e" strokeWidth="9" opacity="0.4">
          <path d="M 75 40 L 60 35 L 45 40" /> {/* 後ろに振る腕 */}
          <path d="M 55 65 L 40 75 L 20 80" /> {/* 地面を蹴る脚 */}
        </g>
        
        {/* 中間のレイヤー (胴体と頭) */}
        <path d="M 75 40 L 55 65" stroke="#6a9770" strokeWidth="13" opacity="0.9" /> {/* 前傾姿勢の胴体 */}
        <circle cx="82" cy="24" r="8" fill="#6a9770" stroke="none" opacity="0.9" /> {/* 頭部 */}

        {/* 手前のレイヤー (左腕、右脚) - 明るい色で手前を表現 */}
        <g stroke="#a8c7ab" strokeWidth="11" opacity="1">
          <path d="M 75 40 L 85 55 L 70 75" /> {/* 前に振る腕 */}
          <path d="M 55 65 L 75 60 L 85 85" /> {/* 振り上げる脚 */}
        </g>

        {/* コア（余力小：小さく儚い輝き） */}
        <circle cx="65" cy="52" r="14" fill="url(#coreGlow_st)" stroke="none" opacity="0.8" filter="url(#glowBlur_st)" />
        <circle cx="65" cy="52" r="4" fill="#d9a54a" stroke="none" />
      </g>
    </svg>
  );
}
