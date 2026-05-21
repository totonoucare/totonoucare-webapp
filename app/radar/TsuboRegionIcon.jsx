"use client";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV"]);
const TSUBO_HEAD_NECK_CODES = new Set(["GB20", "GV20"]);

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
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function TsuboMark({ cx, cy, r = 6 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.14" />
      <circle cx={cx} cy={cy} r="2.2" fill="currentColor" />
      <circle cx={cx} cy={cy} r="7.8" stroke="currentColor" strokeWidth="1.4" opacity="0.16" />
    </g>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M32 7.5c-9.1 0-16.1 7.1-16.1 16.4 0 7.1 4.1 13 10 15.2v5.1c0 2.1-1.3 3.9-3.3 4.6l-6.3 2.2c-3 1.1-5 3.8-5 7v1.5h41.4V58c0-3.2-2-5.9-5-7l-6.3-2.2c-2-.7-3.3-2.5-3.3-4.6v-5.1c5.9-2.2 10-8.1 10-15.2C48.1 14.6 41.1 7.5 32 7.5Z"
        fill="currentColor"
        opacity="0.085"
      />
      <path
        d="M32 7.5c-9.1 0-16.1 7.1-16.1 16.4 0 7.1 4.1 13 10 15.2v5.1c0 2.1-1.3 3.9-3.3 4.6l-6.3 2.2c-3 1.1-5 3.8-5 7"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 7.5c9.1 0 16.1 7.1 16.1 16.4 0 7.1-4.1 13-10 15.2v5.1c0 2.1 1.3 3.9 3.3 4.6l6.3 2.2c3 1.1 5 3.8 5 7"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.8 46.5c5 2.1 11.4 2.1 16.4 0"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.58"
      />
      <path
        d="M18.8 55.5h26.4"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.42"
      />
      <TsuboMark cx="44.2" cy="30.8" r="6.2" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M22.6 31.1V15.4a4.1 4.1 0 0 1 8.2 0v14.5M30.7 29.8V11.8a4.1 4.1 0 0 1 8.2 0v18.6M38.9 30.7V15.2a4 4 0 0 1 8 0v21.1c0 8.2-5.5 13.8-14.1 13.8h-8.2c-8.1 0-13.4-4.9-14-13.2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46.9 34.7V21.2a3.8 3.8 0 0 1 7.6 0v16c0 10.7-7.7 18.3-19.6 18.3H25c-10.2 0-17-6.5-17-16.2v-4.1"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m10 36.1-4.7-5.8a4.1 4.1 0 0 1 .5-5.7 4 4 0 0 1 5.6.3l11.2 11.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 36c1.8 8.8 6.9 13.5 14.6 13.5h7c8.2 0 13.1-4.9 13.1-13.2V21.2a3.8 3.8 0 0 1 7.6 0v16c0 10.7-7.7 18.3-19.6 18.3H25c-10.2 0-17-6.5-17-16.2v-4.1c0-1.1.2-2.2.6-3.2l1.4 1.7c.9 1 1.9 1.8 3.2 2.3Z"
        fill="currentColor"
        opacity="0.075"
      />
      <path
        d="M22.5 55.8c5.8 1.8 13.2 1.8 19 0"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.58"
      />
      <TsuboMark cx="25.2" cy="47.6" r="5.9" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M24.4 6.8c1 8.7.5 16.3-1.5 22.4-.9 2.9-2.4 5.5-4.4 7.8-2.2 2.5-3.5 5.3-3.5 8.2 0 5.4 4.6 8.6 12.2 8.6h19.2c5.9 0 9.6-2.4 10.5-6.3.6-2.7-1.1-4.9-4.1-5.3l-10.9-1.3c-5.9-.7-10-2.9-13.4-7.4 1.9-7 2.4-15.9 1.5-26.7"
        fill="currentColor"
        opacity="0.075"
      />
      <path
        d="M24.4 6.8c1 8.7.5 16.3-1.5 22.4-.9 2.9-2.4 5.5-4.4 7.8-2.2 2.5-3.5 5.3-3.5 8.2 0 5.4 4.6 8.6 12.2 8.6h19.2c5.9 0 9.6-2.4 10.5-6.3.6-2.7-1.1-4.9-4.1-5.3l-10.9-1.3c-5.9-.7-10-2.9-13.4-7.4"
        stroke="currentColor"
        strokeWidth="3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34.7 6.8c1.2 9.5 1.1 17.7-.1 24.4-.5 3 .1 5.5 1.9 7.6l2.4 2.9"
        stroke="currentColor"
        strokeWidth="3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.3 45.1c8.1 2.3 18.1 2.2 29.8-.3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M22.9 33.2c4.5 1.8 9.8 1.8 15.8-.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.42"
      />
      <TsuboMark cx="28.8" cy="36.8" r="6" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M25.7 8.2c1.9 1.7 3.9 2.5 6.3 2.5s4.4-.8 6.3-2.5M20.3 18.8c3.4-2.7 7.3-4.1 11.7-4.1s8.3 1.4 11.7 4.1c6.3 5 8.8 22.7 3.4 32-2.9 5-8.4 7.3-15.1 7.3s-12.2-2.3-15.1-7.3c-5.4-9.3-2.9-27 3.4-32Z"
        fill="currentColor"
        opacity="0.075"
      />
      <path
        d="M25.7 8.2c1.9 1.7 3.9 2.5 6.3 2.5s4.4-.8 6.3-2.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.3 22.5c4.8-5.2 10.4-7.8 16.7-7.8s11.9 2.6 16.7 7.8"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.3 18.2c-5.7 7.4-7.7 23.7-4.4 32.6 2 5.3 7.4 7.3 15.1 7.3s13.1-2 15.1-7.3c3.3-8.9 1.3-25.2-4.4-32.6"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx="32"
        cy="38.4"
        rx="10.3"
        ry="12.4"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity="0.42"
      />
      <path
        d="M22.8 49.7c5.4 2.4 13 2.4 18.4 0"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.58"
      />
      <path
        d="M32 25.8v24"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <TsuboMark cx="32" cy="38.4" r="6.1" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      <circle cx="32" cy="12.5" r="6.5" fill="currentColor" opacity="0.075" />
      <circle cx="32" cy="12.5" r="6.5" stroke="currentColor" strokeWidth="3" />
      <path
        d="M32 19.7v22.1M18.8 30.2h26.4M23.5 55.5 32 41.8l8.5 13.7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <TsuboMark cx="32" cy="32" r="5.8" />
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

