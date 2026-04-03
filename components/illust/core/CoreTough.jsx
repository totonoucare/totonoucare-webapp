"use client";

export default function CoreTough({ className = "h-full w-full", title = "タフ型" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <circle cx="60" cy="60" r="50" fill="#fdfefc" />
      <g stroke="#6a9770" strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M 35 95 L 55 65 L 75 95" /> {/* 脚 */}
        <path d="M 55 65 L 65 35" /> {/* 胴体 */}
        <path d="M 35 45 L 65 40 L 95 45" stroke="#a8c7ab" /> {/* 腕 */}
      </g>
      <circle cx="70" cy="22" r="9" fill="#6a9770" />
      <circle cx="65" cy="55" r="12" fill="#d9a54a" />
    </svg>
  );
}
