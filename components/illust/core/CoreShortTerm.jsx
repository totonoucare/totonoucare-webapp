"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="bgGrad_st" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>
        <radialGradient id="coreGlow_st" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="glowBlur_st" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      
      <rect width="120" height="120" fill="url(#bgGrad_st)" />
      
      {/* 踏み癖: アクセル (上向きの鋭い波紋) */}
      <path d="M 30 90 Q 60 30 90 90" fill="none" stroke="#6a9770" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M 45 95 Q 60 50 75 95" fill="none" stroke="#6a9770" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
      
      {/* 余力: 小 (小さなコア) */}
      <circle cx="60" cy="65" r="18" fill="url(#coreGlow_st)" opacity="0.6" filter="url(#glowBlur_st)" />
      <circle cx="60" cy="65" r="4" fill="#d9a54a" opacity="0.9" />
    </svg>
  );
}
