"use client";
import { useEffect, useState } from "react";
import { CoreIllust } from "@/components/illust/core";
import { WeatherIcon } from "@/components/illust/icons/weather";

function signalText(signal) {
  if (signal === 2) return "守りモード";
  if (signal === 1) return "いたわりモード";
  return "安定モード";
}

function triggerLabel(mainTrigger, triggerDir, exact = null, direction = null) {
  const physicalDirection = direction || triggerDir;
  if (["temp_shift", "temperature_shift"].includes(exact)) {
    if (physicalDirection === "up") return "気温上昇";
    if (physicalDirection === "down") return "気温低下";
    return "寒暖差";
  }
  if (
    mainTrigger === "pressure" &&
    physicalDirection === "mixed"
  ) return "気圧変動";
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "低温";
  if (mainTrigger === "temp" && triggerDir === "up") return "高温";
  if (mainTrigger === "temp" && ["change", "mixed", "steady"].includes(triggerDir)) return "寒暖差";
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
  const direction =
    item?.direction ||
    item?.physical_direction ||
    item?.trigger_dir ||
    compat.trigger_dir;

  return {
    key,
    exact: key,
    role: item?.role || (index === 0 ? "primary" : "secondary"),
    main_trigger: item?.main_trigger || compat.main_trigger,
    trigger_dir: item?.trigger_dir || compat.trigger_dir,
    direction,
    label: triggerLabel(
      item?.main_trigger || compat.main_trigger,
      item?.trigger_dir || compat.trigger_dir,
      key,
      direction
    ),
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
      <div className="mt-2 flex justify-between text-[12px] font-black tracking-widest text-slate-400">
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
            <div className="mt-0.5 text-[12px] font-extrabold text-slate-500">{dateLabel}</div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-black text-slate-500">未設定</span>
        </div>
        <div className="mt-3 text-[14px] font-bold leading-5 text-slate-600">{message}</div>
      </button>
    );
  }

  const Wrapper = onClick ? "button" : "div";
  const forecast = bundle.forecast;
  const signal = forecast.signal ?? 0;
  const score = forecast?.score_display_0_10 ?? forecast?.score_precise_0_10 ?? forecast?.score_0_10 ?? 0;
  const indexLabel = `${Math.round(scoreToPercent(score))}/100`;
  const style = modeStyle(signal);
  const factors = getForecastTriggerFactors(forecast);

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={["w-full rounded-[24px] p-4 text-left ring-1 shadow-[0_14px_30px_-24px_rgba(37,95,79,0.34)] transition-all hover:-translate-y-0.5 active:scale-[0.98]", style.panel].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-black text-slate-900">{label}</div>
          <div className="mt-0.5 text-[12px] font-extrabold text-slate-500">{dateLabel}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={["rounded-full px-2.5 py-1 text-[12px] font-black shadow-sm ring-1", style.chip].join(" ")}>{signalText(signal)}</span>
          <span className="rounded-full bg-white/68 px-2 py-0.5 text-[12px] font-black text-slate-500 ring-1 ring-white/70">
            体調警戒度 {indexLabel}
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
          <span key={`${label}-${factor.key}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-white/82 px-2.5 py-1 text-[12px] font-black text-slate-700 ring-1 ring-black/5 shadow-sm">
            <WeatherIcon triggerKey={factor.key} direction={factor.direction} className="h-4 w-4" />
            {factor.label}
          </span>
        ))}
      </div>
    </Wrapper>
  );
}


export { signalText, triggerLabel, exactTriggerKey, compatFromExact, getForecastSnapshot, getRiskSummaryFromForecast, getForecastTriggerKey, getForecastTriggerFactors, modeStyle, scoreToPercent, ForecastBar, ForecastDayStrip };
