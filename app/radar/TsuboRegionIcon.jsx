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
      {/* 頭と首の美しいシルエット */}
      <path
        d="M24 5 C16.5 5 12 11 12 18 C12 23 14.5 26.5 16.5 28.5 C17 29 17 30 16.5 30.5 C13 33 8 35 7 40 L41 40 C40 35 35 33 31.5 30.5 C31 30 31 29 31.5 28.5 C33.5 26.5 36 23 36 18 C36 11 31.5 5 24 5 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 顎・首まわりの補助線 */}
      <path
        d="M16.5 28.5 C20 31 28 31 31.5 28.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <TsuboMark cx="24" cy="33" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 開いた手と手首までのライン（5本指を滑らかに表現） */}
      <path
        d="M17 41 V 31 C 13 29, 9 25, 9 21 C 9 18, 12 16, 14 19 C 15 21, 16 23, 16 23 V 10 C 16 7, 20 7, 20 10 V 21 M 20 21 V 5 C 20 2, 24 2, 24 5 V 21 M 24 21 V 8 C 24 5, 28 5, 28 8 V 22 M 28 22 V 14 C 28 11, 32 11, 32 14 V 29 C 32 35, 27 41, 27 41 H 17 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 手のひらのシワ（補助線） */}
      <path
        d="M16 23 C 19 27, 24 27, 28 22 M 18 31 C 21 33, 25 33, 28 29"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <TsuboMark cx="22.5" cy="27" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 足の側面と足首のシルエット */}
      <path
        d="M16 6 V 28 C 16 34, 12 36, 12 38 C 12 40, 14 42, 18 42 L 34 42 C 38 42, 41 40, 39 36 C 37 32, 29 29, 27 25 C 26 23, 27 19, 27 15 V 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* くるぶし */}
      <circle 
        cx="21" 
        cy="31" 
        r="2.5" 
        stroke="currentColor" 
        strokeWidth="2" 
        opacity="0.5" 
      />
      {/* 足の甲の補助線 */}
      <path
        d="M27 25 C 31 27 34 31 36 34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <TsuboMark cx="25" cy="37" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 胴体（肩・胸・くびれ・骨盤）の美しいライン */}
      <path
        d="M13 7 C 13 7, 9 9, 8 15 V 19 C 12 24, 14 28, 14 34 V 40 C 14 40, 19 42, 24 42 C 29 42, 34 40, 34 40 V 34 C 34 28, 36 24, 40 19 V 15 C 39 9, 35 7, 35 7 C 31 7, 28 11, 24 11 C 20 11, 17 7, 13 7 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 鎖骨や胸郭を意識した補助線 */}
      <path
        d="M15 15 C 18 17, 21 17, 24 15 C 27 17, 30 17, 33 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* おへそ */}
      <circle cx="24" cy="33" r="1.2" fill="currentColor" opacity="0.4" />
      <TsuboMark cx="24" cy="24" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 洗練されたピクトグラム風の全身 */}
      <circle cx="24" cy="9" r="4.5" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M24 14.5 V 29 M 24 17 C 20 17, 14 19, 12 25 M 24 17 C 28 17, 34 19, 36 25 M 24 29 L 18 41 M 24 29 L 30 41"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <TsuboMark cx="24" cy="21" r="4.5" />
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
