"use client";

import { useId } from "react";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const logoBgGrad = `logoBgGrad-${uid}`;
  const radarSweep = `radarSweep-${uid}`;

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* 1. アイコン部分（旧SVGロゴに戻す） */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[14px]" : "h-14 w-14 rounded-[20px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={logoBgGrad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f5f1" />
            </linearGradient>

            <linearGradient id={radarSweep} x1="0.5" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6a9770" />
              <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 背景 */}
          <rect width="64" height="64" fill={`url(#${logoBgGrad})`} />

          {/* 背景の波紋 */}
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="#d3e2d6"
            strokeWidth="1.5"
          />
          <circle
            cx="32"
            cy="32"
            r="14"
            fill="none"
            stroke="#a3c1a8"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* レーダーのスウィープ */}
          <path
            d="M32 10 A 22 22 0 0 1 54 32"
            fill="none"
            stroke={`url(#${radarSweep})`}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* クロスヘア */}
          <path
            d="M32 14 L32 20 M32 44 L32 50 M14 32 L20 32 M44 32 L50 32"
            stroke="#8cb093"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* 中央のコア */}
          <circle cx="32" cy="32" r="5" fill="#d9a54a" />
          <circle cx="32" cy="32" r="5" fill="#ffffff" fillOpacity="0.2" />
        </svg>
      </div>

      {/* 2. タイポグラフィ部分（現行デザイン維持、配色だけSVG寄せ） */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "font-black tracking-tighter flex items-baseline",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[#5E8365]">未病</span>
          <span className="text-[#5E8365]">レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[#D9A54A]">MIBYO RADAR</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-400">PERSONAL FORECAST</span>
          </p>
        )}
      </div>
    </div>
  );
}
