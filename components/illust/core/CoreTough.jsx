export default function CoreTough({ className = "h-20 w-32", title = "タフ型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_tough" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.85" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_tough)" />
      {/* shield */}
      <path d="M100 30l40 14v22c0 22-16 38-40 46-24-8-40-24-40-46V44l40-14z"
        fill="#0f172a" fillOpacity="0.08" />
      <path d="M100 40v58" stroke="#0f172a" strokeOpacity="0.16" strokeWidth="3" strokeLinecap="round" />
      {/* big reserve bars */}
      <rect x="28" y="76" width="64" height="10" rx="5" fill="#6a9770" fillOpacity="0.20" />
      <rect x="28" y="60" width="84" height="10" rx="5" fill="#6a9770" fillOpacity="0.16" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
