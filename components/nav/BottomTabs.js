// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" opacity="0.34" />
      <path d="M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" opacity="0.34" />
      <path d="M12 12V2" />
      <path d="M12 12l5.5-5.5" strokeDasharray="1 3" opacity="0.82" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
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
          "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[18px] py-2 transition-all duration-200 active:scale-[0.95]",
          isActive ? "text-[#255F4F]" : "text-slate-400 hover:text-slate-600",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-10 w-10 place-items-center rounded-[14px] transition-all duration-300",
            isActive
              ? "scale-110 bg-[#E2F1EA] shadow-[0_12px_28px_-16px_rgba(39,111,98,0.55)] ring-1 ring-[#BFD9CC]"
              : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[10px] tracking-wide ${isActive ? "font-black" : "font-extrabold"}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72" />
      <div className="absolute top-0 inset-x-0 h-px bg-[#D3E1D5]" />

      <div className="relative mx-auto w-full max-w-[440px] px-4 py-2">
        <div className="flex items-stretch justify-between gap-1">
          {item("home", "ホーム", IconHome, "/")}
          {item("check", "体質チェック", IconCheck, "/check")}
          {item("radar", "体調予報", IconRadar, "/radar")}
        </div>
      </div>
    </div>
  );
}
