export default function MeridianHeartSI({ title = "肩〜腕ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="30" fill="currentColor" opacity="0.10" />
      <path d="M36 16c-8 0-13 6-13 13v5c0 3-2 7-6 12 4 6 12 10 19 10s15-4 19-10c-4-5-6-9-6-12v-5c0-7-5-13-13-13Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" opacity="0.35" />
      <path d="M27 26c1 6 2 9 3 13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.45" />
      <path d="M44 23c3 4 4 8 4 13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M45 37c-1 7 0 12 3 17" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M33 30c3 1 6 1 9 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
