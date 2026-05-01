"use client";

import HeroGuideBot from "./HeroGuideBot";

function StatusChip({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "bg-[#fff0c9] text-[#a8751f] ring-1 ring-inset ring-[#efd898]"
      : tone === "danger"
        ? "bg-rose-100 text-rose-700"
        : "bg-[color-mix(in_srgb,var(--mint),white_4%)] text-[var(--accent-ink)] ring-1 ring-inset ring-[color:var(--ring)]";

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider", toneClass].join(" ")}>
      {label}
    </span>
  );
}

export default function HeroMiniCards({ compact = false }) {
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[color:var(--ring)] bg-white p-2 shadow-[0_24px_48px_-24px_rgba(49,115,100,0.18)]">
        <div className="relative h-[320px] overflow-hidden rounded-[26px] bg-[#fcfcf8] ring-1 ring-inset ring-[color:var(--ring)]">
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx="30" cy="250" r="180" fill="#e8f3ea" fillOpacity="0.94" />
            <circle cx="30" cy="250" r="100" fill="#e8f3ea" fillOpacity="0.7" />

            <circle cx="30" cy="250" r="72" fill="none" stroke="#c6d9ce" strokeWidth="1.5" strokeOpacity="0.74" />
            <circle cx="30" cy="250" r="112" fill="none" stroke="#c6d9ce" strokeWidth="1.5" strokeOpacity="0.52" />
            <circle cx="30" cy="250" r="152" fill="none" stroke="#c6d9ce" strokeWidth="1.5" strokeOpacity="0.35" />

            <path
              d="M30 98 A152 152 0 0 1 166 188"
              fill="none"
              stroke="#52a88e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.34"
            />
            <path
              d="M30 138 A112 112 0 0 1 128 206"
              fill="none"
              stroke="#f0b337"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.28"
            />
          </svg>

          <div className="absolute left-4 top-6 z-20 w-[190px] rounded-[22px] bg-white p-4 shadow-[0_14px_28px_-10px_rgba(49,115,100,0.12)] ring-1 ring-[color:var(--ring)] transition-all hover:shadow-[0_18px_34px_-10px_rgba(49,115,100,0.16)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#a7adb6]">あなたの体質</span>
              <StatusChip label="チーター型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black leading-tight text-slate-900">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-[#f7f8f6] px-2 py-1 text-[10px] font-bold text-[#7c8592] ring-1 ring-inset ring-[color:var(--ring)]">血虚</span>
              <span className="rounded-md bg-[#f7f8f6] px-2 py-1 text-[10px] font-bold text-[#7c8592] ring-1 ring-inset ring-[color:var(--ring)]">気滞</span>
            </div>
          </div>

          <div className="absolute right-4 top-[120px] z-10 w-[170px] rounded-[22px] bg-white p-4 shadow-[0_14px_28px_-10px_rgba(49,115,100,0.12)] ring-1 ring-[color:var(--ring)] transition-all hover:shadow-[0_18px_34px_-10px_rgba(49,115,100,0.16)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#a7adb6]">体調予報</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧上昇</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-[#7c8592]">
                崩れやすさ
                <br />
                <span className="text-xl font-black text-rose-600">6</span>{" "}
                <span className="text-[10px] text-[#c7cad1]">/ 10</span>
              </div>
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
      <div className="group relative overflow-hidden rounded-[30px] border border-[color:var(--ring)] bg-white p-5 shadow-[0_16px_32px_-12px_rgba(49,115,100,0.1)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(49,115,100,0.14)]">
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

      <div className="group relative overflow-hidden rounded-[30px] border border-[color:var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_34%)] p-5 shadow-[0_16px_32px_-12px_rgba(49,115,100,0.1)]">
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#77818e]">セルフケアガイド</div>
          <div className="mt-1 text-base font-black leading-tight text-slate-900">今日のうちに整えておく</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["ツボ", "食養生", "記録"].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-[#5a6472] shadow-sm ring-1 ring-[color:var(--ring)]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 h-12 w-full overflow-hidden rounded-xl bg-white/82 p-2 ring-1 ring-[color:var(--ring)]">
            <svg viewBox="0 0 200 40" className="h-full w-full">
              <path d="M0 20 C 30 10, 60 30, 90 20 S 150 10, 200 20" fill="none" stroke="#52a88e" strokeOpacity="0.46" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="90" cy="20" r="3" fill="#f0b337" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

