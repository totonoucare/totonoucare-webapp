export default function MeridianDefault({ title = "経絡ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="30" fill="currentColor" opacity="0.10" />
      <path d="M36 16c-8 0-13 6-13 13v5c0 3-2 7-6 12 4 6 12 10 19 10s15-4 19-10c-4-5-6-9-6-12v-5c0-7-5-13-13-13Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M36 28v22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 41h24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
