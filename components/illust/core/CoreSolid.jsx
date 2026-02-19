export default function CoreSolid({ className = "h-20 w-32", title = "どっしり型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_sol" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.78" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_sol)" />
      {/* boulder */}
      <path d="M56 90c-10-6-16-16-14-28 3-16 18-28 40-30 28-2 52 10 58 28 5 14-3 28-18 34-20 8-48 6-66-4z"
        fill="#0f172a" fillOpacity="0.08" />
      {/* big reserve */}
      <rect x="28" y="30" width="96" height="10" rx="5" fill="#6a9770" fillOpacity="0.18" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
