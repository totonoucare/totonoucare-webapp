// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconHome, IconKarte, IconRadar, IconCare } from "@/components/illust/icons/app";

export default function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const active =
    pathname === "/" ? "home" :
    pathname.startsWith("/check") || pathname.startsWith("/result") || pathname.startsWith("/karte") ? "check" :
    pathname.startsWith("/radar") ? "radar" :
    pathname.startsWith("/care-navi") ? "care" :
    "none";

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
          <Icon className="h-6 w-6" />
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
          {item("check", "カルテ", IconKarte, "/check")}
          {item("radar", "予報", IconRadar, "/radar")}
          {item("care", "ケアナビ", IconCare, "/care-navi")}
        </div>
      </div>
    </div>
  );
}
