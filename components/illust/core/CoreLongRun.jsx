export default function CoreLongRun({ className = "h-20 w-32", title = "長持ち型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_lr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.80" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_lr)" />
      {/* infinity */}
      <path
        d="M64 62c8-10 20-10 28 0 8 10 20 10 28 0 8-10 20-10 28 0"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.18"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M64 62c8 10 20 10 28 0 8-10 20-10 28 0 8 10 20 10 28 0"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.10"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* large reserve */}
      <rect x="30" y="80" width="100" height="10" rx="5" fill="#6a9770" fillOpacity="0.18" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
