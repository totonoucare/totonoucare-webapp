import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 背景の柔らかなスピード感 */}
      <ellipse cx="80" cy="75" rx="65" ry="35" fill="#FEF3C7" opacity="0.6" />
      
      <g transform="translate(10, 15)">
        {/* 1. 尻尾：しなやかに後ろに流れる */}
        <path
          d="M 35 60 Q 15 55, 5 70 Q 0 80, 15 80 Q 25 80, 35 65"
          fill="#FBBF24"
        />

        {/* 2. 四肢：疾走中の躍動感 */}
        <g fill="#FBBF24">
          {/* 後ろ脚 */}
          <path d="M 45 65 L 30 95 L 40 95 L 55 70 Z" opacity="0.8" />
          <path d="M 55 68 L 45 90 L 55 90 L 65 72 Z" />
          {/* 前脚 */}
          <path d="M 100 65 L 125 90 L 115 90 L 95 70 Z" />
          <path d="M 110 68 L 135 85 L 125 85 L 105 70 Z" opacity="0.8" />
        </g>

        {/* 3. 胴体：スリムで前傾した流線型 */}
        <path
          d="M 35 60 Q 55 35, 100 40 L 120 70 L 45 75 Z"
          fill="#FBBF24"
        />

        {/* 4. 頭部：小顔で必死な表情 */}
        <g transform="translate(110, 30)">
          {/* 頭のベース */}
          <path
            d="M 5 20 Q 15 5, 28 12 Q 35 20, 30 35 L 5 35 Z"
            fill="#FBBF24"
          />
          {/* 耳 */}
          <path d="M 12 8 L 8 0 Q 18 0, 18 8 Z" fill="#D97706" />
          {/* 目：少し垂れ目で疲労感を演出 */}
          <circle cx="22" cy="18" r="1.8" fill="#1C1917" />
          {/* チーター特有の涙模様（ティアーズライン） */}
          <path
            d="M 22 20 Q 25 30, 18 35"
            stroke="#1C1917"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 口：大きく開いてバテている */}
          <path d="M 28 30 L 38 35 L 25 38 Z" fill="#78350F" opacity="0.3" />
          {/* 舌：だらんと出たピンクの舌 */}
          <path
            d="M 32 33 Q 42 40, 38 48 Q 32 48, 32 40"
            fill="#F472B6"
          />
        </g>

        {/* 5. 体の模様（スポット） */}
        <g fill="#1C1917" opacity="0.9">
          <circle cx="50" cy="55" r="2.2" />
          <circle cx="65" cy="50" r="2.5" />
          <circle cx="85" cy="48" r="2.5" />
          <circle cx="75" cy="62" r="2.2" />
          <circle cx="95" cy="58" r="2.5" />
          <circle cx="110" cy="60" r="2" />
          <circle cx="15" cy="73" r="1.5" />
        </g>

        {/* 6. バテ演出：汗💦と息💨 */}
        {/* 汗：頭部と背中から飛ぶ */}
        <g fill="#60A5FA">
          <path d="M 115 25 Q 118 20, 115 15 Q 112 20, 115 25 Z" transform="rotate(-20, 115, 20)" />
          <path d="M 135 60 Q 138 55, 135 50 Q 132 55, 135 60 Z" transform="rotate(30, 135, 55)" />
        </g>
        {/* 息：口元から出る白い煙 */}
        <g fill="#CBD5E1" opacity="0.7">
          <circle cx="148" cy="68" r="4" />
          <circle cx="156" cy="74" r="3" />
        </g>
      </g>
    </svg>
  );
}
