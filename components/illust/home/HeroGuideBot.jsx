export default function HeroGuideBot({ className = "h-[110px] w-[96px]" }) {
  return (
    <svg viewBox="0 0 120 138" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="guide_leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#94c46c" />
          <stop offset="1" stopColor="#5f925f" />
        </linearGradient>
      </defs>

      <path
        d="M18 18c0-9 7-16 16-16h36c12 0 22 10 22 22v8c0 12-10 22-22 22H49l-12 11 3-11H34c-9 0-16-7-16-16V18z"
        fill="#ffffff"
        stroke="#d7dfcf"
        strokeWidth="2"
      />
      <text x="54" y="22" textAnchor="middle" fontSize="8" fontWeight="800" fill="#516057">
        先回りで見てみよう
      </text>
      <text x="54" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill="#516057">
        体質と天気を
      </text>
      <text x="54" y="46" textAnchor="middle" fontSize="8" fontWeight="700" fill="#516057">
        合わせて見ます
      </text>

      <ellipse cx="62" cy="123" rx="28" ry="7" fill="#111827" opacity="0.08" />
      <path
        d="M34 92c0-15 12-27 27-27h4c15 0 27 12 27 27v9c0 14-12 26-27 26h-4c-15 0-27-12-27-26v-9z"
        fill="#f5f1df"
        stroke="#d7ceb3"
        strokeWidth="2"
      />
      <path
        d="M46 83c0-9 7-16 16-16h3c9 0 16 7 16 16v7c0 9-7 16-16 16h-3c-9 0-16-7-16-16v-7z"
        fill="#fffaf0"
      />
      <circle cx="56" cy="86" r="2.1" fill="#6f7b6b" />
      <circle cx="71" cy="86" r="2.1" fill="#6f7b6b" />
      <path d="M57 97c4 3 9 3 13 0" stroke="#6f7b6b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M61 62c-3-8-3-14 2-20 8 4 10 10 8 18-1 2-4 5-10 2z" fill="url(#guide_leaf)" />
      <path d="M64 62c0-9 1-17 6-25" stroke="#4b7154" strokeWidth="2" strokeLinecap="round" />
      <path d="M49 109c9 6 18 6 29 0" stroke="#c7b893" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="82" r="9" fill="#edf4ea" stroke="#cbd7c4" strokeWidth="2" />
      <path d="M100 76v6l5 3" stroke="#658169" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="89" r="8" fill="#eef6f5" stroke="#c7d8d6" strokeWidth="2" />
      <path d="M18 89c2-3 6-3 7 0-1 4-5 5-7 0z" fill="#74aab0" />
    </svg>
  );
}
