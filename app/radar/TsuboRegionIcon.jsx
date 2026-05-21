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

// viewBoxを 256x256 の高解像度グリッドに拡張
function IconFrame({ children, className }) {
  return (
    <svg viewBox="0 0 256 256" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

// グリッド拡大に合わせてツボマークのサイズも最適化
function TsuboMark({ cx, cy, r = 22 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.15" />
      <circle cx={cx} cy={cy} r="8" fill="currentColor" />
    </>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 繊細で美しい頭部から肩へのシルエット */}
      <path
        d="M 128 28 C 88 28 64 64 64 104 C 64 140 84 156 96 172 C 102 180 104 192 92 208 C 76 228 32 240 32 240 H 224 C 224 240 180 228 164 208 C 152 192 154 180 160 172 C 172 156 192 140 192 104 C 192 64 168 28 128 28 Z"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 鎖骨のライン（高級感を出すためのディテール） */}
      <path
        d="M 68 200 Q 128 220 188 200"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* 首の後ろ/うなじ付近のツボを想定した配置 */}
      <TsuboMark cx="128" cy="160" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 幾何学的で洗練された指と手首の連続ライン */}
      <path
        d="M 76 256 L 76 172 C 60 144 32 120 36 92 C 40 64 72 72 88 104 L 96 128 L 96 44 C 96 20 128 20 128 44 L 128 120 L 128 28 C 128 4 160 4 160 28 L 160 120 L 160 52 C 160 28 192 28 192 52 L 192 136 L 192 88 C 192 64 224 64 224 88 L 224 164 C 224 204 184 228 184 256"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 手首のシワ */}
      <path
        d="M 88 220 Q 130 236 172 220"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* 手のひら/労宮などを想定した配置 */}
      <TsuboMark cx="128" cy="168" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* ふくらはぎ〜足首〜つま先までの美しいサイドシルエット */}
      <path
        d="M 96 24 L 96 112 C 96 156 60 172 48 204 C 36 236 72 244 96 244 L 192 244 C 228 244 244 212 224 188 C 196 156 160 140 160 92 L 160 24"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* くるぶし（外果・内果）の骨の表現 */}
      <circle 
        cx="100" 
        cy="180" 
        r="12" 
        stroke="currentColor" 
        strokeWidth="10" 
        strokeLinecap="round"
      />
      {/* 足首周辺/太渓などを想定した配置 */}
      <TsuboMark cx="136" cy="192" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 肩からウエストラインにかけての有機的なカーブ */}
      <path
        d="M 64 32 C 40 32 32 64 48 100 C 64 136 64 164 56 196 C 48 228 72 248 128 248 C 184 248 208 228 200 196 C 192 164 192 136 208 100 C 224 64 216 32 192 32 C 168 32 152 48 128 48 C 104 48 88 32 64 32 Z"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* みぞおちの補助線 */}
      <path
        d="M 88 112 Q 128 132 168 112"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* おへそ */}
      <circle cx="128" cy="184" r="6" fill="currentColor" opacity="0.4" />
      {/* 中脘/関元などを想定した配置 */}
      <TsuboMark cx="128" cy="140" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* シンボリックかつモダンな全身ピクトグラム */}
      <circle cx="128" cy="48" r="24" stroke="currentColor" strokeWidth="10" />
      <path
        d="M 128 92 V 164 M 80 152 C 64 104 92 80 128 80 C 164 80 192 104 176 152 M 88 232 C 88 184 128 164 128 164 C 128 164 168 184 168 232"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 全身の中心としての配置 */}
      <TsuboMark cx="128" cy="128" />
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


