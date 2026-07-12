"use client";

import { useMemo, useState } from "react";
import {
  buildForecastPatternGroups,
  careTimingLabel,
  domainLabel,
  signalLabel,
} from "@/lib/records/analysis";

const PATTERN_META = {
  attention_good: {
    eyebrow: "いたわり・守り × ○",
    title: "注意予報でも穏やか",
    description: "ケアや生活の土台を、次も比べたい日",
    surface: "bg-[#F2FAF6]",
    ring: "ring-[#BFDCCE]",
    ink: "text-[#2F816E]",
  },
  attention_difficult: {
    eyebrow: "いたわり・守り × △・×",
    title: "注意予報でつらさあり",
    description: "負担とケアの種類・時刻を見直す日",
    surface: "bg-[#FFF7EC]",
    ring: "ring-[#E9D0A8]",
    ink: "text-[#9B6417]",
  },
  stable_good: {
    eyebrow: "安定 × ○",
    title: "安定予報どおり穏やか",
    description: "無理なく過ごせた土台を残す日",
    surface: "bg-[#F7FAF8]",
    ring: "ring-[#D7E4DB]",
    ink: "text-slate-600",
  },
  stable_difficult: {
    eyebrow: "安定 × △・×",
    title: "安定予報でもつらさあり",
    description: "天気以外の負担も一緒に見る日",
    surface: "bg-[#FFF2EE]",
    ring: "ring-[#EBC7BA]",
    ink: "text-[#A6513A]",
  },
};

function shortDate(value) {
  const [, month, day] = String(value || "").split("-");
  return `${Number(month)}/${Number(day)}`;
}

function actualSymbol(severity) {
  if (severity === 0) return "○";
  if (severity === 1) return "△";
  if (severity === 2) return "×";
  return "";
}

export default function ForecastPatternCards({ rows = [], onSelectDate }) {
  const groups = useMemo(() => buildForecastPatternGroups(rows), [rows]);
  const defaultKey = useMemo(
    () => groups.find((group) => group.days > 0)?.key || "attention_good",
    [groups]
  );
  const [selectedKey, setSelectedKey] = useState("");
  const activeKey = groups.some((group) => group.key === selectedKey && group.days > 0)
    ? selectedKey
    : defaultKey;
  const activeGroup = groups.find((group) => group.key === activeKey) || groups[0];
  const comparableDays = groups.reduce((sum, group) => sum + group.days, 0);
  const visiblePoints = activeGroup?.points?.slice(-12).reverse() || [];

  if (!comparableDays) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-5 text-center text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        予報と記録が同じ日にそろうと、4つの振り返りパターンが表示されます。
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[26px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_16px_34px_-30px_rgba(15,23,42,0.34)]">
      <div className="border-b border-[#EEF3EF] px-4 py-3">
        <div className="text-[13px] font-black text-slate-900">4つの振り返りパターン</div>
        <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">
          予報は症状の断定ではなく、備えの目安です。実感との組み合わせから、次に比べたい日を見つけます。
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {groups.map((group) => {
          const meta = PATTERN_META[group.key];
          const selected = group.key === activeKey;
          return (
            <button
              key={group.key}
              type="button"
              disabled={!group.days}
              onClick={() => group.days && setSelectedKey(group.key)}
              className={[
                "min-h-[138px] rounded-[20px] p-3 text-left ring-1 transition-all",
                meta.surface,
                selected ? `${meta.ring} shadow-[0_12px_24px_-20px_rgba(15,23,42,0.48)] ring-2` : meta.ring,
                group.days ? "active:scale-[0.99]" : "opacity-45",
              ].join(" ")}
            >
              <div className={["text-[8px] font-black tracking-[0.08em]", meta.ink].join(" ")}>{meta.eyebrow}</div>
              <div className="mt-1 text-[12px] font-black leading-5 text-slate-800">{meta.title}</div>
              <div className={["mt-1 text-[22px] font-black", meta.ink].join(" ")}>{group.days}日</div>
              <div className="mt-1 text-[9px] font-bold leading-4 text-slate-500">ケアあり {group.care_days}日・なし {group.no_care_days}日</div>
            </button>
          );
        })}
      </div>

      {activeGroup?.days ? (
        <div className="m-3 mt-0 rounded-[20px] bg-[#F7FAF8] px-4 py-3 ring-1 ring-[#E8F0EB]">
          <div className="text-[10px] font-black text-slate-900">{PATTERN_META[activeGroup.key].title}</div>
          <div className="mt-1 text-[9px] font-bold leading-4 text-slate-500">{PATTERN_META[activeGroup.key].description}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePoints.map((point) => {
              const care = point.care_done
                ? point.domains.map(domainLabel).join("・") || "ケアあり"
                : "ケアなし";
              const timing = point.care_timing ? careTimingLabel(point.care_timing) : "";
              return (
                <button
                  key={point.date}
                  type="button"
                  onClick={() => onSelectDate?.(point.date)}
                  className="rounded-[16px] bg-white px-3 py-2 text-left ring-1 ring-[#DCE8DD]"
                >
                  <div className="text-[9px] font-black text-slate-700">
                    {shortDate(point.date)}・{signalLabel(point.forecast_severity)}・{actualSymbol(point.actual_severity)}
                  </div>
                  <div className="mt-0.5 text-[8px] font-bold text-slate-400">{care}{timing ? `・${timing}` : ""}</div>
                </button>
              );
            })}
          </div>
          {activeGroup.points.length > visiblePoints.length ? (
            <div className="mt-2 text-[8px] font-bold text-slate-400">直近12日を表示・ほか{activeGroup.points.length - visiblePoints.length}日</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
