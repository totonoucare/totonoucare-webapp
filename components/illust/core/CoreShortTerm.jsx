import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 1000 800" // ★ビューボックスを大幅に拡大（1000x800）
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink" // グラデーション、シャドウ用
      {...props}
    >
      <defs>
        {/* 1. グラデーション：胴体（イエロー〜アンバー） */}
        <linearGradient id="gradBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="1" /> // イエロー-200
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="1" /> // アンバー-400
        </linearGradient>
        {/* 2. グラデーション：舌（ピンク〜ディープピンク） */}
        <radialGradient id="gradTongue" cx="0.5" cy="0.5" r="1">
          <stop offset="0%" stopColor="#F472B6" stopOpacity="1" /> // ピンク-400
          <stop offset="100%" stopColor="#D946EF" stopOpacity="1" /> // フクシャ-500
        </radialGradient>
        {/* 3. グラデーション：汗（ライトブルー〜ブルー） */}
        <linearGradient id="gradSweat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.8" /> // ライトブルー-300
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" /> // ブルー-400
        </linearGradient>
        {/* 4. グラデーション：息切れ（オフホワイト） */}
        <radialGradient id="gradBreath" cx="0.5" cy="0.5" r="1">
          <stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.8" /> // スレート-100
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.4" /> // スレート-200
        </radialGradient>
        {/* 5. フィルター：シャドウ（胴体、模様用） */}
        <filter id="filterShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="6" dy="6" result="offsetBlur" />
          <feFlood floodColor="#292524" floodOpacity="0.3" /> // ストーン-900
          <feComposite in2="offsetBlur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 6. フィルター：ブラー（土煙用） */}
        <filter id="filterBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      {/* 1. 背景：流れるような有機的なシェイプとスピード感 */}
      <path
        d="M 50 400 Q 100 150, 500 100 C 850 50, 950 300, 950 450 Q 950 700, 600 750 C 300 800, 50 650, 50 400 Z"
        fill="#FEF3C7" // アンバー-100
        filter="url(#filterShadow)"
      />
      {/* 後ろに流れるスピード線（グラデーション、シャドウ） */}
      <g stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" opacity="0.6">
        <line x1="20" y1="180" x2="250" y2="180" />
        <line x1="50" y1="350" x2="180" y2="350" />
        <line x1="30" y1="520" x2="300" y2="520" />
      </g>
      {/* 足元の土煙（💨：グラデーション、ブラー） */}
      <g fill="url(#gradBreath)" filter="url(#filterBlur)" opacity="0.6">
        <circle cx="150" y="700" r="40" />
        <circle cx="280" y="720" r="30" />
        <circle cx="380" y="740" r="20" />
      </g>

      {/* 2. チーターの全身（細身、前傾、長い尾） */}
      {/* 胴体：前傾姿勢のダイナミックな流線型、筋肉の表現 */}
      <path
        d="M 850 250 C 950 250, 980 350, 980 450 C 980 550, 900 650, 800 600 Q 700 700, 550 750 L 350 750 C 250 700, 200 600, 200 450 L 700 450 C 750 350, 800 250, 850 250 Z"
        fill="url(#gradBody)" // グラデーション胴体
        filter="url(#filterShadow)"
      />
      {/* 特徴的な長い尾：後ろに大きくS字を描く、しなやかなpath */}
      <path
        d="M 200 450 Q 80 350, 50 500 Q 80 650, 250 620 L 280 620 L 300 580 Q 250 580, 200 450 Z"
        fill="#FBBF24" // アンバー-400
        filter="url(#filterShadow)"
      />

      {/* チーターの模様（全身：円だけでなく、不規則な斑点を全身に多数配置、シャドウ） */}
      <g fill="#1C1917" filter="url(#filterShadow)"> // ストーン-900
        {/* 顔の模様 */}
        <circle cx="750" cy="280" r="18" />
        <circle cx="680" cy="350" r="15" />
        <circle cx="780" cy="380" r="20" />
        {/* 胴体の模様（細身に沿って） */}
        <circle cx="850" cy="320" r="18" />
        <circle cx="920" cy="380" r="15" />
        <circle cx="880" cy="450" r="20" />
        <circle cx="950" cy="520" r="18" />
        <circle cx="900" cy="580" r="15" />
        <circle cx="830" cy="620" r="20" />
        <circle cx="750" cy="650" r="18" />
        <circle cx="680" cy="680" r="15" />
        <circle cx="600" cy="700" r="20" />
        {/* 尾の模様 */}
        <circle cx="250" cy="380" r="12" />
        <circle cx="150" cy="420" r="15" />
        <circle cx="100" cy="500" r="12" />
        <circle cx="150" cy="580" r="10" />
        <circle cx="200" cy="610" r="12" />
      </g>
      {/* 体の筋肉のシャドウ */}
      <g stroke="#D97706" strokeWidth="4" strokeLinecap="round" opacity="0.4">
        <path d="M 850 380 Q 800 450, 750 500" />
        <path d="M 900 450 Q 850 520, 800 580" />
        <path d="M 950 520 Q 900 580, 850 620" />
      </g>

      {/* 3. 脚（4本、躍動感のある疾走ポーズ） */}
      {/* pathでダイナミックな脚、シャドウ */}
      <g stroke="#FBBF24" strokeWidth="50" strokeLinecap="round" filter="url(#filterShadow)">
        {/* 前脚 */}
        <path d="M 800 600 L 950 850" />
        <path d="M 850 600 L 900 820" />
        {/* 後脚 */}
        <path d="M 550 750 L 450 980" />
        <path d="M 500 750 L 480 950" />
      </g>
      {/* 脚の模様 */}
      <g fill="#1C1917">
        {/* 前脚の模様 */}
        <circle cx="850" cy="700" r="15" />
        <circle cx="880" cy="750" r="12" />
        <circle cx="830" cy="800" r="10" />
        {/* 後脚の模様 */}
        <circle cx="500" cy="850" r="15" />
        <circle cx="530" cy="900" r="12" />
        <circle cx="480" cy="950" r="10" />
      </g>
      {/* 脚の筋肉のシャドウ */}
      <g stroke="#D97706" strokeWidth="4" strokeLinecap="round" opacity="0.4">
        <path d="M 850 720 Q 820 780, 850 820" />
        <path d="M 500 870 Q 480 920, 500 960" />
      </g>

      {/* 4. 頭部：小顔、筋肉、シャドウ */}
      <g>
        {/* 頭のベース（筋肉の表現） */}
        <path
          d="M 820 180 C 880 180, 920 220, 920 280 C 920 340, 880 380, 820 380 C 760 380, 720 340, 720 280 C 720 220, 760 180, 820 180 Z"
          fill="url(#gradBody)" // グラデーション
          filter="url(#filterShadow)"
        />
        {/* 耳：詳細なパス、グラデーション */}
        <path d="M 780 200 L 730 80 C 800 80, 860 120, 860 180 Z" fill="#D97706" filter="url(#filterShadow)" />
        {/* 耳の内側 */}
        <path d="M 770 190 L 740 100 C 790 100, 830 130, 830 170 Z" fill="#FEF3C7" />
      </g>
      {/* 顔の模様：精密な涙模様、斑点、シャドウ */}
      <g fill="#1C1917" filter="url(#filterShadow)">
        <circle cx="840" cy="220" r="15" />
        <circle cx="780" cy="280" r="12" />
        <circle cx="850" cy="320" r="18" />
        {/* 目の下の涙模様（チーターの最大の特徴！） */}
        <path
          d="M 790 280 Q 720 400, 780 500"
          fill="none"
          stroke="#1C1917"
          strokeWidth="15"
          strokeLinecap="round"
        />
      </g>
      {/* 顔の筋肉のシャドウ */}
      <g stroke="#D97706" strokeWidth="4" strokeLinecap="round" opacity="0.4">
        <path d="M 800 240 Q 750 300, 800 350" />
      </g>

      {/* 目と涙模様 */}
      {/* 目：疲れた（垂れた）感じ */}
      <ellipse
        cx="790"
        cy="260"
        rx="18"
        ry="22"
        transform="rotate(-5 790 260)"
        fill="#1C1917"
      />
      {/* 涙模様 */}
      <path d="M 790 260 Q 810 320, 780 350" stroke="#1C1917" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* 鼻 */}
      <circle cx="920" cy="380" r="25" fill="#1C1917" filter="url(#filterShadow)" />

      {/* 口と舌：大きく開き、奥に影。大きく出した舌 */}
      {/* 開いた口 */}
      <path
        d="M 910 280 C 930 280, 950 300, 950 330 Q 950 370, 930 370 L 910 330 Q 890 300, 910 280 Z"
        fill="#FEF3C7"
      />
      {/* 口の奥の影 */}
      <path
        d="M 915 290 Q 930 295, 930 320 L 920 320 Q 910 300, 915 290 Z"
        fill="#78350F" opacity="0.2"
      />
      {/* 大きく出した舌（スクショのピンク、グラデーション、シャドウ） */}
      <path
        d="M 930 320 C 900 420, 850 420, 830 370 L 860 330 Q 900 350, 930 320 Z"
        fill="url(#gradTongue)"
        filter="url(#filterShadow)"
      />

      {/* 5. バテ表現の追加（汗💦、息💨） */}
      {/* 汗（💦：頭部、首、胴体、脚から飛ばす。詳細なパス、グラデーション、シャドウ） */}
      <g fill="url(#gradSweat)" filter="url(#filterShadow)">
        {/* 頭部 */}
        <path d="M 800 150 A 20 20 0 0 1 840 150 A 30 30 0 0 0 820 120 A 20 20 0 0 1 800 150 Z" transform="rotate(-30 820 120)" />
        {/* 首 */}
        <path d="M 800 150 A 20 20 0 0 1 840 150 A 30 30 0 0 0 820 120 A 20 20 0 0 1 800 150 Z" transform="translate(100,200) rotate(15)" />
        {/* 胴体 */}
        <path d="M 800 150 A 20 20 0 0 1 840 150 A 30 30 0 0 0 820 120 A 20 20 0 0 1 800 150 Z" transform="translate(250,300) rotate(45)" />
        {/* 脚 */}
        <path d="M 800 150 A 20 20 0 0 1 840 150 A 30 30 0 0 0 820 120 A 20 20 0 0 1 800 150 Z" transform="translate(600,600) rotate(-60)" />
      </g>
      {/* 息切れ（💨：口元から大きく飛ばす。詳細なパス、グラデーション、ブラー） */}
      <g fill="url(#gradBreath)" filter="url(#filterBlur)" opacity="0.6">
        <circle cx="1020" cy="300" r="40" />
        <circle cx="1080" cy="380" r="30" />
        <circle cx="1120" cy="450" r="20" />
      </g>
    </svg>
  );
}
