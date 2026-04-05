import React from "react";

export default function CoreShortTerm({ className = "", ...props }) {
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
      <g stroke="#FDE68A" strokeWidth="4" strokeLinecap="round">
        <line x1="8" y1="35" x2="28" y2="35" />
        <line x1="14" y1="55" x2="24" y2="55" />
        <line x1="10" y1="75" x2="32" y2="75" />
      </g>

      {/* チーターの顔のベース */}
      <path
        d="M 40 20 C 55 20, 75 30, 85 45 C 90 55, 90 65, 80 75 C 75 80, 65 85, 45 85 C 30 85, 25 75, 25 55 C 25 35, 30 20, 40 20 Z"
        fill="#FBBF24"
      />

      {/* 耳 */}
      <path d="M 38 22 L 30 10 C 40 10, 50 15, 52 25 Z" fill="#D97706" />
      {/* 耳の内側 */}
      <path d="M 36 19 L 33 13 C 39 13, 44 16, 45 22 Z" fill="#FEF3C7" />

      {/* 口元（マズル・白っぽい部分） */}
      <path
        d="M 65 40 C 75 40, 85 45, 85 55 C 85 65, 75 75, 65 75 C 55 75, 55 60, 65 40 Z"
        fill="#FEF3C7"
      />

      {/* 鼻 */}
      <circle cx="86" cy="55" r="4" fill="#292524" />

      {/* 目（少し前傾姿勢の鋭い瞳） */}
      <ellipse
        cx="62"
        cy="42"
        rx="3.5"
        ry="4.5"
        transform="rotate(15 62 42)"
        fill="#292524"
      />

      {/* 涙模様（チーターの最大の特徴！） */}
      <path
        d="M 61 46 Q 55 60, 60 72"
        fill="none"
        stroke="#292524"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* 模様（斑点） */}
      <g fill="#292524">
        <circle cx="45" cy="35" r="3" />
        <circle cx="35" cy="45" r="2.5" />
        <circle cx="50" cy="50" r="3.5" />
        <circle cx="38" cy="60" r="3" />
        <circle cx="48" cy="65" r="2.5" />
        <circle cx="40" cy="75" r="3" />
        <circle cx="30" cy="70" r="2" />
        <circle cx="28" cy="55" r="2.5" />
      </g>
    </svg>
  );
}
