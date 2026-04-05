import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 320 180" // ★ 320×180 の横長キャンバス
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 背景（アンバー系の淡い円）は削除し、構図に合わせたスピード感を表現 */}
      
      {/* 走っている地面のライン（スピード感の表現） */}
      <g stroke="#FDE68A" strokeWidth="2" strokeLinecap="round">
        <line x1="10" y1="160" x2="310" y2="160" />
        <line x1="30" y1="150" x2="300" y2="150" opacity="0.6" />
      
        {/* 後ろに流れるスピード線（既存踏襲） */}
        <line x1="8" y1="35" x2="28" y2="35" strokeWidth="4" />
        <line x1="14" y1="55" x2="24" y2="55" strokeWidth="4" />
        <line x1="10" y1="75" x2="32" y2="75" strokeWidth="4" />
      </g>

      {/* チーターの上半身（顔、首、背中、前脚） */}
      {/* しなやかな Path で細身・前傾を表現 */}
      <path
        d="M 35 15 C 45 15, 60 20, 70 30 C 80 40, 80 50, 70 60 C 60 70, 50 75, 40 75 C 30 75, 25 70, 25 60 C 25 50, 25 35, 30 25 C 32 20, 33 15, 35 15 Z"
        fill="#FBBF24"
      />
      {/* 背中・胴体・尾（長い Path で表現） */}
      <path
        d="M 70 30 C 95 35, 120 40, 140 50 C 160 60, 160 75, 140 95 C 120 115, 100 120, 80 120 C 60 120, 50 110, 50 100 C 50 90, 50 75, 70 60 Z"
        fill="#FBBF24"
      />
      {/* 尾（長く、少し下がっている） */}
      <path
        d="M 140 95 C 160 110, 180 120, 200 130 C 220 140, 220 150, 210 160"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* 前脚（しなやか） */}
      <path
        d="M 70 60 L 80 90 C 85 100, 85 110, 80 120"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 50 100 L 60 130 C 65 140, 65 150, 60 160"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* 後脚（蹴り出している） */}
      <path
        d="M 140 95 L 160 125 C 165 135, 165 145, 160 155"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M 120 120 L 140 150 C 145 160, 145 170, 140 180"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* 耳 */}
      <path d="M 33 17 L 25 5 C 35 5, 45 10, 47 20 Z" fill="#D97706" />
      <path d="M 31 14 L 28 8 C 34 8, 39 11, 40 17 Z" fill="#FEF3C7" />

      {/* 口元 */}
      <path
        d="M 60 40 C 70 40, 80 45, 80 55 C 80 65, 70 75, 60 75 C 50 75, 50 60, 60 40 Z"
        fill="#FEF3C7"
      />
      {/* 舌（口から出ている表現を追加） */}
      <path
        d="M 60 70 L 65 78 C 62 82, 58 82, 55 78 Z"
        fill="#F472B6"
      />

      {/* 鼻 */}
      <circle cx="81" cy="55" r="4" fill="#292524" />

      {/* 目（疲れて閉じかけの表情に調整） */}
      <ellipse
        cx="57"
        cy="42"
        rx="3.5"
        ry="4.5"
        transform="rotate(-15 57 42)" // ★ 角度を垂れ目に調整
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

      {/* 斑点模様（全身に配置） */}
      <g fill="#292524">
        {/* 顔 */}
        <circle cx="40" cy="30" r="3" />
        <circle cx="30" cy="40" r="2.5" />
        <circle cx="45" cy="45" r="3.5" />
        <circle cx="33" cy="55" r="3" />
        <circle cx="43" cy="60" r="2.5" />
        <circle cx="35" cy="70" r="3" />
        {/* 首・背中 */}
        <circle cx="75" cy="35" r="3" />
        <circle cx="85" cy="45" r="2.5" />
        <circle cx="78" cy="55" r="3.5" />
        <circle cx="95" cy="65" r="3" />
        <circle cx="110" cy="75" r="2.5" />
        {/* 胴体 */}
        <circle cx="125" cy="65" r="3.5" />
        <circle cx="118" cy="80" r="3" />
        <circle cx="105" cy="95" r="3" />
        <circle cx="90" cy="110" r="2.5" />
        {/* 尾 */}
        <circle cx="160" cy="100" r="3" />
        <circle cx="170" cy="110" r="2.5" />
        <circle cx="180" cy="120" r="2" />
        <circle cx="190" cy="130" r="1.5" />
      </g>

      {/* 息切れ線（Wavery lines - よれよれした波線を追加） */}
      {/* 点線で疲労感を表現、濃いアンバー (#D97706) */}
      <g stroke="#D97706" strokeWidth="2" fill="none" strokeDasharray="4 4" opacity="0.8">
        {/* 頭部の上 */}
        <path d="M 40 8 C 45 10, 55 12, 60 10 Q 65 8, 70 12" transform="rotate(-15 40 8)" />
        {/* 首筋 */}
        <path d="M 80 25 C 90 30, 100 32, 110 30 Q 115 28, 120 32" transform="rotate(10 80 25)" />
        {/* 胴体の上 */}
        <path d="M 120 40 C 140 45, 160 48, 180 45 Q 190 42, 200 48" transform="rotate(20 120 40)" />
        {/* 脚（疲れた脚） */}
        <path d="M 90 90 L 95 120 Q 98 130, 95 140" transform="rotate(5 90 90)" />
      </g>

      {/* 汗（💦マークをいくつか追加 - 既存踏襲） */}
      {/* pathで汗の形を作成、青色 (#60A5FA) */}
      <g fill="#60A5FA" stroke="none">
        {/* 頭部の上 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(15,10) rotate(-30)" />
        {/* 首筋 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(65,30) rotate(15)" />
        {/* 背中 */}
        <path d="M35 8 A2.5 2.5 0 0 1 35 13 A3.5 3.5 0 0 0 35 6 A2.5 2.5 0 0 1 35 8 Z" transform="translate(90,60) rotate(45)" />
      </g>

      {/* 息（💨マークを追加 - 既存踏襲） */}
      {/* pathで湯気の形を作成、薄いグレー (#E2E8F0) */}
      <g fill="#E2E8F0" stroke="none">
        {/* 口元 */}
        <path d="M5 0 Q5 5 0 8 Q-5 5 -5 0 A 5 5 0 1 1 5 0" transform="translate(70,75) scale(0.8)" />
      </g>
    </svg>
  );
}
