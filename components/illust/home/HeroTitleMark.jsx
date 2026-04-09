"use client";

import Image from "next/image";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const wrapperClass = compact ? "h-10 w-10 rounded-[12px]" : "h-14 w-14 rounded-[18px]";
  const iconPadClass = compact ? "p-[5px]" : "p-[7px]";
  const titleClass = compact
    ? "text-[20px] leading-none"
    : "text-[28px] leading-[1.05]";
  const subClass = compact
    ? "hidden"
    : "mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase";

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_6px_16px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          wrapperClass,
        ].join(" ")}
      >
        <div className={["relative h-full w-full", iconPadClass].join(" ")}>
          <Image
            src="/illust/brand/mibyo-radar-icon.webp"
            alt=""
            fill
            className="object-contain"
            sizes={compact ? "40px" : "56px"}
            priority
          />
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <div
          className={[
            "flex items-baseline font-black tracking-tighter",
            titleClass,
          ].join(" ")}
        >
          <span className="text-[#0F173E]">未病</span>
          <span className="text-[#E7A910]">レーダー</span>
        </div>

        <p className={subClass}>
          <span className="text-[#0F173E]">MIBYO RADAR</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">PERSONAL FORECAST</span>
        </p>
      </div>
    </div>
  );
}
