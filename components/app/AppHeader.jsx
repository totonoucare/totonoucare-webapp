// components/app/AppHeader.jsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

function IconBack({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconSpark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2z" />
      <path d="M19 13l.7 3L22 17l-2.3 1-.7 3-.7-3L16 17l2.3-1 .7-3z" />
    </svg>
  );
}

/**
 * AppHeader
 *
 * Props:
 * - title: string (center title)
 * - subtitle?: string (small line under title)
 * - backHref?: string (if set, show back button -> router.push(backHref))
 * - onBack?: () => void (override back behavior)
 * - right?: ReactNode (right action area)
 * - badge?: { label: string } (small brand badge on the left)
 * - maxWidthClass?: string (default max-w-[440px])
 */
export default function AppHeader({
  title,
  subtitle,
  backHref,
  onBack,
  right,
  badge,
  maxWidthClass = "max-w-[440px]",
}) {
  const router = useRouter();

  const showBack = Boolean(backHref || onBack);
  const handleBack = () => {
    if (onBack) return onBack();
    if (backHref) return router.push(backHref);
    router.back();
  };

  return (
    <div className="sticky top-0 z-30 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className={`mx-auto w-full ${maxWidthClass} px-4 pt-4 pb-3`}>
        <div className="flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-2 min-w-0">
            {showBack ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
                aria-label="back"
              >
                <IconBack className="h-5 w-5 text-slate-500" />
                <span className="text-slate-500">戻る</span>
              </button>
            ) : badge ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-[var(--ring)]">
                <span className="text-[var(--accent-ink)]">
                  <IconSpark className="h-5 w-5" />
                </span>
                {badge.label}
              </div>
            ) : (
              <div className="h-10 w-[84px]" />
            )}
          </div>

          {/* Center */}
          <div className="min-w-0 text-center">
            <div className="text-sm font-extrabold tracking-tight text-slate-800 truncate">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 text-[11px] font-bold text-slate-500 truncate">
                {subtitle}
              </div>
            ) : null}
          </div>

          {/* Right */}
          <div className="shrink-0">
            {right ? right : <div className="h-10 w-[84px]" />}
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-black/5" />
    </div>
  );
}
