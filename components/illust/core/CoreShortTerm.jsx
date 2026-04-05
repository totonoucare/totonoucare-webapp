"use client";

export default function CoreShortTerm({
  className = "h-full w-full",
  title = "短期集中型",
}) {
  return (
    <svg
      viewBox="0 0 320 180"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="cst-card" x1="28" y1="22" x2="292" y2="156" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBF8F0" />
          <stop offset="55%" stopColor="#F6F0E4" />
          <stop offset="100%" stopColor="#EEF3E9" />
        </linearGradient>

        <linearGradient id="cst-trail" x1="34" y1="84" x2="152" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#AFC2B1" stopOpacity="0" />
          <stop offset="100%" stopColor="#8BA68F" stopOpacity="0.88" />
        </linearGradient>

        <radialGradient
          id="cst-halo"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(214 88) rotate(-8) scale(90 54)"
        >
          <stop offset="0%" stopColor="#F0B14B" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#F0B14B" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="cst-fur" x1="102" y1="66" x2="250" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D89A38" />
          <stop offset="100%" stopColor="#E7AF49" />
        </linearGradient>

        <linearGradient id="cst-fur-dark" x1="130" y1="58" x2="254" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C9872C" />
          <stop offset="100%" stopColor="#D99A39" />
        </linearGradient>
      </defs>

      <rect x="18" y="16" width="284" height="148" rx="34" fill="url(#cst-card)" />
      <rect x="28" y="28" width="264" height="124" rx="28" fill="none" stroke="#D7E1D3" strokeWidth="3" />
      <ellipse cx="212" cy="88" rx="96" ry="56" fill="url(#cst-halo)" />

      <g fill="none" strokeLinecap="round">
        <path d="M40 112 C78 112, 106 103, 148 86" stroke="url(#cst-trail)" strokeWidth="12" />
        <path d="M34 90 C76 90, 103 82, 146 67" stroke="url(#cst-trail)" strokeWidth="8" opacity="0.8" />
        <path d="M58 132 C94 130, 118 121, 152 106" stroke="url(#cst-trail)" strokeWidth="6" opacity="0.56" />
        <path d="M74 64 L104 58" stroke="#A9BDAA" strokeWidth="5" opacity="0.82" />
        <path d="M86 142 L112 136" stroke="#A9BDAA" strokeWidth="5" opacity="0.72" />
        <path d="M58 72 L82 68" stroke="#B9CBBB" strokeWidth="4" opacity="0.7" />
      </g>

      <ellipse cx="188" cy="140" rx="88" ry="12" fill="#2F3A31" opacity="0.08" />

      <g>
        <path
          d="M103 96 C91 87, 73 77, 53 66"
          fill="none"
          stroke="#D99D3C"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M55 66 C46 63, 38 67, 35 75"
          fill="none"
          stroke="#3B2A20"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          d="M130 119 C121 130, 111 142, 96 154"
          fill="none"
          stroke="#D89A38"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M194 118 C211 128, 228 140, 247 154"
          fill="none"
          stroke="#D89A38"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.78"
        />

        <path
          d="M105 92
             C112 76, 139 64, 174 64
             C201 64, 224 72, 236 84
             C243 91, 244 101, 237 109
             C228 120, 206 127, 177 129
             C146 131, 118 126, 107 114
             C101 108, 100 99, 105 92 Z"
          fill="url(#cst-fur)"
        />

        <path
          d="M128 96
             C136 87, 153 81, 174 81
             C193 81, 209 86, 219 93
             C221 101, 212 109, 194 113
             C172 118, 144 116, 128 109
             C124 105, 124 100, 128 96 Z"
          fill="#F7E7C9"
        />

        <path
          d="M214 77
             C223 60, 244 49, 265 50
             C279 51, 291 59, 294 69
             C296 80, 290 91, 277 98
             C262 107, 241 109, 225 102
             C213 96, 208 86, 214 77 Z"
          fill="url(#cst-fur-dark)"
        />

        <path
          d="M244 69
             C255 67, 266 70, 274 78
             C272 87, 263 93, 251 94
             C240 94, 231 89, 228 81
             C230 74, 236 70, 244 69 Z"
          fill="#F8E7C8"
        />

        <path d="M224 57 L236 40 L241 60 Z" fill="#6A4A2A" />
        <path d="M246 54 L263 39 L264 63 Z" fill="#6A4A2A" />
        <path d="M227 56 L235 46 L238 58 Z" fill="#F7D7AF" />
        <path d="M249 54 L259 45 L260 60 Z" fill="#F7D7AF" />

        <ellipse cx="256" cy="76" rx="5.2" ry="7" transform="rotate(-8 256 76)" fill="#2A211C" />
        <circle cx="279" cy="91" r="5.2" fill="#2A211C" />
        <circle cx="242" cy="71" r="4.1" fill="#2A211C" opacity="0.9" />

        <path
          d="M251 84 C248 93, 244 101, 240 108"
          fill="none"
          stroke="#2A211C"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M259 101 C266 107, 274 109, 280 105"
          fill="none"
          stroke="#8B4E37"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M258 102 C261 110, 269 114, 277 111"
          fill="none"
          stroke="#F08AA0"
          strokeWidth="4.6"
          strokeLinecap="round"
        />

        <path
          d="M163 123 C155 135, 146 145, 136 154"
          fill="none"
          stroke="#E1A544"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M204 121 C198 135, 188 146, 178 154"
          fill="none"
          stroke="#E1A544"
          strokeWidth="16"
          strokeLinecap="round"
        />

        <g fill="#2A211C" opacity="0.9">
          <circle cx="132" cy="78" r="4.2" />
          <circle cx="144" cy="95" r="5.3" />
          <circle cx="158" cy="74" r="4.4" />
          <circle cx="166" cy="105" r="4.4" />
          <circle cx="178" cy="85" r="5.1" />
          <circle cx="192" cy="103" r="4.3" />
          <circle cx="206" cy="85" r="4.7" />
          <circle cx="220" cy="103" r="4.5" />
          <circle cx="230" cy="88" r="3.8" />
          <circle cx="229" cy="66" r="3.2" />
          <circle cx="246" cy="61" r="3" />
        </g>
      </g>

      <g fill="#6DB7F6">
        <path d="M0 -8 C6 -5, 7 4, 0 15 C-7 4, -6 -5, 0 -8 Z" transform="translate(221 38) rotate(-22)" />
        <path d="M0 -7 C5 -4, 6 3, 0 13 C-6 3, -5 -4, 0 -7 Z" transform="translate(242 31) rotate(8)" opacity="0.95" />
        <path d="M0 -6 C4 -3, 5 3, 0 11 C-5 3, -4 -3, 0 -6 Z" transform="translate(197 52) rotate(-34)" opacity="0.82" />
      </g>

      <g fill="none" stroke="#D9E3E6" strokeWidth="4" strokeLinecap="round" opacity="0.95">
        <path d="M289 87 C299 83, 304 90, 299 97" />
        <path d="M296 78 C307 73, 313 81, 308 89" />
        <path d="M293 98 C304 96, 309 104, 303 111" />
      </g>
    </svg>
  );
}
