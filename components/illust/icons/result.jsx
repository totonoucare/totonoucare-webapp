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

// ▼ アプリアイコン・レーダー（洗練されたスキャンと検知のエフェクト)
export function IconRadar({ className = "h-[22px] w-[22px]", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <defs>
        {/* レーダー画面のベースとなる、深いグリーンの光（野菜っぽさを消すため深く） */}
        <radialGradient id="grad-radar-bg-deep" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5c8465" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5c8465" stopOpacity="0.0" />
        </radialGradient>
        
        {/* スイープ（走査）が通過した後に残る、光の軌跡（トレイル）のグラデーション */}
        <linearGradient id="grad-radar-scan-trail" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dca855" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#dca855" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* ディスプレイのベース（外枠と背景） */}
      <circle cx="12" cy="12" r="10" fill="url(#grad-radar-bg-deep)" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#4a7253" strokeWidth="1.5" />
      
      {/* 内部の目盛り（十字の照準線のみ残し、点線の円は削除して細胞感を消す） */}
      <path d="M 12 4.5 V 19.5 M 4.5 12 H 19.5" fill="none" stroke="#5c8465" strokeWidth="1" opacity="0.3" strokeDasharray="2 3" strokeLinecap="round" />

      {/* レーダーのスイープ（光の残像を示す扇形） ※滑らかなグラデーションへ */}
      <path d="M 12 12 L 2.5 9 A 10 10 0 0 1 12 2 Z" fill="url(#grad-radar-scan-trail)" opacity="0.9" />
      
      {/* スキャンバー（現在走査している鋭い光の線） */}
      <path d="M 12 12 L 12 2" fill="none" stroke="#dca855" strokeWidth="1.5" strokeLinecap="round" />

      {/* 中心点（自機・現在地。からしっぽさを消すため、白いコアを重ねる） */}
      <circle cx="12" cy="12" r="2.5" fill="#4a7253" />
      <circle cx="12" cy="12" r="1" fill="#ffffff" opacity="0.9" />

      {/* 検知したターゲット（不調の兆し）と、動的な波紋（Ripple） */}
      {/* メインターゲット（ピコーンと検知） */}
      <circle cx="18" cy="7" r="3.5" fill="none" stroke="#dca855" strokeWidth="1.5" opacity="0.4">
        {/* CSSアニメーション用の余白（Next.js側でアニメーションを当てる場合） */}
      </circle>
      <circle cx="18" cy="7" r="1.5" fill="#dca855" />
      
      {/* サブターゲット（検知の予兆） */}
      <circle cx="6.5" cy="15.5" r="1" fill="#5c8465" opacity="0.7" />
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

// ツボ：絶対に崩れない「ミニマルカプセル型の指」
export function IconRipple({ className = "h-12 w-12", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      {/* 押されているツボ（波紋と中心点） */}
      <circle cx="12" cy="16" r="8" fill="#5c8465" fillOpacity="0.15" />
      <circle cx="12" cy="16" r="3" fill="#5c8465" />
      <path d="M4 16 A 8 8 0 0 1 20 16" fill="none" stroke="#5c8465" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      {/* 押し込む手（人差し指） */}
      <path d="M18 6 C 16 6 15 7 15 9 V 15 L 12.5 13.5 C 11 12 9 13 9.5 15 L 14 24 C 15 26 17 28 20 28 C 24 28 27 25 27 21 V 13 C 27 11 25 11 25 13 V 18 M 25 13 C 25 10 22 10 22 13 V 18 M 22 13 C 22 9 18 9 18 12 V 15" fill="#ffffff" stroke="#3a5741" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 食養生：温かいスープの入ったお椀（新規）
export function IconBowl({ className = "h-12 w-12", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      {/* 背景の温かいハイライト */}
      <circle cx="16" cy="16" r="12" fill="#dca855" fillOpacity="0.12" />
      
      {/* お椀の本体 */}
      <path d="M5 17 C 5 24 10 27 16 27 C 22 27 27 24 27 17 Z" fill="#ffffff" stroke="#5c8465" strokeWidth="2" strokeLinejoin="round" />
      {/* お椀のフチ（上部） */}
      <ellipse cx="16" cy="17" rx="11" ry="3.5" fill="#e6eee8" stroke="#5c8465" strokeWidth="2" />
      
      {/* 湯気 */}
      <path d="M12 12 C 12 10 10 8 12 6" fill="none" stroke="#dca855" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 11 C 16 9 14 7 16 5" fill="none" stroke="#dca855" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12 C 20 10 18 8 20 6" fill="none" stroke="#dca855" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}


