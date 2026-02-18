"use client";

import BottomTabs from "@/components/nav/BottomTabs";

export function AppBar({ title, left, right }) {
  return (
    <div className="sticky top-0 z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="w-[88px]">{left || null}</div>
          <div className="text-sm font-extrabold tracking-tight text-slate-800">{title}</div>
          <div className="w-[88px] flex justify-end">{right || null}</div>
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
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{title}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

export default function AppShell({ title, children, noTabs = false }) {
  return (
    <div className={`min-h-screen bg-app ${noTabs ? "" : "pb-24"}`}>
      <AppBar title={title} />
      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">{children}</div>
      </div>
      {noTabs ? null : <BottomTabs />}
    </div>
  );
}
