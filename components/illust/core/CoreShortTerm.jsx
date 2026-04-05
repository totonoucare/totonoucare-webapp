import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 背景のスピード感：柔らかな円形グラデーション代わりのシェイプ */}
      <ellipse cx="75" cy="70" rx="65" ry="40" fill="#FEF3C7" opacity="0.6" />
      
      {/* 背後のスピードライン */}
      <g stroke="#FDE68A" strokeWidth="2" strokeLinecap="round">
        <line x1="10" y1="55" x2="35" y2="55" />
        <line x1="5" y1="70" x2="30" y2="70" />
        <line x1="15" y1="85" x2="40" y2="85" />
      </g>

      {/* チーターの本体 */}
      <g transform="translate(10, 10)">
        {/* 長い尻尾：しなやかな曲線 */}
        <path
          d="M 25 55 Q 5 45, 10 75 Q 15 90, 35 75"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* 後脚：力強く蹴り出すポーズ */}
        <path d="M 45 65 L 30 95" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
        <path d="M 55 70 L 45 90" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" opacity="0.8" />

        {/* 胴体：スリムで前傾姿勢 */}
        <path
          d="M 35 55 Q 55 40, 95 45 Q 115 50, 110 75 L 50 80 Q 35 80, 35 55"
          fill="#FBBF24"
        />

        {/* 前脚：ダイナミックに前へ */}
        <path d="M 95 65 L 115 95" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
        <path d="M 85 70 L 95 90" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" opacity="0.8" />

        {/* 斑点：フラットデザインに合うドット配置 */}
        <g fill="#451a03" opacity="0.8">
          <circle cx="45" cy="60" r="2" />
          <circle cx="55" cy="55" r="2.5" />
          <circle cx="68" cy="52" r="2" />
          <circle cx="82" cy="56" r="2.5" />
          <circle cx="95" cy="62" r="2" />
          <circle cx="60" cy="68" r="2" />
          <circle cx="75" cy="72" r="2.5" />
          <circle cx="15" cy="65" r="1.5" /> {/* 尻尾 */}
        </g>

        {/* 顔：小顔で必死な表情 */}
        <g transform="translate(105, 35)">
          <path
            d="M 0 5 C 10 -5, 25 0, 25 15 C 25 25, 15 30, 5 28 L 0 20 Z"
            fill="#FBBF24"
          />
          {/* 耳 */}
          <path d="M 5 0 L 12 -12 Q 20 -10, 18 2" fill="#D97706" />
          
          {/* 目：疲れ果てた表情（半目） */}
          <ellipse cx="12" cy="10" rx="3" ry="1.5" fill="#451a03" transform="rotate(-10, 12, 10)" />
          
          {/* 涙模様（ティアマーク）：チーターの重要ディテール */}
          <path d="M 10 12 Q 5 20, 8 28" fill="none" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* 口：大きく開き、バテバテの舌 */}
          <path d="M 15 22 Q 25 25, 20 32" fill="none" stroke="#451a03" strokeWidth="1" strokeLinecap="round" />
          <path
            d="M 18 24 Q 28 35, 22 45 Q 12 45, 16 30"
            fill="#F472B6" 
          /> {/* 舌 */}
        </g>
      </g>

      {/* バテ演出：汗と息 */}
      <g fill="#60A5FA"> {/* 汗 💦 */}
        <path d="M 115 30 Q 118 25, 115 20 Q 112 25, 115 30 Z" transform="rotate(20, 115, 25)" />
        <path d="M 105 45 Q 108 40, 105 35 Q 102 40, 105 45 Z" />
        <path d="M 135 75 Q 138 70, 135 65 Q 132 70, 135 75 Z" transform="rotate(-20, 135, 70)" />
      </g>
      
      <g fill="#CBD5E1" opacity="0.7"> {/* 息切れ 💨 */}
        <circle cx="145" cy="55" r="4" />
        <circle cx="152" cy="62" r="3" />
      </g>
    </svg>
  );
}
