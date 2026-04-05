import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 160 120" // ★4:3の横長構図に拡張（100x100 -> 160x120）
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 1. 背景：流れるような有機的なシェイプ（アンバー系の淡い色） */}
      <path
        d="M 20 60 Q 30 20, 80 15 C 130 10, 150 40, 150 65 Q 150 100, 100 110 C 50 120, 20 100, 20 60 Z"
        fill="#FEF3C7" // Amber 100
      />

      {/* 2. 疾走の演出（スピード線と土煙） */}
      {/* 後ろに流れるスピード線 */}
      <g stroke="#FDE68A" strokeWidth="4" strokeLinecap="round">
        <line x1="5" y1="25" x2="35" y2="25" />
        <line x1="10" y1="45" x2="25" y2="45" />
        <line x1="5" y1="65" x2="40" y2="65" />
      </g>
      {/* 足元の土煙（💨） */}
      <g fill="#CBD5E1"> // Slate 300
        <circle cx="20" y="105" r="5" opacity="0.6" />
        <circle cx="35" y="108" r="4" opacity="0.4" />
        <circle cx="45" y="110" r="3" opacity="0.3" />
      </g>

      {/* 3. チーターの全身（細身、前傾、長い尾） */}
      {/* チーターの体（顔、首、胴体、尾までの一本のpath） */}
      {/* 小顔、細身、前傾姿勢をpathで表現 */}
      <path
        d="M 130 30 C 140 30, 145 35, 145 45 C 145 55, 135 60, 125 55 Q 110 65, 95 70 L 60 70 C 45 65, 40 50, 40 40 L 100 40 C 110 35, 120 30, 130 30 Z"
        fill="#FBBF24" // Amber 400
      />
      {/* チーターの特徴、長い尾（後ろに大きく流れる） */}
      <path
        d="M 40 40 Q 10 20, 5 40 Q 10 60, 40 65 L 45 65 Q 40 60, 45 40 Z"
        fill="#FBBF24"
      />

      {/* チーターの模様（全身） */}
      <g fill="#292524"> // Stone 900
        {/* 顔の模様 */}
        <circle cx="115" cy="35" r="3" />
        <circle cx="105" cy="45" r="2.5" />
        <circle cx="120" cy="50" r="3.5" />
        <circle cx="108" cy="60" r="3" />
        <circle cx="118" cy="65" r="2.5" />
        {/* 胴体の模様（細身に沿って） */}
        <circle cx="130" cy="40" r="3" />
        <circle cx="140" cy="50" r="2.5" />
        <circle cx="135" cy="60" r="3.5" />
        <circle cx="145" cy="70" r="3" />
        <circle cx="138" cy="80" r="2.5" />
        {/* 尾の模様 */}
        <circle cx="40" cy="20" r="2" />
        <circle cx="20" cy="25" r="2.5" />
        <circle cx="15" cy="35" r="2" />
        <circle cx="25" cy="40" r="1.5" />
        <circle cx="10" cy="50" r="2.5" />
        <circle cx="30" cy="55" r="2" />
        <circle cx="20" cy="60" r="1.5" />
      </g>

      {/* 4. 脚（4本、疾走ポーズ） */}
      {/* pathでダイナミックな脚を表現 */}
      <g stroke="#FBBF24" strokeWidth="10" strokeLinecap="round">
        {/* 前脚 */}
        <path d="M 125 55 L 140 85" />
        <path d="M 130 55 L 135 80" />
        {/* 後脚 */}
        <path d="M 95 70 L 80 95" />
        <path d="M 90 70 L 85 90" />
      </g>
      {/* 脚の模様 */}
      <g fill="#292524">
        {/* 前脚の模様 */}
        <circle cx="130" cy="65" r="2.5" />
        <circle cx="135" cy="70" r="2" />
        <circle cx="128" cy="75" r="1.5" />
        {/* 後脚の模様 */}
        <circle cx="85" cy="80" r="2.5" />
        <circle cx="88" cy="85" r="2" />
        <circle cx="82" cy="90" r="1.5" />
      </g>

      {/* 5. バテ・息切れ表現（💦💦💦💨） */}
      {/* 口元：バテた表情、舌が大きく出ている、開いた口 */}
      {/* 開いた口 */}
      <path
        d="M 130 30 C 135 30, 140 33, 140 37 L 135 40 L 130 37 Z"
        fill="#FEF3C7" // Amber 100
      />
      {/* 大きく出した舌（Pink-400） */}
      <path
        d="M 135 37 C 130 45, 125 45, 120 40 L 125 37 Q 130 40, 135 37 Z"
        fill="#F472B6" 
      />
      
      {/* 口元から前に飛ばす息（💨） */}
      <g fill="#CBD5E1">
        <circle cx="110" y="30" r="5" opacity="0.6" />
        <circle cx="100" y="25" r="4" opacity="0.4" />
        <circle cx="90" y="20" r="3" opacity="0.3" />
      </g>
      
      {/* 汗（💦：頭部、首、胴体から後ろに飛ばす） */}
      <g fill="#60A5FA">
        <circle cx="140" y="20" r="3" />
        <circle cx="120" y="25" r="2.5" />
        <circle cx="145" y="40" r="2.5" />
        <circle cx="125" y="45" r="2" />
        <circle cx="140" y="60" r="2.5" />
        <circle cx="130" y="65" r="2" />
      }

    </svg>
  );
}
