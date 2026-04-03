"use client";

export default function FigureTough({ className = "h-full w-full", title = "タフ型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="figureGrad_tough_f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>
        <radialGradient id="coreGlow_tough_f" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="coreBlur_tough_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="auraBlur_tough_f" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* 優しい背景の円 */}
      <circle cx="60" cy="60" r="48" fill="#fdfefc" />
      <circle cx="60" cy="60" r="42" fill="#eef4eb" opacity="0.5" />

      {/* アクセルを表現する力強い上昇の軌跡 */}
      <path d="M 20 100 Q 60 30 100 100" stroke="#d3e2d6" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* 人物モチーフ: 力強い前進（ストライド） */}
      <g transform="translate(0, 5)">
        {/* 奥のレイヤー (左腕・左脚) */}
        <g stroke="#89ac8e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5">
          <path d="M 60 35 L 45 40 L 35 30" /> {/* 大きく振る左腕 */}
          <path d="M 55 65 L 40 85" /> {/* 蹴り出す左脚 */}
        </g>

        {/* 胴体（胸を張って前進） */}
        <g stroke="#6a9770" strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M 60 35 L 55 65" />
        </g>
        {/* 頭部 */}
        <circle cx="65" cy="15" r="8.5" fill="#6a9770" opacity="0.9" />

        {/* 手前のレイヤー (右腕・右脚) */}
        <g stroke="#a8c7ab" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 60 35 L 75 45 L 65 60" /> {/* 力強く曲げた右腕 */}
          <path d="M 55 65 L 75 80 L 75 100" /> {/* 踏み込む右脚 */}
        </g>

        {/* コア（バッテリー大：最大サイズの力強い輝き） */}
        <circle cx="60" cy="50" r="40" fill="url(#coreGlow_tough_f)" opacity="0.8" filter="url(#coreBlur_tough_f)" />
        <circle cx="60" cy="50" r="14" fill="#d9a54a" />
      </g>
    </svg>
  );
}
