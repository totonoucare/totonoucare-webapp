// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    "home";

  const item = (key, label, Icon, href) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[20px] py-2.5 transition-all duration-200 active:scale-[0.95]",
          isActive ? "text-[var(--accent-ink)]" : "text-slate-400 hover:text-slate-600",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-10 w-10 place-items-center rounded-[14px] transition-all duration-300",
            isActive ? "bg-[var(--mint)] shadow-sm ring-1 ring-[var(--ring)] scale-110" : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[10px] uppercase tracking-wider ${isActive ? "font-black" : "font-extrabold"}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      {/* 背景の美しいグラスモーフィズム */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60" />
      {/* タブとコンテンツの境界線 */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--ring)] to-transparent" />
      
      <div className="relative mx-auto w-full max-w-[440px] px-6 py-2">
        <div className="flex items-stretch justify-between gap-2">
          {item("home", "Home", IconHome, "/")}
          {item("check", "Check", IconCheck, "/check")}
          {item("radar", "Radar", IconRadar, "/radar")}
        </div>
      </div>
    </div>
  );
}
