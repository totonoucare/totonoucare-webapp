export default function CoreMyPace({ className = "h-20 w-32", title = "マイペース型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="g_mp" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--mint)" stopOpacity="0.78" />
          <stop offset="1" stopColor="#111827" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="180" height="92" rx="26" fill="url(#g_mp)" />
      {/* metronome */}
      <path d="M84 90h32l-8-54H92l-8 54z" fill="#0f172a" fillOpacity="0.08" />
      <path d="M100 36l30 16" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
      <circle cx="130" cy="52" r="6" fill="#6a9770" fillOpacity="0.22" />
      <rect x="18" y="22" width="164" height="76" rx="22" fill="none" stroke="var(--ring)" strokeWidth="2" />
    </svg>
  );
}
