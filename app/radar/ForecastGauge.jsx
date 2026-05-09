// app/radar/ForecastGauge.jsx
"use client";

import { useEffect, useRef, useState } from "react";

function clampScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function getGaugeStroke(signal) {
  if (signal === 2) return "#E38949";
  if (signal === 1) return "#E2AE45";
  return "#66B9A3";
}

function getGaugeSoftStroke(signal) {
  if (signal === 2) return "rgba(227,137,73,0.15)";
  if (signal === 1) return "rgba(226,174,69,0.15)";
  return "rgba(102,185,163,0.15)";
}

function getGaugeFill(signal) {
  if (signal === 2) return "rgba(255,246,239,0.96)";
  if (signal === 1) return "rgba(255,249,237,0.96)";
  return "rgba(243,251,248,0.96)";
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

function getGaugeModeLabel() {
  return "負担度スコア";
}

function getGaugeTone(signal) {
  if (signal === 2) {
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

  if (signal === 1) {
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

function getGaugeModePillTone(signal) {
  if (signal === 2) {
    return "border-rose-200 bg-white/92 text-rose-700 shadow-[0_10px_24px_-18px_rgba(225,29,72,0.42)]";
  }
  if (signal === 1) {
    return "border-amber-200 bg-white/92 text-amber-700 shadow-[0_10px_24px_-18px_rgba(217,119,6,0.42)]";
  }
  return "border-emerald-200 bg-white/92 text-emerald-700 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.38)]";
}

function getGaugeShadow(signal) {
  if (signal === 2) return "rgba(225,29,72,0.42)";
  if (signal === 1) return "rgba(217,119,6,0.40)";
  return "rgba(16,185,129,0.34)";
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
  triggerKey = "pressure_down",
  animationKey = "",
}) {
  const safeScore = Math.max(0, Math.min(10, Number(score) || 0));
  const animatedScore = useResetAnimatedNumber(safeScore, 700, animationKey);
  const tone = getGaugeTone(signal);

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
  const needleRadius = 105;

  const centerFill = "#ffffff";
  const scoreShadow =
    signal === 2
      ? "rgba(227,137,73,0.14)"
      : signal === 1
      ? "rgba(226,174,69,0.14)"
      : "rgba(102,185,163,0.13)";

  const stableEnd = scoreToAngle(3);
  const cautionEnd = scoreToAngle(5);

  const needleTip = polarToCartesian(cx, cy, needleRadius, valueAngle);
  const needleTail = polarToCartesian(cx, cy, 18, valueAngle + 180);
  const startLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeStart);
  const endLabelPos = polarToCartesian(cx, cy, rangeRadius + 10, gaugeEnd);

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

            <linearGradient id={`needle-${signal}`} x1="0%" y1="50%" x2="100%" y2="50%">
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
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, stableEnd, cautionEnd)}
            fill="none"
            stroke="rgba(226,174,69,0.74)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, rangeRadius, cautionEnd, gaugeEnd)}
            fill="none"
            stroke="rgba(227,137,73,0.72)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, gaugeEnd)}
            fill="none"
            stroke={`url(#gauge-track-${signal})`}
            strokeWidth="22"
            strokeLinecap="round"
          />

          <path
            d={describeArc(cx, cy, outerRadius, gaugeStart, valueAngle)}
            fill="none"
            stroke={`url(#gauge-fill-${signal})`}
            strokeWidth="24"
            strokeLinecap="round"
            filter={`url(#gauge-shadow-${signal})`}
          />

          {[0, 3, 5, 10].map((value) => {
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
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}

          <circle cx={170} cy={172} r={94} fill={centerFill} stroke={tone.ringSoft} strokeWidth="5" />
          <circle cx={170} cy={172} r={58} fill="#ffffff" stroke={tone.ring} strokeWidth="3" />

          <line
            x1={needleTail.x}
            y1={needleTail.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={`url(#needle-${signal})`}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={14}
            fill="#ffffff"
            stroke={tone.fillEnd}
            strokeWidth="4"
            filter={`url(#gauge-shadow-${signal})`}
          />
          <circle cx={170} cy={172} r={10} fill="#ffffff" stroke="rgba(226,232,240,0.95)" strokeWidth="2.5" />
          <circle cx={170} cy={172} r={5.5} fill={tone.fillEnd} />

          <text
  x={170}
  y={203}
  textAnchor="middle"
  fontSize="58"
  fontWeight="900"
  fill={tone.main}
  stroke="rgba(255,255,255,0.95)"
  strokeWidth="5"
  paintOrder="stroke"
>
  {Math.round(animatedScore)}
</text>
          <text
            x={209}
            y={203}
            textAnchor="start"
            fontSize="26"
            fontWeight="900"
            fill="rgba(100,116,139,0.92)"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="3"
            paintOrder="stroke"
          >
            /10
          </text>

          <text
            x={startLabelPos.x}
            y={startLabelPos.y + 6}
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="rgba(148,163,184,0.88)"
          >
            0
          </text>
          <text
            x={endLabelPos.x}
            y={endLabelPos.y + 6}
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="rgba(100,116,139,0.82)"
          >
            10
          </text>
        </svg>

        <div
          className="pointer-events-none absolute left-1/2 top-[70.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border px-4 py-1.5 text-[11px] font-black shadow-sm backdrop-blur-sm"
          style={{
            color: tone.labelText,
            background: tone.labelBg,
            borderColor: tone.labelBorder,
            boxShadow: `0 12px 24px ${tone.labelShadow}`,
          }}
        >
          {getGaugeModeLabel(triggerKey)}
        </div>
      </div>
    </div>
  );
}
