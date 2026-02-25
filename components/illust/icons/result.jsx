// components/illust/icons/result.jsx
"use client";

export function IconChevron({ className = "h-5 w-5 transition-transform group-open:rotate-180", ...props }) {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconMemo({ className = "h-7 w-7", ...props }) {
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
      <path d="M8 7h10M8 11h10M8 15h7" />
      <path d="M6 3h14a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function IconCompass({ className = "h-7 w-7", ...props }) {
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
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
      <path d="M12 7v2M17 12h-2M12 17v-2M7 12h2" />
    </svg>
  );
}

export function IconRobot({ className = "h-7 w-7", ...props }) {
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
      <path d="M12 3v3" />
      <path d="M8 6h8" />
      <rect x="5" y="8" width="14" height="11" rx="4" />
      <path d="M9 13h0M15 13h0" />
      <path d="M9 16c1 .8 5 .8 6 0" />
    </svg>
  );
}

export function IconBolt({ className = "h-7 w-7", ...props }) {
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
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function IconBrain({ className = "h-[22px] w-[22px]", ...props }) {
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
      <path d="M8 7a3 3 0 0 1 6 0v10a3 3 0 0 1-6 0" />
      <path d="M8 9a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3" />
      <path d="M14 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}

export function IconRadar({ className = "h-[22px] w-[22px]", ...props }) {
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
      <path d="M12 12l7-7" />
      <path d="M12 12a7 7 0 1 0 7 7" />
      <path d="M12 12V3" />
      <path d="M12 12h9" />
      <path d="M5 19l2-2" />
    </svg>
  );
}

export function IconResult({ className = "h-7 w-7", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3h10v18H7z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
