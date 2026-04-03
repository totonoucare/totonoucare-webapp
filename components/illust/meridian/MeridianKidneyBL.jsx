export default function MeridianKidneyBL({ title = "背骨・下半身軸ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="30" fill="currentColor" opacity="0.10" />
      <path d="M36 16c-8 0-13 6-13 13v5c0 3-2 7-6 12 4 6 12 10 19 10s15-4 19-10c-4-5-6-9-6-12v-5c0-7-5-13-13-13Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" opacity="0.35" />
      <path d="M36 19v30" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M28 47c0 5 3 9 8 12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M44 47c0 5-3 9-8 12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 28c2 3 3 7 3 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      <path d="M48 28c-2 3-3 7-3 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
