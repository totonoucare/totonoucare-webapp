// app/page.js
"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import { getCoreLabel, getSubLabels } from "@/lib/diagnosis/v2/labels";
import {
  HeroTitleMark,
  HomeHeaderMenu,
} from "@/components/illust/home";
import HeroGuideBot from "@/components/illust/home/HeroGuideBot";
import { IconRadar, IconBolt, IconCompass } from "@/components/illust/icons/result";
import { CoreIllust } from "@/components/illust/core";
import { WeatherIcon } from "@/components/illust/icons/weather";
import { getDisplayableLocationName } from "@/lib/radar_v1/locationDisplay";

const SESSION_TIMEOUT_MS = 5000;

// ★ 共通コンポーネント化された背景モチーフ
function HeroBgArt() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[48%] overflow-hidden">
      <svg
        viewBox="0 0 260 220"
        className="absolute -right-9 top-2 h-[218px] w-[260px]"
        aria-hidden="true"
      >
        <circle cx="154" cy="86" r="54" fill="#E8D59A" opacity="0.18" />
        <circle cx="154" cy="86" r="81" fill="none" stroke="#D8C58E" strokeWidth="1.4" strokeOpacity="0.22" />
        <circle cx="154" cy="86" r="118" fill="none" stroke="#D8C58E" strokeWidth="1.2" strokeOpacity="0.14" />
        <circle cx="154" cy="86" r="41" fill="none" stroke="#5C9F88" strokeWidth="1.3" strokeOpacity="0.18" />
        <path
          d="M48 92 A108 108 0 0 1 211 25"
          fill="none"
          stroke="#5C9F88"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeOpacity="0.2"
        />
        <path
          d="M64 129 A90 90 0 0 1 225 95"
          fill="none"
          stroke="#D2A43A"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeOpacity="0.28"
        />
        <circle cx="214" cy="91" r="4.6" fill="#D2A43A" opacity="0.2" />
        <circle cx="111" cy="138" r="3.3" fill="#5C9F88" opacity="0.22" />
        <path
          d="M118 188 C 139 175, 174 175, 195 188"
          fill="none"
          stroke="#5C9F88"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.12"
        />
      </svg>
    </div>
  );
}

function IconChevron({ className = "h-4 w-4", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconJournalCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="4" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="3" width="16" height="18" rx="4" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function IconCheckCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 12.5l2.5 2.5 5-5" strokeWidth="2.5" />
    </svg>
  );
}

function IconHistoryCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconReportCard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="4" height="6" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="10" y="9" width="4" height="11" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="14" width="4" height="6" rx="1.5" />
      <rect x="10" y="9" width="4" height="11" rx="1.5" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

function getJstDateString(offsetDays = 0) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000 + offsetDays * 24 * 60 * 60000);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, "0");
  const d = String(jst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatYmdJP(ymd) {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function signalText(signal) {
  if (signal === 2) return "守りモード";
  if (signal === 1) return "いたわりモード";
  return "安定モード";
}

function signalBadge(signal) {
  if (signal === 2) return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (signal === 1) return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  if (signal === 1) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
  return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
}

function signalCardBg(signal) {
  if (signal === 2) return "bg-[#FFF1F3] ring-rose-200";
  if (signal === 1) return "bg-[#FFF5DE] ring-amber-200";
  return "bg-[#ECF8F1] ring-emerald-200";
}

function signalScoreTextClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-amber-700";
  return "text-emerald-700";
}

function signalDecorClass(signal) {
  if (signal === 2) return "bg-rose-200/25 border-rose-200/40";
  if (signal === 1) return "bg-amber-200/28 border-amber-200/45";
  return "bg-emerald-200/26 border-emerald-200/40";
}

function triggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え込み";
  if (mainTrigger === "temp" && triggerDir === "up") return "気温上昇";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿気";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function exactTriggerKey(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return "pressure_down";
}

function compatFromExact(exact) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
  if (exact === "damp") return { main_trigger: "humidity", trigger_dir: "up" };
  if (exact === "dry") return { main_trigger: "humidity", trigger_dir: "down" };
  return { main_trigger: "pressure", trigger_dir: "down" };
}

function getForecastSnapshot(forecast) {
  return forecast?.computed?.forecast_snapshot || null;
}

function getRiskSummaryFromForecast(forecast) {
  return forecast?.computed?.radar_plan_meta?.risk_context?.summary || null;
}

function getForecastTriggerKey(forecast) {
  if (!forecast) return "pressure_down";
  const snapshot = getForecastSnapshot(forecast);
  const riskSummary = getRiskSummaryFromForecast(forecast);
  return (
    forecast.personal_main_trigger_exact ||
    snapshot?.personal_main_trigger_exact ||
    riskSummary?.main_trigger_exact ||
    exactTriggerKey(forecast.main_trigger, forecast.trigger_dir)
  );
}

function normalizeForecastTriggerFactor(item, index, forecast) {
  const exact = item?.exact || item?.key || null;
  const compat = exact ? compatFromExact(exact) : {
    main_trigger: item?.main_trigger || forecast?.main_trigger,
    trigger_dir: item?.trigger_dir || forecast?.trigger_dir,
  };
  const key = exact || exactTriggerKey(compat.main_trigger, compat.trigger_dir);

  return {
    key,
    exact: key,
    role: item?.role || (index === 0 ? "primary" : "secondary"),
    main_trigger: item?.main_trigger || compat.main_trigger,
    trigger_dir: item?.trigger_dir || compat.trigger_dir,
    label: triggerLabel(item?.main_trigger || compat.main_trigger, item?.trigger_dir || compat.trigger_dir),
  };
}

function getForecastTriggerFactors(forecast) {
  if (!forecast) return [];

  const snapshot = getForecastSnapshot(forecast);
  const riskSummary = getRiskSummaryFromForecast(forecast);
  const raw =
    (Array.isArray(forecast.trigger_factors) && forecast.trigger_factors.length ? forecast.trigger_factors : null) ||
    (Array.isArray(snapshot?.trigger_factors) && snapshot.trigger_factors.length ? snapshot.trigger_factors : null) ||
    (Array.isArray(riskSummary?.trigger_factors) && riskSummary.trigger_factors.length ? riskSummary.trigger_factors : null) ||
    null;

  if (raw) {
    return raw.slice(0, 2).map((item, index) => normalizeForecastTriggerFactor(item, index, forecast));
  }

  const primary = getForecastTriggerKey(forecast);
  const secondary =
    forecast.personal_secondary_trigger_exact ||
    snapshot?.personal_secondary_trigger_exact ||
    riskSummary?.secondary_trigger_exact ||
    riskSummary?.personal_secondary_trigger_exact ||
    null;
  const factors = [normalizeForecastTriggerFactor({ exact: primary, role: "primary" }, 0, forecast)];

  if (secondary && secondary !== primary) {
    factors.push(normalizeForecastTriggerFactor({ exact: secondary, role: "secondary" }, 1, forecast));
  }

  return factors.slice(0, 2);
}


function formatPeakWindow(forecast) {
  const start = String(forecast?.peak_start || "").slice(0, 5);
  const end = String(forecast?.peak_end || "").slice(0, 5);
  if (start && end) return `${start}–${end}`;
  if (start) return `${start}ごろ`;
  return "まだ目立った山場なし";
}

function buildQuickLiveAdvice(forecast) {
  const factor = getForecastTriggerFactors(forecast)[0];
  const key = factor?.key || exactTriggerKey(forecast?.main_trigger, forecast?.trigger_dir);
  const prefix = forecast?.signal === 2 ? "今日は早めに" : forecast?.signal === 1 ? "今日はこまめに" : "今日は軽く";

  if (key === "pressure_down") return `${prefix}、首肩と耳まわりをゆるめて予定を詰めすぎないで。`;
  if (key === "pressure_up") return `${prefix}、息を吐く時間を長めにして力みを抜いて。`;
  if (key === "cold") return `${prefix}、首・お腹・足首を冷やさないようにして。`;
  if (key === "heat") return `${prefix}、こもる前に水分と休憩を先に入れて。`;
  if (key === "damp") return `${prefix}、重さを感じる前に軽く動いてめぐりを作って。`;
  if (key === "dry") return `${prefix}、のど・肌・目の乾きを放置しないで。`;
  return `${prefix}、無理を詰め込まず余白を残して。`;
}

function buildLiveGuideText(bundle) {
  if (!bundle?.ok || !bundle?.forecast) return "今日ここからの気象負担を確認しています。";

  const forecast = bundle.forecast;
  const peak = formatPeakWindow(forecast);
  const factor = getForecastTriggerFactors(forecast)[0];
  const label = factor?.label || triggerLabel(forecast.main_trigger, forecast.trigger_dir);

  if (forecast.signal === 2) {
    return `今日ここからは${peak}が山場かも。${label}に合わせて、無理を一段落としていこう。`;
  }
  if (forecast.signal === 1) {
    return `今日ここからは${peak}を少し意識してね。${label}の波を早めに逃がそう。`;
  }
  return `今日ここからは大きな波は小さめ。${label}だけ軽く見ておけば大丈夫そう。`;
}


function modeActionLabel(signal) {
  if (signal === 2) return "守りを固める日";
  if (signal === 1) return "早めに整える日";
  return "いつも通りで大丈夫";
}

function buildFixedGuideText(bundle) {
  if (!bundle?.ok || !bundle?.forecast) return "今日の未病予報を確認しています。";

  const forecast = bundle.forecast;
  const factor = getForecastTriggerFactors(forecast)[0];
  const label = factor?.label || triggerLabel(forecast.main_trigger, forecast.trigger_dir);

  if (forecast.signal === 2) {
    return `今日は守りモード。${label}に備えて、予定は詰めすぎず余白を残そう。`;
  }
  if (forecast.signal === 1) {
    return `今日はいたわりモード。${label}を早めに逃がせるように、こまめに整えよう。`;
  }
  return `今日は安定モード。${label}だけ軽く見ながら、いつものペースで大丈夫。`;
}

function modeStyle(signal) {
  if (signal === 2) {
    return {
      shell: "bg-[linear-gradient(135deg,#FFF4EF_0%,#FFE8DF_100%)] ring-[#F4B9A8]",
      panel: "bg-white/72 ring-[#F1C7B8]",
      chip: "bg-white/82 text-[#9B4E3B] ring-[#EFC2B5]",
      text: "text-[#9B4E3B]",
      track: "bg-[#F7D8CE]",
      fill: "bg-[linear-gradient(90deg,#F6B39F_0%,#E96F59_100%)]",
      glow: "shadow-[0_10px_24px_-12px_rgba(233,111,89,0.58)]",
    };
  }
  if (signal === 1) {
    return {
      shell: "bg-[linear-gradient(135deg,#FFF9EA_0%,#FFEFC7_100%)] ring-[#E9D39A]",
      panel: "bg-white/72 ring-[#E7D4A4]",
      chip: "bg-white/82 text-[#9A6A12] ring-[#E8D19A]",
      text: "text-[#9A6A12]",
      track: "bg-[#F2DEA9]",
      fill: "bg-[linear-gradient(90deg,#F6D77A_0%,#E8A92E_100%)]",
      glow: "shadow-[0_10px_24px_-12px_rgba(232,169,46,0.52)]",
    };
  }
  return {
    shell: "bg-[linear-gradient(135deg,#EFFBF6_0%,#DFF4EB_100%)] ring-[#BFDCCE]",
    panel: "bg-white/72 ring-[#C8DED3]",
    chip: "bg-white/82 text-[#2E6B5A] ring-[#C4DDD2]",
    text: "text-[#2E6B5A]",
    track: "bg-[#CDE8DC]",
    fill: "bg-[linear-gradient(90deg,#84D6BE_0%,#37A987_100%)]",
    glow: "shadow-[0_10px_24px_-12px_rgba(55,169,135,0.54)]",
  };
}

function scoreToPercent(score) {
  const value = Number(score ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value * 10));
}

function MiniGuideBotMarker({ signal = 0 }) {
  const darkGreen = "#3a5c4b";
  let eyes = (
    <>
      <circle cx="46" cy="63" r="3.8" fill={darkGreen} />
      <circle cx="74" cy="63" r="3.8" fill={darkGreen} />
    </>
  );
  let mouth = <path d="M54 72 C 58 75, 62 75, 66 72" fill="none" stroke={darkGreen} strokeWidth="2.2" strokeLinecap="round" />;
  let accessory = null;

  if (signal === 1) {
    mouth = <path d="M54 72 C 58 71, 62 71, 66 72" fill="none" stroke={darkGreen} strokeWidth="2.2" strokeLinecap="round" />;
  } else if (signal === 2) {
    eyes = (
      <>
        <path d="M42 64 Q 46 61 50 64" fill="none" stroke={darkGreen} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M70 64 Q 74 61 78 64" fill="none" stroke={darkGreen} strokeWidth="2.4" strokeLinecap="round" />
      </>
    );
    mouth = <path d="M54 73 C 58 70, 62 70, 66 73" fill="none" stroke={darkGreen} strokeWidth="2.2" strokeLinecap="round" />;
    accessory = <path d="M83 53 Q 86 58 83 61 Q 80 58 83 53 Z" fill="#90b1e0" opacity="0.78" />;
  }

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-sm" aria-hidden="true">
      <defs>
        <linearGradient id={`miniHeadGrad-${signal}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef7f2" />
        </linearGradient>
      </defs>
      <path d="M60 40 L60 29" stroke="#6eab90" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 29 C53 22, 57 16, 64 16 C71 16, 69 25, 60 29 Z" fill="#8fc7aa" />
      <rect x="29" y="43" width="62" height="45" rx="20" fill={`url(#miniHeadGrad-${signal})`} stroke="#d9e8df" strokeWidth="1.1" />
      <ellipse cx="40" cy="70" rx="4.8" ry="3" fill="#d69e9e" opacity="0.65" />
      <ellipse cx="80" cy="70" rx="4.8" ry="3" fill="#d69e9e" opacity="0.65" />
      {eyes}
      {mouth}
      {accessory}
    </svg>
  );
}

function ForecastBar({ forecast }) {
  const signal = forecast?.signal ?? 0;
  const score = forecast?.score_0_10 ?? 0;
  const percent = scoreToPercent(score);
  const style = modeStyle(signal);

  return (
    <div className="relative pt-7 pb-2">
      <div className={["h-3 overflow-hidden rounded-full", style.track].join(" ")}>
        <div className={["h-full rounded-full transition-all duration-500", style.fill].join(" ")} style={{ width: `${percent}%` }} />
      </div>
      <div
        className={["absolute top-0 grid h-10 w-10 -translate-x-1/2 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-white/80", style.glow].join(" ")}
        style={{ left: `${Math.max(7, Math.min(93, percent))}%` }}
      >
        <MiniGuideBotMarker signal={signal} />
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-black tracking-widest text-slate-400">
        <span>安定</span>
        <span>いたわり</span>
        <span>守り</span>
      </div>
    </div>
  );
}

function ForecastDayStrip({ label, dateLabel, bundle, loading, onClick }) {
  if (loading) {
    return (
      <div className="rounded-[24px] bg-white/70 p-4 ring-1 ring-white/70 shadow-sm">
        <div className="h-28 animate-pulse rounded-[20px] bg-slate-100/90" />
      </div>
    );
  }

  if (!bundle?.ok || !bundle?.forecast) {
    const message = bundle?.error?.includes("No radar location")
      ? "地域を設定すると予報を出せます。"
      : (bundle?.error || "予報を読み込めませんでした。");

    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-[24px] bg-white/70 p-4 text-left ring-1 ring-white/70 shadow-sm transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-black text-slate-900">{label}</div>
            <div className="mt-0.5 text-[10px] font-extrabold text-slate-500">{dateLabel}</div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">未設定</span>
        </div>
        <div className="mt-3 text-[12px] font-bold leading-5 text-slate-600">{message}</div>
      </button>
    );
  }

  const forecast = bundle.forecast;
  const signal = forecast.signal ?? 0;
  const style = modeStyle(signal);
  const factors = getForecastTriggerFactors(forecast);

  return (
    <button
      type="button"
      onClick={onClick}
      className={["w-full rounded-[24px] p-4 text-left ring-1 shadow-[0_14px_30px_-24px_rgba(37,95,79,0.34)] transition-all hover:-translate-y-0.5 active:scale-[0.98]", style.panel].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-black text-slate-900">{label}</div>
          <div className="mt-0.5 text-[10px] font-extrabold text-slate-500">{dateLabel}</div>
        </div>
        <span className={["rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ring-1", style.chip].join(" ")}>{signalText(signal)}</span>
      </div>

      <ForecastBar forecast={forecast} />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {factors.map((factor, index) => (
          <span key={`${label}-${factor.key}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-black text-slate-700 ring-1 ring-black/5 shadow-sm">
            <WeatherIcon triggerKey={factor.key} className="h-4 w-4" />
            {factor.label}
          </span>
        ))}
      </div>
    </button>
  );
}

function ForecastOverviewCard({ todayBundle, tomorrowBundle, todayLoading, tomorrowLoading, onOpenRadar }) {
  const todayForecast = todayBundle?.forecast;
  const mainSignal = todayBundle?.ok ? (todayForecast?.signal ?? 0) : 0;
  const style = modeStyle(mainSignal);

  return (
    <Module className={["relative overflow-hidden p-6 ring-1 shadow-[0_18px_42px_-32px_rgba(37,95,79,0.34)]", style.shell].join(" ")}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={["grid h-9 w-9 place-items-center rounded-full bg-white/70 ring-1 shadow-sm", style.chip].join(" ")}>
            <IconRadar className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[18px] font-black tracking-tight text-slate-900">今日と明日の未病予報</div>
            <div className="mt-0.5 text-[11px] font-extrabold text-slate-600">体質×天気から、今日と明日の過ごし方を確認</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenRadar}>詳しく見る</Button>
      </div>

      <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2">
        <ForecastDayStrip
          label="今日"
          dateLabel={formatYmdJP(getJstDateString(0))}
          bundle={todayBundle}
          loading={todayLoading}
          onClick={onOpenRadar}
        />
        <ForecastDayStrip
          label="明日"
          dateLabel={formatYmdJP(getJstDateString(1))}
          bundle={tomorrowBundle}
          loading={tomorrowLoading}
          onClick={onOpenRadar}
        />
      </div>
    </Module>
  );
}

function ActionTile({ icon, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] bg-white p-5 text-left ring-1 ring-inset ring-[#CFE0D3] shadow-[0_16px_32px_-24px_rgba(37,95,79,0.34)] transition-all hover:-translate-y-0.5 hover:bg-[#FBFCF8] hover:shadow-[0_18px_36px_-22px_rgba(37,95,79,0.38)] active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC] shadow-sm transition-transform group-hover:scale-105">
          {icon}
        </div>
        <IconChevron className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-4 text-[15px] font-black tracking-tight text-slate-950">{title}</div>
      <div className="mt-1 text-[12px] font-extrabold leading-5 text-slate-600">{sub}</div>
    </button>
  );
}


function PersonalKarteSpotlight({ core, coreCode, subs = [], onPrimary, onSecondary }) {
  const hasResult = Boolean(core);
  const primaryLabel = hasResult ? "カルテを開く" : "体質チェックから作る";
  const primarySub = hasResult
    ? "体質・天気・ツボ・食養生をつなげて見返せます。"
    : "体質チェック後に、あなた専用のカルテ導線が表示されます。";

  return (
    <Module className="relative overflow-hidden p-6 bg-[linear-gradient(135deg,#F7FBF8_0%,#FFF9EA_100%)] ring-1 ring-[#D3E1D5] shadow-[0_20px_48px_-34px_rgba(37,95,79,0.38)]">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#F4D68A]/35 blur-2xl" />
      <div className="pointer-events-none absolute right-8 bottom-4 h-24 w-24 rounded-full border border-[#D8C58E]/35" />

      <div className="relative z-10 flex items-start gap-4">
        <div className="grid h-[82px] w-[82px] shrink-0 place-items-center overflow-hidden rounded-[24px] bg-white p-2 ring-1 ring-[#CFE0D3] shadow-[0_14px_30px_-22px_rgba(37,95,79,0.36)]">
          {hasResult ? (
            <CoreIllust
              code={coreCode}
              title={core?.title || "体質タイプ"}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-[18px] bg-[#EEF6F0] text-[34px] ring-1 ring-[#D3E1D5]">
              🌿
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black tracking-widest text-[#8A6417] ring-1 ring-[#E9D8A9] shadow-sm">
            PERSONAL KARTE
          </div>
          <h2 className="mt-3 text-[24px] font-black tracking-tight text-slate-950 leading-[1.25]">
            あなた専用の未病カルテ
          </h2>
          <p className="mt-2 text-[13px] font-extrabold leading-6 text-slate-600">
            {primarySub}
          </p>

          {hasResult ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-white/85 px-2.5 py-1 text-[11px] font-black text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-sm">
                {core.title}
              </span>
              {subs.slice(0, 2).map((sub) => (
                <span
                  key={sub.code}
                  className="rounded-lg bg-white/70 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-[#E3EAE5] shadow-sm"
                >
                  {sub.short}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[#E3EAE5] shadow-sm">
          <div className="text-[11px] font-black text-slate-900">崩れ方のクセ</div>
          <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">いつ・どこに出やすいかを整理</div>
        </div>
        <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[#E3EAE5] shadow-sm">
          <div className="text-[11px] font-black text-slate-900">天気との相性</div>
          <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">響きやすい要素を見返せる</div>
        </div>
        <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[#E3EAE5] shadow-sm">
          <div className="text-[11px] font-black text-slate-900">ケアの使い方</div>
          <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">予報ページとのつなぎ方まで</div>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onPrimary} className="w-full py-4 shadow-md sm:flex-1">
          {primaryLabel}
        </Button>
        <Button variant="secondary" onClick={onSecondary} className="w-full bg-white py-4 shadow-sm sm:flex-1">
          {hasResult ? "体質結果も見る" : "使い方を見る"}
        </Button>
      </div>
    </Module>
  );
}

function ForecastMiniCard({ title, bundle, loading, onClick, errorOnClick = onClick, eyebrow = "気になりやすい変化", scoreLabel = "目安スコア", memo = null, ctaLabel = "体調予報を開く" }) {
  if (loading) {
    return (
      <div className="rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[#CFE0D3] shadow-[0_16px_32px_-24px_rgba(37,95,79,0.30)]">
        <div className="h-36 animate-pulse rounded-[22px] bg-slate-100" />
      </div>
    );
  }

  if (!bundle?.ok) {
    const message = bundle?.error?.includes("No radar location")
      ? "地域を設定すると、予報を出せます。"
      : (bundle?.error || "予報を読み込めませんでした。");

    return (
      <div className="rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[#CFE0D3] shadow-[0_16px_32px_-24px_rgba(37,95,79,0.30)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-black tracking-tight text-slate-900">{title}</div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-500">未設定</span>
          </div>
          <div className="mt-3 text-[13px] font-bold leading-6 text-slate-600">{message}</div>
        </div>
        <Button className="mt-4 w-full shadow-sm" variant="secondary" onClick={errorOnClick}>
          {ctaLabel}
        </Button>
      </div>
    );
  }

  const forecast = bundle.forecast || {};
  const location = bundle.location || {};
  const score = forecast.score_0_10 ?? 0;
  const triggerFactors = getForecastTriggerFactors(forecast);

  const CardTag = onClick ? "button" : "div";

  return (
    <CardTag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "relative overflow-hidden w-full rounded-[24px] p-5 text-left ring-1 ring-inset shadow-[0_16px_32px_-24px_rgba(47,111,98,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_-22px_rgba(47,111,98,0.36)] active:scale-[0.98] group",
        signalCardBg(forecast.signal) || "bg-white ring-[var(--ring)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={[
          "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
        <div className={[
          "absolute right-8 top-12 h-28 w-28 rounded-full border",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
        <div className={[
          "absolute right-16 top-4 h-20 w-20 rounded-full border",
          signalDecorClass(forecast.signal),
        ].join(" ")} />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-black tracking-tight text-slate-950">{title}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-slate-600">
            <IconPin />
            {getDisplayableLocationName(location, "地域未設定")}
          </div>
        </div>
        <span className={[
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm",
          signalBadge(forecast.signal),
        ].join(" ")}>
          <span className={["h-2 w-2 rounded-full", signalDotClass(forecast.signal)].join(" ")} />
          {signalText(forecast.signal)}
        </span>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{eyebrow}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {triggerFactors.map((factor, index) => (
              <div
                key={`${factor.key}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-2.5 py-1.5 text-[12px] font-black text-slate-800 ring-1 ring-black/5 shadow-sm"
              >
                <span className="text-[var(--accent-ink)] opacity-95">
                  <WeatherIcon triggerKey={factor.key} className="h-5 w-5" />
                </span>
                <span>{factor.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{scoreLabel}</div>
          <div className="flex items-end justify-end gap-1 leading-none">
            <span className={["text-[42px] font-black tracking-[-0.04em]", signalScoreTextClass(forecast.signal)].join(" ")}>{score}</span>
            <span className="pb-1 text-[16px] font-black text-slate-400">/10</span>
          </div>
        </div>
      </div>

      {memo ? (
        <div className="relative z-10 mt-4 rounded-[18px] bg-white/72 px-4 py-3 text-[12px] font-extrabold leading-5 text-slate-600 ring-1 ring-black/5 shadow-sm">
          {memo}
        </div>
      ) : null}

      {onClick ? (
        <div className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100 text-slate-400">
          <IconChevron />
        </div>
      ) : null}
    </CardTag>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState(null);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);
  const [todayBundle, setTodayBundle] = useState(null);
  const [tomorrowBundle, setTomorrowBundle] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  const isLoggedIn = !!session;

  async function authedFetch(path) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      router.replace("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        if (!supabase) {
          setSession(null);
          return;
        }
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          "getSession timeout"
        );
        setSession(data.session || null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession || null);
        });
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setSession(null);
      } finally {
        setLoadingSession(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session) {
        setTodayBundle(null);
        setTomorrowBundle(null);
        setLatestResult(null);
        setTodayLoading(false);
        setTomorrowLoading(false);
        setDashboardLoading(false);
        return;
      }

      const today = getJstDateString(0);
      const tomorrow = getJstDateString(1);

      setTodayLoading(true);
      setTomorrowLoading(true);

      async function loadFixedForecastCard(targetDate, setter, setLoading, label) {
        try {
          setLoading(true);
          // ホームは予報ページで作られた固定スナップショットを読むだけ。
          // リアルタイム予報や再計算はここでは走らせない。
          const bundle = await authedFetch(`/api/radar/v1/forecast?date=${targetDate}&cache_only=1`);
          if (cancelled) return;

          if (!bundle?.forecast) {
            setter({
              ok: false,
              error: `${label}の予報はまだ準備中です。未病予報ページで確認してください。`,
            });
          } else {
            setter(bundle);
          }
        } catch (e) {
          console.error(`${label} forecast card load failed:`, e);
          if (!cancelled) {
            setter({
              ok: false,
              error: e?.message || `${label}の予報を読み込めませんでした。`,
            });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      loadFixedForecastCard(today, setTodayBundle, setTodayLoading, "今日");
      loadFixedForecastCard(tomorrow, setTomorrowBundle, setTomorrowLoading, "明日");
      try {
        setDashboardLoading(true);
        const historyRes = await authedFetch(`/api/diagnosis/v2/events/list?limit=1`).catch(() => null);

        if (cancelled) return;

        setLatestResult(historyRes?.data?.[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  // ===== 未ログイン向け：公開気象リスク =====
  const [publicForecast, setPublicForecast] = useState(null);
  const [publicForecastLoading, setPublicForecastLoading] = useState(false);
  const [publicLocation, setPublicLocation] = useState({ key: "tokyo", label: "東京", lat: 35.68944, lon: 139.69167 });

  useEffect(() => {
    if (isLoggedIn) return;
    let cancelled = false;
    setPublicForecastLoading(true);

    (async () => {
      try {
        const { lat, lon } = publicLocation;
        const res = await fetch(`/api/radar/v1/forecast/public?lat=${lat}&lon=${lon}`);
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setPublicForecast(json?.ok ? json.forecast : null);
      } catch {
        if (!cancelled) setPublicForecast(null);
      } finally {
        if (!cancelled) setPublicForecastLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, publicLocation.key]);

  // ===== ===== =====

  const latestResultHref = latestResult?.source_event_id
    ? `/result/${encodeURIComponent(latestResult.source_event_id)}?from=history`
    : latestResult?.notes?.source_event_id
      ? `/result/${encodeURIComponent(latestResult.notes.source_event_id)}?from=history`
      : null;

  const latestKarteId = latestResult?.source_event_id || latestResult?.notes?.source_event_id || latestResult?.id || null;
  const latestKarteHref = latestKarteId ? `/karte/${encodeURIComponent(latestKarteId)}` : null;

  const core = latestResult?.core_code ? getCoreLabel(latestResult.core_code) : null;
  const subs = getSubLabels(latestResult?.sub_labels || []);

  if (loadingSession) {
    return (
      <AppShell title="ホーム" subtitle="読み込み中…" headerRight={<Button size="sm" variant="ghost" onClick={() => router.push("/guide")}>使い方</Button>}>
        <div className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
      </AppShell>
    );
  }

  /* ==============================================================
   * 未ログイン時（本物のUIを使ったデモ体験）
   * ============================================================== */
  if (!isLoggedIn) {
    const pf = publicForecast;
    const pfSignal = pf?.signal ?? 0;

    // ★ 未ログイン時のテキストもダッシュボードと統一
    const botMessages = {
      2: `今日は警戒の日。無理せず自分を甘やかす一日にしようね。`,
      1: `今日は少し波があるかも。こまめな休憩を意識してね。`,
      0: `今日はおだやかな日。自分のペースで進んでいこう！`,
    };
    const botMessage = publicForecastLoading
      ? "今日の気象リスクを確認中…"
      : (pf ? botMessages[pfSignal] : "今日の気象を読み込めませんでした。");

    const QUICK_PRESETS = [
      { key: "sapporo", label: "札幌", lat: 43.06417, lon: 141.34694 },
      { key: "sendai",  label: "仙台", lat: 38.26889, lon: 140.87194 },
      { key: "tokyo",   label: "東京", lat: 35.68944, lon: 139.69167 },
      { key: "nagoya",  label: "名古屋", lat: 35.18028, lon: 136.90667 },
      { key: "osaka",   label: "大阪", lat: 34.68639, lon: 135.52 },
      { key: "fukuoka", label: "福岡", lat: 33.60639, lon: 130.41806 },
    ];

    return (
      <AppShell
        title="ホーム"
        subtitle="未病レーダー"
        headerRight={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/guide")}
            className="font-extrabold text-slate-600 hover:bg-slate-100"
          >
            使い方
          </Button>
        }
      >
        {/* mb-8に広げてカードとの隙間を確保 */}
        <Module className="relative overflow-hidden rounded-[32px] bg-[#FBFCF8] px-8 pt-7 pb-6 ring-1 ring-[color:color-mix(in_srgb,var(--ring),white_14%)] shadow-[0_18px_36px_-22px_rgba(77,111,85,0.10)] mb-8">
          <HeroBgArt />

          <div className="relative z-[2] max-w-[420px]">
            <HeroTitleMark compact={false} className="max-w-full" />
          </div>

          <div className="relative z-[3] mt-5 flex items-center justify-between">
            <div className="relative w-full max-w-[240px] rounded-[20px] border border-[var(--ring)] bg-white px-4 py-3 text-left shadow-[0_10px_24px_-18px_rgba(77,111,85,0.24)]">
              <div className="absolute right-[-6px] top-[50%] h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-r border-t border-[var(--ring)] bg-white" />
              <div className="text-[13px] font-extrabold leading-6 text-slate-600">
                {botMessage}
              </div>
            </div>
            
            <div className="shrink-0 -mt-8 -mr-1">
              <HeroGuideBot compact showBubble={false} signal={publicForecastLoading ? 0 : pfSignal} />
            </div>
          </div>
        </Module>

        <Module className="px-6 pb-12 sm:max-w-[400px] sm:mx-auto">
          {/* mb-5に広げてタイトルとカード本体との余白を調整 */}
          <div className="mb-5 flex items-center justify-between">
            <div className="text-[15px] font-black tracking-tight text-slate-900">今日の気象リスク</div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl ring-1 ring-[#D3E1D5] shadow-sm relative z-20 hover:ring-[#BFD9CC]">
              <IconPin className="w-3.5 h-3.5 text-[#255F4F]" />
              <select
                value={publicLocation.key}
                onChange={(e) => {
                  const preset = QUICK_PRESETS.find((p) => p.key === e.target.value);
                  if (preset) setPublicLocation(preset);
                }}
                className="appearance-none bg-transparent text-[13px] font-black tracking-tight text-[#255F4F] outline-none pr-5 cursor-pointer relative z-10"
              >
                {QUICK_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              {/* ★ 矢印が下を向くように rotate-90 に変更 */}
              <IconChevron className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none rotate-90" />
            </div>
          </div>

          <ForecastMiniCard
            title={`今日 ${formatYmdJP(getJstDateString(0))}`}
            loading={publicForecastLoading}
            bundle={{
              ok: true,
              forecast: publicForecast,
              location: { display_name: publicLocation.label }
            }}
            onClick={() => router.push("/signup")}
          />

          {/* 体質チェックへの誘導 */}
          <div className="mt-6 rounded-[28px] border-2 border-dashed border-[#5C9F88]/40 bg-[#F4F9F6] p-6 text-center relative overflow-hidden transition-all hover:bg-[#EEF6F0]">
             <div className="text-[15px] font-black tracking-tight text-[#255F4F]">
               ＋ あなたの体質データを掛け合わせる
             </div>
             <p className="mt-3 text-[12px] font-bold text-[#5b6674] leading-relaxed">
               上記の気象リスクに、あなたの「崩れ方のクセ」を組み合わせることで、精度の高いパーソナル予報が完成します。
             </p>
             <div className="mt-5 grid gap-3">
               <Button onClick={() => router.push("/check")} className="py-4 shadow-md text-[14px] w-full">
                  無料で体質チェックをはじめる
               </Button>
               <Button variant="secondary" onClick={() => router.push("/signup")} className="py-4 shadow-sm text-[14px] w-full bg-white">
                  ログインする
               </Button>
             </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            <li className="flex items-center gap-2 text-[12px] font-bold text-slate-500 justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[var(--accent)]" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              体質チェック・ログイン後の体調予報は
              <span className="font-extrabold text-slate-700">ずっと無料</span>
            </li>
          </ul>
        </Module>
      </AppShell>
    );
  }

  /* ==============================================================
   * ログイン後（ダッシュボード）
   * ============================================================== */

  const targetSignal = !todayLoading && todayBundle?.ok ? (todayBundle.forecast?.signal ?? 0) : null;
  const guideBotText = targetSignal !== null
    ? buildFixedGuideText(todayBundle)
    : "今日の未病予報を確認しています。";

  return (
    <AppShell
      title="ホーム"
      subtitle="今日の未病予報と次の一歩"
      headerRight={
        <HomeHeaderMenu
          onGuide={() => router.push("/guide")}
          onRegionSettings={() => router.push("/radar")}
          onLogout={handleLogout}
        />
      }
    >
      {/* ヒーローヘッダー */}
      <Module className="relative overflow-hidden rounded-[32px] bg-[#FBFCF8] px-8 pt-7 pb-6 ring-1 ring-[color:color-mix(in_srgb,var(--ring),white_14%)] shadow-[0_18px_36px_-22px_rgba(77,111,85,0.10)] mb-8">
        <HeroBgArt />

        <div className="relative z-[2] max-w-[420px]">
          <HeroTitleMark compact={false} className="max-w-full" />
        </div>

        <div className="relative z-[3] mt-5 flex items-center justify-between">
          <div className="relative w-full max-w-[240px] rounded-[20px] border border-[var(--ring)] bg-white px-4 py-3 text-left shadow-[0_10px_24px_-18px_rgba(77,111,85,0.24)]">
            <div className="absolute right-[-6px] top-[50%] h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-r border-t border-[var(--ring)] bg-white" />
            <div className="text-[13px] font-extrabold leading-6 text-slate-600">
              {guideBotText}
            </div>
          </div>
          
          <div className="shrink-0 -mt-8 -mr-1">
            <HeroGuideBot compact showBubble={false} signal={targetSignal ?? 0} />
          </div>
        </div>
      </Module>

      {/* 今日 / 明日の固定予報 */}
      <ForecastOverviewCard
        todayBundle={todayBundle}
        tomorrowBundle={tomorrowBundle}
        todayLoading={Boolean(session) && (todayLoading || !todayBundle)}
        tomorrowLoading={Boolean(session) && (tomorrowLoading || !tomorrowBundle)}
        onOpenRadar={() => router.push("/radar")}
      />

      <PersonalKarteSpotlight
        core={core}
        coreCode={latestResult?.core_code}
        subs={subs}
        onPrimary={() => router.push(latestKarteHref || "/check")}
        onSecondary={() => router.push(latestResultHref || "/guide")}
      />

      {/* 次にやること */}
      <Module className="p-6 bg-white ring-1 ring-[#D3E1D5] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.32)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FFF3D8] text-[#A16E16] ring-1 ring-[#E9D8A9] shadow-sm">
            <IconBolt className="h-5 w-5" />
          </span>
          <div className="text-[18px] font-black tracking-tight text-slate-900">次にやること</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionTile
            icon={<IconJournalCard />}
            title="記録カレンダー（開発中）"
            sub="体調メモと振り返り機能は準備中です。"
            onClick={() => router.push("/records?tab=calendar")}
          />
          <ActionTile
            icon={<IconCheckCard />}
            title="体質結果を見る"
            sub={core ? `${core.title} を確認する` : "最新の体質チェック結果を見る"}
            onClick={() => router.push(latestResultHref || "/check")}
          />
          <ActionTile
            icon={<IconJournalCard />}
            title="未病カルテを見返す"
            sub={latestKarteHref ? "体質の説明書を開く" : "体質チェック後に作成できます"}
            onClick={() => router.push(latestKarteHref || "/check")}
          />
          <ActionTile
            icon={<IconHistoryCard />}
            title="履歴を見る"
            sub="過去の結果を一覧で見返す。"
            onClick={() => router.push("/history")}
          />
          <ActionTile
            icon={<IconReportCard />}
            title="週次レポート（開発中）"
            sub="1週間の傾向を振り返る機能を準備中です。"
            onClick={() => router.push("/records?tab=report")}
          />
        </div>
      </Module>

      {/* あなたの体質 */}
      <Module className="p-6 bg-white ring-1 ring-[#D3E1D5] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
             <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC] shadow-sm">
               <IconCompass className="h-5 w-5" />
             </span>
            <div className="text-[18px] font-black tracking-tight text-slate-900">あなたの体質</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(latestResultHref || "/check")}>結果を見る</Button>
        </div>

        {latestResult && core ? (
          <div className="mt-5 rounded-[32px] bg-[#EEF6F0] p-6 ring-1 ring-inset ring-[#BFD9CC] shadow-[0_16px_34px_-24px_rgba(37,95,79,0.32)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#255F4F]/85">前回のチェック</div>
                <div className="mt-1 text-[24px] font-black tracking-tight text-slate-900 leading-tight">{core.title}</div>
                <div className="mt-1.5 text-[12px] font-bold text-slate-700">{core.short}</div>

                {subs.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subs.map((sub) => (
                      <span
                        key={sub.code}
                        className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-[#255F4F] ring-1 ring-[#CFE0D3] shadow-sm"
                      >
                        {sub.short}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0">
                <div className="grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-[22px] bg-white ring-1 ring-[#CFE0D3] shadow-[0_14px_28px_-22px_rgba(37,95,79,0.36)] transition-transform hover:scale-105 p-1.5">
                  <CoreIllust
                    code={latestResult.core_code}
                    title={core.title}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-[11px] font-extrabold tracking-wide text-slate-500">
              {latestResult.created_at ? `最終更新: ${new Date(latestResult.created_at).toLocaleDateString("ja-JP")}` : "最新の結果です。"}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="text-[14px] font-black text-slate-700">まだ体質チェックの保存結果がありません</div>
            <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
              まずは無料の体質チェックから始めてみましょう。
            </div>
            <div className="mt-5">
              <Button onClick={() => router.push("/check")} className="w-full shadow-sm">体質チェックをはじめる</Button>
            </div>
          </div>
        )}
      </Module>
    </AppShell>
  );
}



