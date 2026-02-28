// components/illust/sub/SubDefault.jsx
export default function SubDefault({ title = "整えポイント", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M22 34l6 6 14-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
