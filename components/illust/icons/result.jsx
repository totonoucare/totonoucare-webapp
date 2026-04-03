// components/illust/icons/result.jsx
"use client";

export function IconChevron({ className = "h-5 w-5 transition-transform group-open:rotate-180", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function IconMemo({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="3" width="16" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCompass({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconRobot({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="8" width="16" height="12" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="8" width="16" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8V4M9 4h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconBolt({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRadar({ className = "h-[22px] w-[22px]", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M12 22A10 10 0 0 0 12 2a10 10 0 0 0 0 20z" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 22A10 10 0 0 0 12 2a10 10 0 0 0 0 20z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 17a5 5 0 0 0 0-10 5 5 0 0 0 0 10z" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M12 12l7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

export function IconResult({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12l2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --- 新規追加 --- */

export function IconAnalysis({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15.5" cy="16.5" r="2.5" fill="currentColor" />
      <path d="M17.5 18.5L20 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBody({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="6" r="3.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="6" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6 21v-5c0-3.5 2.5-6 6-6s6 2.5 6 6v5" fill="currentColor" fillOpacity="0.1" />
      <path d="M6 21v-5c0-3.5 2.5-6 6-6s6 2.5 6 6v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconCloud({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M6.5 17.5A4.5 4.5 0 1 1 9 9.2a6 6 0 1 1 10.8 3.8 4 4 0 1 1-3.3 7h-10z" fill="currentColor" fillOpacity="0.15" />
      <path d="M6.5 17.5A4.5 4.5 0 1 1 9 9.2a6 6 0 1 1 10.8 3.8 4 4 0 1 1-3.3 7h-10z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
