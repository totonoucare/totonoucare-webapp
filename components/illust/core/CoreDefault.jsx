export default function CoreDefault({ className = "h-20 w-32", title = "タイプ" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="core_default_g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.85" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#core_default_g)" />
      <path d="M34 78c24-36 62-48 94-36 22 8 34 22 44 40" fill="none" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="48" r="10" fill="#6a9770" fillOpacity="0.22" />
      <circle cx="146" cy="56" r="12" fill="#6a9770" fillOpacity="0.18" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
