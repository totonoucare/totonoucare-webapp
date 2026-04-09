"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* 1. アイコン部分（シンボルマーク） */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[14px]" : "h-14 w-14 rounded-[20px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            {/* 高級感を出すための極めて繊細な背景グラデーション */}
            <linearGradient id="logoBgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f5f1" />
            </linearGradient>
            
            {/* レーダーの波紋用グラデーション（透明度で奥行きを出す） */}
            <linearGradient id="radarSweep" x1="0.5" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6a9770" />
              <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 背景 */}
          <rect width="64" height="64" fill="url(#logoBgGrad)" />

          {/* 背景の波紋（気象の変化・広がり） */}
          <circle cx="32" cy="32" r="22" fill="none" stroke="#d3e2d6" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#a3c1a8" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* レーダーのスウィープ（先読みする力） */}
          <path d="M32 10 A 22 22 0 0 1 54 32" fill="none" stroke="url(#radarSweep)" strokeWidth="3.5" strokeLinecap="round" />
          
          {/* クロスヘア（正確な分析・ツボの照準） */}
          <path d="M32 14 L32 20 M32 44 L32 50 M14 32 L20 32 M44 32 L50 32" stroke="#8cb093" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />

          {/* 中央のコア（ユーザー自身・生命力・ゴールドのアクセント） */}
          <circle cx="32" cy="32" r="5" fill="#d9a54a" />
          <circle cx="32" cy="32" r="5" fill="#ffffff" fillOpacity="0.2" filter="blur(1px)" />
        </svg>
      </div>

      {/* 2. タイポグラフィ部分（ロゴタイプ） */}
      <div className="flex flex-col justify-center">
        <h1
          className={[
            "font-black text-slate-900 tracking-tight",
            // 文字の塊感を出すため、line-height を極限まで詰める
            compact ? "text-[19px] leading-none" : "text-[26px] leading-[1.1]",
          ].join(" ")}
        >
          未病レーダー
        </h1>
        {/* 大きいサイズの時だけ、美しい日本語のサブタイトルを表示 */}
        {!compact && (
          <p className="mt-1.5 text-[11px] font-black tracking-widest text-slate-400">
            気象×体質のパーソナル予報
          </p>
        )}
      </div>
    </div>
  );
}
