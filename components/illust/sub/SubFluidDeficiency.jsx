export default function SubFluidDeficiency({ title = "津液不足", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 蒸発して上部が開いている雫 */}
      <path d="M25 30 C 21 34, 19 38, 19 43 C 19 50.1, 24.8 56, 32 56 C 39.2 56, 45 50.1, 45 43 C 45 38, 43 34, 39 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 蒸発・乾きのライン（点線） */}
      <path d="M32 42 V 14 M25 34 V 24 M39 34 V 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 6" opacity="0.6" />
    </svg>
  );
}

