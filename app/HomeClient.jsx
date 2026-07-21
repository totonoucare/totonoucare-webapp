// app/HomeClient.jsx
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
import HeroGuideBot, { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import { IconRadar, IconBolt, IconCompass, AppIcon } from "@/components/illust/icons/app";
import { CoreIllust } from "@/components/illust/core";
import { WeatherIcon } from "@/components/illust/icons/weather";
import { getDisplayableLocationName } from "@/lib/radar_v1/locationDisplay";
import { EKIKEN_DISPLAY_NAME } from "@/lib/records/liveSupport";

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
        <circle cx="154" cy="86" r="54" fill="#DFA42D" opacity="0.08" />
        <circle cx="154" cy="86" r="81" fill="none" stroke="#D7E8DD" strokeWidth="1.4" strokeOpacity="0.5" />
        <circle cx="154" cy="86" r="118" fill="none" stroke="#EDF2EE" strokeWidth="1.2" strokeOpacity="0.62" />
        <circle cx="154" cy="86" r="41" fill="none" stroke="#D7E8DD" strokeWidth="1.3" strokeOpacity="0.46" />
        <path
          d="M48 92 A108 108 0 0 1 211 25"
          fill="none"
          stroke="#6BB69A"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeOpacity="0.34"
        />
        <path
          d="M64 129 A90 90 0 0 1 225 95"
          fill="none"
          stroke="#DFA42D"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeOpacity="0.38"
        />
        <circle cx="214" cy="91" r="4.6" fill="#DFA42D" opacity="0.42" />
        <circle cx="111" cy="138" r="3.3" fill="#4EA789" opacity="0.48" />
        <path
          d="M118 188 C 139 175, 174 175, 195 188"
          fill="none"
          stroke="#6BB69A"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.18"
        />
      </svg>
    </div>
  );
}

function IconChevron({ className = "h-4 w-4", ...props }) {
  return <AppIcon name="chevron" className={className} {...props} />;
}

function IconPin({ className = "h-4 w-4", ...props }) {
  return <AppIcon name="location" className={className} {...props} />;
}

function IconJournalCard() {
  return <AppIcon name="memo" className="h-[22px] w-[22px]" />;
}

function IconCheckCard() {
  return <AppIcon name="karte" className="h-[22px] w-[22px]" />;
}

function IconHistoryCard() {
  return <AppIcon name="history" className="h-[22px] w-[22px]" />;
}

function IconReportCard() {
  return <AppIcon name="analysis" className="h-[22px] w-[22px]" />;
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
  if (signal === 1) return "bg-[#FFF9ED] text-[#AD7A18] ring-1 ring-inset ring-[#EAD8A6]";
  return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  if (signal === 1) return "bg-[#e2aa3b] shadow-[0_0_8px_rgba(226,170,59,0.48)]";
  return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
}

function signalCardBg(signal) {
  if (signal === 2) return "bg-[#FFF1F3] ring-rose-200";
  if (signal === 1) return "bg-[#FFF5DE] ring-amber-200";
  return "bg-[#ECF8F1] ring-emerald-200";
}

function signalScoreTextClass(signal) {
  if (signal === 2) return "text-rose-700";
  if (signal === 1) return "text-[#AD7A18]";
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
  if (mainTrigger === "temp" && ["change", "mixed", "steady"].includes(triggerDir)) return "気温差";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿気";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

function exactTriggerKey(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "temp" && ["change", "mixed", "steady"].includes(triggerDir)) return "temp_shift";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return "pressure_down";
}

function compatFromExact(exact) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
  if (exact === "temp_shift") return { main_trigger: "temp", trigger_dir: "change" };
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
  return "まだ目立った注意時間なし";
}

function buildQuickLiveAdvice(forecast) {
  const factor = getForecastTriggerFactors(forecast)[0];
  const key = factor?.key || exactTriggerKey(forecast?.main_trigger, forecast?.trigger_dir);
  const prefix = forecast?.signal === 2 ? "今日は早めに" : forecast?.signal === 1 ? "今日はこまめに" : "今日は軽く";

  if (key === "pressure_down" || key === "pressure_up") return `${prefix}、表示されたケア方針に合わせて予定を詰めすぎないで。`;
  if (key === "cold") return `${prefix}、首・お腹・足首を冷やさないようにして。`;
  if (key === "heat") return `${prefix}、こもる前に水分と休憩を先に入れて。`;
  if (key === "temp_shift") return `${prefix}、脱ぎ着しやすい服装で急な気温差に備えて。`;
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
    return `今日ここからは${peak}に注意。${label}に合わせて、無理を一段減らしていこう。`;
  }
  if (forecast.signal === 1) {
    return `今日ここからは${peak}を少し意識してね。${label}の影響を見ながら早めに休もう。`;
  }
  return `今日ここからは大きな波は小さめ。${label}だけ軽く見ておけば大丈夫そう。`;
}


function modeActionLabel(signal) {
  if (signal === 2) return "守りを固める日";
  if (signal === 1) return "早めに整える日";
  return "いつも通りで大丈夫";
}

function buildGuestSignHints(forecast) {
  const factor = getForecastTriggerFactors(forecast)[0];
  const key = factor?.key || exactTriggerKey(forecast?.main_trigger, forecast?.trigger_dir);

  if (key === "pressure_down" || key === "pressure_up") return ["張り・こわばり", "重だるさ", "切り替えの疲れ"];
  if (key === "cold") return ["手足が冷える", "腰が重い", "こわばる"];
  if (key === "heat") return ["のぼせる", "汗で消耗", "眠りが浅い"];
  if (key === "temp_shift") return ["体がこわばる", "切り替えに疲れる", "だるさが出る"];
  if (key === "damp") return ["重だるい", "むくみやすい", "胃腸が重い"];
  if (key === "dry") return ["のどが乾く", "目が疲れる", "肌が乾く"];
  return ["だるさ", "こわばり", "切り替えにくさ"];
}

function buildFixedGuideText(bundle) {
  if (!bundle?.ok || !bundle?.forecast) return "今日の体調予報を確認しています。";

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

function useResetAnimatedPercent(target, duration = 900, animationKey = "") {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const safeTarget = Math.max(0, Math.min(100, Number(target) || 0));
    const start = performance.now();

    setValue(0);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(safeTarget * eased);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, animationKey]);

  return value;
}

function getForecastBarBubbleMotionClass(signal, settled) {
  if (!settled) return "";
  const level = Number(signal);
  if (level === 2) return "home-forecast-bubble-shiver";
  if (level === 1) return "home-forecast-bubble-sway";
  return "home-forecast-bubble-float";
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

function ForecastBarMarker({ signal = 0, coreCode = null, coreTitle = "" }) {
  if (coreCode) {
    return (
      <CoreIllust
        code={coreCode}
        title={coreTitle || "体質タイプ"}
        className="h-10 w-10"
      />
    );
  }

  return <MiniGuideBotMarker signal={signal} />;
}

function ForecastBar({ forecast, coreCode = null, coreTitle = "", animationKey = "" }) {
  const signal = forecast?.signal ?? 0;
  const score = forecast?.score_display_0_10 ?? forecast?.score_precise_0_10 ?? forecast?.score_0_10 ?? 0;
  const percent = scoreToPercent(score);
  const animatedPercent = useResetAnimatedPercent(percent, 950, animationKey);
  const markerLeft = Math.max(7, Math.min(93, animatedPercent));
  const style = modeStyle(signal);
  const [settled, setSettled] = useState(false);
  const motionClass = getForecastBarBubbleMotionClass(signal, settled);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), 980);
    return () => window.clearTimeout(timer);
  }, [animationKey, percent, signal]);

  return (
    <div className="relative pt-8 pb-2">
      <style>{`
        @keyframes homeForecastBubbleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes homeForecastBubbleSway {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes homeForecastBubbleShiver {
          0%, 62%, 100% { transform: translate(0, 0) rotate(0deg); }
          66% { transform: translate(-1.2px, 0.4px) rotate(-4deg); }
          70% { transform: translate(1.2px, -0.4px) rotate(4deg); }
          74% { transform: translate(-0.8px, -0.4px) rotate(-3deg); }
          78% { transform: translate(0.8px, 0.4px) rotate(3deg); }
          82% { transform: translate(0, 0) rotate(0deg); }
        }
        .home-forecast-bubble-motion {
          transform-origin: 50% 68%;
          will-change: transform;
        }
        .home-forecast-bubble-float {
          animation: homeForecastBubbleFloat 3.4s ease-in-out infinite;
        }
        .home-forecast-bubble-sway {
          animation: homeForecastBubbleSway 2.75s ease-in-out infinite;
        }
        .home-forecast-bubble-shiver {
          animation: homeForecastBubbleShiver 1.25s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .home-forecast-bubble-motion {
            animation: none !important;
          }
        }
      `}</style>
      <div className={["h-3 overflow-hidden rounded-full", style.track].join(" ")}>
        <div className={["h-full rounded-full", style.fill].join(" ")} style={{ width: `${animatedPercent}%` }} />
      </div>
      <div
        className={["absolute top-0 grid h-12 w-12 -translate-x-1/2 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-white/80", style.glow].join(" ")}
        style={{ left: `${markerLeft}%` }}
      >
        <div className={["home-forecast-bubble-motion", motionClass].filter(Boolean).join(" ")}>
          <ForecastBarMarker signal={signal} coreCode={coreCode} coreTitle={coreTitle} />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-black tracking-widest text-slate-400">
        <span>安定</span>
        <span>いたわり</span>
        <span>守り</span>
      </div>
    </div>
  );
}

function ForecastDayStrip({ label, dateLabel, bundle, loading, onClick, coreCode = null, coreTitle = "" }) {
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
        <div className="mt-3 text-[14px] font-bold leading-5 text-slate-600">{message}</div>
      </button>
    );
  }

  const forecast = bundle.forecast;
  const signal = forecast.signal ?? 0;
  const score = forecast?.score_display_0_10 ?? forecast?.score_precise_0_10 ?? forecast?.score_0_10 ?? 0;
  const percentLabel = `${Math.round(scoreToPercent(score))}%`;
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={["rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ring-1", style.chip].join(" ")}>{signalText(signal)}</span>
          <span className="rounded-full bg-white/68 px-2 py-0.5 text-[10px] font-black text-slate-500 ring-1 ring-white/70">
            体調ゆらぎ度 {percentLabel}
          </span>
        </div>
      </div>

      <ForecastBar
        forecast={forecast}
        coreCode={coreCode}
        coreTitle={coreTitle}
        animationKey={`${label}-${dateLabel}-${score}-${signal}-${coreCode || "guide"}`}
      />

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

function ForecastOverviewCard({
  todayBundle,
  tomorrowBundle,
  todayLoading,
  tomorrowLoading,
  onOpenRadar,
  onOpenRecords,
  todayRecorded = false,
  coreCode = null,
  coreTitle = "",
}) {
  const todayForecast = todayBundle?.forecast;
  const mainSignal = todayBundle?.ok ? (todayForecast?.signal ?? 0) : 0;
  const style = modeStyle(mainSignal);

  return (
    <Module className="relative overflow-hidden bg-white p-6 ring-1 ring-slate-200/80 shadow-[0_18px_42px_-32px_rgba(37,95,79,0.34)]">
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={["grid h-9 w-9 place-items-center rounded-full bg-white/70 ring-1 shadow-sm", style.chip].join(" ")}>
            <IconRadar className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[18px] font-black tracking-tight text-slate-900">今日と明日の体調予報</div>
            <div className="mt-0.5 text-[11px] font-extrabold text-slate-600">体質×天気から、今日と明日のゆらぎを確認</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenRadar}>詳細へ</Button>
      </div>

      <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2">
        <ForecastDayStrip
          label="今日"
          dateLabel={formatYmdJP(getJstDateString(0))}
          bundle={todayBundle}
          loading={todayLoading}
          onClick={onOpenRadar}
          coreCode={coreCode}
          coreTitle={coreTitle}
        />
        <ForecastDayStrip
          label="明日"
          dateLabel={formatYmdJP(getJstDateString(1))}
          bundle={tomorrowBundle}
          loading={tomorrowLoading}
          onClick={onOpenRadar}
          coreCode={coreCode}
          coreTitle={coreTitle}
        />
      </div>

      <button
        type="button"
        onClick={onOpenRecords}
        className="relative z-10 mt-4 flex w-full items-center justify-between gap-3 rounded-[20px] bg-[#F4FAF7] px-4 py-3.5 text-left ring-1 ring-[#CFE7DE] transition-all hover:-translate-y-0.5 hover:bg-[#EFF8F4]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-white text-[#2F816E] ring-1 ring-[#CFE7DE] shadow-sm">
            ✓
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-slate-900">{todayRecorded ? "今日の記録と傾向を見る" : "今日を振り返る"}</div>
            <div className="mt-0.5 text-[10px] font-bold text-slate-500">{todayRecorded ? "記録済み ✓・編集やAI分析へ" : "記録・カレンダー・AI分析へ"}</div>
          </div>
        </div>
        <span className="shrink-0 text-[22px] text-[#66B9A3]">›</span>
      </button>
    </Module>
  );
}

function EkkenHomeCard({ signal = 0, onOpen }) {
  const message = Number(signal) === 2
    ? "今日は守りの予報です。今つらいことがあれば、一緒に整理しましょう。"
    : Number(signal) === 1
      ? "今日は少しゆらぎやすい日です。無理する前に話してみませんか？"
      : "小さな違和感でも大丈夫。今の調子を一言から話せます。";
  const prompts = [
    "今、つらい症状がある",
    "今日のケアを一緒に選びたい",
    "なんとなく調子が悪い",
  ];

  return (
    <Module className="overflow-hidden bg-[#F4FAF7] p-5 ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
      <div className="flex items-end gap-3">
        <GuideBotAvatar signal={signal} className="h-[82px] w-[82px] shrink-0" />
        <div className="relative mb-1 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
          <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
          <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">ケアナビAI</div>
          <div className="mt-1 text-[16px] font-black text-slate-900">{EKIKEN_DISPLAY_NAME}に相談</div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{message}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onOpen(prompt)} className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">
            {prompt}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onOpen("")} className="mt-3 flex w-full items-center justify-between rounded-[18px] bg-[#349B83] px-4 py-3 text-left text-white shadow-[0_14px_28px_-20px_rgba(52,155,131,0.64)]">
        <span className="text-[12px] font-black">今の調子を話してみる</span>
        <span className="text-[21px]">›</span>
      </button>
    </Module>
  );
}

function GuestStartCta({ onCheck, onLogin }) {
  const steps = [
    {
      key: "type",
      title: "体質トリセツ",
      sub: "崩れ方のクセ",
      icon: <IconCheckCard />,
      tone: "text-[#24564C] bg-white ring-[#CFE0D3]",
    },
    {
      key: "forecast",
      title: "体調予報",
      sub: "今日・明日のゆらぎ",
      icon: <IconRadar className="h-[22px] w-[22px]" />,
      tone: "text-[#8B640C] bg-white ring-[#E9D8A9]",
    },
    {
      key: "care",
      title: "ショップ",
      sub: "ケア用品・食品",
      icon: <AppIcon name="care" className="h-[22px] w-[22px]" />,
      tone: "text-[#2F8F79] bg-white ring-[#CFE0D3]",
    },
  ];

  return (
    <div className="mt-6 rounded-[30px] border-2 border-dashed border-[#5C9F88]/35 bg-[#F4F9F6] p-5 text-left relative overflow-hidden transition-all hover:bg-[#EEF6F0]">
      <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#F4D68A]/28 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-[#CFEFE6]/32 blur-2xl" />

      <div className="relative z-10 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-white text-[#24564C] ring-1 ring-[#CFE0D3] shadow-sm">
          <IconCheckCard />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[10px] font-black tracking-[0.14em] text-[#2F8F79] ring-1 ring-[#D3E1D5] shadow-sm">
            START GUIDE
          </div>
          <h2 className="mt-2 text-[17px] font-black tracking-tight text-[#24564C] leading-[1.35]">
            体質トリセツを作って、体調予報とパーソナルケアショップへ
          </h2>
          <p className="mt-2 text-[14px] font-bold leading-6 text-[#5b6674]">
            約3分で、体質のクセを多面的に整理。基本14問と回答に応じた追加質問から、張りつめやすさ、だるさや冷えの出やすさ、負担を受け止める余力、巡りや潤い、負担が出やすい体のラインまで読み解きます。この結果をもとに、今日・明日の体調予報と、暮らす・食べる・ほぐすのケアをあなた向けに整えます。
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
        {steps.map((step) => (
          <div key={step.key} className="rounded-[18px] bg-white/85 p-3 text-center ring-1 ring-[#D3E1D5] shadow-sm">
            <div className={["mx-auto grid h-10 w-10 place-items-center rounded-[14px] ring-1", step.tone].join(" ")}>
              {step.icon}
            </div>
            <div className="mt-2 text-[11px] font-black text-slate-900 leading-4">{step.title}</div>
            <div className="mt-0.5 text-[9.5px] font-bold leading-4 text-slate-500">{step.sub}</div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-5 grid gap-3">
        <Button onClick={onCheck} className="py-4 shadow-md text-[14px] w-full">
          無料で体質チェックを始める
        </Button>
        <Button variant="secondary" onClick={onLogin} className="py-4 shadow-sm text-[14px] w-full bg-white">
          ログインする
        </Button>
      </div>
    </div>
  );
}

function MyCareScopeBadge({ variant = "stack", className = "" }) {
  const items = [
    { label: "暮らす", sub: "環境", color: "text-[#2F8F79]" },
    { label: "食べる", sub: "食品", color: "text-[#8B640C]" },
    { label: "ほぐす", sub: "道具", color: "text-slate-600" },
  ];

  if (variant === "row") {
    return (
      <div className={["grid grid-cols-3 gap-2", className].join(" ")}>
        {items.map((item) => (
          <div key={item.label} className="rounded-[15px] bg-[#F8FBF9] px-2.5 py-2 text-center ring-1 ring-[#D3E1D5]">
            <div className={["text-[10px] font-black", item.color].join(" ")}>{item.label}</div>
            <div className="mt-0.5 text-[9px] font-extrabold text-slate-400">{item.sub}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={["shrink-0 rounded-[18px] bg-[#F8FBF9] px-3 py-2 text-center ring-1 ring-[#D3E1D5]", className].join(" ")}>
      {items.map((item) => (
        <div key={item.label} className={["text-[10px] font-black", item.color].join(" ")}>{item.label}</div>
      ))}
    </div>
  );
}

function MyCareSelectHomeCard({ hasResult, onPrimary, onBrowseSingle }) {
  const title = hasResult ? "パーソナルケアショップ" : "体質チェック後に、あなた向けの商品選び";
  const body = hasResult
    ? "体質と気になる不調を土台に、暮らす・食べる・ほぐすの商品を提案します。季節と近いうちの天気も、商品の使いどきに反映します。"
    : "体質チェックをすると、体質と気になる不調に合うケア商品を選びやすくなります。";
  const primaryLabel = hasResult ? "おすすめ商品を見る" : "体質チェックして商品を見る";
  const secondaryLabel = hasResult ? "カテゴリから探す" : "まずは体質チェックへ";

  return (
    <Module className="mt-5 relative overflow-hidden bg-white p-5 ring-1 ring-[#D3E1D5] shadow-[0_16px_36px_-28px_rgba(37,95,79,0.28)]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#CFEFE6]/34 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#DCEFEA] text-[#173F3A] ring-1 ring-[#B6D8CF] shadow-[0_12px_28px_-18px_rgba(19,138,115,0.42)]">
            <AppIcon name="care" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex rounded-full bg-[#F4F9F6] px-3 py-1 text-[10px] font-black text-[#2F8F79] ring-1 ring-[#D3E1D5]">あなた向けに選ぶショップ</div>
            <h2 className="mt-3 text-[19px] font-black tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-[14px] font-extrabold leading-6 text-slate-600">
              {body}
            </p>
          </div>
        </div>
        <MyCareScopeBadge className="hidden sm:block" />
      </div>

      <MyCareScopeBadge variant="row" className="relative z-10 mt-4 sm:hidden" />

      <div className="relative z-10 mt-4 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onPrimary} className="w-full py-4 shadow-md sm:flex-1">
          {primaryLabel}
        </Button>
        <Button variant="secondary" onClick={onBrowseSingle} className="w-full bg-white py-4 shadow-sm sm:flex-1">
          {secondaryLabel}
        </Button>
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
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#EAF5EF] text-[#24564C] ring-1 ring-[#CFE3DA] shadow-sm transition-transform group-hover:scale-105">
          {icon}
        </div>
        <IconChevron className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-4 text-[15px] font-black tracking-tight text-slate-950">{title}</div>
      <div className="mt-1 text-[14px] font-extrabold leading-6 text-slate-600">{sub}</div>
    </button>
  );
}


function PersonalKarteSpotlight({ core, coreCode, subs = [], onPrimary, onSecondary }) {
  const hasResult = Boolean(core);
  const primaryLabel = hasResult ? "トリセツを開く" : "体質チェックから作る";
  const primarySub = hasResult
    ? "体質・天気・ツボ・食養生をつなげて見返せます。"
    : "体質チェック後に、あなた専用のトリセツ導線が表示されます。";

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black tracking-widest text-[var(--gold)] ring-1 ring-[#E9D8A9] shadow-sm">
            TYPE GUIDE
          </div>
          <h2 className="mt-3 text-[24px] font-black tracking-tight text-slate-950 leading-[1.25]">
            あなた専用の体質トリセツ
          </h2>
          <p className="mt-2 text-[14px] font-extrabold leading-6 text-slate-600">
            {primarySub}
          </p>

          {hasResult ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-white/85 px-2.5 py-1 text-[11px] font-black text-[#24564C] ring-1 ring-[#CFE0D3] shadow-sm">
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
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">いつ・どこに出やすいかを整理</div>
        </div>
        <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[#E3EAE5] shadow-sm">
          <div className="text-[11px] font-black text-slate-900">天気との相性</div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">響きやすい要素を見返せる</div>
        </div>
        <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[#E3EAE5] shadow-sm">
          <div className="text-[11px] font-black text-slate-900">ケアの使い方</div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">予報ページとのつなぎ方まで</div>
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


function HomeStateCta({ loading, hasResult, hasLocation, core, coreCode, subs = [], onPrimary, onSecondary }) {
  if (loading) {
    return (
      <Module className="p-6 bg-white ring-1 ring-[#D3E1D5] shadow-[0_18px_42px_-32px_rgba(37,95,79,0.32)]">
        <div className="h-28 animate-pulse rounded-[26px] bg-slate-100" />
      </Module>
    );
  }

  let icon = <IconCheckCard />;
  let eyebrow = "TYPE GUIDE";
  let title = "体質トリセツを作る";
  let body = "約3分で、体質のクセを多面的に整理。基本14問と回答に応じた追加質問から、張りつめやすさ、だるさや冷えの出やすさ、負担を受け止める余力、巡りや潤い、負担が出やすい体のラインまで読み解きます。この結果をもとに、今日・明日の体調予報と、暮らす・食べる・ほぐすのケアをあなた向けに整えます。";
  let primaryLabel = "無料で体質チェックを始める";
  let secondaryLabel = "使い方を見る";

  if (hasResult && !hasLocation) {
    icon = <IconPin />;
    eyebrow = "LOCATION";
    title = "地域を設定して予報を完成";
    body = "体質トリセツはできています。次は地域を設定して、今日・明日の体調予報に反映しましょう。";
    primaryLabel = "地域を設定する";
    secondaryLabel = "体質トリセツを見る";
  } else if (hasResult) {
    icon = <IconCompass className="h-5 w-5" />;
    eyebrow = core?.title ? `${core.title}のトリセツ` : "YOUR GUIDE";
    title = "体質トリセツを見返す";
    body = core?.short
      ? `${core.short}。体質のクセ・天気との相性・ケアの方向性をいつでも確認できます。`
      : "体質のクセ・天気との相性・ケアの方向性をいつでも確認できます。";
    primaryLabel = "体質トリセツを見る";
    secondaryLabel = "体質チェックを更新する";
  }

  return (
    <Module className="relative overflow-hidden p-6 bg-[linear-gradient(135deg,#F7FBF8_0%,#FFF9EA_100%)] ring-1 ring-[#D3E1D5] shadow-[0_20px_48px_-34px_rgba(37,95,79,0.38)]">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#F4D68A]/35 blur-2xl" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-[24px] bg-white p-2 text-[#24564C] ring-1 ring-[#CFE0D3] shadow-[0_14px_30px_-22px_rgba(37,95,79,0.36)]">
          {hasResult && core ? (
            <CoreIllust
              code={coreCode}
              title={core?.title || "体質タイプ"}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-[18px] bg-[#EEF6F0] text-[#24564C] ring-1 ring-[#D3E1D5]">
              {icon}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black tracking-widest text-[var(--gold)] ring-1 ring-[#E9D8A9] shadow-sm">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-[22px] font-black tracking-tight text-slate-950 leading-[1.25]">
            {title}
          </h2>
          <p className="mt-2 text-[14px] font-extrabold leading-6 text-slate-600">
            {body}
          </p>

          {hasResult && subs.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subs.slice(0, 3).map((sub) => (
                <span
                  key={sub.code}
                  className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-[#24564C] ring-1 ring-[#CFE0D3] shadow-sm"
                >
                  {sub.short}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onPrimary} className="w-full py-4 shadow-md sm:flex-1">
          {primaryLabel}
        </Button>
        <Button variant="secondary" onClick={onSecondary} className="w-full bg-white py-4 shadow-sm sm:flex-1">
          {secondaryLabel}
        </Button>
      </div>
    </Module>
  );
}

function ForecastMiniCard({ title, bundle, loading, onClick, errorOnClick = onClick, eyebrow = "気になりやすい変化", scoreLabel = "目安スコア", memo = null, ctaLabel = "体調予報を開く", scoreVariant = "score" }) {
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
          <div className="mt-3 text-[14px] font-bold leading-6 text-slate-600">{message}</div>
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
          {scoreVariant === "mode" ? (
            <div className="leading-tight">
              <div className={["text-[18px] font-black tracking-tight", signalScoreTextClass(forecast.signal)].join(" ")}>{modeActionLabel(forecast.signal)}</div>
              <div className="mt-1 text-[10px] font-extrabold text-slate-400">今日の崩れやすさ</div>
            </div>
          ) : (
            <div className="flex items-end justify-end gap-1 leading-none">
              <span className={["text-[42px] font-black tracking-[-0.04em]", signalScoreTextClass(forecast.signal)].join(" ")}>{score}</span>
              <span className="pb-1 text-[16px] font-black text-slate-400">/10</span>
            </div>
          )}
        </div>
      </div>

      {scoreVariant === "mode" ? (
        <div className="relative z-10 mt-4 rounded-[20px] bg-white/55 px-3.5 py-2.5 ring-1 ring-black/5 shadow-sm">
          <ForecastBar forecast={forecast} />
        </div>
      ) : null}

      {memo ? (
        <div className="relative z-10 mt-4 rounded-[18px] bg-white/72 px-4 py-3 text-[14px] font-extrabold leading-6 text-slate-600 ring-1 ring-black/5 shadow-sm">
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
  const [todayReview, setTodayReview] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [radarLocation, setRadarLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

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
        setTodayReview(null);
        setLatestResult(null);
        setRadarLocation(null);
        setTodayLoading(false);
        setTomorrowLoading(false);
        setDashboardLoading(false);
        setLocationLoading(false);
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
              error: `${label}の予報はまだ準備中です。体調予報ページで確認してください。`,
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
      authedFetch(`/api/radar/review?date=${today}`)
        .then((response) => {
          if (!cancelled) setTodayReview(response?.data?.review || null);
        })
        .catch(() => {
          if (!cancelled) setTodayReview(null);
        });
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

      try {
        setLocationLoading(true);
        const locationRes = await authedFetch(`/api/radar/location`).catch(() => null);
        if (cancelled) return;
        setRadarLocation(locationRes?.location || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setRadarLocation(null);
      } finally {
        if (!cancelled) setLocationLoading(false);
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
      ? "今日の体調予報デモを確認中…"
      : (pf ? botMessages[pfSignal] : "今日の気象を読み込めませんでした。");
    const guestSignHints = pf ? buildGuestSignHints(pf) : [];

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
              <div className="text-[14px] font-extrabold leading-6 text-slate-600">
                {botMessage}
              </div>
            </div>
            
            <div className="shrink-0 -mt-8 -mr-1">
              <HeroGuideBot compact showBubble={false} signal={publicForecastLoading ? 0 : pfSignal} />
            </div>
          </div>
        </Module>

        <Module className="px-6 pt-6 pb-12 sm:max-w-[400px] sm:mx-auto">
          {/* mb-5に広げてタイトルとカード本体との余白を調整 */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-black tracking-tight text-slate-900">天気だけで見る体調予報デモ</div>
              <div className="mt-0.5 text-[10px] font-extrabold text-slate-500">体質チェック前のため、天気要素だけで表示しています</div>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl ring-1 ring-[#D3E1D5] shadow-sm relative z-20 hover:ring-[#CFE3DA]">
              <IconPin className="w-3.5 h-3.5 text-[#24564C]" />
              <select
                value={publicLocation.key}
                onChange={(e) => {
                  const preset = QUICK_PRESETS.find((p) => p.key === e.target.value);
                  if (preset) setPublicLocation(preset);
                }}
                className="appearance-none bg-transparent text-[13px] font-black tracking-tight text-[#24564C] outline-none pr-5 cursor-pointer relative z-10"
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
            onClick={() => router.push("/check")}
            eyebrow="気になりやすい天気変化"
            scoreLabel="今日のモード"
            scoreVariant="mode"
            memo="体質チェックをすると、ここにあなたの崩れやすいサインとケア方針が重なります。"
            ctaLabel="体質チェックを始める"
          />

          {guestSignHints.length ? (
            <div className="mt-4 rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[#CFE0D3] shadow-[0_14px_30px_-24px_rgba(37,95,79,0.24)]">
              <div className="text-[12px] font-black tracking-tight text-slate-900">出やすいサイン</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {guestSignHints.map((sign) => (
                  <span key={sign} className="rounded-full bg-[#F4F9F6] px-3 py-1.5 text-[12px] font-extrabold text-[#24564C] ring-1 ring-[#D3E1D5]">
                    {sign}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <GuestStartCta
            onCheck={() => router.push("/check")}
            onLogin={() => router.push("/signup")}
          />

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
    : "今日の体調予報を確認しています。";

  return (
    <AppShell
      title="ホーム"
      subtitle="体質・予報・ケアをつなぐ"
      headerRight={
        <HomeHeaderMenu
          onGuide={() => router.push("/guide")}
          onSettings={() => router.push("/settings")}
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
            <div className="text-[14px] font-extrabold leading-6 text-slate-600">
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
        onOpenRecords={() => router.push("/records")}
        todayRecorded={Boolean(todayReview)}
        coreCode={latestResult?.core_code || null}
        coreTitle={core?.title || ""}
      />

      <EkkenHomeCard
        signal={targetSignal ?? 0}
        onOpen={(prompt) => router.push(`/records?tab=consult${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ""}`)}
      />

      <MyCareSelectHomeCard
        hasResult={Boolean(latestResult && core)}
        onPrimary={() => {
          if (!latestResult || !core) return router.push("/check");
          return router.push("/care-navi");
        }}
        onBrowseSingle={() => {
          if (!latestResult || !core) return router.push("/check");
          return router.push("/care-navi?category=live");
        }}
      />

      <HomeStateCta
        loading={dashboardLoading || (Boolean(latestResult && core) && locationLoading)}
        hasResult={Boolean(latestResult && core)}
        hasLocation={Boolean(radarLocation)}
        core={core}
        coreCode={latestResult?.core_code}
        subs={subs}
        onPrimary={() => {
          if (!latestResult || !core) return router.push("/check");
          if (!radarLocation) return router.push("/radar");
          return router.push(latestResultHref || "/history");
        }}
        onSecondary={() => {
          if (!latestResult || !core) return router.push("/guide");
          if (!radarLocation) return router.push(latestResultHref || "/history");
          return router.push("/check/run");
        }}
      />
    </AppShell>
  );
}
