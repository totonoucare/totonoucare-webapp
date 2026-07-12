"use client";

import { useMemo, useState } from "react";
import {
  RECORD_DOMAIN_OPTIONS,
  buildChartPoints,
} from "@/lib/records/analysis";

function formatShortDate(value) {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return value || "";
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function buildPath(points, key, xFor, yFor) {
  const segments = [];
  let current = [];

  points.forEach((point, index) => {
    const value = point[key];
    if (value == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push([xFor(index), yFor(value)]);
  });

  if (current.length) segments.push(current);

  return segments.map((segment) =>
    segment
      .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ")
  );
}

export default function RecordsTrendChart({
  rows = [],
  periodDays = 30,
  onSelectDate,
}) {
  const points = useMemo(() => buildChartPoints(rows, periodDays), [rows, periodDays]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedPoint = selectedIndex == null ? null : points[selectedIndex] || null;

  const axisWidth = 66;
  const width = 654;
  const height = 300;
  const left = 22;
  const right = 22;
  const top = 22;
  const chartBottom = 218;
  const careY = 254;
  const innerWidth = width - left - right;
  const innerHeight = chartBottom - top;

  const xFor = (index) => {
    if (points.length <= 1) return left + innerWidth / 2;
    return left + (index / (points.length - 1)) * innerWidth;
  };
  const yFor = (value) => top + ((100 - Math.max(0, Math.min(100, Number(value)))) / 100) * innerHeight;

  const forecastPaths = buildPath(points, "forecast", xFor, yFor);
  const actualPaths = buildPath(points, "actual", xFor, yFor);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  if (!points.length) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-6 text-center text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        この期間の予報や記録はまだありません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF3EF] px-4 py-3 text-[10px] font-black text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-[#66B9A3]" />
          予報ゆらぎ度
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-slate-600" />
          実際の体調
        </span>
        <span className="text-slate-400">下の色点＝行ったケア</span>
      </div>

      <div className="flex items-start">
        <div
          className="relative z-10 h-[300px] shrink-0 border-r border-[#EEF3EF] bg-white shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]"
          style={{ width: axisWidth }}
          aria-hidden="true"
        >
          {[0, 50, 100].map((value) => {
            const y = yFor(value);
            const label = value === 100 ? "つらい" : value === 50 ? "少し" : "よかった";
            return (
              <span
                key={value}
                className="absolute right-2 text-[10px] font-extrabold text-slate-400"
                style={{ top: y - 7 }}
              >
                {label}
              </span>
            );
          })}
          <span className="absolute right-2 text-[9px] font-extrabold text-slate-400" style={{ top: careY - 6 }}>
            ケア
          </span>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[300px] w-[654px] min-w-[654px]"
            role="img"
            aria-label="予報ゆらぎ度、実際の体調、行ったケアの推移"
          >
            {[0, 50, 100].map((value) => {
              const y = yFor(value);
              return <line key={value} x1={left} x2={width - right} y1={y} y2={y} stroke="#E8EFEB" strokeWidth="1" />;
            })}

          {forecastPaths.map((path, index) => (
            <path
              key={`forecast-${index}`}
              d={path}
              fill="none"
              stroke="#66B9A3"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          ))}

          {actualPaths.map((path, index) => (
            <path
              key={`actual-${index}`}
              d={path}
              fill="none"
              stroke="#475569"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.92"
            />
          ))}

          {points.map((point, index) => {
            const x = xFor(index);
            const showLabel = index % labelEvery === 0 || index === points.length - 1;
            return (
              <g key={`${point.date}-${index}`}>
                {point.forecast != null ? (
                  <circle cx={x} cy={yFor(point.forecast)} r="5" fill="#ffffff" stroke="#66B9A3" strokeWidth="3" />
                ) : null}
                {point.actual != null ? (
                  <circle
                    cx={x}
                    cy={yFor(point.actual)}
                    r="6.5"
                    fill="#ffffff"
                    stroke="#475569"
                    strokeWidth="3"
                    className="cursor-pointer"
                    onClick={() => setSelectedIndex(index)}
                  />
                ) : null}

                {point.domains.map((domain, domainIndex) => {
                  const meta = RECORD_DOMAIN_OPTIONS.find((item) => item.value === domain);
                  if (!meta) return null;
                  return (
                    <circle
                      key={`${point.date}-${domain}`}
                      cx={x + (domainIndex - (point.domains.length - 1) / 2) * 11}
                      cy={careY}
                      r="4.5"
                      fill={meta.color}
                    />
                  );
                })}

                {showLabel ? (
                  <text x={x} y={286} textAnchor="middle" fontSize="10" fontWeight="800" fill="#94A3B8">
                    {formatShortDate(point.date)}
                  </text>
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
            <div>
              <div className="text-[11px] font-black text-slate-900">
                {selectedPoint.is_aggregate
                  ? `${formatShortDate(selectedPoint.date)}〜${formatShortDate(selectedPoint.end_date)}`
                  : formatShortDate(selectedPoint.date)}
              </div>
              <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">
                {selectedPoint.is_aggregate
                  ? `週平均・記録${selectedPoint.recorded_count}日（予報${selectedPoint.forecast_count}日）`
                  : "この日の予報と実感"}
              </div>
            </div>
            {!selectedPoint.is_aggregate ? (
              <button
                type="button"
                onClick={() => onSelectDate?.(selectedPoint.date)}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]"
              >
                この日を見る
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
