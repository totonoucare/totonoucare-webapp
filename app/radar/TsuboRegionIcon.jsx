"use client";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV"]);
const TSUBO_HEAD_NECK_CODES = new Set(["GB20", "GV20"]);

const SKIN = "#F2C8A8";
const SKIN_LIGHT = "#FFE5D2";
const SKIN_SHADOW = "#D89C78";
const SKIN_DEEP = "#B9785D";
const OUTLINE = "#8A5A49";
const HAIR = "#6F5145";
const SOFT_BG = "#F7E5D8";

function getTsuboCode(point) {
  return String(point?.code || "").trim().toUpperCase();
}

function getTsuboCodePrefix(point) {
  const match = getTsuboCode(point).match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getTsuboRegionKey(point) {
  const region = String(point?.point_region || "").trim();
  const code = getTsuboCode(point);

  if (region === "head_neck" || TSUBO_HEAD_NECK_CODES.has(code)) return "head_neck";
  if (
    region === "abdomen" ||
    region === "chest_abdomen" ||
    region === "trunk" ||
    region === "back" ||
    region === "low_back"
  ) {
    return "trunk";
  }

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

function IconFrame({ children, className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" role="img">
      {children}
    </svg>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M15 58c1.4-8 7.8-13.3 17-13.3S47.6 50 49 58H15Z"
        fill={SOFT_BG}
      />
      <path
        d="M26.5 36.6h11v9.7c0 3.2-2.5 5.7-5.5 5.7s-5.5-2.5-5.5-5.7v-9.7Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M21.6 45.7c2.5 5.1 6.2 7.5 10.4 7.5s7.9-2.4 10.4-7.5c5.3 1.5 9.3 5.6 10.5 12.3H11.1c1.2-6.7 5.2-10.8 10.5-12.3Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 57.8c2.9-4.1 7.1-6.2 12-6.2s9.1 2.1 12 6.2H20Z"
        fill={SKIN_SHADOW}
        opacity="0.28"
      />
      <ellipse
        cx="32"
        cy="25.3"
        rx="15.2"
        ry="17.7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.9"
      />
      <path
        d="M17.6 24.2c1.4-11 7.1-17.5 15.2-17.5 8.8 0 14.7 6.5 15 17.2-4.8-1.3-9.3-4.4-12.8-9-3.8 5.4-9.6 8.5-17.4 9.3Z"
        fill={HAIR}
      />
      <path
        d="M18.2 27.1c-3.3.5-5 2.9-4.2 6 .7 2.6 3 4 5.6 3.5M45.8 27.1c3.3.5 5 2.9 4.2 6-.7 2.6-3 4-5.6 3.5"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M25.8 21.3c-2.5 3.3-3.5 7.6-2.5 12.2M40.5 30.4c-.2 4.6-2.1 8-5.5 10.1"
        stroke={SKIN_LIGHT}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M24.5 46.2c4.1 2.2 10.9 2.2 15 0"
        stroke={SKIN_DEEP}
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.55"
      />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M22.5 42.5h19v14.2c0 2.7-2.2 4.8-4.8 4.8h-9.4c-2.6 0-4.8-2.1-4.8-4.8V42.5Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 55.2h17"
        stroke={SKIN_SHADOW}
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="15.4" y="9.8" width="8" height="25.3" rx="4" fill={SKIN} stroke={OUTLINE} strokeWidth="1.7" />
      <rect x="23.1" y="5.8" width="8.4" height="30.2" rx="4.2" fill={SKIN} stroke={OUTLINE} strokeWidth="1.7" />
      <rect x="31.1" y="7.7" width="8.3" height="29" rx="4.15" fill={SKIN} stroke={OUTLINE} strokeWidth="1.7" />
      <rect x="38.8" y="12.6" width="7.7" height="25.4" rx="3.85" fill={SKIN} stroke={OUTLINE} strokeWidth="1.7" />
      <path
        d="M18.8 31.8c3.1-4.6 7.6-6.9 13.7-6.9 8.7 0 15.6 6.5 15.6 15.5 0 9.5-6.3 15.8-15.8 15.8-9.8 0-16.8-6.7-16.8-16.2 0-3 .9-5.8 3.3-8.2Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M17.7 35.1 8.8 28.4c-2.4-1.8-2.7-5.1-.7-7.1 1.9-1.9 4.8-1.9 6.7.1l9.4 9.6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M22.4 16.2v17.6M30.2 12.8v20.8M38.2 15.7v18.6M20.9 46.8c4 3.2 11.7 4.4 18.1.8"
        stroke={SKIN_LIGHT}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M22.2 54.3c4.7 2.2 14.5 2.2 19.2 0v3.5c0 2.1-1.7 3.8-3.8 3.8H26c-2.1 0-3.8-1.7-3.8-3.8v-3.5Z"
        fill={SKIN_SHADOW}
        opacity="0.35"
      />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M22.6 5.8h13.3c1.4 10.2 1.2 20.1-.5 29.6-.4 2.1.3 4 1.9 5.4 4.6 3.9 12.4 2.3 18 7 2.1 1.8 2.8 4.1 1.8 6.2-1.3 2.7-4.8 4.2-10.2 4.2H19.8c-7.1 0-11.7-3.9-11.7-9.4 0-3.8 2.4-7.5 6.1-10.5 5.8-4.7 9.1-15.7 8.4-32.5Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M22.4 6.5h13.1c.4 4.1.6 8.5.5 13.2-4.8 1.7-9.4 1.6-13.8-.4.3-4.2.3-8.5.2-12.8Z"
        fill={SKIN_SHADOW}
        opacity="0.32"
      />
      <path
        d="M17.2 38.2c5.2 2.7 11.4 3.7 18.4 2.9 2.1 2.1 4.7 3.4 7.8 4l9.3 1.7c2 .4 3.5 1.4 4.4 3.2.2 1.4-.3 2.7-1.5 3.7-1.7 1.4-4.6 2.2-8.7 2.2H19.8c-6 0-9.6-2.8-9.6-7 0-3.4 2.6-6.9 7-10.7Z"
        fill={SKIN_SHADOW}
        opacity="0.32"
      />
      <path
        d="M18.6 39.9c5.5 2.6 12.4 3.1 20.7 1.5M17.6 50.8c10.6 2.2 23 1.9 36.9-.7"
        stroke={SKIN_LIGHT}
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.78"
      />
      <circle cx="34.6" cy="35.5" r="3.2" fill={SKIN_DEEP} opacity="0.32" />
      <path
        d="M51.4 47.7c1.5.4 2.6 1.1 3.3 2.1M45.7 46.2c1.3.2 2.5.5 3.6.8M40.4 44.7c1.1.4 2.2.7 3.5.9"
        stroke={OUTLINE}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.5"
      />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M23.4 8.5c2.4 2.4 5.3 3.6 8.6 3.6s6.2-1.2 8.6-3.6c6.9 2.3 12.1 8.4 14.1 17.5-3.5 1.5-6.6 1.4-9.3-.4.6 9.9.2 19.6-1.7 29.1-3.4 2.4-7.3 3.6-11.7 3.6s-8.3-1.2-11.7-3.6c-1.9-9.5-2.3-19.2-1.7-29.1-2.7 1.8-5.8 1.9-9.3.4 2-9.1 7.2-15.2 14.1-17.5Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M20 26.7c3.6 3 7.6 4.5 12 4.5s8.4-1.5 12-4.5c.6 9.1.1 18.4-1.6 27.1-2.9 1.7-6.4 2.6-10.4 2.6s-7.5-.9-10.4-2.6c-1.7-8.7-2.2-18-1.6-27.1Z"
        fill={SKIN_LIGHT}
        opacity="0.58"
      />
      <path
        d="M24.9 32.7c3.5 1.8 10.7 1.8 14.2 0M24.1 46.3c4 2.1 11.8 2.1 15.8 0M32 30.7v18.4"
        stroke={SKIN_SHADOW}
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M21.9 8.8c2.2 4.6 5.5 7 10.1 7s7.9-2.4 10.1-7"
        stroke={SKIN_LIGHT}
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M10.1 25.2c2.8.8 5.4.4 8-1.3M53.9 25.2c-2.8.8-5.4.4-8-1.3"
        stroke={SKIN_DEEP}
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.45"
      />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      <circle cx="32" cy="12" r="7.6" fill={SKIN} stroke={OUTLINE} strokeWidth="1.8" />
      <path
        d="M22.5 22.5c2.8-2.1 5.9-3.2 9.5-3.2s6.7 1.1 9.5 3.2c3.5 7.7 3.5 18.6 0 30.5-2.8 1.8-6 2.7-9.5 2.7s-6.7-.9-9.5-2.7c-3.5-11.9-3.5-22.8 0-30.5Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M23 27.5h18" stroke={SKIN_LIGHT} strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
    </IconFrame>
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
