// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";

// アイコン自体のサイズも h-6 w-6 -> h-5 w-5 に少し絞りました
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" opacity="0.3" />
      <path d="M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" opacity="0.3" />
      <path d="M12 12V2" />
      <path d="M12 12l5.5-5.5" strokeDasharray="1 3" opacity="0.8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
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
          // ★高さを抑えるため py-2.5 -> py-1.5、gap-1.5 -> gap-1 に短縮
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 transition-all duration-200 active:scale-[0.95]",
          isActive ? "text-[var(--accent-ink)]" : "text-slate-400 hover:text-slate-600",
        ].join(" ")}
      >
        <span
          className={[
            // ★アイコンの枠を h-10 w-10 -> h-8 w-8 に絞り、角丸を調整
            "grid h-8 w-8 place-items-center rounded-[10px] transition-all duration-300",
            isActive ? "bg-[var(--mint)] shadow-sm ring-1 ring-[var(--ring)] scale-110" : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[9px] tracking-wide ${isActive ? "font-black" : "font-extrabold"}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    // ★ z-indexを 50 -> 40 に落とし、モーダル（シート）が上に被さるようにしました
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />
      
      {/* ★ 全体の上下余白を py-2 -> py-1.5 に */}
      <div className="relative mx-auto w-full max-w-[440px] px-4 py-1.5">
        <div className="flex items-stretch justify-between gap-1">
          {item("home", "ホーム", IconHome, "/")}
          {item("check", "体質チェック", IconCheck, "/check")}
          {item("radar", "体調予報", IconRadar, "/radar")}
        </div>
      </div>
    </div>
  );
}
