export default function MeridianSpleenST({ title = "前面・消化軸ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="stGlow" x="-20%" y="-20%" width="140%" height="140%">
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

      <g filter="url(#stGlow)">
        <path d="M 28 30 C 28 40, 29 48, 29 56" fill="none" stroke="url(#stGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 44 30 C 44 40, 43 48, 43 56" fill="none" stroke="url(#stGrad)" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* 胃・おへそ周辺の暗示 */}
        <ellipse cx="36" cy="42" rx="6" ry="8" fill="none" stroke="url(#stGrad)" strokeWidth="1.5" opacity="0.4" />
        
        {/* ツボ（腹部） */}
        <circle cx="28" cy="36" r="2" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="44" cy="36" r="2" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="36" cy="42" r="2" fill="#fff" stroke="#059669" strokeWidth="1" />
      </g>
    </svg>
  );
}
