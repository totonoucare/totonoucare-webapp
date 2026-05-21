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

// リアルなイラストを描写するためのキャンバス（解像度256x256）
function IconFrame({ children, className }) {
  return (
    <svg viewBox="0 0 256 256" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

// 共通の肌色パレット
const SKIN_BASE = "#F2D1B3"; // 明るい肌色
const SKIN_SHADOW = "#DDA882"; // 立体感を出す影の色
const SKIN_DEEP = "#C68A61"; // さらに深い影（へそなど）

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 頭〜首〜肩のリアルな横顔シルエット（ベース） */}
      <path
        d="M120 30 C80 30 70 60 70 80 C70 90 60 95 50 105 C40 115 55 125 60 130 C55 135 60 145 70 150 C80 160 90 170 90 190 C90 220 60 230 40 256 L216 256 C190 230 170 200 170 160 C170 100 160 30 120 30 Z"
        fill={SKIN_BASE}
      />
      {/* 首筋と顎下のシャドウ（立体感） */}
      <path
        d="M70 150 C80 160 90 170 90 190 C90 220 60 230 40 256 L130 256 C130 256 120 200 110 180 C100 160 85 155 70 150 Z"
        fill={SKIN_SHADOW}
      />
      {/* 耳のディテール */}
      <path
        d="M 125 105 C 115 105 110 120 115 130 C 120 140 135 135 135 120 C 135 110 130 105 125 105 Z"
        fill={SKIN_SHADOW}
      />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 5本の指と手首を持つリアルな手のひら（ベース） */}
      <path
        d="M90 256 L90 180 C80 170 60 150 55 130 C50 110 70 100 80 120 L95 140 L95 60 C95 40 120 40 120 60 L120 130 L125 50 C125 30 150 30 150 50 L150 130 L155 65 C155 45 180 45 180 65 L180 140 L185 95 C185 75 210 75 210 95 L210 180 C210 210 170 230 170 256 Z"
        fill={SKIN_BASE}
      />
      {/* 親指の付け根（母指球）のシャドウ */}
      <path
        d="M90 256 L90 180 C80 170 60 150 55 130 C50 110 70 100 80 120 L95 140 L110 170 L110 256 Z"
        fill={SKIN_SHADOW}
      />
      {/* 小指側のシャドウ */}
      <path
        d="M210 180 C210 210 170 230 170 256 L150 256 L180 180 Z"
        fill={SKIN_SHADOW}
      />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* ふくらはぎ〜かかと〜つま先の側面シルエット（ベース） */}
      <path
        d="M 120 30 L 120 140 C 120 170 100 180 70 210 C 40 240 50 250 80 250 L 200 250 C 230 250 240 230 220 200 C 200 170 180 150 180 110 L 180 30 Z"
        fill={SKIN_BASE}
      />
      {/* アキレス腱と土踏まずのシャドウ */}
      <path
        d="M 180 30 L 180 110 C 180 150 200 170 220 200 C 240 230 230 250 200 250 L 160 250 C 180 220 170 170 150 140 L 150 30 Z"
        fill={SKIN_SHADOW}
      />
      {/* くるぶしの骨の膨らみ */}
      <circle cx="165" cy="195" r="12" fill={SKIN_SHADOW} />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 胴体のくびれと筋肉を意識したトルソー（ベース） */}
      <path
        d="M 70 30 C 50 30 40 50 50 80 C 60 110 70 140 65 180 C 60 220 50 250 80 250 L 176 250 C 206 250 196 220 191 180 C 186 140 196 110 206 80 C 216 50 206 30 186 30 C 166 30 150 50 128 50 C 106 50 90 30 70 30 Z"
        fill={SKIN_BASE}
      />
      {/* 胸部（大胸筋）下部のシャドウ */}
      <path
        d="M 60 100 C 80 130 110 130 128 110 C 146 130 176 130 196 100 C 190 140 150 145 128 135 C 106 145 66 140 60 100 Z"
        fill={SKIN_SHADOW}
      />
      {/* 腹筋の中心線（白線） */}
      <path
        d="M 125 135 L 125 230 A 3 3 0 0 0 131 230 L 131 135 Z"
        fill={SKIN_SHADOW}
      />
      {/* ウエスト両サイドのシャドウ */}
      <path
        d="M 50 80 C 60 110 70 140 65 180 C 60 220 50 250 80 250 L 100 250 C 70 210 80 150 65 100 Z"
        fill={SKIN_SHADOW}
      />
      {/* おへそ */}
      <circle cx="128" cy="195" r="5" fill={SKIN_DEEP} />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 全身のマネキン風シルエット */}
      <circle cx="128" cy="35" r="24" fill={SKIN_BASE} />
      {/* 頭の球体としての立体感（三日月型の影） */}
      <path
        d="M 128 11 A 24 24 0 0 1 128 59 A 24 24 0 0 0 128 11 Z"
        fill={SKIN_SHADOW}
      />
      {/* 胴体と手足のベース */}
      <path
        d="M 100 65 C 128 55 156 65 166 85 L 190 145 C 195 155 180 165 170 150 L 155 110 L 155 170 L 175 240 C 180 255 155 260 150 245 L 128 180 L 106 245 C 101 260 76 255 81 240 L 101 170 L 101 110 L 86 150 C 76 165 61 155 66 145 L 90 85 C 95 75 100 65 100 65 Z"
        fill={SKIN_BASE}
      />
      {/* 右半身のシャドウで3D感を強調 */}
      <path
        d="M 128 60 C 156 65 166 85 190 145 C 195 155 180 165 170 150 L 155 110 L 155 170 L 175 240 C 180 255 155 260 150 245 L 128 180 L 128 60 Z"
        fill={SKIN_SHADOW}
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

