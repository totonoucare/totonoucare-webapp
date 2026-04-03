export default function SubQiDeficiency({ title = "気虚", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 空っぽに近い器 */}
      <path d="M20 26 C 20 44, 24 46, 32 46 C 40 46, 44 44, 44 26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 底に少しだけ残った波（エネルギー） */}
      <path d="M26 40 Q 32 36, 38 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 弱々しい光のドット */}
      <circle cx="32" cy="30" r="2.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
