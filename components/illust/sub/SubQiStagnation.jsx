export default function SubQiStagnation({ title = "気滞", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <radialGradient id="qiStagGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#fef3c7" opacity="0.6" />
      
      {/* 中心で詰まって発光している様子 */}
      <circle cx="32" cy="32" r="14" fill="url(#qiStagGlow)" opacity="0.8" />
      
      {/* 複雑に絡み合う4つのループ（結び目） */}
      <path d="M 32 32 C 32 14, 52 14, 52 32 C 52 50, 32 50, 32 32 Z" fill="none" stroke="#b45309" strokeWidth="2.5" opacity="0.8" />
      <path d="M 32 32 C 32 14, 12 14, 12 32 C 12 50, 32 50, 32 32 Z" fill="none" stroke="#b45309" strokeWidth="2.5" opacity="0.8" />
      <path d="M 32 32 C 14 32, 14 12, 32 12 C 50 12, 50 32, 32 32 Z" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" />
      <path d="M 32 32 C 14 32, 14 52, 32 52 C 50 52, 50 32, 32 32 Z" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" />
      
      <circle cx="32" cy="32" r="3.5" fill="#92400e" />
    </svg>
  );
}
