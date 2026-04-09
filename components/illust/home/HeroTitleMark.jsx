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

            <radialGradient id={glowGradId} cx="70%" cy="20%" r="75%">
              <stop offset="0%" stopColor="#EEF7F1" />
              <stop offset="100%" stopColor="#EEF7F1" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${cardGradId})`} />
          <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${glowGradId})`} />

          {/* 外周リング：少し右に寄せて左下の重さを軽減 */}
          <path
            d="M22.5 52.5
               A21.5 21.5 0 0 1 12.2 31.5
               A21.5 21.5 0 0 1 31.8 10.8"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 電波アーク：受信点の右上に向かって開くよう再設計 */}
          <g fill="none" stroke={`url(#${signalGradId})`} strokeLinecap="round">
            <path
              d="M39.0 23.0 A6.8 6.8 0 0 1 45.2 16.8"
              strokeWidth="3.0"
            />
            <path
              d="M37.7 20.6 A10.2 10.2 0 0 1 48.4 10.9"
              strokeWidth="3.0"
            />
            <path
              d="M36.1 17.9 A13.8 13.8 0 0 1 51.6 6.3"
              strokeWidth="3.0"
            />
            <path
              d="M34.5 15.1 A17.2 17.2 0 0 1 54.8 3.4"
              strokeWidth="3.0"
            />
          </g>

          {/* パラボラ本体：少し右上へ */}
          <g transform="translate(1.8 -1.4) rotate(-24 29 33)">
            <path
              d="M24.9 36.7 L21.6 44.2"
              stroke="#0F173E"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <path d="M20.1 44.3 L28.9 44.3 L24.2 37.5 Z" fill="#0F173E" />
            <path
              d="M23.1 42.9 L24.9 39.2"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            <ellipse
              cx="28.4"
              cy="31.2"
              rx="10.6"
              ry="6.3"
              fill="#FFFFFF"
              stroke="#0F173E"
              strokeWidth="3.8"
            />

            <path
              d="M22.8 29.4 C21.5 30.4 21.9 32.2 24.2 34.1"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <path
              d="M28.7 31.2 L36.7 26.7"
              stroke="#0F173E"
              strokeWidth="3.1"
              strokeLinecap="round"
            />
            <circle cx="38.9" cy="25.5" r="2.9" fill="#0F173E" />
          </g>

          {/* 下部のゆらぎ：ほんの少し右へ */}
          <path
            d="M28.8 50.9
               C33.5 49.5 38.1 50.0 42.8 51.8
               C45.1 52.7 47.6 52.9 50.0 52.3"
            fill="none"
            stroke="#D9EEE4"
            strokeWidth="5.4"
            strokeLinecap="round"
          />
          <path
            d="M31.5 52.4
               C35.4 50.9 39.6 50.9 43.8 52.2
               C46.0 52.9 48.2 53.0 50.6 52.5"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.1"
            strokeLinecap="round"
          />
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
