"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="glow_st" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="#fdfefc" />
      <g stroke="#6a9770" strokeWidth="10" strokeLinecap="round" fill="none">
        {/* 奥の脚 */}
        <path d="M 45 75 L 20 85" opacity="0.3" />
        {/* 胴体 */}
        <path d="M 80 45 L 45 75" />
        {/* 手前の脚 */}
        <path d="M 45 75 L 75 95" />
        {/* 腕 */}
        <path d="M 80 45 L 100 65" stroke="#a8c7ab" />
      </g>
      <circle cx="95" cy="30" r="7" fill="#6a9770" />
      <circle cx="65" cy="60" r="12" fill="url(#glow_st)" opacity="0.8" />
      <circle cx="65" cy="60" r="3" fill="#d9a54a" />
    </svg>
  );
}
