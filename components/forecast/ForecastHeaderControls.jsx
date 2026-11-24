"use client";

export default function ForecastHeaderControls({ tabs, activeDate, dateLabel, onSelect, onCare, careAvailable = false, dateSelectionDisabled = false }) {
  const active = tabs.find(item => item.date === activeDate);
  const dayLabel = active?.label || "今日";
  return (
    <div data-forecast-header-controls className="flex min-w-0 items-center gap-2">
      <div role="group" aria-label="予報の日付" className="flex shrink-0 rounded-full bg-[#E9F0EC] p-1 ring-1 ring-inset ring-[#DCE8DF]">
        {tabs.map(item => (
          <button key={item.date} type="button" aria-label={`${item.label}の予報`} aria-pressed={item.date === activeDate}
            onClick={() => onSelect(item.date)} disabled={dateSelectionDisabled}
            className={["min-h-9 min-w-11 rounded-full px-2.5 text-[12px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F816E]",
              item.date === activeDate ? "bg-white text-[#24564C] shadow-sm" : "text-slate-500 hover:text-[#24564C]"].join(" ")}>
            {item.label}
          </button>
        ))}
      </div>
      <time dateTime={activeDate} aria-live="polite" className="min-w-0 flex-1 whitespace-nowrap text-center text-[12px] font-bold tracking-tight text-slate-500">{dateLabel}</time>
      <button type="button" onClick={onCare} disabled={!careAvailable} aria-controls="daily-care-section"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-[#EAF7F1] px-2.5 text-[12px] font-black text-[#24564C] ring-1 ring-inset ring-[#CFE7DE] hover:bg-[#DCEFE7] disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F816E]">
        {dayLabel}のケア<span aria-hidden="true">↓</span>
      </button>
    </div>
  );
}
