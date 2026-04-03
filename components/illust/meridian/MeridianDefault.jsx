export default function MeridianDefault({ title = "経絡ライン", className = "", ...props }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="36" cy="36" r="32" fill="currentColor" opacity="0.03" />
      
      {/* 共通の洗練された人体シルエット */}
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
        <circle cx="36" cy="15" r="7" />
        <path d="M 31 21 V 24 C 31 26, 28 27, 22 27 C 15 27, 10 33, 10 42 V 56" />
        <path d="M 41 21 V 24 C 41 26, 44 27, 50 27 C 57 27, 62 33, 62 42 V 56" />
        <path d="M 23 38 C 23 48, 26 58, 26 58" />
        <path d="M 49 38 C 49 48, 46 58, 46 58" />
      </g>
    </svg>
  );
}
