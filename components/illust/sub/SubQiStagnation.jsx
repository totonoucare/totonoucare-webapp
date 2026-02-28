// components/illust/sub/SubQiStagnation.jsx
export default function SubQiStagnation({ title = "気滞", className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>
      {/* 仮SVG：後で差し替え前提 */}
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M18 34c6-10 22-10 28 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 22c4 4 8 6 12 6s8-2 12-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="24" cy="38" r="2.5" fill="currentColor" />
      <circle cx="40" cy="38" r="2.5" fill="currentColor" />
    </svg>
  );
}
