"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_14px_28px_-16px_rgba(40,55,48,0.24)] ring-1 ring-[color:var(--ring)]",
          compact ? "h-10 w-10 rounded-[14px]" : "h-14 w-14 rounded-[20px]",
        ].join(" ")}
      >
        <img
          src="/illust/brand/mibyo-radar-icon.webp"
          alt=""
          aria-hidden="true"
          draggable="false"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-col justify-center">
        <div
          className={[
            "flex items-baseline font-black tracking-tighter",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[var(--accent)]">未病レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[var(--gold)]">MIBYOU RADAR</span>
            <span className="mx-2 text-[#d8d3c4]">|</span>
            <span className="text-[#959fb0]">PERSONAL FORECAST</span>
          </p>
        )}
      </div>
    </div>
  );
}

