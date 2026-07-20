"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RECORD_DOMAIN_OPTIONS,
  buildChartPoints,
  buildForecastPatternGroups,
  careTimingLabel,
  domainLabel,
  signalLabel,
} from "@/lib/records/analysis";

const ACTUAL_META = {
  0: { symbol: "○", label: "よかった", color: "#2F816E", surface: "#EFF8F4" },
  1: { symbol: "△", label: "少しつらい", color: "#A56C18", surface: "#FFF8EC" },
  2: { symbol: "×", label: "つらい", color: "#B75C3E", surface: "#FFF0EC" },
};

const FORECAST_BANDS = [
  { key: "guard", label: "守り", min: 70, max: 100, surface: "#FDEBE5", ink: "#B75C3E" },
  { key: "care", label: "いたわり", min: 40, max: 70, surface: "#FFF4DE", ink: "#A56C18" },
  { key: "stable", label: "安定", min: 0, max: 40, surface: "#EAF7F1", ink: "#2F816E" },
];

const PATTERN_FILTERS = [
  { key: "all", label: "すべて", short: "すべて", active: "bg-slate-700 text-white ring-slate-700" },
  { key: "attention_good", label: "注意予報でも体調○", short: "注意予報でも体調○", active: "bg-[#EAF7F1] text-[#2F816E] ring-[#9FCFBE]" },
  { key: "attention_difficult", label: "注意予報で体調△・×", short: "注意予報で体調△・×", active: "bg-[#FFF4DE] text-[#9B6417] ring-[#E2AE45]" },
  { key: "stable_good", label: "安定予報で体調○", short: "安定予報で体調○", active: "bg-[#F1F5F3] text-slate-600 ring-[#B9C9C0]" },
  { key: "stable_difficult", label: "安定予報だが体調△・×", short: "安定予報だが体調△・×", active: "bg-[#FFF0EC] text-[#A6513A] ring-[#E1A993]" },
];

const TRIGGER_SHORT = {
  pressure_down: "気圧↓",
  pressure_up: "気圧↑",
  cold: "冷え",
  heat: "暑さ",
  damp: "湿気",
  dry: "乾燥",
};

function formatShortDate(value) {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return value || "";
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function buildPath(points, xFor, valueFor, yFor) {
  const segments = [];
  let current = [];
  points.forEach((point, index) => {
    const value = valueFor(point);
    if (value == null || !Number.isFinite(Number(value))) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push([xFor(index), yFor(Number(value))]);
  });
  if (current.length) segments.push(current);
  return segments.map((segment) => segment
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" "));
}


function formatForecastValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "－";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function actualSummary(point) {
  const counts = point?.actual_counts || {};
  return `○${counts.good || 0}日・△${counts.mild || 0}日・×${counts.hard || 0}日`;
}

function patternCountMap(groups) {
  return Object.fromEntries(groups.map((group) => [group.key, group.days]));
}

function matchesFilter(point, activeFilter) {
  if (activeFilter === "all") return true;
  if (point.is_aggregate) return Number(point.pattern_counts?.[activeFilter] || 0) > 0;
  return point.pattern_key === activeFilter;
}

function timingShort(value) {
  if (value === "before_peak") return "先";
  if (value === "after_symptom") return "後";
  if (value === "unknown") return "時?";
  return "";
}

export default function RecordsTrendChart({
  rows = [],
  periodDays = 30,
  onSelectDate,
}) {
  const points = useMemo(() => buildChartPoints(rows, periodDays), [rows, periodDays]);
  const patternGroups = useMemo(() => buildForecastPatternGroups(rows), [rows]);
  const patternCounts = useMemo(() => patternCountMap(patternGroups), [patternGroups]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedPoint = selectedIndex == null ? null : points[selectedIndex] || null;
  const isWeekly = periodDays > 45;

  useEffect(() => {
    setSelectedIndex(null);
    setActiveFilter("all");
  }, [periodDays, rows]);

  const axisWidth = 76;
  const width = Math.max(654, points.length * (isWeekly ? 44 : 48));
  const height = 404;
  const left = 12;
  const right = 12;
  const forecastTop = 28;
  const forecastBottom = 174;
  const triggerY = 194;
  const actualTop = 224;
  const actualBottom = 304;
  const careY = 342;
  const dateY = 390;
  const innerWidth = width - left - right;
  const columnWidth = points.length ? innerWidth / points.length : innerWidth;
  const xFor = (index) => left + (index + 0.5) * columnWidth;
  const yForForecast = (value) => forecastBottom - (Math.max(0, Math.min(100, Number(value))) / 100) * (forecastBottom - forecastTop);
  const yForActual = (severity) => actualBottom - (Number(severity) / 2) * (actualBottom - actualTop);
  const forecastPaths = buildPath(points, xFor, (point) => point.forecast, yForForecast);
  const actualPaths = isWeekly ? [] : buildPath(points, xFor, (point) => point.actual_severity, yForActual);
  const labelEvery = isWeekly || points.length > 16 ? 2 : 1;
  const forecastNumberEvery = points.length <= 9 ? 1 : points.length <= 18 ? 2 : 4;

  if (!points.length) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-6 text-center text-[14px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        この期間の予報や記録はまだありません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="border-b border-[#EEF3EF] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-black text-slate-500">
          <span className="text-slate-700">体調ゆらぎ度 0〜100</span>
          {FORECAST_BANDS.slice().reverse().map((band) => (
            <span key={band.key} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: band.surface, border: `1px solid ${band.ink}` }} />
              {band.label}
            </span>
          ))}
          <span className="text-slate-400">○△×＝実感・下段＝ケア</span>
        </div>
        <div className="mt-1 text-[11px] font-bold leading-4 text-slate-400">
          {isWeekly
            ? "週ごとの体調ゆらぎ度の平均と範囲、実感の日数、ケア日数を重ねています。"
            : "体調ゆらぎ度と実感は別の尺度です。同じ日付で、予報→ケア→実感の流れを見比べます。"}
        </div>

        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-black text-slate-400">振り返りたい日を絞る</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PATTERN_FILTERS.map((filter) => {
              const count = filter.key === "all"
                ? patternGroups.reduce((sum, group) => sum + group.days, 0)
                : Number(patternCounts[filter.key] || 0);
              const selected = activeFilter === filter.key;
              const disabled = filter.key !== "all" && count === 0;
              return (
                <button
                  key={filter.key}
                  type="button"
                  disabled={disabled}
                  title={filter.label}
                  onClick={() => {
                    setActiveFilter(filter.key);
                    setSelectedIndex(null);
                  }}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 transition-all",
                    selected ? filter.active : "bg-white text-slate-500 ring-[#DCE8DD]",
                    disabled ? "opacity-35" : "active:scale-[0.98]",
                  ].join(" ")}
                >
                  {filter.short} {count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start">
        <div
          className="relative z-10 h-[404px] shrink-0 border-r border-[#EEF3EF] bg-white shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]"
          style={{ width: axisWidth }}
          aria-hidden="true"
        >
          <span className="absolute left-2 top-2 text-[10px] font-black leading-3 text-slate-400">体調<br />ゆらぎ度</span>
          {[100, 70, 40, 0].map((value) => (
            <span key={value} className="absolute right-2 text-[10px] font-extrabold text-slate-400" style={{ top: yForForecast(value) - 6 }}>{value}</span>
          ))}
          <span className="absolute right-2 text-[10px] font-black text-slate-400" style={{ top: triggerY - 7 }}>主因</span>
          {[2, 1, 0].map((severity) => (
            <span key={severity} className="absolute right-2 text-[11px] font-extrabold text-slate-400" style={{ top: yForActual(severity) - 7 }}>
              {ACTUAL_META[severity].symbol} {severity === 1 ? "少し" : ACTUAL_META[severity].label}
            </span>
          ))}
          <span className="absolute right-2 text-[11px] font-extrabold text-slate-400" style={{ top: careY - 6 }}>ケア</span>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[404px]"
            style={{ width, minWidth: width }}
            role="img"
            aria-label="体調ゆらぎ度、天気ストレス、実感、ケアを同じ日付で表示した推移"
          >
            {FORECAST_BANDS.map((band) => (
              <rect
                key={band.key}
                x={left}
                y={yForForecast(band.max)}
                width={innerWidth}
                height={Math.max(1, yForForecast(band.min) - yForForecast(band.max))}
                fill={band.surface}
                opacity="0.72"
              />
            ))}

            {points.map((point, index) => {
              if (activeFilter === "all") return null;
              const active = matchesFilter(point, activeFilter);
              const x = left + index * columnWidth;
              return (
                <rect
                  key={`filter-${point.date}-${index}`}
                  x={x + 1}
                  y={8}
                  width={Math.max(1, columnWidth - 2)}
                  height={height - 22}
                  rx="8"
                  fill={active ? "#FFFFFF" : "#F8FAFC"}
                  opacity={active ? "0.16" : "0.72"}
                />
              );
            })}

            {[100, 70, 40, 0].map((value) => (
              <line key={`forecast-${value}`} x1={left} x2={width - right} y1={yForForecast(value)} y2={yForForecast(value)} stroke="#D8E4DD" strokeWidth="1" strokeDasharray={value === 70 || value === 40 ? "4 3" : "2 5"} />
            ))}

            {points.map((point, index) => {
              if (!isWeekly || point.forecast_min == null || point.forecast_max == null) return null;
              const active = matchesFilter(point, activeFilter);
              const x = xFor(index);
              return (
                <line
                  key={`range-${point.date}`}
                  x1={x}
                  x2={x}
                  y1={yForForecast(point.forecast_max)}
                  y2={yForForecast(point.forecast_min)}
                  stroke="#2F816E"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity={active ? "0.32" : "0.08"}
                />
              );
            })}

            {forecastPaths.map((path, index) => (
              <path key={`forecast-line-${index}`} d={path} fill="none" stroke="#2F816E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={activeFilter === "all" ? "0.9" : "0.3"} />
            ))}

            <line x1={left} x2={width - right} y1={actualTop - 16} y2={actualTop - 16} stroke="#E8EFEB" strokeWidth="1" />
            {[0, 1, 2].map((severity) => (
              <line key={`actual-${severity}`} x1={left} x2={width - right} y1={yForActual(severity)} y2={yForActual(severity)} stroke="#DDE8E1" strokeWidth="1" strokeDasharray="3 4" />
            ))}

            {actualPaths.map((path, index) => (
              <path key={`actual-line-${index}`} d={path} fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={activeFilter === "all" ? "0.55" : "0.22"} />
            ))}

            {points.map((point, index) => {
              const x = xFor(index);
              const active = matchesFilter(point, activeFilter);
              const selected = selectedIndex === index;
              const showDate = index % labelEvery === 0 || index === points.length - 1;
              const showForecastNumber = point.forecast != null && (index % forecastNumberEvery === 0 || selected || index === points.length - 1);
              const counts = point.actual_counts || {};
              const triggerShort = TRIGGER_SHORT[point.exact_trigger] || "－";
              return (
                <g key={`${point.date}-${index}`} opacity={active ? 1 : 0.2}>
                  <rect
                    x={left + index * columnWidth + 1}
                    y={8}
                    width={Math.max(1, columnWidth - 2)}
                    height={height - 22}
                    rx="8"
                    fill={selected ? "#FFFFFF" : "transparent"}
                    stroke={selected ? "#66B9A3" : "transparent"}
                    strokeWidth="2"
                    className="cursor-pointer"
                    onClick={() => setSelectedIndex(index)}
                  />

                  {point.forecast != null ? (
                    <g className="cursor-pointer" onClick={() => setSelectedIndex(index)}>
                      <circle cx={x} cy={yForForecast(point.forecast)} r={selected ? 6.5 : 5} fill="#FFFFFF" stroke="#2F816E" strokeWidth={selected ? 3 : 2.5} />
                      {showForecastNumber ? (
                        <text x={x} y={Math.max(13, yForForecast(point.forecast) - 9)} textAnchor="middle" fontSize="10" fontWeight="900" fill="#2F816E">{formatForecastValue(point.forecast)}</text>
                      ) : null}
                    </g>
                  ) : null}

                  <text x={x} y={triggerY} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#64748B">{triggerShort}</text>

                  {isWeekly ? [0, 1, 2].map((severity) => {
                    const count = [counts.good, counts.mild, counts.hard][severity] || 0;
                    if (!count) return null;
                    const meta = ACTUAL_META[severity];
                    return (
                      <g key={`${point.date}-${severity}`} className="cursor-pointer" onClick={() => setSelectedIndex(index)}>
                        <circle cx={x} cy={yForActual(severity)} r={count > 1 ? 11 : 9} fill={meta.surface} stroke={meta.color} strokeWidth="2.5" />
                        <text x={x} y={yForActual(severity) + 3} textAnchor="middle" fontSize="10" fontWeight="900" fill={meta.color}>{meta.symbol}{count}</text>
                      </g>
                    );
                  }) : point.actual_severity != null ? (() => {
                    const meta = ACTUAL_META[point.actual_severity];
                    return (
                      <g className="cursor-pointer" onClick={() => setSelectedIndex(index)}>
                        <circle cx={x} cy={yForActual(point.actual_severity)} r="10" fill="#ffffff" stroke={meta.color} strokeWidth="3" />
                        <text x={x} y={yForActual(point.actual_severity) + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill={meta.color}>{meta.symbol}</text>
                      </g>
                    );
                  })() : null}

                  {point.domains.map((domain, domainIndex) => {
                    const meta = RECORD_DOMAIN_OPTIONS.find((item) => item.value === domain);
                    if (!meta) return null;
                    return <circle key={`${point.date}-${domain}`} cx={x + (domainIndex - (point.domains.length - 1) / 2) * 11} cy={careY} r="4.5" fill={meta.color} />;
                  })}
                  {!point.domains.length && point.care_count > 0 ? <circle cx={x} cy={careY} r="4" fill="#94A3B8" /> : null}
                  {!isWeekly && point.care_timing ? (
                    <text x={x} y={careY + 15} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#94A3B8">{timingShort(point.care_timing)}</text>
                  ) : null}
                  {isWeekly && point.care_count > 0 ? (
                    <text x={x} y={careY + 15} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#94A3B8">{point.care_count}日</text>
                  ) : null}

                  {showDate ? (
                    <text x={x} y={dateY} textAnchor="middle" fontSize="11" fontWeight="800" fill="#94A3B8">{formatShortDate(point.date)}</text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="border-t border-[#EEF3EF] px-4 py-2 text-[10px] font-bold leading-4 text-slate-400">
        ケア時刻：先＝注意時間の前、後＝つらくなってから。絞り込みは当たり外れではなく、似た条件の日を探すために使います。
      </div>

      {selectedPoint ? (
        <div className="m-3 mt-1 rounded-[18px] bg-[#F7FAF8] px-4 py-3 ring-1 ring-[#E8F0EB]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-black text-slate-900">
                {selectedPoint.is_aggregate ? `${formatShortDate(selectedPoint.date)}〜${formatShortDate(selectedPoint.end_date)}` : formatShortDate(selectedPoint.date)}
              </div>
              <div className="mt-1 text-[14px] font-bold leading-5 text-slate-600">
                {selectedPoint.is_aggregate
                  ? `体調ゆらぎ度 平均${formatForecastValue(selectedPoint.forecast)}/100${selectedPoint.forecast_min != null ? `（${formatForecastValue(selectedPoint.forecast_min)}〜${formatForecastValue(selectedPoint.forecast_max)}）` : ""}・${actualSummary(selectedPoint)}`
                  : `体調ゆらぎ度：${formatForecastValue(selectedPoint.forecast)}/100${selectedPoint.forecast_severity == null ? "" : `（${signalLabel(selectedPoint.forecast_severity)}）`}・実感：${ACTUAL_META[selectedPoint.actual_severity]?.symbol || "－"} ${ACTUAL_META[selectedPoint.actual_severity]?.label || "未記録"}`}
              </div>
              <div className="mt-1 text-[11px] font-bold leading-4 text-slate-400">
                主な天気ストレス：{selectedPoint.trigger_label || "記録なし"}
                {selectedPoint.domains.length ? `・ケア：${selectedPoint.domains.map(domainLabel).join("・")}` : selectedPoint.care_count > 0 ? `・ケア${selectedPoint.care_count}日` : "・ケアなし"}
                {!selectedPoint.is_aggregate && selectedPoint.care_timing ? `・${careTimingLabel(selectedPoint.care_timing)}` : ""}
              </div>
            </div>
            {!selectedPoint.is_aggregate ? (
              <button type="button" onClick={() => onSelectDate?.(selectedPoint.date)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">この日を見る</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
