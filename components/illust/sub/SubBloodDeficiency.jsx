export default function SubBloodDeficiency({ title = "血虚", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 葉っぱの左半分（しっかりしている） */}
      <path d="M32 16 C 16 16, 16 48, 32 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 葉っぱの右半分（栄養不足でかすれている） */}
      <path d="M32 16 C 48 16, 48 48, 32 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" opacity="0.6" />
      {/* 葉脈 */}
      <path d="M32 48 V 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 38 L 24 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

