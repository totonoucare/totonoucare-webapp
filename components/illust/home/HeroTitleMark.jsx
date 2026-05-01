"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_8px_18px_-10px_rgba(49,115,100,0.18)] ring-1 ring-[color:var(--ring)]",
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
            <span className="text-[var(--gold)]">MIBYO RADAR</span>
            <span className="mx-2 text-[#d9d5c7]">|</span>
            <span className="text-[#9ca4b1]">PERSONAL FORECAST</span>
          </p>
        )}
      </div>
    </div>
  );
}

