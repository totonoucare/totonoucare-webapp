export default function SubFluidDamp({ title = "水滞", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 下に重心がある重い雫の輪郭 */}
      <path d="M32 18 C 42 30, 45 37, 45 43 C 45 50.1, 39.1 56, 32 56 C 24.9 56, 19 50.1, 19 43 C 19 37, 22 30, 32 18 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* 内部に溜まった淀んだ波 */}
      <path d="M23 44 Q 27.5 40, 32 44 T 41 44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M26 50 Q 29 47, 32 50 T 38 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
