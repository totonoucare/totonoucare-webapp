"use client";

export default function FigureActive({ className = "h-full w-full", title = "アクティブ型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="figureGrad_act_f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>
        <radialGradient id="coreGlow_act_f" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="coreBlur_act_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="auraBlur_act_f" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* 優しい背景の円 */}
      <circle cx="60" cy="60" r="48" fill="#fdfefc" />
      <circle cx="60" cy="60" r="42" fill="#eef4eb" opacity="0.5" />

      {/* アクセルを表現する上向きの躍動ライン */}
      <path d="M 30 90 Q 60 40 90 90" stroke="#d3e2d6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
      
      {/* 人物モチーフ: 大きく跳躍（ジャンプ） */}
      <g transform="translate(3, 4)">
        {/* 奥のレイヤー (左腕・左脚) */}
        <g stroke="#89ac8e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5">
          <path d="M 65 35 L 45 25" /> {/* 上へ伸ばす左腕 */}
          <path d="M 50 65 L 35 55" /> {/* 曲げて跳ねる左脚 */}
        </g>

        {/* 胴体 */}
        <g stroke="#6a9770" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M 65 35 L 50 65" />
        </g>
        {/* 頭部 */}
        <circle cx="72" cy="18" r="7.5" fill="#6a9770" opacity="0.9" />

        {/* 手前のレイヤー (右腕・右脚) */}
        <g stroke="#a8c7ab" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 65 35 L 85 25" /> {/* 上へ伸ばす右腕 */}
          <path d="M 50 65 L 60 90" /> {/* 下へ伸びる右脚 */}
        </g>

        {/* コア（バッテリー標準：安定した輝き） */}
        <circle cx="60" cy="50" r="28" fill="url(#coreGlow_act_f)" opacity="0.7" filter="url(#coreBlur_act_f)" />
        <circle cx="60" cy="50" r="8" fill="#d9a54a" />
      </g>
    </svg>
  );
}
