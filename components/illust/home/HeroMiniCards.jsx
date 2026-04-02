"use client";

import HeroGuideBot from "./HeroGuideBot";

// ステータスチップ（洗練版: 枠線をなくし、背景色と文字色のコントラストで表現）
function StatusChip({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "bg-amber-100 text-amber-700"
      : tone === "danger"
        ? "bg-rose-100 text-rose-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider", toneClass].join(" ")}>
      {label}
    </span>
  );
}

export default function HeroMiniCards({ compact = false }) {
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[var(--ring)] bg-white p-2 shadow-[0_22px_48px_-24px_rgba(77,111,85,0.25)]">
        <div className="relative h-[280px] overflow-hidden rounded-[26px] bg-[#f8faf7] ring-1 ring-inset ring-black/5">
          {/* 背景: 洗練されたレーダー波紋エフェクト */}
          <svg viewBox="0 0 320 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <radialGradient id="radarGlowCompact" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#eef4eb" stopOpacity="1" />
              </radialGradient>
            </defs>
            <rect width="320" height="280" fill="url(#radarGlowCompact)" />
            <circle cx="110" cy="170" r="90" fill="none" stroke="#6a9770" strokeOpacity="0.08" strokeWidth="1" />
            <circle cx="110" cy="170" r="60" fill="none" stroke="#6a9770" strokeOpacity="0.12" strokeWidth="1" />
            <path d="M110 170 L185 110" stroke="#6a9770" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
            <circle cx="110" cy="170" r="4" fill="#6a9770" fillOpacity="0.4" />
          </svg>

          {/* 浮遊する診断結果カード（短期集中型） */}
          <div className="absolute left-4 top-14 w-[190px] rounded-[22px] bg-white p-4 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] ring-1 ring-black/5 z-20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Type</span>
              <StatusChip label="短期集中型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black text-slate-900">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">血虚</span>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">気滞</span>
            </div>
          </div>

          {/* 浮遊する予報カード（気圧低下） */}
          <div className="absolute right-4 bottom-14 w-[170px] rounded-[22px] bg-white/90 backdrop-blur-md p-4 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] ring-1 ring-black/5 z-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forecast</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧低下</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-slate-500">崩れやすさ<br /><span className="text-lg font-black text-rose-600">6</span> <span className="text-[10px]">/ 10</span></div>
              <div className="h-8 w-16 bg-rose-50 rounded-lg flex items-center justify-center">
                 <svg viewBox="0 0 40 20" className="w-10 h-5">
                    <path d="M0 15 Q 10 5, 20 12 T 40 5" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                 </svg>
              </div>
            </div>
          </div>

          {/* ラベル類 */}
          <div className="absolute left-6 bottom-8 flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-[10px] font-black text-slate-600 shadow-sm ring-1 ring-black/5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 
              東洋医学のパーソナライズ
            </div>
          </div>

          <div className="absolute right-4 bottom-4 scale-[0.65] origin-bottom-right">
            <HeroGuideBot compact message="体質に合わせた予報をお届けします。" />
          </div>
        </div>
      </div>
    );
  }

  // 標準グリッド版
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* 予報イメージ */}
      <div className="group relative rounded-[28px] border border-[var(--ring)] bg-white p-5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Daily Forecast</div>
            <div className="mt-1 text-base font-black text-slate-900">あなた専用の体調予報</div>
          </div>
          <StatusChip label="注意" tone="warn" />
        </div>
        
        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">気になりやすい症状</div>
            <div className="mt-1 text-sm font-black text-slate-900">頭痛・首まわりの重さ</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400">目安スコア</div>
            <div className="text-2xl font-black tracking-tighter text-slate-900 leading-none mt-1">4<span className="text-xs font-bold text-slate-300 ml-1">/ 10</span></div>
          </div>
        </div>
      </div>

      {/* ケアイメージ */}
      <div className="group relative rounded-[28px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_65%)] p-5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.08)]">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500/60">Self Care</div>
        <div className="mt-1 text-base font-black text-slate-900">今日のうちに整える</div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {["ツボ", "食養生", "記録"].map((tag) => (
            <span key={tag} className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-black/5">
              {tag}
            </span>
          ))}
        </div>

        {/* 抽象化された「氣」の巡りグラフ */}
        <div className="mt-6 h-16 w-full rounded-2xl bg-white/40 p-2 overflow-hidden ring-1 ring-white/50">
          <svg viewBox="0 0 200 40" className="h-full w-full">
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6a9770" stopOpacity="0" />
                <stop offset="50%" stopColor="#6a9770" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 20 C 20 10, 40 30, 60 20 S 100 10, 120 20 S 160 30, 200 20" fill="none" stroke="url(#waveGrad)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="15" r="3" fill="#d9a54a" className="animate-pulse" />
          </svg>
        </div>
      </div>
    </div>
  );
}
