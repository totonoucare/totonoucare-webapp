import React, { useId } from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  const id = useId();

  const shadowId = `core-shortterm-shadow-${id}`;
  const dustId = `core-shortterm-dust-${id}`;
  const bodyGradId = `core-shortterm-body-${id}`;
  const bellyGradId = `core-shortterm-belly-${id}`;

  return (
    <svg
      viewBox="0 0 320 180"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="短期集中型のチーターアイコン"
      {...props}
    >
      <defs>
        <linearGradient id={bodyGradId} x1="46" y1="98" x2="272" y2="98">
          <stop offset="0%" stopColor="#F4B63F" />
          <stop offset="100%" stopColor="#F0A92A" />
        </linearGradient>

        <linearGradient id={bellyGradId} x1="120" y1="90" x2="244" y2="138">
          <stop offset="0%" stopColor="#FFF6E7" />
          <stop offset="100%" stopColor="#F4E2C7" />
        </linearGradient>

        <radialGradient id={dustId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D8C1A0" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#D8C1A0" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={shadowId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8C6A3A" stopOpacity="0.06" />
          <stop offset="45%" stopColor="#8C6A3A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8C6A3A" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* speed lines */}
      <g opacity="0.55" stroke="#EBCF8D" strokeLinecap="round">
        <path d="M36 74 H102" strokeWidth="4" />
        <path d="M52 94 H126" strokeWidth="3.5" />
        <path d="M24 115 H86" strokeWidth="4" />
        <path d="M138 68 H192" strokeWidth="2.5" opacity="0.65" />
        <path d="M150 126 H214" strokeWidth="2.5" opacity="0.65" />
      </g>

      {/* ground / dust */}
      <ellipse cx="165" cy="149" rx="118" ry="10" fill="url(#shadowId)" />
      <ellipse cx="68" cy="141" rx="44" ry="18" fill="url(#dustId)" opacity="0.85" />
      <path
        d="M29 143 C42 132, 55 129, 75 133 C92 137, 102 144, 110 146
           C94 147, 75 149, 55 149 C43 149, 33 147, 29 143 Z"
        fill="#E9D7B8"
        opacity="0.78"
      />
      <path
        d="M70 136 C77 132, 84 131, 92 135 C97 137, 101 141, 103 145"
        fill="none"
        stroke="#D2BA95"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* tail */}
      <path
        d="M108 93
           C78 86, 53 83, 33 84
           C20 85, 12 90, 11 98
           C10 104, 15 108, 23 108
           C31 108, 36 104, 40 98
           C44 91, 52 90, 66 92
           C84 95, 98 98, 114 101"
        fill="none"
        stroke="url(#bodyGradId)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M20 94 C27 94, 31 98, 33 103"
        fill="none"
        stroke="#4F3725"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <ellipse cx="46" cy="96" rx="9" ry="5.5" fill="#5A3B27" opacity="0.92" />
      <ellipse cx="66" cy="98" rx="8.5" ry="5.2" fill="#5A3B27" opacity="0.92" />

      {/* back body */}
      <path
        d="M92 85
           C121 70, 156 63, 194 66
           C217 67, 236 72, 250 80
           C263 87, 270 97, 268 108
           C266 119, 258 127, 244 132
           C228 138, 206 140, 178 139
           C152 138, 128 132, 112 123
           C100 116, 91 106, 89 96
           C88 92, 89 88, 92 85 Z"
        fill="url(#bodyGradId)"
      />

      {/* chest / head mass */}
      <path
        d="M233 79
           C244 70, 257 67, 270 69
           C281 71, 289 78, 291 87
           C293 98, 289 109, 280 116
           C271 124, 258 127, 246 124
           C236 122, 228 115, 224 107
           C220 98, 223 87, 233 79 Z"
        fill="url(#bodyGradId)"
      />

      {/* underbelly */}
      <path
        d="M132 109
           C154 103, 182 102, 208 106
           C224 108, 237 112, 245 118
           C233 130, 213 137, 181 137
           C156 137, 135 131, 122 121
           C120 119, 119 116, 120 113
           C122 111, 126 110, 132 109 Z"
        fill="url(#bellyGradId)"
      />
      <path
        d="M231 96
           C238 92, 249 91, 259 92
           C267 93, 274 97, 277 102
           C273 111, 265 117, 255 118
           C245 119, 235 114, 230 105
           C228 102, 228 98, 231 96 Z"
        fill="#FFF6E8"
      />

      {/* ears */}
      <path
        d="M245 70 L252 55 L264 69 Z"
        fill="#4C3325"
      />
      <path
        d="M260 69 L274 57 L281 74 Z"
        fill="#4C3325"
      />
      <path
        d="M249 68 L254 59 L261 67 Z"
        fill="#F8EAD3"
      />
      <path
        d="M263 68 L272 61 L276 72 Z"
        fill="#F8EAD3"
      />

      {/* fore legs */}
      <path
        d="M220 116
           C229 118, 237 122, 241 127
           C245 132, 243 138, 238 143
           L224 156
           C220 160, 213 160, 209 156
           C205 152, 205 146, 210 142
           L222 130
           C225 127, 226 123, 220 116 Z"
        fill="#F1B23C"
      />
      <path
        d="M242 118
           C253 120, 262 125, 266 130
           C271 136, 269 143, 263 148
           L252 159
           C248 163, 241 163, 237 159
           C233 155, 233 149, 238 145
           L249 134
           C252 131, 251 124, 242 118 Z"
        fill="#F5BB48"
      />

      {/* hind legs */}
      <path
        d="M143 126
           C136 135, 127 145, 115 154
           C110 158, 103 158, 99 154
           C95 149, 96 143, 101 139
           C111 132, 119 123, 124 115
           C127 111, 131 109, 136 111
           C141 113, 145 119, 143 126 Z"
        fill="#F0AD35"
      />
      <path
        d="M170 132
           C164 142, 156 152, 146 161
           C141 165, 134 165, 130 161
           C126 156, 127 149, 132 145
           C141 137, 148 129, 153 120
           C156 115, 160 113, 165 115
           C171 118, 173 125, 170 132 Z"
        fill="#F3B744"
      />

      {/* paws */}
      <g fill="#FFF7ED">
        <ellipse cx="102" cy="153.5" rx="10" ry="6.5" />
        <ellipse cx="134" cy="160.5" rx="10" ry="6.5" />
        <ellipse cx="217" cy="156.5" rx="10" ry="6.5" />
        <ellipse cx="245" cy="159.5" rx="10" ry="6.5" />
      </g>

      {/* face */}
      <path
        d="M264 83
           C271 82, 277 85, 281 90
           C285 96, 285 103, 281 109
           C277 114, 270 117, 263 116
           C258 115, 253 112, 250 107
           C247 101, 248 95, 252 90
           C255 86, 259 84, 264 83 Z"
        fill="#FFD46B"
      />
      <path
        d="M261 91
           C266 90, 270 92, 273 95
           C275 98, 275 103, 273 106
           C271 110, 266 112, 261 111
           C256 110, 253 106, 252 102
           C251 97, 254 93, 261 91 Z"
        fill="#FFF7EA"
      />

      {/* eyes / nose / mouth */}
      <ellipse cx="257" cy="91" rx="3.3" ry="4.2" fill="#2D231E" />
      <path
        d="M250 96 C247 102, 246 108, 246 113"
        fill="none"
        stroke="#2D231E"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M274 100 C279 101, 282 104, 283 108"
        fill="none"
        stroke="#6A3A2E"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="284" cy="107" rx="4.8" ry="4.8" fill="#2A211C" />

      {/* tongue + breath */}
      <path
        d="M271 109
           C274 116, 273 122, 268 125
           C263 128, 257 126, 255 120
           C254 115, 258 110, 264 108 Z"
        fill="#EA7E94"
      />
      <path
        d="M292 107
           C297 105, 302 106, 305 111
           C302 116, 296 118, 290 116
           C289 112, 289 109, 292 107 Z"
        fill="#EDE7DF"
        opacity="0.92"
      />

      {/* tear marks */}
      <path
        d="M254 95 C251 99, 248 103, 244 107"
        fill="none"
        stroke="#2C231D"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M269 94 C267 97, 266 100, 264 103"
        fill="none"
        stroke="#2C231D"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* spots */}
      <g fill="#4D3525" opacity="0.96">
        <ellipse cx="112" cy="91" rx="5" ry="4.2" />
        <ellipse cx="126" cy="83" rx="4.7" ry="4" />
        <ellipse cx="142" cy="89" rx="5.4" ry="4.4" />
        <ellipse cx="160" cy="83" rx="5.6" ry="4.5" />
        <ellipse cx="175" cy="88" rx="5.5" ry="4.6" />
        <ellipse cx="192" cy="84" rx="5.7" ry="4.8" />
        <ellipse cx="208" cy="89" rx="5.6" ry="4.7" />
        <ellipse cx="223" cy="84" rx="5.2" ry="4.4" />
        <ellipse cx="237" cy="90" rx="4.9" ry="4.2" />

        <ellipse cx="123" cy="105" rx="4.8" ry="4.1" />
        <ellipse cx="140" cy="101" rx="5.2" ry="4.3" />
        <ellipse cx="156" cy="108" rx="4.6" ry="3.9" />
        <ellipse cx="176" cy="102" rx="5.3" ry="4.4" />
        <ellipse cx="193" cy="108" rx="4.8" ry="4.1" />
        <ellipse cx="213" cy="103" rx="5.1" ry="4.2" />

        <ellipse cx="145" cy="119" rx="4.5" ry="3.8" />
        <ellipse cx="166" cy="117" rx="4.8" ry="3.9" />
        <ellipse cx="186" cy="120" rx="4.5" ry="3.8" />

        <ellipse cx="244" cy="78" rx="3.4" ry="2.9" />
        <ellipse cx="257" cy="76" rx="3.2" ry="2.8" />
        <ellipse cx="232" cy="97" rx="3.8" ry="3.2" />
        <ellipse cx="239" cy="111" rx="3.6" ry="3.1" />
        <ellipse cx="221" cy="122" rx="3.8" ry="3.1" />

        <ellipse cx="219" cy="131" rx="3.4" ry="2.8" />
        <ellipse cx="243" cy="137" rx="3.2" ry="2.7" />
        <ellipse cx="154" cy="133" rx="3.8" ry="3" />
        <ellipse cx="134" cy="126" rx="3.5" ry="2.9" />
      </g>

      {/* sweat */}
      <g fill="#7BB8F0">
        <path d="M232 60 C237 65, 239 70, 237 75 C235 79, 230 80, 226 77 C223 74, 223 69, 225 65 C227 61, 229 59, 232 60 Z" />
        <path d="M247 52 C252 57, 254 63, 252 68 C250 73, 245 74, 241 70 C238 67, 238 62, 240 58 C242 54, 244 52, 247 52 Z" />
        <path d="M216 72 C220 75, 221 79, 220 83 C218 86, 214 87, 211 85 C209 82, 209 78, 211 75 C212 73, 214 72, 216 72 Z" />
      </g>

      {/* subtle body edge */}
      <g fill="none" stroke="#8A5D22" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M95 86
             C122 72, 156 65, 194 67
             C215 68, 235 72, 249 80
             C261 87, 267 96, 266 107"
          strokeWidth="2.2"
          opacity="0.34"
        />
        <path
          d="M122 121
             C136 130, 157 135, 180 136
             C208 137, 230 135, 245 128"
          strokeWidth="1.8"
          opacity="0.2"
        />
      </g>
    </svg>
  );
}
