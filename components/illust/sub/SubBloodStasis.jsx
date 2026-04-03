export default function SubBloodStasis({ title = "血瘀", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 硬い六角形の結晶 */}
      <polygon points="32,18 44,25 44,39 32,46 20,39 20,25" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 18 V 32 L 44 39 M32 32 L 20 39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 滞りの重さ・芯 */}
      <circle cx="32" cy="32" r="4" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
