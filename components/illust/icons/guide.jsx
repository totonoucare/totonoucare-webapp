// components/illust/icons/guide.jsx
"use client";

export function IconSpark({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 18L19 15L22 14L19 13L18 10L17 13L14 14L17 15L18 18Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

export function IconChecklist({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="5" y="4" width="14" height="17" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="5" y="4" width="14" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4V2M15 4V2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 10L11 12L15 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16H15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconWeather({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M8 17A5 5 0 1 1 9.5 7.5A6 6 0 1 1 19 12A4 4 0 1 1 16 19H8Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 17A5 5 0 1 1 9.5 7.5A6 6 0 1 1 19 12A4 4 0 1 1 16 19H8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14L11 18H14L12 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCalendar({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="5" width="16" height="16" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="5" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 3V7M8 3V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 11H20" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 15L12 17L15 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ★ ベース体質用：しっかりと根を張る人影と胸のコア */
export function IconConstitution({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.1" />
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="2.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

/* ★ 経絡ライン用：ベース体質と被らないよう、肩〜腕のラインとポイントを強調 */
export function IconBodyLine({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 21V14C7 11 9 9 12 9C15 9 17 11 17 14V21" fill="currentColor" fillOpacity="0.05" />
      <path d="M7 21V14C7 11 9 9 12 9C15 9 17 11 17 14V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="14" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
      <path d="M7 14v5M17 14v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
    </svg>
  );
}

/* ★ ツボ用：ピンポイントで効く的（ターゲット・波紋） */
export function IconTsubo({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.1" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ★ 食養生用：湯気の立つお椀 */
export function IconBowl({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M4 11h16v3c0 4.4-3.6 8-8 8s-8-3.6-8-8v-3z" fill="currentColor" fillOpacity="0.15" />
      <path d="M4 11h16v3c0 4.4-3.6 8-8 8s-8-3.6-8-8v-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5l1 3M12 4v4M16 5l-1 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
