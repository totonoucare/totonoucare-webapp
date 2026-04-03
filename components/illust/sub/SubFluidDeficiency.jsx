export default function SubFluidDeficiency({ title = "津液不足", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="fluidDefGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#e0f2fe" opacity="0.6" />
      
      {/* 潤いが減った下の部分 */}
      <path d="M 20 44 Q 32 40 44 44 C 44 50.6, 38.6 56, 32 56 C 25.4 56, 20 50.6, 20 44 Z" fill="url(#fluidDefGrad)" />
      
      {/* 上が開いて蒸発していく輪郭 */}
      <path d="M 26 30 C 22 35, 20 40, 20 44 C 20 50.6, 25.4 56, 32 56 C 38.6 56, 44 50.6, 44 44 C 44 40, 42 35, 38 30" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* 蒸発していく粒（点線とドット） */}
      <path d="M 26 26 C 28 20, 30 16, 32 12 C 34 16, 36 20, 38 26" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 5" />
      <circle cx="32" cy="14" r="2" fill="#0ea5e9" opacity="0.9" />
      <circle cx="28" cy="20" r="1.5" fill="#38bdf8" opacity="0.8" />
      <circle cx="37" cy="22" r="1.5" fill="#7dd3fc" opacity="0.9" />
    </svg>
  );
}
