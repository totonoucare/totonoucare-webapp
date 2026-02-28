// components/illust/sub/SubBloodDeficiency.jsx
export default function SubBloodDeficiency({ title = "血虚", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M32 16c8 10 12 17 12 24a12 12 0 1 1-24 0c0-7 4-14 12-24z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M26 38c2 3 4 4 6 4s4-1 6-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
