export default function CoreSteadySmall({ className = "h-20 w-32", title = "コツコツ型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_ss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.80" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_ss)" />
      {/* stepping stones */}
      <rect x="34" y="72" width="28" height="16" rx="8" fill="#0f172a" fillOpacity="0.08" />
      <rect x="70" y="64" width="28" height="16" rx="8" fill="#0f172a" fillOpacity="0.08" />
      <rect x="106" y="56" width="28" height="16" rx="8" fill="#0f172a" fillOpacity="0.08" />
      {/* small reserve */}
      <circle cx="160" cy="44" r="9" fill="#6a9770" fillOpacity="0.16" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
