// components/illust/icons/home.jsx
"use client";

export function IconSpark({ className = "h-7 w-7", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2z" />
      <path d="M19 13l.7 3L22 17l-2.3 1-.7 3-.7-3L16 17l2.3-1 .7-3z" />
    </svg>
  );
}

export function IconCheck({ className = "h-6 w-6", ...props }) {
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
      {...props}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconRadar({ className = "h-6 w-6", ...props }) {
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
      {...props}
    >
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}

export function IconRoute({ className = "h-6 w-6", ...props }) {
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
      {...props}
    >
      <path d="M5 16c2-3 4-4 7-4s5-1 7-4" />
      <path d="M6 6h0M18 18h0" />
      <path d="M6 6a2 2 0 1 0 0 .01" />
      <path d="M18 18a2 2 0 1 0 0 .01" />
    </svg>
  );
}

export function IconBook({ className = "h-6 w-6", ...props }) {
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
      {...props}
    >
      <path d="M4 19a2 2 0 0 0 2 2h14" />
      <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M8 7h8M8 11h8M8 15h6" />
    </svg>
  );
}

export function IconUser({ className = "h-6 w-6", ...props }) {
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
      {...props}
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
    </svg>
  );
}

/** home hero art (外部SVG差し替え前提の仮アート) */
export function HeroArt({ className = "h-[110px] w-full", ...props }) {
  return (
    <svg viewBox="0 0 320 140" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="home_g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9EDDD" />
          <stop offset="1" stopColor="#6a9770" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id="home_g2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111827" stopOpacity="0.08" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M18,88 C42,18 138,6 190,28 C238,48 272,38 302,18 C312,72 272,132 190,136 C108,140 34,120 18,88Z"
        fill="url(#home_g1)"
      />
      <path
        d="M20 108c40-14 86-10 120-26s60-40 156-44"
        stroke="#0f172a"
        strokeOpacity="0.18"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="78" cy="58" r="10" fill="#6a9770" fillOpacity="0.22" />
      <circle cx="214" cy="52" r="14" fill="#6a9770" fillOpacity="0.18" />
      <rect x="210" y="16" width="92" height="48" rx="18" fill="url(#home_g2)" />
    </svg>
  );
}
