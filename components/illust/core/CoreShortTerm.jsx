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

      {/* スピード線 */}
      <g stroke="#FDE68A" strokeWidth="3" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <line x1="12" y1="50" x2="25" y2="50" />
        <line x1="10" y1="70" x2="35" y2="70" />
      </g>

      {/* 背中と前脚 */}
      <path
        d="M 70 30 C 85 40, 95 60, 90 75"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M 70 60 L 80 80"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* 顔と首のベース */}
      <path
        d="M 35 15 C 45 15, 60 20, 70 30 C 80 40, 80 50, 70 60 C 60 70, 50 75, 40 75 C 30 75, 25 70, 25 60 C 25 50, 25 35, 30 25 C 32 20, 33 15, 35 15 Z"
        fill="#FBBF24"
      />

      {/* 耳 */}
      <path d="M 33 17 L 25 5 C 35 5, 45 10, 47 20 Z" fill="#D97706" />
      <path d="M 31 14 L 28 8 C 34 8, 39 11, 40 17 Z" fill="#FEF3C7" />

      {/* 口元 */}
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
      <circle cx="81" cy="55" r="3" fill="#292524" />

      {/* 目（少し疲れた表情） */}
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

      {/* 斑点模様 */}
      <g fill="#292524">
        <circle cx="40" cy="30" r="2.5" />
        <circle cx="30" cy="40" r="2" />
        <circle cx="45" cy="45" r="3" />
        <circle cx="75" cy="35" r="2.5" />
        <circle cx="85" cy="45" r="2" />
        <circle cx="78" cy="55" r="3" />
      </g>

      {/* 汗（💦） */}
      <g fill="#60A5FA">
        <circle cx="45" cy="10" r="2.5" />
        <circle cx="75" cy="20" r="2" />
        <circle cx="92" cy="55" r="2.5" />
      </g>

      {/* 息（💨） */}
      <g fill="#CBD5E1">
        <circle cx="75" cy="80" r="4" opacity="0.6" />
        <circle cx="85" cy="85" r="3" opacity="0.4" />
      </g>
    </svg>
  );
}
