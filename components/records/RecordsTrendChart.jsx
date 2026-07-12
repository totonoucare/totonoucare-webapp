"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RECORD_DOMAIN_OPTIONS,
  buildChartPoints,
  careTimingLabel,
  domainLabel,
  signalLabel,
} from "@/lib/records/analysis";

const ACTUAL_META = {
  0: { symbol: "○", label: "よかった", color: "#2F816E", surface: "#EFF8F4" },
  1: { symbol: "△", label: "少しつらい", color: "#A56C18", surface: "#FFF8EC" },
  2: { symbol: "×", label: "つらい", color: "#B75C3E", surface: "#FFF0EC" },
};

const FORECAST_META = {
  0: { short: "安", label: "安定", surface: "#EAF7F1", strip: "#66B9A3" },
  1: { short: "いた", label: "いたわり", surface: "#FFF4DE", strip: "#E2AE45" },
  2: { short: "守", label: "守り", surface: "#FDEBE5", strip: "#D77A5D" },
};

function formatShortDate(value) {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return value || "";
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function buildActualPath(points, xFor, yForSeverity) {
  const segments = [];
  let current = [];
  points.forEach((point, index) => {
    if (point.actual_severity == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push([xFor(index), yForSeverity(point.actual_severity)]);
  });
  if (current.length) segments.push(current);
  return segments.map((segment) => segment
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" "));
}

function actualSummary(point) {
  const counts = point?.actual_counts || {};
  return `○${counts.good || 0}日・△${counts.mild || 0}日・×${counts.hard || 0}日`;
}

export default function RecordsTrendChart({
  rows = [],
  periodDays = 30,
  onSelectDate,
}) {
  const points = useMemo(() => buildChartPoints(rows, periodDays), [rows, periodDays]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedPoint = selectedIndex == null ? null : points[selectedIndex] || null;
  const isWeekly = periodDays > 45;

  useEffect(() => {
    setSelectedIndex(null);
  }, [periodDays, rows]);

  const axisWidth = 66;
  const width = Math.max(654, points.length * (isWeekly ? 38 : 44));
  const height = 320;
  const left = 10;
  const right = 10;
  const top = 42;
  const chartBottom = 226;
  const careY = 264;
  const dateY = 302;
  const innerWidth = width - left - right;
  const innerHeight = chartBottom - top;
  const columnWidth = points.length ? innerWidth / points.length : innerWidth;
  const xFor = (index) => left + (index + 0.5) * columnWidth;
  const yForSeverity = (severity) => chartBottom - (Number(severity) / 2) * innerHeight;
  const actualPaths = isWeekly ? [] : buildActualPath(points, xFor, yForSeverity);
  const labelEvery = isWeekly || points.length > 14 ? 2 : 1;

  if (!points.length) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-6 text-center text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        この期間の予報や記録はまだありません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="border-b border-[#EEF3EF] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-black text-slate-500">
          <span>背景＝予報</span>
          {[0, 1, 2].map((severity) => (
            <span key={severity} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: FORECAST_META[severity].surface, border: `1px solid ${FORECAST_META[severity].strip}` }} />
              {FORECAST_META[severity].label}
            </span>
          ))}
          <span className="text-slate-400">○△×＝実感・下の色点＝ケア</span>
        </div>
        <div className="mt-1 text-[9px] font-bold leading-4 text-slate-400">
          {isWeekly ? "3か月以上は、週ごとの○△×件数を表示します。平均点にはしていません。" : "実感を主役に、同じ日の予報とケアを背景・下段で重ねています。"}
        </div>
      </div>

      <div className="flex items-start">
        <div
          className="relative z-10 h-[320px] shrink-0 border-r border-[#EEF3EF] bg-white shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]"
          style={{ width: axisWidth }}
          aria-hidden="true"
        >
          {[2, 1, 0].map((severity) => (
            <span
              key={severity}
              className="absolute right-2 text-[9px] font-extrabold text-slate-400"
              style={{ top: yForSeverity(severity) - 7 }}
            >
              {ACTUAL_META[severity].symbol} {severity === 1 ? "少し" : ACTUAL_META[severity].label}
            </span>
          ))}
          <span className="absolute right-2 text-[9px] font-extrabold text-slate-400" style={{ top: careY - 6 }}>ケア</span>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[320px]"
            style={{ width, minWidth: width }}
            role="img"
            aria-label="実際の体調を主役に、背景へ予報、下段へケアを表示した推移"
          >
            {points.map((point, index) => {
              const meta = FORECAST_META[point.forecast_severity] || { short: "－", surface: "#F8FAFC", strip: "#CBD5E1" };
              const x = left + index * columnWidth;
              return (
                <g key={`forecast-bg-${point.date}-${index}`}>
                  <rect x={x + 1} y={8} width={Math.max(1, columnWidth - 2)} height={chartBottom - 8} rx="8" fill={meta.surface} opacity="0.72" />
                  <rect x={x + 4} y={8} width={Math.max(1, columnWidth - 8)} height="5" rx="2.5" fill={meta.strip} opacity="0.85" />
                  <text x={xFor(index)} y={29} textAnchor="middle" fontSize="8" fontWeight="900" fill={meta.strip}>{meta.short}</text>
                </g>
              );
            })}

            {[0, 1, 2].map((severity) => (
              <line key={severity} x1={left} x2={width - right} y1={yForSeverity(severity)} y2={yForSeverity(severity)} stroke="#DDE8E1" strokeWidth="1" strokeDasharray="3 4" />
            ))}

            {actualPaths.map((path, index) => (
              <path key={`actual-${index}`} d={path} fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
            ))}

            {points.map((point, index) => {
              const x = xFor(index);
              const showLabel = index % labelEvery === 0 || index === points.length - 1;
              const counts = point.actual_counts || {};
              return (
                <g key={`${point.date}-${index}`}>
                  {isWeekly ? [0, 1, 2].map((severity) => {
                    const count = [counts.good, counts.mild, counts.hard][severity] || 0;
                    if (!count) return null;
                    const meta = ACTUAL_META[severity];
                    return (
                      <g key={`${point.date}-${severity}`} className="cursor-pointer" onClick={() => setSelectedIndex(index)}>
                        <circle cx={x} cy={yForSeverity(severity)} r={count > 1 ? 12 : 10} fill={meta.surface} stroke={meta.color} strokeWidth="2.5" />
                        <text x={x} y={yForSeverity(severity) + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill={meta.color}>{meta.symbol}{count}</text>
                      </g>
                    );
                  }) : point.actual_severity != null ? (() => {
                    const meta = ACTUAL_META[point.actual_severity];
                    return (
                      <g className="cursor-pointer" onClick={() => setSelectedIndex(index)}>
                        <circle cx={x} cy={yForSeverity(point.actual_severity)} r="10" fill="#ffffff" stroke={meta.color} strokeWidth="3" />
                        <text x={x} y={yForSeverity(point.actual_severity) + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill={meta.color}>{meta.symbol}</text>
                      </g>
                    );
                  })() : null}

                  {point.domains.map((domain, domainIndex) => {
                    const meta = RECORD_DOMAIN_OPTIONS.find((item) => item.value === domain);
                    if (!meta) return null;
                    return <circle key={`${point.date}-${domain}`} cx={x + (domainIndex - (point.domains.length - 1) / 2) * 11} cy={careY} r="4.5" fill={meta.color} />;
                  })}
                  {!point.domains.length && point.care_count > 0 ? <circle cx={x} cy={careY} r="4" fill="#94A3B8" /> : null}

                  {showLabel ? (
                    <text x={x} y={dateY} textAnchor="middle" fontSize="9" fontWeight="800" fill="#94A3B8">{formatShortDate(point.date)}</text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {selectedPoint ? (
        <div className="m-3 mt-0 rounded-[18px] bg-[#F7FAF8] px-4 py-3 ring-1 ring-[#E8F0EB]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black text-slate-900">
                {selectedPoint.is_aggregate ? `${formatShortDate(selectedPoint.date)}〜${formatShortDate(selectedPoint.end_date)}` : formatShortDate(selectedPoint.date)}
              </div>
              <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">
                {selectedPoint.is_aggregate
                  ? `${actualSummary(selectedPoint)}・ケア${selectedPoint.care_count}日・${selectedPoint.forecast_severity == null ? "予報なし" : `多かった予報は${signalLabel(selectedPoint.forecast_severity)}`}`
                  : `予報：${selectedPoint.forecast_severity == null ? "なし" : signalLabel(selectedPoint.forecast_severity)}${selectedPoint.forecast != null ? ` ${Math.round(selectedPoint.forecast) / 10}/10` : ""}・実感：${ACTUAL_META[selectedPoint.actual_severity]?.symbol || "－"} ${ACTUAL_META[selectedPoint.actual_severity]?.label || "未記録"}`}
              </div>
              {selectedPoint.domains.length ? (
                <div className="mt-1 text-[9px] font-bold text-slate-400">
                  ケア：{selectedPoint.domains.map(domainLabel).join("・")}
                  {!selectedPoint.is_aggregate && selectedPoint.rows?.[0]?.care_timing ? `・${careTimingLabel(selectedPoint.rows[0].care_timing)}` : ""}
                </div>
              ) : null}
            </div>
            {!selectedPoint.is_aggregate ? (
              <button type="button" onClick={() => onSelectDate?.(selectedPoint.date)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">この日を見る</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
