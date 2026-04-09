"use client";

import { useId } from "react";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const signalGradId = `signal-grad-${uid}`;
  const cardGradId = `card-grad-${uid}`;
  const glowGradId = `glow-grad-${uid}`;

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_6px_16px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[12px]" : "h-14 w-14 rounded-[18px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={cardGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#FBFCFA" />
            </linearGradient>

            <linearGradient id={signalGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E8A91A" />
              <stop offset="55%" stopColor="#E7C64A" />
              <stop offset="100%" stopColor="#B9DEC8" />
            </linearGradient>

            <radialGradient id={glowGradId} cx="68%" cy="24%" r="70%">
              <stop offset="0%" stopColor="#EEF7F1" />
              <stop offset="100%" stopColor="#EEF7F1" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${cardGradId})`} />
          <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${glowGradId})`} />

          {/* 右上の電波アーク */}
          <g fill="none" stroke={`url(#${signalGradId})`} strokeLinecap="round">
            <path
              d="M31.5 27.5 A8.5 8.5 0 0 1 41 19"
              strokeWidth="3.2"
            />
            <path
              d="M27.5 27.8 A13 13 0 0 1 44.5 15.7"
              strokeWidth="3.2"
            />
            <path
              d="M23.7 28.4 A17.2 17.2 0 0 1 48.3 12.1"
              strokeWidth="3.2"
            />
            <path
              d="M20 29.3 A21.5 21.5 0 0 1 52 8.8"
              strokeWidth="3.2"
            />
          </g>

          {/* 外周リング */}
          <path
            d="M20 54
               A24 24 0 0 1 8 32.5
               A24 24 0 0 1 30.5 8"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 下部の淡いゆらぎ */}
          <path
            d="M27.5 50.7
               C32.3 49.2 37.1 49.7 41.8 51.6
               C44.3 52.5 46.8 52.7 49.5 52.2"
            fill="none"
            stroke="#D9EEE4"
            strokeWidth="5.6"
            strokeLinecap="round"
          />

          {/* 下部の波線 */}
          <path
            d="M31 52.4
               C35.1 50.7 39.4 50.7 43.8 52.2
               C46.3 53.1 48.7 53.2 51.3 52.6"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* パラボラアンテナ */}
          <g transform="rotate(-24 29 33)">
            {/* 支柱 */}
            <path
              d="M24.9 36.7 L21.6 44.2"
              stroke="#0F173E"
              strokeWidth="3.6"
              strokeLinecap="round"
            />

            {/* 土台 */}
            <path
              d="M20.1 44.3 L28.9 44.3 L24.2 37.5 Z"
              fill="#0F173E"
            />

            {/* 支柱の抜き */}
            <path
              d="M23.1 42.9 L24.9 39.2"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* パラボラ本体 */}
            <ellipse
              cx="28.4"
              cy="31.2"
              rx="10.6"
              ry="6.3"
              fill="#FFFFFF"
              stroke="#0F173E"
              strokeWidth="3.8"
            />

            {/* パラボラ内側ハイライト */}
            <path
              d="M22.8 29.4
                 C21.5 30.4 21.9 32.2 24.2 34.1"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* 受信アーム */}
            <path
              d="M28.7 31.2 L36.7 26.7"
              stroke="#0F173E"
              strokeWidth="3.1"
              strokeLinecap="round"
            />

            {/* 受信点 */}
            <circle cx="38.9" cy="25.5" r="2.9" fill="#0F173E" />
          </g>
        </svg>
      </div>

      <div className="flex flex-col justify-center">
        <div
          className={[
            "font-black tracking-tighter flex items-baseline",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[#0F173E]">未病</span>
          <span className="text-[#E8A91A]">レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[#0F173E]">Mibyo</span>
            <span className="ml-1 text-slate-600">Radar</span>
            <span className="ml-2 text-slate-300">|</span>
            <span className="ml-2 text-slate-400">Personal Forecast</span>
          </p>
        )}
      </div>
    </div>
  );
}
