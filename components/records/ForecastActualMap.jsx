"use client";

import { useMemo, useState } from "react";
import {
  buildForecastActualMapPoints,
  conditionLabel,
  domainLabel,
} from "@/lib/records/analysis";

const COMPARISON_META = {
  aligned: { label: "予報と実感が近い", color: "#66B9A3" },
  better: { label: "予報より穏やか", color: "#E2AE45" },
  worse: { label: "予報よりゆらいだ", color: "#D77A5D" },
};

function shortDate(value) {
  const [, month, day] = String(value || "").split("-");
  return `${Number(month)}/${Number(day)}`;
}

export default function ForecastActualMap({ rows = [], onSelectDate }) {
  const points = useMemo(() => buildForecastActualMapPoints(rows), [rows]);
  const [selectedDate, setSelectedDate] = useState("");
  const selected = points.find((point) => point.date === selectedDate) || null;

  const width = 420;
  const height = 318;
  const left = 56;
  const right = 18;
  const top = 36;
  const bottom = 48;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const xFor = (value) => left + (Math.max(0, Math.min(100, Number(value))) / 100) * innerWidth;
  const yFor = (value) => top + (Math.max(0, Math.min(100, Number(value))) / 100) * innerHeight;

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
          右ほど予報の負担が高く、下ほど実際につらかった日です。点を押すと日付を確認できます。
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="予報と実感の比較マップ">
        <rect x={left} y={top} width={innerWidth / 2} height={innerHeight / 2} fill="#F4FAF7" />
        <rect x={left + innerWidth / 2} y={top} width={innerWidth / 2} height={innerHeight / 2} fill="#FFF9ED" />
        <rect x={left} y={top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#FFF4F1" />
        <rect x={left + innerWidth / 2} y={top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#F8F4FA" />
        <line x1={left + innerWidth / 2} x2={left + innerWidth / 2} y1={top} y2={top + innerHeight} stroke="#DCE8DD" strokeDasharray="5 5" />
        <line x1={left} x2={left + innerWidth} y1={top + innerHeight / 2} y2={top + innerHeight / 2} stroke="#DCE8DD" strokeDasharray="5 5" />

        <text x={left + 8} y={top + 17} fontSize="10" fontWeight="800" fill="#7B8C85">安定していた日</text>
        <text x={left + innerWidth / 2 + 8} y={top + 17} fontSize="10" fontWeight="800" fill="#A56C18">予報より穏やかな日</text>
        <text x={left + 8} y={top + innerHeight / 2 + 17} fontSize="10" fontWeight="800" fill="#B75C3E">想定よりゆらいだ日</text>
        <text x={left + innerWidth / 2 + 8} y={top + innerHeight / 2 + 17} fontSize="10" fontWeight="800" fill="#7B6588">注意が必要だった日</text>

        {points.map((point, index) => {
          const meta = COMPARISON_META[point.comparison] || COMPARISON_META.aligned;
          const duplicateOffset = ((index % 5) - 2) * 3;
          const cx = xFor(point.forecast) + duplicateOffset;
          const cy = yFor(point.actual) + (((index * 3) % 5) - 2) * 2;
          const active = selected?.date === point.date;
          return (
            <g key={point.date} className="cursor-pointer" onClick={() => setSelectedDate(point.date)}>
              {active ? <circle cx={cx} cy={cy} r="10" fill="none" stroke={meta.color} strokeWidth="2" opacity="0.35" /> : null}
              <circle
                cx={cx}
                cy={cy}
                r="6"
                fill={point.care_done ? meta.color : "#FFFFFF"}
                stroke={meta.color}
                strokeWidth="2.5"
              />
              <title>{`${point.date} ${meta.label}${point.care_done ? "・ケアあり" : "・ケアなし"}`}</title>
            </g>
          );
        })}

        <text x={left + innerWidth / 2} y={height - 12} textAnchor="middle" fontSize="10" fontWeight="800" fill="#94A3B8">
          予報ゆらぎ度　低い ←　→ 高い
        </text>
        <text transform={`translate(15 ${top + innerHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="800" fill="#94A3B8">
          実際の体調　よい ←　→ つらい
        </text>
      </svg>

      <div className="flex flex-wrap gap-2 border-t border-[#EEF3EF] px-4 py-3 text-[9px] font-black text-slate-500">
        {Object.entries(COMPARISON_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}
          </span>
        ))}
        <span className="ml-auto">塗りつぶし＝ケアあり</span>
      </div>

      {selected ? (
        <div className="m-3 mt-0 rounded-[18px] bg-[#F7FAF8] px-4 py-3 ring-1 ring-[#E8F0EB]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black text-slate-900">{shortDate(selected.date)}の記録</div>
              <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">
                {COMPARISON_META[selected.comparison]?.label}・実感は{conditionLabel(selected.actual === 0 ? 2 : selected.actual === 50 ? 1 : 0)}
                {selected.domains.length ? `・${selected.domains.map(domainLabel).join("・")}` : "・ケアなし"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectDate?.(selected.date)}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]"
            >
              この日を見る
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
