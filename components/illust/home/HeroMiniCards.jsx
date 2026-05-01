"use client";

import HeroGuideBot from "./HeroGuideBot";

function StatusChip({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "bg-[var(--gold-soft)] text-amber-700 ring-1 ring-inset ring-amber-200/70"
      : tone === "danger"
        ? "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200/70"
        : "bg-[color-mix(in_srgb,var(--mint),white_18%)] text-[var(--accent-ink)] ring-1 ring-inset ring-[var(--ring)]";

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider", toneClass].join(" ")}>
      {label}
    </span>
  );
}

export default function HeroMiniCards({ compact = false }) {
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[var(--ring)] bg-[var(--panel)] p-2 shadow-[0_22px_48px_-24px_rgba(var(--accent-ink-rgb),0.25)]">
        <div className="relative h-[320px] overflow-hidden rounded-[26px] bg-[var(--surface-soft)] ring-1 ring-inset ring-[var(--ring)]">
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {/* やわらかい面 */}
            <circle cx="30" cy="250" r="180" fill="var(--mint)" fillOpacity="0.36" />
            <circle cx="30" cy="250" r="100" fill="var(--mint)" fillOpacity="0.22" />

            {/* 波紋リング */}
            <circle cx="30" cy="250" r="72" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.18" />
            <circle cx="30" cy="250" r="112" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.13" />
            <circle cx="30" cy="250" r="152" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.08" />

            {/* レーダーっぽい弧 */}
            <path
              d="M30 98 A152 152 0 0 1 166 188"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.22"
            />
            <path
              d="M30 138 A112 112 0 0 1 128 206"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.2"
            />
          </svg>

          <div className="absolute left-4 top-6 z-20 w-[190px] rounded-[22px] bg-[var(--surface)] p-4 shadow-[0_12px_32px_-8px_rgba(var(--accent-ink-rgb),0.14)] ring-1 ring-[var(--ring)] transition-all hover:shadow-[0_16px_40px_-8px_rgba(var(--accent-ink-rgb),0.16)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">あなたの体質</span>
              <StatusChip label="チーター型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black leading-tight text-slate-900">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">血虚</span>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">気滞</span>
            </div>
          </div>

          <div className="absolute right-4 top-[120px] z-10 w-[170px] rounded-[22px] bg-white/90 p-4 shadow-[0_12px_32px_-8px_rgba(var(--accent-ink-rgb),0.14)] ring-1 ring-[var(--ring)] backdrop-blur-md transition-all hover:shadow-[0_16px_40px_-8px_rgba(var(--accent-ink-rgb),0.16)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">体調予報</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧上昇</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-slate-500">崩れやすさ<br /><span className="text-xl font-black text-rose-600">6</span> <span className="text-[10px] text-slate-300">/ 10</span></div>
              <div className="flex h-8 w-16 items-center justify-center rounded-lg bg-rose-50">
                <svg viewBox="0 0 40 20" className="h-5 w-10">
                  <path d="M0 15 Q 10 5, 20 12 T 40 5" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="absolute bottom-[-4px] left-[0px] z-30 origin-bottom-left scale-[0.95] transition-transform hover:scale-[0.95]">
            <HeroGuideBot compact message="まずは体質チェックから！" bubbleSide="right" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="group relative overflow-hidden rounded-[30px] border border-[var(--ring)] bg-[var(--panel)] p-5 shadow-[0_16px_32px_-12px_rgba(var(--accent-ink-rgb),0.12)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(var(--accent-ink-rgb),0.14)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">体調予報サマリー</div>
          <div className="mt-1 text-base font-black leading-tight text-slate-900">明日のあなたの体調予報</div>
          <div className="mt-8 flex items-end justify-between">
            <div className="text-[11px] font-bold text-slate-400">目安スコア<br /><span className="text-2xl font-black tracking-tighter text-slate-900">4</span> <span className="text-xs font-bold text-slate-300">/ 10</span></div>
            <StatusChip label="注意" tone="warn" />
          </div>
        </div>
        <div className="absolute bottom-[-20px] right-[-20px] scale-[0.6] opacity-10 transition-opacity group-hover:opacity-20">
          <HeroGuideBot compact showBubble={false} />
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-[30px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_64%)] p-5 shadow-[0_16px_32px_-12px_rgba(var(--accent-ink-rgb),0.12)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500/60">セルフケアガイド</div>
          <div className="mt-1 text-base font-black leading-tight text-slate-900">今日のうちに整えておく</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["ツボ", "食養生", "記録"].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-[var(--ring)]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 h-12 w-full overflow-hidden rounded-xl bg-white/45 p-2 ring-1 ring-white/60">
            <svg viewBox="0 0 200 40" className="h-full w-full">
              <path d="M0 20 C 30 10, 60 30, 90 20 S 150 10, 200 20" fill="none" stroke="var(--accent)" strokeOpacity="0.32" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="90" cy="20" r="3" fill="var(--gold)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

