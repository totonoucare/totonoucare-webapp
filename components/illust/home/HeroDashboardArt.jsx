"use client";

export default function HeroDashboardArt({ className = "" }) {
  return (
    <div className={["relative shrink-0", className].join(" ")}>
      {/* ダッシュボード右上（キャラクターの背後）に配置されるアートワーク */}
      {/* 画面全体の奥行きと一体感を出すため、キャラクター全体を包むようなサイズ（200x200）で構成 */}
      <svg viewBox="0 0 200 200" className="h-[200px] w-[200px]" aria-hidden="true">
        <defs>
          {/* 高級感を出すためのぼかし効果 */}
          <filter id="auraBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
          </filter>
          <filter id="coreBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>

          {/* 複数のグラデーションで深みを出す */}
          <linearGradient id="mintWaveGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6a9770" />
            <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9a54a" />
            <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="softMintAura" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f0f5f1" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* 最背面: 淡いミントグリーンのぼかしたオーラ（全体のトーンを形成） */}
        <circle cx="100" cy="100" r="90" fill="url(#softMintAura)" opacity="0.6" filter="url(#auraBlur)" />

        {/* 中間面: 気象の層（同心円状の波紋） */}
        <circle cx="100" cy="100" r="85" fill="none" stroke="#d3e2d6" strokeWidth="2" strokeOpacity="0.5" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="#a3c1a8" strokeWidth="2" strokeOpacity="0.3" />
        <circle cx="100" cy="100" r="45" fill="none" stroke="#6a9770" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />

        {/* 前面: 予報のコア（ゴールドの柔らかい光） */}
        <circle cx="100" cy="100" r="22" fill="url(#goldGlow)" filter="url(#coreBlur)" opacity="0.8" />
        <circle cx="100" cy="100" r="10" fill="#d9a54a" opacity="0.9" />

        {/* 最前面: 氣の巡り（緩やかな曲線） */}
        <path d="M40 100 C 60 80, 80 120, 100 100 S 140 80, 160 100" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        <path d="M50 115 C 70 95, 90 135, 110 115 S 150 95, 170 115" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" opacity="0.1" />

        {/* 抽象化されたツボ（ロゴとの呼應） */}
        <circle cx="100" cy="30" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="100" cy="170" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="30" cy="100" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="170" cy="100" r="3" fill="#6a9770" opacity="0.3" />
      </svg>
    </div>
  );
}
