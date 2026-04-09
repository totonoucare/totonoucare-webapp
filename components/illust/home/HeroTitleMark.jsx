"use client";

import Image from "next/image";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const iconSizeClass = compact ? "h-10 w-10 rounded-[12px]" : "h-14 w-14 rounded-[18px]";

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_6px_16px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          iconSizeClass,
        ].join(" ")}
      >
        <Image
          src="/brand/mibyo-radar-icon.webp"
          alt="未病レーダー アイコン"
          fill
          sizes={compact ? "40px" : "56px"}
          className="object-cover"
          priority
        />
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
