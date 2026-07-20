// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconHome, IconKarte, IconRadar, IconCare, IconChat } from "@/components/illust/icons/app";

export default function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const active =
    pathname === "/" ? "home" :
    pathname.startsWith("/check") || pathname.startsWith("/result") || pathname.startsWith("/karte") ? "check" :
    pathname.startsWith("/radar") ? "radar" :
    pathname.startsWith("/care-navi") ? "care" :
    pathname.startsWith("/records") ? "records" :
    "none";

  const item = (key, label, Icon, href) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[18px] py-2 transition-all duration-200 active:scale-[0.95]",
          isActive ? "text-[#173F3A]" : "text-slate-400 hover:text-slate-600",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-10 w-10 place-items-center rounded-[14px] transition-all duration-300",
            isActive
              ? "scale-110 bg-[#DCEFEA] shadow-[0_12px_28px_-16px_rgba(19,138,115,0.42)] ring-1 ring-[#B6D8CF]"
              : "bg-transparent",
          ].join(" ")}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className={`text-[8.5px] tracking-wide sm:text-[9.5px] ${isActive ? "font-black" : "font-extrabold"}`}>
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
          {item("check", "トリセツ", IconKarte, "/check")}
          {item("radar", "体調予報", IconRadar, "/radar")}
          {item("records", "記録・相談", IconChat, "/records?tab=consult")}
          {item("care", "ショップ", IconCare, "/care-navi")}
        </div>
      </div>
    </div>
  );
}
