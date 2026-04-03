"use client";

export default function CoreActive({ className = "h-full w-full", title = "アクティブ型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <circle cx="60" cy="60" r="50" fill="#fdfefc" />
      <g stroke="#6a9770" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M 40 90 L 60 65 L 80 90" opacity="0.4" /> {/* 脚 */}
        <path d="M 60 65 L 60 35" /> {/* 胴体 */}
        <path d="M 30 40 L 60 45 L 90 40" stroke="#a8c7ab" /> {/* 腕 */}
      </g>
      <circle cx="60" cy="20" r="8" fill="#6a9770" />
      <circle cx="60" cy="55" r="7" fill="#d9a54a" />
    </svg>
  );
}
