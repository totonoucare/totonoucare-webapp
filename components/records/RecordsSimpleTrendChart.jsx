"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCompactChartPoints,
  careTimingLabel,
  signalLabel,
} from "@/lib/records/analysis";

const ACTUAL_META = {
  0: { symbol: "○", label: "よかった", text: "text-[#2F816E]", ring: "ring-[#9FCFBE]", surface: "bg-[#EFF8F4]" },
  1: { symbol: "△", label: "少しつらかった", text: "text-[#A56C18]", ring: "ring-[#E2AE45]", surface: "bg-[#FFF8EC]" },
  2: { symbol: "×", label: "つらかった", text: "text-[#B75C3E]", ring: "ring-[#E1A993]", surface: "bg-[#FFF0EC]" },
};

function shortDate(value) {
  const [, month, day] = String(value || "").split("-").map(Number);
  return month ? `${month}/${day}` : value || "";
}

function displayScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function actualCountsText(point) {
  const counts = point?.actual_counts || {};
  const parts = [];
  if (counts.good) parts.push(`○${counts.good}日`);
  if (counts.mild) parts.push(`△${counts.mild}日`);
  if (counts.hard) parts.push(`×${counts.hard}日`);
  return parts.length ? parts.join("・") : "実感は未記録";
}

function timingShort(point) {
  if (!point?.care_count) return "—";
  const prefix = point.care_timing === "before_peak"
    ? "先"
    : point.care_timing === "after_symptom"
      ? "後"
      : "ケア";
  return point.is_aggregate ? `${prefix}${point.care_count}` : prefix;
}

export default function RecordsSimpleTrendChart({ rows = [], periodDays = 30, onSelectDate }) {
  const points = useMemo(() => buildCompactChartPoints(rows, periodDays), [rows, periodDays]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(Math.max(0, points.length - 1));
  }, [periodDays, points.length]);

  if (!points.length) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-6 text-center text-[14px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        この期間の予報や記録はまだありません。
      </div>
    );
  }

  const selected = points[Math.min(selectedIndex, points.length - 1)] || points[0];
  const columns = `64px repeat(${points.length}, minmax(0, 1fr))`;
  const rangeLabel = selected.date === selected.end_date
    ? shortDate(selected.date)
    : `${shortDate(selected.date)}〜${shortDate(selected.end_date)}`;
  const selectedActual = ACTUAL_META[selected.actual_severity];

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="border-b border-[#EEF3EF] px-4 py-3">
        <div className="text-[14px] font-black text-slate-900">予報・実感・ケアを同じ日で見る</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">棒が予報、○△×が実際の体調です。日付を押すと、その日の内容を文章で確認できます。</div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="grid gap-x-1.5 sm:gap-x-2" style={{ gridTemplateColumns: columns }}>
          <div className="grid h-[180px] grid-rows-3 text-[11px] font-black leading-4 text-slate-500">
            <div className="flex flex-col justify-center border-b border-[#E9E1DD]"><span className="text-[#B75C3E]">守り</span><span className="text-slate-400">70–100</span></div>
            <div className="flex flex-col justify-center border-b border-[#EEE7D9]"><span className="text-[#A56C18]">いたわり</span><span className="text-slate-400">40–69</span></div>
            <div className="flex flex-col justify-center"><span className="text-[#2F816E]">安定</span><span className="text-slate-400">0–39</span></div>
          </div>

          <div className="relative col-span-full col-start-2 row-start-1 h-[180px] overflow-hidden rounded-[18px] ring-1 ring-[#DCE8DD]">
            <div className="absolute inset-x-0 top-0 h-[30%] border-b border-[#E9E1DD] bg-[#FDEBE5]/80" />
            <div className="absolute inset-x-0 top-[30%] h-[30%] border-b border-[#EEE7D9] bg-[#FFF4DE]/80" />
            <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[#EAF7F1]/80" />
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
              {points.map((point, index) => {
                const score = Number.isFinite(Number(point.forecast)) ? Math.max(0, Math.min(100, Number(point.forecast))) : 0;
                const active = selectedIndex === index;
                return (
                  <button
                    key={`${point.date}-${point.end_date}`}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${point.label}、体調警戒度${displayScore(point.forecast)}`}
                    onClick={() => setSelectedIndex(index)}
                    className={[
                      "relative h-full border-r border-white/60 last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#349B83]",
                      active ? "bg-white/20 ring-2 ring-inset ring-[#349B83]" : "",
                    ].join(" ")}
                  >
                    {point.forecast != null ? (
                      <>
                        <span
                          className="absolute left-1/2 z-10 -translate-x-1/2 text-[11px] font-black text-[#246F5E]"
                          style={{ bottom: `${Math.min(91, score + 3)}%` }}
                        >
                          {displayScore(point.forecast)}
                        </span>
                        <span
                          className="absolute bottom-0 left-1/2 w-[44%] max-w-[26px] -translate-x-1/2 rounded-t-[8px] bg-[#349B83]/80"
                          style={{ height: `${Math.max(2, score)}%` }}
                        />
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 grid gap-x-1.5 text-center text-[10px] font-black text-slate-400 sm:gap-x-2 sm:text-[11px]" style={{ gridTemplateColumns: columns }}>
          <span />
          {points.map((point) => <span key={`date-${point.date}-${point.end_date}`}>{point.label}</span>)}
        </div>

        <div className="mt-2 grid min-h-[54px] items-center gap-x-1.5 border-t border-[#EEF3EF] sm:gap-x-2" style={{ gridTemplateColumns: columns }}>
          <span className="text-[11px] font-black text-slate-500">実感</span>
          {points.map((point) => {
            const meta = ACTUAL_META[point.actual_severity];
            return meta ? (
              <span key={`actual-${point.date}-${point.end_date}`} className="text-center">
                <span className={[
                  "inline-grid h-8 min-w-8 place-items-center rounded-full px-1 text-[15px] font-black ring-1",
                  meta.surface,
                  meta.text,
                  meta.ring,
                ].join(" ")}>{meta.symbol}{point.is_aggregate && point.recorded_count > 1 ? point.recorded_count : ""}</span>
              </span>
            ) : <span key={`actual-${point.date}-${point.end_date}`} className="text-center text-[12px] font-black text-slate-300">—</span>;
          })}
        </div>

        <div className="grid min-h-[50px] items-center gap-x-1.5 border-t border-[#EEF3EF] sm:gap-x-2" style={{ gridTemplateColumns: columns }}>
          <span className="text-[11px] font-black text-slate-500">ケア</span>
          {points.map((point) => (
            <span key={`care-${point.date}-${point.end_date}`} className="text-center">
              <span className={[
                "inline-flex min-h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-black",
                point.care_count ? "bg-[#EFF8F4] text-[#2F816E] ring-1 ring-[#CFE7DE]" : "text-slate-300",
              ].join(" ")}>{timingShort(point)}</span>
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-[18px] bg-[#F7FAF8] px-3.5 py-3 ring-1 ring-[#E8F0EB]">
          <div className="text-[13px] font-black leading-5 text-slate-900">
            {rangeLabel}：体調警戒度{selected.is_aggregate ? " 平均" : ""}{displayScore(selected.forecast)}/100
            {selected.forecast_severity == null ? "" : `（${signalLabel(selected.forecast_severity)}）`}
          </div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
            {selected.is_aggregate
              ? actualCountsText(selected)
              : selectedActual
                ? `実感は${selectedActual.symbol} ${selectedActual.label}`
                : "実感は未記録"}
            {selected.care_count
              ? `・ケア${selected.care_count}日${selected.care_timing ? `（${careTimingLabel(selected.care_timing)}が中心）` : ""}`
              : "・ケア記録なし"}
          </div>
          {!selected.is_aggregate ? (
            <button type="button" onClick={() => onSelectDate?.(selected.date)} className="mt-2 text-[12px] font-black text-[#2F816E] underline underline-offset-2">この日の記録を見る</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
