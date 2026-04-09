"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_6px_16px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[12px]" : "h-14 w-14 rounded-[18px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <rect x="0" y="0" width="64" height="64" rx="18" fill="#FFFFFF" />

          {/* 右上へ抜ける上部の電波アーク */}
          <g fill="none" strokeLinecap="round">
            <path
              d="M32.4 20.5 A6 6 0 0 1 42.0 19.6"
              stroke="#D7C661"
              strokeWidth="2.9"
            />
            <path
              d="M28.8 18.4 A10 10 0 0 1 45.2 17.0"
              stroke="#E0BC3D"
              strokeWidth="2.9"
            />
            <path
              d="M25.2 16.2 A14 14 0 0 1 48.4 14.3"
              stroke="#E7AE1E"
              strokeWidth="2.9"
            />
            <path
              d="M21.6 13.9 A18 18 0 0 1 51.6 11.4"
              stroke="#E7A910"
              strokeWidth="2.9"
            />
          </g>

          {/* 右側のミントアーク */}
          <g fill="none" strokeLinecap="round">
            <path
              d="M47.2 18.0 A10.8 10.8 0 0 1 45.0 31.8"
              stroke="#DCEADB"
              strokeWidth="2.9"
            />
            <path
              d="M50.8 16.0 A15 15 0 0 1 47.6 35.3"
              stroke="#D0E6D5"
              strokeWidth="2.9"
            />
            <path
              d="M54.2 13.8 A19 19 0 0 1 50.1 38.9"
              stroke="#BEDFCB"
              strokeWidth="2.9"
            />
            <path
              d="M57.4 11.5 A22.8 22.8 0 0 1 52.4 42.0"
              stroke="#A8D4BC"
              strokeWidth="2.9"
            />
          </g>

          {/* 左側の外周アーク */}
          <path
            d="M18.4 50.1
               A24.3 24.3 0 0 1 18.9 13.8"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.9"
            strokeLinecap="round"
          />

          {/* 中央のパラボラ本体 */}
          <g transform="translate(1,-1) rotate(-28 29 31)">
            {/* 支柱 */}
            <path
              d="M24.0 37.5 L20.5 45.1"
              stroke="#0F173E"
              strokeWidth="3.4"
              strokeLinecap="round"
            />

            {/* 土台 */}
            <path
              d="M18.6 45.4 L28.7 45.4 L23.7 38.4 Z"
              fill="#0F173E"
            />

            {/* 支柱の抜き */}
            <path
              d="M22.4 43.1 L24.0 39.7"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* 皿 */}
            <path
              d="M18.2 31.3
                 C19.0 26.1 24.0 22.4 30.2 22.4
                 C36.5 22.4 41.6 26.1 42.3 31.3
                 C38.5 33.8 34.1 35.0 30.0 35.0
                 C25.8 35.0 21.6 33.8 18.2 31.3 Z"
              fill="#0F173E"
            />

            {/* 皿の白ハイライト */}
            <path
              d="M22.7 26.9
                 C21.9 28.8 22.1 31.0 23.8 33.4"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* 受信アーム */}
            <path
              d="M29.8 30.9 L39.0 24.7"
              stroke="#0F173E"
              strokeWidth="3.0"
              strokeLinecap="round"
            />

            {/* 受信点 */}
            <circle cx="41.1" cy="23.4" r="2.9" fill="#0F173E" />
          </g>

          {/* 下の淡い面 */}
          <path
            d="M24.0 50.9
               C29.0 49.0 35.0 49.1 40.2 50.8
               C44.5 52.1 48.4 52.2 53.1 50.8
               L53.1 55.5
               L22.2 55.5
               Z"
            fill="#E5F2EA"
          />

          {/* 下の波線 */}
          <path
            d="M24.6 51.5
               C28.7 49.7 34.7 49.7 40.0 51.0
               C44.3 52.1 48.1 52.2 52.3 51.2"
            fill="none"
            stroke="#0F173E"
            strokeWidth="3.1"
            strokeLinecap="round"
          />

          {/* 右下の小さな返し */}
          <path
            d="M52.4 48.8
               C54.0 48.0 55.8 48.2 56.8 49.4
               C57.5 50.2 57.6 51.3 57.1 52.3"
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
          <span className="text-[#E7A910]">レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[#0F173E]">Mibyo Radar</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-400">Personal Forecast</span>
          </p>
        )}
      </div>
    </div>
  );
}
