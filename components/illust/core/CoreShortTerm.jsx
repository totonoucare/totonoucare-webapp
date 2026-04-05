"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id="coreShortTermBg" x1="18" y1="12" x2="186" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdf8ef" />
          <stop offset="58%" stopColor="#f7f1e4" />
          <stop offset="100%" stopColor="#ecf4ea" />
        </linearGradient>

        <radialGradient
          id="coreShortTermHalo"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(132 50) rotate(18) scale(56 36)"
        >
          <stop offset="0%" stopColor="#f4b84f" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#f4b84f" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="coreShortTermTrail" x1="34" y1="42" x2="98" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#98b89d" stopOpacity="0" />
          <stop offset="100%" stopColor="#73977a" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      <rect x="10" y="12" width="180" height="96" rx="28" fill="url(#coreShortTermBg)" />
      <rect x="18" y="20" width="164" height="80" rx="24" fill="none" stroke="#d8e3d5" strokeWidth="2" />
      <ellipse cx="131" cy="49" rx="54" ry="34" fill="url(#coreShortTermHalo)" />

      {/* アクセル感：走り抜ける残像 */}
      <g stroke="url(#coreShortTermTrail)" strokeLinecap="round" fill="none">
        <path d="M28 72 C52 70, 69 64, 88 55" strokeWidth="7" />
        <path d="M24 54 C46 54, 63 50, 82 43" strokeWidth="4.5" opacity="0.82" />
        <path d="M36 88 C58 86, 74 80, 90 69" strokeWidth="3.5" opacity="0.6" />
      </g>
      <g stroke="#a7c2ab" strokeWidth="3" strokeLinecap="round" opacity="0.75">
        <path d="M44 44 L58 42" />
        <path d="M54 92 L66 88" />
        <path d="M64 34 L76 32" />
      </g>

      {/* 地面の影 */}
      <ellipse cx="118" cy="95" rx="54" ry="8" fill="#2f3b33" opacity="0.08" />

      {/* チーター本体：瞬発力はあるが、細身で余力は小さい */}
      <g>
        {/* 尾 */}
        <path d="M84 67 C73 60, 63 54, 48 48" fill="none" stroke="#d59a39" strokeWidth="7" strokeLinecap="round" />
        <path d="M50 48 C43 46, 38 49, 36 54" fill="none" stroke="#3a2c22" strokeWidth="4" strokeLinecap="round" />

        {/* 奥の脚 */}
        <path d="M95 76 C88 86, 81 96, 72 103" fill="none" stroke="#d59a39" strokeWidth="9" strokeLinecap="round" />
        <path d="M127 76 C138 84, 149 92, 160 101" fill="none" stroke="#d59a39" strokeWidth="9" strokeLinecap="round" opacity="0.82" />

        {/* 胴体 */}
        <path
          d="M79 64 C84 54, 101 47, 123 49 C141 51, 154 59, 156 67 C157 74, 146 80, 129 83 C110 86, 91 84, 81 76 C77 72, 76 68, 79 64 Z"
          fill="#e0a33f"
        />
        <path
          d="M91 68 C96 61, 110 57, 126 58 C138 59, 146 63, 146 68 C145 74, 137 78, 124 80 C110 82, 97 80, 91 75 C88 73, 88 70, 91 68 Z"
          fill="#f7e8ca"
          fillOpacity="0.88"
        />

        {/* 頭部 */}
        <path
          d="M130 53 C136 42, 150 36, 163 38 C172 39, 179 45, 179 51 C179 58, 173 64, 163 67 C151 70, 139 68, 132 61 C128 58, 128 55, 130 53 Z"
          fill="#e0a33f"
        />
        <path
          d="M154 49 C161 48, 168 51, 171 56 C169 62, 161 66, 153 66 C147 66, 142 62, 141 57 C142 53, 147 50, 154 49 Z"
          fill="#f7e8ca"
        />

        {/* 耳 */}
        <path d="M140 40 L147 31 L151 43" fill="#6b4a2a" />
        <path d="M153 38 L162 31 L163 43" fill="#6b4a2a" />
        <path d="M142.5 39.5 L147 34.5 L149.5 41.5" fill="#f6d8af" />
        <path d="M154.5 38.5 L160 33.5 L160.5 41.5" fill="#f6d8af" />

        {/* 顔 */}
        <circle cx="171" cy="57" r="2.8" fill="#2b211b" />
        <ellipse cx="155" cy="50" rx="2.8" ry="3.6" transform="rotate(-10 155 50)" fill="#2b211b" />
        <path d="M151 53 C150 58, 148 62, 146 66" fill="none" stroke="#2b211b" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M155 61 C159 64, 164 65, 167 63" fill="none" stroke="#8a4a34" strokeWidth="2" strokeLinecap="round" />
        <path d="M154 62 C156 67, 160 69, 164 67" fill="none" stroke="#f08aa2" strokeWidth="2.2" strokeLinecap="round" />

        {/* 手前の脚 */}
        <path d="M109 79 C104 88, 98 96, 94 103" fill="none" stroke="#e0a33f" strokeWidth="9" strokeLinecap="round" />
        <path d="M135 79 C130 89, 124 98, 118 103" fill="none" stroke="#e0a33f" strokeWidth="9" strokeLinecap="round" />

        {/* 斑点 */}
        <g fill="#2b211b" opacity="0.9">
          <circle cx="93" cy="58" r="2.4" />
          <circle cx="101" cy="66" r="2.8" />
          <circle cx="110" cy="56" r="2.4" />
          <circle cx="115" cy="72" r="2.3" />
          <circle cx="124" cy="61" r="2.7" />
          <circle cx="132" cy="73" r="2.6" />
          <circle cx="140" cy="61" r="2.2" />
          <circle cx="146" cy="70" r="2.2" />
          <circle cx="145" cy="47" r="1.9" />
          <circle cx="152" cy="43" r="1.8" />
        </g>
      </g>

      {/* バテやすさ：汗 */}
      <g fill="#67b7f7">
        <path d="M0 -5 C4 -3, 5 3, 0 10 C-5 3, -4 -3, 0 -5 Z" transform="translate(137 31) rotate(-22)" />
        <path d="M0 -4 C3 -2, 4 3, 0 8 C-4 3, -3 -2, 0 -4 Z" transform="translate(149 28) rotate(10)" opacity="0.9" />
        <path d="M0 -4 C3 -2, 4 3, 0 8 C-4 3, -3 -2, 0 -4 Z" transform="translate(121 41) rotate(-38)" opacity="0.75" />
      </g>

      {/* 息切れ */}
      <g stroke="#d9e3e7" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.95">
        <path d="M182 58 C188 56, 191 60, 188 64" />
        <path d="M186 52 C193 49, 197 54, 194 59" />
        <path d="M184 64 C191 63, 194 67, 191 71" />
      </g>
    </svg>
  );
}
