"use client";

import HeroGuideBot from "./HeroGuideBot";

function StatusChip({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={["inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-extrabold", toneClass].join(" ")}>
      {label}
    </span>
  );
}

export default function HeroMiniCards({ compact = false }) {
  if (compact) {
    return (
      <div className="rounded-[24px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_58%)] p-4 shadow-[0_16px_36px_-28px_rgba(0,0,0,0.26)]">
        <div className="relative h-[248px] overflow-hidden rounded-[18px] bg-white/72 ring-1 ring-[var(--ring)]">
          <svg viewBox="0 0 320 248" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="compactRadarBg2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f2f6f0" />
                <stop offset="1" stopColor="#e3ece1" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="320" height="248" fill="url(#compactRadarBg2)" />
            <circle cx="118" cy="152" r="82" fill="none" stroke="#7ea284" strokeOpacity="0.22" strokeWidth="3" />
            <circle cx="118" cy="152" r="56" fill="none" stroke="#7ea284" strokeOpacity="0.34" strokeWidth="3" />
            <path d="M118 152L178 106" stroke="#6a9770" strokeWidth="4" strokeLinecap="round" />
            <path d="M52 178c18-24 42-36 72-36 32 0 51 8 74 8" fill="none" stroke="#6a9770" strokeOpacity="0.65" strokeWidth="4" strokeLinecap="round" />
            <circle cx="118" cy="152" r="6" fill="#6a9770" />
            <path d="M196 48a15 15 0 0 1 15 15" fill="none" stroke="#7ea284" strokeOpacity="0.45" strokeWidth="2.4" />
            <path d="M205 39a26 26 0 0 1 26 26" fill="none" stroke="#7ea284" strokeOpacity="0.24" strokeWidth="2.4" />
            <circle cx="196" cy="48" r="5" fill="#d9a54a" fillOpacity="0.84" />
          </svg>

          <div className="absolute left-3 right-3 top-4 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ring)] bg-white px-4 py-2 text-[12px] font-extrabold text-slate-600 shadow-sm">
              未病レーダーの使用イメージ
            </div>
          </div>

          <div className="absolute left-4 top-[56px] w-[198px] rounded-[20px] border border-[var(--ring)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-slate-500">明日の崩れやすさ</div>
                <div className="mt-1 text-[14px] font-extrabold text-slate-900">あなた専用の体調予報</div>
              </div>
              <StatusChip label="注意" tone="warn" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500">気になりやすい症状</div>
                <div className="mt-1 text-[14px] font-extrabold text-slate-900">頭痛・重だるさ</div>
              </div>
              <div className="rounded-2xl bg-[color-mix(in_srgb,var(--mint),white_35%)] px-3 py-2 text-right">
                <div className="text-[10px] font-extrabold text-slate-500">目安スコア</div>
                <div className="text-base font-black tracking-tight text-slate-900">4 / 10</div>
              </div>
            </div>
          </div>

          <div className="absolute right-4 bottom-4 w-[188px] rounded-[20px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_64%)] p-4 shadow-sm">
            <div className="text-[11px] font-extrabold text-slate-500">先回りケア</div>
            <div className="mt-1 text-[14px] font-extrabold text-slate-900">今日のうちに整えておく</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">ツボ</span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">食養生</span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">記録</span>
            </div>
          </div>

          <div className="absolute left-4 bottom-6 rounded-full border border-[var(--ring)] bg-white px-3 py-1 text-[11px] font-extrabold text-slate-600 shadow-sm">
            体質と気象の重なり
          </div>
          <div className="absolute left-4 bottom-17 rounded-full border border-[var(--ring)] bg-white px-3 py-1 text-[11px] font-extrabold text-slate-600 shadow-sm">
            気圧
          </div>
          <div className="absolute right-[86px] top-[128px] rounded-full border border-[var(--ring)] bg-white px-3 py-1 text-[11px] font-extrabold text-slate-600 shadow-sm">
            明日の注意点
          </div>

          <div className="absolute right-4 bottom-2">
            <HeroGuideBot compact message="まずは体質チェックから見てみよう。" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[22px] border border-[var(--ring)] bg-white p-4 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-extrabold text-slate-500">明日の崩れやすさ</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">あなた専用の体調予報</div>
          </div>
          <StatusChip label="注意" tone="warn" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500">気になりやすい症状</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">頭痛・重だるさ</div>
          </div>
          <div className="rounded-2xl bg-[color-mix(in_srgb,var(--mint),white_35%)] px-3 py-2 text-right">
            <div className="text-[10px] font-extrabold text-slate-500">目安スコア</div>
            <div className="text-base font-black tracking-tight text-slate-900">4 / 10</div>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[var(--ring)] bg-[color-mix(in_srgb,var(--mint),white_52%)] p-4 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.22)]">
        <div className="text-[11px] font-extrabold text-slate-500">先回りケア</div>
        <div className="mt-1 text-sm font-extrabold text-slate-900">今日のうちに整えておく</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">ツボ</span>
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">食養生</span>
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">記録</span>
        </div>
        <div className="mt-4 rounded-[18px] bg-white/80 p-3 ring-1 ring-[var(--ring)]">
          <svg viewBox="0 0 260 96" className="h-full w-full" aria-hidden="true">
            <path d="M20 68c14-17 30-28 50-28 18 0 32 8 44 8 14 0 25-9 40-9 16 0 29 8 44 8 13 0 27-6 42-17" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
            <circle cx="68" cy="40" r="6" fill="#6a9770" fillOpacity="0.2" />
            <circle cx="141" cy="39" r="6" fill="#6a9770" fillOpacity="0.2" />
            <circle cx="214" cy="30" r="6" fill="#6a9770" fillOpacity="0.2" />
            <path d="M83 18a18 18 0 0 1 18 18" fill="none" stroke="#6a9770" strokeOpacity="0.24" strokeWidth="2.4" />
            <path d="M132 14a16 16 0 0 1 16 16" fill="none" stroke="#6a9770" strokeOpacity="0.24" strokeWidth="2.4" />
            <path d="M195 17a14 14 0 0 1 14 14" fill="none" stroke="#6a9770" strokeOpacity="0.22" strokeWidth="2.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
