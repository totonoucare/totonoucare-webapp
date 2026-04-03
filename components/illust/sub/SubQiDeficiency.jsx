export default function SubQiDeficiency({ title = "気虚", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="qiDefGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#fef3c7" opacity="0.6" />
      
      {/* ほとんど空っぽの器 */}
      <path d="M 20 28 C 20 46, 24 50, 32 50 C 40 50, 44 46, 44 28" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* 底に少しだけ残った気のエネルギー */}
      <path d="M 23 44 Q 32 40 41 44 C 40 48, 36 50, 32 50 C 28 50, 24 48, 23 44 Z" fill="url(#qiDefGrad)" />
      
      {/* 消えかけの弱々しい光のドット */}
      <circle cx="32" cy="32" r="3" fill="#f59e0b" opacity="0.9" />
      <circle cx="28" cy="24" r="1.5" fill="#fbbf24" opacity="0.8" />
      <circle cx="38" cy="20" r="2" fill="#fcd34d" opacity="0.7" />
    </svg>
  );
}
