"use client";

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

export default function HeroMiniCards() {
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
        <div className="mt-4 h-24 overflow-hidden rounded-[18px] bg-white/80 ring-1 ring-[var(--ring)]">
          <svg viewBox="0 0 260 96" className="h-full w-full" aria-hidden="true">
            <path d="M24 70c14-17 28-26 46-26 19 0 28 8 42 8 15 0 25-10 38-10 14 0 26 8 42 8 12 0 25-6 43-18" fill="none" stroke="#6a9770" strokeWidth="3" strokeLinecap="round" />
            <circle cx="72" cy="44" r="6" fill="#6a9770" fillOpacity="0.2" />
            <circle cx="145" cy="42" r="6" fill="#6a9770" fillOpacity="0.2" />
            <circle cx="214" cy="32" r="6" fill="#6a9770" fillOpacity="0.2" />
            <path d="M86 22a20 20 0 0 1 20 20" fill="none" stroke="#6a9770" strokeOpacity="0.25" strokeWidth="2.4" />
            <path d="M132 18a16 16 0 0 1 16 16" fill="none" stroke="#6a9770" strokeOpacity="0.28" strokeWidth="2.4" />
            <path d="M192 20a14 14 0 0 1 14 14" fill="none" stroke="#6a9770" strokeOpacity="0.28" strokeWidth="2.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
