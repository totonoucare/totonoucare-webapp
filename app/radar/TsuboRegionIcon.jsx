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

function TsuboMark({ cx, cy, r = 4.5 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.2" />
      <circle cx={cx} cy={cy} r="1.8" fill="currentColor" />
    </>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 頭〜首〜肩のクリーンなシルエット */}
      <path
        d="M 24 6 C 18 6 14 10 14 16 C 14 22 17 25 17 28 L 17 31 C 17 33 13 36 9 38 L 9 42 H 39 L 39 38 C 35 36 31 33 31 31 L 31 28 C 31 25 34 22 34 16 C 34 10 30 6 24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 鎖骨のライン（さりげないアクセント） */}
      <path
        d="M 15 36 Q 24 38 33 36"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <TsuboMark cx="24" cy="27" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 親指〜手首までの美しい連続ライン */}
      <path
        d="M 18 42 V 26 C 14 26 10 24 10 20 C 10 17 13 16 15 18 L 16 20 V 10 C 16 7.5 19 7.5 19 10 V 18 M 19 18 V 6 C 19 3.5 22 3.5 22 6 V 18 M 22 18 V 8 C 22 5.5 25 5.5 25 8 V 18 M 25 18 V 12 C 25 9.5 28 9.5 28 12 V 26 C 28 32 30 36 30 42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 手首のシワ */}
      <path
        d="M 18 36 Q 24 38 30 36"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <TsuboMark cx="24" cy="28" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 足首からつま先までの側面シルエット */}
      <path
        d="M 14 6 V 26 C 14 34 18 38 22 38 H 36 C 40 38 42 34 38 32 C 32 29 27 26 26 20 V 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* くるぶし */}
      <circle 
        cx="20" 
        cy="28" 
        r="2" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
      <TsuboMark cx="27" cy="30" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 胴体のくびれを意識した滑らかなライン */}
      <path
        d="M 20 6 C 16 6 12 10 12 16 C 12 24 16 28 16 32 C 16 38 12 42 12 42 H 36 C 36 42 32 38 32 32 C 32 28 36 24 36 16 C 36 10 32 6 28 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* みぞおち〜肋骨の補助線 */}
      <path
        d="M 16 20 Q 24 24 32 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* おへそ */}
      <circle cx="24" cy="34" r="1.5" fill="currentColor" opacity="0.35" />
      <TsuboMark cx="24" cy="25" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* シンプルで視認性の高いピクトグラム風 */}
      <circle cx="24" cy="10" r="5" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M 24 18 V 30 M 16 28 C 14 20 18 16 24 16 C 30 16 34 20 32 28 M 18 42 C 18 34 24 30 24 30 C 24 30 30 34 30 42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <TsuboMark cx="24" cy="24" />
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


