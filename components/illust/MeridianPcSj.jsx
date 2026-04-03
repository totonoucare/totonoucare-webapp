export default function MeridianPcSj({ title = "上肢外側ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="30" fill="currentColor" opacity="0.10" />
      <path d="M36 16c-8 0-13 6-13 13v5c0 3-2 7-6 12 4 6 12 10 19 10s15-4 19-10c-4-5-6-9-6-12v-5c0-7-5-13-13-13Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" opacity="0.35" />
      <path d="M40 24c1 5 2 9 2 13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M45 29c4 2 6 5 7 9" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M44 38c2 6 4 10 8 14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M31 28c4-2 8-2 11 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
