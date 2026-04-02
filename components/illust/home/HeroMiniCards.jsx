"use client";

import HeroGuideBot from "./HeroGuideBot";

// ステータスチップ（枠線をなくし、柔らかい色味で洗練さを強調）
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
  // LP（ログイン前）などで使われるコンパクトな使用イメージ表示
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[var(--ring)] bg-white p-2 shadow-[0_22px_48px_-24px_rgba(77,111,85,0.25)]">
        <div className="relative h-[280px] overflow-hidden rounded-[26px] bg-[#fdfefc] ring-1 ring-inset ring-black/5">
          {/* 背景: 抽象的な円形グラデーション */}
          <svg viewBox="0 0 320 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
             <circle cx="280" cy="240" r="120" fill="#eef4eb" fillOpacity="0.7" />
             <circle cx="280" cy="240" r="70" fill="#eef4eb" fillOpacity="0.5" />
          </svg>

          {/* 1. 診断結果のイメージカード（短期集中型） */}
          <div className="absolute left-4 top-12 w-[190px] rounded-[22px] bg-white p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/5 z-20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis Result</span>
              <StatusChip label="短期集中型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black text-slate-900 leading-tight">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">血虚</span>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">気滞</span>
            </div>
          </div>

          {/* 2. 予報のイメージカード（気圧上昇） */}
          <div className="absolute right-4 top-[130px] w-[170px] rounded-[22px] bg-white/90 backdrop-blur-md p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/5 z-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forecast</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧上昇</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-slate-500">崩れやすさ<br /><span className="text-xl font-black text-rose-600">6</span> <span className="text-[10px] text-slate-300">/ 10</span></div>
              <div className="h-8 w-16 bg-rose-50 rounded-lg flex items-center justify-center">
                 <svg viewBox="0 0 40 20" className="w-10 h-5">
                    <path d="M0 15 Q 10 5, 20 12 T 40 5" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                 </svg>
              </div>
            </div>
          </div>

          {/* 3. キャラクター: ワクをなくし、カードに直接「溶け込んで座っている」ように配置 */}
          <div className="absolute right-[-4px] bottom-[-4px] scale-[0.72] origin-bottom-right z-30">
            <HeroGuideBot compact message="まずは体質チェックから！" />
          </div>

          {/* 装飾ラベル */}
          <div className="absolute left-6 bottom-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm ring-1 ring-black/5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 
              体質と気象の重なりを解析
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ログイン後のダッシュボード等で使われる標準グリッド版
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="group relative overflow-hidden rounded-[30px] border border-[var(--ring)] bg-white p-5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Personal Forecast</div>
          <div className="mt-1 text-base font-black text-slate-900 leading-tight">明日のあなたの体調予報</div>
          <div className="mt-8 flex items-end justify-between">
            <div className="text-[11px] font-bold text-slate-400">目安スコア<br /><span className="text-2xl font-black text-slate-900 tracking-tighter">4</span> <span className="text-xs font-bold text-slate-300">/ 10</span></div>
            <StatusChip label="注意" tone="warn" />
          </div>
        </div>
        {/* 背景に薄くキャラを配置してブランド感を出す */}
        <div className="absolute right-[-20px] bottom-[-20px] scale-[0.6] opacity-10 group-hover:opacity-20 transition-opacity">
            <HeroGuideBot compact showBubble={false} />
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-[30px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.08)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500/60">Self Care Guide</div>
          <div className="mt-1 text-base font-black text-slate-900 leading-tight">今日のうちに整えておく</div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {["ツボ", "食養生", "記録"].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-black/5">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 h-12 w-full rounded-xl bg-white/40 p-2 ring-1 ring-white/50 overflow-hidden">
            <svg viewBox="0 0 200 40" className="h-full w-full">
              <path d="M0 20 C 30 10, 60 30, 90 20 S 150 10, 200 20" fill="none" stroke="#6a9770" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="90" cy="20" r="3" fill="#d9a54a" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
