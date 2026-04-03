// components/layout/AppShell.js
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
    <div className="sticky top-0 z-40 bg-[#fdfefc]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#fdfefc]/60 transition-all">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="w-[88px] shrink-0">{left || null}</div>

          <div className="min-w-0 flex-1 text-center">
            <div className="text-[15px] font-black tracking-tight text-slate-900 truncate">
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
      {/* コンテンツとの境界を上品に区切る、消えるグラデーションライン */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />
    </div>
  );
}

/**
 * 汎用カードモジュール
 */
export function Module({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[32px] bg-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)] ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

/**
 * モジュール内のヘッダー（アイコン＋タイトル）
 */
export function ModuleHeader({ icon, title, sub, right }) {
  return (
    <div className="px-6 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          {icon ? (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_30%)] shadow-sm ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 pt-0.5">
            <div className="text-[19px] font-black tracking-tight text-slate-900 leading-tight">
              {title}
            </div>
            {sub ? (
              <div className="mt-1 text-[12px] font-bold text-slate-500">{sub}</div>
            ) : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-5 h-px w-full bg-slate-100" />
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

      <div className="mx-auto w-full max-w-[440px] px-4 pt-2">
        {/* 全体の縦の余白感を調整 */}
        <div className="space-y-6 pb-4">{children}</div>
      </div>

      {noTabs ? null : <BottomTabs />}
    </div>
  );
}
