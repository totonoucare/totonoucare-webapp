// components/illust/sub/SubBloodStasis.jsx
export default function SubBloodStasis({ title = "血瘀", className = "", ...props }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} {...props}>
      <title>{title}</title>
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.10" />
      <path
        d="M18 28h28c6 0 10 4 10 10s-4 10-10 10H22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 20l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle cx="28" cy="38" r="2.5" fill="currentColor" />
      <circle cx="36" cy="38" r="2.5" fill="currentColor" />
    </svg>
  );
}
