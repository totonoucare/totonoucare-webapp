export default function HeroScene({ className = "h-[320px] w-full" }) {
  return (
    <svg viewBox="0 0 420 328" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero_panel_bg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9faf6" />
          <stop offset="1" stopColor="#e7efe3" />
        </linearGradient>
        <linearGradient id="hero_card_bg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffefa" />
          <stop offset="1" stopColor="#eef4ea" />
        </linearGradient>
        <linearGradient id="hero_skin_fill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8ee" />
          <stop offset="1" stopColor="#f3ead8" />
        </linearGradient>
        <linearGradient id="hero_shirt_fill2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dde8d9" />
          <stop offset="1" stopColor="#c7d9c6" />
        </linearGradient>
      </defs>

      <rect x="18" y="18" width="384" height="292" rx="34" fill="url(#hero_panel_bg2)" />

      <circle cx="236" cy="162" r="102" fill="none" stroke="#cad8c6" strokeWidth="2.2" />
      <circle cx="236" cy="162" r="78" fill="none" stroke="#d9e4d6" strokeWidth="2" strokeDasharray="6 8" />
      <circle cx="236" cy="162" r="56" fill="none" stroke="#e8efe6" strokeWidth="2" />
      <path d="M236 60A102 102 0 0 1 338 162" fill="none" stroke="#a7c0b2" strokeWidth="2.5" strokeDasharray="7 8" />

      <rect x="82" y="208" width="256" height="74" rx="24" fill="url(#hero_card_bg2)" stroke="#d8e1d3" strokeWidth="2" />
      <text x="102" y="229" fontSize="10.5" fontWeight="800" fill="#6a756c">体質と気象の重なり</text>
      <rect x="100" y="238" width="58" height="20" rx="10" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="129" y="251" textAnchor="middle" fontSize="9.4" fontWeight="800" fill="#61766f">気圧</text>
      <rect x="165" y="238" width="58" height="20" rx="10" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="194" y="251" textAnchor="middle" fontSize="9.4" fontWeight="800" fill="#61766f">湿度</text>
      <rect x="230" y="238" width="64" height="20" rx="10" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="262" y="251" textAnchor="middle" fontSize="9.4" fontWeight="800" fill="#61766f">時間帯</text>
      <path d="M106 266c26-13 56-14 82-7 18 5 37 4 58-5" fill="none" stroke="#96b19d" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="307" cy="266" r="8" fill="#eff6f2" stroke="#cbdacf" strokeWidth="1.6" />
      <circle cx="307" cy="266" r="2.8" fill="#7aaeb2" />

      <circle cx="104" cy="92" r="20" fill="#eff6f5" stroke="#d7e4e1" strokeWidth="2" />
      <path d="M94 93c4-7 13-7 17 0-2 8-12 9-17 0z" fill="#79adb3" />
      <path d="M104 77v10" stroke="#79adb3" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M101 74h6" stroke="#79adb3" strokeWidth="2.2" strokeLinecap="round" />

      <circle cx="328" cy="92" r="18" fill="#fff4e7" stroke="#ead9be" strokeWidth="2" />
      <path d="M327 78v10" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M327 102v6" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M316 91h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M331 91h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />

      <rect x="278" y="126" width="78" height="32" rx="16" fill="#ffffff" stroke="#d8dfd3" strokeWidth="2" />
      <text x="317" y="140" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#69766a">明日の注意点</text>
      <path d="M294 147h36" stroke="#87a391" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M326 143l4 4-4 4" fill="none" stroke="#87a391" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      <ellipse cx="214" cy="288" rx="110" ry="14" fill="#111827" opacity="0.05" />

      <path d="M149 171c0-35 28-63 63-63h14c35 0 63 28 63 63v21c0 35-28 63-63 63h-14c-35 0-63-28-63-63v-21z" fill="url(#hero_skin_fill2)" stroke="#d8ccba" strokeWidth="2" />
      <path d="M166 153c0-23 19-42 42-42h22c23 0 42 19 42 42v24c0 23-19 42-42 42h-22c-23 0-42-19-42-42v-24z" fill="url(#hero_shirt_fill2)" />
      <circle cx="219" cy="140" r="31" fill="url(#hero_skin_fill2)" stroke="#d8ccba" strokeWidth="1.6" />
      <path d="M189 136c6-20 34-26 54-11 4 3 7 7 9 11-11 7-22 10-34 10-13 0-23-3-29-10z" fill="#7d8e85" />
      <circle cx="208" cy="144" r="2.8" fill="#61766f" />
      <circle cx="231" cy="144" r="2.8" fill="#61766f" />
      <path d="M212 159c6 4 13 4 19 0" fill="none" stroke="#61766f" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M196 189c8 12 18 18 24 18 7 0 17-6 26-18" fill="none" stroke="#f1d5a8" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
      <path d="M170 228c12-9 23-12 38-13" fill="none" stroke="#b6cabd" strokeWidth="3" strokeLinecap="round" />
      <path d="M246 215c15 1 27 5 38 13" fill="none" stroke="#b6cabd" strokeWidth="3" strokeLinecap="round" />

      <path d="M182 150c-11 9-15 21-13 35" fill="none" stroke="#78a8b2" strokeWidth="3.4" strokeLinecap="round" opacity="0.68" />
      <path d="M256 149c9 7 14 18 12 31" fill="none" stroke="#d4a06a" strokeWidth="3.4" strokeLinecap="round" opacity="0.64" />
      <path d="M220 206c-15 4-24 12-28 24" fill="none" stroke="#90ad99" strokeWidth="3" strokeLinecap="round" opacity="0.74" />
      <path d="M204 195c0 10 6 18 17 22" fill="none" stroke="#9bb7a2" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M239 195c1 10-4 18-15 22" fill="none" stroke="#9bb7a2" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="219" cy="183" rx="68" ry="42" fill="#dce8dc" opacity="0.32" />
    </svg>
  );
}
