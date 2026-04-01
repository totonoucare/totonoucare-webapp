export default function HeroTitleMark({ className = 'h-[46px] w-[220px]' }) {
  return (
    <svg viewBox="0 0 300 64" className={className} aria-label="未病レーダー">
      <defs>
        <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f3b33" />
          <stop offset="1" stopColor="#395f53" />
        </linearGradient>
      </defs>
      <g transform="translate(6 10)">
        <circle cx="18" cy="22" r="16" fill="#eef4ea" stroke="#d6e0d1" />
        <circle cx="18" cy="22" r="10.5" fill="none" stroke="#88a89b" strokeWidth="1.8" />
        <circle cx="18" cy="22" r="5.5" fill="none" stroke="#88a89b" strokeWidth="1.8" strokeDasharray="2.5 3" />
        <path d="M18 6 A16 16 0 0 1 34 22" fill="none" stroke="#6e9587" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="33" cy="10" r="2.6" fill="#d89d5c" />
      </g>
      <text x="48" y="28" fill="url(#titleGrad)" fontSize="28" fontWeight="800" letterSpacing="0.04em">未病レーダー</text>
      <text x="50" y="48" fill="#6a756c" fontSize="10.5" fontWeight="700" letterSpacing="0.08em">気象変化と体質から、体調の波を先読み</text>
    </svg>
  );
}
