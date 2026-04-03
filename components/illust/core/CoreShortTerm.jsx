"use client";

export default function CoreShortTerm({ className = "h-full w-full", title = "短期集中型" }) {
  // コンセプト：陽（アクセル）× 小（余力）。人物モチーフ（顔なし、性別不詳）。
  // SaaS風のジオメトリック・ラインアートで「必死の全力疾走」を表現。
  // ポーズをさらに前傾させ、肩を少し上げ、頭を下げ気味にして息を切らしているシルエットに。
  // 【新規追加】：汗。頭部や肩、胴体の周りに、小さな滴ドロップを描き加えた。
  // 胸のコアは小さく、儚い光。
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="coreGlow_st" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#d9a54a" stopOpacity="0" />
        </radialGradient>
        <filter id="glowBlur_st" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* 人物シルエットに奥行きを出すための極めて繊細なぼかし効果 */}
        <filter id="softShadow_st" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#4d6f55" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* 優しい背景の円（ホーム画面の「観覧車」と呼応） */}
      <circle cx="60" cy="60" r="48" fill="#fdfefc" filter="url(#softShadow_st)" />
      <circle cx="60" cy="60" r="42" fill="#eef4eb" opacity="0.5" />

      {/* アクセル（スピード感）を表現する薄いミントグリーンの風のライン */}
      <path d="M 15 45 L 35 45 M 8 65 L 25 65 M 20 85 L 40 85" stroke="#d3e2d6" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {/* 人物モチーフ（関節を重ね合わせたモダンなラインアート） */}
      <g transform="translate(2, 5)">
        {/* 奥のレイヤー (右腕、左脚) - 透明度を下げて奥行きを出す */}
        <g stroke="#89ac8e" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4">
          <path d="M 76 40 L 60 30 L 45 40" /> {/* 後ろに振る腕 */}
          <path d="M 55 70 L 25 85" /> {/* 地面を蹴る脚 */}
        </g>

        {/* 中間のレイヤー (胴体と頭) */}
        <g stroke="#6a9770" strokeWidth="13" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M 76 40 L 55 70" /> {/* 前傾姿勢の胴体 */}
        </g>
        {/* 頭部 */}
        <circle cx="86" cy="24" r="7.5" fill="#6a9770" opacity="0.9" />

        {/* 手前のレイヤー (左腕、右脚) - 明るい色で手前を表現 */}
        <g stroke="#a8c7ab" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="1">
          <path d="M 76 40 L 90 50 L 80 70" /> {/* 前に振る腕 */}
          <path d="M 55 70 L 75 65 L 75 90" /> {/* 振り上げる脚 */}
        </g>

        {/* 【新規追加】：汗 (小さな滴ドロップを頭部や胴体の周りに配置) */}
        {/* 汗もマットな質感に馴染ませるために、人物と同じ色で、opacityを調整 */}
        <g fill="#6a9770" opacity="0.6">
            <circle cx="95" cy="22" r="2" /> {/* 頭の後ろ */}
            <circle cx="92" cy="18" r="1.5" /> {/* おでこ */}
            <circle cx="80" cy="30" r="1.5" /> {/* 首筋 */}
            <circle cx="68" cy="45" r="2" /> {/* 胸の横 */}
            <circle cx="64" cy="41" r="1" /> {/* 胸の横(小) */}
            <circle cx="58" cy="60" r="1.5" /> {/* 胴体の横 */}
            <circle cx="54" cy="63" r="1" /> {/* 胴体の横(小) */}
        </g>

        {/* コア（バッテリー小：小さく儚い輝き） */}
        <circle cx="65" cy="55" r="14" fill="url(#coreGlow_st)" opacity="0.8" filter="url(#glowBlur_st)" />
        <circle cx="65" cy="55" r="4" fill="#d9a54a" />
      </g>
    </svg>
  );
}
