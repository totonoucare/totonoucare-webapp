"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* 1. アイコン部分：先進的なパラボラ・レーダー */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_6px_16px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[12px]" : "h-14 w-14 rounded-[18px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            {/* 予報・警告を象徴するアンバーからミントへのグラデーション */}
            <linearGradient id="signalGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" /> {/* Amber */}
              <stop offset="100%" stopColor="#A3C1A8" /> {/* Mint */}
            </linearGradient>
            
            {/* 背景のわずかな奥行き */}
            <radialGradient id="bgSphere" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#F8F9FA" />
            </radialGradient>
          </defs>

          {/* 背景 */}
          <rect width="64" height="64" fill="url(#bgSphere)" />

          {/* 信号波（右上の広がり：先読みと拡散） */}
          <path d="M42 22 A 18 18 0 0 1 54 38" fill="none" stroke="url(#signalGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <path d="M36 16 A 26 26 0 0 1 54 28" fill="none" stroke="url(#signalGrad)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 28 A 10 10 0 0 1 54 44" fill="none" stroke="url(#signalGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />

          {/* パラボラアンテナ（ネイビー：揺るぎない分析軸） */}
          <g transform="translate(14, 46) rotate(-40)">
            {/* アンテナの軸 */}
            <path d="M12 -2 L12 -12" stroke="#0F173E" strokeWidth="4" strokeLinecap="round" />
            {/* パラボラ部分 */}
            <path d="M0 -14 C0 -4, 24 -4, 24 -14 L20 -16 C20 -10, 4 -10, 4 -16 Z" fill="#0F173E" />
            {/* 受信機先端 */}
            <circle cx="12" cy="-22" r="2.5" fill="#0F173E" />
            <path d="M12 -12 L12 -20" stroke="#0F173E" strokeWidth="1.5" />
          </g>

          {/* 下部の波（体調のゆらぎ） */}
          <path d="M10 52 Q 22 46, 34 52 T 58 52" fill="none" stroke="#0F173E" strokeWidth="2" strokeOpacity="0.1" />
        </svg>
      </div>

      {/* 2. タイポグラフィ部分：ビジネス仕様の2トーン */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "font-black tracking-tighter flex items-baseline",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[#0F173E]">未病</span>
          <span className="text-[#FBBF24]">レーダー</span>
        </div>
        
        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] text-slate-500 uppercase">
            <span className="text-[#0F173E]">Mibyo</span>
            <span className="ml-1">Radar</span>
            <span className="ml-2 text-slate-300">|</span>
            <span className="ml-2 text-slate-400">Personal Forecast</span>
          </p>
        )}
      </div>
    </div>
  );
}
