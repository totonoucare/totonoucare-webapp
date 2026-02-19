export default function CoreBalance({ className = "h-20 w-32", title = "バランス型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_bal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.80" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_bal)" />
      {/* scale */}
      <path d="M100 34v44" stroke="#0f172a" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 48h60" stroke="#0f172a" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 48l-16 22h32l-16-22z" fill="#0f172a" fillOpacity="0.07" />
      <path d="M130 48l-16 22h32l-16-22z" fill="#0f172a" fillOpacity="0.07" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
