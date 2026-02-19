export default function CoreSlowStart({ className = "h-20 w-32", title = "スロースタート型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_slow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.78" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_slow)" />
      {/* snail-ish curve */}
      <path d="M52 78c0-26 20-42 44-42 22 0 36 14 36 30 0 12-8 22-22 22-12 0-18-8-18-16 0-6 4-12 10-12"
        fill="none" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
      {/* low reserve */}
      <circle cx="158" cy="44" r="8" fill="#6a9770" fillOpacity="0.16" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
