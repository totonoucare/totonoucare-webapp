export default function MeridianKidneyBL({ title = "背骨・下半身軸ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="blGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="blGlow" x="-20%" y="-20%" width="140%" height="140%">
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

      <g filter="url(#blGlow)">
        <path d="M 36 24 V 54" fill="none" stroke="url(#blGrad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 30 26 V 52" fill="none" stroke="url(#blGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M 42 26 V 52" fill="none" stroke="url(#blGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        
        {/* ツボ（背骨・腰まわり） */}
        <circle cx="36" cy="32" r="2" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="36" cy="42" r="2" fill="#fff" stroke="#059669" strokeWidth="1" />
        <circle cx="36" cy="52" r="2.5" fill="#fff" stroke="#059669" strokeWidth="1" />
      </g>
    </svg>
  );
}
