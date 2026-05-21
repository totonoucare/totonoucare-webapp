const TSUBO_ICON_COLORS = {
  stroke: "#8A6F61",
  skin: "#F8DDCF",
  mint: "#E7F3EE",
  accent: "#EABDA8",
};

function IconFrame({ children, className }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function HeadNeckIcon({ className }) {
  const c = TSUBO_ICON_COLORS;

  return (
    <IconFrame className={className}>
      <path
        d="M58,212 C66,185 90,168 113,163 L143,163 C166,168 190,185 198,212 C199,217 195,222 190,222 L66,222 C61,222 57,217 58,212 Z"
        fill={c.mint}
      />

      <path
        d="M106,148 L106,174 C106,187 116,196 128,196 C140,196 150,187 150,174 L150,148"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M128,42 C101,42 80,66 82,96 L86,120 C90,145 107,161 128,161 C149,161 166,145 170,120 L174,96 C176,66 155,42 128,42 Z"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M84,94 C90,61 108,43 130,43 C154,43 171,62 173,96 C157,88 144,77 136,63 C125,80 105,92 84,94 Z"
        fill={c.stroke}
        fillOpacity={0.16}
      />

      <path
        d="M80,210 C88,185 107,176 128,176 C149,176 168,185 176,210"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M70,215 L186,215"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  const c = TSUBO_ICON_COLORS;

  return (
    <IconFrame className={className}>
      <path
        d="M58,208 C70,223 96,231 126,227 C160,223 187,204 195,176 C200,157 195,139 182,129"
        fill={c.mint}
        fillOpacity={0.9}
      />

      <path
        d="M91,222 L146,222 C156,222 164,214 164,204 L164,174 L81,174 L81,212 C81,218 85,222 91,222 Z"
        fill="#DDEFE8"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M83,171 L83,92 C83,82 91,74 101,74 C111,74 119,82 119,92 L119,144"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M116,143 L116,64 C116,54 124,46 134,46 C144,46 152,54 152,64 L152,143"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M149,143 L149,77 C149,67 157,59 167,59 C177,59 185,67 185,77 L185,145"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M181,141 L181,103 C181,93 189,85 199,85 C209,85 217,93 217,103 L217,157 C217,198 187,223 146,223 L104,223 C78,223 58,203 58,177 L58,139 C58,129 66,121 76,121 C86,121 94,129 94,139 L94,169"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M94,168 C105,166 115,171 120,181"
        stroke={c.stroke}
        strokeWidth={7}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  const c = TSUBO_ICON_COLORS;

  return (
    <IconFrame className={className}>
      <path
        d="M70,216 C84,227 112,231 145,224 C178,217 201,199 207,176 C181,181 151,180 125,169 C102,159 83,142 72,121 C66,152 57,191 70,216 Z"
        fill={c.mint}
        fillOpacity={0.9}
      />

      <path
        d="M108,39 L157,39 C162,39 166,43 166,48 L166,128 C166,146 178,154 193,161 C210,169 220,183 216,197 C211,216 188,225 159,225 L91,225 C74,225 61,211 64,194 L83,88 C87,60 92,39 108,39 Z"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M101,42 C101,78 99,105 94,130 C88,159 78,179 67,197"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeOpacity={0.85}
      />

      <path
        d="M166,126 C151,132 135,132 120,126"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
      />

      <circle
        cx={151}
        cy={153}
        r={9}
        fill={c.accent}
        stroke={c.stroke}
        strokeWidth={6}
      />

      <path
        d="M86,205 C104,197 125,197 145,204"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
      />

      <path
        d="M166,207 C180,209 193,207 204,200"
        stroke={c.stroke}
        strokeWidth={7}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  const c = TSUBO_ICON_COLORS;

  return (
    <IconFrame className={className}>
      <path
        d="M56,214 C72,229 101,236 128,236 C155,236 184,229 200,214 C190,190 180,154 179,113 C178,84 155,64 128,64 C101,64 78,84 77,113 C76,154 66,190 56,214 Z"
        fill={c.mint}
        fillOpacity={0.9}
      />

      <path
        d="M103,45 L153,45"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />

      <path
        d="M91,63 C102,54 113,49 128,49 C143,49 154,54 165,63 C184,79 194,105 190,136 L183,190 C181,207 166,219 149,219 L107,219 C90,219 75,207 73,190 L66,136 C62,105 72,79 91,63 Z"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M91,67 C83,88 78,111 79,137"
        stroke={c.stroke}
        strokeWidth={7}
        strokeLinecap="round"
        strokeOpacity={0.7}
      />

      <path
        d="M165,67 C173,88 178,111 177,137"
        stroke={c.stroke}
        strokeWidth={7}
        strokeLinecap="round"
        strokeOpacity={0.7}
      />

      <path
        d="M92,155 C109,166 147,166 164,155"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
      />

      <path
        d="M99,211 C111,202 145,202 157,211"
        stroke={c.stroke}
        strokeWidth={8}
        strokeLinecap="round"
      />

      <path
        d="M115,92 C122,88 134,88 141,92"
        stroke={c.accent}
        strokeWidth={8}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  const c = TSUBO_ICON_COLORS;

  return (
    <IconFrame className={className}>
      <path
        d="M58,218 C72,230 100,236 128,236 C156,236 184,230 198,218 C190,184 176,158 160,144 L96,144 C80,158 66,184 58,218 Z"
        fill={c.mint}
        fillOpacity={0.9}
      />

      <circle
        cx={128}
        cy={55}
        r={26}
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
      />

      <path
        d="M101,93 L155,93 C169,93 181,104 181,118 L181,164 C181,177 170,188 157,188 L99,188 C86,188 75,177 75,164 L75,118 C75,104 87,93 101,93 Z"
        fill={c.skin}
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M76,126 L53,157"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />

      <path
        d="M180,126 L203,157"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />

      <path
        d="M108,188 L101,219"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />

      <path
        d="M148,188 L155,219"
        stroke={c.stroke}
        strokeWidth={9}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

