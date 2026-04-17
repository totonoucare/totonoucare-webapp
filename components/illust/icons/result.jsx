// components/illust/icons/result.jsx
"use client";

// ▼ 開閉用のアコーディオン矢印（テキスト色に追従・そのまま）
export function IconChevron({ className = "h-5 w-5 transition-transform group-open:rotate-180", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ▼ 記録・メモ（セージグリーン系のノート）
export function IconMemo({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-memo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5c8465" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5c8465" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="5" y="3" width="14" height="18" rx="3" fill="url(#grad-memo)" />
      <rect x="5" y="3" width="14" height="18" rx="3" fill="none" stroke="#4a7253" strokeWidth="1.5" />
      <path d="M12 3v18" stroke="#5c8465" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
      <path d="M8 8h8M8 12h8M8 16h4" fill="none" stroke="#3a5741" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// ▼ コンパス・見立て（ゴールド×ダークネイビー）
export function IconCompass({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-compass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dca855" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#dca855" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#grad-compass)" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#dca855" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#dca855" strokeWidth="1" strokeDasharray="1 3" opacity="0.5" />
      {/* 羅針盤の針（赤とネイビーで立体的に） */}
      <path d="M12 5 L14.5 12 L12 12 Z" fill="#c85a4b" />
      <path d="M12 5 L9.5 12 L12 12 Z" fill="#e07a5f" />
      <path d="M12 19 L14.5 12 L12 12 Z" fill="#242c26" />
      <path d="M12 19 L9.5 12 L12 12 Z" fill="#475569" />
      <circle cx="12" cy="12" r="2" fill="#fff" stroke="#242c26" strokeWidth="1.5" />
    </svg>
  );
}

// ▼ AIロボット・週次レポート（ティール×スレート）
export function IconRobot({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-robot" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="16" height="11" rx="4" fill="url(#grad-robot)" />
      <rect x="4" y="9" width="16" height="11" rx="4" fill="none" stroke="#334155" strokeWidth="1.5" />
      {/* アンテナ */}
      <path d="M12 9V4 M9 4h6" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.5" fill="#14b8a6" />
      {/* 目 */}
      <path d="M8 14 Q9 13 10 14" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 14 Q15 13 16 14" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ▼ 予兆・サイン（アンバー系の雷/ひらめき）
export function IconBolt({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-bolt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* ドロップシャドウ風の光 */}
      <path d="M13 2L3 14h7l-2 8 11-12h-7l2-8z" fill="#f59e0b" opacity="0.3" transform="translate(1, 1)" />
      <path d="M13 2L3 14h7l-2 8 11-12h-7l2-8z" fill="url(#grad-bolt)" stroke="#c2410c" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// ▼ アプリアイコン・レーダー（ブランドカラー）
export function IconRadar({ className = "h-[22px] w-[22px]", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-radar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5c8465" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#5c8465" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#grad-radar)" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#4a7253" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#5c8465" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
      {/* 走査線とターゲット */}
      <path d="M12 12 L18 6" fill="none" stroke="#dca855" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill="#dca855" />
    </svg>
  );
}

// ▼ 結果・チェック（クリアなグリーン）
export function IconResult({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-result" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="url(#grad-result)" />
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.6" />
      <path d="M8 12l2.5 2.5L16 9" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ▼ 分析・詳細（ルーペ・ネイビー×ティール）
export function IconAnalysis({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="3" y="3" width="16" height="18" rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" opacity="0.6" />
      <path d="M7 8h8M7 12h5" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="4.5" fill="#e0f2fe" fillOpacity="0.8" stroke="#0ea5e9" strokeWidth="1.5" />
      <path d="M18.5 18.5L22 22" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ▼ 身体・経絡ライン（テラコッタ×セージ）
export function IconBody({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c85a4b" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#c85a4b" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="5" r="3" fill="url(#grad-body)" stroke="#b45346" strokeWidth="1.5" />
      <path d="M7 21v-6c0-2.5 2-5 5-5s5 2.5 5 5v6" fill="url(#grad-body)" stroke="#b45346" strokeWidth="1.5" strokeLinecap="round" />
      {/* 経絡ラインとツボ */}
      <path d="M12 10v11" fill="none" stroke="#dca855" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.9" />
      <circle cx="12" cy="15" r="2" fill="#dca855" />
    </svg>
  );
}

// ▼ 天気全体（ソフトブルー）
export function IconCloud({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-cloud" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d="M6.5 17.5A4.5 4.5 0 1 1 9 9.2a6 6 0 1 1 10.8 3.8 4 4 0 1 1-3.3 7h-10z" fill="url(#grad-cloud)" />
      <path d="M6.5 17.5A4.5 4.5 0 1 1 9 9.2a6 6 0 1 1 10.8 3.8 4 4 0 1 1-3.3 7h-10z" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRipple({ className = "h-16 w-16", ...props }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" {...props}>
      <defs>
        {/* ツボの中心から放たれる黄金の光 */}
        <radialGradient id="tsubo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dca855" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#dca855" stopOpacity="0" />
        </radialGradient>
        {/* 指の立体感を出す微かなグラデーション */}
        <linearGradient id="finger-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef4ef" />
        </linearGradient>
        {/* 指に落とす柔らかい影（リッチなUIの秘訣） */}
        <filter id="finger-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#173126" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* --- LAYER 1: ツボの波及エフェクト（背景） --- */}
      {/* 黄金のグロウ（発光） */}
      <circle cx="24" cy="32" r="14" fill="url(#tsubo-glow)" />
      
      {/* 波及する波紋（外側） */}
      <circle cx="24" cy="32" r="12" fill="none" stroke="#dca855" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
      {/* 波及する波紋（内側） */}
      <circle cx="24" cy="32" r="7" fill="none" stroke="#5c8465" strokeWidth="2" opacity="0.5" />
      
      {/* ツボの中心点（コア） */}
      <circle cx="24" cy="32" r="3" fill="#dca855" />
      <circle cx="24" cy="32" r="1.5" fill="#ffffff" />

      {/* キラキラ・効いてるエフェクト */}
      <path d="M 8 18 v 4 m -2 -2 h 4" fill="none" stroke="#dca855" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 40 24 v 4 m -2 -2 h 4" fill="none" stroke="#dca855" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* --- LAYER 2: 押し込む指（前面） --- */}
      {/* 右上から斜めに指が入ってくる角度（-25度回転） */}
      <g transform="translate(24, 32) rotate(-25) translate(-24, -32)" filter="url(#finger-shadow)">
        {/* 指の本体（ふっくらとしたカプセル形状） */}
        <path 
          d="M 17 -10 V 25 C 17 29.5 20 32 24 32 C 28 32 31 29.5 31 25 V -10 Z" 
          fill="url(#finger-grad)" 
          stroke="#3a5741" 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />
        {/* 爪のディテール（リアリティと愛嬌） */}
        <path 
          d="M 20.5 23 C 20.5 21.5 27.5 21.5 27.5 23 V 26 C 27.5 28 20.5 28 20.5 26 Z" 
          fill="#ffffff" 
          stroke="#a0aba5" 
          strokeWidth="1.5" 
          opacity="0.8" 
        />
        {/* 指の関節のシワ */}
        <path 
          d="M 20 12 Q 24 14 28 12" 
          fill="none" 
          stroke="#a0aba5" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          opacity="0.6" 
        />
      </g>
    </svg>
  );
}





// ★ 新規追加（お椀・食養生用 / テラコッタ×湯気）
export function IconBowl({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-bowl" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e07a5f" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#c85a4b" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* 立ち上る湯気（温かい食事のニュアンス） */}
      <path d="M8 6 Q 9 8, 8 10 M12 4 Q 13 6, 12 8 M16 6 Q 15 8, 16 10" fill="none" stroke="#dca855" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      {/* お椀の本体 */}
      <path d="M3 12h18v2c0 4.5-3.5 7-9 7s-9-2.5-9-7v-2z" fill="url(#grad-bowl)" />
      <path d="M3 12h18v2c0 4.5-3.5 7-9 7s-9-2.5-9-7v-2z" fill="none" stroke="#c85a4b" strokeWidth="1.5" strokeLinejoin="round" />
      {/* お椀のフチ */}
      <line x1="2" y1="12" x2="22" y2="12" stroke="#c85a4b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
