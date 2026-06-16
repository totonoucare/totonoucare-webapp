"use client";

import HeroGuideBot from "./HeroGuideBot";

function StatusChip({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "bg-[var(--gold-soft)] text-[#9f6f1f] ring-1 ring-inset ring-[#e8d495] shadow-[0_4px_10px_-8px_rgba(128,93,27,0.25)]"
      : tone === "danger"
        ? "bg-rose-100 text-rose-700"
        : "bg-[color-mix(in_srgb,var(--mint),white_8%)] text-[var(--accent-ink)] ring-1 ring-inset ring-[color:var(--ring)] shadow-[0_4px_10px_-8px_rgba(40,55,48,0.18)]";

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider", toneClass].join(" ")}>
      {label}
    </span>
  );
}

export default function HeroMiniCards({ compact = false }) {
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[color:var(--ring)] bg-white p-2 shadow-[0_26px_56px_-26px_rgba(40,55,48,0.22)]">
        <div className="relative h-[320px] overflow-hidden rounded-[26px] bg-[#fcfcf8] ring-1 ring-inset ring-[color:var(--ring)]">
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx="30" cy="250" r="180" fill="#EAF5EF" fillOpacity="0.97" />
            <circle cx="30" cy="250" r="102" fill="#EAF5EF" fillOpacity="0.77" />

            <circle cx="30" cy="250" r="72" fill="none" stroke="#c7d8d0" strokeWidth="1.6" strokeOpacity="0.82" />
            <circle cx="30" cy="250" r="112" fill="none" stroke="#c7d8d0" strokeWidth="1.5" strokeOpacity="0.58" />
            <circle cx="30" cy="250" r="152" fill="none" stroke="#c7d8d0" strokeWidth="1.5" strokeOpacity="0.36" />

            <path
              d="M30 96 A154 154 0 0 1 170 190"
              fill="none"
              stroke="#3BA58B"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.38"
            />
            <path
              d="M30 138 A112 112 0 0 1 128 206"
              fill="none"
              stroke="#F9B02D"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeOpacity="0.3"
            />
          </svg>

          <div className="absolute left-4 top-6 z-20 w-[190px] rounded-[22px] bg-white p-4 shadow-[0_16px_30px_-12px_rgba(40,55,48,0.16)] ring-1 ring-[color:var(--ring)] transition-all hover:shadow-[0_20px_36px_-12px_rgba(40,55,48,0.2)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9ea6b0]">あなたの体質</span>
              <StatusChip label="チーター型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black leading-tight text-slate-900">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-[#f8f8f5] px-2 py-1 text-[10px] font-bold text-[#76808d] ring-1 ring-inset ring-[color:var(--ring)]">血虚</span>
              <span className="rounded-md bg-[#f8f8f5] px-2 py-1 text-[10px] font-bold text-[#76808d] ring-1 ring-inset ring-[color:var(--ring)]">気滞</span>
            </div>
          </div>

          <div className="absolute right-4 top-[120px] z-10 w-[170px] rounded-[22px] bg-white p-4 shadow-[0_16px_30px_-12px_rgba(40,55,48,0.16)] ring-1 ring-[color:var(--ring)] transition-all hover:shadow-[0_20px_36px_-12px_rgba(40,55,48,0.2)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#9ea6b0]">体調予報</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧上昇</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-[#76808d]">
                崩れやすさ
                <br />
                <span className="text-xl font-black text-rose-600">6</span>{" "}
                <span className="text-[10px] text-[#c4c8cf]">/ 10</span>
              </div>
              <div className="flex h-8 w-16 items-center justify-center rounded-lg bg-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
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
      <div className="group relative overflow-hidden rounded-[30px] border border-[color:var(--ring)] bg-white p-5 shadow-[0_18px_34px_-14px_rgba(40,55,48,0.12)] transition-all hover:shadow-[0_22px_42px_-14px_rgba(40,55,48,0.16)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#98a1ae]">体調予報サマリー</div>
          <div className="mt-1 text-base font-black leading-tight text-slate-900">明日のあなたの体調予報</div>
          <div className="mt-8 flex items-end justify-between">
            <div className="text-[11px] font-bold text-[#98a1ae]">
              目安スコア
              <br />
              <span className="tracking-tighter text-2xl font-black text-slate-900">4</span>{" "}
              <span className="text-xs font-bold text-[#c7cad1]">/ 10</span>
            </div>
            <StatusChip label="注意" tone="warn" />
          </div>
        </div>
        <div className="absolute bottom-[-20px] right-[-20px] scale-[0.6] opacity-15 transition-opacity group-hover:opacity-25">
          <HeroGuideBot compact showBubble={false} />
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-[30px] border border-[color:var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_28%)] p-5 shadow-[0_18px_34px_-14px_rgba(40,55,48,0.12)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#77818e]">セルフケアガイド</div>
          <div className="mt-1 text-base font-black leading-tight text-slate-900">今日のうちに整えておく</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["ツボ", "食養生", "記録"].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-[#586372] shadow-[0_8px_16px_-12px_rgba(40,55,48,0.18)] ring-1 ring-[color:var(--ring)]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 h-12 w-full overflow-hidden rounded-xl bg-white/88 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-[color:var(--ring)]">
            <svg viewBox="0 0 200 40" className="h-full w-full">
              <path d="M0 20 C 30 10, 60 30, 90 20 S 150 10, 200 20" fill="none" stroke="#3BA58B" strokeOpacity="0.52" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="90" cy="20" r="3" fill="#F9B02D" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
