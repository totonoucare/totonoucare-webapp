// components/illust/icons/guide.jsx
"use client";

export function IconSpark({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 18L19 15L22 14L19 13L18 10L17 13L14 14L17 15L18 18Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

export function IconChecklist({ className = "h-6 w-6", ...props }) {
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

export function IconWeather({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M8 17A5 5 0 1 1 9.5 7.5A6 6 0 1 1 19 12A4 4 0 1 1 16 19H8Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 17A5 5 0 1 1 9.5 7.5A6 6 0 1 1 19 12A4 4 0 1 1 16 19H8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14L11 18H14L12 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCalendar({ className = "h-6 w-6", ...props }) {
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

export function IconCore({ className = "h-6 w-6", ...props }) {
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

export function IconBodyLine({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="6" r="3.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="6" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 21V13C7 10.5 9 8 12 8C15 8 17 10.5 17 13V21" fill="currentColor" fillOpacity="0.05" />
      <path d="M7 21V13C7 10.5 9 8 12 8C15 8 17 10.5 17 13V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13V18M15 13V18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  );
}
