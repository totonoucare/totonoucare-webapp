"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={title}>
      <defs>
        {/* 背景と空間のグラデーション */}
        <linearGradient id="bgGrad_st_complex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#e2efe5" />
        </linearGradient>
        
        {/* サイバー経絡（エネルギーライン）の光 */}
        <linearGradient id="meridianGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#89ac8e" />
          <stop offset="100%" stopColor="#4d6f55" />
        </linearGradient>

        {/* コア（短期集中の小さな火花） */}
        <radialGradient id="coreSpark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e5b85c" />
          <stop offset="40%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>

        {/* 加速（スピード）の残像グラデーション */}
        <linearGradient id="speedTrail" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#6a9770" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
        </linearGradient>

        {/* エフェクト・フィルター群 */}
        <filter id="glow_heavy" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow_light" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="shadow_deep" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#314e38" floodOpacity="0.15" />
        </filter>

        {/* 分析空間の背景グリッドパターン */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill="#6a9770" opacity="0.15" />
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6a9770" strokeWidth="0.5" opacity="0.05" />
        </pattern>
      </defs>

      {/* 1. ベースキャンバス（シャドウ付きの美しいカード背景） */}
      <rect x="10" y="10" width="380" height="380" rx="48" fill="url(#bgGrad_st_complex)" filter="url(#shadow_deep)" />
      <rect x="10" y="10" width="380" height="380" rx="48" fill="url(#grid)" />

      {/* 2. HUD・レーダーリング（SaaS解析のメタファー） */}
      <g transform="translate(220, 180)" opacity="0.4">
        <circle cx="0" cy="0" r="80" fill="none" stroke="#6a9770" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx="0" cy="0" r="120" fill="none" stroke="#6a9770" strokeWidth="0.5" strokeDasharray="20 10 2 10" />
        <circle cx="0" cy="0" r="160" fill="none" stroke="#89ac8e" strokeWidth="2" strokeDasharray="1 12" opacity="0.6" />
        {/* レーダーのスイープライン */}
        <path d="M 0 0 L 140 -80" stroke="#a8c7ab" strokeWidth="1" opacity="0.5" />
      </g>

      {/* 3. モーションブラー（残像レイヤー：疾走感） */}
      <g opacity="0.15" fill="none" stroke="url(#speedTrail)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" transform="translate(-40, 10)">
        <path d="M 220 160 C 200 190, 180 220, 160 250" />
        <path d="M 160 250 C 190 260, 210 265, 230 270 C 240 300, 250 320, 260 350" />
        <path d="M 160 250 C 130 255, 110 260, 100 260 C 70 250, 50 245, 30 240" />
        <circle cx="260" cy="110" r="24" />
      </g>

      {/* 4. メインの人物シルエット（太いカプセル状のベース） */}
      {/* 筋肉や骨格を思わせる有機的かつ幾何学的なライン */}
      <g fill="none" stroke="#cce0d2" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        {/* 奥の腕と脚 */}
        <path d="M 240 150 C 210 140, 195 135, 180 130 C 160 140, 145 150, 130 160" opacity="0.6" />
        <path d="M 180 240 C 150 245, 130 250, 120 250 C 90 240, 70 235, 50 230" opacity="0.6" />
        
        {/* 胴体と頭 */}
        <path d="M 240 150 C 220 180, 200 210, 180 240" />
        <circle cx="280" cy="100" r="28" />

        {/* 手前の腕と脚 */}
        <path d="M 240 150 C 270 165, 285 170, 300 180 C 315 160, 330 145, 340 130" />
        <path d="M 180 240 C 210 250, 230 255, 250 260 C 260 290, 270 310, 280 340" />
      </g>

      {/* 5. サイバー経絡（内部を通るエネルギーラインとツボ） */}
      <g fill="none" stroke="url(#meridianGlow)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow_light)">
        {/* 胴体のメインライン（任脈/督脈のメタファー） */}
        <path d="M 240 150 C 220 180, 200 210, 180 240" />
        <path d="M 240 150 C 270 165, 285 170, 300 180 C 315 160, 330 145, 340 130" />
        <path d="M 180 240 C 210 250, 230 255, 250 260 C 260 290, 270 310, 280 340" />
        <circle cx="280" cy="100" r="14" />
      </g>

      {/* 経穴（ツボ / エネルギーノード） */}
      <g fill="#ffffff" filter="url(#glow_light)">
        <circle cx="240" cy="150" r="5" /> {/* 肩 */}
        <circle cx="300" cy="180" r="4" /> {/* 肘 */}
        <circle cx="340" cy="130" r="3" /> {/* 手 */}
        <circle cx="180" cy="240" r="5" /> {/* 股関節 */}
        <circle cx="250" cy="260" r="4" /> {/* 膝 */}
        <circle cx="280" cy="340" r="3" /> {/* 足 */}
        <circle cx="280" cy="100" r="4" /> {/* 頭（百会） */}
      </g>

      {/* 6. 体質コア（余力小 × アクセル優位） */}
      <g transform="translate(210, 195)">
        {/* コアの周囲を回る照準（エネルギーの制御） */}
        <circle cx="0" cy="0" r="32" fill="none" stroke="#d9a54a" strokeWidth="2" strokeDasharray="6 12" opacity="0.6" />
        <circle cx="0" cy="0" r="20" fill="none" stroke="#e5b85c" strokeWidth="1" strokeDasharray="2 4" opacity="0.8" />
        
        {/* 激しく燃えるが小さいコア（余力小） */}
        <circle cx="0" cy="0" r="48" fill="url(#coreSpark)" filter="url(#glow_heavy)" opacity="0.9" />
        <circle cx="0" cy="0" r="6" fill="#ffffff" filter="url(#glow_heavy)" />
      </g>

      {/* 7. ディティール：加速の風と、飛び散るエネルギー破片（疲労・消耗の表現） */}
      <g stroke="#89ac8e" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="320" y1="100" x2="380" y2="100" />
        <line x1="280" y1="50" x2="340" y2="50" strokeWidth="4" opacity="0.4" />
        <line x1="290" y1="280" x2="350" y2="280" />
      </g>
      
      {/* 削れていくエネルギー（ポリゴンの破片） */}
      <g fill="#d9a54a" opacity="0.6" filter="url(#glow_light)">
        <polygon points="120,200 125,205 115,210" />
        <polygon points="150,180 158,182 152,190" />
        <polygon points="90,160 96,155 92,150" />
        <circle cx="100" cy="190" r="2" />
        <circle cx="140" cy="220" r="1.5" />
        <circle cx="70" cy="170" r="2.5" />
      </g>

    </svg>
  );
}
