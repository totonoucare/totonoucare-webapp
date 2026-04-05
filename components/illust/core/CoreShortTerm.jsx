import React from "react";

export default function CoreShortTermAnimal({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 背景（アンバー系の淡い円） */}
      <circle cx="50" cy="50" r="48" fill="#FEF3C7" />

      {/* スピード線（瞬発力・アクセルの表現） */}
      {/* 後ろに流れるように配置 */}
      <g stroke="#FDE68A" strokeWidth="3" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <line x1="12" y1="50" x2="25" y2="50" />
        <line x1="10" y1="70" x2="35" y2="70" />
      </g>

      {/* チーターの上半身（顔、首、背中、前脚） */}
      {/* チーターらしい、小顔でしなやかなpath */}
      <path
        d="M 35 15 C 45 15, 60 20, 70 30 C 80 40, 80 50, 70 60 C 60 70, 50 75, 40 75 C 30 75, 25 70, 25 60 C 25 50, 25 35, 30 25 C 32 20, 33 15, 35 15 Z"
        fill="#FBBF24"
      />
      {/* 背中 */}
      <path
        d="M 70 30 C 85 40, 95 60, 90 75"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="15"
        strokeLinecap="round"
      />
      {/* 前脚 */}
      <path
        d="M 70 60 L 80 80"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* 耳 */}
      {/* 位置調整 */}
      <path d="M 33 17 L 25 5 C 35 5, 45 10, 47 20 Z" fill="#D97706" />
      {/* 耳の内側 */}
      <path d="M 31 14 L 28 8 C 34 8, 39 11, 40 17 Z" fill="#FEF3C7" />

      {/* 口元（マズル・白っぽい部分、舌が出ている表現を追加） */}
      <path
        d="M 60 40 C 70 40, 80 45, 80 55 C 80 65, 70 75, 60 75 C 50 75, 50 60, 60 40 Z"
        fill="#FEF3C7"
      />
      {/* 舌（ここがエラーの原因でした。コメントを削除） */}
      <path
        d="M 60 70 L 65 78 C 62 82, 58 82, 55 78 Z"
        fill="#F472B6"
      />

      {/* 鼻 */}
      <circle cx="81" cy="55" r="4" fill="#292524" />

      {/* 目（少し前傾姿勢の鋭い瞳から、疲れた表情に調整） */}
      {/* 楕円の角度を変えて、少し疲れて目が垂れている表現に */}
      <ellipse
        cx="57"
        cy="42"
        rx="3.5"
        ry="4.5"
        transform="rotate(-5 57 42)"
        fill="#292524"
      />

      {/* 涙模様 */}
      <path
        d="M 56 46 Q 50 60, 55 72"
        fill="none"
        stroke="#292524"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* 模様（体にも追加） */}
      <g fill="#292524">
        {/* 顔の模様 */}
        <circle cx="40" cy="30" r="3" />
        <circle cx="30" cy="40" r="2.5" />
        <circle cx="45" cy="45" r="3.5" />
        <circle cx="33" cy="55" r="3" />
        <circle cx="43" cy="60" r="2.5" />
        <circle cx="35" cy="70" r="3" />
        {/* 首・背中の模様 */}
        <circle cx="75" cy="35" r="3" />
        <circle cx="85" cy="45" r="2.5" />
        <circle cx="78" cy="55" r="3.5" />
        <circle cx="88" cy="65" r="3" />
        <circle cx="82" cy="75" r="2.5" />
        {/* 前脚の模様 */}
        <circle cx="75" cy="68" r="2" />
        <circle cx="78" cy="73" r="1.5" />
      </g>

      {/* 汗（💦マークをいくつか追加） */}
      {/* pathで汗の形を作成、青色 (#60A5FA) */}
      <g fill="#60A5FA" stroke="none">
        {/* 頭部の上 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(10,5) rotate(-30)" />
        {/* 首筋 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(60,25) rotate(15)" />
        {/* 背中 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(80,50) rotate(45)" />
      </g>

      {/* 湯気・バテ（口元に💨マークを追加） */}
      {/* pathで湯気の形を作成、薄いグレー (#E2E8F0) */}
      <g fill="#E2E8F0" stroke="none">
        <path d="M5 0 Q5 5 0 8 Q-5 5 -5 0 A 5 5 0 1 1 5 0" transform="translate(70,75) scale(0.8)" />
      </g>
    </svg>
  );
}
