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

const SKIN_BASE = "#F2D1B3";
const SKIN_LIGHT = "#F8DFC6";
const SKIN_SHADOW = "#D9A178";
const SKIN_DEEP = "#B97751";
const SKIN_LINE = "#A96F4E";

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
  return (
    <IconFrame className={className}>
      <ellipse cx="128" cy="74" rx="48" ry="55" fill={SKIN_LIGHT} />
      <path
        d="M88 49c15-28 66-29 82 1 17 31 3 72-24 87-13 7-28 7-41 0-27-15-43-56-17-88Z"
        fill={SKIN_BASE}
      />
      <path
        d="M161 73c8 32-4 61-31 72 27-2 48-27 48-62 0-20-7-37-18-48 3 12 3 25 1 38Z"
        fill={SKIN_SHADOW}
        opacity="0.5"
      />
      <path
        d="M105 133h46v39c0 14 11 27 27 32l33 11c11 4 18 14 18 25v6H27v-6c0-11 7-21 18-25l33-11c16-5 27-18 27-32v-39Z"
        fill={SKIN_BASE}
      />
      <path
        d="M105 145c13 9 33 10 46 1v22c-14 10-32 10-46 0v-23Z"
        fill={SKIN_SHADOW}
        opacity="0.45"
      />
      <path
        d="M65 211c17-14 40-22 63-22s46 8 63 22c14 12 21 23 21 35H44c0-12 7-23 21-35Z"
        fill={SKIN_LIGHT}
      />
      <path
        d="M73 206c-22 8-38 20-46 40h73c-13-12-23-25-27-40Z"
        fill={SKIN_SHADOW}
        opacity="0.32"
      />
      <path
        d="M183 206c22 8 38 20 46 40h-73c13-12 23-25 27-40Z"
        fill={SKIN_SHADOW}
        opacity="0.32"
      />
      <path
        d="M94 126c18 22 50 22 68 0"
        stroke={SKIN_DEEP}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.24"
      />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M82 245v-55c0-15-9-31-20-44l-16-19c-11-13-8-29 4-36 10-6 23-2 32 10l11 15V54c0-18 12-30 27-30 12 0 22 8 24 22 4-12 15-20 28-18 15 2 24 15 22 32 5-8 14-12 24-9 14 4 20 16 17 31l-14 70c-3 16-2 31 5 44 8 15 9 31 3 49H82Z"
        fill={SKIN_BASE}
      />
      <path
        d="M93 123 82 102c-8-15-24-19-35-11-12 8-14 24-4 37l36 48c10 13 14 26 14 41v28h43v-58c0-19-7-35-21-48l-22-16Z"
        fill={SKIN_SHADOW}
        opacity="0.75"
      />
      <path
        d="M96 55c0-13 9-22 21-22s22 9 22 22v86H96V55Z"
        fill={SKIN_LIGHT}
      />
      <path
        d="M139 48c0-13 10-22 23-22s23 10 23 24l-2 91h-44V48Z"
        fill={SKIN_BASE}
      />
      <path
        d="M183 60c1-13 11-21 23-19 13 2 21 13 18 27l-15 75h-42l16-83Z"
        fill={SKIN_LIGHT}
      />
      <path
        d="M217 82c3-13 13-20 24-16 12 4 17 16 13 30l-21 67c-6 19-8 36-2 52 4 11 3 21-2 30h-48c11-17 15-34 11-53l-4-20 29-90Z"
        fill={SKIN_BASE}
      />
      <path
        d="M81 184c17 20 45 31 77 28 30-2 52-17 65-42 5 26 13 47 6 75H82v-55l-1-6Z"
        fill={SKIN_SHADOW}
        opacity="0.38"
      />
      <path
        d="M96 141c28 10 64 10 101 0"
        stroke={SKIN_LINE}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d="M91 222h146v23H91z"
        fill={SKIN_DEEP}
        opacity="0.12"
      />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M106 20h61c0 48-2 83 8 112 9 25 36 43 57 65 16 18 10 39-16 45-27 6-60 6-96 3-25-2-51 0-76-2-17-1-24-12-18-26 6-16 22-25 41-36 28-17 42-42 42-75L106 20Z"
        fill={SKIN_BASE}
      />
      <path
        d="M167 20c0 48-2 83 8 112 8 22 29 39 48 58 7 7 12 14 14 21-19 1-41 0-66-3-36-4-66-8-93-2 22-20 31-45 31-75V20h58Z"
        fill={SKIN_LIGHT}
      />
      <path
        d="M151 129c12 34 41 51 69 73 12 9 13 20 2 29-10 8-29 12-58 12 21-16 29-35 20-57-6-15-19-30-33-57Z"
        fill={SKIN_SHADOW}
        opacity="0.52"
      />
      <path
        d="M68 181c-20 12-36 21-42 36-6 14 1 25 18 26 24 2 50 0 76 2 35 3 69 3 96-3 18-4 26-15 23-28-33 7-69 8-107 3-42-5-72-1-95 12 5-17 25-25 52-40 20-11 34-25 44-43-16 16-36 24-65 35Z"
        fill={SKIN_SHADOW}
        opacity="0.62"
      />
      <path
        d="M147 126c-18 33-44 57-79 72"
        stroke={SKIN_DEEP}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.2"
      />
      <ellipse cx="158" cy="155" rx="18" ry="16" fill={SKIN_SHADOW} opacity="0.55" />
      <path
        d="M198 221c10 0 19-1 27-4"
        stroke={SKIN_DEEP}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.22"
      />
      <path
        d="M177 217c8 1 15 1 22 1"
        stroke={SKIN_DEEP}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.16"
      />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M61 31c22-9 44 7 67 7s45-16 67-7c22 9 36 33 25 63-9 25-21 49-18 82 2 26 13 48 2 66H52c-11-18 0-40 2-66 3-33-9-57-18-82-11-30 3-54 25-63Z"
        fill={SKIN_BASE}
      />
      <path
        d="M61 31c22-9 44 7 67 7s45-16 67-7c-22 23-44 35-67 35S83 54 61 31Z"
        fill={SKIN_LIGHT}
      />
      <path
        d="M37 93c14 24 34 37 58 38 15 0 26-5 33-16 7 11 18 16 33 16 24-1 44-14 58-38-4 17-10 35-14 55-23 14-51 14-77 2-26 12-54 12-77-2-4-20-10-38-14-55Z"
        fill={SKIN_SHADOW}
        opacity="0.38"
      />
      <path
        d="M76 139c-4 35-7 69-24 103h48c-8-37-6-69 2-99-9 2-18 1-26-4Z"
        fill={SKIN_SHADOW}
        opacity="0.5"
      />
      <path
        d="M180 139c4 35 7 69 24 103h-48c8-37 6-69-2-99 9 2 18 1 26-4Z"
        fill={SKIN_SHADOW}
        opacity="0.5"
      />
      <path
        d="M128 119c-8 26-8 67 0 102"
        stroke={SKIN_DEEP}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.18"
      />
      <ellipse cx="128" cy="188" rx="9" ry="6" fill={SKIN_DEEP} opacity="0.32" />
      <path
        d="M87 96c11 11 25 16 41 16s30-5 41-16"
        stroke={SKIN_DEEP}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.16"
      />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      <ellipse cx="128" cy="38" rx="27" ry="29" fill={SKIN_BASE} />
      <path
        d="M89 75c20-13 58-13 78 0 10 7 16 18 18 31l12 67c2 11-5 21-16 23l-10 2 18 42H67l18-42-10-2c-11-2-18-12-16-23l12-67c2-13 8-24 18-31Z"
        fill={SKIN_BASE}
      />
      <path
        d="M128 67c27 1 47 15 55 38l14 68c2 11-5 21-16 23l-10 2 18 42h-61V67Z"
        fill={SKIN_SHADOW}
        opacity="0.42"
      />
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
