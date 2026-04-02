"use client";

import HeroGuideBot from "./HeroGuideBot";

export default function HeroDashboardArt() {
  return (
    <div className="relative h-[106px] w-[102px] shrink-0 overflow-hidden rounded-[24px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_45%)] shadow-[0_16px_32px_-24px_rgba(0,0,0,0.25)]">
      <svg viewBox="0 0 102 106" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/* 背景の透明感を出すための淡いグラデーション */}
          <linearGradient id="artBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          {/* 波形とレーダーの光沢グラデーション */}
          <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#89ac8e" stopOpacity="0.1" />
            <stop offset="60%" stopColor="#6a9770" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6a9770" stopOpacity="0.1" />
          </linearGradient>

          {/* 優しい発光エフェクト */}
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 背景ベース（コンテナの背景色と混ざり合って高級感を出す） */}
        <rect width="102" height="106" rx="24" fill="url(#artBgGrad)" />

        {/* レーダーの波紋（白の半透明でクリーンに） */}
        <circle cx="38" cy="54" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
        <circle cx="38" cy="54" r="22" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2.5" />

        {/* レーダーのスイープ（軌跡） */}
        <path d="M38 54 L62 36" stroke="url(#waveGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#softGlow)" />
        
        {/* レーダー中心のポイント */}
        <circle cx="38" cy="54" r="4.5" fill="#ffffff" filter="url(#softGlow)" />
        
        {/* 感知したポイント（ゴールドでアクセント） */}
        <circle cx="62" cy="36" r="3.5" fill="#e5b85c" filter="url(#softGlow)" />

        {/* 体調と気象の波（流れるようなデータウェーブ） */}
        <path 
          d="M -10 82 Q 25 65, 45 82 T 110 75" 
          fill="none" 
          stroke="url(#waveGrad)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
        />
      </svg>

      {/* 右下に配置される公式キャラクター */}
      <div className="absolute right-[-4px] bottom-[-6px] scale-[0.76] origin-bottom-right drop-shadow-md">
        <HeroGuideBot compact showBubble={false} />
      </div>
    </div>
  );
}
