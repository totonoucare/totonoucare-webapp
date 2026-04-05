import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 1. 背景：スピード感のある抽象的な背景 */}
      <path
        d="M 10 70 Q 20 20, 90 20 C 140 20, 150 50, 150 80 Q 150 110, 80 110 C 30 110, 10 90, 10 70 Z"
        fill="#FEF3C7"
      />
      <g stroke="#FDE68A" strokeWidth="3" strokeLinecap="round">
        <line x1="5" y1="40" x2="25" y2="40" />
        <line x1="10" y1="60" x2="35" y2="60" />
        <line x1="5" y1="80" x2="20" y2="80" />
      </g>

      {/* 2. 脚：躍動感のある4本脚 */}
      <g stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" fill="none">
        {/* 前脚：大きく踏み出す */}
        <path d="M 115 70 L 135 95" />
        <path d="M 105 75 L 120 100" />
        {/* 後脚：力強く蹴り出す */}
        <path d="M 65 75 L 45 105" />
        <path d="M 55 75 L 40 95" />
      </g>

      {/* 3. 胴体：細身・前傾姿勢・長い尾 */}
      <path
        d="M 40 60 Q 25 55, 10 65 Q 5 75, 20 75 Q 35 75, 45 65" // 尾
        fill="#FBBF24"
      />
      <path
        d="M 40 60 Q 60 45, 95 45 C 120 45, 130 55, 125 75 L 55 80 Q 40 80, 40 60" // 胴体
        fill="#FBBF24"
      />

      {/* 4. 頭部：小顔、開いた口、バテた舌 */}
      <g>
        {/* 頭のベース */}
        <path
          d="M 125 35 C 135 30, 145 35, 145 45 C 145 50, 140 55, 130 55 L 120 50 Z"
          fill="#FBBF24"
        />
        {/* 耳 */}
        <path d="M 128 32 L 132 20 Q 138 20, 140 25 Z" fill="#D97706" />
        {/* 口の中（開いている） */}
        <path d="M 135 48 Q 145 52, 140 58 L 130 52 Z" fill="#78350F" opacity="0.2" />
        {/* 舌：大きく垂れ下がる */}
        <path
          d="M 140 52 Q 148 65, 142 72 Q 135 72, 138 60"
          fill="#F472B6"
        />
      </g>

      {/* 5. 顔のパーツ */}
      <circle cx="138" cy="40" r="1.5" fill="#1C1917" /> {/* 目 */}
      <path
        d="M 138 42 Q 142 48, 135 55"
        stroke="#1C1917"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      /> {/* 涙模様 */}

      {/* 6. 特徴的な斑点（要所に配置） */}
      <g fill="#1C1917">
        <circle cx="65" cy="55" r="2" />
        <circle cx="85" cy="52" r="2.5" />
        <circle cx="105" cy="58" r="2" />
        <circle cx="75" cy="65" r="2.2" />
        <circle cx="95" cy="68" r="2.5" />
        <circle cx="115" cy="62" r="2" />
        <circle cx="50" cy="70" r="1.8" />
        <circle cx="25" cy="68" r="1.5" /> {/* 尾の斑点 */}
      </g>

      {/* 7. バテ演出：汗💦 と 息💨 */}
      {/* 汗：頭と背中から飛ぶ */}
      <g fill="#60A5FA">
        <path d="M 125 25 Q 128 20, 125 15 Q 122 20, 125 25 Z" transform="rotate(20, 125, 20)" />
        <path d="M 110 35 Q 113 30, 110 25 Q 107 30, 110 35 Z" transform="rotate(-10, 110, 30)" />
        <path d="M 145 65 Q 148 60, 145 55 Q 142 60, 145 65 Z" transform="rotate(30, 145, 60)" />
      </g>
      {/* 息：口元から出る */}
      <g fill="#CBD5E1" opacity="0.8">
        <circle cx="152" cy="50" r="4" />
        <circle cx="158" cy="58" r="3" />
      </g>
    </svg>
  );
}
