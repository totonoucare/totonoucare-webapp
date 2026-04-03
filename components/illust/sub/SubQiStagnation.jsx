// components/illust/sub/SubQiStagnation.jsx
export default function SubQiStagnation({ title = "気滞", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M16 37c7-11 16-14 25-9 2 1.2 4.7 3.6 7 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M40 22c2.7 0 5 2 5 4.6 0 2.7-2.6 4.3-5 4.3-3.1 0-5.1-2-5.1-4.4 0-2.6 2.4-4.5 5.1-4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      <path
        d="M46 32l4.6-1.1-1.5 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 24c3-2 6-2 9 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
