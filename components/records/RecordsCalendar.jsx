"use client";

import {
  RECORD_DOMAIN_OPTIONS,
  conditionSymbol,
  inferCareDomains,
  signalTone,
} from "@/lib/records/analysis";

function monthParts(value) {
  const [year, month] = String(value || "").split("-").map(Number);
  return { year, month };
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function moveMonth(value, delta) {
  const { year, month } = monthParts(value);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function RecordsCalendar({
  month,
  rows = [],
  today,
  selectedDate,
  loading = false,
  onMonthChange,
  onSelectDate,
}) {
  const { year, month: monthNumber } = monthParts(month);
  const map = new Map(rows.map((row) => [row.date, row]));
  const blanks = firstWeekday(year, monthNumber);
  const dayCount = daysInMonth(year, monthNumber);
  const cells = [
    ...Array.from({ length: blanks }, (_, index) => ({ key: `blank-${index}`, blank: true })),
    ...Array.from({ length: dayCount }, (_, index) => {
      const date = ymd(year, monthNumber, index + 1);
      return { key: date, date, day: index + 1, row: map.get(date) || null };
    }),
  ];
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, blank: true });
  }

  return (
    <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange?.(moveMonth(month, -1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#F7FAF8] text-slate-500 ring-1 ring-[#DCE8DD]"
          aria-label="前の月"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-[11px] font-black tracking-[0.14em] text-slate-400">RECORD CALENDAR</div>
          <div className="mt-1 text-[17px] font-black text-slate-900">{year}年{monthNumber}月</div>
        </div>
        <button
          type="button"
          onClick={() => onMonthChange?.(moveMonth(month, 1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#F7FAF8] text-slate-500 ring-1 ring-[#DCE8DD]"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
        {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => (
          <div key={weekday} className="py-1">{weekday}</div>
        ))}
      </div>

      <div className={["mt-1 grid grid-cols-7 gap-1.5 transition-opacity", loading ? "opacity-55" : "opacity-100"].join(" ")}>
        {cells.map((cell) => {
          if (cell.blank) return <div key={cell.key} className="aspect-[0.78]" />;

          const row = cell.row;
          const tone = signalTone(row?.forecast?.signal);
          const domains = inferCareDomains(row?.review?.action_tags);
          const isToday = cell.date === today;
          const selected = cell.date === selectedDate;
          const future = cell.date > today;
          const hasReview = row?.review?.condition_level != null;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={future}
              onClick={() => !future && onSelectDate?.(cell.date, row)}
              className={[
                "relative aspect-[0.78] overflow-hidden rounded-[13px] bg-[#FBFCFB] px-1 py-1.5 text-left ring-1 transition-all",
                selected
                  ? "ring-[#66B9A3] shadow-[0_10px_22px_-16px_rgba(47,129,110,0.46)]"
                  : isToday
                    ? "ring-[#CFE7DE]"
                    : "ring-[#E8EFEB]",
                future ? "cursor-default opacity-35" : "hover:-translate-y-0.5",
              ].join(" ")}
            >
              {row?.forecast ? (
                <span className={["absolute inset-x-0 top-0 h-1", tone.surface].join(" ")} style={{ backgroundColor: tone.hex }} />
              ) : null}
              <div className={["text-[11px] font-black", isToday ? "text-[#2F816E]" : "text-slate-600"].join(" ")}>
                {cell.day}
              </div>

              <div className="mt-1 text-center text-[17px] font-black leading-none text-slate-700">
                {hasReview ? conditionSymbol(row.review.condition_level) : ""}
              </div>

              <div className="absolute inset-x-1 bottom-1.5 flex justify-center gap-1">
                {domains.slice(0, 3).map((domain) => {
                  const meta = RECORD_DOMAIN_OPTIONS.find((item) => item.value === domain);
                  return (
                    <span
                      key={domain}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: meta?.color || "#CBD5E1" }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[18px] bg-[#F7FAF8] px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#E8F0EB]">
        上の細い色は予報、○△×は実際の体調、下の色点は暮らす・食べる・ほぐすの記録です。
      </div>
    </section>
  );
}
