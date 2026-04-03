export default function MeridianSpleenST({ title = "前面・消化軸ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="30" fill="currentColor" opacity="0.10" />
      <path d="M36 16c-8 0-13 6-13 13v5c0 3-2 7-6 12 4 6 12 10 19 10s15-4 19-10c-4-5-6-9-6-12v-5c0-7-5-13-13-13Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" opacity="0.35" />
      <path d="M36 24c0 4 0 8 1 12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="36" cy="38" rx="11" ry="7" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M36 45c1 6 0 11-3 15" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M42 45c2 5 2 9 1 13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
