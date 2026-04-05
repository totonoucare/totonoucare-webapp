"use client";

import { useId } from "react";

export default function CoreShortTerm({
  className = "h-full w-full",
  title = "短期集中型",
  ...props
}) {
  const uid = useId();
  const ids = {
    scene: `${uid}-scene`,
    panel: `${uid}-panel`,
    panelGlow: `${uid}-panelGlow`,
    fur: `${uid}-fur`,
    furShade: `${uid}-furShade`,
    belly: `${uid}-belly`,
    leg: `${uid}-leg`,
    face: `${uid}-face`,
    sweat: `${uid}-sweat`,
    breath: `${uid}-breath`,
    shadow: `${uid}-shadow`,
    bodyClip: `${uid}-bodyClip`,
    tailStroke: `${uid}-tailStroke`,
    speed: `${uid}-speed`,
    blur: `${uid}-blur`,
  };

  return (
    <svg
      viewBox="0 0 360 220"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{title}</title>

      <defs>
        <linearGradient id={ids.scene} x1="28" y1="14" x2="332" y2="204" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F7F6F1" />
          <stop offset="58%" stopColor="#F0ECE2" />
          <stop offset="100%" stopColor="#E8F0E6" />
        </linearGradient>

        <linearGradient id={ids.panel} x1="44" y1="58" x2="318" y2="178" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F3EEE3" />
          <stop offset="55%" stopColor="#EEE9DE" />
          <stop offset="100%" stopColor="#EAF0E7" />
        </linearGradient>

        <radialGradient
          id={ids.panelGlow}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(220 108) rotate(-6) scale(110 66)"
        >
          <stop offset="0%" stopColor="#F2BC5C" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#F2BC5C" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#F2BC5C" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={ids.fur} x1="102" y1="86" x2="312" y2="168" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B67628" />
          <stop offset="40%" stopColor="#D9973C" />
          <stop offset="100%" stopColor="#E2AC52" />
        </linearGradient>

        <linearGradient id={ids.furShade} x1="124" y1="86" x2="310" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8F571B" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#A76320" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#AE7228" stopOpacity="0.08" />
        </linearGradient>

        <linearGradient id={ids.belly} x1="160" y1="112" x2="278" y2="156" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8EBD2" />
          <stop offset="100%" stopColor="#EED7AC" />
        </linearGradient>

        <linearGradient id={ids.leg} x1="146" y1="144" x2="270" y2="214" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C88431" />
          <stop offset="100%" stopColor="#DFAC57" />
        </linearGradient>

        <linearGradient id={ids.face} x1="268" y1="72" x2="334" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E4A749" />
          <stop offset="100%" stopColor="#CE8A35" />
        </linearGradient>

        <linearGradient id={ids.tailStroke} x1="58" y1="122" x2="126" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#986023" />
          <stop offset="100%" stopColor="#CC913C" />
        </linearGradient>

        <linearGradient id={ids.speed} x1="44" y1="124" x2="184" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7BBB0" stopOpacity="0" />
          <stop offset="100%" stopColor="#94AA9A" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id={ids.sweat} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#81C1FF" />
          <stop offset="100%" stopColor="#5B9FE3" />
        </linearGradient>

        <linearGradient id={ids.breath} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D6E4E7" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#D6E4E7" stopOpacity="0" />
        </linearGradient>

        <clipPath id={ids.bodyClip}>
          <path d="M111 126C118 101 160 82 220 81C269 80 306 95 320 117C326 126 326 138 320 148C309 167 271 181 217 182C165 183 125 175 111 158C104 149 103 137 111 126Z" />
        </clipPath>

        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#3A2B1A" floodOpacity="0.09" />
        </filter>

        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <rect
        x="18"
        y="18"
        width="324"
        height="184"
        rx="42"
        fill="#F7F5EF"
        filter={`url(#${ids.shadow})`}
      />
      <rect x="18" y="18" width="324" height="184" rx="42" fill={`url(#${ids.scene})`} />

      <rect
        x="40"
        y="54"
        width="280"
        height="116"
        rx="30"
        fill={`url(#${ids.panel})`}
        stroke="#C6D0C3"
        strokeWidth="3"
      />

      <g>
        <ellipse cx="224" cy="110" rx="106" ry="62" fill={`url(#${ids.panelGlow})`} />

        <g fill="none" strokeLinecap="round">
          <path d="M48 145C82 143 115 136 164 116" stroke={`url(#${ids.speed})`} strokeWidth="16" />
          <path d="M56 118C97 115 129 107 182 87" stroke={`url(#${ids.speed})`} strokeWidth="10" opacity="0.92" />
          <path d="M76 164C119 160 149 150 191 132" stroke={`url(#${ids.speed})`} strokeWidth="8" opacity="0.58" />
          <path d="M72 88L112 81" stroke="#A7B9A9" strokeWidth="6" opacity="0.72" />
          <path d="M86 178L122 171" stroke="#A9BCA9" strokeWidth="6" opacity="0.52" />
          <path d="M60 102L90 98" stroke="#C0CDC2" strokeWidth="4" opacity="0.72" />
        </g>

        <ellipse cx="199" cy="183" rx="118" ry="11" fill="#213022" opacity="0.1" />

        <g opacity="0.24" filter={`url(#${ids.blur})`}>
          <path d="M147 154C137 171 125 189 108 203" fill="none" stroke="#C68431" strokeWidth="18" strokeLinecap="round" />
          <path d="M201 161C194 176 187 191 178 205" fill="none" stroke="#C68431" strokeWidth="16" strokeLinecap="round" />
          <path d="M257 150C269 168 282 186 298 201" fill="none" stroke="#C68431" strokeWidth="18" strokeLinecap="round" />
        </g>

        <g>
          <path
            d="M123 124C115 116 102 107 87 99C73 91 63 86 53 82"
            fill="none"
            stroke={`url(#${ids.tailStroke})`}
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M53 82C44 80 36 86 33 95"
            fill="none"
            stroke="#30231B"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M111 126C118 101 160 82 220 81C269 80 306 95 320 117C326 126 326 138 320 148C309 167 271 181 217 182C165 183 125 175 111 158C104 149 103 137 111 126Z"
            fill={`url(#${ids.fur})`}
          />
          <path
            d="M130 133C149 113 186 103 231 102C258 101 282 106 301 117C297 132 283 144 260 152C238 160 210 164 181 164C154 164 131 160 117 151C114 144 118 138 130 133Z"
            fill={`url(#${ids.belly})`}
          />
          <path
            d="M116 127C129 101 164 88 217 87C258 86 291 96 312 113"
            fill="none"
            stroke="#E8B760"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.34"
          />
          <path
            d="M118 125C138 105 173 95 216 94C252 93 281 99 301 111C277 108 252 110 225 115C184 121 148 129 118 125Z"
            fill={`url(#${ids.furShade})`}
          />
          <path
            d="M286 100C297 79 320 66 344 68C360 70 371 81 372 96C374 113 365 126 350 136C333 146 309 149 291 143C279 138 274 119 286 100Z"
            fill={`url(#${ids.face})`}
          />
          <path
            d="M308 103C319 94 333 92 344 98C344 110 336 120 323 124C311 127 298 125 291 116C292 110 297 106 308 103Z"
            fill="#F4E3C2"
          />
          <path d="M304 76L317 55L321 77Z" fill="#65482D" />
          <path d="M326 75L344 58L345 82Z" fill="#65482D" />
          <path d="M306 76L314 63L318 78Z" fill="#EFD8B3" />
          <path d="M327 75L337 64L339 80Z" fill="#EFD8B3" />
          <circle cx="315" cy="96" r="5" fill="#231C18" opacity="0.92" />
          <ellipse cx="337" cy="103" rx="5.8" ry="8.8" transform="rotate(-8 337 103)" fill="#231C18" />
          <circle cx="360" cy="118" r="5.4" fill="#231C18" />
          <path d="M330 112C326 120 321 129 316 137" fill="none" stroke="#231C18" strokeWidth="6" strokeLinecap="round" />
          <path d="M342 126C348 130 355 131 361 128" fill="none" stroke="#7E4531" strokeWidth="4" strokeLinecap="round" />
          <path d="M344 128C348 134 355 137 363 134" fill="none" stroke="#E489A0" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M347 130C351 132 355 133 360 133" fill="none" stroke="#D76E8B" strokeWidth="1.4" strokeLinecap="round" opacity="0.78" />

          <path
            d="M147 154C136 163 126 179 118 193C110 206 100 216 89 216C82 216 77 211 77 204C84 198 92 190 100 178C108 166 117 153 126 147C134 143 144 147 147 154Z"
            fill={`url(#${ids.leg})`}
          />
          <path
            d="M201 160C196 171 191 184 185 198C181 210 173 219 161 220C154 221 148 218 147 212C153 204 160 193 166 181C171 169 175 157 182 150C189 146 198 150 201 160Z"
            fill={`url(#${ids.leg})`}
          />
          <path
            d="M260 150C270 154 279 164 282 175C279 190 269 204 255 214C245 220 236 220 231 214C236 204 243 192 248 179C252 168 254 157 260 150Z"
            fill={`url(#${ids.leg})`}
          />
          <path
            d="M282 144C294 147 303 156 307 168C306 182 300 197 290 211C284 220 275 225 265 224C266 212 270 198 274 185C277 172 278 157 282 144Z"
            fill={`url(#${ids.leg})`}
          />

          <g clipPath={`url(#${ids.bodyClip})`}>
            <g fill="#241D18" opacity="0.92">
              <ellipse cx="150" cy="104" rx="4.8" ry="5.4" transform="rotate(-12 150 104)" />
              <ellipse cx="168" cy="124" rx="5.8" ry="7.1" transform="rotate(-10 168 124)" />
              <ellipse cx="184" cy="100" rx="5.3" ry="5.7" transform="rotate(-18 184 100)" />
              <ellipse cx="198" cy="138" rx="5.8" ry="7.1" transform="rotate(-12 198 138)" />
              <ellipse cx="214" cy="112" rx="6.3" ry="7.7" transform="rotate(-8 214 112)" />
              <ellipse cx="235" cy="138" rx="5.9" ry="6.9" transform="rotate(-16 235 138)" />
              <ellipse cx="253" cy="112" rx="6.3" ry="7.7" transform="rotate(-12 253 112)" />
              <ellipse cx="272" cy="135" rx="5.7" ry="6.8" transform="rotate(-18 272 135)" />
              <ellipse cx="289" cy="117" rx="5.1" ry="6.1" transform="rotate(-12 289 117)" />
              <ellipse cx="296" cy="94" rx="4.4" ry="5.1" transform="rotate(-12 296 94)" />
              <ellipse cx="316" cy="84" rx="4.2" ry="4.8" transform="rotate(-10 316 84)" />
            </g>
            <path
              d="M108 150C143 161 188 166 234 164C273 163 303 155 320 145"
              fill="none"
              stroke="#9D6321"
              strokeWidth="4"
              opacity="0.18"
            />
          </g>

          <path d="M170 159C178 161 187 161 196 158" fill="none" stroke="#AF7427" strokeWidth="3.2" opacity="0.2" />
          <path d="M266 124C278 130 286 138 288 148" fill="none" stroke="#A96F26" strokeWidth="3.8" opacity="0.22" />
        </g>

        <g fill={`url(#${ids.sweat})`}>
          <path d="M0-9C7-5 8 5 0 19C-8 5-7-5 0-9Z" transform="translate(302 64) rotate(-22)" />
          <path d="M0-8C6-5 7 4 0 16C-7 4-6-5 0-8Z" transform="translate(321 59) rotate(8)" opacity="0.96" />
          <path d="M0-6C5-3 5 3 0 12C-5 3-5-3 0-6Z" transform="translate(279 81) rotate(-28)" opacity="0.82" />
        </g>

        <g fill="none" stroke={`url(#${ids.breath})`} strokeWidth="4.6" strokeLinecap="round" opacity="0.96">
          <path d="M358 108C369 104 375 111 370 119" />
          <path d="M366 97C378 92 384 100 379 109" />
          <path d="M364 121C376 119 382 129 375 138" />
        </g>
      </g>
    </svg>
  );
}
