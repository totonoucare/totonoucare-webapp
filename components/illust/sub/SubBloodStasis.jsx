export default function SubBloodStasis({ title = "血瘀", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="bloodStasisGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#be123c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#ffe4e6" opacity="0.6" />
      
      {/* カドのある硬い結晶（滞った血） */}
      <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill="url(#bloodStasisGrad)" />
      
      {/* 結晶の立体的なエッジライン */}
      <path d="M 32 16 L 32 32 L 46 40 M 32 32 L 18 40 M 32 32 L 46 24 M 32 32 L 18 24 M 32 32 L 32 48" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      
      {/* 強固な輪郭と中心のコア */}
      <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill="none" stroke="#881337" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="4" fill="#4c0519" opacity="0.9" />
    </svg>
  );
}
