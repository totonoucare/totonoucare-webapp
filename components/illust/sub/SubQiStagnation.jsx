export default function SubQiStagnation({ title = "気滞", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.08" />
      {/* 複雑に絡まった結び目のライン */}
      <path d="M 20 32 C 20 16, 44 16, 44 32 C 44 48, 20 48, 20 32 C 20 22, 32 22, 32 32 C 32 42, 44 42, 44 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 中央で閉じ込められた気のドット */}
      <circle cx="32" cy="32" r="3" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
