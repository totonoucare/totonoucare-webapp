export default function HeroGuideBot({ className = "h-[138px] w-[118px]" }) {
  return (
    <svg viewBox="0 0 128 154" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="guide_leaf_2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#94c46c" />
          <stop offset="1" stopColor="#5f925f" />
        </linearGradient>
      </defs>

      <path
        d="M14 18c0-9 7-16 16-16h42c12 0 22 10 22 22v9c0 12-10 22-22 22H49l-12 11 3-11h-10c-9 0-16-7-16-16V18z"
        fill="#ffffff"
        stroke="#d7dfcf"
        strokeWidth="2"
      />
      <text x="54" y="23" textAnchor="middle" fontSize="8" fontWeight="800" fill="#516057">
        明日の体調を
      </text>
      <text x="54" y="35" textAnchor="middle" fontSize="8" fontWeight="700" fill="#516057">
        先回りで見てみよう
      </text>
      <text x="54" y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="#516057">
        体質と気象を重ねます
      </text>

      <ellipse cx="67" cy="139" rx="30" ry="7" fill="#111827" opacity="0.08" />
      <path
        d="M36 102c0-16 13-28 28-28h4c16 0 28 12 28 28v10c0 15-12 27-28 27h-4c-15 0-28-12-28-27v-10z"
        fill="#f5f1df"
        stroke="#d7ceb3"
        strokeWidth="2"
      />
      <path
        d="M48 92c0-10 8-18 18-18h2c10 0 18 8 18 18v8c0 10-8 18-18 18h-2c-10 0-18-8-18-18v-8z"
        fill="#fffaf0"
      />
      <circle cx="58" cy="95" r="2.2" fill="#6f7b6b" />
      <circle cx="73" cy="95" r="2.2" fill="#6f7b6b" />
      <path d="M59 107c5 3 10 3 14 0" stroke="#6f7b6b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M63 72c-3-8-3-15 2-21 8 4 10 10 8 18-1 3-4 6-10 3z" fill="url(#guide_leaf_2)" />
      <path d="M66 72c0-10 1-17 6-25" stroke="#4b7154" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 121c9 6 19 6 30 0" stroke="#c7b893" strokeWidth="2" strokeLinecap="round" />

      <circle cx="104" cy="88" r="10" fill="#edf4ea" stroke="#cbd7c4" strokeWidth="2" />
      <path d="M104 82v6l5 3" stroke="#658169" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="98" r="9" fill="#eef6f5" stroke="#c7d8d6" strokeWidth="2" />
      <path d="M20 98c2-3 6-3 7 0-1 4-5 5-7 0z" fill="#74aab0" />

      <path d="M82 66c6-7 14-7 20 0" fill="none" stroke="#8fb1a1" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M85 61c8-9 18-9 26 0" fill="none" stroke="#8fb1a1" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
