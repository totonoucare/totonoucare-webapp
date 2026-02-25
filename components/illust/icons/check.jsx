// components/illust/icons/check.jsx
"use client";

export function IconCheck({ className = "h-7 w-7", ...props }) {
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

export function IconHistory({ className = "h-7 w-7", ...props }) {
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
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

export function IconInfo({ className = "h-7 w-7", ...props }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h0" />
    </svg>
  );
}
