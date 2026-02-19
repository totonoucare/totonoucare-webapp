export default function CoreActive({ className = "h-20 w-32", title = "アクティブ型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_act" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.85" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_act)" />
      {/* forward lane */}
      <path d="M36 82c30-30 66-44 128-44" fill="none" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
      <path d="M118 34l22 4-16 16" fill="none" stroke="#0f172a" strokeOpacity="0.20" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* balanced reserve */}
      <rect x="36" y="36" width="46" height="10" rx="5" fill="#6a9770" fillOpacity="0.18" />
      <rect x="36" y="52" width="62" height="10" rx="5" fill="#6a9770" fillOpacity="0.14" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
