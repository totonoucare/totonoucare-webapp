// components/illust/home/HeroTitleMark.jsx
"use client";

export default function HeroTitleMark({ compact = false, className = "" }) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* アイコン部分 */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_8px_18px_-10px_rgba(var(--accent-ink-rgb),0.55)] ring-1 ring-[var(--ring)]",
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

      {/* タイポグラフィ部分 */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "flex items-baseline font-black tracking-tighter",
            compact ? "text-[20px] leading-none" : "text-[28px] leading-[1.05]",
          ].join(" ")}
        >
          <span className="text-[var(--brand-title)]">未病レーダー</span>
        </div>

        {!compact && (
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase">
            <span className="text-[var(--gold)]">MIBYO RADAR</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-400">PERSONAL FORECAST</span>
          </p>
        )}
      </div>
    </div>
  );
}
