// components/illust/sub/SubBloodStasis.jsx
export default function SubBloodStasis({ title = "瘀血", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M32 18c7 8.8 10 14.4 10 20a10 10 0 1 1-20 0c0-5.6 3-11.2 10-20z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="28.5" cy="34.5" r="2.6" fill="currentColor" />
      <circle cx="35.2" cy="31.8" r="2.1" fill="currentColor" opacity="0.85" />
      <circle cx="36.8" cy="38.3" r="2.6" fill="currentColor" opacity="0.92" />
      <path
        d="M18 44c3.4 1.8 8.5 3 14 3 5.3 0 10.4-1.2 14-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
