// components/nav/BottomTabs.js
"use client";

import { usePathname, useRouter } from "next/navigation";

function IconHome() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.05"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" opacity="0.32" />
      <path d="M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" opacity="0.32" />
      <path d="M12 12V2" />
      <path d="M12 12l5.5-5.5" strokeDasharray="1 3" opacity="0.82" />
      <circle cx="12" cy="12" r="2.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const active =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/check")
        ? "check"
        : pathname.startsWith("/radar")
          ? "radar"
          : "home";

  const item = (key, label, Icon, href) => {
    const isActive = active === key;

    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        aria-current={isActive ? "page" : undefined}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-[18px] py-2 transition-all duration-200 active:scale-[0.96]",
          isActive
            ? "text-[var(--accent-ink)]"
            : "text-[#95A1B2] hover:text-[#647386]",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-10 w-10 place-items-center rounded-[14px] transition-all duration-300",
            isActive
              ? "scale-110 bg-[color-mix(in_srgb,var(--accent),white_78%)] shadow-[0_14px_28px_-18px_rgba(41,85,72,0.58)] ring-1 ring-[color-mix(in_srgb,var(--accent),white_58%)]"
              : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>

        <span
          className={[
            "text-[10px] tracking-wide transition-colors duration-200",
            isActive ? "font-black" : "font-extrabold",
          ].join(" ")}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--panel),white_10%)]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--panel),white_10%)]/74" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent),white_74%)] to-transparent" />

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


