// components/layout/AppShell.js
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import BottomTabs from "@/components/nav/BottomTabs";

/* -----------------------------
 * Inline Icons（軽量・統一）
 * ---------------------------- */
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2z" />
      <path d="M19 13l.7 3L22 17l-2.3 1-.7 3-.7-3L16 17l2.3-1 .7-3z" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/* -----------------------------
 * UI primitives（共通）
 * ---------------------------- */
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
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{title}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

/* -----------------------------
 * AppHeader（AppShellの中核）
 * - brand / title / subtitle
 * - back（router.back or href）
 * - left/right slot
 * ---------------------------- */
/**
 * @param {object} props
 * @param {"brand"|"title"} [props.variant]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {boolean} [props.back]         // trueなら戻るボタンを左に出す
 * @param {string}  [props.backHref]     // back=true かつ href 指定なら push
 * @param {function} [props.onBack]      // back時に任意ハンドラ
 * @param {React.ReactNode} [props.left] // left slot（backが優先）
 * @param {React.ReactNode} [props.right]
 * @param {string} [props.brandText]
 */
export function AppHeader({
  variant = "title",
  title = "",
  subtitle = "",
  back = false,
  backHref = "",
  onBack,
  left,
  right,
  brandText = "未病レーダー",
}) {
  const router = useRouter();

  const Left = useMemo(() => {
    if (back) {
      return (
        <button
          type="button"
          onClick={() => {
            if (typeof onBack === "function") return onBack();
            if (backHref) return router.push(backHref);
            return router.back();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
          aria-label="戻る"
        >
          <span className="text-slate-500"><IconChevronLeft /></span>
          もどる
        </button>
      );
    }

    if (left) return left;

    // brand variant の時は左にブランドバッジを出す（トップ感）
    if (variant === "brand") {
      return (
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-[var(--ring)]">
          <span className="text-[var(--accent-ink)]"><IconSpark /></span>
          {brandText}
        </div>
      );
    }

    return <div className="w-[88px]" />;
  }, [back, onBack, backHref, router, left, variant, brandText]);

  return (
    <div className="sticky top-0 z-30 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="w-[140px]">{Left}</div>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-extrabold tracking-tight text-slate-800">
              {title || (variant === "brand" ? "" : " ")}
            </div>
            {subtitle ? (
              <div className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="w-[140px] flex justify-end">{right || <div className="w-[88px]" />}</div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
 * AppShell
 * - ヘッダーを共通化
 * - BottomTabs の有無
 * - 余白(pb)の統一
 * ---------------------------- */
/**
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {"brand"|"title"} [props.headerVariant]
 * @param {boolean} [props.back]
 * @param {string} [props.backHref]
 * @param {function} [props.onBack]
 * @param {React.ReactNode} [props.headerLeft]
 * @param {React.ReactNode} [props.headerRight]
 * @param {boolean} [props.noHeader]
 * @param {boolean} [props.noTabs]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function AppShell({
  title = "",
  subtitle = "",
  headerVariant = "title",
  back = false,
  backHref = "",
  onBack,
  headerLeft,
  headerRight,
  noHeader = false,
  noTabs = false,
  className = "",
  children,
}) {
  return (
    <div className={["min-h-screen bg-app", noTabs ? "" : "pb-28", className].join(" ")}>
      {noHeader ? null : (
        <AppHeader
          variant={headerVariant}
          title={title}
          subtitle={subtitle}
          back={back}
          backHref={backHref}
          onBack={onBack}
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
