export default function MeridianHeartSI({ title = "肩〜腕ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="heartGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <circle cx="36" cy="36" r="32" fill="currentColor" opacity="0.03" />
      
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.2">
        <circle cx="36" cy="15" r="7" />
        <path d="M 31 21 V 24 C 31 26, 28 27, 22 27 C 15 27, 10 33, 10 42 V 56" />
        <path d="M 41 21 V 24 C 41 26, 44 27, 50 27 C 57 27, 62 33, 62 42 V 56" />
        <path d="M 23 38 C 23 48, 26 58, 26 58" />
        <path d="M 49 38 C 49 48, 46 58, 46 58" />
      </g>

      <g filter="url(#heartGlow)">
        <path d="M 24 36 C 22 40, 20 46, 18 52" fill="none" stroke="url(#heartGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 48 36 C 50 40, 52 46, 54 52" fill="none" stroke="url(#heartGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 36 30 C 30 30, 26 33, 24 36" fill="none" stroke="url(#heartGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 36 30 C 42 30, 46 33, 48 36" fill="none" stroke="url(#heartGrad)" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* ツボ（胸の中央、脇、二の腕内側） */}
        <circle cx="36" cy="30" r="2.5" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="24" cy="36" r="1.5" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="48" cy="36" r="1.5" fill="#fff" stroke="#059669" strokeWidth="1" />
      </g>
    </svg>
  );
}
