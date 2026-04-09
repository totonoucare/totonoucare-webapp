"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  // compactモード（ヘッダー等）と通常モード（Hero等）でサイズを切り替え
  const viewBoxSize = 64;
  const iconSizeClass = compact ? "h-10 w-10 rounded-[12px]" : "h-16 w-16 rounded-[22px]";
  const titleTextClass = compact ? "text-[20px] leading-none" : "text-[32px] leading-[1.02]";
  const subTextClass = compact ? "text-[10px]" : "text-[12px] tracking-[0.16em]";

  return (
    <div className={["flex items-center gap-4", className].join(" ")}>
      {/* 1. アイコン部分：先進的なパラボラ・レーダー（右向き・精密解析） */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_8px_20px_-6px_rgba(15,23,62,0.15)] ring-1 ring-slate-900/5",
          iconSizeClass,
        ].join(" ")}
      >
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="h-full w-full" aria-hidden="true">
          <defs>
            {/* 予報・警告（アンバー）からととのい（ミント）へのグラデーション */}
            <linearGradient id="signalGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" /> {/* Amber */}
              <stop offset="100%" stopColor="#A3C1A8" /> {/* Mint */}
            </linearGradient>
            
            {/* 信号波に奥行きを与える、繊細なブラーフィルタ */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>

          {/* 背景（わずかにグレーを帯びた、清潔な白） */}
          <rect width="64" height="64" fill="#F8F9FA" />

          {/* 信号波（右上の広がり：先読みと拡散） */}
          <g filter="url(#softGlow)" opacity="0.6">
            <path d="M42 22 A 18 18 0 0 1 54 38" fill="none" stroke="url(#signalGrad)" strokeWidth="3" strokeLinecap="round" />
            <path d="M36 16 A 26 26 0 0 1 54 28" fill="none" stroke="url(#signalGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M48 28 A 10 10 0 0 1 54 44" fill="none" stroke="url(#signalGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
          </g>

          {/* パラボラアンテナ（ネイビー：揺るぎない分析軸。右向き・精密設計） */}
          <g transform="translate(48, 46) rotate(35) scale(-1, 1)">
            {/* アンテナの軸（太く、信頼感がある） */}
            <path d="M12 -2 L12 -12" stroke="#0F173E" strokeWidth="4.5" strokeLinecap="round" />
            {/* パラボラ部分（シャープで、無駄のない造形） */}
            <path d="M0 -14 C0 -4, 24 -4, 24 -14 L20 -16 C20 -10, 4 -10, 4 -16 Z" fill="#0F173E" />
            {/* 受信機先端（正確なポイントを捉える） */}
            <circle cx="12" cy="-22" r="3" fill="#0F173E" />
            <path d="M12 -12 L12 -20" stroke="#0F173E" strokeWidth="1.8" />
          </g>

          {/* 下部の波（体調のゆらぎ。わずかに残すことで人間味を担保） */}
          <path d="M10 54 Q 22 48, 34 54 T 58 54" fill="none" stroke="#0F173E" strokeWidth="2" strokeOpacity="0.08" />
        </svg>
      </div>

      {/* 2. タイポグラフィ部分：ビジネス仕様の格付け */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "font-black tracking-tighter flex items-baseline gap-1",
            titleTextClass,
          ].join(" ")}
        >
          <span className="text-[#0F173E]">未病</span>
          <span className="text-[#FBBF24]">レーダー</span>
        </div>
        
        {!compact && (
          <p className={[
            "mt-1.5 font-extrabold text-slate-500 uppercase flex items-center gap-2",
            subTextClass
          ].join(" ")}>
            <span className="text-[#0F173E]">Mibyo</span>
            <span>Radar</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Personal Forecast</span>
          </p>
        )}
      </div>
    </div>
  );
}
