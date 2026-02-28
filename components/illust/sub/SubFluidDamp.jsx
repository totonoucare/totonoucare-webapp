// components/illust/sub/SubFluidDamp.jsx
export default function SubFluidDamp({ title = "痰湿", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M22 40c0-10 20-10 20 0 0 8-5 12-10 12s-10-4-10-12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M18 30c4 2 8 3 14 3s10-1 14-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
