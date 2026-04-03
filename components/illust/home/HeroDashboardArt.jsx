"use client";

export default function HeroDashboardArt({ className = "" }) {
  // キャラクターとメッセージを美しく包み込み、ロゴとは一線を画す洗練されたオーラ。
  // ロゴのような正確な同心円ではなく、より流動的で奥行きのある氣の巡りを表現。
  return (
    <div className={["relative shrink-0", className].join(" ")}>
      {/* Create a sophisticated, multi-layered visual aura, designed to perfectly surround and harmonize with the character. */}
      {/* This artwork breaks away from the strict geometric similarity with the logo, forming a protective field of pulsing light. */}
      <svg viewBox="0 0 200 200" className="h-[200px] w-[200px]" aria-hidden="true">
        <defs>
          {/* Create sophisticated, diffused lighting effects for layered translucency */}
          <filter id="softGlowAura" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
          </filter>
          <filter id="corePulseGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
          <filter id="waveLayerBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>

          {/* Golden life-force glow (derived from character core) */}
          <radialGradient id="lifeForceGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9a54a" />
            <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 最背面 (Layer 1): 淡いミントグリーンのぼかしたオーラ（全体のトーンを形成） */}
        <circle cx="100" cy="100" r="95" fill="#fdfefc" filter="url(#softGlowAura)" opacity="0.6" />

        {/* 中間面 (Layer 2): 気象の層（同心円状の波紋ではなく、緩やかな氣の巡り） */}
        {/* Mint waves, forming an aura, breaking direct similarity to logo's strict concentric circles. */}
        <path d="M10 100 C 40 60, 80 140, 110 100 S 160 60, 190 100" fill="none" stroke="#6a9770" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" filter="url(#waveLayerBlur)" />
        <path d="M20 120 C 50 80, 90 160, 120 120 S 170 80, 200 120" fill="none" stroke="#6a9770" strokeOpacity="0.1" strokeWidth="4" strokeLinecap="round" filter="url(#waveLayerBlur)" />
        
        {/* 前面 (Layer 3): 予報のコア（ゴールドの柔らかい光が波打つ） */}
        <circle cx="100" cy="100" r="28" fill="url(#lifeForceGold)" filter="url(#corePulseGlow)" opacity="0.8" />
        <circle cx="100" cy="100" r="14" fill="#d9a54a" opacity="0.9" />

        {/* 最前面 (Layer 4): 東洋医学の象徴（ツボ・経絡）を非常に控えめに統合 */}
        <circle cx="100" cy="30" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="100" cy="170" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="30" cy="100" r="3" fill="#6a9770" opacity="0.3" />
        <circle cx="170" cy="100" r="3" fill="#6a9770" opacity="0.3" />
        
      </svg>
    </div>
  );
}
