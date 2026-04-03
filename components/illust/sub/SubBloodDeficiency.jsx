export default function SubBloodDeficiency({ title = "血虚", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="bloodDefGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#ffe4e6" opacity="0.6" />
      
      {/* 下半分にだけ残った血液（滋養） */}
      <path d="M 18 42 Q 32 38 46 42 C 46 49.7, 39.7 56, 32 56 C 24.3 56, 18 49.7, 18 42 Z" fill="url(#bloodDefGrad)" />
      
      {/* 雫の輪郭：下は実線、上はかすれた点線 */}
      <path d="M 46 42 C 46 49.7, 39.7 56, 32 56 C 24.3 56, 18 49.7, 18 42" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 18 42 C 18 36, 22 28, 32 16 C 42 28, 46 36, 46 42" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 5" opacity="0.7" />
      
      <circle cx="32" cy="46" r="3" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
