export default function SubFluidDamp({ title = "水滞", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="fluidDampGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#e0f2fe" opacity="0.6" />
      
      {/* 下ぶくれになった重い雫（むくみ） */}
      <path d="M 32 14 C 42 28, 46 36, 46 42 C 46 49.7, 39.7 56, 32 56 C 24.3 56, 18 49.7, 18 42 C 18 36, 22 28, 32 14 Z" fill="url(#fluidDampGrad)" />
      <path d="M 32 14 C 42 28, 46 36, 46 42 C 46 49.7, 39.7 56, 32 56 C 24.3 56, 18 49.7, 18 42 C 18 36, 22 28, 32 14 Z" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinejoin="round" />
      
      {/* 内部に溜まった淀んだ波 */}
      <path d="M 21 42 Q 26.5 38, 32 42 T 43 42" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 24 48 Q 28 45, 32 48 T 40 48" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
