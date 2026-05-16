// app/radar/ForecastGauge.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";

function getGaugeTone(signal) {
  const level = Number(signal);
  if (level === 2) {
    return {
      stroke: "#E38949",
      ring: "#EAB485",
      ringSoft: "rgba(227,137,73,0.24)",
      inner: "#FDEEDF",
      fillStart: "rgba(253,239,223,0.98)",
      fillEnd: "rgba(227,137,73,0.90)",
      shadow: "rgba(227,137,73,0.13)",
      main: "#B86430",
      labelText: "#955128",
      labelBg: "rgba(255,255,255,0.96)",
      labelBorder: "rgba(227,137,73,0.24)",
      labelShadow: "rgba(227,137,73,0.10)",
    };
  }

  if (level === 1) {
    return {
      stroke: "#E2AE45",
      ring: "#EAC86F",
      ringSoft: "rgba(226,174,69,0.24)",
      inner: "#FDF3DC",
      fillStart: "rgba(253,244,220,0.98)",
      fillEnd: "rgba(226,174,69,0.90)",
      shadow: "rgba(226,174,69,0.13)",
      main: "#AD7A18",
      labelText: "#8A6114",
      labelBg: "rgba(255,255,255,0.96)",
      labelBorder: "rgba(226,174,69,0.24)",
      labelShadow: "rgba(226,174,69,0.10)",
    };
  }

  return {
    stroke: "#66B9A3",
    ring: "#97D1C0",
    ringSoft: "rgba(102,185,163,0.24)",
    inner: "#DFF3EC",
    fillStart: "rgba(227,247,240,0.98)",
    fillEnd: "rgba(102,185,163,0.90)",
    shadow: "rgba(102,185,163,0.12)",
    main: "#2F816E",
    labelText: "#296C5D",
    labelBg: "rgba(255,255,255,0.96)",
    labelBorder: "rgba(102,185,163,0.22)",
    labelShadow: "rgba(102,185,163,0.10)",
  };
}

function getModeMeta(signal) {
  const level = Number(signal);
  if (level === 2) {
    return {
      label: "守りモード",
      shortLabel: "守り",
      caption: "無理を重ねない日",
    };
  }
  if (level === 1) {
    return {
      label: "いたわりモード",
      shortLabel: "いたわり",
      caption: "早めに整える日",
    };
  }
  return {
    label: "安定モード",
    shortLabel: "安定",
    caption: "いつも通りで大丈夫",
  };
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function useResetAnimatedNumber(target, duration = 700, animationKey = "") {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const to = Math.max(0, Number(target) || 0);

    cancelAnimationFrame(rafRef.current);
    setValue(0);

    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progress);
      const next = to * eased;

      setValue(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, animationKey]);

  return value;
}

export function ForecastGauge({
  score = 0,
  signal = 0,
  animationKey = "",
}) {
  const safeScore = Math.max(0, Math.min(10, Number(score) || 0));
  const animatedScore = useResetAnimatedNumber(safeScore, 720, animationKey);
  const [settled, setSettled] = useState(false);
  const level = Number(signal);
  const tone = getGaugeTone(level);
  const mode = getModeMeta(level);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), 760);
    return () => window.clearTimeout(timer);
  }, [animationKey, safeScore, signal]);

  const cx = 170;
  const cy = 172;

  const gaugeStart = -120;
  const gaugeEnd = 120;

  const scoreToAngle = (value) =>
    gaugeStart + ((gaugeEnd - gaugeStart) * value) / 10;

  const valueAngle = scoreToAngle(animatedScore);

  const outerRadius = 112;
  const innerRadius = 80;
  const guideRadius = 126;
  const rangeRadius = 138;
  const bubbleRadius = outerRadius;

  const centerFill = "#ffffff";
  const scoreShadow =
    level === 2
      ? "rgba(227,137,73,0.14)"
      : level === 1
      ? "rgba(226,174,69,0.14)"
      : "rgba(102,185,163,0.13)";

  const stableEnd = scoreToAngle(3.5);
  const cautionEnd = scoreToAngle(6.5);

  const bubblePos = polarToCartesian(cx, cy, bubbleRadius, valueAngle);
  const startLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeStart);
  const midLabelPos = polarToCartesian(cx, cy, 72, scoreToAngle(5));
  const endLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeEnd);
  const modePillLabel = settled ? mode.label : "過ごし方モード";

  return (
    <div className="relative mx-auto w-full max-w-[312px] sm:max-w-[326px]">
      <div className="relative aspect-[1/1.04]">
        <svg viewBox="0 0 340 352" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`gauge-track-${signal}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id={`gauge-fill-${signal}`} x1="18%" y1="18%" x2="82%" y2="82%">
              <stop offset="0%" stopColor={tone.fillStart} />
              <stop offset="100%" stopColor={tone.fillEnd} />
            </linearGradient>

            <filter id={`gauge-shadow-${signal}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="11" floodColor={scoreShadow} />
            </filter>
          </defs>

          <ellipse cx={170} cy={286} rx={104} ry={18} fill={tone.shadow} />
          <ellipse cx={170} cy={286} rx={76} ry={10} fill="rgba(255,255,255,0.82)" />

          <path
            d={describeArc(cx, cy, guideRadius, gaugeStart, gaugeEnd)}
            fill="none"
            stroke={tone.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          <path
            d={describeArc(cx, cy, rangeRadius, gaugeStart, stableEnd)}
            fill="none"
            stroke="rgba(102,185,163,0.72)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, stableEnd, cautionEnd)}
            fill="none"
            stroke="rgba(226,174,69,0.74)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, cautionEnd, gaugeEnd)}
            fill="none"
            stroke="rgba(227,137,73,0.72)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, gaugeEnd)}
            fill="none"
            stroke={`url(#gauge-track-${signal})`}
            strokeWidth="28"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, valueAngle)}
            fill="none"
            stroke={`url(#gauge-fill-${signal})`}
            strokeWidth="30"
            strokeLinecap="round"
            filter={`url(#gauge-shadow-${signal})`}
          />

          {[0, 3.5, 6.5, 10].map((value) => {
            const angle = scoreToAngle(value);
            const inner = polarToCartesian(cx, cy, innerRadius + 4, angle);
            const outer = polarToCartesian(cx, cy, guideRadius - 4, angle);

            return (
              <line
                key={value}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(100,116,139,0.58)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}

          <circle cx={170} cy={172} r={94} fill={centerFill} stroke={tone.ringSoft} strokeWidth="5" />
          <circle cx={170} cy={172} r={58} fill="#ffffff" stroke={tone.ring} strokeWidth="3" />

          <text
            x={170}
            y={151}
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            letterSpacing="1.5"
            fill="rgba(100,116,139,0.72)"
          >
            MODE
          </text>
          <text
            x={170}
            y={191}
            textAnchor="middle"
            fontSize={mode.shortLabel.length >= 4 ? "32" : "38"}
            fontWeight="900"
            fill={tone.main}
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="5"
            paintOrder="stroke"
          >
            {settled ? mode.shortLabel : "判定中"}
          </text>
          <text
            x={170}
            y={219}
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            fill="rgba(100,116,139,0.86)"
          >
            {settled ? mode.caption : "過ごし方を確認中"}
          </text>

          <text
            x={startLabelPos.x}
            y={startLabelPos.y + 6}
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            fill="rgba(148,163,184,0.88)"
          >
            安定
          </text>
          <text
            x={midLabelPos.x}
            y={midLabelPos.y + 6}
            textAnchor="middle"
            fontSize="12"
            fontWeight="900"
            fill="rgba(148,163,184,0.88)"
          >
            いたわり
          </text>
          <text
            x={endLabelPos.x}
            y={endLabelPos.y + 6}
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            fill="rgba(100,116,139,0.82)"
          >
            守り
          </text>
        </svg>

        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 will-change-[left,top]"
          style={{
            left: `${(bubblePos.x / 340) * 100}%`,
            top: `${(bubblePos.y / 352) * 100}%`,
          }}
          aria-hidden="true"
        >
          <div
            className="grid h-12 w-12 place-items-center rounded-full border bg-white/78 shadow-[0_14px_28px_-18px_rgba(15,23,42,0.42)] ring-1 ring-white/80 backdrop-blur-sm"
            style={{ borderColor: tone.labelBorder, backgroundColor: "rgba(255,255,255,0.76)" }}
          >
            <GuideBotAvatar signal={level} className="h-10 w-10" />
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-[70.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border px-4 py-1.5 text-[11px] font-black shadow-sm backdrop-blur-sm transition-all duration-300"
          style={{
            color: tone.labelText,
            background: tone.labelBg,
            borderColor: tone.labelBorder,
            boxShadow: `0 12px 24px ${tone.labelShadow}`,
          }}
        >
          {modePillLabel}
        </div>
      </div>
    </div>
  );
}
