export default function CoreShortTerm({ className = "h-20 w-32", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_st" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.85" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_st)" />
      {/* burst */}
      <path d="M78 26l8 18 20 2-16 12 6 20-18-10-18 10 6-20-16-12 20-2 8-18z"
        fill="#0f172a" fillOpacity="0.08" />
      {/* accelerator arrow */}
      <path d="M44 86h78" stroke="#0f172a" strokeOpacity="0.20" strokeWidth="4" strokeLinecap="round" />
      <path d="M116 76l22 10-22 10" fill="none" stroke="#0f172a" strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* low reserve dot */}
      <circle cx="156" cy="42" r="8" fill="#6a9770" fillOpacity="0.18" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
