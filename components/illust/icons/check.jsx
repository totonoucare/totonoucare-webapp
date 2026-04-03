// components/illust/icons/check.jsx
"use client";

export function IconCheck({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHistory({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInfo({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="8" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="4" width="16" height="16" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.25" fill="currentColor" />
    </svg>
  );
}
