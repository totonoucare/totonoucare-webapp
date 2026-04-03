"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：洗練されたメディカルラインアート（ツムラ/クラシエのモダン進化版）
  // 短期集中型：アクセル（首肩や頭に気が上る・張る） × 余力小（胸のコアが小さい）
  // ユーザーの悩みに多い「首肩のつらさ・頭痛」に直結する、こめかみ〜首を押さえるポーズ。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        {/* 背景の柔らかなベース */}
        <linearGradient id="bgGrad_st_line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfefc" />
          <stop offset="100%" stopColor="#eef4eb" />
        </linearGradient>

        {/* 不調・テンション（アクセル）を示すオーラ */}
        <radialGradient id="tensionAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6a9770" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6a9770" stopOpacity="0" />
        </radialGradient>

        {/* 胸のコア（余力小） */}
        <radialGradient id="coreGlow_st_line" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. ベースの角丸背景 */}
      <rect width="120" height="120" rx="28" fill="url(#bgGrad_st_line)" />

      {/* 2. 状態を示すオーラ（ツムラ的なアプローチ） */}
      {/* アクセル優位：頭〜首肩にかけて、気が上って「張っている」状態をミントのオーラで表現 */}
      <circle cx="75" cy="45" r="28" fill="url(#tensionAura)" />
      {/* ズキズキ・ピリピリ感を表現する控えめなスパーク */}
      <path d="M 85 25 L 88 20 M 95 35 L 102 32 M 88 48 L 94 52" stroke="#89ac8e" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

      {/* 3. 人物のアウトライン（洗練された有機的な曲線） */}
      {/* 首〜こめかみに手を当てる、少し疲労・緊張感のあるポーズ */}
      <g stroke="#4d6f55" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭部（少しうつむき加減） */}
        <circle cx="56" cy="36" r="13" fill="#fdfefc" />
        
        {/* 胴体（左肩は下がり、右肩は上がっている非対称な緊張感） */}
        <path d="M 20 100 C 20 70, 35 60, 50 60 C 65 60, 75 65, 80 75" />
        
        {/* 右腕（こめかみ〜首の付け根に手を添える） */}
        <path d="M 80 75 C 90 90, 95 100, 95 100" /> {/* 背中側 */}
        <path d="M 20 100 C 30 75, 55 65, 68 45" /> {/* 左手が右肩/首へ伸びるクロスライン */}
      </g>

      {/* 4. 体質コア（胸の奥にある「余力」のメタファー） */}
      <g transform="translate(48, 70)">
        {/* 余力小：小さく、儚い光 */}
        <circle cx="0" cy="0" r="14" fill="url(#coreGlow_st_line)" />
        <circle cx="0" cy="0" r="3.5" fill="#d9a54a" opacity="0.9" />
      </g>
    </svg>
  );
}
