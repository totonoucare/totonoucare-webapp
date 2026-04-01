export default function HeroScene({ className = "h-[310px] w-full" }) {
  return (
    <svg viewBox="0 0 420 320" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f6ef" />
          <stop offset="1" stopColor="#d8e5d7" />
        </linearGradient>
        <linearGradient id="hero_body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf1" />
          <stop offset="1" stopColor="#f5eddc" />
        </linearGradient>
        <linearGradient id="hero_soft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8eb99b" stopOpacity="0.22" />
          <stop offset="1" stopColor="#6a9770" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect x="18" y="18" width="384" height="284" rx="34" fill="url(#hero_bg)" />

      <path d="M210 34a126 126 0 0 1 126 126" fill="none" stroke="#b9cfc0" strokeWidth="2.4" strokeDasharray="6 8" />
      <path d="M210 54a106 106 0 0 1 106 106" fill="none" stroke="#c6d9cc" strokeWidth="2" />
      <path d="M210 74a86 86 0 0 1 86 86" fill="none" stroke="#d7e5d9" strokeWidth="2" />
      <path d="M210 94a66 66 0 0 1 66 66" fill="none" stroke="#e4eee3" strokeWidth="2" />

      <circle cx="92" cy="70" r="20" fill="#eff6f5" stroke="#d7e4e1" strokeWidth="2" />
      <path d="M83 71c3-6 12-6 15 0-2 7-10 8-15 0z" fill="#7aaeb2" />
      <path d="M92 57v10" stroke="#7aaeb2" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M89 54h6" stroke="#7aaeb2" strokeWidth="2.2" strokeLinecap="round" />

      <circle cx="322" cy="72" r="18" fill="#fff4e7" stroke="#ead9be" strokeWidth="2" />
      <path d="M321 58v10" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M321 82v6" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M310 71h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M325 71h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />

      <rect x="272" y="126" width="82" height="36" rx="18" fill="#ffffff" stroke="#d8dfd3" strokeWidth="2" />
      <text x="313" y="140" textAnchor="middle" fontSize="10" fontWeight="800" fill="#68756a">気圧</text>
      <path d="M292 150h42" stroke="#88a391" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M330 145l4 5-4 5" fill="none" stroke="#88a391" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M146 162c0-36 29-65 65-65s65 29 65 65v64c0 34-28 62-62 62h-6c-34 0-62-28-62-62v-64z" fill="url(#hero_body)" stroke="#d9cdb6" strokeWidth="2" />
      <path d="M163 149c0-27 22-49 49-49h2c27 0 49 22 49 49v26c0 27-22 49-49 49h-2c-27 0-49-22-49-49v-26z" fill="#fffbf3" />
      <path d="M177 121c16-20 54-20 72 0" fill="none" stroke="#d8c8ab" strokeWidth="3" strokeLinecap="round" />
      <circle cx="193" cy="160" r="3" fill="#738071" />
      <circle cx="230" cy="160" r="3" fill="#738071" />
      <path d="M197 182c10 8 22 8 32 0" fill="none" stroke="#738071" strokeWidth="2.5" strokeLinecap="round" />

      <ellipse cx="210" cy="204" rx="58" ry="34" fill="url(#hero_soft)" />
      <ellipse cx="178" cy="153" rx="22" ry="18" fill="#d4e2da" opacity="0.34" />
      <ellipse cx="247" cy="149" rx="18" ry="14" fill="#e8eee7" opacity="0.8" />
      <ellipse cx="206" cy="242" rx="40" ry="18" fill="#bfd4c3" opacity="0.28" />
      <path d="M179 139c-10 10-13 20-11 31" fill="none" stroke="#7ea6b0" strokeWidth="3" strokeLinecap="round" opacity="0.56" />
      <path d="M250 136c8 8 11 18 10 29" fill="none" stroke="#d6a670" strokeWidth="3" strokeLinecap="round" opacity="0.48" />
      <path d="M191 216c-14 3-21 11-24 20" fill="none" stroke="#8eab97" strokeWidth="3" strokeLinecap="round" opacity="0.55" />

      <path d="M180 223c-1 10 5 18 15 21" fill="none" stroke="#9ab7a3" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M242 223c2 9-3 17-13 21" fill="none" stroke="#9ab7a3" strokeWidth="2.5" strokeLinecap="round" />

      <ellipse cx="210" cy="286" rx="96" ry="14" fill="#111827" opacity="0.05" />
    </svg>
  );
}
