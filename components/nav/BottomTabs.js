"use client";

import { usePathname, useRouter } from "next/navigation";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}

export default function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const active =
    pathname === "/" ? "home" :
    pathname.startsWith("/check") ? "check" :
    pathname.startsWith("/radar") ? "radar" :
    // result/history/guide は home 扱いに寄せる（迷子防止）
    "home";

  const item = (key, label, Icon, href) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] py-2",
          isActive ? "text-[var(--accent-ink)]" : "text-slate-500",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-9 w-9 place-items-center rounded-[14px] transition",
            isActive ? "bg-[var(--mint)] ring-1 ring-[var(--ring)]" : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[11px] font-extrabold ${isActive ? "" : "font-bold"}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/92 backdrop-blur supports-[backdrop-filter]:bg-white/75 ring-1 ring-[var(--ring)]">
      <div className="mx-auto w-full max-w-[440px] px-4 py-2">
        <div className="flex items-stretch gap-2 rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-1 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.35)]">
          {item("home", "ホーム", IconHome, "/")}
          {item("check", "体質チェック", IconCheck, "/check")}
          {item("radar", "体調予報", IconRadar, "/radar")}
        </div>
      </div>
    </div>
  );
}
