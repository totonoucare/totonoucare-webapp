"use client";

import { useMemo, useState } from "react";
import {
  buildForecastActualMapPoints,
  domainLabel,
  signalLabel,
} from "@/lib/records/analysis";

const COMPARISON_META = {
  aligned: {
    label: "予報と実感が近い",
    short: "近い",
    color: "#2F816E",
    surface: "#EFF8F4",
  },
  better: {
    label: "予報より穏やか",
    short: "穏やか",
    color: "#A56C18",
    surface: "#FFF8EC",
  },
  worse: {
    label: "予報よりゆらいだ",
    short: "ゆらいだ",
    color: "#B75C3E",
    surface: "#FFF0EC",
  },
};

const FORECAST_COLUMNS = [
  { value: 0, label: "安定" },
  { value: 1, label: "いたわり" },
  { value: 2, label: "守り" },
];

const ACTUAL_ROWS = [
  { severity: 0, symbol: "○", label: "よかった" },
  { severity: 1, symbol: "△", label: "少しつらい" },
  { severity: 2, symbol: "×", label: "つらい" },
];

function comparisonFor(forecastSeverity, actualSeverity) {
  if (forecastSeverity === actualSeverity) return "aligned";
  return actualSeverity < forecastSeverity ? "better" : "worse";
}

function shortDate(value) {
  const [, month, day] = String(value || "").split("-");
  return `${Number(month)}/${Number(day)}`;
}

function cellKey(forecastSeverity, actualSeverity) {
  return `${forecastSeverity}:${actualSeverity}`;
}

export default function ForecastActualMap({ rows = [], onSelectDate }) {
  const points = useMemo(() => buildForecastActualMapPoints(rows), [rows]);
  const groups = useMemo(() => {
    const next = new Map();
    points.forEach((point) => {
      const key = cellKey(point.forecast_severity, point.actual_severity);
      if (!next.has(key)) next.set(key, []);
      next.get(key).push(point);
    });
    return next;
  }, [points]);
  const defaultCell = useMemo(() => {
    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0]?.[0] || "";
  }, [groups]);
  const [selectedCell, setSelectedCell] = useState("");
  const activeCell = groups.has(selectedCell) ? selectedCell : defaultCell;
  const activePoints = groups.get(activeCell) || [];
  const activePoint = activePoints[0] || null;

  const width = 420;
  const height = 340;
  const left = 88;
  const right = 14;
  const top = 62;
  const bottom = 38;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const cellWidth = innerWidth / 3;
  const cellHeight = innerHeight / 3;

  if (!points.length) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-5 text-center text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        予報と記録が同じ日にそろうと、ここに比較マップが表示されます。
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="border-b border-[#EEF3EF] px-4 py-3">
        <div className="text-[13px] font-black text-slate-900">予報と実感マップ</div>
        <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">
          横がその日の予報、縦が実際の体調です。数字は、その組み合わせになった日数です。
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="安定・いたわり・守りの予報と、よかった・少しつらい・つらい実感の9マス比較">
        <text x={left} y="20" fontSize="9" fontWeight="900" fill="#94A3B8">予報</text>
        <text x="18" y="46" fontSize="9" fontWeight="900" fill="#94A3B8">実感</text>

        {FORECAST_COLUMNS.map((column, columnIndex) => (
          <text
            key={column.value}
            x={left + (columnIndex + 0.5) * cellWidth}
            y={45}
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#475569"
          >
            {column.label}
          </text>
        ))}

        {ACTUAL_ROWS.map((actual, rowIndex) => (
          <g key={actual.severity}>
            <text x={left - 10} y={top + (rowIndex + 0.5) * cellHeight - 4} textAnchor="end" fontSize="13" fontWeight="900" fill="#475569">
              {actual.symbol}
            </text>
            <text x={left - 10} y={top + (rowIndex + 0.5) * cellHeight + 12} textAnchor="end" fontSize="8.5" fontWeight="800" fill="#94A3B8">
              {actual.label}
            </text>
          </g>
        ))}

        {ACTUAL_ROWS.flatMap((actual, rowIndex) => (
          FORECAST_COLUMNS.map((forecast, columnIndex) => {
            const key = cellKey(forecast.value, actual.severity);
            const cellPoints = groups.get(key) || [];
            const comparison = comparisonFor(forecast.value, actual.severity);
            const meta = COMPARISON_META[comparison];
            const x = left + columnIndex * cellWidth;
            const y = top + rowIndex * cellHeight;
            const selected = key === activeCell;
            const careDays = cellPoints.filter((point) => point.care_done).length;

            return (
              <g
                key={key}
                role={cellPoints.length ? "button" : undefined}
                tabIndex={cellPoints.length ? 0 : undefined}
                aria-label={`${forecast.label}予報で${actual.label}だった日 ${cellPoints.length}日`}
                className={cellPoints.length ? "cursor-pointer" : ""}
                onClick={() => cellPoints.length && setSelectedCell(key)}
                onKeyDown={(event) => {
                  if (cellPoints.length && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setSelectedCell(key);
                  }
                }}
              >
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={cellWidth - 4}
                  height={cellHeight - 4}
                  rx="12"
                  fill={meta.surface}
                  stroke={selected ? meta.color : "#E4ECE7"}
                  strokeWidth={selected ? 2.5 : 1}
                  opacity={cellPoints.length ? 1 : 0.6}
                />
                <text x={x + 10} y={y + 18} fontSize="8.5" fontWeight="900" fill={meta.color}>
                  {meta.short}
                </text>
                <text x={x + cellWidth / 2} y={y + 49} textAnchor="middle" fontSize="18" fontWeight="900" fill={cellPoints.length ? "#1E293B" : "#CBD5E1"}>
                  {cellPoints.length}日
                </text>
                {cellPoints.length ? (
                  <text x={x + cellWidth / 2} y={y + 66} textAnchor="middle" fontSize="8" fontWeight="800" fill="#64748B">
                    ケアあり {careDays}日
                  </text>
                ) : null}
              </g>
            );
          })
        ))}

        <text x={left + innerWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" fontWeight="800" fill="#94A3B8">
          安定　→　いたわり　→　守り
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-[#EEF3EF] px-4 py-3 text-[9px] font-black text-slate-500">
        {Object.entries(COMPARISON_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-black/5" style={{ backgroundColor: meta.surface }} />{meta.label}
          </span>
        ))}
      </div>

      {activePoint ? (
        <div className="m-3 mt-0 rounded-[18px] bg-[#F7FAF8] px-4 py-3 ring-1 ring-[#E8F0EB]">
          <div className="text-[11px] font-black text-slate-900">
            {signalLabel(activePoint.forecast_severity)}予報 × {ACTUAL_ROWS.find((item) => item.severity === activePoint.actual_severity)?.symbol} {ACTUAL_ROWS.find((item) => item.severity === activePoint.actual_severity)?.label}
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-500">
            {COMPARISON_META[activePoint.comparison]?.label}・{activePoints.length}日
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {activePoints.map((point) => (
              <button
                key={point.date}
                type="button"
                onClick={() => onSelectDate?.(point.date)}
                className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-slate-600 ring-1 ring-[#DCE8DD]"
              >
                {shortDate(point.date)}{point.care_done ? `・${point.domains.map(domainLabel).join("・") || "ケアあり"}` : "・ケアなし"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
