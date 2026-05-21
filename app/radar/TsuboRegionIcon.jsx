"use client";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV", "GV"]);

function getTsuboCodePrefix(point) {
  const code = String(point?.code || "").trim().toUpperCase();
  const match = code.match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getTsuboRegionKey(point) {
  const region = String(point?.point_region || "").trim();
  if (region === "head_neck") return "head_neck";
  if (region === "abdomen" || region === "chest_abdomen" || region === "trunk") return "trunk";

  const prefix = getTsuboCodePrefix(point);
  if (TSUBO_TRUNK_PREFIXES.has(prefix)) return "trunk";
  if (TSUBO_HAND_PREFIXES.has(prefix)) return "hand_wrist";
  if (TSUBO_FOOT_PREFIXES.has(prefix)) return "foot_ankle";
  return "body";
}

export function getTsuboRegionIconLabel(point) {
  const key = getTsuboRegionKey(point);
  if (key === "head_neck") return "頭・首まわり";
  if (key === "hand_wrist") return "手・手首まわり";
  if (key === "foot_ankle") return "足・足首まわり";
  if (key === "trunk") return "体幹・お腹まわり";
  return "からだのツボ";
}

const COLOR = {
  skin: "#F4CFAF",
  skinLight: "#F9DEC7",
  skinShadow: "#E2A882",
  skinDeep: "#C7835F",
  outline: "#C99674",
  soft: "#FFF6EC",
};

function IconSvg({ children, className, label }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    >
      {children}
    </svg>
  );
}

function SoftShadow() {
  return <ellipse cx="32" cy="58" rx="19" ry="3.8" fill="#EED7C2" opacity="0.48" />;
}

function HandWristIcon({ className }) {
  return (
    <IconSvg className={className} label="手・手首まわり">
      <SoftShadow />

      {/* wrist cuff */}
      <path
        d="M23.5 42.5h17c2.5 0 4.5 2 4.5 4.5v12H19V47c0-2.5 2-4.5 4.5-4.5Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M21.5 49h21" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.42" />

      {/* fingers */}
      <rect x="19.5" y="11" width="7.4" height="25" rx="3.7" fill={COLOR.skin} stroke={COLOR.outline} strokeWidth="2.2" />
      <rect x="27" y="7" width="7.6" height="30" rx="3.8" fill={COLOR.skinLight} stroke={COLOR.outline} strokeWidth="2.2" />
      <rect x="34.8" y="8.5" width="7.5" height="29" rx="3.75" fill={COLOR.skin} stroke={COLOR.outline} strokeWidth="2.2" />
      <rect x="42.5" y="14" width="7" height="24" rx="3.5" fill={COLOR.skin} stroke={COLOR.outline} strokeWidth="2.2" />

      {/* palm */}
      <path
        d="M18.8 30.5c0-7 5.7-12.7 12.7-12.7h6.9c7 0 12.7 5.7 12.7 12.7v12.6c0 8.1-6.6 14.7-14.7 14.7h-4.7c-7.1 0-12.9-5.8-12.9-12.9V30.5Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* thumb */}
      <path
        d="M20.6 34.8 12.9 29c-3.2-2.4-3.9-6.8-1.6-9.7 2.5-3 7-3.3 9.9-.7l8.2 7.5c1.5 1.4 1.6 3.8.2 5.3l-3.8 4.1c-1.4 1.5-3.6 1.6-5.2.3Z"
        fill={COLOR.skin}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* soft palm accents */}
      <path d="M28 40c3.2 3 8.1 3.4 12.2 1.1" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M45.8 36.5c1.2 5.7-.6 10.7-5.5 15" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
    </IconSvg>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconSvg className={className} label="足・足首まわり">
      <SoftShadow />

      {/* lower leg */}
      <path
        d="M28.2 5.8h13.3c2 0 3.5 1.8 3.1 3.8l-5.2 29.7c-.6 3.3-3 6.1-6.2 7.1l-7.3 2.3 3.8-39.9c.2-1.7-1.1-3-1.5-3Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M39.6 8.8 35.8 38" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.38" />

      {/* ankle to foot, clear side silhouette */}
      <path
        d="M25.9 39.5c3.9 2.7 9.6 2.7 13.6.1 1.4 4.2 4.7 7.3 9.8 9.1l5.9 2.1c3.5 1.3 5.2 5.2 3.5 8.2-.9 1.7-2.8 2.7-4.7 2.7H13.7c-4.2 0-7-4.3-5.3-8.1.8-1.7 2.2-3 4-3.5l9.2-2.7c3.4-1 4.3-3.9 4.3-7.9Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* ankle bone and arch */}
      <circle cx="39.2" cy="44.6" r="3.2" fill={COLOR.skinShadow} opacity="0.55" />
      <path d="M14.5 55.5c8.1 1.4 16.7-.4 25.8-5.4 4.4 4 9.4 6 15.1 6" stroke={COLOR.skinShadow} strokeWidth="2.1" strokeLinecap="round" opacity="0.45" />
      <path d="M49 51.2c3.2.8 5.5 2.2 6.7 4.2" stroke={COLOR.skinDeep} strokeWidth="1.8" strokeLinecap="round" opacity="0.28" />
    </IconSvg>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconSvg className={className} label="体幹・お腹まわり">
      <SoftShadow />

      {/* neck */}
      <path
        d="M25.5 6.5h13v10.8c0 3.6-2.9 6.5-6.5 6.5s-6.5-2.9-6.5-6.5V6.5Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* shoulders + trunk */}
      <path
        d="M17.6 17.6c5.2 4.2 10 6.3 14.4 6.3s9.2-2.1 14.4-6.3c6.8 2.5 11.5 8.7 12.2 15.9l2 21.6c.3 3.5-2.5 6.5-6 6.5H9.4c-3.5 0-6.3-3-6-6.5l2-21.6c.7-7.2 5.4-13.4 12.2-15.9Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* chest/abdomen soft planes */}
      <path d="M13.5 31.8c5.4 4 11.6 6 18.5 6s13.1-2 18.5-6" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.36" />
      <path d="M21.2 40.5c6.4 3.2 15.2 3.2 21.6 0" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.28" />
      <path d="M32 38.5v15" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.28" />
      <ellipse cx="32" cy="50.5" rx="2.4" ry="1.6" fill={COLOR.skinDeep} opacity="0.35" />
      <path d="M12.5 34c3.2 6.9 3.7 14.4 1.5 22.5" stroke={COLOR.skinShadow} strokeWidth="2.2" strokeLinecap="round" opacity="0.32" />
      <path d="M51.5 34c-3.2 6.9-3.7 14.4-1.5 22.5" stroke={COLOR.skinShadow} strokeWidth="2.2" strokeLinecap="round" opacity="0.32" />
    </IconSvg>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconSvg className={className} label="頭・首まわり">
      <SoftShadow />

      {/* head */}
      <path
        d="M32 5.5c11.4 0 20.1 9.2 20.1 21.4 0 9-4.8 17.5-12.1 21.2-4.9 2.5-11.1 2.5-16 0-7.3-3.7-12.1-12.2-12.1-21.2C11.9 14.7 20.6 5.5 32 5.5Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M45.7 17.2c2.8 8.2 1.7 17-3.4 25.7" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="51.3" cy="29.2" r="3.5" fill={COLOR.skin} stroke={COLOR.outline} strokeWidth="2" opacity="0.95" />
      <circle cx="12.7" cy="29.2" r="3.5" fill={COLOR.skin} stroke={COLOR.outline} strokeWidth="2" opacity="0.95" />

      {/* neck + shoulders */}
      <path
        d="M25.5 45h13v8.1c0 2.6 1.7 4.9 4.2 5.7l7.3 2.4H14l7.3-2.4c2.5-.8 4.2-3.1 4.2-5.7V45Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M23.2 48.4c4.9 3.9 12.7 3.9 17.6 0" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.42" />
    </IconSvg>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconSvg className={className} label="からだのツボ">
      <SoftShadow />
      <circle cx="32" cy="12" r="7" fill={COLOR.skinLight} stroke={COLOR.outline} strokeWidth="2.2" />
      <path
        d="M21.5 23.5c5.3-3.7 15.7-3.7 21 0 3.7 2.6 5.8 6.8 6 11.3l1.1 25.2H14.4l1.1-25.2c.2-4.5 2.3-8.7 6-11.3Z"
        fill={COLOR.skinLight}
        stroke={COLOR.outline}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M32 24v29" stroke={COLOR.skinShadow} strokeWidth="2" strokeLinecap="round" opacity="0.28" />
    </IconSvg>
  );
}

export default function TsuboRegionIcon({ point, className = "h-8 w-8" }) {
  const key = getTsuboRegionKey(point);
  if (key === "head_neck") return <HeadNeckIcon className={className} />;
  if (key === "hand_wrist") return <HandWristIcon className={className} />;
  if (key === "foot_ankle") return <FootAnkleIcon className={className} />;
  if (key === "trunk") return <TrunkAbdomenIcon className={className} />;
  return <GenericBodyIcon className={className} />;
}

