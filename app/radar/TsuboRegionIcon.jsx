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

function IconFrame({ children, className }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function TsuboMark({ cx, cy, r = 5 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.16" />
      <circle cx={cx} cy={cy} r="1.8" fill="currentColor" />
    </>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M24 6.5c-5.4 0-9.6 4.2-9.6 9.7 0 3.8 2.1 7 5.2 8.5v4.2c0 1.7-1.1 3.2-2.7 3.8l-4.9 1.9c-2.2.8-3.6 2.8-3.6 5.2v1.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 6.5c5.4 0 9.6 4.2 9.6 9.7 0 3.8-2.1 7-5.2 8.5v4.2c0 1.7 1.1 3.2 2.7 3.8l4.9 1.9c2.2.8 3.6 2.8 3.6 5.2v1.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.6 31.7c3.3 1.2 7.5 1.2 10.8 0"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.65"
      />
      <TsuboMark cx="31.7" cy="21.6" r="5.2" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M18.4 27.4V12.8a2.7 2.7 0 0 1 5.4 0v13.8"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.8 26.4V10.5a2.75 2.75 0 0 1 5.5 0v16.7"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.3 27.4V14.5a2.7 2.7 0 0 1 5.4 0v16.8"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34.7 30.7V18.2a2.55 2.55 0 0 1 5.1 0v13.3c0 6-4 10.1-10.3 10.1h-6.1c-6.2 0-10.2-3.5-10.8-10.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 31.1 8.8 26.5a2.9 2.9 0 0 1 .3-4.1 2.85 2.85 0 0 1 4 .2l5.3 5.4"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.6 41.2c4.7 1.8 10.4 1.8 15.1 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.65"
      />
      <TsuboMark cx="22.4" cy="36.8" r="4.7" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M20.2 6.8c.7 6.4.2 12.1-1.5 16.9-.7 2.1-1.8 4-3.3 5.8-1.7 2-2.7 4.1-2.7 6.3 0 3.8 3.2 6 8.6 6h13.6c4.1 0 6.8-1.7 7.4-4.4.4-1.8-.8-3.3-2.8-3.6l-7.8-.9c-4.1-.5-7-2-9.5-5.1"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.7 7c.9 6.7.8 12.5-.1 17.3-.4 2.1 0 4 1.2 5.5l2.5 3.2"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.7 35.8c5.8 1.7 12.9 1.6 21.2-.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.68"
      />
      <path
        d="M18.6 25.8c3 1.3 6.6 1.3 10.6 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <TsuboMark cx="22.2" cy="29.3" r="4.8" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M17.9 8.8c1.8 1.5 3.9 2.3 6.1 2.3s4.3-.8 6.1-2.3"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.9 16.7c3.3-2.5 7-3.8 11.1-3.8s7.8 1.3 11.1 3.8"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.3 15.8c-3.2 5.3-4.4 11.5-3.6 18.2.6 5.2 4.7 8.4 11.3 8.4s10.7-3.2 11.3-8.4c.8-6.7-.4-12.9-3.6-18.2"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.2 32.9c4 1.9 9.6 1.9 13.6 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.66"
      />
      <path
        d="M24 21v11.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.46"
      />
      <TsuboMark cx="24" cy="27.2" r="5" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      <circle cx="24" cy="9.5" r="5" stroke="currentColor" strokeWidth="2.8" />
      <path
        d="M24 14.8v16.4M13.8 22.6h20.4M17.5 40.2l6.5-9 6.5 9"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <TsuboMark cx="24" cy="24" r="4.7" />
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
