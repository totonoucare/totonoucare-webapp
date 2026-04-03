"use client";

export default function HeroDashboardArt({ className = "" }) {
  // ロゴのような正確な同心円ではなく、より流動的で奥行きのある氣の巡りを表現。
  // ゴールドのコアを小さく、柔らかい光のドットにすることで、背景に徹させる。
  return (
    <div className={["relative shrink-0", className].join(" ")}>
      {/* A sophisticated, multi-layered visual aura, breaks direct geometric similarity with the logo. */}
      {/* This artwork acts as a soft-focus background, bringing premium, translucent layering to the dashboard. */}
      <svg viewBox="0 0 200 200" className="h-[200px] w-[200px]" aria-hidden="true">
        <defs>
          {/* stdDeviationを上げ、より柔らかい、透過的な高級感を出す */}
          <filter id="softGlowAura" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" /> {/* 15 -> 20 */}
          </filter>
          <filter id="corePulseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" /> {/* 8 -> 12 */}
          </filter>
          <filter id="waveLayerBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>

          {/* ゴールドの光（stdDeviationを上げ、より柔らかく） */}
          <radialGradient id="lifeForceGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9a54a" />
            <stop offset="100%" stopColor="#d9a54a" stopOpacity="0.1" /> {/* 0 -> 0.1 (より柔らかいゴールドに) */}
          </radialGradient>
        </defs>

        {/* 最背面: 淡いミントグリーンのぼかしたオーラ */}
        <circle cx="100" cy="100" r="95" fill="#fdfefc" filter="url(#softGlowAura)" opacity="0.6" />

        {/* 中間面: 気象の層（より透過的に、エリアチャート風曲線を強調） */}
        <path d="M10 100 C 40 60, 80 140, 110 100 S 160 60, 190 100" fill="none" stroke="#6a9770" strokeOpacity="0.1" strokeWidth="4" strokeLinecap="round" filter="url(#waveLayerBlur)" /> {/* 0.2 -> 0.1 */}
        <path d="M20 120 C 50 80, 90 160, 120 120 S 170 80, 200 120" fill="none" stroke="#6a9770" strokeOpacity="0.05" strokeWidth="4" strokeLinecap="round" filter="url(#waveLayerBlur)" /> {/* 0.1 -> 0.05 */}
        
        {/* 前面: 予報のコア（ゴールドの柔らかい光のドット。サイズを小さく、r="14" -> r="8"） */}
        <circle cx="100" cy="100" r="28" fill="url(#lifeForceGold)" filter="url(#corePulseGlow)" opacity="0.8" />
        <circle cx="100" cy="100" r="8" fill="#d9a54a" opacity="0.9" /> {/* 14 -> 8 (コアを小さく) */}

        {/* 最前面: ツボのドット（不透明度を下げ、背景に徹させる。0.3 -> 0.1） */}
        <circle cx="100" cy="30" r="3" fill="#6a9770" opacity="0.1" /> {/* 0.3 -> 0.1 */}
        <circle cx="100" cy="170" r="3" fill="#6a9770" opacity="0.1" /> {/* 0.3 -> 0.1 */}
        <circle cx="30" cy="100" r="3" fill="#6a9770" opacity="0.1" /> {/* 0.3 -> 0.1 */}
        <circle cx="170" cy="100" r="3" fill="#6a9770" opacity="0.1" /> {/* 0.3 -> 0.1 */}
        
      </svg>
    </div>
  );
}
