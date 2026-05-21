"use client";

import React from "react";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV"]);
const TSUBO_HEAD_NECK_CODES = new Set(["GB20", "GV20"]);

// 温かみがあり健康的な解剖イラスト用カラーパレット
const SKIN = "#F2C8A8";
const SKIN_LIGHT = "#FFE5D2";
const SKIN_SHADOW = "#D89C78";
const SKIN_DEEP = "#B9785D";
const OUTLINE = "#8A5A49";
const HAIR = "#6F5145";
const SOFT_BG = "#FDF5F0"; // アプリに馴染む透明感のある上品な背景色

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

// 繊細なディテールを表現する 128x128 の高解像度フレーム
function IconFrame({ children, className }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true" role="img">
      {/* 統一感を出すための丸型ベース背景（透過にしたい場合はこのcircleを削除してください） */}
      <circle cx="64" cy="64" r="58" fill={SOFT_BG} />
      {children}
    </svg>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 首・肩・胸元のベース */}
      <path
        d="M 50 72 L 50 92 C 40 100, 26 106, 16 116 L 112 116 C 102 106, 88 100, 78 92 L 78 72 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* デコルテの立体シャドウ */}
      <path
        d="M 50 92 C 58 100, 70 100, 78 92 C 88 100, 102 106, 112 116 L 16 116 C 26 106, 40 100, 50 92 Z"
        fill={SKIN_SHADOW}
        opacity="0.4"
      />
      {/* 頭部・顔の輪郭 */}
      <path
        d="M 40 50 C 40 68, 50 76, 64 76 C 78 76, 88 68, 88 50 C 88 32, 78 22, 64 22 C 50 22, 40 32, 40 50 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 顔のサイドシャドウ */}
      <path
        d="M 64 22 C 78 22, 88 32, 88 50 C 88 68, 78 76, 64 76 C 72 70, 76 58, 76 50 C 76 42, 72 30, 64 22 Z"
        fill={SKIN_SHADOW}
        opacity="0.3"
      />
      {/* 耳のライン */}
      <path d="M 35 46 C 32 46, 32 54, 40 54 M 93 46 C 96 46, 96 54, 88 54" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
      {/* 洗練されたヘアライン */}
      <path
        d="M 39 46 C 38 28, 48 16, 64 16 C 80 16, 90 28, 89 46 C 84 40, 76 38, 64 42 C 52 38, 44 40, 39 46 Z"
        fill={HAIR}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      {/* 鎖骨の補助線 */}
      <path d="M 36 104 Q 64 112 92 104" fill="none" stroke={SKIN_DEEP} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 手首から5本の指先までが、歪みなく滑らかに繋がった1本の美しいクローズドパス */}
      <path
        d="M 52 120 L 52 92 C 44 86, 30 80, 24 70 C 18 60, 26 52, 34 58 L 48 72 L 48 26 C 48 18, 57 18, 57 26 L 57 66 L 58 16 C 58 8, 67 8, 67 16 L 67 64 L 68 20 C 68 12, 77 12, 77 20 L 77 66 L 78 30 C 78 23, 86 23, 86 30 L 86 82 C 88 92, 84 102, 84 120 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 母指球（親指の付け根）のふくらみを表現するシャドウ */}
      <path
        d="M 52 120 L 52 92 C 44 86, 30 80, 24 70 C 22 66, 24 60, 28 59 C 36 68, 48 84, 58 90 L 58 120 Z"
        fill={SKIN_SHADOW}
        opacity="0.35"
      />
      {/* 指と指の間のセパレーター線（これで1本ずつの指がリアルに分離します） */}
      <path d="M 57 56 L 57 76 M 67 54 L 67 80 M 77 58 L 77 80" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
      {/* 手のひらのシワ（手相の自然なカーブ） */}
      <path d="M 38 74 C 46 76, 54 86, 56 100" fill="none" stroke={SKIN_DEEP} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M 48 84 C 56 84, 68 92, 72 102" fill="none" stroke={SKIN_DEEP} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* すね・足の甲・つま先・土踏まず・かかと・ふくらはぎを完璧なプロポーションで繋いだパス */}
      <path
        d="M 72 12 L 72 65 C 72 80, 52 95, 34 106 C 24 112, 22 118, 32 118 L 52 118 C 64 118, 68 114, 78 118 C 90 118, 96 114, 96 102 C 96 88, 90 78, 90 68 C 90 53, 94 33, 94 12 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* アキレス腱からかかと、足底へ流れる美しい立体陰影 */}
      <path
        d="M 90 68 C 90 53, 94 33, 94 12 L 84 12 C 84 35, 80 55, 80 68 C 80 82, 74 94, 68 102 C 64 108, 64 114, 78 118 C 90 118, 96 114, 96 102 C 96 88, 90 78, 90 68 Z"
        fill={SKIN_SHADOW}
        opacity="0.4"
      />
      {/* 内くるぶしの骨の膨らみ（絶妙なハイライト効果） */}
      <ellipse cx="80" cy="94" rx="4.5" ry="6" fill={SKIN_LIGHT} opacity="0.7" />
      <ellipse cx="80" cy="94" rx="4.5" ry="6" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.4" />
      {/* 足の甲のディテール */}
      <path d="M 44 104 C 38 108, 34 112, 32 116" fill="none" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 72 55 C 74 70, 68 85, 58 95" fill="none" stroke={SKIN_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 肩のライン、脇の下、引き締まったウエストのくびれ、骨盤を表現したトルソー */}
      <path
        d="M 52 16 L 76 16 C 86 16, 100 20, 108 30 C 110 34, 102 44, 94 48 C 90 62, 88 74, 88 88 C 88 100, 96 108, 98 118 L 30 118 C 32 108, 40 100, 40 88 C 40 74, 38 62, 34 48 C 26 44, 18 34, 20 30 C 28 20, 42 16, 52 16 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 脇腹から腰回りのリアルな陰影（シャドウ） */}
      <path
        d="M 30 118 C 32 108, 40 100, 40 88 C 40 74, 38 62, 34 48 C 30 46, 26 42, 24 38 C 30 52, 46 80, 46 95 C 46 105, 38 112, 30 118 Z"
        fill={SKIN_SHADOW}
        opacity="0.35"
      />
      <path
        d="M 98 118 C 96 108, 88 100, 88 88 C 88 74, 90 62, 94 48 C 98 46, 102 42, 104 38 C 98 52, 82 80, 82 95 C 82 105, 90 112, 98 118 Z"
        fill={SKIN_SHADOW}
        opacity="0.35"
      />
      {/* 大胸筋・肋骨周りのソフトな輪郭線 */}
      <path d="M 36 48 C 48 54, 60 54, 64 54 C 68 54, 80 54, 92 48" fill="none" stroke={OUTLINE} strokeWidth="1.8" opacity="0.3" />
      {/* 腹筋の中心線（白線）とおへそ */}
      <path d="M 64 58 L 64 110" fill="none" stroke={SKIN_SHADOW} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <circle cx="64" cy="92" r="3.5" fill={SKIN_DEEP} opacity="0.8" />
      {/* 腹筋の立体ハイライト */}
      <path d="M 64 68 C 54 74, 52 82, 52 90" fill="none" stroke={SKIN_LIGHT} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {/* 頭部と立体シャドウ */}
      <circle cx="64" cy="22" r="11" fill={SKIN} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M 64 11 A 11 11 0 0 1 64 33 A 11 11 0 0 0 64 11 Z" fill={SKIN_SHADOW} opacity="0.3" />
      
      {/* 全身（体幹、四肢）をスタイリッシュかつ滑らかな3Dフラット調に落とし込んだマネキンシルエット */}
      <path
        d="M 52 38 C 42 38, 28 44, 22 52 C 18 58, 24 64, 30 58 L 44 46 L 44 76 L 36 114 C 34 120, 44 122, 48 116 L 64 88 L 80 116 C 84 122, 94 120, 92 114 L 84 76 L 84 46 L 98 58 C 104 64, 110 58, 106 52 C 100 44, 86 38, 76 38 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 半身にかかる立体シャドウ */}
      <path
        d="M 64 38 L 64 88 L 80 116 C 84 122, 94 120, 92 114 L 84 76 L 84 46 L 98 58 C 104 64, 110 58, 106 52 C 100 44, 86 38, 76 38 Z"
        fill={SKIN_SHADOW}
        opacity="0.35"
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

