// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（パープル：膨張・外へ向かう遠心力）
export function IconWeatherPressureDown({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-pressure-down" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      {/* 膨張を示す背景のグラデーション */}
      <circle cx="16" cy="16" r="14" fill="url(#grad-pressure-down)" />
      
      {/* 広がる破線の円（パンパンに張る感覚） */}
      <circle cx="16" cy="16" r="11" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
      
      {/* 遠心（外向き）の4方向矢印 */}
      <g stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 上 */}
        <path d="M16 10 V4 M13 7 l3-3 3 3" />
        {/* 下 */}
        <path d="M16 22 V28 M13 25 l3 3 3-3" />
        {/* 左 */}
        <path d="M10 16 H4 M7 13 l-3 3 3 3" />
        {/* 右 */}
        <path d="M22 16 H28 M25 13 l3 3 -3 3" />
      </g>
      
      {/* 中心は軽く抜いておく */}
      <circle cx="16" cy="16" r="3" fill="#c4b5fd" opacity="0.5" />
    </svg>
  );
}

// 2. 気圧上昇（ティール：圧縮・内へ向かう求心力）
export function IconWeatherPressureUp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-pressure-up" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      {/* 圧縮を示す背景 */}
      <circle cx="16" cy="16" r="12" fill="url(#grad-pressure-up)" />
      
      {/* ギュッと詰まった中心核 */}
      <circle cx="16" cy="16" r="5" fill="#14b8a6" opacity="0.9" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="#0f766e" strokeWidth="1.5" />
      
      {/* 求心（内向き）の4方向矢印 */}
      <g stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 上から下へ */}
        <path d="M16 2 v7 M13 6 l3 3 3-3" />
        {/* 下から上へ */}
        <path d="M16 30 v-7 M13 26 l3-3 3 3" />
        {/* 左から右へ */}
        <path d="M2 16 h7 M6 13 l3 3 -3 3" />
        {/* 右から左へ */}
        <path d="M30 16 h-7 M26 13 l-3 3 3 3" />
      </g>
    </svg>
  );
}

// 5. 湿気（スレート：どんより波線＋重い水滴）
export function IconWeatherDamp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-drop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* まとわりつく湿気（どんよりした波線） */}
      <path d="M4 10 Q 8 6, 12 10 T 20 10 T 28 10" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M6 16 Q 10 12, 14 16 T 22 16 T 28 16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      
      {/* メインの重たい水滴 */}
      <path d="M16 26 C20 26 22 23 22 19 C22 14 16 10 16 10 C16 10 10 14 10 19 C10 23 12 26 16 26 Z" fill="url(#grad-drop)" opacity="0.9" />
      {/* 水滴のハイライト */}
      <path d="M13 20 A 3 3 0 0 1 15 17" fill="none" stroke="#f1f5f9" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      
      {/* 小さな水滴 */}
      <circle cx="24" cy="22" r="2" fill="#64748b" opacity="0.6" />
      <circle cx="8" cy="24" r="1.5" fill="#64748b" opacity="0.5" />
    </svg>
  );
}

// 6. 乾燥（マスタード：ひび割れた大地＋蒸発）
export function IconWeatherDry({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      {/* 蒸発して上へ逃げる水分（上向きの点線と粒子） */}
      <path d="M10 16 v-6 M16 14 v-8 M22 15 v-5" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
      <circle cx="10" cy="6" r="1" fill="#d97706" opacity="0.8" />
      <circle cx="16" cy="3" r="1.5" fill="#b45309" opacity="0.6" />
      <circle cx="22" cy="7" r="1" fill="#d97706" opacity="0.8" />
      
      {/* 乾燥してひび割れた大地 */}
      <path d="M4 22 Q 10 18, 16 22 T 28 22" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26 Q 10 24, 16 26 T 28 24" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      
      {/* ひび割れのディテール */}
      <path d="M12 20 l 2 4 l -1 3 M18 23 l 3 4 M24 21 l 1 3" fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}
