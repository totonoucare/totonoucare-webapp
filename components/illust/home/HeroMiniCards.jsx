function ToneBadge({ children, tone = "warn" }) {
  const tones = {
    stable: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    alert: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function HeroRiskCard() {
  return (
    <div className="rounded-[22px] bg-white/96 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.08em] text-slate-500">明日の崩れやすさ</div>
          <div className="mt-1 text-[15px] font-extrabold text-slate-900">湿度と気圧の重なりに注意</div>
        </div>
        <ToneBadge tone="warn">注意</ToneBadge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-slate-500">崩れやすさの目安</div>
          <div className="mt-0.5 text-[22px] font-extrabold leading-none text-slate-900">4 / 10</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-500">気になりやすい症状</div>
          <div className="mt-0.5 text-[12px] font-extrabold text-slate-800">頭痛・重だるさ</div>
        </div>
      </div>
    </div>
  );
}

export function HeroCareCard() {
  return (
    <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_58%)] px-4 py-3 shadow-[0_14px_34px_rgba(106,151,112,0.14)] ring-1 ring-[var(--ring)]">
      <div className="text-[10px] font-extrabold tracking-[0.08em] text-[var(--accent-ink)]/72">先回りケア</div>
      <div className="mt-1 text-[13px] font-extrabold text-slate-900">ツボ・食養生・過ごし方まで見られる</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">ツボ</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">食養生</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 ring-1 ring-[var(--ring)]">過ごし方</span>
      </div>
    </div>
  );
}
