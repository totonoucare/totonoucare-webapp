"use client";

import { useId } from "react";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const logoBgGradId = `logoBgGrad-${uid}`;
  const radarSweepId = `radarSweep-${uid}`;

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* アイコン部分 */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[14px]" : "h-14 w-14 rounded-[20px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={logoBgGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F4F7F4" />
            </linearGradient>

            <linearGradient id={radarSweepId} x1="0.5" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d9a54a" />
              <stop offset="100%" stopColor="#879E8B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 背景 */}
          <rect width="64" height="64" fill={`url(#${logoBgGradId})`} />

          {/* 背景の波紋 */}
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="#CCDACC"
            strokeWidth="1.5"
          />
          <circle
            cx="32"
            cy="32"
            r="14"
            fill="none"
            stroke="#879E8B"
            strokeWidth="1.5"
            strokeOpacity="0.72"
          />

          {/* レーダーのスウィープ */}
          <path
            d="M32 10 A 22 22 0 0 1 54 32"
            fill="none"
            stroke={`url(#${radarSweepId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* クロスヘア */}
          <path
            d="M32 14 L32 20 M32 44 L32 50 M14 32 L20 32 M44 32 L50 32"
            stroke="#6F8774"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.76"
          />

          {/* 中央のコア */}
          <circle cx="32" cy="32" r="5" fill="#d9a54a" />
          <circle cx="32" cy="32" r="5" fill="#FFFFFF" fillOpacity="0.22" />
        </svg>
      </div>

      {/* タイポグラフィ部分 */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "flex items-baseline font-black tracking-tighter",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[#5E8365]">未病レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[#d9a54a]">MIBYO RADAR</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-400">PERSONAL FORECAST</span>
          </p>
        )}
      </div>
    </div>
  );
}
