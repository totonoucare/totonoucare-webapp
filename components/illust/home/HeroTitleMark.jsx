"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* 1. アイコン部分：キャラ感を排除した精密アンテナ */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_8px_20px_-4px_rgba(15,23,62,0.15)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[10px]" : "h-14 w-14 rounded-[16px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="signalGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* 背景のグリッド（精密機器のレティクル感を出す） */}
          <path d="M32 8 L32 56 M8 32 L56 32" stroke="#f0f0f0" strokeWidth="1" />
          <circle cx="32" cy="32" r="20" fill="none" stroke="#f0f0f0" strokeWidth="1" />

          {/* 信号波：右上にオフセットして「顔」に見えるのを防止 */}
          <g opacity="0.8">
            <path d="M48 12 A 28 28 0 0 1 60 28" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 8 A 36 36 0 0 1 60 20" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </g>

          {/* パラボラアンテナ：厚みを抑え、エッジを鋭く（ネイビー） */}
          <g transform="translate(12, 50) rotate(-35)">
            {/* 支柱 */}
            <rect x="11" y="-8" width="2" height="10" fill="#0F173E" rx="1" />
            {/* アンテナ本体（シャープな半円に変更） */}
            <path d="M0 -14 A 12 6 0 0 0 24 -14" fill="none" stroke="#0F173E" strokeWidth="4" strokeLinecap="round" />
            {/* 受信コア */}
            <path d="M12 -12 L12 -22" stroke="#0F173E" strokeWidth="1.5" />
            <circle cx="12" cy="-24" r="2.5" fill="#FBBF24" />
          </g>
          
          {/* 未病のゆらぎ（下部のライン） */}
          <path d="M4 56 Q 32 48, 60 56" fill="none" stroke="#0F173E" strokeWidth="1.5" strokeOpacity="0.1" />
        </svg>
      </div>

      {/* 2. タイポグラフィ部分：未病（重厚）× レーダー（警告） */}
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
          <p className="mt-1 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            <span className="text-[#0F173E]">Mibyo</span>
            <span className="mx-1">×</span>
            <span className="text-[#FBBF24]">Weather Intelligence</span>
          </p>
        )}
      </div>
    </div>
  );
}
