export default function HeroScene({ className = "h-[324px] w-full" }) {
  return (
    <svg viewBox="0 0 420 328" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero_panel_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f7f1" />
          <stop offset="1" stopColor="#e4eee1" />
        </linearGradient>
        <linearGradient id="hero_card_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffef9" />
          <stop offset="1" stopColor="#eef4eb" />
        </linearGradient>
        <linearGradient id="hero_body_fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8ee" />
          <stop offset="1" stopColor="#f3ead8" />
        </linearGradient>
        <linearGradient id="hero_shirt_fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dde8d9" />
          <stop offset="1" stopColor="#c7d9c6" />
        </linearGradient>
      </defs>

      <rect x="18" y="18" width="384" height="292" rx="34" fill="url(#hero_panel_bg)" />

      <circle cx="236" cy="162" r="98" fill="none" stroke="#c5d6c4" strokeWidth="2.2" />
      <circle cx="236" cy="162" r="76" fill="none" stroke="#d7e4d5" strokeWidth="2" strokeDasharray="6 8" />
      <circle cx="236" cy="162" r="54" fill="none" stroke="#e5eee5" strokeWidth="2" />
      <path d="M236 64A98 98 0 0 1 334 162" fill="none" stroke="#aec4b7" strokeWidth="2.5" strokeDasharray="7 8" />

      <rect x="62" y="196" width="296" height="90" rx="28" fill="url(#hero_card_bg)" stroke="#d8e1d3" strokeWidth="2" />
      <text x="87" y="221" fontSize="11" fontWeight="800" fill="#6a756c">体質と気象の重なり</text>
      <rect x="85" y="231" width="64" height="22" rx="11" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="117" y="245" textAnchor="middle" fontSize="10" fontWeight="800" fill="#61766f">気圧</text>
      <rect x="156" y="231" width="64" height="22" rx="11" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="188" y="245" textAnchor="middle" fontSize="10" fontWeight="800" fill="#61766f">湿度</text>
      <rect x="227" y="231" width="70" height="22" rx="11" fill="#ffffff" stroke="#d6ddd1" strokeWidth="1.5" />
      <text x="262" y="245" textAnchor="middle" fontSize="10" fontWeight="800" fill="#61766f">時間帯</text>
      <path d="M92 266c28-14 60-16 88-8 16 5 34 4 56-4" fill="none" stroke="#98b2a0" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M236 254c18 0 34 6 52 18" fill="none" stroke="#d6a062" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="310" cy="266" r="8" fill="#eff6f2" stroke="#cbdacf" strokeWidth="1.6" />
      <circle cx="310" cy="266" r="2.8" fill="#7aaeb2" />

      <circle cx="102" cy="88" r="20" fill="#eff6f5" stroke="#d7e4e1" strokeWidth="2" />
      <path d="M92 89c4-7 13-7 17 0-2 8-12 9-17 0z" fill="#79adb3" />
      <path d="M102 73v10" stroke="#79adb3" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M99 70h6" stroke="#79adb3" strokeWidth="2.2" strokeLinecap="round" />

      <circle cx="328" cy="86" r="18" fill="#fff4e7" stroke="#ead9be" strokeWidth="2" />
      <path d="M327 72v10" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M327 96v6" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M316 85h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M331 85h8" stroke="#d8964a" strokeWidth="2.2" strokeLinecap="round" />

      <rect x="274" y="120" width="86" height="36" rx="18" fill="#ffffff" stroke="#d8dfd3" strokeWidth="2" />
      <text x="317" y="135" textAnchor="middle" fontSize="10" fontWeight="800" fill="#69766a">明日の注意点</text>
      <path d="M292 145h42" stroke="#87a391" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M330 140l4 5-4 5" fill="none" stroke="#87a391" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      <ellipse cx="218" cy="287" rx="110" ry="14" fill="#111827" opacity="0.05" />

      <path d="M146 170c0-34 28-62 62-62h18c34 0 62 28 62 62v22c0 34-28 62-62 62h-18c-34 0-62-28-62-62v-22z" fill="url(#hero_body_fill)" stroke="#d8ccba" strokeWidth="2" />
      <path d="M164 153c0-24 19-43 43-43h20c24 0 43 19 43 43v24c0 24-19 43-43 43h-20c-24 0-43-19-43-43v-24z" fill="#fffaf1" />
      <path d="M180 126c14-18 50-19 74 0" fill="none" stroke="#d8c8ab" strokeWidth="3" strokeLinecap="round" />
      <path d="M172 212c11-8 22-11 34-12" fill="none" stroke="#b8cdbd" strokeWidth="3" strokeLinecap="round" />
      <path d="M250 200c14 1 24 4 36 12" fill="none" stroke="#b8cdbd" strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="161" r="3" fill="#6f7d71" />
      <circle cx="232" cy="161" r="3" fill="#6f7d71" />
      <path d="M199 183c10 7 21 7 31 0" fill="none" stroke="#6f7d71" strokeWidth="2.5" strokeLinecap="round" />

      <path d="M174 149c-10 10-13 20-11 32" fill="none" stroke="#78a8b2" strokeWidth="3.2" strokeLinecap="round" opacity="0.62" />
      <path d="M251 146c8 7 12 18 11 30" fill="none" stroke="#d4a06a" strokeWidth="3.2" strokeLinecap="round" opacity="0.58" />
      <path d="M206 222c-14 4-23 12-27 23" fill="none" stroke="#8cae93" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M190 209c-1 10 5 18 16 21" fill="none" stroke="#9bb7a2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M246 210c2 10-3 18-14 21" fill="none" stroke="#9bb7a2" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="218" cy="186" rx="66" ry="40" fill="#d8e7d8" opacity="0.32" />
    </svg>
  );
}
