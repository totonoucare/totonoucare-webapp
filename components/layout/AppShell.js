"use client";

import BottomTabs from "@/components/nav/BottomTabs";

/**
 * 共通アプリヘッダー
 * - 左：戻る or 何もなし
 * - 中：title
 * - 右：文脈アクション1つ（推奨）
 */
export function AppHeader({ title, left, right, subtitle }) {
  return (
    <div className="sticky top-0 z-30 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="w-[88px] shrink-0">{left || null}</div>

          <div className="min-w-0 flex-1 text-center">
            <div className="text-sm font-extrabold tracking-tight text-slate-800 truncate">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 text-[11px] font-bold text-slate-500 truncate">
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="w-[88px] shrink-0 flex justify-end">{right || null}</div>
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

export function ModuleHeader({ icon, title, sub, right }) {
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
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

/**
 * AppShell
 * - title: ヘッダー中央
 * - headerLeft: 左枠（戻るボタンなど）
 * - headerRight: 右枠（文脈アクション1つ推奨）
 * - subtitle: 小さい日付や補助情報（任意）
 * - noTabs: タブを消したい時（ログイン画面など）
 */
export default function AppShell({
  title,
  subtitle,
  headerLeft,
  headerRight,
  children,
  noHeader = false,
  noTabs = false,
}) {
  return (
    <div className={`min-h-screen bg-app ${noTabs ? "" : "pb-24"}`}>
      {noHeader ? null : (
        <AppHeader
          title={title}
          subtitle={subtitle}
          left={headerLeft}
          right={headerRight}
        />
      )}

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">{children}</div>
      </div>

      {noTabs ? null : <BottomTabs />}
    </div>
  );
}
