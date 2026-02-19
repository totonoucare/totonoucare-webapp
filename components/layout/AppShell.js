// components/layout/AppShell.js
"use client";

import { useRouter } from "next/navigation";
import BottomTabs from "@/components/nav/BottomTabs";

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function AppBar({
  title,
  left,
  right,
  back = false,
  backHref,
  onBack,
}) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof onBack === "function") return onBack();
    if (backHref) return router.push(backHref);
    return router.back();
  };

  return (
    <div className="sticky top-0 z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="w-[96px]">
            {back ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
              >
                <IconBack />
                戻る
              </button>
            ) : (
              left || null
            )}
          </div>

          <div className="min-w-0 text-sm font-extrabold tracking-tight text-slate-800 truncate">
            {title}
          </div>

          <div className="w-[96px] flex justify-end">{right || null}</div>
        </div>
      </div>
    </div>
  );
}

export function Module({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[26px] bg-[var(--panel)] shadow-sm ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export function ModuleHeader({ icon, title, sub }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--mint)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">
              {title}
            </div>
            {sub ? (
              <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

export default function AppShell({
  title,
  children,
  noTabs = false,

  // ✅ new options（互換：未指定なら何も起きない）
  back = false,
  backHref,
  onBack,
  headerLeft,
  headerRight,
}) {
  return (
    <div className={`min-h-screen bg-app ${noTabs ? "" : "pb-24"}`}>
      <AppBar
        title={title}
        back={back}
        backHref={backHref}
        onBack={onBack}
        left={headerLeft}
        right={headerRight}
      />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">{children}</div>
      </div>

      {noTabs ? null : <BottomTabs />}
    </div>
  );
}
